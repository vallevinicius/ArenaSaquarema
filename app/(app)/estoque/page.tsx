'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { MOVEMENT_TYPES, type MovementType, type Paginated, type Product, type StockMovement } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, Field, FormError, PageHeader, Pagination, Select, Spinner, fieldErrors } from '@/components/ui';
import { dateTime } from '@/lib/format';

const typeStyle: Record<MovementType, string> = {
  ENTRADA: 'bg-mar-100 text-mar-800',
  SAIDA: 'bg-red-100 text-red-700',
  AJUSTE: 'bg-slate-200 text-slate-700',
  VENDA: 'bg-sol-100 text-sol-700',
  ESTORNO: 'bg-emerald-100 text-emerald-700',
};

export default function StockPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<MovementType | ''>('');
  const [productId, setProductId] = useState('');
  const [open, setOpen] = useState(false);

  const products = useQuery({
    queryKey: ['products', 'tracked'],
    queryFn: () => api.get<Paginated<Product>>('/products', { pageSize: 100 }),
    select: (d) => d.data.filter((p) => p.trackStock),
  });
  const low = (products.data ?? []).filter((p) => p.lowStock && p.active);

  const moves = useQuery({
    queryKey: ['stock', { page, type, productId }],
    queryFn: () => api.get<Paginated<StockMovement>>('/stock/movements', { page, type, productId }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Estoque"
        subtitle="Entradas, saídas, ajustes de inventário e baixas automáticas das comandas"
        actions={<button className="btn-accent" onClick={() => setOpen(true)}>+ Movimentação</button>}
      />

      {low.length > 0 && (
        <div role="alert" className="mb-6 rounded-2xl border-l-4 border-sol-500 bg-sol-50 p-4">
          <p className="mb-2 font-bold text-mar-900">⚠ {low.length} produto(s) com estoque baixo</p>
          <div className="flex flex-wrap gap-2">
            {low.map((p) => (
              <span key={p.id} className="badge bg-white text-mar-900 ring-1 ring-sol-300">
                {p.name}: {p.stock} (mín. {p.minStock})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2">
        <select className="input" value={productId} onChange={(e) => { setProductId(e.target.value); setPage(1); }} aria-label="Produto">
          <option value="">Todos os produtos</option>
          {products.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" value={type} onChange={(e) => { setType(e.target.value as MovementType | ''); setPage(1); }} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {Object.entries(MOVEMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        {moves.isPending ? <Spinner /> : moves.isError ? <div className="p-4"><ErrorBox error={moves.error} onRetry={() => moves.refetch()} /></div> : moves.data.data.length === 0 ? <Empty>Nenhuma movimentação.</Empty> : (
          <>
            <table className="table">
              <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th className="text-right">Qtd</th><th className="text-right">Saldo</th><th>Motivo</th><th>Usuário</th></tr></thead>
              <tbody>
                {moves.data.data.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap">{dateTime(m.createdAt)}</td>
                    <td className="font-semibold text-mar-900">{m.productName}</td>
                    <td><span className={`badge ${typeStyle[m.type]}`}>{MOVEMENT_TYPES[m.type]}</span></td>
                    <td className={`text-right font-bold ${m.quantity < 0 ? 'text-red-600' : 'text-mar-800'}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                    <td className="text-right">{m.balance}</td>
                    <td>{m.tabId ? <Link className="text-mar-700 hover:underline" href={`/comandas/${m.tabId}`}>{m.reason}</Link> : m.reason ?? '—'}</td>
                    <td>{m.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...moves.data.meta} onChange={setPage} />
          </>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova movimentação">
        {open && <MovementForm products={products.data ?? []} onDone={() => setOpen(false)} />}
      </Modal>
    </>
  );
}

function MovementForm({ products, onDone }: { products: Product[]; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState<'ENTRADA' | 'SAIDA' | 'AJUSTE'>('ENTRADA');
  const m = useMutation({
    mutationFn: (body: object) => api.post('/stock/movements', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast('ok', 'Movimentação registrada');
      onDone();
    },
  });
  const fe = fieldErrors(m.error);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = Number(f.get('qty'));
    const reason = String(f.get('reason') ?? '').trim() || undefined;
    m.mutate({
      type,
      productId: Number(f.get('productId')),
      ...(type === 'AJUSTE' ? { countedStock: n } : { quantity: n }),
      reason,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset className="grid grid-cols-3 gap-2">
        <legend className="label">Tipo</legend>
        {(['ENTRADA', 'SAIDA', 'AJUSTE'] as const).map((t) => (
          <label key={t} className={`cursor-pointer rounded-lg border-2 px-3 py-2 text-center text-sm font-semibold ${type === t ? 'border-mar-800 bg-mar-800 text-white' : 'border-slate-200 text-mar-800'}`}>
            <input type="radio" className="sr-only" checked={type === t} onChange={() => setType(t)} />
            {MOVEMENT_TYPES[t]}
          </label>
        ))}
      </fieldset>
      <Select label="Produto" name="productId" required defaultValue="">
        <option value="" disabled>Selecione...</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.name} (atual: {p.stock})</option>)}
      </Select>
      <Field
        label={type === 'AJUSTE' ? 'Quantidade contada (valor final)' : 'Quantidade'}
        name="qty" type="number" required min={type === 'AJUSTE' ? 0 : 1} error={fe.quantity ?? fe.countedStock}
      />
      <Field
        label="Motivo" name="reason" required={type !== 'ENTRADA'} minLength={type !== 'ENTRADA' ? 3 : undefined} maxLength={255}
        placeholder={type === 'ENTRADA' ? 'Ex.: NF 1234 - Distribuidora' : type === 'SAIDA' ? 'Ex.: garrafa quebrada' : 'Ex.: inventário semanal'}
        error={fe.reason}
      />
      <FormError error={m.error} />
      <button className="btn-primary w-full" disabled={m.isPending}>{m.isPending ? 'Salvando...' : 'Registrar'}</button>
    </form>
  );
}
