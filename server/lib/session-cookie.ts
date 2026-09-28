import 'server-only';
import type { NextResponse } from 'next/server';
import { env, isProd } from '../config/env';
import { COOKIE_NAME, parseDuration } from './auth';

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, // inacessível a JS: XSS não rouba o token
    secure: isProd(), // só HTTPS em produção
    sameSite: 'strict', // mitigação de CSRF
    path: '/', // precisa valer para as páginas (proxy.ts) e para /api
    maxAge: parseDuration(env.JWT_EXPIRES_IN),
  });
  return res;
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, secure: isProd(), sameSite: 'strict', path: '/', maxAge: 0 });
  return res;
}
