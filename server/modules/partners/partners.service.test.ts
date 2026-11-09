import { Prisma } from '../../generated/prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '../../generated/prisma/client';

const SECRET = 'segredo-de-teste-com-mais-de-24-chars';
const prisma = mockDeep<PrismaClient>();
const tp = { canReceive: vi.fn(), hasCredentials: vi.fn(), validateCheckIn: vi.fn(), registerWebhook: vi.fn() };
const envMock: Record<string, string | undefined> = { TOTALPASS_WEBHOOK_SECRET: SECRET, TOTALPASS_VALIDATE_URL: 'https://confirm.example.com/v1' };
vi.mock('../../lib/prisma', () => ({ prisma }));
vi.mock('../../config/env', () => ({ env: envMock }));
vi.mock('./totalpass.client', () => tp);
vi.mock('../../lib/format', async (orig) => ({ ...(await orig<typeof import('../../lib/format')>()), todayLocal: () => '2026-11-09' }));
vi.mock('../../lib/rate-limit', () => ({ hit: () => ({ allowed: true, retryAfterSec: 0 }) }));

const svc = await import('./partners.service');

const date = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const payload = (over: Record<string, unknown> = {}) => ({
  type: 'CHECK_IN_CREATED',
  endpoint: 'https://attacker.example/steal/TOKEN-abcdef-123456',
  check_in: { started_at: '2026-11-09T20:10:00.000-03:00', expires_at: '2026-11-09T21:40:00.000-03:00' },
  user: { name: '  Maria Souza ', code: 98765 },
  ...over,
});
const created = () => prisma.partnerCheckIn.create.mock.calls[0]![0].data as Record<string, unknown>;

beforeEach(() => {
  mockReset(prisma);
  Object.values(tp).forEach((f) => f.mockReset());
  tp.canReceive.mockReturnValue(true);
  tp.hasCredentials.mockReturnValue(true);
  prisma.partnerCheckIn.create.mockResolvedValue({ id: 5 } as never);
  prisma.partnerCheckIn.update.mockResolvedValue({} as never);
});

describe('ingestTotalPass: segurança', () => {
  it('segredo errado ou integração desligada: 404 e nada é gravado nem chamado', async () => {
    await expect(svc.ingestTotalPass('errado', payload() as never)).rejects.toMatchObject({ statusCode: 404 });
    tp.canReceive.mockReturnValue(false);
    await expect(svc.ingestTotalPass(SECRET, payload() as never)).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.partnerCheckIn.create).not.toHaveBeenCalled();
    expect(tp.validateCheckIn).not.toHaveBeenCalled();
  });

  it('usa só o token do endpoint: a URL do aviso nunca é acessada (SSRF)', async () => {
    tp.validateCheckIn.mockResolvedValue('VALIDATED');
    await svc.ingestTotalPass(SECRET, payload() as never);
    expect(tp.validateCheckIn).toHaveBeenCalledWith('TOKEN-abcdef-123456');
  });

  it('recusa endpoint sem token válido e data inválida, sem gravar', async () => {
    await expect(svc.ingestTotalPass(SECRET, payload({ endpoint: 'https://x.com/curto' }) as never)).rejects.toMatchObject({ code: 'INVALID_ENDPOINT' });
    await expect(svc.ingestTotalPass(SECRET, payload({ check_in: { started_at: 'ontem' } }) as never)).rejects.toMatchObject({ code: 'INVALID_DATE' });
    expect(prisma.partnerCheckIn.create).not.toHaveBeenCalled();
  });

  it('não grava CPF, e-mail nem telefone, mesmo que cheguem no aviso', async () => {
    tp.validateCheckIn.mockResolvedValue('VALIDATED');
    const withPii = payload({ user: { name: 'Maria', code: 'u1', email: 'm@x.com', phone: '2299999', document_number: '12345678900', document_type: 'cpf' } });
    await svc.ingestTotalPass(SECRET, withPii as never);
    expect(JSON.stringify(created())).not.toMatch(/m@x\.com|2299999|12345678900|cpf/);
  });
});

describe('ingestTotalPass: fluxo', () => {
  it('confirmado: grava PENDENTE com token, depois VALIDADO e apaga o token', async () => {
    tp.validateCheckIn.mockResolvedValue('VALIDATED');
    expect(await svc.ingestTotalPass(SECRET, payload() as never)).toEqual({ status: 'validated' });
    expect(created()).toMatchObject({
      platform: 'TOTALPASS', externalId: 'TOKEN-abcdef-123456', personName: 'Maria Souza', personCode: '98765',
      status: 'PENDENTE', source: 'API', day: date('2026-11-09'),
    });
    expect(prisma.partnerCheckIn.update.mock.calls[0]![0]).toMatchObject({ where: { id: 5 }, data: { status: 'VALIDADO', validationToken: null } });
  });

  it('o dia vem do fuso da arena: 22h30 de SP não vira o dia seguinte (UTC)', async () => {
    tp.validateCheckIn.mockResolvedValue('VALIDATED');
    await svc.ingestTotalPass(SECRET, payload({ check_in: { started_at: '2026-11-09T22:30:00-03:00' } }) as never);
    expect(created().day).toEqual(date('2026-11-09'));
  });

  it('plataforma recusou (tempo esgotado): EXPIRADO, que não conta', async () => {
    tp.validateCheckIn.mockResolvedValue('EXPIRED');
    expect(await svc.ingestTotalPass(SECRET, payload() as never)).toEqual({ status: 'expired' });
    expect(prisma.partnerCheckIn.update.mock.calls[0]![0].data).toMatchObject({ status: 'EXPIRADO', validationToken: null });
  });

  it('plataforma fora do ar: continua PENDENTE (com o token) para tentar de novo', async () => {
    tp.validateCheckIn.mockResolvedValue('RETRY');
    expect(await svc.ingestTotalPass(SECRET, payload() as never)).toEqual({ status: 'pending' });
    expect(prisma.partnerCheckIn.update).not.toHaveBeenCalled();
  });

  it('mesmo aviso de novo (reenvio): duplicado, sem confirmar nem gravar outra vez', async () => {
    prisma.partnerCheckIn.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    expect(await svc.ingestTotalPass(SECRET, payload() as never)).toEqual({ status: 'duplicate' });
    expect(tp.validateCheckIn).not.toHaveBeenCalled();
  });

  it('tipo de evento diferente é ignorado', async () => {
    expect(await svc.ingestTotalPass(SECRET, payload({ type: 'OUTRO' }) as never)).toEqual({ status: 'ignored' });
    expect(prisma.partnerCheckIn.create).not.toHaveBeenCalled();
  });
});

describe('revalidate', () => {
  const row = (over = {}) => ({ id: 5, platform: 'TOTALPASS', personName: 'Maria', personCode: null, checkedInAt: new Date(), status: 'PENDENTE', source: 'API', note: null, validationToken: 'TOKEN-abcdef-123456', ...over });
  it('confirma e promove a VALIDADO, sem devolver o token', async () => {
    prisma.partnerCheckIn.findUnique.mockResolvedValue(row() as never);
    tp.validateCheckIn.mockResolvedValue('VALIDATED');
    const dto = await svc.revalidate(5);
    expect(dto.status).toBe('VALIDADO');
    expect(dto).not.toHaveProperty('validationToken');
  });
  it.each([['já validado', { status: 'VALIDADO' }], ['manual/sem token', { validationToken: null }], ['Wellhub', { platform: 'WELLHUB' }]])('recusa: %s', async (_n, over) => {
    prisma.partnerCheckIn.findUnique.mockResolvedValue(row(over) as never);
    await expect(svc.revalidate(5)).rejects.toMatchObject({ code: 'NOT_PENDING' });
  });
  it('inexistente: 404', async () => {
    prisma.partnerCheckIn.findUnique.mockResolvedValue(null);
    await expect(svc.revalidate(9)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('lançamento manual e remoção', () => {
  it('lança como VALIDADO/MANUAL, hoje com a hora atual, registrando quem lançou', async () => {
    prisma.partnerCheckIn.create.mockResolvedValue({ id: 1, platform: 'WELLHUB', personName: 'João', personCode: null, checkedInAt: new Date(), status: 'VALIDADO', source: 'MANUAL', note: null } as never);
    await svc.createManual({ platform: 'WELLHUB', personName: 'João' }, 1);
    expect(created()).toMatchObject({ platform: 'WELLHUB', status: 'VALIDADO', source: 'MANUAL', createdById: 1, day: date('2026-11-09') });
    expect(created()).not.toHaveProperty('externalId'); // manual não tem id de plataforma
  });
  it('dia passado vira meio-dia local; futuro é recusado', async () => {
    prisma.partnerCheckIn.create.mockResolvedValue({ id: 1, platform: 'TOTALPASS', personName: 'J', personCode: null, checkedInAt: new Date(), status: 'VALIDADO', source: 'MANUAL', note: null } as never);
    await svc.createManual({ platform: 'TOTALPASS', personName: 'João', day: '2026-11-05' }, 1);
    expect((created().checkedInAt as Date).toISOString()).toBe('2026-11-05T15:00:00.000Z');
    await expect(svc.createManual({ platform: 'TOTALPASS', personName: 'João', day: '2026-11-10' }, 1)).rejects.toMatchObject({ code: 'DAY_IN_FUTURE' });
  });
  it('só remove manual; o que veio da plataforma fica', async () => {
    prisma.partnerCheckIn.findUnique.mockResolvedValueOnce({ source: 'API' } as never);
    await expect(svc.remove(1)).rejects.toMatchObject({ code: 'NOT_MANUAL' });
    prisma.partnerCheckIn.findUnique.mockResolvedValueOnce({ source: 'MANUAL' } as never);
    await svc.remove(2);
    expect(prisma.partnerCheckIn.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    prisma.partnerCheckIn.findUnique.mockResolvedValueOnce(null);
    await expect(svc.remove(3)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('leitura', () => {
  const g = () => prisma.partnerCheckIn.groupBy as unknown as ReturnType<typeof vi.fn>;
  it('lista do dia com contagem separada por plataforma e pendentes à parte', async () => {
    prisma.partnerCheckIn.findMany.mockResolvedValue([{ id: 1, platform: 'WELLHUB', personName: 'A', personCode: null, checkedInAt: new Date('2026-11-09T12:00:00Z'), status: 'VALIDADO', source: 'MANUAL', note: null }] as never);
    prisma.partnerCheckIn.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    g().mockResolvedValue([{ platform: 'WELLHUB', _count: { _all: 3 } }, { platform: 'TOTALPASS', _count: { _all: 4 } }]);
    const r = await svc.list({ page: 1, pageSize: 20 });
    expect(r.date).toBe('2026-11-09');
    expect(r.counts).toEqual({ WELLHUB: 3, TOTALPASS: 4, pending: 2 });
    expect(g().mock.calls[0]![0].where).toMatchObject({ status: 'VALIDADO' }); // pendente/expirado não contam
    expect(JSON.stringify(r)).not.toMatch(/validationToken|externalId/);
  });
  it('resumo do mês soma por dia e só conta VALIDADOS', async () => {
    g().mockResolvedValue([
      { day: date('2026-11-09'), platform: 'WELLHUB', _count: { _all: 2 } },
      { day: date('2026-11-09'), platform: 'TOTALPASS', _count: { _all: 5 } },
      { day: date('2026-11-03'), platform: 'TOTALPASS', _count: { _all: 1 } },
    ]);
    const r = await svc.summary('2026-11');
    expect(r.totals).toEqual({ WELLHUB: 2, TOTALPASS: 6 });
    expect(r.byDay).toEqual([{ date: '2026-11-09', WELLHUB: 2, TOTALPASS: 5 }, { date: '2026-11-03', WELLHUB: 0, TOTALPASS: 1 }]);
    expect(g().mock.calls[0]![0].where).toMatchObject({ status: 'VALIDADO' });
  });
});

describe('configuração', () => {
  it('status não expõe chaves e o Wellhub aparece como aguardando', () => {
    const s = svc.integrationStatus();
    expect(s).toMatchObject({ totalpass: { credentials: true, receiving: true }, wellhub: { available: false } });
    expect(JSON.stringify(s)).not.toContain(SECRET);
  });
  it('registrar sem configuração ou com SITE_URL local é recusado', async () => {
    tp.hasCredentials.mockReturnValue(false);
    await expect(svc.registerTotalPassWebhook()).rejects.toMatchObject({ code: 'INTEGRATION_OFF' });
    tp.hasCredentials.mockReturnValue(true);
    delete process.env.SITE_URL; // cai em http://localhost:3000
    await expect(svc.registerTotalPassWebhook()).rejects.toMatchObject({ code: 'SITE_URL_NOT_PUBLIC' });
    expect(tp.registerWebhook).not.toHaveBeenCalled();
  });
  it('registrar com tudo certo manda a URL com o segredo, mas não o devolve', async () => {
    process.env.SITE_URL = 'https://arena.example.com';
    tp.registerWebhook.mockResolvedValue(undefined);
    const r = await svc.registerTotalPassWebhook();
    expect(tp.registerWebhook).toHaveBeenCalledWith(`https://arena.example.com/api/partners/totalpass/webhook/${SECRET}`);
    expect(JSON.stringify(r)).not.toContain(SECRET);
    delete process.env.SITE_URL;
  });
  it('falha da TotalPass vira 503 sem vazar o erro', async () => {
    process.env.SITE_URL = 'https://arena.example.com';
    tp.registerWebhook.mockRejectedValue(new Error('401 chave abc'));
    await expect(svc.registerTotalPassWebhook()).rejects.toMatchObject({ statusCode: 503, code: 'TOTALPASS_UNAVAILABLE' });
    delete process.env.SITE_URL;
  });
});
