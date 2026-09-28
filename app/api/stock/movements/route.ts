import { route } from '@/server/lib/route';
import { CreateMovementInput, ListMovementsQuery } from '@/server/modules/stock/stock.schemas';
import * as service from '@/server/modules/stock/stock.service';

export const GET = route({ roles: ['ADMIN'], query: ListMovementsQuery }, ({ query }) => service.list(query));
export const POST = route({ roles: ['ADMIN'], body: CreateMovementInput, status: 201 }, ({ body, user }) =>
  service.createManual(body, user.id),
);
