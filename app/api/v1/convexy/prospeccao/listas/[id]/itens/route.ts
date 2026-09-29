import { randomUUID } from "node:crypto";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { adicionarItens, removerItens } from "@/lib/convexy/prospeccao/listas";
import { SEM_CACHE, corpoJson, falhaDaProspeccao, idDoCaminho } from "@/lib/convexy/prospeccao/rota";
import { itensSchema } from "@/lib/convexy/prospeccao/schemas";
import { requireSupportWrite } from "@/lib/impersonate/support";

/**
 * Convexy — /api/v1/convexy/prospeccao/listas/[id]/itens: põe (POST) ou tira
 * (DELETE) empresas da lista. Só empresa da organização da sessão entra; tirar
 * da lista não apaga a empresa. CONVEXY.md, "Prospecção v2".
 */
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

async function alterar(req: Request, ctx: Contexto, operacao: "adicionar" | "remover"): Promise<Response> {
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!auth.ok) return auth.response;
  const listaId = await idDoCaminho(ctx.params);
  if (!listaId) return fail("validation_failed", "Lista inválida.", 422, { requestId });
  const lido = itensSchema.safeParse(await corpoJson(req));
  if (!lido.success) return fail("validation_failed", "Escolha as empresas.", 422, { requestId });
  const org = auth.org.orgId;
  try {
    const pool = getRequestPool();
    const alteradas =
      operacao === "adicionar"
        ? await adicionarItens(pool, org, listaId, lido.data.candidate_ids)
        : await removerItens(pool, org, listaId, lido.data.candidate_ids);
    if (alteradas > 0) {
      await audit({
        action: "prospecting.lista_itens_alterados",
        organizationId: org,
        actorUserId: auth.user.id,
        resourceType: "prospeccao_lista",
        resourceId: listaId,
        metadata: { operacao, empresas: alteradas },
        requestId,
      });
    }
    return ok(
      { alteradas, ignoradas: lido.data.candidate_ids.length - alteradas },
      { requestId, headers: SEM_CACHE },
    );
  } catch (err) {
    return falhaDaProspeccao(err, requestId);
  }
}

export async function POST(req: Request, ctx: Contexto): Promise<Response> {
  const support = await requireSupportWrite();
  if (support) return support;
  return alterar(req, ctx, "adicionar");
}

export async function DELETE(req: Request, ctx: Contexto): Promise<Response> {
  const support = await requireSupportWrite();
  if (support) return support;
  return alterar(req, ctx, "remover");
}
