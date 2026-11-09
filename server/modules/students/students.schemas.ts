import { PaginationQuery, registry, z } from '../../docs/registry';
import { isMonth } from '../attendance/attendance.utils';

export const CreateStudentInput = registry.register(
  'CreateStudentInput',
  z.object({
    email: z.email().max(160).transform((v) => v.toLowerCase().trim()).openapi({ example: 'aluno@email.com' }),
    name: z.string().trim().min(2).max(120).optional().openapi({ description: 'Opcional. Sem nome, usa o e-mail.' }),
  }),
);

export const UpdateStudentInput = registry.register(
  'UpdateStudentInput',
  z
    .object({
      name: z.string().trim().min(2).max(120),
      active: z.boolean(),
      resetPassword: z.literal(true).openapi({ description: 'Volta a senha padrão (mudar123) e exige novo código por e-mail' }),
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'Informe ao menos um campo'),
);

export const ListStudentsQuery = PaginationQuery.extend({
  q: z.string().trim().max(120).optional(),
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
