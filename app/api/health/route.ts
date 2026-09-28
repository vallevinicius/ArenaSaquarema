import { route } from '@/server/lib/route';

export const GET = route({ auth: false }, async () => ({ status: 'ok' }));
