import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cfg = { RESEND_API_KEY: undefined as string | undefined, MAIL_FROM: 'Arena <a@b.com>', prod: false };
vi.mock('../config/env', () => ({ env: cfg, isProd: () => cfg.prod }));
vi.mock('./logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

const { sendMail } = await import('./mail');
const mail = { to: 'ana@x.com', subject: 'Código', text: 'Seu código 123456', html: '<p>123456</p>' };
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  Object.assign(cfg, { RESEND_API_KEY: undefined, prod: false });
});
afterEach(() => vi.unstubAllGlobals());

describe('sendMail', () => {
  it('em dev sem chave: não chama a rede (só loga)', async () => {
    await sendMail(mail);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('em produção sem chave: falha com 503 (nunca finge que enviou)', async () => {
    cfg.prod = true;
    await expect(sendMail(mail)).rejects.toMatchObject({ statusCode: 503, code: 'EMAIL_NOT_CONFIGURED' });
  });

  it('com chave: POST no Resend com Bearer e o corpo esperado', async () => {
    cfg.RESEND_API_KEY = 're_test_key';
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await sendMail(mail);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');
    expect(JSON.parse(init.body as string)).toMatchObject({ from: 'Arena <a@b.com>', to: ['ana@x.com'], subject: 'Código' });
  });

  it('Resend recusou: 502 com mensagem genérica (sem vazar o corpo do provedor)', async () => {
    cfg.RESEND_API_KEY = 're_test_key';
    fetchMock.mockResolvedValue(new Response('{"message":"domínio não verificado"}', { status: 403 }));
    const err = await sendMail(mail).catch((e) => e);
    expect(err).toMatchObject({ statusCode: 502, code: 'EMAIL_SEND_FAILED' });
    expect(err.message).not.toContain('domínio');
  });

  it('falha de rede: 502', async () => {
    cfg.RESEND_API_KEY = 're_test_key';
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    await expect(sendMail(mail)).rejects.toMatchObject({ statusCode: 502 });
  });
});
