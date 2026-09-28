import { route } from '@/server/lib/route';
import { ItemParams } from '@/server/modules/tabs/tabs.schemas';
import * as service from '@/server/modules/tabs/tabs.service';

export const DELETE = route({ params: ItemParams }, ({ params, user }) =>
  service.removeItem(params.id, params.itemId, user),
);
