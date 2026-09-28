import { NotFound } from '../../lib/errors';
import { money } from '../../lib/format';
import { prisma } from '../../lib/prisma';
import type { Product } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import { applyDelta } from '../stock/stock.service';
import type { CreateProduct, ListProducts, UpdateProduct } from './products.schemas';

export const toDTO = (p: Product) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  price: money(p.price),
  trackStock: p.trackStock,
  stock: p.stock,
  minStock: p.minStock,
  lowStock: p.trackStock && p.stock <= p.minStock,
  active: p.active,
});

export async function list(q: ListProducts) {
  const where: Prisma.ProductWhereInput = {
    ...(q.q && { name: { contains: q.q } }),
    ...(q.category && { category: q.category }),
    ...(q.active !== undefined && { active: q.active }),
    // Comparação coluna x coluna (stock <= minStock) via field reference.
    ...(q.lowStock && { trackStock: true, stock: { lte: prisma.product.fields.minStock } }),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.product.count({ where }),
  ]);
  return { data: rows.map(toDTO), meta: { page: q.page, pageSize: q.pageSize, total } };
}

export async function get(id: number) {
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) throw NotFound('Produto');
  return toDTO(p);
}

export async function create(input: CreateProduct, userId: number) {
  const { initialStock, ...data } = input;
  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({ data: { ...data, price: new Prisma.Decimal(data.price) } });
    if (initialStock > 0 && data.trackStock) {
      await applyDelta(tx, { productId: p.id, delta: initialStock, type: 'ENTRADA', userId, reason: 'Estoque inicial' });
    }
    return tx.product.findUniqueOrThrow({ where: { id: p.id } });
  });
  return toDTO(product);
}

export async function update(id: number, input: UpdateProduct) {
  await get(id);
  const p = await prisma.product.update({
    where: { id },
    data: { ...input, ...(input.price !== undefined && { price: new Prisma.Decimal(input.price) }) },
  });
  return toDTO(p);
}
