import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from '@/components/site';

// Cabeçalho e rodapé ficam aqui (persistem na navegação); só o conteúdo da página anima (template.tsx).
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative bg-white text-slate-700">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
