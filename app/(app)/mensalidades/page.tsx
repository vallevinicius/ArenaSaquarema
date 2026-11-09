'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import { money, todayLocal, ymdToBr } from '@/lib/format';
import { MEMBERSHIP_STATUS, PAYMENT_METHODS } from '@/lib/types';
import type { MembershipOverview, MembershipPayment, MembershipPlan, MembershipRow, MembershipStatus, Paginated, PaymentMethod } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, Field, FormError, PageHeader, Pagination, Select, Spinner, fieldErrors } from '@/components/ui';

const CARDS: MembershipStatus[] = ['VENCIDO', 'SEM_PAGAMENTO', 'VENCE_EM_BREVE', 'EM_DIA', 'PARCEIRO', 'SEM_PLANO'];

function Badge({ s }: { s: MembershipStatus }) {
  return <span className={`badge ${MEMBERSHIP_STATUS[s].badge}`}>{MEMBERSHIP_STATUS[s].label}</span>;
}

function validity(r: MembershipRow) {
  if (!r.validUntil || r.daysLeft === null) return '—';
  const when = r.daysLeft < 0 ? `${-r.daysLeft} dia(s) de atraso` : r.daysLeft === 0 ? 'último dia' : `faltam ${r.daysLeft} dia(s)`;
  return (
    <>
      <span className="font-semibold text-mar-900">{ymdToBr(r.validUntil)}</span>
      <span className="block text-xs text-slate-500">{when}</span>
    </>
  );
}

export default function MembershipsPage() {
  const [status, setStatus] = useState<MembershipStatus | ''>('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<MembershipRow | null>(null);
  const [history, setHistory] = useState<MembershipRow | null>(null);
  const [planFor, setPlanFor] = useState<MembershipRow | null>(null);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => (setDebouncedQ(q.trim()), setPage(1)), 300);
    return () => clearTimeout(t);
  }, [q]);

  const list = useQuery({
    queryKey: ['memberships', status, debouncedQ, page],
    queryFn: () => api.get<MembershipOverview>('/memberships', { page, ...(status && { status }), ...(debouncedQ && { q: debouncedQ }) }),
    placeholderData: (prev) => prev,
  });
  const counts = list.data?.summary.counts ?? {};

  return (
    <>
      <PageHeader
        title="Mensalidades"
        subtitle="Cada pagamento vale 30 dias. Quem precisa de cobrança aparece primeiro."
        actions={
          <>
            <input className="input w-52" type="search" placeholder="Buscar aluno" aria-label="Buscar aluno" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-ghost" onClick={() => setManaging(true)}>Planos</button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        <div className="card col-span-2 p-4 sm:col-span-3 xl:col-span-1">
          <p className="text-xs font-semibold text-mar-700">Recebido no mês</p>
          <p className="mt-1 text-xl font-extrabold text-mar-900">{list.data ? money(list.data.summary.receivedThisMonth) : '—'}</p>
        </div>
        {CARDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => (setStatus(status === s ? '' : s), setPage(1))}
            className={`card p-4 text-left transition hover:-translate-y-0.5 ${status === s ? 'ring-2 ring-mar-600' : ''}`}
          >
            <p className="text-xs font-semibold text-mar-700">{MEMBERSHIP_STATUS[s].label}</p>
            <p className="mt-1 text-2xl font-extrabold text-mar-900">{counts[s] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <div className="p-4"><ErrorBox error={list.error} onRetry={() => list.refetch()} /></div>
        ) : list.data.data.length === 0 ? (
          <Empty>{status || debouncedQ ? 'Nenhum aluno neste filtro.' : 'Nenhum aluno ativo. Cadastre em Alunos.'}</Empty>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr><th>Aluno</th><th>Plano</th><th>Situação</th><th>Válido até</th><th /></tr>
              </thead>
              <tbody>
                {list.data.data.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <p className="font-semibold text-mar-900">{r.name}</p>
                      {r.name !== r.email && <p className="text-xs text-slate-500">{r.email}</p>}
                    </td>
                    <td>{r.plan ? <>{r.plan.name}{r.plan.chargeable && <span className="block text-xs text-slate-500">{money(r.plan.price)}</span>}</> : '—'}</td>
                    <td><Badge s={r.status} /></td>
                    <td>{validity(r)}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1">
                        {r.plan?.chargeable && <button className="btn-accent py-1" onClick={() => setPaying(r)}>Registrar pagamento</button>}
                        <button className="btn-ghost py-1" onClick={() => setHistory(r)}>Histórico</button>
                        <button className="btn-ghost py-1" onClick={() => setPlanFor(r)}>{r.plan ? 'Trocar plano' : 'Escolher plano'}</button>
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

      <Modal open={!!paying} onClose={() => setPaying(null)} title={`Pagamento · ${paying?.name ?? ''}`}>
        {paying && <PaymentForm row={paying} onDone={() => setPaying(null)} />}
      </Modal>
      <Modal open={!!history} onClose={() => setHistory(null)} title={`Histórico · ${history?.name ?? ''}`} size="lg">
        {history && <History row={history} />}
      </Modal>
      <Modal open={!!planFor} onClose={() => setPlanFor(null)} title={`Plano · ${planFor?.name ?? ''}`}>
        {planFor && <PlanPicker row={planFor} onDone={() => setPlanFor(null)} />}
      </Modal>
      <Modal open={managing} onClose={() => setManaging(false)} title="Planos de mensalidade" size="lg">
        {managing && <PlansManager />}
      </Modal>
    </>
  );
}

function PaymentForm({ row, onDone }: { row: MembershipRow; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: (body: object) => api.post<MembershipPayment>(`/memberships/${row.id}/payments`, body),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['memberships'] });
      qc.invalidateQueries({ queryKey: ['membership-payments'] });
      toast('ok', `Pagamento registrado. Válido até ${ymdToBr(p.periodEnd)}.`);
      onDone();
    },
  });
  const fe = fieldErrors(m.error);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const note = String(f.get('note') ?? '').trim();
    m.mutate({ amount: Number(f.get('amount')), method: f.get('method'), paidOn: f.get('paidOn'), ...(note && { note }) });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="rounded-lg bg-mar-50 px-3 py-2 text-sm text-mar-900">
        Plano <strong>{row.plan?.name}</strong>. O pagamento vale 30 dias{row.validUntil && row.daysLeft !== null && row.daysLeft >= 0 ? `; como ainda está válido até ${ymdToBr(row.validUntil)}, os 30 dias começam depois dessa data` : ' a partir do dia pago'}.
      </p>
      <Field label="Valor recebido (R$)" name="amount" type="number" step="0.01" min="0.01" required defaultValue={row.plan?.price} error={fe.amount} hint="Já vem o preço do plano. Mude se houve desconto." />
      <Select label="Forma de pagamento" name="method" defaultValue="PIX" required>
        {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((k) => <option key={k} value={k}>{PAYMENT_METHODS[k]}</option>)}
      </Select>
      <Field label="Dia em que recebeu" name="paidOn" type="date" required defaultValue={todayLocal()} max={todayLocal()} error={fe.paidOn} />
      <Field label="Observação (opcional)" name="note" maxLength={200} error={fe.note} />
      <FormError error={m.error} />
      <button className="btn-primary w-full" disabled={m.isPending}>{m.isPending ? 'Registrando...' : 'Registrar pagamento'}</button>
    </form>
  );
}

function History({ row }: { row: MembershipRow }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ['membership-payments', row.id, page],
    queryFn: () => api.get<Paginated<MembershipPayment>>(`/memberships/${row.id}/payments`, { page, pageSize: 10 }),
  });
  const voidIt = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.post(`/membership-payments/${id}/void`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memberships'] });
      qc.invalidateQueries({ queryKey: ['membership-payments'] });
      toast('ok', 'Pagamento estornado');
    },
    onError: () => toast('erro', 'Não foi possível estornar'),
  });

  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  if (q.data.data.length === 0) return <Empty>Nenhum pagamento registrado.</Empty>;
  return (
    <div>
      <ul className="divide-y divide-slate-200">
        {q.data.data.map((p) => (
          <li key={p.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${p.voided ? 'opacity-60' : ''}`}>
            <div>
              <p className="font-semibold text-mar-900">
                <span className={p.voided ? 'line-through' : ''}>{money(p.amount)}</span> · {PAYMENT_METHODS[p.method]} · {p.planName}
              </p>
              <p className="text-xs text-slate-500">
                Pago em {ymdToBr(p.paidOn)} · vale de {ymdToBr(p.periodStart)} a {ymdToBr(p.periodEnd)} · por {p.registeredBy}
              </p>
              {p.note && <p className="text-xs text-slate-500">Obs.: {p.note}</p>}
              {p.voided && <p className="text-xs font-semibold text-red-700">Estornado: {p.voidReason}</p>}
            </div>
            {!p.voided && (
              <button
                className="btn-ghost py-1 text-red-700"
                disabled={voidIt.isPending}
                onClick={() => {
                  const reason = window.prompt('Motivo do estorno (obrigatório):')?.trim();
                  if (reason && reason.length >= 3) voidIt.mutate({ id: p.id, reason });
                }}
              >
                Estornar
              </button>
            )}
          </li>
        ))}
      </ul>
      <Pagination {...q.data.meta} onChange={setPage} />
    </div>
  );
}

function PlanPicker({ row, onDone }: { row: MembershipRow; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const plans = useQuery({ queryKey: ['membership-plans'], queryFn: () => api.get<MembershipPlan[]>('/membership-plans') });
  const m = useMutation({
    mutationFn: (planId: number | null) => api.put(`/memberships/${row.id}/plan`, { planId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memberships'] });
      qc.invalidateQueries({ queryKey: ['membership-plans'] });
      toast('ok', 'Plano atualizado');
      onDone();
    },
  });

  if (plans.isPending) return <Spinner />;
  if (plans.isError) return <ErrorBox error={plans.error} onRetry={() => plans.refetch()} />;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const v = String(new FormData(e.currentTarget).get('planId'));
        m.mutate(v ? Number(v) : null);
      }}
    >
      <Select label="Plano do aluno" name="planId" defaultValue={row.plan?.id ?? ''}>
        <option value="">Sem plano</option>
        {plans.data.filter((p) => p.active || p.id === row.plan?.id).map((p) => (
          <option key={p.id} value={p.id}>{p.name}{p.chargeable ? ` · ${money(p.price)}` : ' · parceiro (não cobrado)'}</option>
        ))}
      </Select>
      <FormError error={m.error} />
      <button className="btn-primary w-full" disabled={m.isPending}>{m.isPending ? 'Salvando...' : 'Salvar plano'}</button>
    </form>
  );
}

function PlansManager() {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<MembershipPlan | 'new' | null>(null);
  const plans = useQuery({ queryKey: ['membership-plans'], queryFn: () => api.get<MembershipPlan[]>('/membership-plans') });
  const save = useMutation({
    mutationFn: (v: { id?: number; body: object }) => (v.id ? api.patch(`/membership-plans/${v.id}`, v.body) : api.post('/membership-plans', v.body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['membership-plans'] });
      qc.invalidateQueries({ queryKey: ['memberships'] });
      toast('ok', 'Plano salvo');
      setEditing(null);
    },
  });
  const fe = fieldErrors(save.error);

  if (editing) {
    const p = editing === 'new' ? null : editing;
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const chargeable = f.get('chargeable') === 'on';
          save.mutate({
            id: p?.id,
            body: { name: String(f.get('name')).trim(), price: chargeable ? Number(f.get('price')) : 0, chargeable, ...(p && { active: f.get('active') === 'on' }) },
          });
        }}
      >
        <Field label="Nome" name="name" required minLength={2} maxLength={60} defaultValue={p?.name} error={fe.name} autoFocus />
        <Field label="Preço da mensalidade (R$)" name="price" type="number" step="0.01" min="0" defaultValue={p?.price ?? ''} error={fe.price} hint="Ignorado em plano de parceiro." />
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="chargeable" defaultChecked={p?.chargeable ?? true} className="size-4" />
          A arena cobra a mensalidade (desmarque para Wellhub, TotalPass e similares)
        </label>
        {p && (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" name="active" defaultChecked={p.active} className="size-4" />
            Plano ativo (desativado não pode ser escolhido para novos alunos)
          </label>
        )}
        <FormError error={save.error} />
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={() => setEditing(null)}>Voltar</button>
          <button className="btn-primary flex-1" disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    );
  }

  if (plans.isPending) return <Spinner />;
  if (plans.isError) return <ErrorBox error={plans.error} onRetry={() => plans.refetch()} />;
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-slate-200">
        {plans.data.map((p) => (
          <li key={p.id} className={`flex items-center justify-between gap-3 py-3 ${p.active ? '' : 'opacity-50'}`}>
            <div>
              <p className="font-semibold text-mar-900">{p.name} {!p.active && <span className="badge bg-slate-200 text-slate-600">Desativado</span>}</p>
              <p className="text-xs text-slate-500">{p.chargeable ? money(p.price) : 'Parceiro, a arena não cobra'} · {p.studentsCount} aluno(s)</p>
            </div>
            <button className="btn-ghost py-1" onClick={() => setEditing(p)}>Editar</button>
          </li>
        ))}
      </ul>
      <button className="btn-accent w-full" onClick={() => setEditing('new')}>+ Novo plano</button>
    </div>
  );
}
