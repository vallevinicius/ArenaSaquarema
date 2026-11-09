import { route } from '@/server/lib/route';
import * as service from '@/server/modules/partners/partners.service';

export const POST = route({ roles: ['ADMIN'] }, () => service.registerTotalPassWebhook());
