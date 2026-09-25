import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { PAYMENT_METHODS, type Customer, type Paginated, type Tab, type TabDetail, type TabStatus } from '../api/types';
import { CustomerForm } from '../components/CustomerForm';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { Empty, ErrorBox, FormError, PageHeader, Pagination, Spinner, StatusBadge } from '../components/ui';
import { useDebounced } from '../hooks/useDebounced';
import { dateTime, minutesSince, money, phoneMask } from '../lib/format';

const FILTERS: { value: TabStatus; label: string }[] = [
  { value: 'ABERTA', label: 'Abertas' },
  { value: 'FECHADA', label: 'Fechadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
];

export default function TabsPage() {
  const [status, setStatus] = useState<TabStatus>('ABERTA');
  const [page, setPage] = useState(1);
  const [openModal, setOpenModal] = useState(false);

  const q = useQuery({
    queryKey: ['tabs', status, page],
    queryFn: () => api.get<Paginated<Tab>>('/tabs', { status, page, pageSize: status === 'ABERTA' ? 100 : 20 }),
    placeholderData: keepPreviousData,
    refetchInterval: status === 'ABERTA' ? 20_000 : false, // vários caixas ao mesmo tempo
  });

  return (
    <>
      <PageHeader
        title="Comandas"
        subtitle="Bar e day use por cliente"
        actions={
          <button className="btn-accent" onClick={() => setOpenModal(true)}>
            + Nova comanda
          </button>
        }
      />

      <div role="tablist" className="mb-5 inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={status === f.value}
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              status === f.value ? 'bg-mar-800 text-white' : 'text-mar-800 hover:bg-mar-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.data.length === 0 ? (
        <div className="card">
          <Empty>Nenhuma comanda {FILTERS.find((f) => f.value === status)?.label.toLowerCase()}.</Empty>
        </div>
      ) : status === 'ABERTA' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {q.data.data.map((t) => (
            <Link
              key={t.id}
              to={`/comandas/${t.id}`}
              className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between bg-mar-800 px-4 py-2 text-white">
                <span className="text-sm font-bold">#{t.id}</span>
                <span className="text-xs text-mar-200">aberta há {minutesSince(t.openedAt)} min</span>
              </div>
              <div className="p-4">
                <p className="truncate text-lg font-bold text-mar-900">{t.customer.name}</p>
                <p className="text-xs text-slate-500">
                  {phoneMask(t.customer.phone)} {t.notes && `· ${t.notes}`}
                </p>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-xs text-slate-500">{t.itemsCount} item(ns)</span>
                  <span className="rounded-lg bg-sol-100 px-3 py-1 text-xl font-black text-mar-900">{money(t.total)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th>Fechada em</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {q.data.data.map((t) => (
                <tr key={t.id} className="hover:bg-mar-50/50">
                  <td>
                    <Link className="font-semibold text-mar-700 hover:underline" to={`/comandas/${t.id}`}>
                      #{t.id}
                    </Link>
                  </td>
                  <td>{t.customer.name}</td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>{t.paymentMethod ? PAYMENT_METHODS[t.paymentMethod] : '—'}</td>
                  <td>{t.closedAt ? dateTime(t.closedAt) : '—'}</td>
                  <td className="text-right font-semibold">{money(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...q.data.meta} onChange={setPage} />
        </div>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Nova comanda">
        {openModal && <OpenTabFlow onDone={() => setOpenModal(false)} />}
      </Modal>
    </>
  );
}

function OpenTabFlow({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [notes, setNotes] = useState('');
  const term = useDebounced(search);

  const customers = useQuery({
    queryKey: ['customers', 'search', term],
    queryFn: () => api.get<Paginated<Customer>>('/customers', { q: term, pageSize: 8 }),
    enabled: term.length >= 2,
  });

  const open = useMutation({
    mutationFn: (customerId: number) => api.post<TabDetail>('/tabs', { customerId, notes: notes || undefined }),
    onSuccess: (tab) => {
      qc.invalidateQueries({ queryKey: ['tabs'] });
      toast('ok', `Comanda #${tab.id} aberta`);
      onDone();
      navigate(`/comandas/${tab.id}`);
    },
    onError: (e) => {
      // Cliente já tem comanda aberta: leva direto para ela.
      if (e instanceof ApiError && e.code === 'CUSTOMER_HAS_OPEN_TAB') {
        const id = (e.details as { tabId?: number })?.tabId;
        if (id) {
          toast('ok', `Cliente já tem a comanda #${id} aberta`);
          onDone();
          navigate(`/comandas/${id}`);
        }
      }
    },
  });

  if (creating) {
    return (
      <div className="space-y-4">
        <button className="text-sm font-semibold text-mar-700 hover:underline" onClick={() => setCreating(false)}>
          ← Voltar para busca
        </button>
        <CustomerForm submitLabel="Cadastrar e abrir comanda" onSaved={(c) => open.mutate(c.id)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="cust-search" className="label">
          Buscar cliente (nome, telefone ou CPF)
        </label>
        <input
          id="cust-search"
          className="input"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Digite ao menos 2 caracteres"
        />
      </div>
      <div>
        <label htmlFor="tab-notes" className="label">
          Observação (opcional)
        </label>
        <input id="tab-notes" className="input" maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: Quadra 2 / Guarda-sol 5" />
      </div>

      {customers.isFetching && <Spinner label="Buscando..." />}
      {customers.data && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {customers.data.data.length === 0 && <li className="p-4 text-sm text-slate-500">Nenhum cliente encontrado.</li>}
          {customers.data.data.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-mar-900">{c.name}</p>
                <p className="text-xs text-slate-500">{phoneMask(c.phone)}</p>
              </div>
              {c.openTabId ? (
                <Link to={`/comandas/${c.openTabId}`} onClick={onDone} className="btn-ghost">
                  Ver #{c.openTabId}
                </Link>
              ) : (
                <button className="btn-primary" disabled={open.isPending} onClick={() => open.mutate(c.id)}>
                  Abrir
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <FormError error={open.error} />
      <button className="btn-ghost w-full" onClick={() => setCreating(true)}>
        + Cadastrar novo cliente
      </button>
    </div>
  );
}
