import { route } from '@/server/lib/route';
import { CreateUserInput, ListUsersQuery } from '@/server/modules/users/users.schemas';
import * as service from '@/server/modules/users/users.service';

export const GET = route({ roles: ['ADMIN'], query: ListUsersQuery }, ({ query }) => service.list(query));
export const POST = route({ roles: ['ADMIN'], body: CreateUserInput, status: 201 }, ({ body }) => service.create(body));
