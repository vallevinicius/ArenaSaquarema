'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import {
  CATEGORIES,
  PAYMENT_METHODS,
  type Category,
  type DayUsePlan,
  type Paginated,
  type PaymentMethod,
  type Product,
  type TabDetail,
  type TabItem,
} from '@/lib/types';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, Field, FormError, Spinner, StatusBadge } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { dateTime, hour, money, todayLocal, ymdToBr } from '@/lib/format';

const UNDO_WINDOW_MIN = 10;

export default function TabDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [closing, setClosing] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const tab = useQuery({
    queryKey: ['tab', id],
    queryFn: () => api.get<TabDetail>(`/tabs/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  });

  const onTabChanged = (t: TabDetail) => {
    qc.setQueryData(['tab', id], t);
    qc.invalidateQueries({ queryKey: ['tabs'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };

  const addItem = useMutation({
    mutationFn: (body: object) => api.post<TabDetail>(`/tabs/${id}/items`, body),
    onSuccess: (t) => {
      onTabChanged(t);
      toast('ok', 'Item lançado');
    },
    onError: (e) => toast('erro', e.message),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: number) => api.delete<TabDetail>(`/tabs/${id}/items/${itemId}`),
    onSuccess: (t) => {
      onTabChanged(t);
      toast('ok', 'Item removido');
    },
    onError: (e) => toast('erro', e.message),
  });

  if (tab.isPending) return <Spinner />;
  if (tab.isError) return <ErrorBox error={tab.error} onRetry={() => tab.refetch()} />;

  const t = tab.data;
  const isOpen = t.status === 'ABERTA';
  const canRemove = (i: TabItem) =>
    isOpen &&
    (user?.role === 'ADMIN' ||
      (i.createdById === user?.id && Date.now() - new Date(i.createdAt).getTime() < UNDO_WINDOW_MIN * 60_000));

  return (
    <>
      <Link href="/comandas" className="mb-4 inline-block text-sm font-semibold text-mar-700 hover:underline">
        ← Comandas
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        {/* Lançamento */}
        <div className="order-2 space-y-6 xl:order-1">
          {isOpen ? (
            <>
              <ProductPicker disabled={addItem.isPending} onAdd={(productId, quantity) => addItem.mutate({ type: 'PRODUTO', productId, quantity })} />
              <DayUsePicker disabled={addItem.isPending} onAdd={(dayUsePlanId, quantity, usageDate) => addItem.mutate({ type: 'DAY_USE', dayUsePlanId, quantity, usageDate })} />
            </>
          ) : (
            <div className="card p-6 text-sm text-slate-600">
              Comanda {t.status.toLowerCase()} {t.closedAt && `em ${dateTime(t.closedAt)}`} por {t.closedBy ?? '—'}.
              {t.paymentMethod && ` Pagamento: ${PAYMENT_METHODS[t.paymentMethod]}.`}
            </div>
          )}
        </div>

        {/* Comanda */}
        <aside className="order-1 xl:order-2">
          <div className="card sticky top-4 overflow-hidden">
            <div className="border-b-4 border-sol-400 bg-mar-800 p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-mar-200">Comanda #{t.id}</span>
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-1 truncate text-2xl font-black">{t.customer.name}</p>
              <p className="text-xs text-mar-200">
                Aberta às {hour(t.openedAt)} por {t.openedBy} {t.notes && `· ${t.notes}`}
              </p>
            </div>

            {t.items.length === 0 ? (
              <Empty>Nenhum item lançado.</Empty>
            ) : (
              <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto">
                {t.items.map((i) => (
                  <li key={i.id} className="flex items-start gap-3 px-5 py-3">
                    <span
                      className={`mt-0.5 badge ${i.type === 'DAY_USE' ? 'bg-sol-100 text-sol-700' : 'bg-mar-100 text-mar-800'}`}
                    >
                      {i.quantity}×
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.description}</p>
                      <p className="text-xs text-slate-500">
                        {money(i.unitPrice)} · {i.createdBy} · {hour(i.createdAt)}
                        {i.usageDate && ` · uso ${ymdToBr(i.usageDate)}`}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-mar-900">{money(i.subtotal)}</span>
                    {canRemove(i) && (
                      <button
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remover ${i.description}`}
                        disabled={removeItem.isPending}
                        onClick={() => {
                          if (window.confirm(`Remover ${i.quantity}× ${i.description}?`)) removeItem.mutate(i.id);
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-slate-200 bg-mar-50 p-5">
              <div className="flex items-end justify-between">
                <span className="text-sm font-semibold text-mar-800">Total</span>
                <span className="text-3xl font-black text-mar-900">{money(t.total)}</span>
              </div>
              {isOpen && (
                <div className="mt-4 grid gap-2">
                  <button className="btn-accent py-3 text-base" disabled={t.items.length === 0} onClick={() => setClosing(true)}>
                    Fechar comanda
                  </button>
                  {user?.role === 'ADMIN' && (
                    <button className="btn-ghost text-red-700" onClick={() => setCanceling(true)}>
                      Cancelar comanda
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <Modal open={closing} onClose={() => setClosing(false)} title={`Fechar comanda #${t.id}`} size="sm">
        {closing && <CloseForm tab={t} onDone={(nt) => { onTabChanged(nt); setClosing(false); toast('ok', 'Comanda fechada'); }} />}
      </Modal>
      <Modal open={canceling} onClose={() => setCanceling(false)} title={`Cancelar comanda #${t.id}`} size="sm">
        {canceling && <CancelForm tabId={t.id} onDone={(nt) => { onTabChanged(nt); setCanceling(false); toast('ok', 'Comanda cancelada'); }} />}
      </Modal>
    </>
  );
}

function ProductPicker({ onAdd, disabled }: { onAdd: (productId: number, qty: number) => void; disabled: boolean }) {
  const [cat, setCat] = useState<Category | 'TODAS'>('TODAS');
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState(1);

  const products = useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => api.get<Paginated<Product>>('/products', { active: true, pageSize: 100 }),
  });

  const list = useMemo(() => {
    const s = search.toLowerCase();
    return (products.data?.data ?? []).filter((p) => (cat === 'TODAS' || p.category === cat) && p.name.toLowerCase().includes(s));
  }, [products.data, cat, search]);

  const cats = useMemo(() => [...new Set((products.data?.data ?? []).map((p) => p.category))], [products.data]);

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-mar-900">🍺 Bar</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Qtd</span>
          <button className="btn-ghost px-3" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir quantidade">−</button>
          <span className="w-8 text-center text-lg font-bold" aria-live="polite">{qty}</span>
          <button className="btn-ghost px-3" onClick={() => setQty((q) => Math.min(100, q + 1))} aria-label="Aumentar quantidade">+</button>
        </div>
      </div>
      <input className="input mb-3" placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar produto" />
      <div className="mb-4 flex flex-wrap gap-2">
        {(['TODAS', ...cats] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`badge px-3 py-1 ${cat === c ? 'bg-mar-800 text-white' : 'bg-mar-50 text-mar-800 hover:bg-mar-100'}`}
          >
            {c === 'TODAS' ? 'Todas' : CATEGORIES[c]}
          </button>
        ))}
      </div>

      {products.isPending ? (
        <Spinner />
      ) : products.isError ? (
        <ErrorBox error={products.error} onRetry={() => products.refetch()} />
      ) : list.length === 0 ? (
        <Empty>Nenhum produto.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => {
            const out = p.trackStock && p.stock < qty;
            return (
              <button
                key={p.id}
                disabled={disabled || out}
                onClick={() => {
                  onAdd(p.id, qty);
                  setQty(1);
                }}
                className="group rounded-xl border-2 border-slate-200 bg-white p-3 text-left transition hover:border-sol-400 hover:bg-sol-50 disabled:opacity-40"
              >
                <p className="line-clamp-2 text-sm font-semibold text-mar-900">{p.name}</p>
                <p className="mt-2 text-base font-black text-mar-800">{money(p.price)}</p>
                <p className={`text-xs ${p.lowStock ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                  {p.trackStock ? (out ? 'Sem estoque' : `Estoque: ${p.stock}`) : 'Preparado na hora'}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DayUsePicker({
  onAdd,
  disabled,
}: {
  onAdd: (planId: number, qty: number, usageDate: string) => void;
  disabled: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState(todayLocal());
  const plans = useQuery({
    queryKey: ['day-use-plans', 'active'],
    queryFn: () => api.get<DayUsePlan[]>('/day-use-plans', { active: true }),
  });

  return (
    <section className="card border-t-4 border-t-sol-400 p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-extrabold text-mar-900">☀️ Day Use</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="du-date" className="label">Data de uso</label>
            <input id="du-date" type="date" className="input" min={todayLocal()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="du-qty" className="label">Pessoas</label>
            <input id="du-qty" type="number" className="input w-24" min={1} max={50} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
          </div>
        </div>
      </div>
      {plans.isPending ? (
        <Spinner />
      ) : plans.isError ? (
        <ErrorBox error={plans.error} />
      ) : plans.data.length === 0 ? (
        <Empty>Nenhum plano de day use ativo.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.data.map((p) => (
            <button
              key={p.id}
              disabled={disabled}
              onClick={() => onAdd(p.id, qty, date)}
              className="rounded-xl bg-gradient-to-br from-mar-800 to-mar-900 p-4 text-left text-white transition hover:ring-4 hover:ring-sol-400 disabled:opacity-50"
            >
              <p className="font-bold">{p.name}</p>
              {p.description && <p className="mt-1 line-clamp-2 text-xs text-mar-200">{p.description}</p>}
              <p className="mt-3 text-xl font-black text-sol-400">{money(p.price)}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function CloseForm({ tab, onDone }: { tab: TabDetail; onDone: (t: TabDetail) => void }) {
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [received, setReceived] = useState('');
  const m = useMutation({
    mutationFn: () => api.post<TabDetail>(`/tabs/${tab.id}/close`, { paymentMethod: method }),
    onSuccess: onDone,
  });
  const change = method === 'DINHEIRO' && received ? Number(received.replace(',', '.')) - Number(tab.total) : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <p className="rounded-xl bg-sol-100 p-4 text-center text-3xl font-black text-mar-900">{money(tab.total)}</p>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="label">Forma de pagamento</legend>
        {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((k) => (
          <label
            key={k}
            className={`cursor-pointer rounded-lg border-2 px-3 py-2 text-center text-sm font-semibold ${
              method === k ? 'border-mar-800 bg-mar-800 text-white' : 'border-slate-200 text-mar-800 hover:border-mar-300'
            }`}
          >
            <input type="radio" name="pm" value={k} className="sr-only" checked={method === k} onChange={() => setMethod(k)} />
            {PAYMENT_METHODS[k]}
          </label>
        ))}
      </fieldset>
      {method === 'DINHEIRO' && (
        <div>
          <Field label="Valor recebido" name="received" inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} />
          {change !== null && !Number.isNaN(change) && (
            <p className={`mt-2 text-sm font-semibold ${change < 0 ? 'text-red-600' : 'text-mar-800'}`}>
              {change < 0 ? `Faltam ${money(-change)}` : `Troco: ${money(change)}`}
            </p>
          )}
        </div>
      )}
      <FormError error={m.error} />
      <button className="btn-primary w-full py-3" disabled={m.isPending}>
        {m.isPending ? 'Fechando...' : 'Confirmar pagamento'}
      </button>
    </form>
  );
}

function CancelForm({ tabId, onDone }: { tabId: number; onDone: (t: TabDetail) => void }) {
  const m = useMutation({
    mutationFn: (reason: string) => api.post<TabDetail>(`/tabs/${tabId}/cancel`, { reason }),
    onSuccess: onDone,
  });
  return (
    <form
      className="space-y-4"
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        m.mutate(String(new FormData(e.currentTarget).get('reason')));
      }}
    >
      <p className="text-sm text-slate-600">Os produtos lançados voltam para o estoque. Esta ação não pode ser desfeita.</p>
      <Field label="Motivo" name="reason" required minLength={3} maxLength={200} />
      <FormError error={m.error} />
      <button className="btn-danger w-full" disabled={m.isPending}>
        {m.isPending ? 'Cancelando...' : 'Cancelar comanda'}
      </button>
    </form>
  );
}
