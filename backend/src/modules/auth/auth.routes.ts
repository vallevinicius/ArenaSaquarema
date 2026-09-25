import { Router, type CookieOptions, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env, isProd } from '../../config/env.js';
import { COOKIE_NAME, body, json, registry, secured, withErrors } from '../../docs/registry.js';
import { handler } from '../../lib/handler.js';
import { authenticate, currentUser } from '../../middlewares/auth.js';
import { ChangePasswordInput, LoginInput, MeDTO } from './auth.schemas.js';
import * as service from './auth.service.js';

const cookieOpts = (): CookieOptions => ({
  httpOnly: true, // inacessível a JS: XSS não rouba o token
  secure: isProd, // só HTTPS em produção
  sameSite: 'strict', // mitigação de CSRF
  path: '/api',
  maxAge: parseDuration(env.JWT_EXPIRES_IN),
});

function parseDuration(v: string) {
  const n = Number(v.slice(0, -1));
  const unit = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[v.slice(-1) as 's' | 'm' | 'h' | 'd'];
  return n * unit;
}

const setSession = (res: Response, token: string) => res.cookie(COOKIE_NAME, token, cookieOpts());

// Brute force: 10 tentativas / 15 min por IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas. Tente novamente em alguns minutos.' } },
});

export const authRouter = Router();

authRouter.post(
  '/login',
  loginLimiter,
  handler({ body: LoginInput }, async ({ body }, _req, res) => {
    const { token, user } = await service.login(body.email, body.password);
    setSession(res, token);
    res.json(user);
  }),
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOpts(), maxAge: undefined });
  res.status(204).end();
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json(currentUser(req));
});

authRouter.patch(
  '/password',
  authenticate,
  handler({ body: ChangePasswordInput }, async ({ body }, req, res) => {
    const token = await service.changePassword(currentUser(req).id, body.currentPassword, body.newPassword);
    setSession(res, token);
    res.status(204).end();
  }),
);

const tags = ['Auth'];
registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags,
  summary: 'Login (define cookie httpOnly com JWT)',
  request: body(LoginInput),
  responses: { 200: json(MeDTO), ...withErrors({ 429: 'Muitas tentativas' }) },
});
registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  tags,
  summary: 'Logout (remove cookie)',
  responses: { 204: { description: 'Sessão encerrada' } },
});
registry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags,
  summary: 'Usuário autenticado',
  security: secured,
  responses: { 200: json(MeDTO), ...withErrors() },
});
registry.registerPath({
  method: 'patch',
  path: '/api/auth/password',
  tags,
  summary: 'Trocar a própria senha (encerra outras sessões)',
  security: secured,
  request: body(ChangePasswordInput),
  responses: { 204: { description: 'Senha alterada' }, ...withErrors() },
});
