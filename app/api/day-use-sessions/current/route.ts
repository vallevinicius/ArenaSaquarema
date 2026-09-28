import { route } from '@/server/lib/route';
import * as service from '@/server/modules/dayuse-sessions/dayuse-sessions.service';

export const GET = route({}, () => service.current());
