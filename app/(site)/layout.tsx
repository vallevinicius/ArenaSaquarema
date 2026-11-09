import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_NAME, siteUrl } from '@/lib/contato';
import { body, display } from '@/lib/site-fonts';
import { SiteFooter, SiteHeader, WhatsAppButton } from '@/components/site';

// O site público lê SITE_URL e os contatos do .env em runtime (o build roda sem .env), então não é pré-renderizado.
export const dynamic = 'force-dynamic';

const DESCRICAO = 'Aulas de futevôlei em Saquarema, RJ, em turmas por nível, das 18h às 22h. Veja horários, planos e fale com a arena.';

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${SITE_NAME}: futevôlei em Saquarema, RJ`, template: `%s · ${SITE_NAME}` },
    description: DESCRICAO,
    keywords: ['futevôlei', 'Saquarema', 'aulas de futevôlei', 'arena de futevôlei', 'esporte de praia'],
    openGraph: { type: 'website', locale: 'pt_BR', siteName: SITE_NAME, title: `${SITE_NAME}: futevôlei em Saquarema, RJ`, description: DESCRICAO },
    twitter: { card: 'summary_large_image' },
  };
}

// Cabeçalho e rodapé ficam aqui (persistem na navegação); só o conteúdo da página anima (template.tsx).
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${body.className} ${display.variable} relative bg-areia-50 text-mar-950`}>
      <SiteHeader />
      {children}
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}
