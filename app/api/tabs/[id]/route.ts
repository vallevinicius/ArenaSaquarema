import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import * as service from '@/server/modules/tabs/tabs.service';

export const GET = route({ params: IdParam }, ({ params }) => service.get(params.id));
