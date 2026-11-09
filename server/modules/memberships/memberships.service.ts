import { Prisma } from '../../generated/prisma/client';
import { BadRequest, Conflict, NotFound } from '../../lib/errors';
import { dateOnly, money, todayLocal, ymdOf } from '../../lib/format';
import { prisma } from '../../lib/prisma';
import { monthRange } from '../attendance/attendance.utils';
import type { ListMemberships, CreateMembershipPlan, RegisterPayment, UpdateMembershipPlan } from './memberships.schemas';
import { STATUS_ORDER, diffDays, periodFor, statusOf, type MembershipStatus } from './memberships.utils';

/** Pagamento digitado com data mais antiga que isso é quase certo erro de digitação. */
const MAX_BACKDATE_DAYS = 90;
/** Mesmo aluno + valor + forma dentro desse intervalo = duplo clique. */
const DUPLICATE_WINDOW_MS = 60_000;
/** Teto de alunos carregados na visão geral (a arena tem dezenas/centenas; o resto é paginado na resposta). */
const OVERVIEW_CAP = 2000;

// ---------- Planos ----------
type PlanRow = { id: number; name: string; price: Prisma.Decimal; chargeable: boolean; active: boolean; _count: { students: number } };
const planDTO = (p: PlanRow) => ({ id: p.id, name: p.name, price: money(p.price), chargeable: p.chargeable, active: p.active, studentsCount: p._count.students });
const planSelect = { id: true, name: true, price: true, chargeable: true, active: true, _count: { select: { students: true } } } as const;

// Poucos registros: sem paginação de propósito.
export async function listPlans() {
  const rows = await prisma.membershipPlan.findMany({ select: planSelect, orderBy: [{ active: 'desc' }, { name: 'asc' }] });
  return rows.map(planDTO);
}

export async function createPlan(input: CreateMembershipPlan) {
  const row = await prisma.membershipPlan.create({
    data: { name: input.name, price: new Prisma.Decimal(input.price), chargeable: input.chargeable },
    select: planSelect,
  });
  return planDTO(row);
}

export async function updatePlan(id: number, input: UpdateMembershipPlan) {
  const exists = await prisma.membershipPlan.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw NotFound('Plano de mensalidade');
  const row = await prisma.membershipPlan.update({
    where: { id },
    data: { ...input, ...(input.price !== undefined && { price: new Prisma.Decimal(input.price) }) },
    select: planSelect,
  });
  return planDTO(row);
}

// ---------- Visão geral ----------
const studentSelect = {
  id: true,
  name: true,
  email: true,
  membershipPlan: { select: { id: true, name: true, price: true, chargeable: true } },
} as const;

type StudentRow = {
  id: number;
  name: string;
  email: string;
  membershipPlan: { id: number; name: string; price: Prisma.Decimal; chargeable: boolean } | null;
};

function toRow(s: StudentRow, validUntil: string | null, today: string) {
  const { status, daysLeft } = statusOf({
    hasPlan: !!s.membershipPlan,
    chargeable: s.membershipPlan?.chargeable ?? false,
    validUntil,
    today,
  });
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    plan: s.membershipPlan && { id: s.membershipPlan.id, name: s.membershipPlan.name, price: money(s.membershipPlan.price), chargeable: s.membershipPlan.chargeable },
    status,
    validUntil,
    daysLeft,
  };
}

/** Fim da validade por aluno (maior periodEnd entre pagamentos NÃO estornados), em 1 query para todos. */
async function validUntilByUser(ids: number[]) {
  const ends = await prisma.membershipPayment.groupBy({
    by: ['userId'],
    where: { userId: { in: ids }, voidedAt: null },
    _max: { periodEnd: true },
  });
  return new Map(ends.map((e) => [e.userId, e._max.periodEnd ? ymdOf(e._max.periodEnd) : null]));
}

export async function overview(q: ListMemberships) {
  const today = todayLocal();
  const students = await prisma.user.findMany({
    where: { role: 'ALUNO', active: true },
    select: studentSelect,
    orderBy: { name: 'asc' },
    take: OVERVIEW_CAP,
  });
  const ends = await validUntilByUser(students.map((s) => s.id));
  const all = students.map((s) => toRow(s, ends.get(s.id) ?? null, today));

  // Os cartões de resumo contam todos os alunos ativos; busca e filtro só afetam a lista.
  const counts: Record<string, number> = {};
  for (const r of all) counts[r.status] = (counts[r.status] ?? 0) + 1;

  const needle = q.q?.toLowerCase();
  const filtered = all
    .filter((r) => !q.status || r.status === q.status)
    .filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.email.toLowerCase().includes(needle))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.daysLeft ?? 0) - (b.daysLeft ?? 0) || a.name.localeCompare(b.name, 'pt-BR'));

  const { from, to } = monthRange(today.slice(0, 7));
  const received = await prisma.membershipPayment.aggregate({
    where: { voidedAt: null, paidOn: { gte: dateOnly(from), lt: dateOnly(to) } },
    _sum: { amount: true },
  });

  return {
    data: filtered.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
    meta: { page: q.page, pageSize: q.pageSize, total: filtered.length },
    summary: { counts, receivedThisMonth: money(received._sum.amount ?? new Prisma.Decimal(0)) },
  };
}

// ---------- Plano do aluno ----------
export async function setStudentPlan(userId: number, planId: number | null) {
  const student = await prisma.user.findFirst({ where: { id: userId, role: 'ALUNO' }, select: { id: true } });
  if (!student) throw NotFound('Aluno');
  if (planId !== null) {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId }, select: { active: true } });
    if (!plan) throw NotFound('Plano de mensalidade');
    if (!plan.active) throw Conflict('Este plano está desativado', 'PLAN_INACTIVE');
  }
  const row = await prisma.user.update({ where: { id: userId }, data: { membershipPlanId: planId }, select: studentSelect });
  const ends = await validUntilByUser([userId]);
  return toRow(row, ends.get(userId) ?? null, todayLocal());
}

// ---------- Pagamentos ----------
type PaymentRow = {
  id: number;
  amount: Prisma.Decimal;
  method: 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO';
  paidOn: Date;
  periodStart: Date;
  periodEnd: Date;
  note: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
  plan: { name: string };
  registeredBy: { name: string };
};
const paymentInclude = { plan: { select: { name: true } }, registeredBy: { select: { name: true } } } as const;
const paymentDTO = (p: PaymentRow) => ({
  id: p.id,
  planName: p.plan.name,
  amount: money(p.amount),
  method: p.method,
  paidOn: ymdOf(p.paidOn),
  periodStart: ymdOf(p.periodStart),
  periodEnd: ymdOf(p.periodEnd),
  note: p.note,
  registeredBy: p.registeredBy.name,
  voided: p.voidedAt !== null,
  voidReason: p.voidReason,
});

export async function listPayments(userId: number, page: number, pageSize: number) {
  const student = await prisma.user.findFirst({ where: { id: userId, role: 'ALUNO' }, select: { id: true } });
  if (!student) throw NotFound('Aluno');
  const where = { userId };
  const [rows, total] = await prisma.$transaction([
    prisma.membershipPayment.findMany({
      where,
      include: paymentInclude,
      orderBy: [{ periodEnd: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.membershipPayment.count({ where }),
  ]);
  return { data: rows.map(paymentDTO), meta: { page, pageSize, total } };
}

export async function registerPayment(userId: number, actorId: number, input: RegisterPayment) {
  const today = todayLocal();
  const paidOn = input.paidOn ?? today;
  if (paidOn > today) throw BadRequest('A data do pagamento não pode ser no futuro', 'PAID_ON_IN_FUTURE');
  if (diffDays(paidOn, today) > MAX_BACKDATE_DAYS) {
    throw BadRequest(`Data do pagamento com mais de ${MAX_BACKDATE_DAYS} dias. Confira o dia informado.`, 'PAID_ON_TOO_OLD');
  }

  return prisma.$transaction(async (tx) => {
    // Trava a linha do aluno: dois pagamentos simultâneos não calculam o mesmo período.
    const locked = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM users WHERE id = ${userId} AND role = 'ALUNO' FOR UPDATE`;
    if (!locked[0]) throw NotFound('Aluno');

    const { membershipPlan: plan } = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { membershipPlan: true } });
    if (!plan) throw Conflict('Escolha o plano do aluno antes de registrar o pagamento', 'NO_PLAN');
    if (!plan.chargeable) throw Conflict(`${plan.name} é plano de parceiro: a arena não cobra a mensalidade`, 'PLAN_NOT_CHARGEABLE');

    const amount = new Prisma.Decimal(input.amount ?? plan.price.toFixed(2));
    if (amount.lte(0)) throw BadRequest('Informe o valor recebido', 'AMOUNT_REQUIRED');

    const duplicate = await tx.membershipPayment.findFirst({
      where: { userId, voidedAt: null, method: input.method, amount, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
      select: { id: true },
    });
    if (duplicate) throw Conflict('Esse pagamento acabou de ser registrado. Confira o histórico antes de repetir.', 'DUPLICATE_PAYMENT');

    const last = await tx.membershipPayment.aggregate({ where: { userId, voidedAt: null }, _max: { periodEnd: true } });
    const { start, end } = periodFor(paidOn, last._max.periodEnd ? ymdOf(last._max.periodEnd) : null);

    const row = await tx.membershipPayment.create({
      data: {
        userId,
        planId: plan.id,
        amount,
        method: input.method,
        paidOn: dateOnly(paidOn),
        periodStart: dateOnly(start),
        periodEnd: dateOnly(end),
        note: input.note || null,
        createdById: actorId,
      },
      include: paymentInclude,
    });
    return paymentDTO(row);
  });
}

/** Estorno: o pagamento continua no histórico, mas deixa de contar para a validade. */
export async function voidPayment(paymentId: number, actorId: number, reason: string) {
  const found = await prisma.membershipPayment.findUnique({ where: { id: paymentId }, select: { id: true, userId: true } });
  if (!found) throw NotFound('Pagamento');

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${found.userId} FOR UPDATE`;
    // Condicional no WHERE: dois estornos simultâneos não passam os dois.
    const done = await tx.membershipPayment.updateMany({
      where: { id: paymentId, voidedAt: null },
      data: { voidedAt: new Date(), voidedById: actorId, voidReason: reason },
    });
    if (done.count === 0) throw Conflict('Este pagamento já foi estornado', 'ALREADY_VOIDED');
    return paymentDTO(await tx.membershipPayment.findUniqueOrThrow({ where: { id: paymentId }, include: paymentInclude }));
  });
}

// ---------- Aluno ----------
/** O aluno só enxerga a PRÓPRIA situação: userId vem da sessão, nunca do cliente. */
export async function myMembership(userId: number) {
  const s = await prisma.user.findUnique({ where: { id: userId }, select: studentSelect });
  if (!s) throw NotFound('Aluno');
  const ends = await validUntilByUser([userId]);
  const row = toRow(s, ends.get(userId) ?? null, todayLocal());
  return { planName: row.plan?.name ?? null, status: row.status as MembershipStatus, validUntil: row.validUntil, daysLeft: row.daysLeft };
}
