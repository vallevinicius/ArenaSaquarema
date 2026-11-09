import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '../../generated/prisma/client';

const prisma = mockDeep<PrismaClient>();
const sendMail = vi.fn();
vi.mock('../../lib/prisma', () => ({ prisma }));
vi.mock('../../lib/mail', () => ({ sendMail }));

const svc = await import('./password-reset.service');

const user = { id: 3, name: 'ana@x.com', email: 'ana@x.com', role: 'ALUNO', active: true, mustChangePassword: true, tokenVersion: 0, passwordHash: 'h' };

beforeEach(() => {
  mockReset(prisma);
  sendMail.mockReset();
  // $transaction com callback: executa com o próprio mock como `tx`.
  prisma.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) => fn(prisma)) as never);
});

describe('helpers', () => {
  it('maskEmail esconde o usuário e mantém o domínio', () => expect(svc.maskEmail('joao@gmail.com')).toBe('j***@gmail.com'));
  it('generateCode sempre tem 6 dígitos (com zeros à esquerda)', () => {
    for (let i = 0; i < 200; i++) expect(svc.generateCode()).toMatch(/^\d{6}$/);
  });
  it('hashCode é determinístico, amarrado ao usuário e não contém o código', () => {
    expect(svc.hashCode(1, '123456')).toBe(svc.hashCode(1, '123456'));
    expect(svc.hashCode(1, '123456')).not.toBe(svc.hashCode(2, '123456'));
    expect(svc.hashCode(1, '123456')).not.toContain('123456');
  });
});

describe('sendCode', () => {
  it('grava só o hash e envia o código por e-mail', async () => {
    prisma.passwordResetCode.findUnique.mockResolvedValue(null);
    await svc.sendCode(user);

    const arg = prisma.passwordResetCode.upsert.mock.calls[0]![0];
    const mail = sendMail.mock.calls[0]![0] as { to: string; text: string };
    const code = /\b(\d{6})\b/.exec(mail.text)![1]!;
    expect(mail.to).toBe('ana@x.com');
    expect(arg.create.codeHash).toBe(svc.hashCode(3, code));
    expect(JSON.stringify(arg)).not.toContain(code);
    expect(arg.create.attempts).toBe(0);
  });

  it('não reenvia dentro do intervalo de 60s (anti-spam de e-mail)', async () => {
    prisma.passwordResetCode.findUnique.mockResolvedValue({
      userId: 3, codeHash: 'x', attempts: 0, id: 1, sentAt: new Date(Date.now() - 10_000), expiresAt: new Date(Date.now() + 500_000),
    });
    await svc.sendCode(user);
    expect(sendMail).not.toHaveBeenCalled();
    expect(prisma.passwordResetCode.upsert).not.toHaveBeenCalled();
  });

  it('reenvia depois do intervalo', async () => {
    prisma.passwordResetCode.findUnique.mockResolvedValue({
      userId: 3, codeHash: 'x', attempts: 0, id: 1, sentAt: new Date(Date.now() - 120_000), expiresAt: new Date(Date.now() + 500_000),
    });
    await svc.sendCode(user);
    expect(sendMail).toHaveBeenCalledOnce();
  });

  it('se o e-mail falhar, apaga o código e propaga o erro', async () => {
    prisma.passwordResetCode.findUnique.mockResolvedValue(null);
    sendMail.mockRejectedValue(new Error('resend fora'));
    await expect(svc.sendCode(user)).rejects.toThrow('resend fora');
    expect(prisma.passwordResetCode.deleteMany).toHaveBeenCalledWith({ where: { userId: 3 } });
  });
});

describe('confirm', () => {
  const record = (over = {}) => ({
    id: 1, userId: 3, codeHash: svc.hashCode(3, '123456'), attempts: 0, sentAt: new Date(), expiresAt: new Date(Date.now() + 60_000), ...over,
  });
  const invalid = { statusCode: 400, code: 'INVALID_CODE' };

  it.each([
    ['usuário inexistente', null],
    ['usuário inativo', { ...user, active: false }],
    ['conta que não está em primeiro acesso (equipe/admin)', { ...user, mustChangePassword: false }],
  ])('rejeita: %s', async (_n, u) => {
    prisma.user.findFirst.mockResolvedValue(u as never);
    await expect(svc.confirm('ana@x.com', '123456', 'novaSenha123')).rejects.toMatchObject(invalid);
    expect(prisma.passwordResetCode.findUnique).not.toHaveBeenCalled();
  });

  it('rejeita código inexistente, expirado ou com tentativas esgotadas', async () => {
    prisma.user.findFirst.mockResolvedValue(user as never);
    for (const rec of [null, record({ expiresAt: new Date(Date.now() - 1000) }), record({ attempts: svc.MAX_ATTEMPTS })]) {
      prisma.passwordResetCode.findUnique.mockResolvedValue(rec);
      await expect(svc.confirm('ana@x.com', '123456', 'novaSenha123')).rejects.toMatchObject(invalid);
    }
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('código errado conta uma tentativa e não troca a senha', async () => {
    prisma.user.findFirst.mockResolvedValue(user as never);
    prisma.passwordResetCode.findUnique.mockResolvedValue(record());
    prisma.passwordResetCode.update.mockResolvedValue({ attempts: 1 } as never);
    await expect(svc.confirm('ana@x.com', '000000', 'novaSenha123')).rejects.toMatchObject(invalid);
    expect(prisma.passwordResetCode.update).toHaveBeenCalledWith(expect.objectContaining({ data: { attempts: { increment: 1 } } }));
    expect(prisma.passwordResetCode.deleteMany).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('na última tentativa errada o código é destruído', async () => {
    prisma.user.findFirst.mockResolvedValue(user as never);
    prisma.passwordResetCode.findUnique.mockResolvedValue(record({ attempts: svc.MAX_ATTEMPTS - 1 }));
    prisma.passwordResetCode.update.mockResolvedValue({ attempts: svc.MAX_ATTEMPTS } as never);
    await expect(svc.confirm('ana@x.com', '000000', 'novaSenha123')).rejects.toMatchObject(invalid);
    expect(prisma.passwordResetCode.deleteMany).toHaveBeenCalledWith({ where: { userId: 3 } });
  });

  it('código certo: grava hash da senha nova, limpa o flag, revoga sessões e devolve token', async () => {
    prisma.user.findFirst.mockResolvedValue(user as never);
    prisma.passwordResetCode.findUnique.mockResolvedValue(record());
    prisma.passwordResetCode.deleteMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockImplementation((async (a: { data: { passwordHash: string } }) => ({ ...user, tokenVersion: 1, passwordHash: a.data.passwordHash })) as never);

    const res = await svc.confirm('ana@x.com', '123456', 'novaSenha123');

    const data = prisma.user.update.mock.calls[0]![0].data as { passwordHash: string; mustChangePassword: boolean; tokenVersion: { increment: number } };
    expect(await bcrypt.compare('novaSenha123', data.passwordHash)).toBe(true);
    expect(data.mustChangePassword).toBe(false);
    expect(data.tokenVersion).toEqual({ increment: 1 });
    expect(res.token).toEqual(expect.any(String));
    expect(res.user).toEqual({ id: 3, name: 'ana@x.com', email: 'ana@x.com', role: 'ALUNO' });
    expect(JSON.stringify(res)).not.toContain('passwordHash');
  });

  it('uso único: se outra requisição já consumiu o código, falha', async () => {
    prisma.user.findFirst.mockResolvedValue(user as never);
    prisma.passwordResetCode.findUnique.mockResolvedValue(record());
    prisma.passwordResetCode.deleteMany.mockResolvedValue({ count: 0 });
    await expect(svc.confirm('ana@x.com', '123456', 'novaSenha123')).rejects.toMatchObject(invalid);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
