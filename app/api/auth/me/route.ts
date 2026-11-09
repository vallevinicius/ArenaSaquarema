import { route } from '@/server/lib/route';

export const GET = route({ roles: ['ADMIN', 'OPERADOR', 'ALUNO'] }, async ({ user }) => user);
