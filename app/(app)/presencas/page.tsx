'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { hour, todayLocal, ymdToBr } from '@/lib/format';
import { STUDENT_LEVELS } from '@/lib/types';
import type { DayCheckIn, StudentLevel } from '@/lib/types';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, PageHeader, Spinner } from '@/components/ui';

export default function AttendancePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayLocal());
  const [level, setLevel] = useState<StudentLevel | 'NONE' | ''>('');
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

  const byLevel = (k: StudentLevel | 'NONE') => (list.data ?? []).filter((c) => (k === 'NONE' ? c.studentLevel === null : c.studentLevel === k)).length;
  const shown = (list.data ?? []).filter((c) => !level || (level === 'NONE' ? c.studentLevel === null : c.studentLevel === level));

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
            <div className="flex flex-wrap items-center gap-2 px-4 pt-4" role="group" aria-label="Filtrar por nível">
              <p className="mr-2 text-sm font-semibold text-mar-900">{list.data.length} aluno(s) em {ymdToBr(date)}</p>
              {([['', 'Todos', list.data.length], ...(Object.keys(STUDENT_LEVELS) as StudentLevel[]).map((k) => [k, STUDENT_LEVELS[k].label, byLevel(k)]), ['NONE', 'Sem nível', byLevel('NONE')]] as [string, string, number][]).map(([k, label, n]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={level === k}
                  onClick={() => setLevel(k as StudentLevel | 'NONE' | '')}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${level === k ? 'border-mar-800 bg-mar-800 text-white' : 'border-white/70 bg-white/60 text-mar-800 hover:bg-white/90'}`}
                >
                  {label} · {n}
                </button>
              ))}
            </div>
            <table className="table">
              <thead><tr><th>Aluno</th><th>Nível</th><th>Horário</th><th /></tr></thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-semibold text-mar-900">{c.studentName}</p>
                      {c.studentName !== c.studentEmail && <p className="text-xs text-slate-500">{c.studentEmail}</p>}
                    </td>
                    <td>{c.studentLevel ? <span className={`badge whitespace-nowrap ${STUDENT_LEVELS[c.studentLevel].badge}`}>{STUDENT_LEVELS[c.studentLevel].label}</span> : <span className="text-slate-400">—</span>}</td>
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
