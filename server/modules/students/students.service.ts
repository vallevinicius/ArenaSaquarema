import bcrypt from 'bcryptjs';
import { NotFound } from '../../lib/errors';
import { dateOnly, todayLocal } from '../../lib/format';
import { prisma } from '../../lib/prisma';
import { DEFAULT_STUDENT_PASSWORD } from '../auth/auth.schemas';
import { BCRYPT_COST } from '../auth/auth.service';
import { classDaysIn } from '../attendance/attendance.service';
import { monthRange, presenceRate } from '../attendance/attendance.utils';
import type { CreateStudent, ListStudents, UpdateStudent } from './students.schemas';

// select explícito: passwordHash/tokenVersion nunca saem do service.
const select = { id: true, name: true, email: true, active: true, mustChangePassword: true, createdAt: true } as const;
type Row = { id: number; name: string; email: string; active: boolean; mustChangePassword: boolean; createdAt: Date };
const toDTO = (u: Row, daysAttended = 0, classDays = 0) => ({
  ...u,
  createdAt: u.createdAt.toISOString(),
  daysAttended,
  presenceRate: presenceRate(daysAttended, classDays),
});

export async function list(query: ListStudents) {
  const month = query.month ?? todayLocal().slice(0, 7);
  const { from, to } = monthRange(month);
  const where = {
    role: 'ALUNO' as const,
    ...(query.q && { OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }] }),
  };
  const [rows, total, classDays] = await Promise.all([
    prisma.user.findMany({ where, select, orderBy: { name: 'asc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.user.count({ where }),
    classDaysIn(from, to),
  ]);

  // 1 query agrupada para a página inteira (sem N+1).
  const counts = await prisma.checkIn.groupBy({
    by: ['userId'],
    where: { userId: { in: rows.map((r) => r.id) }, date: { gte: dateOnly(from), lt: dateOnly(to) } },
    _count: { _all: true },
  });
  const byUser = new Map(counts.map((c) => [c.userId, c._count._all]));

  return {
    data: rows.map((r) => toDTO(r, byUser.get(r.id) ?? 0, classDays)),
    meta: { page: query.page, pageSize: query.pageSize, total },
    month,
    classDays,
  };
}

/** Admin cadastra só o e-mail; a senha é a padrão e o 1º login exige o código enviado por e-mail. */
export async function create(input: CreateStudent) {
  const user = await prisma.user.create({
    data: {
      name: input.name ?? input.email,
      email: input.email,
      role: 'ALUNO',
      mustChangePassword: true,
      passwordHash: await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, BCRYPT_COST),
    },
    select,
  });
  return toDTO(user);
}

export async function update(id: number, input: UpdateStudent) {
  // Só mexe em ALUNO: este endpoint nunca altera conta da equipe.
  const exists = await prisma.user.findFirst({ where: { id, role: 'ALUNO' }, select: { id: true } });
  if (!exists) throw NotFound('Aluno');

  const revokeSessions = input.active !== undefined || input.resetPassword;
  const user = await prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      active: input.active,
      ...(input.resetPassword && {
        passwordHash: await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, BCRYPT_COST),
        mustChangePassword: true,
      }),
      ...(revokeSessions && { tokenVersion: { increment: 1 } }),
    },
    select,
  });
  return toDTO(user);
}
