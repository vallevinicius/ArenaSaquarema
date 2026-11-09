import { route } from '@/server/lib/route';
import { CreateCustomerInput, ListCustomersQuery } from '@/server/modules/customers/customers.schemas';
import * as service from '@/server/modules/customers/customers.service';

// ADMIN e OPERADOR: operador cadastra cliente no balcão.
export const GET = route({ permissions: ['CLIENTES', 'COMANDAS'], query: ListCustomersQuery }, ({ query }) => service.list(query));
export const POST = route({ permissions: ['CLIENTES', 'COMANDAS'], body: CreateCustomerInput, status: 201 }, ({ body }) => service.create(body));
