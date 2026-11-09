import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '../../generated/prisma/client';

const prisma = mockDeep<PrismaClient>();
vi.mock('../../lib/prisma', () => ({ prisma }));
vi.mock('../../lib/format', async (orig) => ({ ...(await orig<typeof import('../../lib/format')>()), todayLocal: () => '2026-11-09' }));

const svc = await import('./students.service');

const row = (over = {}) => ({ id: 3, name: 'ana@x.com', email: 'ana@x.com', active: true, mustChangePassword: true, createdAt: new Date('2026-11-01T10:00:00Z'), ...over });

beforeEach(() => mockReset(prisma));

describe('create', () => {
  it('cria ALUNO com senha padrão mudar123 (hash) e exige troca no 1º acesso', async () => {
    prisma.user.create.mockResolvedValue(row() as never);
    const dto = await svc.create({ email: 'ana@x.com' });

    const data = prisma.user.create.mock.calls[0]![0].data as { role: string; mustChangePassword: boolean; name: string; passwordHash: string };
    expect(data).toMatchObject({ role: 'ALUNO', mustChangePassword: true, name: 'ana@x.com' });
    expect(await bcrypt.compare('mudar123', data.passwordHash)).toBe(true);
    expect(data.passwordHash).not.toBe('mudar123');
    expect(dto).toMatchObject({ email: 'ana@x.com', daysAttended: 0, presenceRate: 0 });
    expect(dto).not.toHaveProperty('passwordHash');
  });

  it('usa o nome informado quando existe', async () => {
    prisma.user.create.mockResolvedValue(row({ name: 'Ana Souza' }) as never);
    await svc.create({ email: 'ana@x.com', name: 'Ana Souza' });
    expect(prisma.user.create.mock.calls[0]![0].data).toMatchObject({ name: 'Ana Souza' });
  });
});

describe('list', () => {
  it('só lista ALUNO e calcula a taxa com 1 query agrupada', async () => {
    prisma.user.findMany.mockResolvedValue([row({ id: 3 }), row({ id: 4, email: 'b@x.com', name: 'b@x.com' })] as never);
    prisma.user.count.mockResolvedValue(2);
    prisma.checkIn.findMany.mockResolvedValue([{ date: new Date('2026-11-03') }, { date: new Date('2026-11-04') }] as never); // 2 dias de aula
    (prisma.checkIn.groupBy as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ userId: 3, _count: { _all: 1 } }]);

    const res = await svc.list({ page: 1, pageSize: 20, month: '2026-11' });

    expect(prisma.user.findMany.mock.calls[0]![0]!.where).toMatchObject({ role: 'ALUNO' });
    expect(prisma.checkIn.groupBy).toHaveBeenCalledTimes(1);
    expect(res.classDays).toBe(2);
    expect(res.data.map((s) => [s.id, s.daysAttended, s.presenceRate])).toEqual([[3, 1, 50], [4, 0, 0]]);
  });
});

describe('update', () => {
  it('não mexe em conta que não é ALUNO (admin/operador)', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(svc.update(1, { active: false })).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.user.findFirst.mock.calls[0]![0]!.where).toMatchObject({ id: 1, role: 'ALUNO' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('desativar revoga as sessões', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 3 } as never);
    prisma.user.update.mockResolvedValue(row({ active: false }) as never);
    await svc.update(3, { active: false });
    expect(prisma.user.update.mock.calls[0]![0].data).toMatchObject({ active: false, tokenVersion: { increment: 1 } });
  });

  it('resetPassword volta à senha padrão, exige novo código e revoga sessões', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 3 } as never);
    prisma.user.update.mockResolvedValue(row() as never);
    await svc.update(3, { resetPassword: true });
    const data = prisma.user.update.mock.calls[0]![0].data as { passwordHash: string; mustChangePassword: boolean; tokenVersion: unknown };
    expect(await bcrypt.compare('mudar123', data.passwordHash)).toBe(true);
    expect(data.mustChangePassword).toBe(true);
    expect(data.tokenVersion).toEqual({ increment: 1 });
  });
});
