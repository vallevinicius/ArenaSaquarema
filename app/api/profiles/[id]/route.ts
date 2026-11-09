import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { UpdateProfileInput } from '@/server/modules/profiles/profiles.schemas';
import * as service from '@/server/modules/profiles/profiles.service';

export const PATCH = route({ roles: ['ADMIN'], params: IdParam, body: UpdateProfileInput }, ({ params, body }) =>
  service.update(params.id, body),
);
export const DELETE = route({ roles: ['ADMIN'], params: IdParam }, ({ params }) => service.remove(params.id));
