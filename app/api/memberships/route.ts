import { route } from '@/server/lib/route';
import { ListMembershipsQuery } from '@/server/modules/memberships/memberships.schemas';
import * as service from '@/server/modules/memberships/memberships.service';

export const GET = route({ permissions: ['MENSALIDADES'], query: ListMembershipsQuery }, ({ query }) => service.overview(query));
