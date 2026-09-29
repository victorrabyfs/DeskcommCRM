import { randomUUID } from "node:crypto";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { pedidosRecentes, pedirEnriquecimento } from "@/lib/convexy/prospeccao/enriquecimento";
import { SEM_CACHE, corpoJson, falhaDaProspeccao } from "@/lib/convexy/prospeccao/rota";
import { enriquecerSchema } from "@/lib/convexy/prospeccao/schemas";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Convexy — /api/v1/convexy/prospeccao/enriquecer: os pedidos recentes (GET) e
 * um pedido novo (POST) de enriquecimento das empresas escolhidas — contatos do
 * site, decisores (pago) e resumo do site por IA. A execução paga começa aqui
 * (uma só por `request_id`); o resultado chega pelo cron
 * `/api/v1/cron/convexy-prospeccao`. CONVEXY.md, "Prospecção v2".
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!auth.ok) return auth.response;
  try {
    return ok(await pedidosRecentes(getRequestPool(), auth.org.orgId), { requestId, headers: SEM_CACHE });
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
  const lido = enriquecerSchema.safeParse(await corpoJson(req));
  if (!lido.success)
    return fail("validation_failed", "Escolha até 100 empresas e pelo menos um tipo de enriquecimento.", 422, {
      requestId,
    });
  const org = auth.org.orgId;
  try {
    const resultado = await pedirEnriquecimento(
      getRequestPool(),
      createAdminClient(),
      org,
      auth.user.id,
      lido.data,
    );
    const pedidoId = resultado.pedido.id;
    await audit({
      action: "prospecting.enriquecimento_pedido",
      organizationId: org,
      actorUserId: auth.user.id,
      resourceType: "prospeccao_enriquecimento",
      resourceId: pedidoId,
      metadata: {
        empresas: resultado.pedido.candidate_ids.length,
        contatos: resultado.pedido.contatos,
        resumo: resultado.pedido.resumo,
        decisores: resultado.pedido.decisores,
        teto_usd: Number(resultado.pedido.teto_usd),
        status: resultado.pedido.status,
      },
      requestId,
    });
    return ok(resultado, { requestId, status: 202, headers: SEM_CACHE });
  } catch (err) {
    return falhaDaProspeccao(err, requestId);
  }
}
