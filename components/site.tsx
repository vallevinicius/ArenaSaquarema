import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Emblem } from '@/components/Logo';

export const PLANOS = [
  { nome: '2x na semana', preco: 130, destaque: false, extra: 'Ideal para começar e manter o ritmo' },
  { nome: '5x na semana', preco: 150, destaque: true, extra: 'Treine todos os dias e evolua mais rápido' },
];

export const AULAS = [
  { hora: '18h às 19h', nivel: 'Iniciante A', desc: 'Primeiro contato com a areia: fundamentos e toque de bola.', cor: 'bg-mar-800' },
  { hora: '19h às 20h', nivel: 'Iniciante B', desc: 'Consolidando os fundamentos e começando a jogar.', cor: 'bg-mar-700' },
  { hora: '20h às 21h', nivel: 'Intermediário', desc: 'Mais ritmo, tática e jogo de dupla.', cor: 'bg-mar-600' },
  { hora: '21h às 22h', nivel: 'Avançado', desc: 'Jogo intenso, estratégia e alto rendimento.', cor: 'bg-sol-400' },
];

/** Fotos da galeria: coloque os arquivos em public/fotos/ e liste aqui (a seção só aparece se houver fotos). */
export const FOTOS: { src: string; alt: string }[] = [];

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

/** Rede, bola e areia: a cena que fecha o hero. A bola (classe .ball) cruza a rede uma única vez. */
export function Quadra({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-full ${className}`} viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <pattern id="malha" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 0H14M0 0V14" stroke="#0a2c63" strokeWidth="1.4" fill="none" />
        </pattern>
      </defs>
      <path d="M90 246C330-40 870-40 1110 246" fill="none" stroke="#0a2c63" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 14" />
      <rect x="454" y="140" width="292" height="84" fill="url(#malha)" opacity=".55" />
      <rect x="450" y="132" width="300" height="10" rx="3" fill="#fff" />
      <rect x="444" y="124" width="9" height="160" rx="3" fill="#0b3a82" />
      <rect x="747" y="124" width="9" height="160" rx="3" fill="#0b3a82" />
      <path d="M0 268C200 250 380 286 600 266S1000 252 1200 270V320H0z" fill="#e3c78c" />
      <path d="M0 292C260 276 520 304 760 288S1060 280 1200 292V320H0z" fill="#d9b673" />
      <g className="ball">
        <circle r="17" fill="#fff" stroke="#0a2c63" strokeWidth="2.5" />
        <path d="M-17 0Q0-9 17 0M0-17Q9 0 0 17M-12-12Q-1-2-12 12M12-12Q1-2 12 12" fill="none" stroke="#facc15" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

/** Degraus de nível: o conteúdo é uma progressão (Iniciante A -> Avançado), então a altura sobe junto. */
export function Degraus() {
  const topo = AULAS.length - 1;
  return (
    <ol className="grid gap-3 lg:grid-cols-4 lg:items-end lg:gap-0">
      {AULAS.map((a, i) => (
        <li
          key={a.nivel}
          style={{ '--i': i } as CSSProperties}
          className={`flex flex-col justify-end border-t-[6px] border-sol-400 p-6 max-lg:ml-[calc(var(--i)*7%)] lg:min-h-[calc(13rem+var(--i)*4.5rem)] ${
            i === topo ? 'text-mar-950' : 'text-white'
          } ${a.cor}`}
        >
          <p className="font-display text-5xl leading-none font-black tracking-tight">{a.hora.replace(' às ', '–')}</p>
          <h3 className="mt-3 text-xl font-extrabold">{a.nivel}</h3>
          <p className={`mt-1 text-sm ${i === topo ? 'text-mar-900' : 'text-white/75'}`}>{a.desc}</p>
        </li>
      ))}
    </ol>
  );
}

export function SiteHeader() {
  const link = 'rounded-full px-3 py-2 hover:bg-mar-900/10';
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Arena Saquarema, página inicial">
          <Emblem size={44} />
          <span className="font-display text-2xl leading-[0.85] font-black text-mar-900">
            ARENA
            <span className="block text-base tracking-[0.2em] text-mar-700">SAQUAREMA</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-bold text-mar-900">
          <Link href="/horarios" className={link}>Horários</Link>
          <a href="/#planos" className={link}>Planos</a>
          <a href="/#instagram" className={`${link} hidden sm:block`}>Instagram</a>
          <Link href="/login" className="ml-1 rounded-full bg-mar-900 px-4 py-2 text-white hover:bg-mar-800">
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
