import { PaginationQuery, registry, z } from '../../docs/registry';
import { isMonth } from '../attendance/attendance.utils';

export const LevelEnum = z.enum(['INICIANTE_A', 'INICIANTE_B', 'INTERMEDIARIO', 'AVANCADO']).openapi('StudentLevel');

/** Telefone com DDD, guardado só com dígitos (10 ou 11). Aceita "(22) 99999-1234" e "+55 22 99999-1234". */
const PhoneDigits = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .transform((d) => (d.length > 11 && d.startsWith('55') ? d.slice(2) : d))
  .refine((d) => d.length === 10 || d.length === 11, 'Informe o telefone com DDD (10 ou 11 dígitos)')
  .openapi({ type: 'string', example: '(22) 99999-1234' });
/** Vazio apaga o telefone. */
const PhoneInput = z.union([z.literal('').transform(() => null), PhoneDigits]);

export const CreateStudentInput = registry.register(
  'CreateStudentInput',
  z.object({
    email: z.email().max(160).transform((v) => v.toLowerCase().trim()).openapi({ example: 'aluno@email.com' }),
    name: z.string().trim().min(2).max(120).optional().openapi({ description: 'Opcional. Sem nome, usa o e-mail.' }),
    level: LevelEnum.optional(),
    phone: PhoneInput.optional().openapi({ description: 'Telefone com DDD, usado nos avisos' }),
  }),
);

export const UpdateStudentInput = registry.register(
  'UpdateStudentInput',
  z
    .object({
      name: z.string().trim().min(2).max(120),
      active: z.boolean(),
      level: LevelEnum.nullable().openapi({ description: 'null remove o nível' }),
      phone: PhoneInput.nullable().openapi({ description: 'Vazio ou null remove o telefone' }),
      resetPassword: z.literal(true).openapi({ description: 'Volta a senha padrão (mudar123) e exige novo código por e-mail' }),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Informe ao menos um campo'),
);

export const ListStudentsQuery = PaginationQuery.extend({
  q: z.string().trim().max(120).optional(),
  level: z.union([LevelEnum, z.literal('NONE')]).optional().openapi({ description: 'NONE = alunos sem nível' }),
  month: z.string().refine(isMonth, 'Use o formato AAAA-MM').optional().openapi({ example: '2026-11' }),
});

export const StudentDTO = registry.register(
  'Student',
  z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    active: z.boolean(),
    mustChangePassword: z.boolean().openapi({ description: 'true = ainda não definiu a própria senha' }),
    level: LevelEnum.nullable(),
    phone: z.string().nullable().openapi({ description: 'Só dígitos, com DDD' }),
    createdAt: z.string(),
    daysAttended: z.number(),
    presenceRate: z.number().openapi({ description: '% de presença no mês consultado' }),
  }),
);

export const StudentListDTO = registry.register(
  'StudentList',
  z.object({
    data: z.array(StudentDTO),
    meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
    month: z.string(),
    classDays: z.number().openapi({ description: 'Dias do mês com aula (base da taxa de presença)' }),
  }),
);

export type CreateStudent = z.output<typeof CreateStudentInput>;
export type UpdateStudent = z.output<typeof UpdateStudentInput>;
export type ListStudents = z.output<typeof ListStudentsQuery>;
