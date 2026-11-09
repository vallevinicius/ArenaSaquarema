import { Big_Shoulders, Figtree } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from '@/components/site';

// Fontes só do site público (self-hosted pelo next/font). Display condensada = placar/camisa de quadra.
const display = Big_Shoulders({ subsets: ['latin'], variable: '--font-display' });
const body = Figtree({ subsets: ['latin'], display: 'swap' });

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
