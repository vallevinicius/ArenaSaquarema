import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, address, whatsappLink } from '@/lib/contato';
import { INSTAGRAM } from '@/components/site';

export const metadata: Metadata = {
  title: 'Política de privacidade',
  description: 'Quais dados a Arena Saquarema guarda, para quê, por quanto tempo e como você pode pedir correção ou exclusão.',
  alternates: { canonical: '/privacidade' },
};

const ATUALIZADO = '09/11/2026';

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl leading-none font-black text-mar-900 uppercase">{titulo}</h2>
      <div className="mt-3 space-y-3 text-lg leading-relaxed text-mar-900">{children}</div>
    </section>
  );
}

export default function PrivacidadePage() {
  const wa = whatsappLink('Olá! Quero falar sobre meus dados na Arena Saquarema.');
  const end = address();
  return (
    <>
      <section className="bg-areia-100 pt-32 pb-12">
        <div className="mx-auto max-w-3xl px-5">
          <h1 className="font-display text-6xl leading-[0.85] font-black text-mar-900 uppercase sm:text-8xl">Privacidade</h1>
          <p className="mt-5 text-xl font-medium text-mar-900">
            Em poucas palavras: guardamos só o que o sistema precisa para funcionar, não vendemos seus dados e você pode pedir
            correção ou exclusão quando quiser.
          </p>
          <p className="mt-2 text-sm text-mar-700">Atualizada em {ATUALIZADO}</p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-5 pb-24">
        <Secao titulo="Quem somos">
          <p>
            {SITE_NAME} é uma arena de futevôlei em Saquarema, RJ{end ? ` (${end})` : ''}. Somos a responsável pelos dados descritos aqui,
            nos termos da Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
          </p>
        </Secao>

        <Secao titulo="Quais dados guardamos">
          <ul className="list-disc space-y-2 pl-6">
            <li><strong>Alunos:</strong> e-mail (cadastrado pela arena), senha (guardada embaralhada, nunca em texto), e a data de cada check-in de presença.</li>
            <li><strong>Equipe:</strong> nome, e-mail e o perfil de acesso ao sistema.</li>
            <li><strong>Clientes do bar:</strong> nome e telefone, para identificar a comanda, e o histórico de consumo.</li>
            <li><strong>Fotos do site:</strong> imagens publicadas pela arena. Antes de publicar, removemos a localização e demais dados escondidos da foto.</li>
          </ul>
        </Secao>

        <Secao titulo="Para que usamos">
          <p>
            Para dar acesso à área do aluno, calcular a taxa de presença, controlar comandas, day use e estoque, e enviar o código de
            acesso por e-mail. Não usamos seus dados para propaganda e não os vendemos.
          </p>
        </Secao>

        <Secao titulo="Cookies">
          <p>
            Usamos um único cookie, de sessão, que mantém você conectado depois do login. Ele é necessário para o sistema funcionar, não
            é lido por scripts e não rastreia você em outros sites.
          </p>
        </Secao>

        <Secao titulo="Com quem compartilhamos">
          <p>
            O envio do código de acesso é feito por um serviço de e-mail (Resend), que recebe o seu endereço só para entregar a mensagem.
            O site também exibe uma prévia do nosso Instagram; ao carregá-la, o Instagram pode registrar o seu acesso conforme a política
            dele. Fora isso, só compartilhamos dados se a lei exigir.
          </p>
        </Secao>

        <Secao titulo="Por quanto tempo">
          <p>
            Enquanto o seu cadastro estiver ativo, e depois pelo tempo necessário para cumprir obrigações legais ou resolver pendências
            financeiras.
          </p>
        </Secao>

        <Secao titulo="Seus direitos">
          <p>
            Você pode pedir a confirmação de que tratamos seus dados, o acesso a eles, a correção, a exclusão ou a saída do cadastro.
            Responda pelo canal abaixo e atendemos o pedido.
          </p>
          <p>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="font-bold underline">Falar pelo WhatsApp</a>
            ) : (
              <>Fale com a gente pelo Instagram <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">{INSTAGRAM.user}</a>.</>
            )}
          </p>
        </Secao>

        <p className="mt-12">
          <Link href="/" className="rounded-full border-2 border-mar-900 px-8 py-4 font-extrabold text-mar-900 transition hover:bg-mar-900 hover:text-white">
            Voltar ao site
          </Link>
        </p>
      </article>
    </>
  );
}
