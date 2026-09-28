import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import * as service from '@/server/modules/dayuse-sessions/dayuse-sessions.service';

export const POST = route({ params: IdParam }, ({ params, user }) => service.close(params.id, user.id));
