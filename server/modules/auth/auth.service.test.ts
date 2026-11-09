import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '../../generated/prisma/client';

const prisma = mockDeep<PrismaClient>();
const sendCode = vi.fn();
vi.mock('../../lib/prisma', () => ({ prisma }));
vi.mock('./password-reset.service', () => ({ sendCode, maskEmail: (e: string) => `${e[0]}***${e.slice(e.indexOf('@'))}` }));

const { login } = await import('./auth.service');

const base = { id: 3, name: 'Ana', email: 'ana@x.com', role: 'ALUNO', active: true, mustChangePassword: false, tokenVersion: 0 };
const withPassword = (pw: string, over = {}) => ({ ...base, passwordHash: bcrypt.hashSync(pw, 4), ...over }) as never;

beforeEach(() => {
  mockReset(prisma);
  sendCode.mockReset();
});

describe('login', () => {
  it('equipe: devolve as permissões do perfil (ADMIN: todas)', async () => {
    prisma.user.findFirst.mockResolvedValue(withPassword('senhaForte123', { role: 'OPERADOR', profile: { permissions: ['COMANDAS', 'HACK'] } }));
    const res = await login('ana@x.com', 'senhaForte123');
    expect((res as { user: { permissions: string[] } }).user.permissions).toEqual(['COMANDAS']);

    prisma.user.findFirst.mockResolvedValue(withPassword('senhaForte123', { role: 'ADMIN', profile: null }));
    const adm = await login('ana@x.com', 'senhaForte123');
    expect((adm as { user: { permissions: string[] } }).user.permissions.length).toBeGreaterThan(5);
  });

  it('usuário comum: devolve token e usuário', async () => {
    prisma.user.findFirst.mockResolvedValue(withPassword('senhaForte123'));
    const res = await login('ana@x.com', 'senhaForte123');
    expect(res).toMatchObject({ user: { id: 3, role: 'ALUNO', permissions: [] }, token: expect.any(String) });
    expect(sendCode).not.toHaveBeenCalled();
  });

  it('aluno com senha provisória: manda o código e NÃO devolve token', async () => {
    prisma.user.findFirst.mockResolvedValue(withPassword('mudar123', { mustChangePassword: true }));
    const res = await login('ana@x.com', 'mudar123');
    expect(res).toEqual({ passwordResetRequired: true, email: 'a***@x.com' });
    expect(sendCode).toHaveBeenCalledOnce();
    expect(res).not.toHaveProperty('token');
  });

  it('senha errada nunca dispara e-mail (mesmo em primeiro acesso)', async () => {
    prisma.user.findFirst.mockResolvedValue(withPassword('mudar123', { mustChangePassword: true }));
    await expect(login('ana@x.com', 'errada')).rejects.toMatchObject({ statusCode: 401 });
    expect(sendCode).not.toHaveBeenCalled();
  });

  it('usuário inexistente e inativo recebem a mesma resposta 401', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(login('x@x.com', 'qualquer')).rejects.toMatchObject({ statusCode: 401, message: 'Usuário ou senha inválidos' });
    prisma.user.findFirst.mockResolvedValue(withPassword('senhaForte123', { active: false }));
    await expect(login('ana@x.com', 'senhaForte123')).rejects.toMatchObject({ statusCode: 401, message: 'Usuário ou senha inválidos' });
  });
});
