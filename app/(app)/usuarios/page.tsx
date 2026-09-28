'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import type { Paginated, User } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, Field, FormError, PageHeader, Pagination, Select, Spinner, fieldErrors } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const users = useQuery({ queryKey: ['users', page], queryFn: () => api.get<Paginated<User>>('/users', { page }) });

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Equipe com acesso ao sistema"
        actions={<button className="btn-accent" onClick={() => setEditing('new')}>+ Novo usuário</button>}
      />
      <div className="card overflow-x-auto">
        {users.isPending ? <Spinner /> : users.isError ? <div className="p-4"><ErrorBox error={users.error} onRetry={() => users.refetch()} /></div> : users.data.data.length === 0 ? <Empty>Nenhum usuário.</Empty> : (
          <>
            <table className="table">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th /></tr></thead>
              <tbody>
                {users.data.data.map((u) => (
                  <tr key={u.id} className={u.active ? '' : 'opacity-50'}>
                    <td className="font-semibold text-mar-900">{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.role === 'ADMIN' ? 'bg-sol-100 text-sol-700' : 'bg-mar-100 text-mar-800'}`}>{u.role === 'ADMIN' ? 'Admin' : 'Operador'}</span></td>
                    <td>{u.active ? 'Ativo' : 'Inativo'}</td>
                    <td className="text-right"><button className="btn-ghost py-1" onClick={() => setEditing(u)}>Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...users.data.meta} onChange={setPage} />
          </>
        )}
      </div>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo usuário' : 'Editar usuário'}>
        {editing && <UserForm target={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function UserForm({ target, onDone }: { target?: User; onDone: () => void }) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const isSelf = target?.id === me?.id;
  const m = useMutation({
    mutationFn: (body: object) => (target ? api.patch(`/users/${target.id}`, body) : api.post('/users', body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast('ok', 'Usuário salvo');
      onDone();
    },
  });
  const fe = fieldErrors(m.error);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password') ?? '');
    const body: Record<string, unknown> = { name: String(f.get('name')).trim() };
    // Select desabilitado não entra no FormData; o backend também bloqueia auto-rebaixamento.
    if (!isSelf) body.role = f.get('role');
    if (target) {
      if (!isSelf) body.active = f.get('active') === 'on';
      if (password) body.password = password;
    } else {
      body.email = String(f.get('email')).trim();
      body.password = password;
    }
    m.mutate(body);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nome" name="name" required minLength={2} maxLength={120} defaultValue={target?.name} error={fe.name} />
      {!target && <Field label="E-mail" name="email" type="email" required maxLength={160} error={fe.email} />}
      <Select label="Perfil" name="role" defaultValue={target?.role ?? 'OPERADOR'} disabled={isSelf}>
        <option value="OPERADOR">Operador (caixa: comandas e clientes)</option>
        <option value="ADMIN">Administrador (tudo)</option>
      </Select>
      <Field
        label={target ? 'Nova senha (deixe vazio para manter)' : 'Senha'}
        name="password" type="password" autoComplete="new-password"
        required={!target} minLength={10} maxLength={72} hint="Mínimo 10 caracteres" error={fe.password}
      />
      {target && !isSelf && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="active" className="size-4 accent-mar-800" defaultChecked={target.active} /> Ativo
        </label>
      )}
      {target && <p className="text-xs text-slate-500">Alterar perfil, status ou senha encerra as sessões abertas desse usuário.</p>}
      <FormError error={m.error} />
      <button className="btn-primary w-full" disabled={m.isPending}>{m.isPending ? 'Salvando...' : 'Salvar'}</button>
    </form>
  );
}
