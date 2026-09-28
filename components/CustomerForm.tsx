'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import type { Customer } from '@/lib/types';
import { maskCpfInput, maskPhoneInput } from '@/lib/format';
import { Field, FormError, fieldErrors } from './ui';

type Props = { customer?: Customer; onSaved: (c: Customer) => void; submitLabel?: string };

export function CustomerForm({ customer, onSaved, submitLabel = 'Salvar' }: Props) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(maskPhoneInput(customer?.phone ?? ''));
  const [cpf, setCpf] = useState(maskCpfInput(customer?.cpf ?? ''));
  const m = useMutation({
    mutationFn: (body: Record<string, string | null>) =>
      customer ? api.patch<Customer>(`/customers/${customer.id}`, body) : api.post<Customer>('/customers', body),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      onSaved(c);
    },
  });
  const fe = fieldErrors(m.error);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const opt = (k: string) => (String(f.get(k) ?? '').trim() || null);
    m.mutate({ name: String(f.get('name')).trim(), phone: opt('phone'), cpf: opt('cpf') });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nome" name="name" required minLength={2} maxLength={120} defaultValue={customer?.name} error={fe.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Telefone"
          name="phone"
          inputMode="tel"
          placeholder="(22) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
          error={fe.phone}
        />
        <Field
          label="CPF"
          name="cpf"
          inputMode="numeric"
          placeholder="Opcional"
          value={cpf}
          onChange={(e) => setCpf(maskCpfInput(e.target.value))}
          error={fe.cpf}
        />
      </div>
      <FormError error={m.error} />
      <button className="btn-primary w-full" disabled={m.isPending}>
        {m.isPending ? 'Salvando...' : submitLabel}
      </button>
    </form>
  );
}
