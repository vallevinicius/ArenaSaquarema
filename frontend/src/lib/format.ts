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

export const minutesSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
