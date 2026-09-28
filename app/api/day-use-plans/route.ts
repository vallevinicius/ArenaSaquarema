import { route } from '@/server/lib/route';
import { CreatePlanInput, ListPlansQuery } from '@/server/modules/dayuse/dayuse.schemas';
import * as service from '@/server/modules/dayuse/dayuse.service';

export const GET = route({ query: ListPlansQuery }, ({ query }) => service.list(query.active));
export const POST = route({ roles: ['ADMIN'], body: CreatePlanInput, status: 201 }, ({ body }) => service.create(body));
