import { IdParam, body, json, registry, secured, withErrors, z } from '../../docs/registry';
import { PhotoDTO, UpdatePhotoInput, UploadPhotoForm } from './photos.schemas';

const tags = ['Fotos'];
registry.registerPath({
  method: 'get',
  path: '/api/photos',
  tags,
  summary: 'Listar fotos da galeria (ADMIN)',
  security: secured,
  responses: { 200: json(z.array(PhotoDTO)), ...withErrors() },
});
registry.registerPath({
  method: 'post',
  path: '/api/photos',
  tags,
  summary: 'Enviar foto (ADMIN). multipart/form-data; reencodada em WebP, sem metadados.',
  security: secured,
  request: { body: { required: true, content: { 'multipart/form-data': { schema: UploadPhotoForm } } } },
  responses: { 201: json(PhotoDTO, 'Criada'), ...withErrors({ 413: 'Foto maior que 10 MB', 415: 'Formato não suportado' }) },
});
registry.registerPath({
  method: 'patch',
  path: '/api/photos/{id}',
  tags,
  summary: 'Editar a descrição da foto (ADMIN)',
  security: secured,
  request: { params: IdParam, ...body(UpdatePhotoInput) },
  responses: { 200: json(PhotoDTO), ...withErrors({ 404: 'Não encontrada' }) },
});
registry.registerPath({
  method: 'delete',
  path: '/api/photos/{id}',
  tags,
  summary: 'Excluir foto e arquivo (ADMIN)',
  security: secured,
  request: { params: IdParam },
  responses: { 204: { description: 'Excluída' }, ...withErrors({ 404: 'Não encontrada' }) },
});
registry.registerPath({
  method: 'get',
  path: '/api/photos/{id}/file',
  tags,
  summary: 'Imagem da foto (pública, usada pelo site)',
  request: { params: IdParam },
  responses: { 200: { description: 'image/webp', content: { 'image/webp': { schema: z.string().openapi({ format: 'binary' }) } } }, 404: { description: 'Não encontrada' } },
});
