import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { UpdateCustomerInput } from '@/server/modules/customers/customers.schemas';
import * as service from '@/server/modules/customers/customers.service';

export const GET = route({ params: IdParam }, ({ params }) => service.get(params.id));
export const PATCH = route({ params: IdParam, body: UpdateCustomerInput }, ({ params, body }) =>
  service.update(params.id, body),
);
