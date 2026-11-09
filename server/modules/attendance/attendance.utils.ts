// Funções puras (sem banco): datas do mês e taxa de presença.

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const isMonth = (v: string) => MONTH_RE.test(v);

/** Intervalo [from, to) em "YYYY-MM-DD" do mês "YYYY-MM". */
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return { from: `${month}-01`, to: `${next}-01` };
}

/**
 * Taxa de presença em % (inteiro). Dia de aula = dia em que a arena teve ao menos um check-in;
 * é a regra única: mudar o conceito (ex.: grade fixa por plano) é trocar só `classDays`.
 */
export function presenceRate(daysAttended: number, classDays: number): number {
  if (classDays <= 0) return 0;
  return Math.min(100, Math.round((daysAttended / classDays) * 100));
}
