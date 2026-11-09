import { PaginationQuery, registry, z } from '../../docs/registry';

export const PlatformEnum = z.enum(['WELLHUB', 'TOTALPASS']).openapi('PartnerPlatform');
export const StatusEnum = z.enum(['PENDENTE', 'VALIDADO', 'EXPIRADO']).openapi('PartnerCheckInStatus');
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD');

export const ListPartnerCheckInsQuery = PaginationQuery.extend({
  date: ymd.optional().openapi({ description: 'Dia (AAAA-MM-DD). Padrão: hoje.' }),
  platform: PlatformEnum.optional(),
});

export const CreatePartnerCheckInInput = registry.register(
  'CreatePartnerCheckInInput',
  z.object({
    platform: PlatformEnum,
    personName: z.string().trim().min(2).max(120).openapi({ example: 'Maria Souza' }),
    personCode: z.string().trim().max(60).optional().openapi({ description: 'Código da pessoa na plataforma (não é documento)' }),
    day: ymd.optional().openapi({ description: 'Dia do check-in. Padrão: hoje. Não pode ser no futuro.' }),
    note: z.string().trim().max(200).optional(),
  }),
);

export const MonthQuery = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use o formato AAAA-MM').optional() });

export const PartnerCheckInDTO = registry.register(
  'PartnerCheckIn',
  z.object({
    id: z.number(),
    platform: PlatformEnum,
    personName: z.string(),
    personCode: z.string().nullable(),
    checkedInAt: z.string(),
    status: StatusEnum,
    source: z.enum(['MANUAL', 'API']),
    note: z.string().nullable(),
  }),
);

export const PartnerCheckInListDTO = registry.register(
  'PartnerCheckInList',
  z.object({
    data: z.array(PartnerCheckInDTO),
    meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
    date: z.string(),
    counts: z.object({ WELLHUB: z.number(), TOTALPASS: z.number(), pending: z.number() }).openapi({ description: 'Só contam VALIDADOS; pendentes à parte' }),
  }),
);

export const PartnerSummaryDTO = registry.register(
  'PartnerSummary',
  z.object({
    month: z.string(),
    totals: z.object({ WELLHUB: z.number(), TOTALPASS: z.number() }),
    byDay: z.array(z.object({ date: z.string(), WELLHUB: z.number(), TOTALPASS: z.number() })),
  }),
);

export const IntegrationStatusDTO = registry.register(
  'PartnerIntegrationStatus',
  z.object({
    totalpass: z.object({ credentials: z.boolean(), receiving: z.boolean() }).openapi({ description: 'credentials = chaves configuradas; receiving = pronto para receber e confirmar check-ins' }),
    wellhub: z.object({ available: z.boolean(), note: z.string() }),
  }),
);

// Aviso da TotalPass ("Webhook - Checkin"). Só lemos o necessário; CPF, e-mail e telefone são ignorados de propósito.
export const TotalPassWebhookInput = registry.register(
  'TotalPassCheckInWebhook',
  z.object({
    type: z.string().optional(),
    endpoint: z.string().max(2048),
    check_in: z.object({ started_at: z.string(), expires_at: z.string().optional() }),
    user: z.object({ name: z.string().trim().min(1), code: z.union([z.string(), z.number()]).optional() }),
  }),
);

export type ListPartnerCheckIns = z.output<typeof ListPartnerCheckInsQuery>;
export type CreatePartnerCheckIn = z.output<typeof CreatePartnerCheckInInput>;
export type TotalPassWebhook = z.output<typeof TotalPassWebhookInput>;
