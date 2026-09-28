'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { Role } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

export function Logo({ light = true }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className="size-10 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill={light ? '#ffffff' : '#0b3a82'} />
        <circle cx="32" cy="28" r="13" fill="#facc15" />
        <path d="M4 44c9-6 18-6 28 0s19 6 28 0v16H4z" fill={light ? '#0b3a82' : '#ffffff'} />
        <path d="M4 50c9-5 18-5 28 0s19 5 28 0" stroke="#facc15" strokeWidth="2.5" fill="none" />
      </svg>
      <div className="leading-tight">
        <p className={`text-lg font-black tracking-tight ${light ? 'text-white' : 'text-mar-900'}`}>ARENA</p>
        <p className="text-xs font-bold tracking-[0.25em] text-sol-400">SAQUAREMA</p>
      </div>
    </div>
  );
}

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Item = { to: string; label: string; icon: ReactNode; role?: Role };
const NAV: Item[] = [
  { to: '/dashboard', label: 'Dashboard', icon: icon('M4 20V10M10 20V4M16 20v-7M22 20H2'), role: 'ADMIN' },
  { to: '/comandas', label: 'Comandas', icon: icon('M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6') },
  { to: '/clientes', label: 'Clientes', icon: icon('M16 19v-1a4 4 0 00-8 0v1M12 11a3 3 0 100-6 3 3 0 000 6z') },
  { to: '/produtos', label: 'Bar / Produtos', icon: icon('M8 2h8l-1 7a3 3 0 01-6 0zM12 12v8M8 22h8') },
  { to: '/estoque', label: 'Estoque', icon: icon('M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10'), role: 'ADMIN' },
  { to: '/day-use', label: 'Day Use', icon: icon('M12 3v2M12 19v2M5 12H3M21 12h-2M6 6l1.5 1.5M16.5 16.5L18 18M6 18l1.5-1.5M16.5 7.5L18 6M12 8a4 4 0 100 8 4 4 0 000-8z'), role: 'ADMIN' },
  { to: '/usuarios', label: 'Usuários', icon: icon('M12 15a7 7 0 00-7 6h14a7 7 0 00-7-6zM12 12a4 4 0 100-8 4 4 0 000 8z'), role: 'ADMIN' },
];

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((i) => !i.role || i.role === user?.role);

  const sidebar = (
    <nav className="flex h-full flex-col bg-mar-800 text-mar-100">
      <div className="border-b border-mar-700 px-5 py-5">
        <Logo />
      </div>
      <ul className="flex-1 space-y-1 p-3">
        {items.map((i) => (
          <li key={i.to}>
            <Link
              href={i.to}
              onClick={() => setOpen(false)}
              aria-current={pathname.startsWith(i.to) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-sm font-semibold transition ${
                pathname.startsWith(i.to)
                  ? 'border-sol-400 bg-mar-900 text-white'
                  : 'border-transparent hover:bg-mar-700 hover:text-white'
              }`}
            >
              {i.icon}
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-mar-700 p-4">
        <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
        <p className="mb-3 text-xs text-sol-400">{user?.role === 'ADMIN' ? 'Administrador' : 'Operador de caixa'}</p>
        <button
          className="btn w-full border border-mar-600 text-mar-100 hover:bg-mar-700"
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
    <div className="min-h-dvh bg-slate-50 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh lg:block">{sidebar}</aside>

      {/* Mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b-4 border-sol-400 bg-mar-800 px-4 py-3 lg:hidden">
        <Logo />
        <button className="rounded-md p-2 text-white hover:bg-mar-700" onClick={() => setOpen(true)} aria-label="Abrir menu">
          {icon('M4 6h16M4 12h16M4 18h16')}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-mar-950/60" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72">{sidebar}</aside>
        </div>
      )}

      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
