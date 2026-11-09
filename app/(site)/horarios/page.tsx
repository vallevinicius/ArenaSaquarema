import type { Metadata } from 'next';
import Link from 'next/link';
import { Degraus, d } from '@/components/site';

export const metadata: Metadata = {
  title: 'Horários das aulas',
  description: 'Quatro turmas por nível, de Iniciante A a Avançado, das 18h às 22h.',
  alternates: { canonical: '/horarios' },
};

export default function HorariosPage() {
  return (
    <>
      <section className="bg-areia-100 pt-32 pb-16">
        <div className="mx-auto max-w-6xl px-5">
          <h1 className="animate-rise font-display text-6xl leading-[0.85] font-black text-mar-900 uppercase sm:text-8xl" style={d(80)}>
            Horários
            <br />
            das aulas
          </h1>
          <p className="animate-rise mt-5 max-w-xl text-xl font-medium text-mar-900" style={d(220)}>
            Quatro turmas por nível, das 18h às 22h. Quanto mais alto o degrau, mais intenso o jogo.
          </p>
        </div>
      </section>

      <section className="bg-mar-950 pt-16">
        <div className="mx-auto max-w-6xl px-5">
          <Degraus />
        </div>
        <div className="mt-16 bg-sol-400">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-8">
            <p className="font-display flex-1 text-4xl leading-none font-black text-mar-950 uppercase sm:text-5xl">Já escolheu o horário?</p>
            <Link href="/#planos" className="rounded-full bg-mar-900 px-8 py-4 font-extrabold text-white transition hover:bg-mar-800">
              Ver planos
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
