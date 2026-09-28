import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { UpdateUserInput } from '@/server/modules/users/users.schemas';
import * as service from '@/server/modules/users/users.service';

export const PATCH = route({ roles: ['ADMIN'], params: IdParam, body: UpdateUserInput }, ({ params, body, user }) =>
  service.update(user.id, params.id, body),
);
