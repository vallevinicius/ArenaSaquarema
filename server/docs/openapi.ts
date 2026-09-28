import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';

// Cada módulo registra seus paths no registry ao ser importado.
import '../modules/auth/auth.openapi';
import '../modules/tabs/tabs.openapi';
import '../modules/products/products.openapi';
import '../modules/stock/stock.openapi';
import '../modules/dayuse/dayuse.openapi';
import '../modules/customers/customers.openapi';
import '../modules/dashboard/dashboard.openapi';
import '../modules/users/users.openapi';

let cached: ReturnType<OpenApiGeneratorV31['generateDocument']> | null = null;

export function buildOpenApiDocument() {
  return (cached ??= new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Arena Saquarema API',
      version: '1.0.0',
      description:
        'Controle de bar, estoque, comandas e day use da Arena Saquarema (futevôlei).\n\n' +
        '**Autenticação:** faça `POST /api/auth/login`; o JWT volta em cookie httpOnly e é enviado automaticamente nas próximas chamadas deste Swagger.\n\n' +
        '**Dinheiro:** respostas trazem valores como string decimal (`"12.50"`).',
    },
    servers: [{ url: '/' }],
    tags: [
      { name: 'Auth' },
      { name: 'Comandas' },
      { name: 'Produtos (Bar)' },
      { name: 'Estoque' },
      { name: 'Day Use' },
      { name: 'Clientes' },
      { name: 'Dashboard' },
      { name: 'Usuários' },
    ],
  }));
}
