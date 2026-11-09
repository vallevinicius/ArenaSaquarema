import { addDays } from '../../lib/format';

/** Cada pagamento cobre 30 dias corridos, contando o dia de início (pagou 09/11 -> vale até 08/12). */
export const PERIOD_DAYS = 30;
/** Faltando até 5 dias para acabar, o aluno aparece como "vence em breve". */
export const SOON_DAYS = 5;

export type MembershipStatus = 'SEM_PLANO' | 'PARCEIRO' | 'SEM_PAGAMENTO' | 'EM_DIA' | 'VENCE_EM_BREVE' | 'VENCIDO';

const MS_DAY = 86_400_000;
/** Diferença em dias entre duas datas "AAAA-MM-DD" (to - from). */
export const diffDays = (from: string, to: string) =>
  Math.round((Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10)) - Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))) / MS_DAY);

/**
 * Período do novo pagamento. Pagou depois de vencer (ou é o 1º): começa no dia do pagamento.
 * Pagou antes de vencer: começa no dia seguinte ao fim do período atual, para não perder dias.
 */
export function periodFor(paidOn: string, lastEnd: string | null) {
  const next = lastEnd ? addDays(lastEnd, 1) : null;
  const start = next && next > paidOn ? next : paidOn;
  return { start, end: addDays(start, PERIOD_DAYS - 1) };
}

/** Situação calculada (nunca digitada): depende só do plano, do fim da validade e de "hoje". */
export function statusOf(input: { hasPlan: boolean; chargeable: boolean; validUntil: string | null; today: string }): {
  status: MembershipStatus;
  /** Dias até acabar a validade (negativo = dias de atraso). null quando não se aplica. */
  daysLeft: number | null;
} {
  if (!input.hasPlan) return { status: 'SEM_PLANO', daysLeft: null };
  if (!input.chargeable) return { status: 'PARCEIRO', daysLeft: null };
  if (!input.validUntil) return { status: 'SEM_PAGAMENTO', daysLeft: null };
  const daysLeft = diffDays(input.today, input.validUntil);
  if (daysLeft < 0) return { status: 'VENCIDO', daysLeft };
  return { status: daysLeft <= SOON_DAYS ? 'VENCE_EM_BREVE' : 'EM_DIA', daysLeft };
}

/** Ordem da lista: quem precisa de cobrança primeiro. */
export const STATUS_ORDER: Record<MembershipStatus, number> = {
  VENCIDO: 0,
  SEM_PAGAMENTO: 1,
  VENCE_EM_BREVE: 2,
  EM_DIA: 3,
  PARCEIRO: 4,
  SEM_PLANO: 5,
};
