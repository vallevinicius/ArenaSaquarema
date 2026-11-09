import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { VoidPaymentInput } from '@/server/modules/memberships/memberships.schemas';
import * as service from '@/server/modules/memberships/memberships.service';

export const POST = route({ permissions: ['MENSALIDADES'], params: IdParam, body: VoidPaymentInput }, ({ params, body, user }) =>
  service.voidPayment(params.id, user.id, body.reason),
);
