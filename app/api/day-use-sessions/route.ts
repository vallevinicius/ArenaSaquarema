import { route } from '@/server/lib/route';
import { ListSessionsQuery } from '@/server/modules/dayuse-sessions/dayuse-sessions.schemas';
import * as service from '@/server/modules/dayuse-sessions/dayuse-sessions.service';

export const GET = route({ query: ListSessionsQuery }, ({ query }) => service.list(query));
export const POST = route({ status: 201 }, ({ user }) => service.open(user.id));
