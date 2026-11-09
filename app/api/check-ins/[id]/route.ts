import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import * as service from '@/server/modules/attendance/attendance.service';

export const DELETE = route({ roles: ['ADMIN'], params: IdParam }, ({ params }) => service.remove(params.id));
