import { route } from '@/server/lib/route';
import { MonthQuery } from '@/server/modules/partners/partners.schemas';
import * as service from '@/server/modules/partners/partners.service';

export const GET = route({ roles: ['ADMIN'], query: MonthQuery }, ({ query }) => service.summary(query.month));
