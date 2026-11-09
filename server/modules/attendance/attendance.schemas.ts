import { registry, z } from '../../docs/registry';
import { isMonth } from './attendance.utils';

const Month = z
  .string()
  .refine(isMonth, 'Use o formato AAAA-MM')
  .openapi({ example: '2026-11', description: 'Mês (AAAA-MM). Padrão: mês atual.' });

export const MonthQuery = z.object({ month: Month.optional() });

export const DayQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().openapi({ example: '2026-11-09', description: 'Dia (AAAA-MM-DD). Padrão: hoje.' }),
});

export const MyAttendanceDTO = registry.register(
  'MyAttendance',
  z.object({
    month: z.string().openapi({ example: '2026-11' }),
    daysAttended: z.number().openapi({ description: 'Dias do mês em que o aluno fez check-in' }),
    classDays: z.number().openapi({ description: 'Dias do mês em que a arena teve aula (ao menos um check-in)' }),
    presenceRate: z.number().openapi({ description: 'Percentual de presença (0 a 100)', example: 80 }),
    checkedInToday: z.boolean(),
    days: z.array(z.string()).openapi({ description: 'Dias com check-in (AAAA-MM-DD)' }),
  }),
);

export const CheckInDTO = registry.register('CheckIn', z.object({ id: z.number(), date: z.string(), createdAt: z.string() }));

export const DayCheckInDTO = registry.register(
  'DayCheckIn',
  z.object({
    id: z.number(),
    studentId: z.number(),
    studentName: z.string(),
    studentEmail: z.string(),
    studentLevel: z.enum(['INICIANTE_A', 'INICIANTE_B', 'INTERMEDIARIO', 'AVANCADO']).nullable(),
    createdAt: z.string(),
  }),
);
