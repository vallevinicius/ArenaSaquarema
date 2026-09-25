import { BadRequest } from '../../lib/errors.js';
import { APP_TZ_OFFSET, addDays, dateOnly, money, startOfLocalDay, todayLocal } from '../../lib/format.js';
import { prisma } from '../../lib/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { DashboardQueryT } from './dashboard.schemas.js';

const MAX_RANGE_DAYS = 366;
const ZERO = new Prisma.Decimal(0);

export async function summary(q: DashboardQueryT) {
  const from = q.from ?? todayLocal();
  const to = q.to ?? from;
  const days = (dateOnly(to).getTime() - dateOnly(from).getTime()) / 864e5 + 1;
  if (days > MAX_RANGE_DAYS) throw BadRequest(`Período máximo de ${MAX_RANGE_DAYS} dias`);

  const start = startOfLocalDay(from);
  const end = startOfLocalDay(addDays(to, 1)); // exclusivo
  const closedInRange: Prisma.TabWhereInput = { status: 'FECHADA', closedAt: { gte: start, lt: end } };

  const [closed, open, byMethod, byType, top, dayUse, daily, lowStock] = await Promise.all([
    prisma.tab.aggregate({ where: closedInRange, _sum: { total: true }, _count: true }),
    prisma.tab.aggregate({ where: { status: 'ABERTA' }, _sum: { total: true }, _count: true }),
    prisma.tab.groupBy({ by: ['paymentMethod'], where: closedInRange, _sum: { total: true }, _count: true }),
    prisma.tabItem.groupBy({ by: ['type'], where: { tab: closedInRange }, _sum: { subtotal: true } }),
    prisma.tabItem.groupBy({
      by: ['productId'],
      where: { type: 'PRODUTO', tab: closedInRange },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
    prisma.tabItem.aggregate({
      where: {
        type: 'DAY_USE',
        usageDate: { gte: dateOnly(from), lte: dateOnly(to) },
        tab: { status: { not: 'CANCELADA' } },
      },
      _sum: { quantity: true },
    }),
    // Agrupamento por dia no fuso local. Valores interpolados viram parâmetros bindados.
    prisma.$queryRaw<{ day: string; total: Prisma.Decimal }[]>`
      SELECT DATE_FORMAT(CONVERT_TZ(closedAt, '+00:00', ${APP_TZ_OFFSET}), '%Y-%m-%d') AS day, SUM(total) AS total
      FROM tabs
      WHERE status = 'FECHADA' AND closedAt >= ${start} AND closedAt < ${end}
      GROUP BY day ORDER BY day`,
    prisma.product.findMany({
      where: { active: true, trackStock: true, stock: { lte: prisma.product.fields.minStock } },
      select: { id: true, name: true, stock: true, minStock: true },
      orderBy: { stock: 'asc' },
      take: 20,
    }),
  ]);

  const names = await prisma.product.findMany({
    where: { id: { in: top.map((t) => t.productId).filter((id): id is number => id !== null) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(names.map((n) => [n.id, n.name]));

  const revenue = closed._sum.total ?? ZERO;
  const typeTotal = (t: 'PRODUTO' | 'DAY_USE') => byType.find((b) => b.type === t)?._sum.subtotal ?? ZERO;

  return {
    period: { from, to },
    revenue: money(revenue),
    closedTabs: closed._count,
    averageTicket: money(closed._count ? revenue.div(closed._count) : ZERO),
    openTabs: { count: open._count, total: money(open._sum.total ?? ZERO) },
    dayUsePeople: dayUse._sum.quantity ?? 0,
    dayUseRevenue: money(typeTotal('DAY_USE')),
    barRevenue: money(typeTotal('PRODUTO')),
    byPaymentMethod: byMethod.map((m) => ({
      method: m.paymentMethod ?? 'N/A',
      total: money(m._sum.total ?? ZERO),
      count: m._count,
    })),
    topProducts: top.map((t) => ({
      productId: t.productId ?? 0,
      name: nameOf.get(t.productId ?? 0) ?? '—',
      quantity: t._sum.quantity ?? 0,
      total: money(t._sum.subtotal ?? ZERO),
    })),
    dailyRevenue: daily.map((d) => ({ date: String(d.day), total: money(new Prisma.Decimal(d.total ?? 0)) })),
    lowStock,
  };
}
