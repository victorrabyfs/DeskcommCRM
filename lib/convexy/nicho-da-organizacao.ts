import "server-only";

import { NICHO_PADRAO, lerNicho, type Nicho } from "@/lib/convexy/nicho";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * O nicho da organização ativa, para as telas de servidor que desenham menu (os
 * hubs e o Início). A mesma leitura do `app/app/layout.tsx`: service role, com a
 * organização vinda da sessão validada — nunca do pedido. Nunca lança: sem
 * organização, coluna ausente ou leitura recusada = genérico.
 * CONVEXY.md, "Telas escondidas do menu".
 */
export async function nichoDaOrganizacao(orgId: string | null | undefined): Promise<Nicho> {
  if (!orgId) return NICHO_PADRAO;
  try {
    const { data, error } = await createAdminClient()
      .from("organizations")
      .select("nicho")
      .eq("id", orgId)
      .maybeSingle();
    if (error) {
      logger.warn("nicho da organização: leitura recusada — tratando como genérico", {
        organization_id: orgId,
        codigo: error.code,
      });
      return NICHO_PADRAO;
    }
    return lerNicho((data as { nicho?: unknown } | null)?.nicho);
  } catch {
    return NICHO_PADRAO;
  }
}
