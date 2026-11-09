import type { ReactNode } from 'react';

// Só o conteúdo anima; o menu lateral (Shell, no layout) permanece parado.
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
