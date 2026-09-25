import { AppError, NotFound } from '../../lib/errors.js';
import { prisma, type Tx } from '../../lib/prisma.js';
import type { CreateMovement, ListMovements, MovementTypeT } from './stock.schemas.js';

type Delta = {
  productId: number;
  delta: number;
  type: MovementTypeT;
  userId: number;
  reason?: string | null;
  tabId?: number | null;
};

/**
 * Aplica um delta de estoque DENTRO de uma transação e registra o movimento.
 * A baixa é um UPDATE condicional (stock >= qtd) — atômico no MySQL, então dois
 * caixas vendendo a última unidade ao mesmo tempo nunca deixam o estoque negativo.
 */
export async function applyDelta(tx: Tx, d: Delta) {
  if (d.delta < 0) {
    const qty = -d.delta;
    const r = await tx.product.updateMany({
      where: { id: d.productId, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    if (r.count === 0) {
      const p = await tx.product.findUnique({ where: { id: d.productId }, select: { name: true, stock: true } });
      if (!p) throw NotFound('Produto');
      throw new AppError(409, 'INSUFFICIENT_STOCK', `Estoque insuficiente de "${p.name}" (disponível: ${p.stock})`, {
        available: p.stock,
      });
    }
  } else if (d.delta > 0) {
    await tx.product.update({ where: { id: d.productId }, data: { stock: { increment: d.delta } } });
  }

  const { stock } = await tx.product.findUniqueOrThrow({ where: { id: d.productId }, select: { stock: true } });
  return tx.stockMovement.create({
    data: {
      productId: d.productId,
      type: d.type,
      quantity: d.delta,
      balance: stock,
      reason: d.reason ?? null,
      userId: d.userId,
      tabId: d.tabId ?? null,
    },
  });
}

/** SELECT ... FOR UPDATE: trava a linha até o fim da transação. Tagged template = parâmetro bindado, sem SQL injection. */
export async function lockProduct(tx: Tx, productId: number) {
  const rows = await tx.$queryRaw<{ stock: number }[]>`SELECT stock FROM products WHERE id = ${productId} FOR UPDATE`;
  const row = rows[0];
  if (!row) throw NotFound('Produto');
  return Number(row.stock);
}

export async function createManual(input: CreateMovement, userId: number) {
  const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { trackStock: true } });
  if (!product) throw NotFound('Produto');
  if (!product.trackStock) throw new AppError(400, 'STOCK_NOT_TRACKED', 'Produto não controla estoque');
  const movement = await prisma.$transaction(async (tx) => {
    switch (input.type) {
      case 'ENTRADA':
        await lockProduct(tx, input.productId);
        return applyDelta(tx, { ...input, delta: input.quantity, userId });
      case 'SAIDA':
        return applyDelta(tx, { ...input, delta: -input.quantity, userId });
      case 'AJUSTE': {
        const current = await lockProduct(tx, input.productId);
        return applyDelta(tx, { ...input, delta: input.countedStock - current, userId });
      }
    }
  });
  return getById(movement.id);
}

const include = { product: { select: { name: true } }, user: { select: { name: true } } } as const;

type Row = Awaited<ReturnType<typeof prisma.stockMovement.findFirstOrThrow<{ include: typeof include }>>>;

const toDTO = (m: Row) => ({
  id: m.id,
  productId: m.productId,
  productName: m.product.name,
  type: m.type,
  quantity: m.quantity,
  balance: m.balance,
  reason: m.reason,
  userName: m.user.name,
  tabId: m.tabId,
  createdAt: m.createdAt.toISOString(),
});

async function getById(id: number) {
  return toDTO(await prisma.stockMovement.findUniqueOrThrow({ where: { id }, include }));
}

export async function list(q: ListMovements) {
  const where = { productId: q.productId, type: q.type };
  const [rows, total] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      where,
      include,
      orderBy: { id: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.stockMovement.count({ where }),
  ]);
  return { data: rows.map(toDTO), meta: { page: q.page, pageSize: q.pageSize, total } };
}
