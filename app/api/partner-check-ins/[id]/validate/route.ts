import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import * as service from '@/server/modules/partners/partners.service';

export const POST = route({ roles: ['ADMIN'], params: IdParam }, ({ params }) => service.revalidate(params.id));
