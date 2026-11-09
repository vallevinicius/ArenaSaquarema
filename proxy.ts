import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME, verifyToken } from '@/server/lib/token';

/**
 * Porteiro das PÁGINAS: sem sessão válida, redireciona para /login.
 * A API não passa por aqui: cada Route Handler autentica sozinho (assinatura +
 * usuário ativo + tokenVersion no banco), então o proxy é só UX, não a barreira.
 */
export function proxy(request: NextRequest) {
  const claims = verifyToken(request.cookies.get(COOKIE_NAME)?.value);
  if (claims) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Tudo menos a home pública ("/"), API, login, docs, assets do Next e arquivos estáticos.
  matcher: ['/((?!api|login|docs|horarios|_next/static|_next/image|manifest.webmanifest|.*\\.(?:svg|png|ico|webp)$).+)'],
};
