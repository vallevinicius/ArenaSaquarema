import { Prisma } from '../../generated/prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '../../generated/prisma/client';

const prisma = mockDeep<PrismaClient>();
vi.mock('../../lib/prisma', () => ({ prisma }));
vi.mock('../../lib/format', async (orig) => ({ ...(await orig<typeof import('../../lib/format')>()), todayLocal: () => '2026-11-09' }));

const svc = await import('./memberships.service');

// groupBy tem tipo genérico que o mockDeep não expõe: acesso tipado como vi.fn.
const groupBy = () => prisma.membershipPayment.groupBy as unknown as ReturnType<typeof vi.fn>;
const D = (v: string) => new Prisma.Decimal(v);
const date = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const plan2x = { id: 1, name: '2x na semana', price: D('130.00'), chargeable: true, active: true };
const parceiro = { id: 3, name: 'Wellhub', price: D('0.00'), chargeable: false, active: true };
const payRow = (over = {}) => ({
  id: 10, amount: D('130.00'), method: 'PIX', paidOn: date('2026-11-09'), periodStart: date('2026-11-09'), periodEnd: date('2026-12-08'),
  note: null, voidedAt: null, voidReason: null, plan: { name: '2x na semana' }, registeredBy: { name: 'Admin' }, ...over,
});

beforeEach(() => {
  mockReset(prisma);
  prisma.$transaction.mockImplementation((async (arg: unknown) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg as Promise<unknown>[]))) as never);
});

/** Monta o cenário comum de registerPayment: aluno encontrado/travado, plano e último período. */
function scenario(opts: { plan?: typeof plan2x | typeof parceiro | null; lastEnd?: string | null; duplicate?: boolean; locked?: boolean } = {}) {
  prisma.$queryRaw.mockResolvedValue((opts.locked === false ? [] : [{ id: 7 }]) as never);
  prisma.user.findUniqueOrThrow.mockResolvedValue({ membershipPlan: opts.plan === undefined ? plan2x : opts.plan } as never);
  prisma.membershipPayment.findFirst.mockResolvedValue((opts.duplicate ? { id: 99 } : null) as never);
  prisma.membershipPayment.aggregate.mockResolvedValue({ _max: { periodEnd: opts.lastEnd ? date(opts.lastEnd) : null } } as never);
  prisma.membershipPayment.create.mockResolvedValue(payRow() as never);
}
const created = () => prisma.membershipPayment.create.mock.calls[0]![0].data as Record<string, unknown>;

describe('registerPayment', () => {
  it('1º pagamento: usa o preço do plano, vale 30 dias a partir de hoje e guarda quem registrou', async () => {
    scenario();
    const dto = await svc.registerPayment(7, 1, { method: 'PIX' });
    expect(created()).toMatchObject({ userId: 7, planId: 1, method: 'PIX', createdById: 1, periodStart: date('2026-11-09'), periodEnd: date('2026-12-08') });
    expect(String(created().amount)).toBe('130');
    expect(dto).toMatchObject({ amount: '130.00', method: 'PIX', registeredBy: 'Admin', voided: false });
  });

  it('aceita valor diferente do plano (desconto) e a data de um pagamento antigo', async () => {
    scenario({ lastEnd: null });
    await svc.registerPayment(7, 1, { method: 'DINHEIRO', amount: 100, paidOn: '2026-11-02', note: ' desconto irmão ' });
    expect(String(created().amount)).toBe('100');
    expect(created()).toMatchObject({ paidOn: date('2026-11-02'), periodStart: date('2026-11-02'), periodEnd: date('2026-12-01') });
  });

  it('pagou antes de vencer: o período novo começa depois do atual (não perde dias)', async () => {
    scenario({ lastEnd: '2026-11-15' });
    await svc.registerPayment(7, 1, { method: 'PIX' });
    expect(created()).toMatchObject({ periodStart: date('2026-11-16'), periodEnd: date('2026-12-15') });
  });

  it('pagou depois de vencer: recomeça hoje', async () => {
    scenario({ lastEnd: '2026-10-01' });
    await svc.registerPayment(7, 1, { method: 'PIX' });
    expect(created()).toMatchObject({ periodStart: date('2026-11-09') });
  });

  it('trava a linha do aluno antes de calcular o período (pagamentos simultâneos)', async () => {
    scenario();
    await svc.registerPayment(7, 1, { method: 'PIX' });
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]!).toBeLessThan(prisma.membershipPayment.aggregate.mock.invocationCallOrder[0]!);
  });

  it.each([
    ['aluno inexistente ou que não é ALUNO', { locked: false }, 404, 'NOT_FOUND'],
    ['aluno sem plano', { plan: null }, 409, 'NO_PLAN'],
    ['plano de parceiro (não cobrado)', { plan: parceiro }, 409, 'PLAN_NOT_CHARGEABLE'],
    ['duplo clique (mesmo valor e forma há segundos)', { duplicate: true }, 409, 'DUPLICATE_PAYMENT'],
  ])('recusa: %s', async (_n, opts, status, code) => {
    scenario(opts);
    await expect(svc.registerPayment(7, 1, { method: 'PIX' })).rejects.toMatchObject({ statusCode: status, code });
    expect(prisma.membershipPayment.create).not.toHaveBeenCalled();
  });

  it('recusa data no futuro, data muito antiga e valor zero, sem tocar no banco', async () => {
    await expect(svc.registerPayment(7, 1, { method: 'PIX', paidOn: '2026-11-10' })).rejects.toMatchObject({ code: 'PAID_ON_IN_FUTURE' });
    await expect(svc.registerPayment(7, 1, { method: 'PIX', paidOn: '2026-08-01' })).rejects.toMatchObject({ code: 'PAID_ON_TOO_OLD' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    scenario({ plan: { ...plan2x, price: D('0.00') } });
    await expect(svc.registerPayment(7, 1, { method: 'PIX' })).rejects.toMatchObject({ code: 'AMOUNT_REQUIRED' });
  });

  it('aceita pagamento de 90 dias atrás (limite) e recusa 91', async () => {
    scenario();
    await expect(svc.registerPayment(7, 1, { method: 'PIX', paidOn: '2026-08-11' })).resolves.toBeDefined();
    await expect(svc.registerPayment(7, 1, { method: 'PIX', paidOn: '2026-08-10' })).rejects.toMatchObject({ code: 'PAID_ON_TOO_OLD' });
  });
});

describe('voidPayment', () => {
  it('estorna: marca quem, quando e por quê, e mantém o registro', async () => {
    prisma.membershipPayment.findUnique.mockResolvedValueOnce({ id: 10, userId: 7 } as never);
    prisma.$queryRaw.mockResolvedValue([] as never);
    prisma.membershipPayment.updateMany.mockResolvedValue({ count: 1 } as never);
    prisma.membershipPayment.findUniqueOrThrow.mockResolvedValue(payRow({ voidedAt: new Date(), voidReason: 'Lançado no aluno errado' }) as never);

    const dto = await svc.voidPayment(10, 1, 'Lançado no aluno errado');
    const arg = prisma.membershipPayment.updateMany.mock.calls[0]![0];
    expect(arg.where).toEqual({ id: 10, voidedAt: null });
    expect(arg.data).toMatchObject({ voidedById: 1, voidReason: 'Lançado no aluno errado' });
    expect(dto).toMatchObject({ voided: true, voidReason: 'Lançado no aluno errado' });
    expect(prisma.membershipPayment.delete).not.toHaveBeenCalled();
  });

  it('já estornado (ou estorno simultâneo): 409', async () => {
    prisma.membershipPayment.findUnique.mockResolvedValueOnce({ id: 10, userId: 7 } as never);
    prisma.$queryRaw.mockResolvedValue([] as never);
    prisma.membershipPayment.updateMany.mockResolvedValue({ count: 0 } as never);
    await expect(svc.voidPayment(10, 1, 'engano')).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_VOIDED' });
  });

  it('pagamento inexistente: 404', async () => {
    prisma.membershipPayment.findUnique.mockResolvedValueOnce(null);
    await expect(svc.voidPayment(99, 1, 'engano')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('setStudentPlan', () => {
  it('só mexe em ALUNO: outro papel é 404', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(svc.setStudentPlan(1, 1)).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.user.findFirst.mock.calls[0]![0]!.where).toMatchObject({ id: 1, role: 'ALUNO' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('plano desativado ou inexistente é recusado', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 7 } as never);
    prisma.membershipPlan.findUnique.mockResolvedValueOnce({ active: false } as never);
    await expect(svc.setStudentPlan(7, 1)).rejects.toMatchObject({ code: 'PLAN_INACTIVE' });
    prisma.membershipPlan.findUnique.mockResolvedValueOnce(null);
    await expect(svc.setStudentPlan(7, 99)).rejects.toMatchObject({ statusCode: 404 });
  });
  it('troca o plano e devolve a situação; null remove o plano', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 7 } as never);
    prisma.membershipPlan.findUnique.mockResolvedValue({ active: true } as never);
    prisma.user.update.mockResolvedValue({ id: 7, name: 'Ana', email: 'a@x.com', membershipPlan: plan2x } as never);
    groupBy().mockResolvedValue([] as never);
    expect(await svc.setStudentPlan(7, 1)).toMatchObject({ status: 'SEM_PAGAMENTO', plan: { name: '2x na semana', price: '130.00' } });

    prisma.user.update.mockResolvedValue({ id: 7, name: 'Ana', email: 'a@x.com', membershipPlan: null } as never);
    expect((await svc.setStudentPlan(7, null)).status).toBe('SEM_PLANO');
    expect(prisma.user.update.mock.calls[1]![0].data).toEqual({ membershipPlanId: null });
  });
});

describe('overview', () => {
  const stu = (id: number, name: string, plan: typeof plan2x | typeof parceiro | null) => ({ id, name, email: `${name.toLowerCase()}@x.com`, membershipPlan: plan });
  beforeEach(() => {
    prisma.user.findMany.mockResolvedValue([
      stu(1, 'Ana', plan2x), // vence 2026-11-20 -> em dia
      stu(2, 'Bia', plan2x), // vence 2026-11-01 -> vencido
      stu(3, 'Caio', parceiro),
      stu(4, 'Duda', null),
      stu(5, 'Edu', plan2x), // nunca pagou
      stu(6, 'Fabi', plan2x), // vence 2026-11-12 -> em breve
    ] as never);
    groupBy().mockResolvedValue([
      { userId: 1, _max: { periodEnd: date('2026-11-20') } },
      { userId: 2, _max: { periodEnd: date('2026-11-01') } },
      { userId: 6, _max: { periodEnd: date('2026-11-12') } },
    ] as never);
    prisma.membershipPayment.aggregate.mockResolvedValue({ _sum: { amount: D('280.00') } } as never);
  });
  const q = { page: 1, pageSize: 20 };

  it('quem precisa de cobrança vem primeiro e o resumo conta todos os ativos', async () => {
    const r = await svc.overview(q);
    expect(r.data.map((x) => x.name)).toEqual(['Bia', 'Edu', 'Fabi', 'Ana', 'Caio', 'Duda']);
    expect(r.summary.counts).toEqual({ EM_DIA: 1, VENCIDO: 1, PARCEIRO: 1, SEM_PLANO: 1, SEM_PAGAMENTO: 1, VENCE_EM_BREVE: 1 });
    expect(r.summary.receivedThisMonth).toBe('280.00');
  });

  it('só considera alunos ativos e não conta pagamento estornado', async () => {
    await svc.overview(q);
    expect(prisma.user.findMany.mock.calls[0]![0]!.where).toEqual({ role: 'ALUNO', active: true });
    expect(groupBy().mock.calls[0]![0]!.where).toMatchObject({ voidedAt: null });
    expect(prisma.membershipPayment.aggregate.mock.calls[0]![0]!.where).toMatchObject({ voidedAt: null });
  });

  it('filtra por situação e por busca, sem mudar os cartões de resumo', async () => {
    const venc = await svc.overview({ ...q, status: 'VENCIDO' });
    expect(venc.data.map((x) => x.name)).toEqual(['Bia']);
    expect(venc.summary.counts.EM_DIA).toBe(1);
    expect((await svc.overview({ ...q, q: 'ED' })).data.map((x) => x.name)).toEqual(['Edu']);
  });

  it('pagina o resultado', async () => {
    const r = await svc.overview({ page: 2, pageSize: 4 });
    expect(r.meta).toEqual({ page: 2, pageSize: 4, total: 6 });
    expect(r.data.map((x) => x.name)).toEqual(['Caio', 'Duda']);
  });

  it('não vaza dados sensíveis', async () => {
    const r = await svc.overview(q);
    expect(JSON.stringify(r)).not.toMatch(/passwordHash|tokenVersion/);
  });
});

describe('myMembership', () => {
  it('lê só o usuário da sessão', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7, name: 'Ana', email: 'a@x.com', membershipPlan: plan2x } as never);
    groupBy().mockResolvedValue([{ userId: 7, _max: { periodEnd: date('2026-11-20') } }] as never);
    expect(await svc.myMembership(7)).toEqual({ planName: '2x na semana', status: 'EM_DIA', validUntil: '2026-11-20', daysLeft: 11 });
    expect(prisma.user.findUnique.mock.calls[0]![0]!.where).toEqual({ id: 7 });
    expect(groupBy().mock.calls[0]![0]!.where).toMatchObject({ userId: { in: [7] } });
  });
});

describe('planos', () => {
  it('criar converte o preço para Decimal e lista a contagem de alunos', async () => {
    prisma.membershipPlan.create.mockResolvedValue({ ...plan2x, _count: { students: 3 } } as never);
    const dto = await svc.createPlan({ name: '2x na semana', price: 130, chargeable: true });
    expect(prisma.membershipPlan.create.mock.calls[0]![0].data.price).toBeInstanceOf(Prisma.Decimal);
    expect(dto).toEqual({ id: 1, name: '2x na semana', price: '130.00', chargeable: true, active: true, studentsCount: 3 });
  });
  it('editar plano inexistente: 404', async () => {
    prisma.membershipPlan.findUnique.mockResolvedValue(null);
    await expect(svc.updatePlan(9, { price: 140 })).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.membershipPlan.update).not.toHaveBeenCalled();
  });
});
