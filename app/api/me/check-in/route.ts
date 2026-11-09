import { route } from '@/server/lib/route';
import * as service from '@/server/modules/attendance/attendance.service';

export const POST = route({ roles: ['ALUNO'], status: 201 }, ({ user }) => service.checkIn(user.id));
