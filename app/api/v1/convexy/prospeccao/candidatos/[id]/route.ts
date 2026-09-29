import { randomUUID } from "node:crypto";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { perfilDoCandidato } from "@/lib/convexy/prospeccao/listas";
import { SEM_CACHE, falhaDaProspeccao, idDoCaminho } from "@/lib/convexy/prospeccao/rota";

/**
 * Convexy — GET /api/v1/convexy/prospeccao/candidatos/[id]: o perfil de uma
 * empresa encontrada (dados, enriquecimento, listas, situação e os ponteiros
 * para contato e conversa). Admin, filtrado pela organização da sessão.
 * CONVEXY.md, "Prospecção v2".
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!auth.ok) return auth.response;
  const candidatoId = await idDoCaminho(ctx.params);
  if (!candidatoId) return fail("validation_failed", "Empresa inválida.", 422, { requestId });
  try {
    return ok(await perfilDoCandidato(getRequestPool(), auth.org.orgId, candidatoId), {
      requestId,
      headers: SEM_CACHE,
    });
  } catch (err) {
    return falhaDaProspeccao(err, requestId);
  }
}
