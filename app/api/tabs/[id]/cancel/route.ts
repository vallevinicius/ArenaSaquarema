import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { CancelTabInput } from '@/server/modules/tabs/tabs.schemas';
import * as service from '@/server/modules/tabs/tabs.service';

export const POST = route({ roles: ['ADMIN'], params: IdParam, body: CancelTabInput }, ({ params, body, user }) =>
  service.cancel(params.id, body.reason, user.id),
);
