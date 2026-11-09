import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../generated/prisma/enums';
import { Unauthorized } from './errors';

// Função comum (não vi.fn): o spy do vitest vaza a rejeição provocada de propósito como erro não tratado.
let session: () => Promise<unknown> = async () => null;
let authCalls = 0;
const authenticate = (..._a: unknown[]) => {
  authCalls++;
  return session();
};
vi.mock('./auth', () => ({ COOKIE_NAME: 'arena_token', authenticate }));
vi.mock('./prisma', () => ({ prisma: {} }));

const { route } = await import('./route');

function as(role: Role | null) {
  session = role
    ? async () => ({ id: 1, name: 'x', email: 'x@x.com', role })
    : async () => {
        throw Unauthorized('Sessão inválida');
      };
}
const call = (handler: ReturnType<typeof route>) => handler(new NextRequest('http://localhost/api/x'), { params: Promise.resolve({}) });

beforeEach(() => {
  authCalls = 0;
});

describe('RBAC do route()', () => {
  const handler = route({}, async () => ({ ok: true })); // sem roles: só equipe

  it.each(['ADMIN', 'OPERADOR'] as const)('rota padrão aceita %s', async (role) => {
    as(role);
    expect((await call(handler)).status).toBe(200);
  });

  it('rota padrão NEGA o aluno (403): aluno não alcança comandas, clientes, estoque...', async () => {
    as('ALUNO');
    expect((await call(handler)).status).toBe(403);
  });

  it('roles ["ALUNO"] aceita aluno e nega a equipe', async () => {
    const h = route({ roles: ['ALUNO'] }, async () => ({ ok: true }));
    as('ALUNO');
    expect((await call(h)).status).toBe(200);
    as('OPERADOR');
    expect((await call(h)).status).toBe(403);
  });

  it('roles ["ADMIN"] nega operador e aluno', async () => {
    const h = route({ roles: ['ADMIN'] }, async () => ({ ok: true }));
    for (const r of ['OPERADOR', 'ALUNO'] as const) {
      as(r);
      expect((await call(h)).status).toBe(403);
    }
    as('ADMIN');
    expect((await call(h)).status).toBe(200);
  });

  it('sem sessão válida: 401', async () => {
    as(null);
    expect((await call(handler)).status).toBe(401);
  });

  it('rota pública (auth:false) não exige sessão', async () => {
    const h = route({ auth: false }, async () => ({ ok: true }));
    expect((await call(h)).status).toBe(200);
    expect(authCalls).toBe(0);
  });
});
