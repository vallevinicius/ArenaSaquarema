import { registry, z } from '../../docs/registry';

export const PhotoDTO = registry.register(
  'Photo',
  z.object({
    id: z.number(),
    alt: z.string().openapi({ description: 'Descrição da foto (acessibilidade)' }),
    url: z.string().openapi({ example: '/api/photos/1/file' }),
    width: z.number(),
    height: z.number(),
    createdAt: z.string(),
  }),
);

export const UploadPhotoForm = registry.register(
  'UploadPhotoForm',
  z.object({
    file: z.string().openapi({ type: 'string', format: 'binary', description: 'JPEG, PNG ou WebP de até 10 MB' }),
    alt: z.string().max(160).optional().openapi({ description: 'Descrição da foto' }),
  }),
);

export const UpdatePhotoInput = registry.register('UpdatePhotoInput', z.object({ alt: z.string().trim().max(160) }));
export type UpdatePhoto = z.output<typeof UpdatePhotoInput>;
