'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { todayLocal } from '@/lib/format';
import type { MyAttendance } from '@/lib/types';
import { Emblem } from '@/components/Logo';
import { useToast } from '@/components/Toast';
import { ErrorBox, FormError, Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

const thisMonth = () => todayLocal().slice(0, 7);
const shiftMonth = (m: string, delta: number) => {
  const [y, mo] = m.split('-').map(Number) as [number, number];
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number) as [number, number];
  return new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};
const dayLabel = (ymd: string) =>
  new Date(`${ymd}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });

export default function StudentPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [month, setMonth] = useState(thisMonth());
  const att = useQuery({ queryKey: ['me', 'attendance', month], queryFn: () => api.get<MyAttendance>('/me/attendance', { month }) });

  const checkIn = useMutation({
    mutationFn: () => api.post('/me/check-in'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'attendance'] });
      toast('ok', 'Check-in feito. Bom treino!');
    },
    onError: () => qc.invalidateQueries({ queryKey: ['me', 'attendance'] }),
  });

  const isCurrent = month === thisMonth();
  const firstName = user?.name.includes('@') ? user.name.split('@')[0] : user?.name.split(' ')[0];

  return (
    <>
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Arena Saquarema, site">
          <Emblem size={44} />
          <span className="font-display text-2xl leading-[0.85] font-black text-mar-900">
            ARENA
            <span className="block text-base tracking-[0.2em] text-mar-700">SAQUAREMA</span>
          </span>
        </Link>
        <button
          className="rounded-full border-2 border-mar-900 px-4 py-2 text-sm font-bold text-mar-900 hover:bg-mar-900 hover:text-white"
          onClick={async () => { await logout(); router.replace('/'); }}
        >
          Sair
        </button>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 pb-16">
        <h1 className="font-display text-5xl leading-[0.9] font-black text-mar-900 uppercase sm:text-7xl">Oi, {firstName}</h1>

        {att.isPending ? (
          <Spinner />
        ) : att.isError ? (
          <ErrorBox error={att.error} onRetry={() => att.refetch()} />
        ) : (
          <>
            {isCurrent && (
              <section className={`p-6 sm:p-8 ${att.data.checkedInToday ? 'bg-mar-800 text-white' : 'bg-sol-400 text-mar-950'}`}>
                {att.data.checkedInToday ? (
                  <>
                    <p className="font-display text-4xl leading-none font-black uppercase sm:text-5xl">Presença de hoje confirmada</p>
                    <p className="mt-2 text-mar-100">Bom treino! Volte amanhã para o próximo check-in.</p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-4xl leading-none font-black uppercase sm:text-5xl">Você está na arena?</p>
                    <p className="mt-2 font-medium">Faça o check-in do dia para marcar a sua presença.</p>
                    <button
                      className="mt-5 rounded-full bg-mar-900 px-8 py-4 text-lg font-extrabold text-white transition hover:bg-mar-800 disabled:opacity-60"
                      disabled={checkIn.isPending}
                      onClick={() => checkIn.mutate()}
                    >
                      {checkIn.isPending ? 'Registrando...' : 'Fazer check-in de hoje'}
                    </button>
                    <div className="mt-3"><FormError error={checkIn.error} /></div>
                  </>
                )}
              </section>
            )}

            <section className="bg-areia-50 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <button className="rounded-full px-3 py-1.5 text-sm font-bold text-mar-800 hover:bg-mar-900/10" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">←</button>
                <h2 className="text-lg font-extrabold text-mar-900 capitalize">{monthLabel(month)}</h2>
                <button className="rounded-full px-3 py-1.5 text-sm font-bold text-mar-800 hover:bg-mar-900/10 disabled:opacity-30" disabled={isCurrent} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">→</button>
              </div>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-[5.5rem] sm:text-[7rem] leading-[0.8] font-black text-mar-800">{att.data.presenceRate}%</span>
                <span className="text-lg font-bold text-mar-900">de presença</span>
              </p>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-mar-100" role="img" aria-label={`${att.data.presenceRate}% de presença`}>
                <div className="h-full bg-sol-400 transition-[width] duration-700" style={{ width: `${att.data.presenceRate}%` }} />
              </div>
              <p className="mt-3 text-mar-800">
                Você foi em <strong>{att.data.daysAttended}</strong> de <strong>{att.data.classDays}</strong> dias de aula neste mês.
              </p>
            </section>

            <section className="bg-areia-50 p-6 sm:p-8">
              <h2 className="font-display text-3xl font-black text-mar-900 uppercase">Seus dias</h2>
              {att.data.days.length === 0 ? (
                <p className="mt-3 text-mar-800">Nenhum check-in neste mês.</p>
              ) : (
                <ul className="mt-4 divide-y divide-mar-900/10">
                  {att.data.days.map((d) => (
                    <li key={d} className="flex items-center gap-3 py-2.5 font-semibold text-mar-900 capitalize">
                      <span className="size-2.5 rounded-full bg-sol-400" aria-hidden="true" />
                      {dayLabel(d)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
