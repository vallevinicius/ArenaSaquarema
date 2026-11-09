import Link from 'next/link';
import { Emblem } from '@/components/Logo';
import { INSTAGRAM, IconInstagram, Ondas, PARCEIROS, PLANOS, d } from '@/components/site';

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-mar-800 pt-28 pb-32 lg:pt-36">
        <div className="animate-bloom absolute -top-28 -right-24 size-96 rounded-full bg-sol-400/90" style={d(0)} aria-hidden="true" />
        <div className="absolute bottom-0 left-0 w-full opacity-20" aria-hidden="true">
          <Ondas />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="animate-rise text-sm font-bold tracking-[0.3em] text-sol-400" style={d(80)}>
              FUTEVÔLEI · SAQUAREMA/RJ
            </p>
            <h1 className="animate-rise mt-4 text-4xl leading-[1.05] font-black text-white sm:text-6xl" style={d(180)}>
              Venha jogar <span className="text-sol-400">futevôlei</span> na melhor areia de Saquarema.
            </h1>
            <p className="animate-rise mt-5 max-w-xl text-lg text-mar-200" style={d(300)}>
              Aulas em turmas por nível, do primeiro toque ao jogo avançado. Escolha seu horário e entre na areia.
            </p>
            <div className="animate-rise mt-8 flex flex-wrap gap-3" style={d(420)}>
              <a href="#planos" className="rounded-xl bg-sol-400 px-6 py-3.5 font-extrabold text-mar-950 shadow-lg transition hover:bg-sol-300">
                Ver planos
              </a>
              <Link href="/horarios" className="rounded-xl border border-white/30 px-6 py-3.5 font-bold text-white transition hover:bg-white/10">
                Horários das aulas
              </Link>
            </div>
          </div>
          <div className="animate-bloom relative mx-auto" style={d(200)}>
            <div className="absolute -inset-8 rounded-full bg-sol-400/25 blur-3xl" aria-hidden="true" />
            <Emblem size={320} className="animate-float relative max-w-[72vw] ring-8" />
          </div>
        </div>
        <Ondas className="absolute bottom-[-1px] left-0 h-16 sm:h-24" />
      </section>

      {/* Horários */}
      <section id="aulas" className="mx-auto max-w-6xl scroll-mt-4 px-5 py-20">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-mar-800 p-8 sm:flex-row sm:items-center sm:p-10">
          <div className="flex-1">
            <p className="text-sm font-bold tracking-[0.3em] text-sol-400">AULAS</p>
            <h2 className="mt-2 text-3xl font-black text-white">Uma turma para cada nível</h2>
            <p className="mt-2 text-mar-200">Das 18h às 22h: Iniciante A e B, Intermediário e Avançado.</p>
          </div>
          <Link href="/horarios" className="rounded-xl bg-sol-400 px-6 py-3.5 font-extrabold text-mar-950 shadow-lg transition hover:bg-sol-300">
            Ver horários
          </Link>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="relative scroll-mt-4 bg-mar-50 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-sm font-bold tracking-[0.3em] text-mar-600">PLANOS</p>
          <h2 className="mt-2 text-3xl font-black text-mar-900 sm:text-4xl">Escolha quantas vezes quer treinar</h2>
          <div className="mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
            {PLANOS.map((p) => (
              <article
                key={p.nome}
                className={`relative rounded-3xl p-7 transition hover:-translate-y-1 ${
                  p.destaque ? 'bg-mar-800 text-white shadow-2xl ring-4 ring-sol-400' : 'border border-mar-200 bg-white shadow-sm'
                }`}
              >
                {p.destaque && (
                  <span className="absolute -top-3.5 right-6 rounded-full bg-sol-400 px-3 py-1 text-xs font-extrabold text-mar-950">
                    MAIS COMPLETO
                  </span>
                )}
                <h3 className={`text-lg font-extrabold ${p.destaque ? 'text-sol-300' : 'text-mar-800'}`}>{p.nome}</h3>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-lg font-bold">R$</span>
                  <span className="text-6xl font-black tracking-tight">{p.preco}</span>
                  <span className={p.destaque ? 'text-mar-200' : 'text-slate-500'}>/mês</span>
                </p>
                <p className={`mt-4 text-sm ${p.destaque ? 'text-mar-200' : 'text-slate-500'}`}>{p.extra}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border-l-8 border-sol-400 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
            <div className="flex-1">
              <h3 className="text-xl font-extrabold text-mar-900">Também aceitamos</h3>
              <p className="text-sm text-slate-500">Use seu benefício corporativo e treine na Arena.</p>
            </div>
            <ul className="flex gap-3">
              {PARCEIROS.map((n) => (
                <li key={n} className="rounded-xl bg-mar-800 px-5 py-3 text-lg font-black text-white">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Instagram */}
      <section id="instagram" className="mx-auto grid max-w-6xl scroll-mt-4 items-center gap-10 px-5 py-20 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-sm font-bold tracking-[0.3em] text-mar-600">INSTAGRAM</p>
          <h2 className="mt-2 text-3xl font-black text-mar-900 sm:text-4xl">Acompanhe a Arena no dia a dia</h2>
          <p className="mt-3 max-w-md text-slate-500">
            Jogos, treinos, eventos e novidades. As últimas postagens aparecem aqui, e o resto está no nosso perfil.
          </p>
          <a
            href={INSTAGRAM.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-mar-800 px-6 py-3.5 font-extrabold text-white shadow-lg transition hover:bg-mar-900"
          >
            <IconInstagram /> Seguir {INSTAGRAM.user}
          </a>
        </div>
        <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl border-4 border-sol-400 bg-white shadow-2xl">
          <iframe
            src={`${INSTAGRAM.url}embed`}
            title="Postagens do Instagram da Arena Saquarema"
            loading="lazy"
            className="block h-[560px] w-full"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </section>

    </>
  );
}
