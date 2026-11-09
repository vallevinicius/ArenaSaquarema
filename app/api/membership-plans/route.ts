import { route } from '@/server/lib/route';
import { CreateMembershipPlanInput } from '@/server/modules/memberships/memberships.schemas';
import * as service from '@/server/modules/memberships/memberships.service';

export const GET = route({ permissions: ['MENSALIDADES'] }, () => service.listPlans());
export const POST = route({ permissions: ['MENSALIDADES'], body: CreateMembershipPlanInput, status: 201 }, ({ body }) => service.createPlan(body));
