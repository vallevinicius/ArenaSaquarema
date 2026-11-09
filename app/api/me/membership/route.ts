import { route } from '@/server/lib/route';
import * as service from '@/server/modules/memberships/memberships.service';

// Só o aluno, e só a própria situação (o id vem da sessão).
export const GET = route({ roles: ['ALUNO'] }, ({ user }) => service.myMembership(user.id));
