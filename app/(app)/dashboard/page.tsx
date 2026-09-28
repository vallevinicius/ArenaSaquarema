'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { PAYMENT_METHODS, type Dashboard, type PaymentMethod } from '@/lib/types';
import { IconCheck } from '@/components/icons';
import { Empty, ErrorBox, PageHeader, Spinner } from '@/components/ui';
import { money, todayLocal, ymdToBr } from '@/lib/format';

function shift(ymd: string, days: number) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: 'Hoje', days: 0 },
  { label: '7 dias', days: 6 },
  { label: '30 dias', days: 29 },
];

export default function DashboardPage() {
  const today = todayLocal();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const q = useQuery({
    queryKey: ['dashboard', from, to],
    queryFn: () => api.get<Dashboard>('/dashboard', { from, to }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  return (
    <>
      <PageHeader title="Dashboard" subtitle={from === to ? ymdToBr(from) : `${ymdToBr(from)} a ${ymdToBr(to)}`} />

      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        {PRESETS.map((p) => {
          const active = to === today && from === shift(today, -p.days);
          return (
            <button key={p.label} className={active ? 'btn-primary' : 'btn-ghost'} onClick={() => { setFrom(shift(today, -p.days)); setTo(today); }}>
              {p.label}
            </button>
          );
        })}
        <div className="ml-auto flex flex-wrap gap-3">
          <div>
            <label htmlFor="from" className="label">De</label>
            <input id="from" type="date" className="input" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="to" className="label">Até</label>
            <input id="to" type="date" className="input" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {q.isPending ? <Spinner /> : q.isError ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : <DashboardBody d={q.data} />}
    </>
  );
}

function Kpi({ label, value, hint, accent = false }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${accent ? 'bg-mar-800 text-white' : 'card'}`}>
      <p className={`text-sm font-semibold ${accent ? 'text-sol-400' : 'text-mar-700'}`}>{label}</p>
      <p className={`mt-2 text-3xl ${accent ? 'font-black text-white' : 'font-bold text-mar-900'}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs ${accent ? 'text-mar-200' : 'text-slate-500'}`}>{hint}</p>}
    </div>
  );
}

function DashboardBody({ d }: { d: Dashboard }) {
  const maxDay = Math.max(1, ...d.dailyRevenue.map((x) => Number(x.total)));
  const maxTop = Math.max(1, ...d.topProducts.map((x) => x.quantity));
  const revenue = Number(d.revenue) || 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi accent label="Faturamento" value={money(d.revenue)} hint={`${d.closedTabs} comanda(s) fechada(s)`} />
        <Kpi label="Ticket médio" value={money(d.averageTicket)} />
        <Kpi label="Day use" value={`${d.dayUsePeople} pessoa(s)`} hint={`${money(d.dayUseRevenue)} em day use`} />
        <Kpi label="Comandas abertas" value={String(d.openTabs.count)} hint={`${money(d.openTabs.total)} a receber`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2">
          <h2 className="mb-4 font-bold text-mar-900">Faturamento por dia</h2>
          {d.dailyRevenue.length === 0 ? <Empty>Sem vendas no período.</Empty> : (
            <ul className="space-y-2">
              {d.dailyRevenue.map((x) => (
                <li key={x.date} className="grid grid-cols-[5.5rem_1fr_6.5rem] items-center gap-3 text-sm">
                  <span className="text-slate-600">{ymdToBr(x.date).slice(0, 5)}</span>
                  <div className="h-6 rounded-md bg-mar-50">
                    <div className="h-full rounded-md bg-gradient-to-r from-mar-700 to-mar-500" style={{ width: `${(Number(x.total) / maxDay) * 100}%` }} />
                  </div>
                  <span className="text-right font-semibold text-mar-900">{money(x.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-bold text-mar-900">Bar × Day use</h2>
          <div className="mb-6 flex h-4 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Bar ${money(d.barRevenue)}, day use ${money(d.dayUseRevenue)}`}>
            <div className="bg-mar-700" style={{ width: `${(Number(d.barRevenue) / revenue) * 100}%` }} />
            <div className="bg-sol-400" style={{ width: `${(Number(d.dayUseRevenue) / revenue) * 100}%` }} />
          </div>
          <dl className="mb-6 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="flex items-center gap-2"><span className="size-3 rounded-sm bg-mar-700" />Bar</dt><dd className="font-semibold">{money(d.barRevenue)}</dd></div>
            <div className="flex justify-between"><dt className="flex items-center gap-2"><span className="size-3 rounded-sm bg-sol-400" />Day use</dt><dd className="font-semibold">{money(d.dayUseRevenue)}</dd></div>
          </dl>
          <h3 className="mb-2 text-sm font-bold text-mar-800">Por forma de pagamento</h3>
          {d.byPaymentMethod.length === 0 ? <p className="text-sm text-slate-500">—</p> : (
            <ul className="space-y-1 text-sm">
              {d.byPaymentMethod.map((p) => (
                <li key={p.method} className="flex justify-between">
                  <span>{PAYMENT_METHODS[p.method as PaymentMethod] ?? p.method} <span className="text-slate-400">({p.count})</span></span>
                  <span className="font-semibold">{money(p.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-mar-900">Mais vendidos no bar</h2>
          {d.topProducts.length === 0 ? <Empty>Sem vendas no período.</Empty> : (
            <ol className="space-y-3">
              {d.topProducts.map((p, i) => (
                <li key={p.productId} className="text-sm">
                  <div className="mb-1 flex justify-between">
                    <span className="font-semibold"><span className="mr-2 text-sol-600">{i + 1}.</span>{p.name}</span>
                    <span className="text-slate-600">{p.quantity} un · {money(p.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-sol-100"><div className="h-full rounded-full bg-sol-400" style={{ width: `${(p.quantity / maxTop) * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-mar-900">Estoque baixo</h2>
            <Link href="/estoque" className="text-sm font-semibold text-mar-700 hover:underline">Ver estoque →</Link>
          </div>
          {d.lowStock.length === 0 ? (
            <Empty>
              <span className="inline-flex items-center gap-1.5">
                <IconCheck className="size-4 text-emerald-600" />
                Tudo abastecido
              </span>
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.lowStock.map((p) => (
                <li key={p.id} className="flex justify-between py-2 text-sm">
                  <span className="font-semibold">{p.name}</span>
                  <span className="badge bg-red-100 text-red-700">{p.stock} / mín. {p.minStock}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
