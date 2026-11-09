import { route } from '@/server/lib/route';
import { ListSessionsQuery } from '@/server/modules/dayuse-sessions/dayuse-sessions.schemas';
import * as service from '@/server/modules/dayuse-sessions/dayuse-sessions.service';

export const GET = route({ permissions: ['DAY_USE'], query: ListSessionsQuery }, ({ query }) => service.list(query));
export const POST = route({ permissions: ['DAY_USE'], status: 201 }, ({ user }) => service.open(user.id));
