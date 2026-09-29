import { randomUUID } from "node:crypto";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { criarLista, listarListas } from "@/lib/convexy/prospeccao/listas";
import { SEM_CACHE, corpoJson, falhaDaProspeccao } from "@/lib/convexy/prospeccao/rota";
import { criarListaSchema } from "@/lib/convexy/prospeccao/schemas";
import { requireSupportWrite } from "@/lib/impersonate/support";

/**
 * Convexy — GET/POST /api/v1/convexy/prospeccao/listas: as listas de
 * prospecção da organização e a criação de uma (opcionalmente já com as
 * empresas escolhidas). Mesma porta da tela de prospecção (admin); a
 * organização vem da sessão. CONVEXY.md, "Prospecção v2".
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!auth.ok) return auth.response;
  try {
    return ok(await listarListas(getRequestPool(), auth.org.orgId), { requestId, headers: SEM_CACHE });
  } catch (err) {
    return falhaDaProspeccao(err, requestId);
  }
}

export async function POST(req: Request): Promise<Response> {
  const support = await requireSupportWrite();
  if (support) return support;
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!auth.ok) return auth.response;
  const lido = criarListaSchema.safeParse(await corpoJson(req));
  if (!lido.success)
    return fail("validation_failed", "Dê um nome de até 50 letras, sem vírgula, à lista.", 422, { requestId });
  const org = auth.org.orgId;
  try {
    const criada = await criarLista(getRequestPool(), org, auth.user.id, lido.data);
    const listaId = criada.id;
    await audit({
      action: "prospecting.lista_criada",
      organizationId: org,
      actorUserId: auth.user.id,
      resourceType: "prospeccao_lista",
      resourceId: listaId,
      metadata: { empresas: criada.adicionados },
      requestId,
    });
    return ok(criada, { requestId, status: 201, headers: SEM_CACHE });
  } catch (err) {
    return falhaDaProspeccao(err, requestId);
  }
}
