import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// CSP: o Next injeta scripts inline de hidratação, então 'unsafe-inline' em script-src é
// necessário sem nonce. Trade-off consciente: nonce exigiria renderização 100% dinâmica
// via proxy.ts. O que realmente protege a sessão é o cookie httpOnly (JS não lê o token).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pacotes com binário nativo/worker ou pool de conexões ficam fora do bundle.
  serverExternalPackages: ['@prisma/adapter-mariadb', 'mariadb', 'pino', 'bcryptjs'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
        ],
      },
      {
        // Respostas da API nunca em cache (dados de caixa/estoque mudam a todo momento).
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
