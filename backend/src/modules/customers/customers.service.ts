import { NotFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type { CreateCustomer, ListCustomers, UpdateCustomer } from './customers.schemas.js';

const select = {
  id: true,
  name: true,
  phone: true,
  cpf: true,
  createdAt: true,
  tabs: { where: { status: 'ABERTA' as const }, select: { id: true }, take: 1 },
} as const;

type Row = {
  id: number;
  name: string;
  phone: string | null;
  cpf: string | null;
  createdAt: Date;
  tabs: { id: number }[];
};

const toDTO = ({ tabs, createdAt, ...c }: Row) => ({
  ...c,
  openTabId: tabs[0]?.id ?? null,
  createdAt: createdAt.toISOString(),
});

export async function list(query: ListCustomers) {
  const digits = query.q?.replace(/\D/g, '');
  const where = query.q
    ? {
        OR: [
          { name: { contains: query.q } },
          ...(digits ? [{ phone: { contains: digits } }, { cpf: { startsWith: digits } }] : []),
        ],
      }
    : {};
  const [rows, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      select,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.customer.count({ where }),
  ]);
  return { data: rows.map(toDTO), meta: { page: query.page, pageSize: query.pageSize, total } };
}

export async function get(id: number) {
  const row = await prisma.customer.findUnique({ where: { id }, select });
  if (!row) throw NotFound('Cliente');
  return toDTO(row);
}

export async function create(input: CreateCustomer) {
  return toDTO(
    await prisma.customer.create({
      data: { name: input.name, phone: input.phone ?? null, cpf: input.cpf ?? null },
      select,
    }),
  );
}

export async function update(id: number, input: UpdateCustomer) {
  await get(id);
  return toDTO(await prisma.customer.update({ where: { id }, data: input, select }));
}
