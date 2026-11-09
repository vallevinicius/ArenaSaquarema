import bcrypt from 'bcryptjs';
import { BadRequest, NotFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { BCRYPT_COST } from '../auth/auth.service';
import type { Role } from '../../generated/prisma/enums';
import type { CreateUser, ListUsers, UpdateUser } from './users.schemas';

// select explícito: passwordHash/tokenVersion nunca saem do service.
const publicSelect = {
  id: true, name: true, email: true, role: true, active: true, createdAt: true,
  profile: { select: { id: true, name: true } },
} as const;
type PublicUser = {
  id: number; name: string; email: string; role: Role; active: boolean; createdAt: Date;
  profile: { id: number; name: string } | null;
};
const toDTO = (u: PublicUser) => ({ ...u, createdAt: u.createdAt.toISOString() });

export async function list(query: ListUsers) {
  // Alunos têm tela própria (/alunos): esta lista é só da equipe.
  const where = {
    role: { not: 'ALUNO' as const },
    ...(query.q && { OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }] }),
  };
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

/** Só equipe não administradora tem perfil; o perfil precisa existir. */
async function assertProfile(profileId: number | null | undefined) {
  if (profileId == null) throw BadRequest('Escolha um perfil de acesso', 'PROFILE_REQUIRED');
  const found = await prisma.profile.findUnique({ where: { id: profileId }, select: { id: true } });
  if (!found) throw NotFound('Perfil');
}

export async function create(input: CreateUser) {
  const isAdmin = input.role === 'ADMIN';
  if (!isAdmin) await assertProfile(input.profileId);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      profileId: isAdmin ? null : input.profileId,
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
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, profileId: true } });
  if (!exists || exists.role === 'ALUNO') throw NotFound('Usuário');

  // ADMIN nunca guarda perfil; equipe sempre precisa de um (o novo, ou o que já tinha).
  const role = input.role ?? exists.role;
  let profileId: number | null = null;
  if (role !== 'ADMIN') {
    profileId = input.profileId ?? exists.profileId;
    await assertProfile(profileId);
  }

  // Mudança de papel/status/senha invalida JWTs já emitidos.
  const revokeSessions = input.active !== undefined || input.role !== undefined || input.password !== undefined;
  const user = await prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      role: input.role,
      profileId,
      active: input.active,
      ...(input.password && { passwordHash: await bcrypt.hash(input.password, BCRYPT_COST) }),
      ...(revokeSessions && { tokenVersion: { increment: 1 } }),
    },
    select: publicSelect,
  });
  return toDTO(user);
}
