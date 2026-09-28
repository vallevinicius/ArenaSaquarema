import 'server-only';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Janela fixa em memória. Limitação consciente: vale por processo. Com mais de uma
 * instância atrás de load balancer, troque por Redis (ou rate limit no nginx).
 */
export function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) sweep(now);
    return { allowed: true, retryAfterSec: 0 };
  }
  b.count++;
  return { allowed: b.count <= limit, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
}

export function reset(key: string) {
  buckets.delete(key);
}

function sweep(now: number) {
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}
