import { Money, registry, z } from '../../docs/registry.js';

export const DashboardQuery = z
  .object({
    from: z.iso.date().optional().openapi({ description: 'YYYY-MM-DD (padrão: hoje)' }),
    to: z.iso.date().optional().openapi({ description: 'YYYY-MM-DD inclusivo (padrão: from)' }),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, 'from deve ser <= to');

export const DashboardDTO = registry.register(
  'Dashboard',
  z.object({
    period: z.object({ from: z.string(), to: z.string() }),
    revenue: Money,
    closedTabs: z.number(),
    averageTicket: Money,
    openTabs: z.object({ count: z.number(), total: Money }),
    dayUsePeople: z.number().openapi({ description: 'Pessoas com day use no período (por data de uso)' }),
    dayUseRevenue: Money,
    barRevenue: Money,
    byPaymentMethod: z.array(z.object({ method: z.string(), total: Money, count: z.number() })),
    topProducts: z.array(z.object({ productId: z.number(), name: z.string(), quantity: z.number(), total: Money })),
    dailyRevenue: z.array(z.object({ date: z.string(), total: Money })),
    lowStock: z.array(z.object({ id: z.number(), name: z.string(), stock: z.number(), minStock: z.number() })),
  }),
);

export type DashboardQueryT = z.output<typeof DashboardQuery>;
