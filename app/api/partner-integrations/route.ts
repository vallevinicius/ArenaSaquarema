import { route } from '@/server/lib/route';
import * as service from '@/server/modules/partners/partners.service';

export const GET = route({ roles: ['ADMIN'] }, async () => service.integrationStatus());
