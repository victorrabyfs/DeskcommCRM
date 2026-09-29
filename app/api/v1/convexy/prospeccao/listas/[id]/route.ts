import { randomUUID } from "node:crypto";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { editarLista, excluirLista, itensDaLista } from "@/lib/convexy/prospeccao/listas";
import { SEM_CACHE, corpoJson, falhaDaProspeccao, idDoCaminho } from "@/lib/convexy/prospeccao/rota";
import { editarListaSchema } from "@/lib/convexy/prospeccao/schemas";
import { requireSupportWrite } from "@/lib/impersonate/support";

/**
 * Convexy — /api/v1/convexy/prospeccao/listas/[id]: as empresas da lista (GET),
 * renomear ou mudar a descrição (PATCH) e excluir a lista (DELETE — as empresas
 * continuam na busca de origem). CONVEXY.md, "Prospecção v2".
 */
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Contexto): Promise<Response> {
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!auth.ok) return auth.response;
  const listaId = await idDoCaminho(ctx.params);
  if (!listaId) return fail("validation_failed", "Lista inválida.", 422, { requestId });
  try {
    return ok(await itensDaLista(getRequestPool(), auth.org.orgId, listaId), { requestId, headers: SEM_CACHE });
  } catch (err) {
    return falhaDaProspeccao(err, requestId);
  }
}

export async function PATCH(req: Request, ctx: Contexto): Promise<Response> {
  const support = await requireSupportWrite();
  if (support) return support;
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!auth.ok) return auth.response;
  const listaId = await idDoCaminho(ctx.params);
  if (!listaId) return fail("validation_failed", "Lista inválida.", 422, { requestId });
  const lido = editarListaSchema.safeParse(await corpoJson(req));
  if (!lido.success)
    return fail("validation_failed", "Dê um nome de até 50 letras, sem vírgula, à lista.", 422, { requestId });
  const org = auth.org.orgId;
  try {
    await editarLista(getRequestPool(), org, listaId, lido.data);
    await audit({
      action: "prospecting.lista_alterada",
      organizationId: org,
      actorUserId: auth.user.id,
      resourceType: "prospeccao_lista",
      resourceId: listaId,
      metadata: { campos: Object.keys(lido.data) },
      requestId,
    });
    return ok({ id: listaId }, { requestId, headers: SEM_CACHE });
  } catch (err) {
    return falhaDaProspeccao(err, requestId);
  }
}

export async function DELETE(_req: Request, ctx: Contexto): Promise<Response> {
  const support = await requireSupportWrite();
  if (support) return support;
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!auth.ok) return auth.response;
  const listaId = await idDoCaminho(ctx.params);
  if (!listaId) return fail("validation_failed", "Lista inválida.", 422, { requestId });
  const org = auth.org.orgId;
  try {
    await excluirLista(getRequestPool(), org, listaId);
    await audit({
      action: "prospecting.lista_excluida",
      organizationId: org,
      actorUserId: auth.user.id,
      resourceType: "prospeccao_lista",
      resourceId: listaId,
      requestId,
    });
    return ok({ id: listaId }, { requestId, headers: SEM_CACHE });
  } catch (err) {
    return falhaDaProspeccao(err, requestId);
  }
}
