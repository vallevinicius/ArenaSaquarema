import { route } from '@/server/lib/route';
import { CreateProductInput, ListProductsQuery } from '@/server/modules/products/products.schemas';
import * as service from '@/server/modules/products/products.service';

export const GET = route({ query: ListProductsQuery }, ({ query }) => service.list(query));
export const POST = route({ roles: ['ADMIN'], body: CreateProductInput, status: 201 }, ({ body, user }) =>
  service.create(body, user.id),
);
