'use client';

import type { ReactNode } from 'react';
import { RequireStudent } from '@/hooks/useAuth';
import { body, display } from '@/lib/site-fonts';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${body.className} ${display.variable} min-h-dvh bg-areia-100 text-mar-950`}>
      <RequireStudent>{children}</RequireStudent>
    </div>
  );
}
