'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { firstAllowedPath } from '@/lib/permissions';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

/** Porta de entrada da equipe: vai para a primeira área que o perfil libera. */
export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const dest = user ? firstAllowedPath(user) : null;

  useEffect(() => {
    if (dest) router.replace(dest);
  }, [dest, router]);

  if (user && !dest) {
    return (
      <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
        <h1 className="text-xl font-extrabold text-mar-900">Seu perfil ainda não tem acesso a nenhuma área</h1>
        <p className="mt-2 text-sm text-slate-600">Peça ao administrador para liberar as áreas que você usa. Assim que ele salvar, elas aparecem aqui.</p>
      </div>
    );
  }
  return <Spinner />;
}
