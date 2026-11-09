import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { Prisma, type PrismaClient } from '../../generated/prisma/client';

const prisma = mockDeep<PrismaClient>();
vi.mock('../../lib/prisma', () => ({ prisma }));
vi.mock('../../lib/format', async (orig) => ({ ...(await orig<typeof import('../../lib/format')>()), todayLocal: () => '2026-11-09' }));

const service = await import('./attendance.service');

const p2002 = () => new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' });

beforeEach(() => mockReset(prisma));

describe('checkIn', () => {
  it('registra a presença de hoje para o usuário da sessão', async () => {
    prisma.checkIn.create.mockResolvedValue({ id: 7, userId: 3, date: new Date('2026-11-09'), createdAt: new Date('2026-11-09T21:00:00Z') });
    const res = await service.checkIn(3);
    expect(prisma.checkIn.create).toHaveBeenCalledWith({ data: { userId: 3, date: new Date('2026-11-09T00:00:00Z') } });
    expect(res).toEqual({ id: 7, date: '2026-11-09', createdAt: '2026-11-09T21:00:00.000Z' });
  });

  it('segundo check-in no mesmo dia vira 409 ALREADY_CHECKED_IN', async () => {
    prisma.checkIn.create.mockRejectedValue(p2002());
    await expect(service.checkIn(3)).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_CHECKED_IN' });
  });

  it('outros erros do banco não são engolidos', async () => {
    prisma.checkIn.create.mockRejectedValue(new Error('db fora do ar'));
    await expect(service.checkIn(3)).rejects.toThrow('db fora do ar');
  });
});

describe('myAttendance', () => {
  it('calcula dias, dias de aula e taxa só com os dados do próprio usuário', async () => {
    prisma.checkIn.findMany
      .mockResolvedValueOnce([{ date: new Date('2026-11-05') }, { date: new Date('2026-11-03') }] as never) // meus check-ins
      .mockResolvedValueOnce([{ date: new Date('2026-11-03') }, { date: new Date('2026-11-05') }, { date: new Date('2026-11-04') }, { date: new Date('2026-11-06') }] as never); // dias de aula
    prisma.checkIn.findUnique.mockResolvedValue(null);

    const res = await service.myAttendance(3, '2026-11');

    expect(prisma.checkIn.findMany.mock.calls[0]![0]!.where).toMatchObject({ userId: 3 });
    expect(res).toEqual({ month: '2026-11', daysAttended: 2, classDays: 4, presenceRate: 50, checkedInToday: false, days: ['2026-11-05', '2026-11-03'] });
  });

  it('marca checkedInToday quando já existe check-in de hoje', async () => {
    prisma.checkIn.findMany.mockResolvedValue([] as never);
    prisma.checkIn.findUnique.mockResolvedValue({ id: 1 } as never);
    expect((await service.myAttendance(3, '2026-11')).checkedInToday).toBe(true);
  });

  it('sem nenhuma aula no mês a taxa é 0', async () => {
    prisma.checkIn.findMany.mockResolvedValue([] as never);
    prisma.checkIn.findUnique.mockResolvedValue(null);
    expect((await service.myAttendance(3, '2026-10')).presenceRate).toBe(0);
  });
});

describe('listByDay / remove', () => {
  it('lista os check-ins do dia mapeando para DTO (sem dados sensíveis)', async () => {
    prisma.checkIn.findMany.mockResolvedValue([
      { id: 1, createdAt: new Date('2026-11-09T21:00:00Z'), user: { id: 3, name: 'Ana', email: 'ana@x.com', level: 'INICIANTE_B' } },
    ] as never);
    expect(await service.listByDay('2026-11-09')).toEqual([
      { id: 1, studentId: 3, studentName: 'Ana', studentEmail: 'ana@x.com', studentLevel: 'INICIANTE_B', createdAt: '2026-11-09T21:00:00.000Z' },
    ]);
  });

  it('remove pelo id', async () => {
    await service.remove(9);
    expect(prisma.checkIn.delete).toHaveBeenCalledWith({ where: { id: 9 } });
  });
});
