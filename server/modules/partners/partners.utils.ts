import { timingSafeEqual } from 'node:crypto';

/** "AAAA-MM-DD" no fuso da arena (America/Sao_Paulo) para um instante. */
export const localDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);

/** Comparação em tempo constante (o segredo da URL não vaza por diferença de tempo). */
export function safeEqual(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * O aviso da TotalPass traz uma URL de confirmação cujo último trecho é o token. Usamos SÓ o token:
 * a URL em si vem de quem chamou o webhook e nunca é acessada (evita SSRF).
 */
export function tokenFromEndpoint(endpoint: string): string | null {
  let path: string;
  try {
    path = new URL(endpoint).pathname;
  } catch {
    return null;
  }
  const token = path.split('/').filter(Boolean).pop() ?? '';
  return /^[A-Za-z0-9._~-]{8,255}$/.test(token) ? token : null;
}
