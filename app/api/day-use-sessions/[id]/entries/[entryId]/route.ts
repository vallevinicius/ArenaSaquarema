import { route } from '@/server/lib/route';
import { EntryParams } from '@/server/modules/dayuse-sessions/dayuse-sessions.schemas';
import * as service from '@/server/modules/dayuse-sessions/dayuse-sessions.service';

export const DELETE = route({ params: EntryParams }, ({ params, user }) =>
  service.removeEntry(params.id, params.entryId, user),
);
