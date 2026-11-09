import { PERMISSION_KEYS, parsePermissions } from '../../../lib/permissions';
import { Conflict, NotFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import type { CreateProfile, UpdateProfile } from './profiles.schemas';

const select = { id: true, name: true, description: true, permissions: true, _count: { select: { users: true } } } as const;
type Row = { id: number; name: string; description: string | null; permissions: unknown; _count: { users: number } };
const toDTO = (p: Row) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  permissions: parsePermissions(p.permissions),
  usersCount: p._count.users,
});

/** Sem duplicatas e na ordem do catálogo (o que vai para o banco é sempre canônico). */
const normalize = (list: readonly string[]) => PERMISSION_KEYS.filter((k) => list.includes(k));

export async function list() {
  return (await prisma.profile.findMany({ select, orderBy: { name: 'asc' } })).map(toDTO);
}

export async function create(input: CreateProfile) {
  // Nome repetido: P2002 vira 409 no boundary.
  const row = await prisma.profile.create({
    data: { name: input.name, description: input.description || null, permissions: normalize(input.permissions) },
    select,
  });
  return toDTO(row);
}

export async function update(id: number, input: UpdateProfile) {
  const row = await prisma.profile
    .update({
      where: { id },
      data: {
        name: input.name,
        description: input.description === undefined ? undefined : input.description || null,
        permissions: input.permissions && normalize(input.permissions),
      },
      select,
    })
    .catch((err) => {
      throw err?.code === 'P2025' ? NotFound('Perfil') : err;
    });
  return toDTO(row);
}

/** Perfil em uso não some: os usuários ficariam sem acesso. Mova-os para outro perfil antes. */
export async function remove(id: number) {
  const profile = await prisma.profile.findUnique({ where: { id }, select: { _count: { select: { users: true } } } });
  if (!profile) throw NotFound('Perfil');
  if (profile._count.users > 0) {
    throw Conflict(`Este perfil tem ${profile._count.users} usuário(s). Mude o perfil deles antes de excluir.`, 'PROFILE_IN_USE');
  }
  await prisma.profile.delete({ where: { id } });
}
