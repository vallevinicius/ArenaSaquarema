import type { ReactNode } from 'react';
import { body, display } from '@/lib/site-fonts';
import { SiteFooter, SiteHeader } from '@/components/site';

// Cabeçalho e rodapé ficam aqui (persistem na navegação); só o conteúdo da página anima (template.tsx).
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${body.className} ${display.variable} relative bg-areia-50 text-mar-950`}>
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
