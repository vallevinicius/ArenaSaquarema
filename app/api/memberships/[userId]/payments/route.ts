import { PaginationQuery } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { RegisterPaymentInput, UserIdParam } from '@/server/modules/memberships/memberships.schemas';
import * as service from '@/server/modules/memberships/memberships.service';

export const GET = route({ permissions: ['MENSALIDADES'], params: UserIdParam, query: PaginationQuery }, ({ params, query }) =>
  service.listPayments(params.userId, query.page, query.pageSize),
);
export const POST = route({ permissions: ['MENSALIDADES'], params: UserIdParam, body: RegisterPaymentInput, status: 201 }, ({ params, body, user }) =>
  service.registerPayment(params.userId, user.id, body),
);
