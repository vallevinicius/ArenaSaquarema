import { NextResponse } from 'next/server';
import { route } from '@/server/lib/route';
import { clearSessionCookie } from '@/server/lib/session-cookie';

export const POST = route({ auth: false }, async () => clearSessionCookie(new NextResponse(null, { status: 204 })));
