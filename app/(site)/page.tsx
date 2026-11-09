import Image from 'next/image';
import Link from 'next/link';
import { Emblem } from '@/components/Logo';
import * as photosService from '@/server/modules/photos/photos.service';
import type { Metadata } from 'next';
import { SITE_NAME, address, siteUrl, whatsappDigits } from '@/lib/contato';
import { Degraus, INSTAGRAM, IconInstagram, PARCEIROS, PLANOS, Quadra, d } from '@/components/site';

// A galeria vem do banco (fotos enviadas pelo admin): a página é renderizada a cada acesso,
// o que também mantém o `next build` sem depender de banco/.env.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { alternates: { canonical: '/' } };

// Dados estruturados: ajudam o Google a mostrar a arena como local esportivo. Campos sem valor no .env ficam de fora.
function jsonLd() {
  const tel = whatsappDigits();
  const end = address();
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: SITE_NAME,
    description: 'Aulas de futevôlei em Saquarema, RJ, em turmas por nível.',
    url: siteUrl(),
    sameAs: [INSTAGRAM.url],
    openingHours: 'Mo-Su 18:00-22:00',
    ...(tel && { telephone: `+${tel}` }),
    ...(end && { address: { '@type': 'PostalAddress', streetAddress: end, addressLocality: 'Saquarema', addressRegion: 'RJ', addressCountry: 'BR' } }),
  }).replace(/</g, '\\u003c');
}

async function loadPhotos() {
  try {
    return await photosService.list();
  } catch {
    return []; // banco fora do ar: o site continua de pé, só sem a galeria
  }
}

export default async function HomePage() {
  const fotos = await loadPhotos();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd() }} />
      {/* Hero: a quadra. O título acompanha o arco da bola e ela cruza a rede ao carregar. */}
      <section className="relative overflow-hidden overflow-x-clip bg-areia-100 pt-28 lg:pt-32">
        <div className="animate-bloom absolute -top-24 -right-24 size-80 rounded-full bg-sol-400 sm:size-[30rem]" style={d(0)} aria-hidden="true" />
        <div className="animate-bloom absolute top-24 right-[7%] hidden lg:block" style={d(150)}>
          <Emblem size={230} className="ring-8 ring-mar-900" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5">
          <h1 className="font-display text-[clamp(3.6rem,13vw,10.5rem)] leading-[0.84] font-black tracking-tight text-mar-900 uppercase">
            <span className="animate-rise block" style={d(100)}>Pé na areia,</span>
            <span className="animate-rise block pl-[8vw] lg:pl-[12rem]" style={d(260)}>bola no ar.</span>
          </h1>
          <div className="animate-rise mt-8 flex max-w-xl flex-col gap-6" style={d(420)}>
            <p className="text-xl font-medium text-mar-900">
              Aulas de futevôlei em Saquarema, em turmas por nível, das 18h às 22h.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#planos" className="rounded-full bg-mar-900 px-8 py-4 font-extrabold text-white transition hover:bg-mar-800">
                Ver planos
              </a>
              <Link href="/horarios" className="rounded-full border-2 border-mar-900 px-8 py-4 font-extrabold text-mar-900 transition hover:bg-mar-900 hover:text-white">
                Horários das aulas
              </Link>
            </div>
          </div>
        </div>
        <Quadra className="mt-6 block h-auto lg:h-72" />
      </section>

      {/* Níveis */}
      <section id="aulas" className="scroll-mt-4 bg-mar-950 pt-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display max-w-3xl text-5xl leading-[0.9] font-black uppercase sm:text-7xl">
            Uma turma para cada nível. Suba degrau por degrau.
          </h2>
          <p className="mt-5 max-w-xl text-lg text-mar-200">Do primeiro toque na bola ao jogo de alto rendimento, no horário que cabe na sua noite.</p>
        </div>
        <div className="mx-auto mt-14 max-w-6xl px-5">
          <Degraus />
        </div>
        <div className="h-20 bg-mar-950" />
      </section>

      {/* Galeria (aparece quando o admin enviar fotos em "Fotos do site") */}
      {fotos.length > 0 && (
        <section className="bg-mar-950 pb-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="font-display text-5xl font-black text-white uppercase sm:text-7xl">Vida na Arena</h2>
            <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
              {fotos.map((f, i) => (
                <li key={f.id} className={`relative overflow-hidden ${i % 5 === 0 ? 'row-span-2 aspect-[3/4]' : 'aspect-square'}`}>
                  <Image src={f.url} alt={f.alt} unoptimized fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover transition duration-500 hover:scale-105" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Planos */}
      <section id="planos" className="scroll-mt-4 bg-areia-100 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-5xl leading-[0.9] font-black text-mar-900 uppercase sm:text-7xl">Quantas vezes por semana?</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {PLANOS.map((p) => (
              <article
                key={p.nome}
                className={`relative flex flex-col justify-between gap-10 p-8 before:pointer-events-none before:absolute before:inset-3 before:border-2 max-sm:p-6 sm:p-10 ${
                  p.destaque ? 'bg-mar-800 text-white before:border-sol-400/50' : 'bg-areia-50 text-mar-900 before:border-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className={`font-display text-[7rem] leading-[0.75] sm:text-[9rem] font-black ${p.destaque ? 'text-sol-400' : 'text-mar-800'}`}>
                    {p.nome.charAt(0)}×
                  </p>
                  {p.destaque && <span className="mt-2 rounded-full bg-sol-400 px-3 py-1 text-sm font-extrabold text-mar-950">Mais completo</span>}
                </div>
                <div>
                  <p className="text-lg font-bold">{p.nome}</p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-6xl leading-none font-black sm:text-7xl">R$ {p.preco}</span>
                    <span className={p.destaque ? 'text-mar-200' : 'text-mar-700'}>por mês</span>
                  </p>
                  <p className={`mt-3 ${p.destaque ? 'text-mar-100' : 'text-mar-800'}`}>{p.extra}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="mt-16 bg-sol-400">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:gap-10">
            <p className="font-display text-4xl leading-none font-black text-mar-950 uppercase sm:text-5xl">Também aceitamos</p>
            <ul className="flex flex-wrap gap-x-8 gap-y-2">
              {PARCEIROS.map((n) => (
                <li key={n} className="font-display text-4xl leading-none font-black text-mar-800 sm:text-5xl">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Instagram */}
      <section id="instagram" className="mx-auto grid max-w-6xl scroll-mt-4 items-center gap-12 px-5 py-24 lg:grid-cols-[1fr_auto]">
        <div>
          <h2 className="font-display text-5xl leading-[0.9] font-black text-mar-900 uppercase sm:text-7xl">A Arena no dia a dia</h2>
          <p className="mt-5 max-w-md text-lg text-mar-800">
            Jogos, treinos, eventos e novidades. As últimas postagens aparecem ao lado; o resto está no nosso perfil.
          </p>
          <a
            href={INSTAGRAM.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-mar-900 px-8 py-4 font-extrabold text-white transition hover:bg-mar-800"
          >
            <IconInstagram /> Seguir {INSTAGRAM.user}
          </a>
        </div>
        <div className="mx-auto w-full max-w-[420px] bg-white p-3 shadow-[10px_10px_0_0_var(--color-sol-400)]">
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
