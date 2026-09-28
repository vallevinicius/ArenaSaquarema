'use client';

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { ApiError } from '@/lib/api-client';

export function Spinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-mar-700">
      <span className="size-6 animate-spin rounded-full border-4 border-mar-100 border-t-sol-400" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof ApiError ? error.message : 'Erro inesperado';
  return (
    <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <span>
        <strong>Erro:</strong> {msg}
      </span>
      {onRetry && (
        <button className="btn-ghost" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-slate-500">{children}</p>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-mar-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string[]; hint?: string };

export function Field({ label, error, hint, id, ...props }: FieldProps) {
  const fid = id ?? props.name;
  const errId = `${fid}-error`;
  return (
    <div>
      <label htmlFor={fid} className="label">
        {label}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={fid}
        className="input"
        aria-invalid={error?.length ? true : undefined}
        aria-errormessage={error?.length ? errId : undefined}
        {...props}
      />
      {hint && !error?.length && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {!!error?.length && (
        <p id={errId} className="mt-1 text-xs font-medium text-red-700">
          ⚠ {error.join(', ')}
        </p>
      )}
    </div>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode };
export function Select({ label, id, children, ...props }: SelectProps) {
  const fid = id ?? props.name;
  return (
    <div>
      <label htmlFor={fid} className="label">
        {label}
      </label>
      <select id={fid} className="input" {...props}>
        {children}
      </select>
    </div>
  );
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  const msg = error instanceof ApiError ? error.message : 'Erro inesperado';
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      ⚠ {msg}
    </p>
  );
}

export const fieldErrors = (error: unknown) => (error instanceof ApiError ? error.fieldErrors : {});

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-between px-4 py-3 text-sm text-slate-600" aria-label="Paginação">
      <span>
        {total} registro(s) · página {page} de {pages}
      </span>
      <div className="flex gap-2">
        <button className="btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Anterior
        </button>
        <button className="btn-ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Próxima
        </button>
      </div>
    </nav>
  );
}

const statusStyle: Record<string, string> = {
  ABERTA: 'bg-sol-100 text-sol-700',
  FECHADA: 'bg-mar-100 text-mar-800',
  CANCELADA: 'bg-slate-200 text-slate-600',
};
export const StatusBadge = ({ status }: { status: string }) => (
  <span className={`badge ${statusStyle[status] ?? 'bg-slate-100'}`}>{status}</span>
);
