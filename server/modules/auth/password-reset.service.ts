import bcrypt from 'bcryptjs';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env';
import { BadRequest } from '../../lib/errors';
import { sendMail } from '../../lib/mail';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/token';
import { BCRYPT_COST } from './auth.service';

export const CODE_TTL_MS = 10 * 60_000;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60_000;

const INVALID_CODE = () => BadRequest('Código inválido ou expirado', 'INVALID_CODE');

export const generateCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** HMAC com o JWT_SECRET: o código de 6 dígitos nunca fica em texto no banco. */
export const hashCode = (userId: number, code: string) =>
  createHmac('sha256', env.JWT_SECRET).update(`${userId}:${code}`).digest('hex');

/** "joao@gmail.com" -> "j***@gmail.com" */
export const maskEmail = (email: string) => {
  const at = email.lastIndexOf('@');
  return `${email.slice(0, 1)}***${email.slice(at)}`;
};

/**
 * Gera e envia o código. Dentro do intervalo de reenvio (60s) não manda outro:
 * evita usar o login para encher a caixa de entrada de alguém.
 */
export async function sendCode(user: { id: number; email: string; name: string }) {
  const now = Date.now();
  const current = await prisma.passwordResetCode.findUnique({ where: { userId: user.id } });
  if (current && current.expiresAt.getTime() > now && now - current.sentAt.getTime() < RESEND_COOLDOWN_MS) return;

  const code = generateCode();
  const data = { codeHash: hashCode(user.id, code), expiresAt: new Date(now + CODE_TTL_MS), attempts: 0, sentAt: new Date(now) };
  await prisma.passwordResetCode.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });

  try {
    await sendMail({
      to: user.email,
      subject: `Seu código de acesso: ${code}`,
      text: `Seu código para definir a senha na Arena Saquarema é ${code}. Ele vale por 10 minutos. Se não foi você, ignore este e-mail.`,
      html:
        `<p>Seu código para definir a senha na <strong>Arena Saquarema</strong>:</p>` +
        `<p style="font-size:32px;font-weight:800;letter-spacing:6px">${code}</p>` +
        `<p>Ele vale por 10 minutos. Se não foi você, ignore este e-mail.</p>`,
    });
  } catch (err) {
    // Sem e-mail entregue o código não serve: libera o reenvio imediato.
    await prisma.passwordResetCode.deleteMany({ where: { userId: user.id } });
    throw err;
  }
}

/** Confere o código e define a nova senha. Todo erro de código devolve a mesma mensagem. */
export async function confirm(identifier: string, code: string, newPassword: string) {
  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier.toLowerCase() }, { name: identifier }] } });
  if (!user || !user.active || !user.mustChangePassword) throw INVALID_CODE();

  const record = await prisma.passwordResetCode.findUnique({ where: { userId: user.id } });
  if (!record || record.expiresAt.getTime() <= Date.now() || record.attempts >= MAX_ATTEMPTS) throw INVALID_CODE();

  const expected = Buffer.from(record.codeHash);
  const given = Buffer.from(hashCode(user.id, code));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    const { attempts } = await prisma.passwordResetCode.update({
      where: { userId: user.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    if (attempts >= MAX_ATTEMPTS) await prisma.passwordResetCode.deleteMany({ where: { userId: user.id } });
    throw INVALID_CODE();
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Uso único: se duas requisições chegarem juntas, só uma apaga o código e segue.
    const used = await tx.passwordResetCode.deleteMany({ where: { userId: user.id, codeHash: record.codeHash } });
    if (used.count !== 1) throw INVALID_CODE();
    return tx.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_COST), mustChangePassword: false, tokenVersion: { increment: 1 } },
    });
  });

  return {
    token: signToken(updated.id, updated.tokenVersion),
    user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role },
  };
}
