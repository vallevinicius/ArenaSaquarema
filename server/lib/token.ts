// Sem 'server-only' e sem Prisma: também é importado pelo proxy.ts.
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export { COOKIE_NAME } from './constants';

const JWT_OPTS = { issuer: 'arena-saquarema-api', audience: 'arena-saquarema-web' } as const;
export type Claims = { sub: string; tv: number };

export function signToken(userId: number, tokenVersion: number): string {
  return jwt.sign({ tv: tokenVersion }, env.JWT_SECRET, {
    ...JWT_OPTS,
    algorithm: 'HS256',
    subject: String(userId),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/** Só assinatura/expiração (sem banco). Usado pelo proxy.ts para decidir redirect de página. */
export function verifyToken(token: string | undefined): Claims | null {
  if (!token) return null;
  try {
    // algorithms explícito: impede alg=none / confusão de algoritmo.
    const c = jwt.verify(token, env.JWT_SECRET, { ...JWT_OPTS, algorithms: ['HS256'] }) as Claims;
    return Number.isInteger(Number(c.sub)) ? c : null;
  } catch {
    return null;
  }
}

export function parseDuration(v: string) {
  const n = Number(v.slice(0, -1));
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[v.slice(-1) as 's' | 'm' | 'h' | 'd'];
  return n * unit; // segundos
}
