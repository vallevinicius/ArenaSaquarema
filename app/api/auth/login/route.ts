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
  const identifierKey = `login:identifier:${body.identifier.toLowerCase()}`;
  const ipKey = ip ? `login:ip:${ip}` : null;
  const byIdentifier = hit(identifierKey, 20, WINDOW_MS);
  const byIp = ipKey ? hit(ipKey, 10, WINDOW_MS) : byIdentifier;
  if (!byIp.allowed || !byIdentifier.allowed) throw TooManyRequests(Math.max(byIp.retryAfterSec, byIdentifier.retryAfterSec));

  const result = await service.login(body.identifier, body.password);
  if (ipKey) reset(ipKey);
  reset(identifierKey);
  // 202: senha provisória correta, falta confirmar o código do e-mail (sem cookie de sessão).
  if ('passwordResetRequired' in result) return NextResponse.json(result, { status: 202 });
  return setSessionCookie(NextResponse.json(result.user), result.token);
});
