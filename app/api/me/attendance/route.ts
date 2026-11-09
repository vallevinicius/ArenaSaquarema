import { route } from '@/server/lib/route';
import { MonthQuery } from '@/server/modules/attendance/attendance.schemas';
import * as service from '@/server/modules/attendance/attendance.service';

export const GET = route({ roles: ['ALUNO'], query: MonthQuery }, ({ user, query }) => service.myAttendance(user.id, query.month));
