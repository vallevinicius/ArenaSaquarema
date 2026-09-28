import bcrypt from 'bcryptjs';
import { BadRequest, NotFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { BCRYPT_COST } from '../auth/auth.service';
import type { CreateUser, ListUsers, UpdateUser } from './users.schemas';

// select explícito: passwordHash/tokenVersion nunca saem do service.
const publicSelect = { id: true, name: true, email: true, role: true, active: true, createdAt: true } as const;
type PublicUser = { id: number; name: string; email: string; role: 'ADMIN' | 'OPERADOR'; active: boolean; createdAt: Date };
const toDTO = (u: PublicUser) => ({ ...u, createdAt: u.createdAt.toISOString() });

export async function list(query: ListUsers) {
  const where = query.q ? { OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }] } : {};
  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: publicSelect,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { data: data.map(toDTO), meta: { page: query.page, pageSize: query.pageSize, total } };
}

export async function create(input: CreateUser) {
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
    },
    select: publicSelect,
  });
  return toDTO(user);
}

export async function update(actorId: number, id: number, input: UpdateUser) {
  // Evita o admin se trancar para fora do sistema.
  if (id === actorId && (input.active === false || input.role === 'OPERADOR')) {
    throw BadRequest('Você não pode desativar ou rebaixar o próprio usuário');
  }
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw NotFound('Usuário');

  // Mudança de papel/status/senha invalida JWTs já emitidos.
  const revokeSessions = input.active !== undefined || input.role !== undefined || input.password !== undefined;
  const user = await prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      role: input.role,
      active: input.active,
      ...(input.password && { passwordHash: await bcrypt.hash(input.password, BCRYPT_COST) }),
      ...(revokeSessions && { tokenVersion: { increment: 1 } }),
    },
    select: publicSelect,
  });
  return toDTO(user);
}
