import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import * as service from '@/server/modules/photos/photos.service';

// Pública: a galeria aparece no site sem login. O conteúdo de um id nunca muda (a foto é
// apagada, não editada), então o cache do navegador pode ser longo.
export const GET = route({ auth: false, params: IdParam }, async ({ params }) => {
  const data = await service.read(params.id);
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(data.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
});
