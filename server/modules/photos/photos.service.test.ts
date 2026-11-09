import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '../../generated/prisma/client';

const prisma = mockDeep<PrismaClient>();
const fs = { mkdir: vi.fn(), writeFile: vi.fn(), unlink: vi.fn(), readFile: vi.fn() };
vi.mock('../../lib/prisma', () => ({ prisma }));
vi.mock('node:fs/promises', () => ({ ...fs, default: fs }));
vi.mock('../../config/env', () => ({ env: { UPLOAD_DIR: '/data/uploads' } }));

const svc = await import('./photos.service');

const UUID_WEBP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;
const png = (w = 40, h = 20) => sharp({ create: { width: w, height: h, channels: 3, background: '#0b3a82' } }).png().toBuffer();
const asFile = (data: BlobPart, name = 'foto.png') => new File([data], name);
const row = { id: 1, alt: 'Treino', width: 40, height: 20, createdAt: new Date('2026-11-09T12:00:00Z') };

beforeEach(() => {
  mockReset(prisma);
  Object.values(fs).forEach((f) => f.mockReset());
  fs.mkdir.mockResolvedValue(undefined);
  fs.writeFile.mockResolvedValue(undefined);
  fs.unlink.mockResolvedValue(undefined);
});

describe('create', () => {
  it('reencoda em WebP, grava com nome gerado e guarda só metadados', async () => {
    prisma.photo.create.mockResolvedValue(row as never);
    const dto = await svc.create(5, asFile(await png(), 'minha foto ../../x.png'), '  Treino ');

    const [filePath, written] = fs.writeFile.mock.calls[0] as [string, Buffer, { flag: string }];
    const name = filePath.split('/').pop()!;
    expect(filePath.startsWith('/data/uploads/')).toBe(true);
    expect(name).toMatch(UUID_WEBP); // o nome do cliente nunca é usado
    expect(written.subarray(0, 4).toString()).toBe('RIFF');
    expect(written.subarray(8, 12).toString()).toBe('WEBP');
    expect((fs.writeFile.mock.calls[0] as unknown[])[2]).toEqual({ flag: 'wx' });

    const data = prisma.photo.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({ file: name, alt: 'Treino', createdById: 5, width: 40, height: 20 });
    expect(dto).toEqual({ id: 1, alt: 'Treino', url: '/api/photos/1/file', width: 40, height: 20, createdAt: '2026-11-09T12:00:00.000Z' });
  });

  it('reduz fotos grandes para no máximo 1920px no lado maior', async () => {
    prisma.photo.create.mockResolvedValue(row as never);
    await svc.create(5, asFile(await png(4000, 3000)), null);
    expect(prisma.photo.create.mock.calls[0]![0].data).toMatchObject({ width: 1920, height: 1440 });
  });

  it.each([
    ['HTML disfarçado de .jpg', '<html><script>alert(1)</script></html>', 'x.jpg'],
    ['script PHP', '<?php echo 1; ?>', 'shell.php.png'],
    ['SVG', '<svg xmlns="http://www.w3.org/2000/svg"/>', 'a.svg'],
  ])('recusa arquivo que não é imagem: %s (415) e não grava nada', async (_n, content, name) => {
    await expect(svc.create(5, asFile(content, name), null)).rejects.toMatchObject({ statusCode: 415, code: 'UNSUPPORTED_IMAGE' });
    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(prisma.photo.create).not.toHaveBeenCalled();
  });

  it('recusa imagem corrompida (cabeçalho de PNG, conteúdo lixo)', async () => {
    const bad = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('lixo lixo lixo')]);
    await expect(svc.create(5, asFile(bad), null)).rejects.toMatchObject({ statusCode: 415 });
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('recusa arquivo vazio e acima de 10 MB', async () => {
    await expect(svc.create(5, asFile(''), null)).rejects.toMatchObject({ code: 'EMPTY_FILE' });
    const big = asFile(new Uint8Array(10 * 1024 * 1024 + 1));
    await expect(svc.create(5, big, null)).rejects.toMatchObject({ statusCode: 413 });
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('se o banco falhar, apaga o arquivo recém-gravado (sem órfão)', async () => {
    prisma.photo.create.mockRejectedValue(new Error('db caiu'));
    await expect(svc.create(5, asFile(await png()), null)).rejects.toThrow('db caiu');
    const written = (fs.writeFile.mock.calls[0] as [string])[0];
    expect(fs.unlink).toHaveBeenCalledWith(written);
  });
});

describe('read', () => {
  it('devolve o arquivo do nome guardado no banco', async () => {
    const file = '3f2b8c1e-9a4d-4b7e-8c3a-1d2e3f4a5b6c.webp';
    prisma.photo.findUnique.mockResolvedValue({ file } as never);
    fs.readFile.mockResolvedValue(Buffer.from('img'));
    expect((await svc.read(1)).toString()).toBe('img');
    expect(fs.readFile).toHaveBeenCalledWith(`/data/uploads/${file}`);
  });

  it('id inexistente: 404', async () => {
    prisma.photo.findUnique.mockResolvedValue(null);
    await expect(svc.read(99)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('nome fora do padrão no banco nunca vira caminho de disco (path traversal)', async () => {
    prisma.photo.findUnique.mockResolvedValue({ file: '../../etc/passwd' } as never);
    await expect(svc.read(1)).rejects.toMatchObject({ statusCode: 404 });
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('arquivo sumiu do disco: 404 (não 500)', async () => {
    prisma.photo.findUnique.mockResolvedValue({ file: '3f2b8c1e-9a4d-4b7e-8c3a-1d2e3f4a5b6c.webp' } as never);
    fs.readFile.mockRejectedValue(Object.assign(new Error('x'), { code: 'ENOENT' }));
    await expect(svc.read(1)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('update / remove / list', () => {
  it('update limpa a descrição', async () => {
    prisma.photo.update.mockResolvedValue(row as never);
    await svc.update(1, { alt: '  a \n b ' });
    expect(prisma.photo.update.mock.calls[0]![0].data).toEqual({ alt: 'a b' });
  });

  it('remove apaga a linha e o arquivo', async () => {
    const file = '3f2b8c1e-9a4d-4b7e-8c3a-1d2e3f4a5b6c.webp';
    prisma.photo.delete.mockResolvedValue({ file } as never);
    await svc.remove(1);
    expect(fs.unlink).toHaveBeenCalledWith(`/data/uploads/${file}`);
  });

  it('remove não apaga arquivo se o nome no banco estiver fora do padrão', async () => {
    prisma.photo.delete.mockResolvedValue({ file: '../../etc/passwd' } as never);
    await svc.remove(1);
    expect(fs.unlink).not.toHaveBeenCalled();
  });

  it('list devolve DTO sem o nome do arquivo no disco', async () => {
    prisma.photo.findMany.mockResolvedValue([row] as never);
    const [dto] = await svc.list();
    expect(dto).not.toHaveProperty('file');
    expect(dto!.url).toBe('/api/photos/1/file');
  });
});
