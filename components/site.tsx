import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Emblem } from '@/components/Logo';

export const PLANOS = [
  { nome: '2x na semana', preco: 130, destaque: false, extra: 'Ideal para começar e manter o ritmo' },
  { nome: '5x na semana', preco: 150, destaque: true, extra: 'Treine todos os dias e evolua mais rápido' },
];

export const AULAS = [
  { hora: '18h às 19h', nivel: 'Iniciante A', desc: 'Primeiro contato com a areia: fundamentos e toque de bola.', cor: 'bg-mar-100 text-mar-800' },
  { hora: '19h às 20h', nivel: 'Iniciante B', desc: 'Consolidando os fundamentos e começando a jogar.', cor: 'bg-mar-200 text-mar-900' },
  { hora: '20h às 21h', nivel: 'Intermediário', desc: 'Mais ritmo, tática e jogo de dupla.', cor: 'bg-mar-600 text-white' },
  { hora: '21h às 22h', nivel: 'Avançado', desc: 'Jogo intenso, estratégia e alto rendimento.', cor: 'bg-mar-900 text-sol-300' },
];

export const PARCEIROS = ['Wellhub', 'TotalPass'];
export const INSTAGRAM = { user: '@arena_saquarema', url: 'https://www.instagram.com/arena_saquarema/' };

export const d = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

export function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Ondas({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-full text-white ${className}`} viewBox="0 0 800 120" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 60c100-40 200-40 300 0s200 40 300 0 150-30 200-10v70H0z" fill="currentColor" />
    </svg>
  );
}


export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Emblem size={44} />
            <span className="leading-tight">
              <span className="block text-lg font-black text-white">ARENA</span>
              <span className="block text-xs font-bold tracking-[0.25em] text-sol-400">SAQUAREMA</span>
            </span>
          </div>
          <nav className="flex items-center gap-1 text-sm font-semibold text-white">
            <Link href="/horarios" className="hidden rounded-lg px-3 py-2 hover:bg-white/10 sm:block">Horários</Link>
            <a href="/#planos" className="hidden rounded-lg px-3 py-2 hover:bg-white/10 sm:block">Planos</a>
            <a href="/#instagram" className="hidden rounded-lg px-3 py-2 hover:bg-white/10 sm:block">Instagram</a>
            <Link href="/login" className="rounded-lg border border-white/30 px-3 py-2 hover:bg-white/10">
              Área da equipe
            </Link>
          </nav>
        </div>
      </header>
  );
}

export function SiteFooter() {
  return (
      <footer className="bg-mar-950 text-mar-200">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <Emblem size={56} />
              <span className="leading-tight">
                <span className="block text-lg font-black text-white">ARENA</span>
                <span className="block text-xs font-bold tracking-[0.25em] text-sol-400">SAQUAREMA</span>
              </span>
            </div>
            <p className="mt-4 text-sm text-mar-300">Futevôlei e esporte de praia em Saquarema, RJ.</p>
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-wider text-sol-400">NAVEGAÇÃO</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/horarios" className="hover:text-white">Horários</Link></li>
              <li><a href="/#planos" className="hover:text-white">Planos</a></li>
              <li><a href="/#instagram" className="hover:text-white">Instagram</a></li>
              <li><Link href="/login" className="hover:text-white">Área da equipe</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-wider text-sol-400">HORÁRIOS</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {AULAS.map((a) => (
                <li key={a.nivel}>
                  <span className="font-semibold text-white">{a.hora.replace(' às ', '–')}</span> · {a.nivel}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-wider text-sol-400">CONTATO</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                  <IconInstagram /> {INSTAGRAM.user}
                </a>
              </li>
              <li>Saquarema · RJ</li>
              <li className="text-mar-300">Aceitamos {PARCEIROS.join(' e ')}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-mar-800 px-5 py-5 text-center text-xs text-mar-300">
          © {new Date().getFullYear()} Arena Saquarema. Todos os direitos reservados.
        </div>
      </footer>
  );
}
