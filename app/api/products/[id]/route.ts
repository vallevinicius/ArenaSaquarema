import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { UpdateProductInput } from '@/server/modules/products/products.schemas';
import * as service from '@/server/modules/products/products.service';

export const GET = route({ params: IdParam }, ({ params }) => service.get(params.id));
export const PATCH = route({ roles: ['ADMIN'], params: IdParam, body: UpdateProductInput }, ({ params, body }) =>
  service.update(params.id, body),
);
