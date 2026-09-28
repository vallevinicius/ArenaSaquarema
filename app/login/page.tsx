'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Logo } from '@/components/Shell';
import { Field, FormError } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

// useSearchParams exige Suspense para o Next pré-renderizar a página.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

/** Só aceita caminho interno (evita open redirect via ?from=https://site-malicioso). */
function safeFrom(v: string | null) {
  return v && v.startsWith('/') && !v.startsWith('//') && v !== '/login' ? v : '/';
}

function LoginForm() {
  const { user, login } = useAuth();
  const router = useRouter();
  const from = safeFrom(useSearchParams().get('from'));
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (user) router.replace(from);
  }, [user, from, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await login(String(form.get('identifier')), String(form.get('password')));
      router.replace(from);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-mar-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Sol e ondas decorativos */}
        <div
          className="animate-bloom absolute -top-24 -right-24 size-80 rounded-full bg-sol-400/90"
          style={{ '--delay': '0ms' } as CSSProperties}
          aria-hidden="true"
        />
        <svg
          className="animate-rise absolute bottom-0 left-0 w-full text-white"
          style={{ '--delay': '450ms' } as CSSProperties}
          viewBox="0 0 800 160"
          aria-hidden="true"
        >
          <path d="M0 80c100-40 200-40 300 0s200 40 300 0 150-30 200-10v90H0z" fill="currentColor" opacity=".12" />
          <path d="M0 110c100-40 200-40 300 0s200 40 300 0 150-30 200-10v60H0z" fill="currentColor" opacity=".2" />
        </svg>

        <div className="animate-rise" style={{ '--delay': '80ms' } as CSSProperties}>
          <Logo />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="animate-rise text-4xl leading-tight font-black text-white" style={{ '--delay': '200ms' } as CSSProperties}>
            Bar, comandas e <span className="text-sol-400">day use</span> na palma da mão.
          </h1>
          <p className="animate-rise mt-4 text-mar-200" style={{ '--delay': '320ms' } as CSSProperties}>
            Controle de vendas e estoque da arena de futevôlei.
          </p>
        </div>
        <p className="animate-rise text-xs text-mar-300" style={{ '--delay': '420ms' } as CSSProperties}>
          Arena Saquarema · RJ
        </p>
      </section>

      <section className="flex items-center justify-center bg-white p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden">
            <div className="animate-bloom inline-block rounded-xl bg-mar-800 p-3" style={{ '--delay': '0ms' } as CSSProperties}>
              <Logo />
            </div>
          </div>
          <div className="animate-rise" style={{ '--delay': '120ms' } as CSSProperties}>
            <h2 className="text-2xl font-extrabold text-mar-900">Entrar</h2>
            <p className="text-sm text-slate-500">Acesso restrito à equipe da arena.</p>
          </div>
          <div className="animate-rise" style={{ '--delay': '220ms' } as CSSProperties}>
            <Field label="E-mail ou usuário" name="identifier" type="text" autoComplete="username" required autoFocus />
          </div>
          <div className="animate-rise" style={{ '--delay': '300ms' } as CSSProperties}>
            <Field label="Senha" name="password" type="password" autoComplete="current-password" required />
          </div>
          <FormError error={error} />
          <button className="animate-rise btn-primary w-full py-3" style={{ '--delay': '380ms' } as CSSProperties} disabled={pending}>
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
          <div
            className="animate-rise h-1 rounded-full bg-gradient-to-r from-mar-800 via-sol-400 to-mar-800"
            style={{ '--delay': '460ms' } as CSSProperties}
          />
        </form>
      </section>
    </div>
  );
}
