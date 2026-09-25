import { PaginationQuery, registry, z } from '../../docs/registry.js';

function isValidCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

const onlyDigits = (v: string) => v.replace(/\D/g, '');

const Cpf = z
  .string()
  .transform(onlyDigits)
  .refine(isValidCpf, 'CPF inválido')
  .openapi({ example: '52998224725' });

const Phone = z
  .string()
  .transform(onlyDigits)
  .refine((v) => /^\d{10,13}$/.test(v), 'Telefone inválido')
  .openapi({ example: '22999998888' });

const base = z.object({
  name: z.string().trim().min(2).max(120).openapi({ example: 'João da Silva' }),
  phone: Phone.nullish(),
  cpf: Cpf.nullish(),
});

export const CreateCustomerInput = registry.register('CreateCustomerInput', base);
export const UpdateCustomerInput = registry.register(
  'UpdateCustomerInput',
  base.partial().refine((v) => Object.keys(v).length > 0, 'Informe ao menos um campo'),
);

export const CustomerDTO = registry.register(
  'Customer',
  z.object({
    id: z.number(),
    name: z.string(),
    phone: z.string().nullable(),
    cpf: z.string().nullable(),
    openTabId: z.number().nullable().openapi({ description: 'Comanda aberta do cliente, se houver' }),
    createdAt: z.string(),
  }),
);

export const ListCustomersQuery = PaginationQuery.extend({
  q: z.string().trim().max(120).optional().openapi({ description: 'Busca por nome, telefone ou CPF' }),
});

export type CreateCustomer = z.output<typeof CreateCustomerInput>;
export type UpdateCustomer = z.output<typeof UpdateCustomerInput>;
export type ListCustomers = z.output<typeof ListCustomersQuery>;
