import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { UpdateProductInput } from '@/server/modules/products/products.schemas';
import * as service from '@/server/modules/products/products.service';

export const GET = route({ permissions: ['BAR', 'COMANDAS', 'ESTOQUE'], params: IdParam }, ({ params }) => service.get(params.id));
export const PATCH = route({ permissions: ['BAR'], params: IdParam, body: UpdateProductInput }, ({ params, body }) =>
  service.update(params.id, body),
);
