'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import { maskPhoneInput, phoneMask, todayLocal } from '@/lib/format';
import { STUDENT_LEVELS } from '@/lib/types';
import type { Student, StudentLevel, StudentList } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, Field, FormError, PageHeader, Pagination, Select, Spinner, fieldErrors } from '@/components/ui';

export default function StudentsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState(todayLocal().slice(0, 7));
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [level, setLevel] = useState<StudentLevel | 'NONE' | ''>('');
  const students = useQuery({
    queryKey: ['students', page, month, level],
    queryFn: () => api.get<StudentList>('/students', { page, month, ...(level && { level }) }),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`/students/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast('ok', 'resetPassword' in v.body ? 'Senha voltou para a padrão' : 'Aluno atualizado');
    },
    onError: () => toast('erro', 'Não foi possível atualizar o aluno'),
  });

  return (
    <>
      <PageHeader
        title="Alunos"
        subtitle="Cadastre pelo e-mail. A senha inicial é mudar123; no primeiro acesso o aluno confirma um código enviado ao e-mail e escolhe a própria senha."
        actions={
          <>
            <label className="flex items-center gap-2 text-sm font-semibold text-mar-900">
              Mês
              <input type="month" className="input w-auto py-1.5" value={month} max={todayLocal().slice(0, 7)} onChange={(e) => e.target.value && (setMonth(e.target.value), setPage(1))} />
            </label>
            <button className="btn-accent" onClick={() => setCreating(true)}>+ Novo aluno</button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por nível">
        {([['', 'Todos'], ...Object.entries(STUDENT_LEVELS).map(([k, v]) => [k, v.label]), ['NONE', 'Sem nível']] as [string, string][]).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={level === k}
            onClick={() => (setLevel(k as StudentLevel | 'NONE' | ''), setPage(1))}
            className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${level === k ? 'border-mar-800 bg-mar-800 text-white' : 'border-white/70 bg-white/60 text-mar-800 hover:bg-white/90'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {students.isPending ? (
          <Spinner />
        ) : students.isError ? (
          <div className="p-4"><ErrorBox error={students.error} onRetry={() => students.refetch()} /></div>
        ) : students.data.data.length === 0 ? (
          <Empty>Nenhum aluno cadastrado. Use “Novo aluno” para criar o primeiro acesso.</Empty>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr><th>Aluno</th><th>Nível</th><th>Situação</th><th>Presença no mês</th><th /></tr>
              </thead>
              <tbody>
                {students.data.data.map((s) => (
                  <tr key={s.id} className={s.active ? '' : 'opacity-50'}>
                    <td>
                      <p className="font-semibold text-mar-900">{s.name}</p>
                      {s.name !== s.email && <p className="text-xs text-slate-500">{s.email}</p>}
                      {s.phone && <p className="text-xs text-slate-500">{phoneMask(s.phone)}</p>}
                    </td>
                    <td>{s.level ? <span className={`badge whitespace-nowrap ${STUDENT_LEVELS[s.level].badge}`}>{STUDENT_LEVELS[s.level].label}</span> : <span className="text-slate-400">—</span>}</td>
                    <td><Situation s={s} /></td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-mar-100" role="img" aria-label={`${s.presenceRate}% de presença`}>
                          <div className="h-full bg-sol-400" style={{ width: `${s.presenceRate}%` }} />
                        </div>
                        <span className="text-sm font-bold text-mar-900">{s.presenceRate}%</span>
                        <span className="text-xs text-slate-500">{s.daysAttended} de {students.data.classDays} dias</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1">
                        <button className="btn-ghost py-1" onClick={() => setEditing(s)}>Editar</button>
                        <button
                          className="btn-ghost py-1"
                          disabled={patch.isPending}
                          onClick={() => confirm(`Voltar a senha de ${s.name} para mudar123? O aluno precisará de um novo código por e-mail.`) && patch.mutate({ id: s.id, body: { resetPassword: true } })}
                        >
                          Resetar senha
                        </button>
                        <button className="btn-ghost py-1" disabled={patch.isPending} onClick={() => patch.mutate({ id: s.id, body: { active: !s.active } })}>
                          {s.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...students.data.meta} onChange={setPage} />
          </>
        )}
      </div>
      <Modal open={creating} onClose={() => setCreating(false)} title="Novo aluno">
        {creating && <StudentForm onDone={() => setCreating(false)} />}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Editar · ${editing?.name ?? ''}`}>
        {editing && <StudentForm student={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function Situation({ s }: { s: Student }) {
  if (!s.active) return <span className="badge bg-slate-200 text-slate-600">Inativo</span>;
  if (s.mustChangePassword) return <span className="badge bg-sol-100 text-sol-700">Aguardando 1º acesso</span>;
  return <span className="badge bg-mar-100 text-mar-800">Ativo</span>;
}

function StudentForm({ student, onDone }: { student?: Student; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [phone, setPhone] = useState(student?.phone ? maskPhoneInput(student.phone) : '');
  const m = useMutation({
    mutationFn: (body: object) => (student ? api.patch<Student>(`/students/${student.id}`, body) : api.post<Student>('/students', body)),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast('ok', student ? 'Aluno atualizado' : `Aluno criado. Senha inicial: mudar123 (${s.email})`);
      onDone();
    },
  });
  const fe = fieldErrors(m.error);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') ?? '').trim();
    const level = String(f.get('level') ?? '');
    if (student) {
      m.mutate({ ...(name && { name }), level: level || null, phone: phone.trim() });
    } else {
      m.mutate({ email: String(f.get('email')).trim(), ...(name && { name }), ...(level && { level }), ...(phone.trim() && { phone }) });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!student && <Field label="E-mail do aluno" name="email" type="email" required maxLength={160} autoFocus error={fe.email} hint="O código de acesso será enviado para este e-mail." />}
      <Field label={student ? 'Nome' : 'Nome (opcional)'} name="name" minLength={2} maxLength={120} defaultValue={student && student.name !== student.email ? student.name : ''} error={fe.name} />
      <Select label="Nível" name="level" defaultValue={student?.level ?? ''}>
        <option value="">Sem nível</option>
        {(Object.keys(STUDENT_LEVELS) as StudentLevel[]).map((k) => <option key={k} value={k}>{STUDENT_LEVELS[k].label}</option>)}
      </Select>
      <Field label="Telefone com DDD (opcional)" name="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhoneInput(e.target.value))} error={fe.phone} hint="Usado nos avisos de mensalidade e de aula." />
      {!student && (
        <p className="rounded-lg bg-mar-50 px-3 py-2 text-sm text-mar-900">
          Senha inicial: <strong>mudar123</strong>. No primeiro login o aluno recebe um código por e-mail e define a própria senha.
        </p>
      )}
      <FormError error={m.error} />
      <button className="btn-primary w-full" disabled={m.isPending}>{m.isPending ? 'Salvando...' : student ? 'Salvar' : 'Criar aluno'}</button>
    </form>
  );
}
