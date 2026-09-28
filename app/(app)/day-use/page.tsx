'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import { PAYMENT_METHODS, type DayUsePlan, type DayUseSession, type DayUseSessionDetail, type PaymentMethod } from '@/lib/types';
import { IconClose } from '@/components/icons';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, Field, FormError, Pagination, PageHeader, Select, Spinner, fieldErrors } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { dateTime, hour, money, ymdToBr } from '@/lib/format';

const UNDO_WINDOW_MIN = 10;

export default function DayUsePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [editingPlan, setEditingPlan] = useState<DayUsePlan | 'new' | null>(null);
  const [closing, setClosing] = useState(false);

  const plans = useQuery({ queryKey: ['day-use-plans'], queryFn: () => api.get<DayUsePlan[]>('/day-use-plans') });
  const session = useQuery({
    queryKey: ['day-use-sessions', 'current'],
    queryFn: () => api.get<DayUseSessionDetail | null>('/day-use-sessions/current'),
    refetchInterval: 20_000,
  });

  return (
    <>
      <PageHeader title="Day Use" subtitle="Caixa do dia e planos de acesso às quadras" />

      <CaixaSection session={session} isAdmin={isAdmin} activePlans={plans.data?.filter((p) => p.active) ?? []} onRequestClose={() => setClosing(true)} />

      <h2 className="mt-10 mb-4 text-lg font-bold text-mar-900">Caixas anteriores</h2>
      <HistoryList />

      <div className="mt-10 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-mar-900">Planos</h2>
        {isAdmin && (
          <button className="btn-accent" onClick={() => setEditingPlan('new')}>
            + Novo plano
          </button>
        )}
      </div>
      {plans.isPending ? <Spinner /> : plans.isError ? <ErrorBox error={plans.error} onRetry={() => plans.refetch()} /> : plans.data.length === 0 ? <div className="card"><Empty>Nenhum plano.</Empty></div> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.data.map((p) => (
            <article key={p.id} className={`card overflow-hidden ${p.active ? '' : 'opacity-60'}`}>
              <div className="h-2 bg-gradient-to-r from-mar-800 via-mar-600 to-sol-400" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-mar-900">{p.name}</h3>
                  {!p.active && <span className="badge bg-slate-200 text-slate-600">Inativo</span>}
                </div>
                <p className="mt-1 min-h-10 text-sm text-slate-500">{p.description ?? '—'}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-bold text-mar-800">{money(p.price)}</span>
                  {isAdmin && (
                    <button className="btn-ghost py-1" onClick={() => setEditingPlan(p)}>
                      Editar
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={closing} onClose={() => setClosing(false)} title="Fechar caixa de day use" size="sm">
        {closing && session.data && <CloseSessionForm session={session.data} onDone={() => setClosing(false)} />}
      </Modal>
      <Modal open={editingPlan !== null} onClose={() => setEditingPlan(null)} title={editingPlan === 'new' ? 'Novo plano' : 'Editar plano'}>
        {editingPlan && <PlanForm plan={editingPlan === 'new' ? undefined : editingPlan} onDone={() => setEditingPlan(null)} />}
      </Modal>
    </>
  );
}

function CaixaSection({
  session,
  isAdmin,
  activePlans,
  onRequestClose,
}: {
  session: ReturnType<typeof useQuery<DayUseSessionDetail | null>>;
  isAdmin: boolean;
  activePlans: DayUsePlan[];
  onRequestClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const open = useMutation({
    mutationFn: () => api.post<DayUseSessionDetail>('/day-use-sessions'),
    onSuccess: (s) => {
      qc.setQueryData(['day-use-sessions', 'current'], s);
      qc.invalidateQueries({ queryKey: ['day-use-sessions'] });
      toast('ok', `Caixa de ${ymdToBr(s.date)} aberto`);
    },
    onError: (e) => toast('erro', e.message),
  });

  const removeEntry = useMutation({
    mutationFn: (entryId: number) => api.delete<DayUseSessionDetail>(`/day-use-sessions/${session.data!.id}/entries/${entryId}`),
    onSuccess: (s) => {
      qc.setQueryData(['day-use-sessions', 'current'], s);
      toast('ok', 'Lançamento removido');
    },
    onError: (e) => toast('erro', e.message),
  });

  if (session.isPending) return <Spinner />;
  if (session.isError) return <ErrorBox error={session.error} onRetry={() => session.refetch()} />;

  const s = session.data;

  if (!s) {
    return (
      <div className="card flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-sm text-slate-600">Nenhum caixa de day use aberto agora.</p>
        <button className="btn-accent" disabled={open.isPending} onClick={() => open.mutate()}>
          {open.isPending ? 'Abrindo...' : 'Abrir caixa de day use'}
        </button>
      </div>
    );
  }

  const isOpen = s.status === 'ABERTO';
  const canRemove = (createdById: number, createdAt: string) =>
    isOpen && (isAdmin || (createdById === user?.id && Date.now() - new Date(createdAt).getTime() < UNDO_WINDOW_MIN * 60_000));

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-sol-400 bg-mar-800 p-5 text-white">
        <div>
          <p className="text-sm font-bold text-mar-200">Caixa de {ymdToBr(s.date)}</p>
          <p className="mt-1 text-2xl font-bold">{s.peopleCount} pessoa(s) · {money(s.total)}</p>
          <p className="text-xs text-mar-200">
            {isOpen ? `Aberto às ${hour(s.openedAt)} por ${s.openedBy}` : `Fechado em ${dateTime(s.closedAt!)} por ${s.closedBy}`}
          </p>
        </div>
        {isOpen && (
          <button className="btn border border-white/40 text-white hover:bg-white/10" onClick={onRequestClose}>
            Fechar caixa
          </button>
        )}
      </div>

      {isOpen && (
        <div className="border-b border-slate-200 p-5">
          <AddEntryForm sessionId={s.id} activePlans={activePlans} />
        </div>
      )}

      {s.entries.length === 0 ? (
        <Empty>Nenhum pagamento registrado {isOpen ? 'ainda' : 'nesse dia'}.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {s.entries.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-5 py-3">
              <span className="mt-0.5 badge bg-sol-100 text-sol-700">{e.quantity}×</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{e.personName}</p>
                <p className="text-xs text-slate-500">
                  {e.planName} · {PAYMENT_METHODS[e.paymentMethod]} · {e.createdBy} · {hour(e.createdAt)}
                </p>
              </div>
              <span className="text-sm font-bold text-mar-900">{money(e.subtotal)}</span>
              {canRemove(e.createdById, e.createdAt) && (
                <button
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remover pagamento de ${e.personName}`}
                  disabled={removeEntry.isPending}
                  onClick={() => {
                    if (window.confirm(`Remover pagamento de ${e.personName}?`)) removeEntry.mutate(e.id);
                  }}
                >
                  <IconClose className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {s.totalsByMethod.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-200 bg-mar-50 px-5 py-3 text-sm">
          {s.totalsByMethod.map((t) => (
            <span key={t.method}>
              <span className="text-slate-500">{PAYMENT_METHODS[t.method]}:</span> <span className="font-semibold">{money(t.total)}</span>{' '}
              <span className="text-slate-400">({t.count})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AddEntryForm({ sessionId, activePlans }: { sessionId: number; activePlans: DayUsePlan[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [personName, setPersonName] = useState('');
  const [dayUsePlanId, setDayUsePlanId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');

  const add = useMutation({
    mutationFn: () =>
      api.post<DayUseSessionDetail>(`/day-use-sessions/${sessionId}/entries`, {
        dayUsePlanId: Number(dayUsePlanId),
        personName: personName.trim(),
        quantity,
        paymentMethod,
      }),
    onSuccess: (s) => {
      qc.setQueryData(['day-use-sessions', 'current'], s);
      toast('ok', 'Pagamento registrado');
      setPersonName('');
      setQuantity(1);
    },
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    add.mutate();
  }

  const fe = fieldErrors(add.error);

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_10rem_6rem_10rem_auto] sm:items-end">
      <Field
        label="Quem pagou"
        name="personName"
        required
        minLength={2}
        maxLength={120}
        value={personName}
        onChange={(e) => setPersonName(e.target.value)}
        error={fe.personName}
      />
      <Select label="Plano" name="dayUsePlanId" required value={dayUsePlanId} onChange={(e) => setDayUsePlanId(e.target.value)}>
        <option value="" disabled>
          Selecione
        </option>
        {activePlans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {money(p.price)}
          </option>
        ))}
      </Select>
      <Field
        label="Pessoas"
        name="quantity"
        type="number"
        min={1}
        max={50}
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
      />
      <Select label="Pagamento" name="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
        {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((k) => (
          <option key={k} value={k}>
            {PAYMENT_METHODS[k]}
          </option>
        ))}
      </Select>
      <button className="btn-primary" disabled={add.isPending || !dayUsePlanId}>
        {add.isPending ? 'Registrando...' : 'Registrar'}
      </button>
      <div className="sm:col-span-5">
        <FormError error={add.error} />
      </div>
    </form>
  );
}

function CloseSessionForm({ session, onDone }: { session: DayUseSessionDetail; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => api.post<DayUseSessionDetail>(`/day-use-sessions/${session.id}/close`),
    onSuccess: (s) => {
      qc.setQueryData(['day-use-sessions', 'current'], s);
      qc.invalidateQueries({ queryKey: ['day-use-sessions'] });
      toast('ok', 'Caixa fechado');
      onDone();
    },
  });

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-sol-100 p-4 text-center text-3xl font-black text-mar-900">{money(session.total)}</p>
      <p className="text-center text-sm text-slate-600">
        {session.peopleCount} pessoa(s) em {session.entriesCount} lançamento(s). Depois de fechado, não dá mais para registrar pagamentos nesse dia.
      </p>
      {session.totalsByMethod.length > 0 && (
        <ul className="space-y-1 text-sm">
          {session.totalsByMethod.map((t) => (
            <li key={t.method} className="flex justify-between">
              <span>{PAYMENT_METHODS[t.method]}</span>
              <span className="font-semibold">{money(t.total)}</span>
            </li>
          ))}
        </ul>
      )}
      <FormError error={m.error} />
      <button className="btn-primary w-full py-3" disabled={m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? 'Fechando...' : 'Confirmar fechamento'}
      </button>
    </div>
  );
}

function HistoryList() {
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const q = useQuery({
    queryKey: ['day-use-sessions', 'history', page],
    queryFn: () => api.get<{ data: DayUseSession[]; meta: { page: number; pageSize: number; total: number } }>('/day-use-sessions', { page, pageSize: 10 }),
    placeholderData: keepPreviousData,
  });

  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  if (q.data.data.length === 0) return <div className="card"><Empty>Nenhum caixa de day use ainda.</Empty></div>;

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Status</th>
              <th>Pessoas</th>
              <th>Aberto por</th>
              <th>Fechado por</th>
              <th className="text-right">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {q.data.data.map((s) => (
              <tr key={s.id}>
                <td>{ymdToBr(s.date)}</td>
                <td>
                  <span className={`badge ${s.status === 'ABERTO' ? 'bg-sol-100 text-sol-700' : 'bg-mar-100 text-mar-800'}`}>
                    {s.status === 'ABERTO' ? 'Aberto' : 'Fechado'}
                  </span>
                </td>
                <td>{s.peopleCount}</td>
                <td>{s.openedBy}</td>
                <td>{s.closedBy ?? '—'}</td>
                <td className="text-right font-semibold">{money(s.total)}</td>
                <td className="text-right">
                  <button className="text-sm font-semibold text-mar-700 hover:underline" onClick={() => setViewingId(s.id)}>
                    Ver detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...q.data.meta} onChange={setPage} />
      </div>

      <Modal open={viewingId !== null} onClose={() => setViewingId(null)} title="Detalhes do caixa" size="lg">
        {viewingId !== null && <SessionDetailView id={viewingId} />}
      </Modal>
    </>
  );
}

function SessionDetailView({ id }: { id: number }) {
  const q = useQuery({ queryKey: ['day-use-sessions', id], queryFn: () => api.get<DayUseSessionDetail>(`/day-use-sessions/${id}`) });

  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const s = q.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-mar-900">{ymdToBr(s.date)}</p>
          <p className="text-sm text-slate-500">
            Aberto às {hour(s.openedAt)} por {s.openedBy}
            {s.closedAt && ` · Fechado em ${dateTime(s.closedAt)} por ${s.closedBy}`}
          </p>
        </div>
        <span className={`badge ${s.status === 'ABERTO' ? 'bg-sol-100 text-sol-700' : 'bg-mar-100 text-mar-800'}`}>
          {s.status === 'ABERTO' ? 'Aberto' : 'Fechado'}
        </span>
      </div>

      <p className="rounded-xl bg-sol-100 p-4 text-center text-2xl font-bold text-mar-900">
        {s.peopleCount} pessoa(s) · {money(s.total)}
      </p>

      {s.entries.length === 0 ? (
        <Empty>Nenhum pagamento registrado nesse dia.</Empty>
      ) : (
        <ul className="max-h-[45vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          {s.entries.map((e) => (
            <li key={e.id} className="flex items-start gap-3 p-3">
              <span className="mt-0.5 badge bg-sol-100 text-sol-700">{e.quantity}×</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{e.personName}</p>
                <p className="text-xs text-slate-500">
                  {e.planName} · {PAYMENT_METHODS[e.paymentMethod]} · {e.createdBy} · {hour(e.createdAt)}
                </p>
              </div>
              <span className="text-sm font-bold text-mar-900">{money(e.subtotal)}</span>
            </li>
          ))}
        </ul>
      )}

      {s.totalsByMethod.length > 0 && (
        <ul className="space-y-1 border-t border-slate-200 pt-3 text-sm">
          {s.totalsByMethod.map((t) => (
            <li key={t.method} className="flex justify-between">
              <span>
                {PAYMENT_METHODS[t.method]} <span className="text-slate-400">({t.count})</span>
              </span>
              <span className="font-semibold">{money(t.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlanForm({ plan, onDone }: { plan?: DayUsePlan; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: (body: object) => (plan ? api.patch(`/day-use-plans/${plan.id}`, body) : api.post('/day-use-plans', body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['day-use-plans'] });
      toast('ok', 'Plano salvo');
      onDone();
    },
  });
  const fe = fieldErrors(m.error);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    m.mutate({
      name: String(f.get('name')).trim(),
      description: String(f.get('description') ?? '').trim() || null,
      price: Number(String(f.get('price')).replace(',', '.')),
      ...(plan && { active: f.get('active') === 'on' }),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nome" name="name" required minLength={2} maxLength={120} defaultValue={plan?.name} error={fe.name} />
      <Field label="Descrição" name="description" maxLength={255} defaultValue={plan?.description ?? ''} error={fe.description} />
      <Field label="Preço por pessoa (R$)" name="price" required inputMode="decimal" pattern="\d+([.,]\d{1,2})?" defaultValue={plan?.price} error={fe.price} />
      {plan && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="active" className="size-4 accent-mar-800" defaultChecked={plan.active} /> Ativo
        </label>
      )}
      <FormError error={m.error} />
      <button className="btn-primary w-full" disabled={m.isPending}>{m.isPending ? 'Salvando...' : 'Salvar'}</button>
    </form>
  );
}
