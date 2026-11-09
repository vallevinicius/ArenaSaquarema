import type { ReactNode } from 'react';

// Template remonta a cada navegação: dispara a animação de entrada da página.
export default function SiteTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
