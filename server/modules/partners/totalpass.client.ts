import 'server-only';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

const TIMEOUT_MS = 8000;

export type ValidationResult = 'VALIDATED' | 'EXPIRED' | 'RETRY';

/** Chaves de acesso (partner_api_key + place_api_key) e segredo/URL de confirmação configurados? */
export const hasCredentials = () => !!(env.TOTALPASS_PARTNER_API_KEY && env.TOTALPASS_PLACE_API_KEY);
/** Pode RECEBER e CONFIRMAR check-ins: precisa do segredo da URL e da base de confirmação. */
export const canReceive = () => !!(env.TOTALPASS_WEBHOOK_SECRET && env.TOTALPASS_VALIDATE_URL);

let cached: { token: string; exp: number } | null = null;

/** JWT da TotalPass (vale 24h; renovamos antes). */
async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now()) return cached.token;
  const res = await fetch(`${env.TOTALPASS_API_URL}/partner/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ place_api_key: env.TOTALPASS_PLACE_API_KEY, partner_api_key: env.TOTALPASS_PARTNER_API_KEY }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`TotalPass auth falhou (${res.status})`);
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error('TotalPass auth sem token');
  cached = { token: data.token, exp: Date.now() + 23 * 3600_000 };
  return data.token;
}

/** Registra (ou atualiza) a URL que a TotalPass chama a cada check-in. */
export async function registerWebhook(url: string): Promise<void> {
  const token = await accessToken();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const body = JSON.stringify({ webhook_url: url, webhook_type: 'CHECKIN' });
  let res = await fetch(`${env.TOTALPASS_API_URL}/partner/webhook/create`, { method: 'POST', headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  // Já existe um webhook desse tipo: troca a URL.
  if (res.status === 409 || res.status === 422 || res.status === 400) {
    res = await fetch(`${env.TOTALPASS_API_URL}/partner/webhook/update`, { method: 'PUT', headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  }
  if (!res.ok) throw new Error(`TotalPass webhook falhou (${res.status})`);
}

/**
 * Confirma o check-in na TotalPass. 200 = validado; 404/422 (tempo esgotado, indisponível) = expirado;
 * qualquer outra coisa (rede, 5xx) = tentar de novo depois.
 */
export async function validateCheckIn(token: string): Promise<ValidationResult> {
  const base = env.TOTALPASS_VALIDATE_URL?.replace(/\/+$/, '');
  if (!base) return 'RETRY';
  try {
    const res = await fetch(`${base}/${encodeURIComponent(token)}`, { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.ok) return 'VALIDATED';
    if (res.status === 404 || res.status === 422) return 'EXPIRED';
    logger.warn({ status: res.status }, 'totalpass: confirmação não aceita, vai tentar de novo');
    return 'RETRY';
  } catch (err) {
    logger.warn({ err }, 'totalpass: confirmação sem resposta, vai tentar de novo');
    return 'RETRY';
  }
}
