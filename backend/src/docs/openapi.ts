import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry.js';

// Importa as rotas para que cada módulo registre seus paths no registry.
import '../routes.js';

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
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
  });
}
