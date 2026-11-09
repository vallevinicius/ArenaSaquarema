import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { UpdatePhotoInput } from '@/server/modules/photos/photos.schemas';
import * as service from '@/server/modules/photos/photos.service';

export const PATCH = route({ permissions: ['FOTOS'], params: IdParam, body: UpdatePhotoInput }, ({ params, body }) =>
  service.update(params.id, body),
);
export const DELETE = route({ permissions: ['FOTOS'], params: IdParam }, ({ params }) => service.remove(params.id));
