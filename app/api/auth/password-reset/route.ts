import { NextResponse } from 'next/server';
import { env } from '@/server/config/env';
import { TooManyRequests } from '@/server/lib/errors';
import { hit, reset } from '@/server/lib/rate-limit';
import { clientIp, route } from '@/server/lib/route';
import { setSessionCookie } from '@/server/lib/session-cookie';
import { ConfirmPasswordResetInput } from '@/server/modules/auth/auth.schemas';
import * as service from '@/server/modules/auth/password-reset.service';

const WINDOW_MS = 15 * 60 * 1000;

export const POST = route({ auth: false, body: ConfirmPasswordResetInput }, async ({ body, req }) => {
  // O código tem 1 milhão de combinações e 5 tentativas; o limite por conta/IP fecha o resto.
  const ip = clientIp(req, env.TRUST_PROXY);
  const idKey = `reset:identifier:${body.identifier.toLowerCase()}`;
  const ipKey = ip ? `reset:ip:${ip}` : null;
  const byId = hit(idKey, 10, WINDOW_MS);
  const byIp = ipKey ? hit(ipKey, 20, WINDOW_MS) : byId;
  if (!byId.allowed || !byIp.allowed) throw TooManyRequests(Math.max(byId.retryAfterSec, byIp.retryAfterSec));

  const { token, user } = await service.confirm(body.identifier, body.code, body.newPassword);
  if (ipKey) reset(ipKey);
  reset(idKey);
  return setSessionCookie(NextResponse.json(user), token);
});
