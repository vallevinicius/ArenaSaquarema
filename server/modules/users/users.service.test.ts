import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '../../generated/prisma/client';

const prisma = mockDeep<PrismaClient>();
vi.mock('../../lib/prisma', () => ({ prisma }));

const svc = await import('./users.service');

const out = { id: 5, name: 'Bia', email: 'bia@x.com', role: 'OPERADOR', active: true, createdAt: new Date('2026-11-01T00:00:00Z'), profile: { id: 2, name: 'Caixa' } };

beforeEach(() => {
  mockReset(prisma);
  prisma.user.create.mockResolvedValue(out as never);
  prisma.user.update.mockResolvedValue(out as never);
});

describe('create', () => {
  const base = { name: 'Bia', email: 'bia@x.com', password: 'senhaForte123' };

  it('equipe com perfil existente: grava o perfil', async () => {
    prisma.profile.findUnique.mockResolvedValue({ id: 2 } as never);
    await svc.create({ ...base, role: 'OPERADOR', profileId: 2 });
    expect(prisma.user.create.mock.calls[0]![0].data).toMatchObject({ role: 'OPERADOR', profileId: 2 });
  });

  it('equipe sem perfil: 400 PROFILE_REQUIRED e nada é criado', async () => {
    await expect(svc.create({ ...base, role: 'OPERADOR' })).rejects.toMatchObject({ statusCode: 400, code: 'PROFILE_REQUIRED' });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('perfil inexistente: 404', async () => {
    prisma.profile.findUnique.mockResolvedValue(null);
    await expect(svc.create({ ...base, role: 'OPERADOR', profileId: 99 })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('ADMIN nasce sem perfil, mesmo se vier profileId', async () => {
    await svc.create({ ...base, role: 'ADMIN', profileId: 2 });
    expect(prisma.user.create.mock.calls[0]![0].data).toMatchObject({ role: 'ADMIN', profileId: null });
    expect(prisma.profile.findUnique).not.toHaveBeenCalled();
  });

  it('nunca devolve hash de senha', async () => {
    prisma.profile.findUnique.mockResolvedValue({ id: 2 } as never);
    const dto = await svc.create({ ...base, role: 'OPERADOR', profileId: 2 });
    expect(JSON.stringify(dto)).not.toMatch(/passwordHash|tokenVersion/);
    expect(dto.profile).toEqual({ id: 2, name: 'Caixa' });
  });
});

describe('update', () => {
  it('trocar o perfil de um operador', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5, role: 'OPERADOR', profileId: 2 } as never);
    prisma.profile.findUnique.mockResolvedValue({ id: 3 } as never);
    await svc.update(1, 5, { profileId: 3 });
    expect(prisma.user.update.mock.calls[0]![0].data).toMatchObject({ profileId: 3 });
  });

  it('promover a ADMIN limpa o perfil', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5, role: 'OPERADOR', profileId: 2 } as never);
    await svc.update(1, 5, { role: 'ADMIN' });
    const data = prisma.user.update.mock.calls[0]![0].data as { profileId: number | null; tokenVersion: unknown };
    expect(data.profileId).toBeNull();
    expect(data.tokenVersion).toEqual({ increment: 1 }); // mudança de papel derruba as sessões
  });

  it('rebaixar ADMIN para equipe exige perfil', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5, role: 'ADMIN', profileId: null } as never);
    await expect(svc.update(1, 5, { role: 'OPERADOR' })).rejects.toMatchObject({ code: 'PROFILE_REQUIRED' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('o admin não rebaixa nem desativa a si mesmo', async () => {
    await expect(svc.update(1, 1, { role: 'OPERADOR', profileId: 2 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(svc.update(1, 1, { active: false })).rejects.toMatchObject({ statusCode: 400 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('aluno não é editável por aqui (tem tela própria)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7, role: 'ALUNO', profileId: null } as never);
    await expect(svc.update(1, 7, { role: 'ADMIN' })).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('list', () => {
  it('exclui alunos da lista da equipe', async () => {
    prisma.user.findMany.mockResolvedValue([out] as never);
    prisma.user.count.mockResolvedValue(1);
    prisma.$transaction.mockImplementation((async (ops: Promise<unknown>[]) => Promise.all(ops)) as never);
    await svc.list({ page: 1, pageSize: 20 });
    expect(prisma.user.findMany.mock.calls[0]![0]!.where).toMatchObject({ role: { not: 'ALUNO' } });
  });
});
