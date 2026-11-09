import { Prisma } from '../../generated/prisma/client';
import { env } from '../../config/env';
import { BadRequest, Conflict, NotFound, ServiceUnavailable } from '../../lib/errors';
import { dateOnly, startOfLocalDay, todayLocal, ymdOf } from '../../lib/format';
import { siteUrl } from '../../../lib/contato';
import { logger } from '../../lib/logger';
import { hit } from '../../lib/rate-limit';
import { prisma } from '../../lib/prisma';
import { monthRange } from '../attendance/attendance.utils';
import type { CreatePartnerCheckIn, ListPartnerCheckIns, TotalPassWebhook } from './partners.schemas';
import { localDay, safeEqual, tokenFromEndpoint } from './partners.utils';
import * as totalpass from './totalpass.client';

type Row = {
  id: number;
  platform: 'WELLHUB' | 'TOTALPASS';
  personName: string;
  personCode: string | null;
  checkedInAt: Date;
  status: 'PENDENTE' | 'VALIDADO' | 'EXPIRADO';
  source: 'MANUAL' | 'API';
  note: string | null;
};
// select explícito: validationToken e createdById nunca saem do service.
const select = { id: true, platform: true, personName: true, personCode: true, checkedInAt: true, status: true, source: true, note: true } as const;
const toDTO = (r: Row) => ({ ...r, checkedInAt: r.checkedInAt.toISOString() });

// ---------- Leitura (só admin: a rota exige roles ADMIN) ----------
export async function list(q: ListPartnerCheckIns) {
  const date = q.date ?? todayLocal();
  const where = { day: dateOnly(date), ...(q.platform && { platform: q.platform }) };
  const dayWhere = { day: dateOnly(date) };
  const [rows, total, grouped, pending] = await Promise.all([
    prisma.partnerCheckIn.findMany({ where, select, orderBy: [{ checkedInAt: 'desc' }, { id: 'desc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    prisma.partnerCheckIn.count({ where }),
    prisma.partnerCheckIn.groupBy({ by: ['platform'], where: { ...dayWhere, status: 'VALIDADO' }, _count: { _all: true } }),
    prisma.partnerCheckIn.count({ where: { ...dayWhere, status: 'PENDENTE' } }),
  ]);
  const count = (p: string) => grouped.find((g) => g.platform === p)?._count._all ?? 0;
  return {
    data: rows.map(toDTO),
    meta: { page: q.page, pageSize: q.pageSize, total },
    date,
    counts: { WELLHUB: count('WELLHUB'), TOTALPASS: count('TOTALPASS'), pending },
  };
}

/** Contagem do mês por plataforma e por dia. Só VALIDADOS; sem nomes. */
export async function summary(month = todayLocal().slice(0, 7)) {
  const { from, to } = monthRange(month);
  const grouped = await prisma.partnerCheckIn.groupBy({
    by: ['day', 'platform'],
    where: { status: 'VALIDADO', day: { gte: dateOnly(from), lt: dateOnly(to) } },
    _count: { _all: true },
  });
  const days = new Map<string, { date: string; WELLHUB: number; TOTALPASS: number }>();
  const totals = { WELLHUB: 0, TOTALPASS: 0 };
  for (const g of grouped) {
    const date = ymdOf(g.day);
    const d = days.get(date) ?? { date, WELLHUB: 0, TOTALPASS: 0 };
    d[g.platform] += g._count._all;
    totals[g.platform] += g._count._all;
    days.set(date, d);
  }
  return { month, totals, byDay: [...days.values()].sort((a, b) => b.date.localeCompare(a.date)) };
}

// ---------- Lançamento manual ----------
export async function createManual(input: CreatePartnerCheckIn, actorId: number) {
  const today = todayLocal();
  const day = input.day ?? today;
  if (day > today) throw BadRequest('O dia do check-in não pode ser no futuro', 'DAY_IN_FUTURE');
  // Hoje: agora. Dia passado: meio-dia local (a hora exata não é conhecida).
  const checkedInAt = day === today ? new Date() : new Date(startOfLocalDay(day).getTime() + 12 * 3600_000);
  const row = await prisma.partnerCheckIn.create({
    data: {
      platform: input.platform,
      personName: input.personName,
      personCode: input.personCode || null,
      checkedInAt,
      day: dateOnly(day),
      status: 'VALIDADO',
      source: 'MANUAL',
      note: input.note || null,
      createdById: actorId,
    },
    select,
  });
  return toDTO(row);
}

/** Só lançamento manual pode ser removido; o que veio da plataforma fica como registro. */
export async function remove(id: number) {
  const row = await prisma.partnerCheckIn.findUnique({ where: { id }, select: { source: true } });
  if (!row) throw NotFound('Check-in');
  if (row.source !== 'MANUAL') throw Conflict('Check-in recebido da plataforma não pode ser removido', 'NOT_MANUAL');
  await prisma.partnerCheckIn.delete({ where: { id } });
}

// ---------- TotalPass ----------
/** Aplica o resultado da confirmação; RETRY não muda nada (continua PENDENTE). */
async function applyValidation(id: number, result: totalpass.ValidationResult) {
  if (result === 'RETRY') return 'PENDENTE' as const;
  const status = result === 'VALIDATED' ? ('VALIDADO' as const) : ('EXPIRADO' as const);
  await prisma.partnerCheckIn.update({
    where: { id },
    data: { status, validationToken: null, ...(status === 'VALIDADO' && { validatedAt: new Date() }) },
  });
  return status;
}

/**
 * Recebe o aviso de check-in da TotalPass. A rota é pública (a TotalPass não assina), então:
 * 1) o segredo vai no caminho da URL e é comparado em tempo constante (errado = 404);
 * 2) o check-in só conta depois de CONFIRMADO na TotalPass com o token (aviso forjado não tem token válido);
 * 3) a URL de confirmação é montada da NOSSA configuração, nunca da que veio no aviso.
 */
export async function ingestTotalPass(secret: string, payload: TotalPassWebhook) {
  if (!totalpass.canReceive() || !safeEqual(secret, env.TOTALPASS_WEBHOOK_SECRET)) throw NotFound('Recurso');
  if (!hit('webhook:totalpass', 600, 60_000).allowed) throw ServiceUnavailable('Muitas chamadas. Tente novamente em instantes.', 'RATE_LIMITED');

  if (payload.type && payload.type !== 'CHECK_IN_CREATED') return { status: 'ignored' as const };
  const token = tokenFromEndpoint(payload.endpoint);
  if (!token) throw BadRequest('Endereço de confirmação inválido', 'INVALID_ENDPOINT');
  const startedAt = new Date(payload.check_in.started_at);
  if (Number.isNaN(startedAt.getTime())) throw BadRequest('Data do check-in inválida', 'INVALID_DATE');

  let id: number;
  try {
    const row = await prisma.partnerCheckIn.create({
      data: {
        platform: 'TOTALPASS',
        externalId: token,
        personName: payload.user.name.trim().slice(0, 120),
        personCode: payload.user.code === undefined ? null : String(payload.user.code).slice(0, 60),
        checkedInAt: startedAt,
        day: dateOnly(localDay(startedAt)),
        status: 'PENDENTE',
        source: 'API',
        validationToken: token,
      },
      select: { id: true },
    });
    id = row.id;
  } catch (err) {
    // Mesmo aviso chegando de novo (reenvio da plataforma): não duplica.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return { status: 'duplicate' as const };
    throw err;
  }

  const result = await totalpass.validateCheckIn(token);
  const status = await applyValidation(id, result);
  logger.info({ checkInId: id, status }, 'totalpass: check-in recebido');
  return { status: status === 'PENDENTE' ? ('pending' as const) : status === 'VALIDADO' ? ('validated' as const) : ('expired' as const) };
}

/** Admin tenta confirmar de novo um check-in que ficou PENDENTE (ex.: a TotalPass estava fora do ar). */
export async function revalidate(id: number) {
  const row = await prisma.partnerCheckIn.findUnique({ where: { id }, select: { ...select, validationToken: true } });
  if (!row) throw NotFound('Check-in');
  if (row.status !== 'PENDENTE' || row.platform !== 'TOTALPASS' || !row.validationToken) {
    throw Conflict('Este check-in não está pendente de confirmação', 'NOT_PENDING');
  }
  if (!totalpass.canReceive()) throw ServiceUnavailable('Integração com a TotalPass não configurada', 'INTEGRATION_OFF');
  const status = await applyValidation(id, await totalpass.validateCheckIn(row.validationToken));
  const { validationToken: _t, ...rest } = row;
  return toDTO({ ...rest, status });
}

// ---------- Configuração ----------
export function integrationStatus() {
  return {
    totalpass: { credentials: totalpass.hasCredentials(), receiving: totalpass.canReceive() },
    wellhub: {
      available: false,
      note: 'Aguardando a documentação do Access Control da Wellhub. Por enquanto, lance os check-ins à mão.',
    },
  };
}

/** Registra na TotalPass a URL deste sistema (com o segredo) como destino dos check-ins. */
export async function registerTotalPassWebhook() {
  if (!totalpass.hasCredentials() || !totalpass.canReceive()) {
    throw Conflict('Configure TOTALPASS_PARTNER_API_KEY, TOTALPASS_PLACE_API_KEY, TOTALPASS_VALIDATE_URL e TOTALPASS_WEBHOOK_SECRET no .env', 'INTEGRATION_OFF');
  }
  const base = siteUrl();
  if (!base.startsWith('https://')) throw Conflict('SITE_URL precisa ser o endereço público com https para a TotalPass conseguir chamar', 'SITE_URL_NOT_PUBLIC');
  try {
    await totalpass.registerWebhook(`${base}/api/partners/totalpass/webhook/${env.TOTALPASS_WEBHOOK_SECRET}`);
  } catch (err) {
    logger.error({ err }, 'totalpass: falha ao registrar webhook');
    throw ServiceUnavailable('A TotalPass recusou ou não respondeu. Confira as chaves.', 'TOTALPASS_UNAVAILABLE');
  }
  // O segredo nunca volta na resposta.
  return { registered: true, webhookUrl: `${base}/api/partners/totalpass/webhook/••••••••` };
}
