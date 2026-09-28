/** Decimal do Prisma -> string com 2 casas ("12.50"). */
export const money = (d: { toFixed(n: number): string }) => d.toFixed(2);

// A arena opera em America/Sao_Paulo (UTC-3, sem horário de verão desde 2019).
export const APP_TZ_OFFSET = '-03:00';

/** "YYYY-MM-DD" de hoje no fuso da arena. */
export function todayLocal(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

/** Início do dia local em UTC (para colunas DATETIME). */
export const startOfLocalDay = (ymd: string) => new Date(`${ymd}T00:00:00${APP_TZ_OFFSET}`);

/** Colunas @db.Date: Prisma grava a parte de data em UTC. */
export const dateOnly = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

export const ymdOf = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (ymd: string, days: number) => {
  const d = dateOnly(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return ymdOf(d);
};
