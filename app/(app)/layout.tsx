'use client';

import type { ReactNode } from 'react';
import { Shell } from '@/components/Shell';
import { RequireAuth } from '@/hooks/useAuth';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}
