import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { AddEntryInput } from '@/server/modules/dayuse-sessions/dayuse-sessions.schemas';
import * as service from '@/server/modules/dayuse-sessions/dayuse-sessions.service';

export const POST = route({ permissions: ['DAY_USE'], params: IdParam, body: AddEntryInput, status: 201 }, ({ params, body, user }) =>
  service.addEntry(params.id, body, user.id),
);
