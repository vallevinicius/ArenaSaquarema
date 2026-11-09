import { describe, expect, it } from 'vitest';
import { isMonth, monthRange, presenceRate } from './attendance.utils';

describe('monthRange', () => {
  it('devolve [primeiro dia, primeiro dia do mês seguinte)', () => {
    expect(monthRange('2026-11')).toEqual({ from: '2026-11-01', to: '2026-12-01' });
  });
  it('vira o ano em dezembro', () => {
    expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2027-01-01' });
  });
  it('mantém o zero à esquerda em meses de 1 dígito', () => {
    expect(monthRange('2026-01')).toEqual({ from: '2026-01-01', to: '2026-02-01' });
  });
});

describe('isMonth', () => {
  it.each(['2026-01', '2026-12'])('aceita %s', (v) => expect(isMonth(v)).toBe(true));
  it.each(['2026-13', '2026-00', '26-11', '2026-1', '2026-11-01', '', "2026-11'; DROP"])('rejeita %j', (v) =>
    expect(isMonth(v)).toBe(false),
  );
});

describe('presenceRate', () => {
  it('é 0 quando não houve aula (evita divisão por zero)', () => expect(presenceRate(0, 0)).toBe(0));
  it('calcula o percentual arredondado', () => {
    expect(presenceRate(8, 10)).toBe(80);
    expect(presenceRate(1, 3)).toBe(33);
    expect(presenceRate(2, 3)).toBe(67);
  });
  it('nunca passa de 100', () => expect(presenceRate(5, 3)).toBe(100));
  it('é 100 quando foi em todos os dias', () => expect(presenceRate(12, 12)).toBe(100));
});
