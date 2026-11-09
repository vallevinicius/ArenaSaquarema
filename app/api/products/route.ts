import { route } from '@/server/lib/route';
import { CreateProductInput, ListProductsQuery } from '@/server/modules/products/products.schemas';
import * as service from '@/server/modules/products/products.service';

export const GET = route({ permissions: ['BAR', 'COMANDAS', 'ESTOQUE'], query: ListProductsQuery }, ({ query }) => service.list(query));
export const POST = route({ permissions: ['BAR'], body: CreateProductInput, status: 201 }, ({ body, user }) =>
  service.create(body, user.id),
);
