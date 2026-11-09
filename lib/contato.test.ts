import { describe, expect, it } from 'vitest';
import { address, mapsUrl, siteUrl, whatsappDigits, whatsappLink } from './contato';

describe('siteUrl', () => {
  it('usa a origem configurada, sem barra final nem caminho', () => {
    expect(siteUrl({ SITE_URL: 'https://arenasaquarema.com.br/' })).toBe('https://arenasaquarema.com.br');
    expect(siteUrl({ SITE_URL: 'https://x.com.br/a/b?c=1' })).toBe('https://x.com.br');
  });
  it('cai em localhost se faltar ou for inválida', () => {
    expect(siteUrl({})).toBe('http://localhost:3000');
    expect(siteUrl({ SITE_URL: 'não é url' })).toBe('http://localhost:3000');
    expect(siteUrl({ SITE_URL: 'javascript:alert(1)' })).toBe('http://localhost:3000');
  });
});

describe('whatsapp', () => {
  it('normaliza DDD+número e número com 55', () => {
    expect(whatsappDigits({ CONTACT_WHATSAPP: '(22) 99999-1234' })).toBe('5522999991234');
    expect(whatsappDigits({ CONTACT_WHATSAPP: '+55 22 99999-1234' })).toBe('5522999991234');
    expect(whatsappDigits({ CONTACT_WHATSAPP: '2233334444' })).toBe('552233334444');
  });
  it('recusa vazio, curto e lixo', () => {
    expect(whatsappDigits({})).toBeNull();
    expect(whatsappDigits({ CONTACT_WHATSAPP: '12345' })).toBeNull();
    expect(whatsappDigits({ CONTACT_WHATSAPP: 'abc' })).toBeNull();
    expect(whatsappDigits({ CONTACT_WHATSAPP: '123456789012345' })).toBeNull();
    expect(whatsappDigits({ CONTACT_WHATSAPP: '44 20 7946 0958 12' })).toBeNull(); // 12 dígitos que não começam com 55
  });
  it('monta o link com a mensagem codificada', () => {
    const l = whatsappLink('Oi & tudo?', { CONTACT_WHATSAPP: '22999991234' });
    expect(l).toBe('https://wa.me/5522999991234?text=Oi%20%26%20tudo%3F');
    expect(whatsappLink('x', {})).toBeNull();
  });
});

describe('mapsUrl e address', () => {
  it('aceita só https', () => {
    expect(mapsUrl({ CONTACT_MAPS_URL: 'https://maps.app.goo.gl/abc' })).toBe('https://maps.app.goo.gl/abc');
    expect(mapsUrl({ CONTACT_MAPS_URL: 'http://maps.example.com' })).toBeNull();
    expect(mapsUrl({ CONTACT_MAPS_URL: 'javascript:alert(1)' })).toBeNull();
    expect(mapsUrl({})).toBeNull();
  });
  it('endereço vazio vira null', () => {
    expect(address({ CONTACT_ADDRESS: '  ' })).toBeNull();
    expect(address({ CONTACT_ADDRESS: ' Rua X, 10 ' })).toBe('Rua X, 10');
  });
});
