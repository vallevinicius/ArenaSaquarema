'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ApiError, api, setUnauthorizedHandler } from '@/lib/api-client';
import type { Me } from '@/lib/types';
import { Spinner } from '@/components/ui';

type AuthCtx = {
  user: Me | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<Me>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
const ME_KEY = ['auth', 'me'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await api.get<Me>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Remove dados do usuário anterior sem destruir a query de sessão (que está sendo observada).
  const resetSession = () => {
    qc.setQueryData(ME_KEY, null);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
  };

  useEffect(() => {
    // Sessão expirou/revogada em qualquer chamada: limpa o cache e volta ao login.
    setUnauthorizedHandler(() => resetSession());
  }, [qc]);

  const value: AuthCtx = {
    user: me.data ?? null,
    loading: me.isPending,
    login: async (identifier, password) => {
      const user = await api.post<Me>('/auth/login', { identifier, password });
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
      qc.setQueryData(ME_KEY, user);
      return user;
    },
    logout: async () => {
      await api.post('/auth/logout').catch(() => undefined);
      resetSession();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}

const ADMIN_ONLY = ['/dashboard', '/estoque', '/usuarios'];

/**
 * Guard das páginas. O proxy.ts já barra quem não tem cookie válido; aqui cobrimos
 * sessão revogada e páginas só de ADMIN. A autorização real é sempre na API.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const forbidden = !!user && user.role !== 'ADMIN' && ADMIN_ONLY.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    else if (forbidden) router.replace('/comandas');
  }, [loading, user, forbidden, pathname, router]);

  if (loading || !user || forbidden) return <Spinner />;
  return <>{children}</>;
}
