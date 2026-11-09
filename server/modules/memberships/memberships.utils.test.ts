import { describe, expect, it } from 'vitest';
import { PERIOD_DAYS, SOON_DAYS, diffDays, periodFor, statusOf } from './memberships.utils';

describe('periodFor', () => {
  it('1º pagamento: 30 dias contando o dia do pagamento', () => {
    expect(periodFor('2026-11-09', null)).toEqual({ start: '2026-11-09', end: '2026-12-08' });
    expect(PERIOD_DAYS).toBe(30);
  });
  it('pagou depois de vencer: recomeça no dia do pagamento (sem retroativo)', () => {
    expect(periodFor('2026-12-20', '2026-12-08')).toEqual({ start: '2026-12-20', end: '2027-01-18' });
  });
  it('pagou antes de vencer: soma ao período atual, sem perder dias', () => {
    expect(periodFor('2026-12-01', '2026-12-08')).toEqual({ start: '2026-12-09', end: '2027-01-07' });
  });
  it('pagou no último dia coberto ou no dia seguinte: sem buraco e sem sobreposição', () => {
    expect(periodFor('2026-12-08', '2026-12-08').start).toBe('2026-12-09');
    expect(periodFor('2026-12-09', '2026-12-08').start).toBe('2026-12-09');
  });
  it('vira o ano e o fevereiro bissexto corretamente', () => {
    expect(periodFor('2027-12-20', null).end).toBe('2028-01-18');
    expect(periodFor('2028-02-01', null).end).toBe('2028-03-01'); // 2028 é bissexto
  });
});

describe('diffDays', () => {
  it('conta dias corridos, inclusive entre meses', () => {
    expect(diffDays('2026-11-09', '2026-11-09')).toBe(0);
    expect(diffDays('2026-11-09', '2026-12-09')).toBe(30);
    expect(diffDays('2026-12-09', '2026-11-09')).toBe(-30);
  });
});

describe('statusOf', () => {
  const base = { hasPlan: true, chargeable: true, today: '2026-11-09' };
  it('sem plano', () => expect(statusOf({ ...base, hasPlan: false, validUntil: null }).status).toBe('SEM_PLANO'));
  it('parceiro nunca atrasa, mesmo com data velha', () => {
    expect(statusOf({ ...base, chargeable: false, validUntil: '2020-01-01' })).toEqual({ status: 'PARCEIRO', daysLeft: null });
  });
  it('com plano e sem nenhum pagamento', () => expect(statusOf({ ...base, validUntil: null }).status).toBe('SEM_PAGAMENTO'));
  it('em dia quando falta mais que o limite de aviso', () => {
    expect(statusOf({ ...base, validUntil: '2026-11-20' })).toEqual({ status: 'EM_DIA', daysLeft: 11 });
  });
  it('vence em breve no limite exato (5 dias) e no último dia coberto (0)', () => {
    expect(statusOf({ ...base, validUntil: '2026-11-14' }).status).toBe('VENCE_EM_BREVE');
    expect(SOON_DAYS).toBe(5);
    expect(statusOf({ ...base, validUntil: '2026-11-15' }).status).toBe('EM_DIA');
    expect(statusOf({ ...base, validUntil: '2026-11-09' })).toEqual({ status: 'VENCE_EM_BREVE', daysLeft: 0 });
  });
  it('vencido no dia seguinte ao último dia coberto, com dias de atraso negativos', () => {
    expect(statusOf({ ...base, validUntil: '2026-11-08' })).toEqual({ status: 'VENCIDO', daysLeft: -1 });
    expect(statusOf({ ...base, validUntil: '2026-10-09' }).daysLeft).toBe(-31);
  });
});
