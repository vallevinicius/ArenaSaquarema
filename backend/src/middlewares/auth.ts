import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { COOKIE_NAME } from '../docs/registry.js';
import { Forbidden, Unauthorized } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import type { Role } from '../generated/prisma/enums.js';

export type AuthUser = { id: number; name: string; email: string; role: Role };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_OPTS = { issuer: 'arena-saquarema-api', audience: 'arena-saquarema-web' } as const;

type Claims = { sub: string; tv: number };

export function signToken(userId: number, tokenVersion: number): string {
  return jwt.sign({ tv: tokenVersion } satisfies Omit<Claims, 'sub'>, env.JWT_SECRET, {
    ...JWT_OPTS,
    algorithm: 'HS256',
    subject: String(userId),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token: unknown = req.cookies?.[COOKIE_NAME];
    if (typeof token !== 'string' || !token) throw Unauthorized();

    let claims: Claims;
    try {
      // algorithms explícito: impede alg=none / confusão de algoritmo.
      claims = jwt.verify(token, env.JWT_SECRET, { ...JWT_OPTS, algorithms: ['HS256'] }) as Claims;
    } catch {
      throw Unauthorized('Sessão inválida ou expirada');
    }

    const userId = Number(claims.sub);
    if (!Number.isInteger(userId)) throw Unauthorized('Sessão inválida');

    // 1 query por request: permite revogar sessão imediatamente (desativação/troca de senha).
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, active: true, tokenVersion: true },
    });
    if (!user || !user.active || user.tokenVersion !== claims.tv) throw Unauthorized('Sessão revogada');

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (e) {
    next(e);
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Unauthorized());
    if (!roles.includes(req.user.role)) return next(Forbidden());
    next();
  };

/** Para uso dentro de handlers já protegidos por authenticate. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw Unauthorized();
  return req.user;
}
