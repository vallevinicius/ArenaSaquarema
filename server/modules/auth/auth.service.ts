import bcrypt from 'bcryptjs';
import { BadRequest, Unauthorized } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/auth';

export const BCRYPT_COST = 12;

// Hash fixo para comparar quando o e-mail não existe: tempo de resposta igual
// nos dois casos, impedindo enumeração de usuários por timing.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_COST);

export async function login(identifier: string, password: string) {
  // Aceita e-mail (case-insensitive, como é salvo) ou nome do usuário (case-sensitive).
  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier.toLowerCase() }, { name: identifier }] } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  // Mesma mensagem para "não existe", "senha errada" e "inativo".
  if (!user || !ok || !user.active) throw Unauthorized('Usuário ou senha inválidos');

  return {
    token: signToken(user.id, user.tokenVersion),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw BadRequest('Senha atual incorreta', 'INVALID_PASSWORD');
  }
  if (currentPassword === newPassword) throw BadRequest('A nova senha deve ser diferente da atual');

  const updated = await prisma.user.update({
    where: { id: userId },
    // tokenVersion++ derruba todas as outras sessões abertas desse usuário.
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_COST), tokenVersion: { increment: 1 } },
  });
  return signToken(updated.id, updated.tokenVersion);
}
