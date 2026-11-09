import { route } from '@/server/lib/route';
import { SetPlanInput, UserIdParam } from '@/server/modules/memberships/memberships.schemas';
import * as service from '@/server/modules/memberships/memberships.service';

export const PUT = route({ permissions: ['MENSALIDADES'], params: UserIdParam, body: SetPlanInput }, ({ params, body }) =>
  service.setStudentPlan(params.userId, body.planId),
);
