// Dados públicos da arena, vindos do .env (sem número/endereço inventado no código).
// Cada campo é opcional: quando falta, o botão/linha correspondente simplesmente não aparece no site.
// Sem dependência de servidor, então pode ser usado em qualquer componente.

export const SITE_NAME = 'Arena Saquarema';
export const DEFAULT_MESSAGE = 'Olá! Vim pelo site da Arena Saquarema.';

type Source = Record<string, string | undefined>;

/** URL pública do site, sem barra no fim. Usada em sitemap, robots e canonical. */
export function siteUrl(src: Source = process.env): string {
  const raw = src.SITE_URL?.trim();
  if (!raw) return 'http://localhost:3000';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'http://localhost:3000';
    return u.origin;
  } catch {
    return 'http://localhost:3000';
  }
}

/** Só dígitos; aceita DDD+número (10-11 dígitos, assume Brasil) ou com 55 (12-13). Qualquer outra coisa é ignorada. */
export function whatsappDigits(src: Source = process.env): string | null {
  const d = (src.CONTACT_WHATSAPP ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return null;
}

export function whatsappLink(message = DEFAULT_MESSAGE, src: Source = process.env): string | null {
  const d = whatsappDigits(src);
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(message)}` : null;
}

/** Link do mapa: só https (evita javascript:/data: vindos de uma variável mal configurada). */
export function mapsUrl(src: Source = process.env): string | null {
  const raw = src.CONTACT_MAPS_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function address(src: Source = process.env): string | null {
  return src.CONTACT_ADDRESS?.trim() || null;
}
