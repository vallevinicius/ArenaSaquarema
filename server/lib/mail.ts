import 'server-only';
import { env, isProd } from '../config/env';
import { AppError } from './errors';
import { logger } from './logger';

type Mail = { to: string; subject: string; text: string; html: string };

/**
 * E-mail transacional via Resend (REST, sem SDK). Sem RESEND_API_KEY: em dev o conteúdo
 * vai para o log (dá para testar o fluxo sem enviar nada); em produção falha explicitamente.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (!env.RESEND_API_KEY) {
    if (isProd()) throw new AppError(503, 'EMAIL_NOT_CONFIGURED', 'Envio de e-mail não configurado');
    logger.warn({ to: mail.to, subject: mail.subject, text: mail.text }, 'RESEND_API_KEY ausente: e-mail NÃO enviado (somente dev)');
    return;
  }

  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.error({ err }, 'Falha de rede ao chamar o Resend');
    throw new AppError(502, 'EMAIL_SEND_FAILED', 'Não foi possível enviar o e-mail agora. Tente novamente.');
  }
  if (!res.ok) {
    // O corpo do erro do provedor fica só no log.
    logger.error({ status: res.status, body: await res.text().catch(() => '') }, 'Resend recusou o envio');
    throw new AppError(502, 'EMAIL_SEND_FAILED', 'Não foi possível enviar o e-mail agora. Tente novamente.');
  }
}
