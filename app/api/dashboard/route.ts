import { route } from '@/server/lib/route';
import { DashboardQuery } from '@/server/modules/dashboard/dashboard.schemas';
import * as service from '@/server/modules/dashboard/dashboard.service';

export const GET = route({ roles: ['ADMIN'], query: DashboardQuery }, ({ query }) => service.summary(query));
