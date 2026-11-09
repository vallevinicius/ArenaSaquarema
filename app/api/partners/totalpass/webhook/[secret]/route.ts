import { z } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { TotalPassWebhookInput } from '@/server/modules/partners/partners.schemas';
import * as service from '@/server/modules/partners/partners.service';

// Pública de propósito (a TotalPass não assina as chamadas): protegida pelo segredo no caminho, por confirmação
// do token na própria TotalPass e por limite de chamadas. Veja ingestTotalPass.
export const POST = route({ auth: false, params: z.object({ secret: z.string().min(1).max(200) }), body: TotalPassWebhookInput }, ({ params, body }) =>
  service.ingestTotalPass(params.secret, body),
);
