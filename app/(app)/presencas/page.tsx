'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { hour, todayLocal, ymdToBr } from '@/lib/format';
import type { DayCheckIn } from '@/lib/types';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, PageHeader, Spinner } from '@/components/ui';

export default function AttendancePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayLocal());
  const list = useQuery({ queryKey: ['check-ins', date], queryFn: () => api.get<DayCheckIn[]>('/check-ins', { date }) });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/check-ins/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['check-ins'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      toast('ok', 'Check-in removido');
    },
    onError: () => toast('erro', 'Não foi possível remover'),
  });

  return (
    <>
      <PageHeader
        title="Presenças"
        subtitle="Check-ins feitos pelos alunos no próprio perfil."
        actions={
          <label className="flex items-center gap-2 text-sm font-semibold text-mar-900">
            Dia
            <input type="date" className="input w-auto py-1.5" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
        }
      />
      <div className="card overflow-x-auto">
        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <div className="p-4"><ErrorBox error={list.error} onRetry={() => list.refetch()} /></div>
        ) : list.data.length === 0 ? (
          <Empty>Nenhum check-in em {ymdToBr(date)}.</Empty>
        ) : (
          <>
            <p className="px-4 pt-4 text-sm font-semibold text-mar-900">{list.data.length} aluno(s) em {ymdToBr(date)}</p>
            <table className="table">
              <thead><tr><th>Aluno</th><th>Horário</th><th /></tr></thead>
              <tbody>
                {list.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-semibold text-mar-900">{c.studentName}</p>
                      {c.studentName !== c.studentEmail && <p className="text-xs text-slate-500">{c.studentEmail}</p>}
                    </td>
                    <td>{hour(c.createdAt)}</td>
                    <td className="text-right">
                      <button
                        className="btn-ghost py-1"
                        disabled={remove.isPending}
                        onClick={() => confirm(`Remover o check-in de ${c.studentName}?`) && remove.mutate(c.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
