// Gera openapi.json estático (útil para CI, geração de client, revisão em PR).
import { writeFileSync } from 'node:fs';
import { buildOpenApiDocument } from './openapi';

writeFileSync('openapi.json', JSON.stringify(buildOpenApiDocument(), null, 2));
console.log('openapi.json gerado');
