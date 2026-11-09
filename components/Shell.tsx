'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { canAccessPath } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';
import { IconBeer, IconSun } from '@/components/icons';
import { Logo } from '@/components/Logo';

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// A visibilidade de cada item vem de AREAS (lib/permissions): perfil sem a permissão não vê o link.
type Item = { to: string; label: string; icon: ReactNode };
type Section = { title: string; items: Item[] };
const SECTIONS: Section[] = [
  { title: 'Operação', items: [
    { to: '/dashboard', label: 'Dashboard', icon: icon('M4 20V10M10 20V4M16 20v-7M22 20H2') },
    { to: '/comandas', label: 'Comandas', icon: icon('M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6') },
    { to: '/clientes', label: 'Clientes', icon: icon('M16 19v-1a4 4 0 00-8 0v1M12 11a3 3 0 100-6 3 3 0 000 6z') },
    { to: '/day-use', label: 'Day Use', icon: <IconSun /> },
  ] },
  { title: 'Bar e estoque', items: [
    { to: '/produtos', label: 'Bar / Produtos', icon: <IconBeer /> },
    { to: '/estoque', label: 'Estoque', icon: icon('M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10') },
  ] },
  { title: 'Alunos', items: [
    { to: '/alunos', label: 'Alunos', icon: icon('M17 20v-1a4 4 0 00-3-3.9M9 11a4 4 0 100-8 4 4 0 000 8zM3 20v-1a4 4 0 014-4h4a4 4 0 014 4v1M16 3.1a4 4 0 010 7.8') },
    { to: '/presencas', label: 'Presenças', icon: icon('M5 13l4 4L19 7') },
  ] },
  { title: 'Site', items: [
    { to: '/fotos', label: 'Fotos do site', icon: icon('M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M9 9h.01') },
  ] },
  { title: 'Administração', items: [
    { to: '/perfis', label: 'Perfis de acesso', icon: icon('M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6zM9 12l2 2 4-4') },
    { to: '/usuarios', label: 'Usuários', icon: icon('M12 15a7 7 0 00-7 6h14a7 7 0 00-7-6zM12 12a4 4 0 100-8 4 4 0 000 8z') },
  ] },
];

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // No celular a tabela vira uma lista de cartões (CSS em globals.css): cada célula ganha o nome da coluna.
  useEffect(() => {
    const label = () => {
      document.querySelectorAll<HTMLTableElement>('table.table').forEach((t) => {
        const heads = Array.from(t.querySelectorAll('thead th'), (th) => th.textContent?.trim() ?? '');
        t.querySelectorAll('tbody tr').forEach((tr) =>
          Array.from(tr.children).forEach((td, i) => {
            if (td instanceof HTMLElement && td.dataset.label !== (heads[i] ?? '')) td.dataset.label = heads[i] ?? '';
          }),
        );
      });
    };
    label();
    const obs = new MutationObserver(label);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  const sections = SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((i) => !!user && canAccessPath(user, i.to)),
  })).filter((sec) => sec.items.length > 0);

  const sidebar = (
    <nav className="flex h-full flex-col gap-3 text-mar-50">
      <div className="glass-panel relative overflow-hidden rounded-3xl px-5 py-4">
        <Logo />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-0.5 [scrollbar-width:none]">
        {sections.map((sec) => (
          <section key={sec.title} className="glass-panel rounded-3xl p-2">
            <h2 className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-mar-200/80 uppercase">{sec.title}</h2>
            <ul className="space-y-0.5">
              {sec.items.map((i) => {
                const active = pathname.startsWith(i.to);
                return (
                  <li key={i.to}>
                    <Link
                      href={i.to}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                        active
                          ? 'bg-white/25 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.45),0_6px_16px_-6px_rgba(6,26,61,.6)] ring-1 ring-white/30'
                          : 'text-mar-100 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {active && (
                        <span className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sol-400 shadow-[0_0_10px_rgba(250,204,21,.8)]" aria-hidden="true" />
                      )}
                      {i.icon}
                      {i.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="glass-panel rounded-3xl p-4">
        <Link
          href="/"
          className="mb-4 flex items-center gap-2 rounded-2xl bg-sol-400 px-3 py-2.5 text-sm font-extrabold text-mar-950 transition hover:bg-sol-300"
        >
          {icon('M15 19l-7-7 7-7')}
          Voltar ao site
        </Link>
        <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
        <p className="mb-3 text-xs text-sol-300">{user?.role === 'ADMIN' ? 'Administrador' : 'Equipe'}</p>
        <button
          className="btn w-full rounded-2xl border border-white/25 bg-white/10 text-mar-50 hover:bg-white/20"
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
        >
          Sair
        </button>
      </div>
    </nav>
  );

  return (
    <div className="app-backdrop min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="glass-backdrop sticky top-0 hidden h-dvh p-3 lg:block">{sidebar}</aside>

      {/* Mobile */}
      <header className="glass-backdrop sticky top-0 z-30 flex items-center justify-between border-b border-white/20 px-4 py-3 text-white lg:hidden">
        <Logo size={36} />
        <button className="rounded-md p-2 text-white hover:bg-white/15" onClick={() => setOpen(true)} aria-label="Abrir menu">
          {icon('M4 6h16M4 12h16M4 18h16')}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-mar-950/60" onClick={() => setOpen(false)} />
          <aside className="glass-backdrop relative h-full w-72 p-3">{sidebar}</aside>
        </div>
      )}

      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
