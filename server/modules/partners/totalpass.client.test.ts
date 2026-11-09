import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const envMock: Record<string, string | undefined> = {};
vi.mock('../../config/env', () => ({ env: envMock }));
vi.mock('../../lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const tp = await import('./totalpass.client');
const res = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  fetchMock.mockReset();
  Object.keys(envMock).forEach((k) => delete envMock[k]);
  Object.assign(envMock, {
    TOTALPASS_API_URL: 'https://gym.example.com',
    TOTALPASS_VALIDATE_URL: 'https://confirm.example.com/v1/',
    TOTALPASS_PARTNER_API_KEY: 'partner-key',
    TOTALPASS_PLACE_API_KEY: 'place-key',
    TOTALPASS_WEBHOOK_SECRET: 'x'.repeat(30),
  });
});
afterEach(() => vi.useRealTimers());

describe('configuração', () => {
  it('credentials exige as duas chaves; receiving exige segredo e base de confirmação', () => {
    expect(tp.hasCredentials()).toBe(true);
    expect(tp.canReceive()).toBe(true);
    delete envMock.TOTALPASS_PLACE_API_KEY;
    expect(tp.hasCredentials()).toBe(false);
    delete envMock.TOTALPASS_VALIDATE_URL;
    expect(tp.canReceive()).toBe(false);
  });
});

describe('validateCheckIn', () => {
  it('200 = validado; chama a base configurada com o token codificado e sem credenciais', async () => {
    fetchMock.mockResolvedValue(res(200, '1'));
    expect(await tp.validateCheckIn('tok en/..')).toBe('VALIDATED');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://confirm.example.com/v1/tok%20en%2F..');
    expect(init.method).toBe('POST');
    expect(init.headers).toBeUndefined(); // nenhum Authorization vai para o endpoint de confirmação
  });
  it('404 e 422 (expirado/indisponível) = EXPIRED', async () => {
    fetchMock.mockResolvedValueOnce(res(422, { errors: [{ source: { label: 'check_in_expired_alert' } }] }));
    expect(await tp.validateCheckIn('t')).toBe('EXPIRED');
    fetchMock.mockResolvedValueOnce(res(404, { message: 'not found' }));
    expect(await tp.validateCheckIn('t')).toBe('EXPIRED');
  });
  it('5xx, rede caída e sem base configurada = RETRY (nunca descarta o check-in)', async () => {
    fetchMock.mockResolvedValueOnce(res(503));
    expect(await tp.validateCheckIn('t')).toBe('RETRY');
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    expect(await tp.validateCheckIn('t')).toBe('RETRY');
    delete envMock.TOTALPASS_VALIDATE_URL;
    expect(await tp.validateCheckIn('t')).toBe('RETRY');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('registerWebhook', () => {
  it('autentica com as duas chaves, usa o token e cria o webhook CHECKIN', async () => {
    fetchMock.mockResolvedValueOnce(res(201, { token: 'JWT1' })).mockResolvedValueOnce(res(201, { status: 'success' }));
    await tp.registerWebhook('https://arena.example.com/api/partners/totalpass/webhook/seg');
    const [authUrl, authInit] = fetchMock.mock.calls[0]!;
    expect(authUrl).toBe('https://gym.example.com/partner/auth');
    expect(JSON.parse(authInit.body)).toEqual({ place_api_key: 'place-key', partner_api_key: 'partner-key' });
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe('https://gym.example.com/partner/webhook/create');
    expect(init.headers.Authorization).toBe('Bearer JWT1');
    expect(JSON.parse(init.body)).toEqual({ webhook_url: 'https://arena.example.com/api/partners/totalpass/webhook/seg', webhook_type: 'CHECKIN' });
  });
  it('já existe webhook do tipo: troca a URL por PUT /update, reaproveitando o token em cache', async () => {
    fetchMock.mockResolvedValueOnce(res(422)).mockResolvedValueOnce(res(200));
    await tp.registerWebhook('https://arena.example.com/x');
    expect(fetchMock.mock.calls[1]![0]).toBe('https://gym.example.com/partner/webhook/update');
    expect(fetchMock.mock.calls[1]![1].method).toBe('PUT');
  });
  it('credenciais inválidas: erro (sem seguir adiante)', async () => {
    vi.resetModules();
    const fresh = await import('./totalpass.client');
    fetchMock.mockResolvedValueOnce(res(401, { message: 'Invalid credentials' }));
    await expect(fresh.registerWebhook('https://arena.example.com/x')).rejects.toThrow(/auth falhou \(401\)/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
