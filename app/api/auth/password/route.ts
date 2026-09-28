import { NextResponse } from 'next/server';
import { route } from '@/server/lib/route';
import { setSessionCookie } from '@/server/lib/session-cookie';
import { ChangePasswordInput } from '@/server/modules/auth/auth.schemas';
import * as service from '@/server/modules/auth/auth.service';

export const PATCH = route({ body: ChangePasswordInput }, async ({ body, user }) => {
  const token = await service.changePassword(user.id, body.currentPassword, body.newPassword);
  return setSessionCookie(new NextResponse(null, { status: 204 }), token);
});
