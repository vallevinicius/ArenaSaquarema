import { describe, expect, it } from 'vitest';
import { FILE_NAME_RE, cleanAlt, detectImage } from './photos.utils';

const bytes = (...n: number[]) => Uint8Array.from(n);
const text = (s: string) => new TextEncoder().encode(s);

describe('detectImage (magic bytes)', () => {
  it('reconhece JPEG', () => expect(detectImage(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe('jpeg'));
  it('reconhece PNG', () => expect(detectImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe('png'));
  it('reconhece WebP', () => expect(detectImage(text('RIFF\x10\x00\x00\x00WEBPVP8 '))).toBe('webp'));
  it.each([
    ['HTML/SVG com extensão de imagem', text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ['script PHP', text('<?php system($_GET["c"]); ?>')],
    ['GIF (fora da lista)', text('GIF89a\x01\x00')],
    ['RIFF que não é WebP (WAV)', text('RIFF\x10\x00\x00\x00WAVEfmt ')],
    ['vazio', new Uint8Array()],
    ['curto demais', bytes(0xff, 0xd8)],
  ])('rejeita %s', (_n, buf) => expect(detectImage(buf)).toBeNull());
});

describe('FILE_NAME_RE', () => {
  it('aceita uuid.webp', () => expect(FILE_NAME_RE.test('3f2b8c1e-9a4d-4b7e-8c3a-1d2e3f4a5b6c.webp')).toBe(true));
  it.each(['../../etc/passwd', 'a.webp', '3f2b8c1e-9a4d-4b7e-8c3a-1d2e3f4a5b6c.php', '3f2b8c1e-9a4d-4b7e-8c3a-1d2e3f4a5b6c.webp/../x', ''])(
    'rejeita %j (anti path traversal)',
    (v) => expect(FILE_NAME_RE.test(v)).toBe(false),
  );
});

describe('cleanAlt', () => {
  it('tira quebras de linha e espaços repetidos', () => expect(cleanAlt('  treino \n  das   19h ')).toBe('treino das 19h'));
  it('limita a 160 caracteres', () => expect(cleanAlt('a'.repeat(300))).toHaveLength(160));
  it('aceita null/undefined', () => {
    expect(cleanAlt(null)).toBe('');
    expect(cleanAlt(undefined)).toBe('');
  });
});
