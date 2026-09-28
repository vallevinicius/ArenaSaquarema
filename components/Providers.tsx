'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/api-client';
import { ToastProvider } from './Toast';
import { AuthProvider } from '@/hooks/useAuth';

export function Providers({ children }: { children: ReactNode }) {
  // useState: um QueryClient por aba, criado no cliente (nunca compartilhado entre usuários no SSR).
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            // Não insiste em erro de cliente (4xx); só em rede/5xx.
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
