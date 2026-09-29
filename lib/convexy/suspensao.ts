import type { Queryable } from "@/lib/agent-engine/queue/queue";

/**
 * Organização suspensa não é atendida pela IA nem envia sozinha — Convexy, trial
 * (CONVEXY.md, "Trial"). A suspensão do original só bloqueava o login e as
 * campanhas; o agente, os retornos e a fila seguiam respondendo. Aqui mora a
 * pergunta única, com o mesmo critério de `lib/campanhas/rodada.ts` (`= 'suspended'`,
 * não `<> 'active'`): a mensagem que chega continua GRAVADA, só não há resposta.
 *
 * Em falha de leitura, deixa passar (falha ABERTA): travar a fila inteira por um
 * erro de banco seria pior do que um envio a mais para quem está suspenso.
 */

export async function organizacaoSuspensa(db: Queryable, organizationId: string): Promise<boolean> {
  try {
    const { rows } = await db.query<{ status: string | null }>(
      "select status from organizations where id = $1",
      [organizationId],
    );
    return rows[0]?.status === "suspended";
  } catch {
    return false;
  }
}

/** O mesmo, pelo cliente do Supabase (a porta de envio recebe um, de sessão ou de serviço). */
export async function organizacaoSuspensaNoSupabase(
  supabase: { from: (tabela: string) => unknown },
  organizationId: string,
): Promise<boolean> {
  try {
    const consulta = supabase.from("organizations") as {
      select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { status?: string | null } | null }> } };
    };
    const { data } = await consulta.select("status").eq("id", organizationId).maybeSingle();
    return data?.status === "suspended";
  } catch {
    return false;
  }
}

