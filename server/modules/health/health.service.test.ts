import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '../../generated/prisma/client';

const prisma = mockDeep<PrismaClient>();
const logger = { error: vi.fn() };
vi.mock('../../lib/prisma', () => ({ prisma }));
vi.mock('../../lib/logger', () => ({ logger }));

const { check } = await import('./health.service');

beforeEach(() => {
  mockReset(prisma);
  logger.error.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('check', () => {
  it('banco respondendo: ok', async () => {
    prisma.$queryRaw.mockResolvedValue([{ 1: 1 }] as never);
    await expect(check()).resolves.toEqual({ status: 'ok', db: 'ok' });
  });

  it('banco com erro: 503 DB_UNAVAILABLE, sem vazar o erro interno', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:3306 user 'arena'"));
    const err = await check().catch((e) => e);
    expect(err).toMatchObject({ statusCode: 503, code: 'DB_UNAVAILABLE', message: 'Banco de dados indisponível' });
    expect(JSON.stringify({ m: err.message, d: err.details })).not.toMatch(/10\.0\.0\.5|arena/);
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('banco pendurado: estoura o tempo e responde 503 em vez de travar o monitor', async () => {
    vi.useFakeTimers();
    prisma.$queryRaw.mockReturnValue(new Promise(() => {}) as never);
    const pending = check().catch((e) => e);
    await vi.advanceTimersByTimeAsync(3001);
    expect(await pending).toMatchObject({ statusCode: 503, code: 'DB_UNAVAILABLE' });
  });
});
