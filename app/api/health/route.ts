import { route } from '@/server/lib/route';
import * as health from '@/server/modules/health/health.service';

export const GET = route({ auth: false }, () => health.check());
