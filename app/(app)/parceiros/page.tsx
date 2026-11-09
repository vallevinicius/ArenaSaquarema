'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import { hour, todayLocal, ymdToBr } from '@/lib/format';
import { PARTNER_PLATFORMS } from '@/lib/types';
import type { PartnerCheckIn, PartnerCheckInList, PartnerIntegrationStatus, PartnerPlatform, PartnerSummary } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, Field, FormError, PageHeader, Pagination, Select, Spinner, fieldErrors } from '@/components/ui';

const STATUS = {
  VALIDADO: { label: 'Confirmado', badge: 'bg-emerald-100 text-emerald-700' },
  PENDENTE: { label: 'Aguardando confirmação', badge: 'bg-orange-100 text-orange-700' },
  EXPIRADO: { label: 'Expirado', badge: 'bg-slate-200 text-slate-600' },
} as const;

export default function PartnersPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayLocal());
  const [platform, setPlatform] = useState<PartnerPlatform | ''>('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const month = date.slice(0, 7);

  const list = useQuery({
    queryKey: ['partner-check-ins', date, platform, page],
    queryFn: () => api.get<PartnerCheckInList>('/partner-check-ins', { date, page, ...(platform && { platform }) }),
    placeholderData: (prev) => prev,
    // Os avisos da TotalPass chegam sozinhos: atualiza a lista de hoje a cada 30s.
    refetchInterval: date === todayLocal() ? 30_000 : false,
  });
  const summary = useQuery({ queryKey: ['partner-summary', month], queryFn: () => api.get<PartnerSummary>('/partner-check-ins/summary', { month }) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['partner-check-ins'] });
    qc.invalidateQueries({ queryKey: ['partner-summary'] });
  };
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/partner-check-ins/${id}`),
    onSuccess: () => (refresh(), toast('ok', 'Lançamento removido')),
    onError: () => toast('erro', 'Não foi possível remover'),
  });
  const confirmAgain = useMutation({
    mutationFn: (id: number) => api.post<PartnerCheckIn>(`/partner-check-ins/${id}/validate`),
    onSuccess: (c) => (refresh(), toast(c.status === 'VALIDADO' ? 'ok' : 'erro', c.status === 'VALIDADO' ? 'Check-in confirmado' : 'Ainda não foi possível confirmar')),
    onError: () => toast('erro', 'Não foi possível confirmar agora'),
  });

  const counts = list.data?.counts;
  return (
    <>
      <PageHeader
        title="Check-ins de parceiros"
        subtitle="Quem veio por Wellhub e TotalPass. Só o administrador vê os nomes. A contagem é separada da presença dos alunos."
        actions={
          <>
            <input type="date" className="input w-auto" aria-label="Dia" value={date} max={todayLocal()} onChange={(e) => e.target.value && (setDate(e.target.value), setPage(1))} />
            <button className="btn-accent" onClick={() => setCreating(true)}>+ Registrar check-in</button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(['WELLHUB', 'TOTALPASS'] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={platform === p}
            onClick={() => (setPlatform(platform === p ? '' : p), setPage(1))}
            className={`card p-4 text-left transition hover:-translate-y-0.5 ${platform === p ? 'ring-2 ring-mar-600' : ''}`}
          >
            <p className="text-xs font-semibold text-mar-700">{PARTNER_PLATFORMS[p].label} no dia</p>
            <p className="mt-1 text-3xl font-extrabold text-mar-900">{counts?.[p] ?? '—'}</p>
            <p className="text-xs text-slate-500">{summary.data ? `${summary.data.totals[p]} no mês` : ''}</p>
          </button>
        ))}
        <div className="card p-4">
          <p className="text-xs font-semibold text-mar-700">Aguardando confirmação</p>
          <p className="mt-1 text-3xl font-extrabold text-mar-900">{counts?.pending ?? '—'}</p>
          <p className="text-xs text-slate-500">Não entram na contagem</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-mar-700">Total do dia</p>
          <p className="mt-1 text-3xl font-extrabold text-mar-900">{counts ? counts.WELLHUB + counts.TOTALPASS : '—'}</p>
          <p className="text-xs text-slate-500">{ymdToBr(date)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <div className="p-4"><ErrorBox error={list.error} onRetry={() => list.refetch()} /></div>
        ) : list.data.data.length === 0 ? (
          <Empty>Nenhum check-in de parceiro neste dia. Eles aparecem sozinhos quando a integração estiver ligada, ou use “Registrar check-in”.</Empty>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr><th>Hora</th><th>Pessoa</th><th>Plataforma</th><th>Origem</th><th>Situação</th><th /></tr>
              </thead>
              <tbody>
                {list.data.data.map((c) => (
                  <tr key={c.id} className={c.status === 'EXPIRADO' ? 'opacity-60' : ''}>
                    <td className="whitespace-nowrap">{hour(c.checkedInAt)}</td>
                    <td>
                      <p className="font-semibold text-mar-900">{c.personName}</p>
                      {(c.personCode || c.note) && <p className="text-xs text-slate-500">{[c.personCode && `código ${c.personCode}`, c.note].filter(Boolean).join(' · ')}</p>}
                    </td>
                    <td><span className={`badge ${PARTNER_PLATFORMS[c.platform].badge}`}>{PARTNER_PLATFORMS[c.platform].label}</span></td>
                    <td>{c.source === 'MANUAL' ? 'Lançado à mão' : 'Automático'}</td>
                    <td><span className={`badge ${STATUS[c.status].badge}`}>{STATUS[c.status].label}</span></td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1">
                        {c.status === 'PENDENTE' && <button className="btn-accent py-1" disabled={confirmAgain.isPending} onClick={() => confirmAgain.mutate(c.id)}>Confirmar agora</button>}
                        {c.source === 'MANUAL' && (
                          <button className="btn-ghost py-1 text-red-700" disabled={remove.isPending} onClick={() => confirm(`Remover o lançamento de ${c.personName}?`) && remove.mutate(c.id)}>Remover</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...list.data.meta} onChange={setPage} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <MonthSummary summary={summary.data} month={month} loading={summary.isPending} />
        <Connections />
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Registrar check-in de parceiro">
        {creating && <CheckInForm defaultDay={date} onDone={() => (setCreating(false), refresh())} />}
      </Modal>
    </>
  );
}

function MonthSummary({ summary, month, loading }: { summary?: PartnerSummary; month: string; loading: boolean }) {
  return (
    <section className="card p-5">
      <h2 className="text-lg font-bold text-mar-900">Resumo de {ymdToBr(`${month}-01`).slice(3)}</h2>
      {loading ? (
        <Spinner />
      ) : !summary || summary.byDay.length === 0 ? (
        <Empty>Sem check-ins confirmados neste mês.</Empty>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-600">
            Wellhub <strong>{summary.totals.WELLHUB}</strong> · TotalPass <strong>{summary.totals.TOTALPASS}</strong>
          </p>
          <div className="mt-3 max-h-72 overflow-y-auto">
            <table className="table">
              <thead><tr><th>Dia</th><th>Wellhub</th><th>TotalPass</th></tr></thead>
              <tbody>
                {summary.byDay.map((d) => (
                  <tr key={d.date}><td>{ymdToBr(d.date)}</td><td>{d.WELLHUB}</td><td>{d.TOTALPASS}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Connections() {
  const toast = useToast();
  const status = useQuery({ queryKey: ['partner-integrations'], queryFn: () => api.get<PartnerIntegrationStatus>('/partner-integrations') });
  const register = useMutation({
    mutationFn: () => api.post('/partner-integrations/totalpass/webhook'),
    onSuccess: () => toast('ok', 'Webhook registrado na TotalPass'),
    onError: (e) => toast('erro', e instanceof Error ? e.message : 'Não foi possível registrar'),
  });
  const tp = status.data?.totalpass;
  return (
    <section className="card space-y-4 p-5">
      <h2 className="text-lg font-bold text-mar-900">Conexão com as plataformas</h2>
      {status.isPending ? (
        <Spinner />
      ) : status.isError ? (
        <ErrorBox error={status.error} onRetry={() => status.refetch()} />
      ) : (
        <>
          <div>
            <p className="font-semibold text-mar-900">
              TotalPass{' '}
              <span className={`badge ${tp?.receiving ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{tp?.receiving ? 'Pronto para receber' : 'Não configurado'}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {tp?.receiving
                ? 'Os check-ins chegam sozinhos e só contam depois de confirmados na TotalPass.'
                : 'Faltam as chaves e o segredo no .env do servidor (passo a passo em docs/parceiros.md). Enquanto isso, lance à mão.'}
            </p>
            {tp?.credentials && tp.receiving && (
              <button className="btn-ghost mt-2" disabled={register.isPending} onClick={() => register.mutate()}>
                {register.isPending ? 'Registrando...' : 'Registrar este sistema na TotalPass'}
              </button>
            )}
          </div>
          <div>
            <p className="font-semibold text-mar-900">Wellhub <span className="badge bg-slate-200 text-slate-600">Lançamento manual</span></p>
            <p className="mt-1 text-sm text-slate-600">{status.data.wellhub.note}</p>
          </div>
        </>
      )}
    </section>
  );
}

function CheckInForm({ defaultDay, onDone }: { defaultDay: string; onDone: () => void }) {
  const toast = useToast();
  const m = useMutation({
    mutationFn: (body: object) => api.post<PartnerCheckIn>('/partner-check-ins', body),
    onSuccess: () => (toast('ok', 'Check-in registrado'), onDone()),
  });
  const fe = fieldErrors(m.error);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const code = String(f.get('personCode') ?? '').trim();
    const note = String(f.get('note') ?? '').trim();
    m.mutate({ platform: f.get('platform'), personName: String(f.get('personName')).trim(), day: f.get('day'), ...(code && { personCode: code }), ...(note && { note }) });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Select label="Plataforma" name="platform" defaultValue="TOTALPASS" required>
        <option value="TOTALPASS">TotalPass</option>
        <option value="WELLHUB">Wellhub</option>
      </Select>
      <Field label="Nome da pessoa" name="personName" required minLength={2} maxLength={120} autoFocus error={fe.personName} />
      <Field label="Código na plataforma (opcional)" name="personCode" maxLength={60} error={fe.personCode} hint="Não informe CPF." />
      <Field label="Dia" name="day" type="date" required defaultValue={defaultDay} max={todayLocal()} error={fe.day} />
      <Field label="Observação (opcional)" name="note" maxLength={200} error={fe.note} />
      <FormError error={m.error} />
      <button className="btn-primary w-full" disabled={m.isPending}>{m.isPending ? 'Salvando...' : 'Registrar check-in'}</button>
    </form>
  );
}
