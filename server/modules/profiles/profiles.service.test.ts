import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '../../generated/prisma/client';

const prisma = mockDeep<PrismaClient>();
vi.mock('../../lib/prisma', () => ({ prisma }));

const svc = await import('./profiles.service');

const row = (over = {}) => ({ id: 1, name: 'Gerente', description: null, permissions: ['COMANDAS'], _count: { users: 2 }, ...over });

beforeEach(() => mockReset(prisma));

describe('list', () => {
  it('devolve DTO com a contagem de usuários e permissões válidas', async () => {
    prisma.profile.findMany.mockResolvedValue([row({ permissions: ['BAR', 'HACK', 'COMANDAS'] })] as never);
    expect(await svc.list()).toEqual([{ id: 1, name: 'Gerente', description: null, permissions: ['COMANDAS', 'BAR'], usersCount: 2 }]);
  });
});

describe('create', () => {
  it('grava permissões sem duplicata e na ordem do catálogo', async () => {
    prisma.profile.create.mockResolvedValue(row() as never);
    await svc.create({ name: 'Gerente', permissions: ['ESTOQUE', 'COMANDAS', 'ESTOQUE'] });
    expect(prisma.profile.create.mock.calls[0]![0].data).toEqual({ name: 'Gerente', description: null, permissions: ['COMANDAS', 'ESTOQUE'] });
  });

  it('perfil pode nascer sem nenhuma permissão', async () => {
    prisma.profile.create.mockResolvedValue(row({ permissions: [] }) as never);
    await svc.create({ name: 'Vazio', permissions: [] });
    expect(prisma.profile.create.mock.calls[0]![0].data).toMatchObject({ permissions: [] });
  });
});

describe('update', () => {
  it('só mexe nos campos enviados', async () => {
    prisma.profile.update.mockResolvedValue(row() as never);
    await svc.update(1, { name: 'Novo nome' });
    expect(prisma.profile.update.mock.calls[0]![0].data).toEqual({ name: 'Novo nome', description: undefined, permissions: undefined });
  });

  it('limpa a descrição com null e normaliza permissões', async () => {
    prisma.profile.update.mockResolvedValue(row() as never);
    await svc.update(1, { description: null, permissions: ['CLIENTES', 'COMANDAS'] });
    expect(prisma.profile.update.mock.calls[0]![0].data).toMatchObject({ description: null, permissions: ['COMANDAS', 'CLIENTES'] });
  });

  it('perfil inexistente: 404 com mensagem em pt-BR', async () => {
    prisma.profile.update.mockRejectedValue(Object.assign(new Error('x'), { code: 'P2025' }));
    await expect(svc.update(9, { name: 'x' })).rejects.toMatchObject({ statusCode: 404, message: 'Perfil não encontrado' });
  });
});

describe('remove', () => {
  it('exclui perfil sem usuários', async () => {
    prisma.profile.findUnique.mockResolvedValue({ _count: { users: 0 } } as never);
    await svc.remove(1);
    expect(prisma.profile.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('perfil em uso: 409 PROFILE_IN_USE e nada é apagado', async () => {
    prisma.profile.findUnique.mockResolvedValue({ _count: { users: 3 } } as never);
    await expect(svc.remove(1)).rejects.toMatchObject({ statusCode: 409, code: 'PROFILE_IN_USE' });
    expect(prisma.profile.delete).not.toHaveBeenCalled();
  });

  it('perfil inexistente: 404', async () => {
    prisma.profile.findUnique.mockResolvedValue(null);
    await expect(svc.remove(9)).rejects.toMatchObject({ statusCode: 404 });
  });
});
