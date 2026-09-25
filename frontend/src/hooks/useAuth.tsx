import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ApiError, api, setUnauthorizedHandler } from '../api/client';
import type { Me, Role } from '../api/types';
import { Spinner } from '../components/ui';

type AuthCtx = {
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Me>;
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
    login: async (email, password) => {
      const user = await api.post<Me>('/auth/login', { email, password });
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

/** Guard de rota. A autorização real é no backend; isto só evita mostrar telas inúteis. */
export function RequireAuth({ children, role }: { children: ReactNode; role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/comandas" replace />;
  return <>{children}</>;
}
