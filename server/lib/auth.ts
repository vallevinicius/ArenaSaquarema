import 'server-only';
import { prisma } from './prisma';
import { Unauthorized } from './errors';
import { verifyToken } from './token';
import type { Role } from '../generated/prisma/enums';

export { COOKIE_NAME, parseDuration, signToken, verifyToken } from './token';
export type AuthUser = { id: number; name: string; email: string; role: Role };

/**
 * Autenticação completa (usada em toda rota de API): assinatura + usuário ativo +
 * tokenVersion igual ao do banco. 1 query por request em troca de revogação imediata.
 */
export async function authenticate(token: string | undefined): Promise<AuthUser> {
  const claims = verifyToken(token);
  if (!claims) throw Unauthorized('Sessão inválida ou expirada');

  const user = await prisma.user.findUnique({
    where: { id: Number(claims.sub) },
    select: { id: true, name: true, email: true, role: true, active: true, tokenVersion: true },
  });
  if (!user || !user.active || user.tokenVersion !== claims.tv) throw Unauthorized('Sessão revogada');
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

