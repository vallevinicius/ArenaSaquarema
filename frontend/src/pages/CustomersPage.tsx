import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Customer, Paginated } from '../api/types';
import { CustomerForm } from '../components/CustomerForm';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { Empty, ErrorBox, PageHeader, Pagination, Spinner } from '../components/ui';
import { useDebounced } from '../hooks/useDebounced';
import { cpfMask, phoneMask } from '../lib/format';

export default function CustomersPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Customer | 'new' | null>(null);
  const q = useDebounced(search);

  const customers = useQuery({
    queryKey: ['customers', { page, q }],
    queryFn: () => api.get<Paginated<Customer>>('/customers', { page, q }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Atletas e visitantes da arena"
        actions={<button className="btn-accent" onClick={() => setEditing('new')}>+ Novo cliente</button>}
      />
      <input className="input mb-4 max-w-md" placeholder="Buscar por nome, telefone ou CPF..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Buscar cliente" />

      <div className="card overflow-x-auto">
        {customers.isPending ? <Spinner /> : customers.isError ? <div className="p-4"><ErrorBox error={customers.error} onRetry={() => customers.refetch()} /></div> : customers.data.data.length === 0 ? <Empty>Nenhum cliente.</Empty> : (
          <>
            <table className="table">
              <thead><tr><th>Nome</th><th>Telefone</th><th>CPF</th><th>Comanda</th><th /></tr></thead>
              <tbody>
                {customers.data.data.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold text-mar-900">{c.name}</td>
                    <td>{phoneMask(c.phone)}</td>
                    <td>{cpfMask(c.cpf)}</td>
                    <td>{c.openTabId ? <Link className="badge bg-sol-100 text-sol-700 hover:underline" to={`/comandas/${c.openTabId}`}>Aberta #{c.openTabId}</Link> : '—'}</td>
                    <td className="text-right"><button className="btn-ghost py-1" onClick={() => setEditing(c)}>Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...customers.data.meta} onChange={setPage} />
          </>
        )}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo cliente' : 'Editar cliente'}>
        {editing && (
          <CustomerForm
            customer={editing === 'new' ? undefined : editing}
            onSaved={() => { toast('ok', 'Cliente salvo'); setEditing(null); }}
          />
        )}
      </Modal>
    </>
  );
}
