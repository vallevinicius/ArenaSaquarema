import { AppError, BadRequest } from '@/server/lib/errors';
import { route } from '@/server/lib/route';
import { MAX_UPLOAD_BYTES } from '@/server/modules/photos/photos.utils';
import * as service from '@/server/modules/photos/photos.service';

export const GET = route({ roles: ['ADMIN'] }, () => service.list());

// multipart/form-data: o route() só lê JSON quando há `body`, então aqui lemos o formulário direto.
export const POST = route({ roles: ['ADMIN'], status: 201 }, async ({ req, user }) => {
  // Recusa antes de ler o corpo inteiro (o limite por foto é conferido de novo no service).
  if (Number(req.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'A foto passa de 10 MB');
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw BadRequest('Envie o arquivo no campo "file"', 'FILE_REQUIRED');
  const alt = form?.get('alt');
  return service.create(user.id, file, typeof alt === 'string' ? alt : null);
});
