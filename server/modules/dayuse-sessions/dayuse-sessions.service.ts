import { BadRequest, Conflict, Forbidden, NotFound } from '../../lib/errors';
import { dateOnly, money, todayLocal, ymdOf } from '../../lib/format';
import { prisma, type Tx } from '../../lib/prisma';
import { Prisma } from '../../generated/prisma/client';
import type { AuthUser } from '../../lib/auth';
import type { AddEntry, ListSessions } from './dayuse-sessions.schemas';

/** Janela em que o operador pode remover um lançamento que ele mesmo fez. */
const OPERATOR_UNDO_WINDOW_MS = 10 * 60 * 1000;

const summaryInclude = {
  openedBy: { select: { name: true } },
  closedBy: { select: { name: true } },
  entries: { select: { quantity: true, subtotal: true } },
} as const;

const detailInclude = {
  openedBy: { select: { name: true } },
  closedBy: { select: { name: true } },
  entries: {
    include: { dayUsePlan: { select: { name: true } }, createdBy: { select: { name: true } } },
    orderBy: { id: 'asc' as const },
  },
} as const;

type Summary = Prisma.DayUseSessionGetPayload<{ include: typeof summaryInclude }>;
type Detail = Prisma.DayUseSessionGetPayload<{ include: typeof detailInclude }>;

const toSummary = (s: Summary) => ({
  id: s.id,
  date: ymdOf(s.date),
  status: s.status,
  openedBy: s.openedBy.name,
  closedBy: s.closedBy?.name ?? null,
  openedAt: s.openedAt.toISOString(),
  closedAt: s.closedAt?.toISOString() ?? null,
  entriesCount: s.entries.length,
  peopleCount: s.entries.reduce((sum, e) => sum + e.quantity, 0),
  total: money(s.entries.reduce((sum, e) => sum.add(e.subtotal), new Prisma.Decimal(0))),
});

async function toDetail(s: Detail) {
  const totals = await prisma.dayUseEntry.groupBy({
    by: ['paymentMethod'],
    where: { sessionId: s.id },
    _sum: { subtotal: true },
    _count: true,
  });
  return {
    ...toSummary(s),
    totalsByMethod: totals.map((t) => ({
      method: t.paymentMethod,
      total: money(t._sum.subtotal ?? new Prisma.Decimal(0)),
      count: t._count,
    })),
    entries: s.entries.map((e) => ({
      id: e.id,
      dayUsePlanId: e.dayUsePlanId,
      planName: e.dayUsePlan.name,
      personName: e.personName,
      quantity: e.quantity,
      unitPrice: money(e.unitPrice),
      subtotal: money(e.subtotal),
      paymentMethod: e.paymentMethod,
      createdBy: e.createdBy.name,
      createdById: e.createdById,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

/**
 * Trava o caixa do dia (SELECT ... FOR UPDATE) e garante que está ABERTO.
 * Mesmo papel do lockOpenTab: serializa check-ins concorrentes e impede lançamento
 * depois do fechamento.
 */
async function lockOpenSession(tx: Tx, sessionId: number) {
  const rows = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM day_use_sessions WHERE id = ${sessionId} FOR UPDATE`;
  const row = rows[0];
  if (!row) throw NotFound('Caixa de day use', true);
  if (row.status !== 'ABERTO') throw Conflict('Caixa de day use não está aberto', 'DAY_USE_SESSION_NOT_OPEN');
}

export async function list(q: ListSessions) {
  const [rows, total] = await prisma.$transaction([
    prisma.dayUseSession.findMany({
      include: summaryInclude,
      orderBy: { date: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.dayUseSession.count(),
  ]);
  return { data: rows.map(toSummary), meta: { page: q.page, pageSize: q.pageSize, total } };
}

export async function get(id: number) {
  const s = await prisma.dayUseSession.findUnique({ where: { id }, include: detailInclude });
  if (!s) throw NotFound('Caixa de day use', true);
  return toDetail(s);
}

/** Caixa aberto agora, se houver (no máximo um por vez). */
export async function current() {
  const s = await prisma.dayUseSession.findFirst({ where: { status: 'ABERTO' }, include: detailInclude });
  return s ? toDetail(s) : null;
}

export async function open(userId: number) {
  const openNow = await prisma.dayUseSession.findFirst({ where: { status: 'ABERTO' }, select: { date: true } });
  if (openNow) {
    throw Conflict(`Já existe um caixa de day use aberto (${ymdOf(openNow.date)}). Feche antes de abrir outro.`, 'DAY_USE_SESSION_ALREADY_OPEN');
  }

  try {
    const session = await prisma.dayUseSession.create({ data: { date: dateOnly(todayLocal()), openedById: userId } });
    return get(session.id);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw Conflict('O caixa de day use de hoje já foi aberto e fechado', 'DAY_USE_SESSION_DATE_TAKEN');
    }
    throw e;
  }
}

export async function addEntry(sessionId: number, input: AddEntry, userId: number) {
  await prisma.$transaction(async (tx) => {
    await lockOpenSession(tx, sessionId);
    const plan = await tx.dayUsePlan.findUnique({ where: { id: input.dayUsePlanId } });
    if (!plan) throw NotFound('Plano de day use');
    if (!plan.active) throw BadRequest(`Plano "${plan.name}" está inativo`, 'PLAN_INACTIVE');

    await tx.dayUseEntry.create({
      data: {
        sessionId,
        dayUsePlanId: plan.id,
        personName: input.personName,
        quantity: input.quantity,
        unitPrice: plan.price,
        subtotal: plan.price.mul(input.quantity),
        paymentMethod: input.paymentMethod,
        createdById: userId,
      },
    });
  });
  return get(sessionId);
}

export async function removeEntry(sessionId: number, entryId: number, actor: AuthUser) {
  await prisma.$transaction(async (tx) => {
    await lockOpenSession(tx, sessionId);
    // where com sessionId: impede remover lançamento de OUTRO caixa trocando o id na URL.
    const entry = await tx.dayUseEntry.findFirst({ where: { id: entryId, sessionId } });
    if (!entry) throw NotFound('Lançamento');

    if (actor.role !== 'ADMIN') {
      const own = entry.createdById === actor.id;
      const recent = Date.now() - entry.createdAt.getTime() <= OPERATOR_UNDO_WINDOW_MS;
      if (!own || !recent) throw Forbidden('Somente o admin pode remover este lançamento');
    }
    await tx.dayUseEntry.delete({ where: { id: entry.id } });
  });
  return get(sessionId);
}

export async function close(sessionId: number, userId: number) {
  await prisma.$transaction(async (tx) => {
    await lockOpenSession(tx, sessionId);
    await tx.dayUseSession.update({
      where: { id: sessionId },
      data: { status: 'FECHADO', closedAt: new Date(), closedById: userId },
    });
  });
  return get(sessionId);
}
