import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { UpdatePhotoInput } from '@/server/modules/photos/photos.schemas';
import * as service from '@/server/modules/photos/photos.service';

export const PATCH = route({ roles: ['ADMIN'], params: IdParam, body: UpdatePhotoInput }, ({ params, body }) =>
  service.update(params.id, body),
);
export const DELETE = route({ roles: ['ADMIN'], params: IdParam }, ({ params }) => service.remove(params.id));
