import { Prisma } from '../../generated/prisma/client';
import { Conflict } from '../../lib/errors';
import { dateOnly, todayLocal, ymdOf } from '../../lib/format';
import { prisma } from '../../lib/prisma';
import { monthRange, presenceRate } from './attendance.utils';

const currentMonth = () => todayLocal().slice(0, 7);

/** Aluno faz o próprio check-in de hoje (dia local da arena). 1 por dia. */
export async function checkIn(userId: number) {
  const today = todayLocal();
  try {
    const row = await prisma.checkIn.create({ data: { userId, date: dateOnly(today) } });
    return { id: row.id, date: today, createdAt: row.createdAt.toISOString() };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw Conflict('Você já fez check-in hoje', 'ALREADY_CHECKED_IN');
    }
    throw err;
  }
}

/** Dias do mês com aula = dias distintos com ao menos um check-in de qualquer aluno. */
export async function classDaysIn(from: string, to: string): Promise<number> {
  const rows = await prisma.checkIn.findMany({
    where: { date: { gte: dateOnly(from), lt: dateOnly(to) } },
    distinct: ['date'],
    select: { date: true },
  });
  return rows.length;
}

/** Perfil do aluno: só lê dados do PRÓPRIO usuário (userId vem da sessão, nunca do cliente). */
export async function myAttendance(userId: number, month = currentMonth()) {
  const { from, to } = monthRange(month);
  const [own, classDays, today] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId, date: { gte: dateOnly(from), lt: dateOnly(to) } },
      select: { date: true },
      orderBy: { date: 'desc' },
    }),
    classDaysIn(from, to),
    prisma.checkIn.findUnique({ where: { userId_date: { userId, date: dateOnly(todayLocal()) } }, select: { id: true } }),
  ]);
  return {
    month,
    daysAttended: own.length,
    classDays,
    presenceRate: presenceRate(own.length, classDays),
    checkedInToday: today !== null,
    days: own.map((c) => ymdOf(c.date)),
  };
}

/** Admin: quem fez check-in em um dia. */
export async function listByDay(date = todayLocal()) {
  const rows = await prisma.checkIn.findMany({
    where: { date: dateOnly(date) },
    orderBy: { createdAt: 'asc' },
    select: { id: true, createdAt: true, user: { select: { id: true, name: true, email: true, level: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    studentId: r.user.id,
    studentName: r.user.name,
    studentEmail: r.user.email,
    studentLevel: r.user.level ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Admin: remove um check-in lançado por engano (P2025 vira 404 no boundary). */
export async function remove(id: number) {
  await prisma.checkIn.delete({ where: { id } });
}
