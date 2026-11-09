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

function as(role: Role | null, permissions: string[] = []) {
  session = role
    ? async () => ({ id: 1, name: 'x', email: 'x@x.com', role, permissions })
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

describe('permissões por perfil no route()', () => {
  const only = (...p: ('COMANDAS' | 'ESTOQUE' | 'CLIENTES')[]) => route({ permissions: p }, async () => ({ ok: true }));

  it('equipe com a permissão passa; sem ela, 403', async () => {
    as('OPERADOR', ['COMANDAS']);
    expect((await call(only('COMANDAS'))).status).toBe(200);
    expect((await call(only('ESTOQUE'))).status).toBe(403);
  });

  it('basta UMA das permissões listadas', async () => {
    as('OPERADOR', ['CLIENTES']);
    expect((await call(only('COMANDAS', 'CLIENTES'))).status).toBe(200);
  });

  it('ADMIN passa em qualquer permissão', async () => {
    as('ADMIN', []);
    expect((await call(only('ESTOQUE'))).status).toBe(200);
  });

  it('ALUNO nunca passa, mesmo com "permissões" no objeto', async () => {
    as('ALUNO', ['COMANDAS']);
    expect((await call(only('COMANDAS'))).status).toBe(403);
  });

  it('equipe com perfil vazio é barrada em tudo', async () => {
    as('OPERADOR', []);
    expect((await call(only('COMANDAS'))).status).toBe(403);
  });

  it('sem sessão: 401 (a permissão implica autenticação)', async () => {
    as(null);
    expect((await call(only('COMANDAS'))).status).toBe(401);
  });

  it('roles ["ADMIN"] continua barrando equipe, mesmo com todas as permissões (usuários/perfis)', async () => {
    const h = route({ roles: ['ADMIN'] }, async () => ({ ok: true }));
    as('OPERADOR', ['COMANDAS', 'ESTOQUE', 'CLIENTES']);
    expect((await call(h)).status).toBe(403);
  });
});
