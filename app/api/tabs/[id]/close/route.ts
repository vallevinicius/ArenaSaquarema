import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { CloseTabInput } from '@/server/modules/tabs/tabs.schemas';
import * as service from '@/server/modules/tabs/tabs.service';

export const POST = route({ params: IdParam, body: CloseTabInput }, ({ params, body, user }) =>
  service.close(params.id, body.paymentMethod, user.id),
);
