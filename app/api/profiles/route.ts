import { route } from '@/server/lib/route';
import { CreateProfileInput } from '@/server/modules/profiles/profiles.schemas';
import * as service from '@/server/modules/profiles/profiles.service';

// Só o administrador gerencia perfis (nenhuma permissão de perfil dá acesso a esta área).
export const GET = route({ roles: ['ADMIN'] }, () => service.list());
export const POST = route({ roles: ['ADMIN'], body: CreateProfileInput, status: 201 }, ({ body }) => service.create(body));
