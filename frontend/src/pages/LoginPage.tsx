import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Layout';
import { Field, FormError } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await login(String(form.get('email')), String(form.get('password')));
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-mar-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo />
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl leading-tight font-black text-white">
            Bar, comandas e <span className="text-sol-400">day use</span> na palma da mão.
          </h1>
          <p className="mt-4 text-mar-200">Controle de vendas e estoque da arena de futevôlei.</p>
        </div>
        <p className="text-xs text-mar-300">Arena Saquarema · RJ</p>
        {/* Sol e ondas decorativos */}
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-sol-400/90" aria-hidden="true" />
        <svg className="absolute bottom-0 left-0 w-full text-white" viewBox="0 0 800 160" aria-hidden="true">
          <path d="M0 80c100-40 200-40 300 0s200 40 300 0 150-30 200-10v90H0z" fill="currentColor" opacity=".12" />
          <path d="M0 110c100-40 200-40 300 0s200 40 300 0 150-30 200-10v60H0z" fill="currentColor" opacity=".2" />
        </svg>
      </section>

      <section className="flex items-center justify-center bg-white p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden">
            <div className="inline-block rounded-xl bg-mar-800 p-3">
              <Logo />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-mar-900">Entrar</h2>
            <p className="text-sm text-slate-500">Acesso restrito à equipe da arena.</p>
          </div>
          <Field label="E-mail" name="email" type="email" autoComplete="username" required autoFocus />
          <Field label="Senha" name="password" type="password" autoComplete="current-password" required />
          <FormError error={error} />
          <button className="btn-primary w-full py-3" disabled={pending}>
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
          <div className="h-1 rounded-full bg-gradient-to-r from-mar-800 via-sol-400 to-mar-800" />
        </form>
      </section>
    </div>
  );
}
