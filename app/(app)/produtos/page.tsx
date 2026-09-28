'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import { CATEGORIES, type Category, type Paginated, type Product } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, Field, FormError, PageHeader, Pagination, Select, Spinner, fieldErrors } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useDebounced } from '@/hooks/useDebounced';
import { money } from '@/lib/format';

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [lowStock, setLowStock] = useState(false);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const q = useDebounced(search);

  const products = useQuery({
    queryKey: ['products', { page, q, category, lowStock }],
    queryFn: () => api.get<Paginated<Product>>('/products', { page, q, category, lowStock: lowStock || undefined }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Bar / Produtos"
        subtitle="Bebidas e petiscos vendidos na arena"
        actions={isAdmin && <button className="btn-accent" onClick={() => setEditing('new')}>+ Novo produto</button>}
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_14rem_auto]">
        <input className="input" placeholder="Buscar por nome..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Buscar" />
        <select className="input" value={category} onChange={(e) => { setCategory(e.target.value as Category | ''); setPage(1); }} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-medium text-mar-800">
          <input type="checkbox" className="size-4 accent-mar-800" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }} />
          Só estoque baixo
        </label>
      </div>

      <div className="card overflow-x-auto">
        {products.isPending ? <Spinner /> : products.isError ? <div className="p-4"><ErrorBox error={products.error} onRetry={() => products.refetch()} /></div> : products.data.data.length === 0 ? <Empty>Nenhum produto encontrado.</Empty> : (
          <>
            <table className="table">
              <thead>
                <tr><th>Produto</th><th>Categoria</th><th className="text-right">Preço</th><th className="text-right">Estoque</th><th>Status</th>{isAdmin && <th />}</tr>
              </thead>
              <tbody>
                {products.data.data.map((p) => (
                  <tr key={p.id} className={p.active ? '' : 'opacity-50'}>
                    <td className="font-semibold text-mar-900">{p.name}</td>
                    <td>{CATEGORIES[p.category]}</td>
                    <td className="text-right font-semibold">{money(p.price)}</td>
                    <td className="text-right">
                      {p.trackStock ? (
                        <span className={p.lowStock ? 'badge bg-red-100 text-red-700' : ''}>
                          {p.stock} {p.lowStock && `(mín. ${p.minStock})`}
                        </span>
                      ) : <span className="text-xs text-slate-400">não controla</span>}
                    </td>
                    <td>{p.active ? <span className="badge bg-mar-100 text-mar-800">Ativo</span> : <span className="badge bg-slate-200 text-slate-600">Inativo</span>}</td>
                    {isAdmin && <td className="text-right"><button className="btn-ghost py-1" onClick={() => setEditing(p)}>Editar</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...products.data.meta} onChange={setPage} />
          </>
        )}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo produto' : 'Editar produto'}>
        {editing && <ProductForm product={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [trackStock, setTrackStock] = useState(product?.trackStock ?? true);
  const m = useMutation({
    mutationFn: (body: object) => (product ? api.patch(`/products/${product.id}`, body) : api.post('/products', body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast('ok', product ? 'Produto atualizado' : 'Produto cadastrado');
      onDone();
    },
  });
  const fe = fieldErrors(m.error);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      name: String(f.get('name')).trim(),
      category: f.get('category'),
      price: Number(String(f.get('price')).replace(',', '.')),
      trackStock,
      minStock: trackStock ? Number(f.get('minStock') || 0) : 0,
    };
    if (product) body.active = f.get('active') === 'on';
    else body.initialStock = trackStock ? Number(f.get('initialStock') || 0) : 0;
    m.mutate(body);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nome" name="name" required minLength={2} maxLength={120} defaultValue={product?.name} error={fe.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Categoria" name="category" defaultValue={product?.category ?? 'CERVEJA'}>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Field label="Preço (R$)" name="price" required inputMode="decimal" pattern="\d+([.,]\d{1,2})?" defaultValue={product?.price} error={fe.price} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="size-4 accent-mar-800" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} />
        Controlar estoque (desmarque para drinks/porções preparados na hora)
      </label>
      {trackStock && (
        <div className="grid gap-4 sm:grid-cols-2">
          {!product && <Field label="Estoque inicial" name="initialStock" type="number" min={0} defaultValue={0} error={fe.initialStock} />}
          <Field label="Estoque mínimo (alerta)" name="minStock" type="number" min={0} defaultValue={product?.minStock ?? 0} error={fe.minStock} />
        </div>
      )}
      {product && (
        <>
          <p className="text-xs text-slate-500">Para alterar a quantidade em estoque use a tela Estoque (fica registrado no histórico).</p>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="active" className="size-4 accent-mar-800" defaultChecked={product.active} /> Ativo (aparece nas comandas)
          </label>
        </>
      )}
      <FormError error={m.error} />
      <button className="btn-primary w-full" disabled={m.isPending}>{m.isPending ? 'Salvando...' : 'Salvar'}</button>
    </form>
  );
}
