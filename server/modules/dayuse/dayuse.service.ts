import { NotFound } from '../../lib/errors';
import { money } from '../../lib/format';
import { prisma } from '../../lib/prisma';
import { Prisma, type DayUsePlan } from '../../generated/prisma/client';
import type { CreatePlan, UpdatePlan } from './dayuse.schemas';

const toDTO = (p: DayUsePlan) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  price: money(p.price),
  active: p.active,
});

// Poucos registros (dezenas no máximo): sem paginação de propósito.
export async function list(active?: boolean) {
  const rows = await prisma.dayUsePlan.findMany({ where: { active }, orderBy: { name: 'asc' } });
  return rows.map(toDTO);
}

export async function create(input: CreatePlan) {
  return toDTO(
    await prisma.dayUsePlan.create({
      data: { name: input.name, description: input.description ?? null, price: new Prisma.Decimal(input.price) },
    }),
  );
}

export async function update(id: number, input: UpdatePlan) {
  const exists = await prisma.dayUsePlan.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw NotFound('Plano de day use');
  return toDTO(
    await prisma.dayUsePlan.update({
      where: { id },
      data: { ...input, ...(input.price !== undefined && { price: new Prisma.Decimal(input.price) }) },
    }),
  );
}
