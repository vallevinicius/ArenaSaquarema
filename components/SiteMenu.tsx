'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const LINKS = [
  { href: '/horarios', label: 'Horários' },
  { href: '/#planos', label: 'Planos' },
  { href: '/#instagram', label: 'Instagram' },
];

/** Menu do site no celular: hambúrguer que abre uma lista. Fecha ao escolher um item, ao tocar fora ou com Esc. */
export function SiteMenu() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  const item = 'block rounded-2xl px-4 py-3 text-base font-bold text-mar-900 hover:bg-mar-900/10';
  return (
    <div ref={box} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="menu-site"
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        className="grid size-11 place-items-center rounded-full bg-mar-900 text-white shadow-lg"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <nav
          id="menu-site"
          className="absolute top-full right-0 mt-3 w-60 rounded-3xl border border-white/80 bg-white/85 p-2 shadow-[0_20px_50px_-12px_rgba(6,26,61,.45)] backdrop-blur-xl"
        >
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={item}>
              {l.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="mt-1 block rounded-2xl bg-mar-900 px-4 py-3 text-center text-base font-extrabold text-white hover:bg-mar-800">
            Entrar
          </Link>
        </nav>
      )}
    </div>
  );
}
