import { route } from '@/server/lib/route';
import { DayQuery } from '@/server/modules/attendance/attendance.schemas';
import * as service from '@/server/modules/attendance/attendance.service';

export const GET = route({ roles: ['ADMIN'], query: DayQuery }, ({ query }) => service.listByDay(query.date));
