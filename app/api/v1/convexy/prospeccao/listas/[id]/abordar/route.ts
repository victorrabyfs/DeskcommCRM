import { randomUUID } from "node:crypto";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { abordarLista } from "@/lib/convexy/prospeccao/listas";
import { SEM_CACHE, corpoJson, falhaDaProspeccao, idDoCaminho } from "@/lib/convexy/prospeccao/rota";
import { abordarSchema } from "@/lib/convexy/prospeccao/schemas";
import { requireSupportWrite } from "@/lib/impersonate/support";

/**
 * Convexy — POST /api/v1/convexy/prospeccao/listas/[id]/abordar: prepara a
 * "Abordar com IA" só com as empresas da lista. Cria uma campanha de prospecção
 * em rascunho com as empresas LIVRES da lista (ver `abordarLista`); a pessoa
 * configura e inicia no passo 2 de sempre, que segue exigindo uma campanha em
 * andamento por vez. Nada é enviado aqui. CONVEXY.md, "Prospecção v2".
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const support = await requireSupportWrite();
  if (support) return support;
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!auth.ok) return auth.response;
  const listaId = await idDoCaminho(ctx.params);
  if (!listaId) return fail("validation_failed", "Lista inválida.", 422, { requestId });
  const lido = abordarSchema.safeParse(await corpoJson(req));
  if (!lido.success) return fail("validation_failed", "Pedido inválido.", 422, { requestId });
  const org = auth.org.orgId;
  try {
    const resultado = await abordarLista(getRequestPool(), org, listaId, lido.data.request_id);
    if (!resultado.repetido) {
      await audit({
        action: "prospecting.lista_abordada",
        organizationId: org,
        actorUserId: auth.user.id,
        resourceType: "prospeccao_lista",
        resourceId: listaId,
        metadata: { campaign_id: resultado.campaign_id, movidas: resultado.movidas, presas: resultado.presas },
        requestId,
      });
    }
    return ok(resultado, { requestId, headers: SEM_CACHE });
  } catch (err) {
    return falhaDaProspeccao(err, requestId);
  }
}
