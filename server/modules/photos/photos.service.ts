import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '../../config/env';
import { AppError, BadRequest, NotFound } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import type { UpdatePhoto } from './photos.schemas';
import { FILE_NAME_RE, MAX_DIMENSION, MAX_UPLOAD_BYTES, cleanAlt, detectImage } from './photos.utils';

const uploadDir = () => path.resolve(env.UPLOAD_DIR);

const select = { id: true, alt: true, width: true, height: true, createdAt: true } as const;
type Row = { id: number; alt: string; width: number; height: number; createdAt: Date };
const toDTO = (p: Row) => ({
  id: p.id,
  alt: p.alt,
  url: `/api/photos/${p.id}/file`,
  width: p.width,
  height: p.height,
  createdAt: p.createdAt.toISOString(),
});

export async function list() {
  return (await prisma.photo.findMany({ select, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })).map(toDTO);
}

/**
 * Upload do admin. O arquivo enviado NUNCA é gravado como veio: é validado pelos bytes,
 * reencodado em WebP (some qualquer payload escondido e o EXIF/GPS do celular) e
 * salvo com nome gerado aqui.
 */
export async function create(userId: number, file: File, altRaw: string | null) {
  if (file.size === 0) throw BadRequest('Arquivo vazio', 'EMPTY_FILE');
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'A foto passa de 10 MB');
  const input = Buffer.from(await file.arrayBuffer());
  if (!detectImage(input)) {
    throw new AppError(415, 'UNSUPPORTED_IMAGE', 'Envie uma imagem JPEG, PNG ou WebP');
  }

  let out: { data: Buffer; info: { width: number; height: number; size: number } };
  try {
    out = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate() // aplica a orientação do EXIF antes de descartá-lo
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch (err) {
    logger.warn({ err }, 'Imagem recusada pelo sharp');
    throw new AppError(415, 'UNSUPPORTED_IMAGE', 'Não foi possível ler essa imagem');
  }

  const name = `${randomUUID()}.webp`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), name), out.data, { flag: 'wx' });
  try {
    const row = await prisma.photo.create({
      data: { file: name, alt: cleanAlt(altRaw), width: out.info.width, height: out.info.height, bytes: out.info.size, createdById: userId },
      select,
    });
    return toDTO(row);
  } catch (err) {
    await unlink(path.join(uploadDir(), name)).catch(() => undefined); // não deixa arquivo órfão
    throw err;
  }
}

/** Conteúdo para a rota pública. O caminho vem do banco (nome gerado), mesmo assim é revalidado. */
export async function read(id: number) {
  const photo = await prisma.photo.findUnique({ where: { id }, select: { file: true } });
  if (!photo || !FILE_NAME_RE.test(photo.file)) throw NotFound('Foto', true);
  try {
    return await readFile(path.join(uploadDir(), photo.file));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw NotFound('Foto', true);
    throw err;
  }
}

export async function update(id: number, input: UpdatePhoto) {
  const row = await prisma.photo.update({ where: { id }, data: { alt: cleanAlt(input.alt) }, select }); // P2025 -> 404
  return toDTO(row);
}

export async function remove(id: number) {
  const photo = await prisma.photo.delete({ where: { id }, select: { file: true } }); // P2025 -> 404
  if (FILE_NAME_RE.test(photo.file)) await unlink(path.join(uploadDir(), photo.file)).catch(() => undefined);
}
