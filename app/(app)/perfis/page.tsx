'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import { PERMISSION_INFO, PERMISSION_KEYS, type Permission } from '@/lib/permissions';
import type { Profile } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, Field, FormError, PageHeader, Spinner, fieldErrors } from '@/components/ui';

export default function ProfilesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Profile | 'new' | null>(null);
  const profiles = useQuery({ queryKey: ['profiles'], queryFn: () => api.get<Profile[]>('/profiles') });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/profiles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast('ok', 'Perfil excluído');
    },
    onError: (e) => toast('erro', e instanceof Error ? e.message : 'Não foi possível excluir'),
  });

  return (
    <>
      <PageHeader
        title="Perfis de acesso"
        subtitle="Cada perfil libera um conjunto de áreas. Ao criar um usuário da equipe, você escolhe o perfil dele. Só o administrador gerencia perfis e usuários."
        actions={<button className="btn-accent" onClick={() => setEditing('new')}>+ Novo perfil</button>}
      />

      {profiles.isPending ? (
        <Spinner />
      ) : profiles.isError ? (
        <ErrorBox error={profiles.error} onRetry={() => profiles.refetch()} />
      ) : profiles.data.length === 0 ? (
        <div className="card"><Empty>Nenhum perfil. Crie o primeiro.</Empty></div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {profiles.data.map((p) => (
            <li key={p.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-mar-900">{p.name}</h2>
                  {p.description && <p className="text-sm text-slate-500">{p.description}</p>}
                  <p className="mt-1 text-xs font-semibold text-mar-700">{p.usersCount} usuário(s)</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button className="btn-ghost py-1" onClick={() => setEditing(p)}>Editar</button>
                  <button
                    className="btn-ghost py-1 text-red-700"
                    disabled={remove.isPending}
                    onClick={() => confirm(`Excluir o perfil "${p.name}"?`) && remove.mutate(p.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {p.permissions.length === 0 ? (
                  <li className="text-sm text-slate-500">Nenhuma área liberada</li>
                ) : (
                  p.permissions.map((k) => (
                    <li key={k} className="badge bg-mar-100 text-mar-800">{PERMISSION_INFO[k].label}</li>
                  ))
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo perfil' : 'Editar perfil'} size="lg">
        {editing && <ProfileForm target={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function ProfileForm({ target, onDone }: { target?: Profile; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<Permission>>(new Set(target?.permissions ?? []));
  const m = useMutation({
    mutationFn: (body: object) => (target ? api.patch(`/profiles/${target.id}`, body) : api.post('/profiles', body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      toast('ok', 'Perfil salvo');
      onDone();
    },
  });
  const fe = fieldErrors(m.error);

  const toggle = (k: Permission) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const description = String(f.get('description') ?? '').trim();
    m.mutate({
      name: String(f.get('name')).trim(),
      ...(target ? { description: description || null } : description ? { description } : {}),
      permissions: PERMISSION_KEYS.filter((k) => selected.has(k)),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nome do perfil" name="name" required minLength={2} maxLength={60} defaultValue={target?.name} error={fe.name} autoFocus />
      <Field label="Descrição (opcional)" name="description" maxLength={160} defaultValue={target?.description ?? ''} error={fe.description} />

      <fieldset>
        <div className="mb-2 flex items-center justify-between">
          <legend className="label mb-0">Áreas que este perfil pode usar</legend>
          <button type="button" className="text-sm font-semibold text-mar-700 hover:underline" onClick={() => setSelected(selected.size === PERMISSION_KEYS.length ? new Set() : new Set(PERMISSION_KEYS))}>
            {selected.size === PERMISSION_KEYS.length ? 'Desmarcar tudo' : 'Marcar tudo'}
          </button>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PERMISSION_KEYS.map((k) => (
            <li key={k}>
              <label className={`flex h-full cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${selected.has(k) ? 'border-mar-600 bg-mar-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="checkbox" className="mt-0.5 size-4 accent-mar-800" checked={selected.has(k)} onChange={() => toggle(k)} />
                <span>
                  <span className="block text-sm font-bold text-mar-900">{PERMISSION_INFO[k].label}</span>
                  <span className="block text-xs text-slate-500">{PERMISSION_INFO[k].description}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">Usuários e perfis ficam sempre só com o administrador. A mudança vale na hora para quem já usa o perfil.</p>
      </fieldset>

      <FormError error={m.error} />
      <button className="btn-primary w-full" disabled={m.isPending}>{m.isPending ? 'Salvando...' : 'Salvar perfil'}</button>
    </form>
  );
}
