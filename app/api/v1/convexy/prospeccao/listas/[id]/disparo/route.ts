import { randomUUID } from "node:crypto";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { disparoDaLista } from "@/lib/convexy/prospeccao/listas";
import { SEM_CACHE, corpoJson, falhaDaProspeccao, idDoCaminho } from "@/lib/convexy/prospeccao/rota";
import { disparoSchema } from "@/lib/convexy/prospeccao/schemas";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Convexy — POST /api/v1/convexy/prospeccao/listas/[id]/disparo: prepara o
 * "Disparo em massa" da lista. Garante um contato (origem `prospecting`, base
 * legal de interesse legítimo com a referência informada) para cada empresa com
 * telefone e põe nele a etiqueta `Lista: <nome>`; a tela abre a campanha nova
 * com essa etiqueta no público. Nada é enviado aqui: a campanha nasce rascunho
 * e segue o preparo, o teste e o início de sempre. CONVEXY.md, "Prospecção v2".
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const support = await requireSupportWrite();
  if (support) return support;
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!auth.ok) return auth.response;
  const listaId = await idDoCaminho(ctx.params);
  if (!listaId) return fail("validation_failed", "Lista inválida.", 422, { requestId });
  const lido = disparoSchema.safeParse(await corpoJson(req));
  if (!lido.success)
    return fail("validation_failed", "Informe a referência da base legal (interesse legítimo).", 422, { requestId });
  const org = auth.org.orgId;
  try {
    const resultado = await disparoDaLista(
      getRequestPool(),
      createAdminClient(),
      org,
      auth.user.id,
      listaId,
      lido.data.base_legal_ref,
      requestId,
    );
    await audit({
      action: "prospecting.lista_disparo",
      organizationId: org,
      actorUserId: auth.user.id,
      resourceType: "prospeccao_lista",
      resourceId: listaId,
      metadata: {
        criados: resultado.criados,
        marcados: resultado.marcados,
        sem_telefone: resultado.sem_telefone,
        ignorados: resultado.ignorados,
      },
      requestId,
    });
    return ok(resultado, { requestId, headers: SEM_CACHE });
  } catch (err) {
    return falhaDaProspeccao(err, requestId);
  }
}
