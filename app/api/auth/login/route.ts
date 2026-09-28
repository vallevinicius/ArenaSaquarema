import { NextResponse } from 'next/server';
import { env } from '@/server/config/env';
import { TooManyRequests } from '@/server/lib/errors';
import { hit, reset } from '@/server/lib/rate-limit';
import { clientIp, route } from '@/server/lib/route';
import { setSessionCookie } from '@/server/lib/session-cookie';
import { LoginInput } from '@/server/modules/auth/auth.schemas';
import * as service from '@/server/modules/auth/auth.service';

const WINDOW_MS = 15 * 60 * 1000;

export const POST = route({ auth: false, body: LoginInput }, async ({ body, req }) => {
  // Brute force: 20 tentativas/15 min por conta (sempre) e 10 por IP (quando há proxy
  // confiável informando o IP real; ver clientIp). Sucesso zera os contadores.
  const ip = clientIp(req, env.TRUST_PROXY);
  const emailKey = `login:email:${body.email}`;
  const ipKey = ip ? `login:ip:${ip}` : null;
  const byEmail = hit(emailKey, 20, WINDOW_MS);
  const byIp = ipKey ? hit(ipKey, 10, WINDOW_MS) : byEmail;
  if (!byIp.allowed || !byEmail.allowed) throw TooManyRequests(Math.max(byIp.retryAfterSec, byEmail.retryAfterSec));

  const { token, user } = await service.login(body.email, body.password);
  if (ipKey) reset(ipKey);
  reset(emailKey);
  return setSessionCookie(NextResponse.json(user), token);
});
