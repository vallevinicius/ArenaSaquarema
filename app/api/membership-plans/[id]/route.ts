import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { UpdateMembershipPlanInput } from '@/server/modules/memberships/memberships.schemas';
import * as service from '@/server/modules/memberships/memberships.service';

export const PATCH = route({ permissions: ['MENSALIDADES'], params: IdParam, body: UpdateMembershipPlanInput }, ({ params, body }) =>
  service.updatePlan(params.id, body),
);
