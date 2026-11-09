import { route } from '@/server/lib/route';
import { CreatePartnerCheckInInput, ListPartnerCheckInsQuery } from '@/server/modules/partners/partners.schemas';
import * as service from '@/server/modules/partners/partners.service';

// Só ADMIN: quem fez check-in no dia (nomes) não é visível para nenhum perfil de equipe.
export const GET = route({ roles: ['ADMIN'], query: ListPartnerCheckInsQuery }, ({ query }) => service.list(query));
export const POST = route({ roles: ['ADMIN'], body: CreatePartnerCheckInInput, status: 201 }, ({ body, user }) => service.createManual(body, user.id));
