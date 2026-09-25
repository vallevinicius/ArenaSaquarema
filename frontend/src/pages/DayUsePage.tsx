import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { DayUsePlan } from '../api/types';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { Empty, ErrorBox, Field, FormError, PageHeader, Spinner, fieldErrors } from '../components/ui';
import { money } from '../lib/format';

export default function DayUsePage() {
  const [editing, setEditing] = useState<DayUsePlan | 'new' | null>(null);
  const plans = useQuery({ queryKey: ['day-use-plans'], queryFn: () => api.get<DayUsePlan[]>('/day-use-plans') });

  return (
    <>
      <PageHeader
        title="Day Use"
        subtitle="Planos de acesso às quadras vendidos nas comandas"
        actions={<button className="btn-accent" onClick={() => setEditing('new')}>+ Novo plano</button>}
      />
      {plans.isPending ? <Spinner /> : plans.isError ? <ErrorBox error={plans.error} onRetry={() => plans.refetch()} /> : plans.data.length === 0 ? <div className="card"><Empty>Nenhum plano.</Empty></div> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.data.map((p) => (
            <article key={p.id} className={`card overflow-hidden ${p.active ? '' : 'opacity-60'}`}>
              <div className="h-2 bg-gradient-to-r from-mar-800 via-mar-600 to-sol-400" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-extrabold text-mar-900">{p.name}</h2>
                  {!p.active && <span className="badge bg-slate-200 text-slate-600">Inativo</span>}
                </div>
                <p className="mt-1 min-h-10 text-sm text-slate-500">{p.description ?? '—'}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-black text-mar-800">{money(p.price)}</span>
                  <button className="btn-ghost py-1" onClick={() => setEditing(p)}>Editar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo plano' : 'Editar plano'}>
        {editing && <PlanForm plan={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
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
