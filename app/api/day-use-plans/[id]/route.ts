import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { UpdatePlanInput } from '@/server/modules/dayuse/dayuse.schemas';
import * as service from '@/server/modules/dayuse/dayuse.service';

export const PATCH = route({ permissions: ['PLANOS_DAY_USE'], params: IdParam, body: UpdatePlanInput }, ({ params, body }) =>
  service.update(params.id, body),
);
