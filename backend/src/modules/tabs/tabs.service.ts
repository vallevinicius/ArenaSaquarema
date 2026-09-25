import { AppError, BadRequest, Conflict, Forbidden, NotFound } from '../../lib/errors.js';
import { dateOnly, money, todayLocal, ymdOf } from '../../lib/format.js';
import { prisma, type Tx } from '../../lib/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../middlewares/auth.js';
import { applyDelta } from '../stock/stock.service.js';
import type { AddItem, ListTabs, OpenTab, PaymentMethodT } from './tabs.schemas.js';

/** Janela em que o operador pode remover um item que ele mesmo lançou. */
const OPERATOR_UNDO_WINDOW_MS = 10 * 60 * 1000;

const summaryInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  openedBy: { select: { name: true } },
  closedBy: { select: { name: true } },
  _count: { select: { items: true } },
} as const;

const detailInclude = {
  ...summaryInclude,
  items: { include: { createdBy: { select: { name: true } } }, orderBy: { id: 'asc' as const } },
} as const;

type Summary = Prisma.TabGetPayload<{ include: typeof summaryInclude }>;
type Detail = Prisma.TabGetPayload<{ include: typeof detailInclude }>;

const toSummary = (t: Summary) => ({
  id: t.id,
  customer: t.customer,
  status: t.status,
  total: money(t.total),
  paymentMethod: t.paymentMethod,
  notes: t.notes,
  itemsCount: t._count.items,
  openedBy: t.openedBy.name,
  closedBy: t.closedBy?.name ?? null,
  openedAt: t.openedAt.toISOString(),
  closedAt: t.closedAt?.toISOString() ?? null,
});

const toDetail = (t: Detail) => ({
  ...toSummary(t),
  items: t.items.map((i) => ({
    id: i.id,
    type: i.type,
    productId: i.productId,
    dayUsePlanId: i.dayUsePlanId,
    description: i.description,
    quantity: i.quantity,
    unitPrice: money(i.unitPrice),
    subtotal: money(i.subtotal),
    usageDate: i.usageDate ? ymdOf(i.usageDate) : null,
    createdBy: i.createdBy.name,
    createdById: i.createdById,
    createdAt: i.createdAt.toISOString(),
  })),
});

/**
 * Trava a comanda (SELECT ... FOR UPDATE) e garante que está ABERTA.
 * Serializa operações concorrentes na mesma comanda: sem item lançado depois do fechamento
 * e sem fechamento duplo em dois caixas.
 */
async function lockOpenTab(tx: Tx, tabId: number) {
  const rows = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM tabs WHERE id = ${tabId} FOR UPDATE`;
  const row = rows[0];
  if (!row) throw NotFound('Comanda', true);
  if (row.status !== 'ABERTA') throw Conflict(`Comanda #${tabId} não está aberta (${row.status})`, 'TAB_NOT_OPEN');
}

/** Total é sempre recalculado dos itens (fonte da verdade), nunca incrementado às cegas. */
async function recomputeTotal(tx: Tx, tabId: number) {
  const agg = await tx.tabItem.aggregate({ where: { tabId }, _sum: { subtotal: true } });
  const total = agg._sum.subtotal ?? new Prisma.Decimal(0);
  await tx.tab.update({ where: { id: tabId }, data: { total } });
  return total;
}

async function isTracked(tx: Tx, productId: number) {
  const p = await tx.product.findUnique({ where: { id: productId }, select: { trackStock: true } });
  return p?.trackStock ?? false;
}

export async function list(q: ListTabs) {
  const where: Prisma.TabWhereInput = { status: q.status, customerId: q.customerId };
  const [rows, total] = await prisma.$transaction([
    prisma.tab.findMany({
      where,
      include: summaryInclude,
      // Abertas: mais antigas primeiro (fila do caixa). Demais: mais recentes primeiro.
      orderBy: q.status === 'ABERTA' ? { openedAt: 'asc' } : { id: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.tab.count({ where }),
  ]);
  return { data: rows.map(toSummary), meta: { page: q.page, pageSize: q.pageSize, total } };
}

export async function get(id: number) {
  const t = await prisma.tab.findUnique({ where: { id }, include: detailInclude });
  if (!t) throw NotFound('Comanda', true);
  return toDetail(t);
}

export async function open(input: OpenTab, userId: number) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } });
  if (!customer) throw NotFound('Cliente');
  try {
    const tab = await prisma.tab.create({
      data: {
        customerId: input.customerId,
        openCustomerId: input.customerId,
        notes: input.notes ?? null,
        openedById: userId,
      },
    });
    return get(tab.id);
  } catch (e) {
    // Único campo unique em tabs é openCustomerId → cliente já tem comanda aberta.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const existing = await prisma.tab.findUnique({ where: { openCustomerId: input.customerId }, select: { id: true } });
      throw new AppError(409, 'CUSTOMER_HAS_OPEN_TAB', 'Cliente já possui comanda aberta', { tabId: existing?.id });
    }
    throw e;
  }
}

export async function addItem(tabId: number, input: AddItem, userId: number) {
  await prisma.$transaction(async (tx) => {
    await lockOpenTab(tx, tabId);

    if (input.type === 'PRODUTO') {
      const product = await tx.product.findUnique({ where: { id: input.productId } });
      if (!product) throw NotFound('Produto');
      if (!product.active) throw BadRequest(`Produto "${product.name}" está inativo`, 'PRODUCT_INACTIVE');

      if (product.trackStock) await applyDelta(tx, {
        productId: product.id,
        delta: -input.quantity,
        type: 'VENDA',
        userId,
        tabId,
        reason: `Comanda #${tabId}`,
      });
      await tx.tabItem.create({
        data: {
          tabId,
          type: 'PRODUTO',
          productId: product.id,
          description: product.name,
          quantity: input.quantity,
          unitPrice: product.price,
          subtotal: product.price.mul(input.quantity),
          createdById: userId,
        },
      });
    } else {
      const plan = await tx.dayUsePlan.findUnique({ where: { id: input.dayUsePlanId } });
      if (!plan) throw NotFound('Plano de day use');
      if (!plan.active) throw BadRequest(`Plano "${plan.name}" está inativo`, 'PLAN_INACTIVE');

      const usageDate = input.usageDate ?? todayLocal();
      if (usageDate < todayLocal()) throw BadRequest('Data do day use não pode estar no passado');

      await tx.tabItem.create({
        data: {
          tabId,
          type: 'DAY_USE',
          dayUsePlanId: plan.id,
          description: plan.name,
          quantity: input.quantity,
          unitPrice: plan.price,
          subtotal: plan.price.mul(input.quantity),
          usageDate: dateOnly(usageDate),
          createdById: userId,
        },
      });
    }
    await recomputeTotal(tx, tabId);
  });
  return get(tabId);
}

export async function removeItem(tabId: number, itemId: number, actor: AuthUser) {
  await prisma.$transaction(async (tx) => {
    await lockOpenTab(tx, tabId);
    // where com tabId: impede remover item de OUTRA comanda trocando o id na URL (IDOR).
    const item = await tx.tabItem.findFirst({ where: { id: itemId, tabId } });
    if (!item) throw NotFound('Item');

    if (actor.role !== 'ADMIN') {
      const own = item.createdById === actor.id;
      const recent = Date.now() - item.createdAt.getTime() <= OPERATOR_UNDO_WINDOW_MS;
      if (!own || !recent) throw Forbidden('Somente o admin pode remover este item');
    }

    if (item.type === 'PRODUTO' && item.productId && (await isTracked(tx, item.productId))) {
      await applyDelta(tx, {
        productId: item.productId,
        delta: item.quantity,
        type: 'ESTORNO',
        userId: actor.id,
        tabId,
        reason: `Item removido da comanda #${tabId}`,
      });
    }
    await tx.tabItem.delete({ where: { id: item.id } });
    await recomputeTotal(tx, tabId);
  });
  return get(tabId);
}

export async function close(tabId: number, paymentMethod: PaymentMethodT, userId: number) {
  await prisma.$transaction(async (tx) => {
    await lockOpenTab(tx, tabId);
    const count = await tx.tabItem.count({ where: { tabId } });
    if (count === 0) throw BadRequest('Comanda sem itens não pode ser fechada; cancele-a', 'EMPTY_TAB');

    const total = await recomputeTotal(tx, tabId);
    await tx.tab.update({
      where: { id: tabId },
      data: {
        status: 'FECHADA',
        total,
        paymentMethod,
        closedAt: new Date(),
        closedById: userId,
        openCustomerId: null,
      },
    });
  });
  return get(tabId);
}

/** Cancela comanda ABERTA devolvendo ao estoque os produtos lançados. Itens ficam para auditoria. */
export async function cancel(tabId: number, reason: string, userId: number) {
  await prisma.$transaction(async (tx) => {
    await lockOpenTab(tx, tabId);
    const items = await tx.tabItem.findMany({ where: { tabId, type: 'PRODUTO' } });
    for (const item of items) {
      if (!item.productId || !(await isTracked(tx, item.productId))) continue;
      await applyDelta(tx, {
        productId: item.productId,
        delta: item.quantity,
        type: 'ESTORNO',
        userId,
        tabId,
        reason: `Cancelamento comanda #${tabId}`,
      });
    }
    const tab = await tx.tab.findUniqueOrThrow({ where: { id: tabId }, select: { notes: true } });
    await tx.tab.update({
      where: { id: tabId },
      data: {
        status: 'CANCELADA',
        closedAt: new Date(),
        closedById: userId,
        openCustomerId: null,
        notes: [tab.notes, `Cancelada: ${reason}`].filter(Boolean).join(' | ').slice(0, 255),
      },
    });
  });
  return get(tabId);
}
