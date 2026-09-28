import { route } from '@/server/lib/route';

export const GET = route({}, async ({ user }) => user);
