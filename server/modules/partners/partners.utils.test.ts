import { describe, expect, it } from 'vitest';
import { localDay, safeEqual, tokenFromEndpoint } from './partners.utils';

describe('tokenFromEndpoint', () => {
  it('pega só o último trecho da URL de confirmação', () => {
    expect(tokenFromEndpoint('https://admin.staging.totalpass.com/api/v1/webhook_confirmations/AbC123-xyz_9')).toBe('AbC123-xyz_9');
    expect(tokenFromEndpoint('https://x.com/a/tokentoken1/')).toBe('tokentoken1');
  });
  it('recusa token curto, com caracteres perigosos ou URL inválida', () => {
    expect(tokenFromEndpoint('https://x.com/a/curto')).toBeNull();
    expect(tokenFromEndpoint('https://x.com/a/../etc')).toBeNull();
    expect(tokenFromEndpoint('https://x.com/a/tok%2F..%2Fenxxxx')).toBeNull();
    expect(tokenFromEndpoint('não é url')).toBeNull();
    expect(tokenFromEndpoint('https://x.com/')).toBeNull();
  });
});

describe('safeEqual', () => {
  it('igual, diferente, tamanhos diferentes e vazio', () => {
    expect(safeEqual('segredo-aleatorio-123', 'segredo-aleatorio-123')).toBe(true);
    expect(safeEqual('segredo-aleatorio-123', 'segredo-aleatorio-124')).toBe(false);
    expect(safeEqual('a', 'ab')).toBe(false);
    expect(safeEqual('', '')).toBe(false);
    expect(safeEqual(undefined, 'x')).toBe(false);
  });
});

describe('localDay', () => {
  it('usa o dia de São Paulo, não o UTC', () => {
    expect(localDay(new Date('2026-11-10T01:30:00Z'))).toBe('2026-11-09'); // 22:30 do dia 09 em SP
    expect(localDay(new Date('2026-11-10T03:00:00Z'))).toBe('2026-11-10');
  });
});
