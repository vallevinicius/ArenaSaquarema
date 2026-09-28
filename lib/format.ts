const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const time = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export const money = (v: string | number) => brl.format(Number(v));
export const dateTime = (iso: string) => dt.format(new Date(iso));
export const hour = (iso: string) => time.format(new Date(iso));
/** "2026-09-26" -> "26/09/2026" sem passar por Date (evita deslocamento de fuso). */
export const ymdToBr = (ymd: string) => ymd.split('-').reverse().join('/');

export const todayLocal = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

export const phoneMask = (v: string | null) => {
  if (!v) return '—';
  const d = v.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
};

export const cpfMask = (v: string | null) =>
  v && v.length === 11 ? `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}` : '—';

/** Aplica a máscara de telefone progressivamente enquanto o usuário digita. */
export const maskPhoneInput = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  // até 10 dígitos: fixo (4+4); 11 dígitos: celular (5+4).
  const split = d.length <= 10 ? 4 : 5;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
};

/** Aplica a máscara de CPF progressivamente enquanto o usuário digita. */
export const maskCpfInput = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean);
  let out = parts.join('.');
  if (d.length > 9) out += `-${d.slice(9)}`;
  return out;
};

export const minutesSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
