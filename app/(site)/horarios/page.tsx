import type { Metadata } from 'next';
import Link from 'next/link';
import { AULAS, Ondas, d } from '@/components/site';

export const metadata: Metadata = { title: 'Horários das aulas · Arena Saquarema' };

export default function HorariosPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-mar-800 pt-32 pb-28">
        <div className="animate-bloom absolute -top-28 -right-24 size-80 rounded-full bg-sol-400/90" style={d(0)} aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5">
          <p className="animate-rise text-sm font-bold tracking-[0.3em] text-sol-400" style={d(80)}>AULAS</p>
          <h1 className="animate-rise mt-3 text-4xl font-black text-white sm:text-5xl" style={d(180)}>
            Horários das <span className="text-sol-400">aulas</span>
          </h1>
          <p className="animate-rise mt-4 max-w-xl text-lg text-mar-200" style={d(300)}>
            Quatro turmas por nível, das 18h às 22h. Escolha a sua.
          </p>
        </div>
        <Ondas className="absolute bottom-[-1px] left-0 h-16 sm:h-24" />
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AULAS.map((a) => (
            <li key={a.nivel} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className={`px-5 py-4 ${a.cor}`}>
                <p className="text-2xl font-black">{a.hora}</p>
              </div>
              <div className="border-t-4 border-sol-400 p-5">
                <h2 className="text-lg font-extrabold text-mar-900">{a.nivel}</h2>
                <p className="mt-1 text-sm text-slate-500">{a.desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-wrap items-center gap-4 rounded-2xl bg-mar-50 p-6">
          <p className="flex-1 font-semibold text-mar-900">Já escolheu o horário? Veja os planos e valores.</p>
          <Link href="/#planos" className="rounded-xl bg-mar-800 px-6 py-3 font-extrabold text-white transition hover:bg-mar-900">
            Ver planos
          </Link>
        </div>
      </section>
    </>
  );
}
