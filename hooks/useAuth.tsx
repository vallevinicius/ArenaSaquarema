'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ApiError, api, setUnauthorizedHandler } from '@/lib/api-client';
import { canAccessPath } from '@/lib/permissions';
import type { Me, PasswordResetRequired } from '@/lib/types';
import { Spinner } from '@/components/ui';

type AuthCtx = {
  user: Me | null;
  loading: boolean;
  /** Devolve o usuário, ou `passwordResetRequired` quando o aluno ainda usa a senha provisória. */
  login: (identifier: string, password: string) => Promise<Me | PasswordResetRequired>;
  confirmPasswordReset: (identifier: string, code: string, newPassword: string) => Promise<Me>;
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
    // Sessão dura 8h (JWT_EXPIRES_IN): revalida a cada minuto para pedir login mesmo com a aba parada.
    refetchInterval: 60_000,
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
      const res = await api.post<Me | PasswordResetRequired>('/auth/login', { identifier, password });
      if ('passwordResetRequired' in res) return res; // sem cookie: falta o código do e-mail
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
      qc.setQueryData(ME_KEY, res);
      return res;
    },
    confirmPasswordReset: async (identifier, code, newPassword) => {
      const user = await api.post<Me>('/auth/password-reset', { identifier, code, newPassword });
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

/** Para onde cada perfil vai depois de entrar. */
export const homeFor = (role: Me['role']) => (role === 'ALUNO' ? '/aluno' : '/painel');

/**
 * Guard das páginas. O proxy.ts já barra quem não tem cookie válido; aqui cobrimos
 * sessão revogada e páginas só de ADMIN. A autorização real é sempre na API.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isStudent = user?.role === 'ALUNO';
  // Cada área exige uma permissão do perfil (ver AREAS em lib/permissions). A API confere de novo.
  const forbidden = !!user && !isStudent && !canAccessPath(user, pathname);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    else if (isStudent) router.replace('/aluno'); // aluno nunca vê as telas da equipe
    else if (forbidden) router.replace('/painel'); // o painel escolhe a primeira área liberada
  }, [loading, user, isStudent, forbidden, pathname, router]);

  if (loading || !user || isStudent || forbidden) return <Spinner />;
  return <>{children}</>;
}

/** Guard da área do aluno: só ALUNO; a equipe volta ao painel. */
export function RequireStudent({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login?from=/aluno');
    else if (user.role !== 'ALUNO') router.replace('/painel');
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'ALUNO') return <Spinner />;
  return <>{children}</>;
}
