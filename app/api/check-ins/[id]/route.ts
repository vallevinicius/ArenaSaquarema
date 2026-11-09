import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import * as service from '@/server/modules/attendance/attendance.service';

export const DELETE = route({ permissions: ['PRESENCAS'], params: IdParam }, ({ params }) => service.remove(params.id));
