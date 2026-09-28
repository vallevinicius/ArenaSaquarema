import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { AddItemInput } from '@/server/modules/tabs/tabs.schemas';
import * as service from '@/server/modules/tabs/tabs.service';

export const POST = route({ params: IdParam, body: AddItemInput, status: 201 }, ({ params, body, user }) =>
  service.addItem(params.id, body, user.id),
);
