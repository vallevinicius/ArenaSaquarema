// Funções puras (sem banco/disco).

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB por foto (celular costuma mandar 3 a 6 MB)
export const MAX_DIMENSION = 1920; // lado maior após o reencode
export const FILE_NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export type ImageKind = 'jpeg' | 'png' | 'webp';

/**
 * Descobre o formato pelos primeiros bytes (magic numbers). O Content-Type e o nome do
 * arquivo vêm do cliente e não valem nada para decidir se algo é imagem.
 */
export function detectImage(buf: Uint8Array): ImageKind | null {
  const at = (i: number) => buf[i];
  if (buf.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpeg';
  if (
    buf.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b)
  ) {
    return 'png';
  }
  // WebP = "RIFF" + 4 bytes de tamanho + "WEBP"
  if (buf.length >= 12 && String.fromCharCode(...buf.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...buf.subarray(8, 12)) === 'WEBP') {
    return 'webp';
  }
  return null;
}

/** Texto alternativo: sem quebras de linha e com tamanho limitado. */
export const cleanAlt = (v: string | null | undefined) => (v ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
