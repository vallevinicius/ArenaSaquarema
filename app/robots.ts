import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/contato';

export const dynamic = 'force-dynamic'; // SITE_URL é lido em runtime, não no build

// Só o site público é indexado: painel, área do aluno, login, API e docs ficam de fora.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/', '/docs', '/login', '/aluno', '/painel', '/dashboard', '/comandas', '/clientes', '/produtos',
        '/estoque', '/day-use', '/alunos', '/presencas', '/fotos', '/perfis', '/usuarios',
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
