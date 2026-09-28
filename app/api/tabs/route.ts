import { route } from '@/server/lib/route';
import { ListTabsQuery, OpenTabInput } from '@/server/modules/tabs/tabs.schemas';
import * as service from '@/server/modules/tabs/tabs.service';

export const GET = route({ query: ListTabsQuery }, ({ query }) => service.list(query));
export const POST = route({ body: OpenTabInput, status: 201 }, ({ body, user }) => service.open(body, user.id));
