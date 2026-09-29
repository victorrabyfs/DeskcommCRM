
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

import { MOTIVO_DO_TESTE_ENCERRADO } from "./teste-calculo";

/**
 * O PERÍODO DE TESTE da organização — Convexy (CONVEXY.md, "Trial"). A data de
 * fim mora em `organizations.teste_termina_em` (migration 9006). Ao vencer, a
 * organização é SUSPENSA com a mesma forma da suspensão manual
 * (`admin/tenants/[id]/suspend`): nada é apagado, o login cai em
 * `/account-suspended`, a IA e os envios param (`lib/convexy/suspensao.ts`), e
 * reativar pelo /admin devolve tudo e encerra o teste.
 */

export {
  DIAS_DE_AVISO,
  DURACAO_PADRAO_DO_TESTE,
  DURACOES_DO_TESTE,
  MOTIVO_DO_TESTE_ENCERRADO,
  diasRestantes,
  fimDoTeste,
} from "./teste-calculo";
interface Vencida {
  id: string;
  slug: string;
}

/**
 * Suspende as organizações ATIVAS cujo teste já passou. Cada gravação é
 * condicional ao estado lido (ainda ativa, teste ainda vencido): uma reativação
 * ou extensão no meio do caminho vence. Devolve quem foi suspensa.
 */
/** O cliente de SERVIÇO: `organizations` só é gravada por ele (a RLS só deixa o admin da plataforma). */
export async function encerrarTestesVencidos(
  admin: ReturnType<typeof createAdminClient>,
  agora: Date,
): Promise<Vencida[]> {
  const limite = agora.toISOString();
  const { data, error } = await admin
    .from("organizations")
    .select("id, slug")
    .eq("status", "active")
    .not("teste_termina_em", "is", null)
    .lte("teste_termina_em", limite);
  if (error) throw new Error(`teste: leitura falhou — ${error.message}`);

  const suspensas: Vencida[] = [];
  for (const org of (data ?? []) as Vencida[]) {
    const { data: gravadas, error: erro } = await admin
      .from("organizations")
      .update({
        status: "suspended",
        suspended_at: limite,
        suspended_reason: MOTIVO_DO_TESTE_ENCERRADO,
        suspended_by: null,
        updated_at: limite,
      })
      .eq("id", org.id)
      .eq("status", "active")
      .lte("teste_termina_em", limite)
      .select("id");
    if (erro) {
      logger.warn("[convexy] teste: não suspendeu uma organização vencida", { organization_id: org.id, detalhe: erro.message });
      continue;
    }
    if (!gravadas || gravadas.length === 0) continue;
    suspensas.push(org);
    const organizationId = org.id;
    void audit({
      action: "tenant.suspended",
      bypassedRls: true,
      organizationId,
      resourceType: "organization",
      resourceId: organizationId,
      metadata: { tenant_id: organizationId, tenant_slug: org.slug, reason: MOTIVO_DO_TESTE_ENCERRADO, origem: "teste" },
    });
    void admin.from("event_log").insert({
      organization_id: organizationId,
      entity_kind: "organization",
      entity_id: organizationId,
      event_type: "tenant.suspended",
      payload: { tenant_id: organizationId, suspended_by: null, reason: MOTIVO_DO_TESTE_ENCERRADO },
    });
  }
  return suspensas;
}
