import type { SupabaseClient } from "@supabase/supabase-js";

import { lerDadosDaClinica, type DadosDaClinica } from "./schema";

/**
 * Convexy — leitura de `clinica_dados` (migration 9008; CONVEXY.md, "Minha
 * clínica"). O filtro de `organization_id` é a proteção quando `db` é o client de
 * serviço (ferramenta da IA); com o client da sessão, a RLS repete.
 */

export const COLUNAS_DA_CLINICA =
  "organization_id, responsavel_tecnico_nome, responsavel_tecnico_conselho, responsavel_tecnico_numero, " +
  "especialidades, telefone, whatsapp, email, site, instagram, unidades, funcionamento, fechamentos, convenios, " +
  "so_particular, formas_pagamento, parcelas_max, preco_avaliacao_cents, cancelamento_antecedencia_horas, " +
  "cancelamento_politica, tolerancia_atraso_minutos, observacoes_agente, updated_at";

export type LeituraDaClinica =
  | { ok: true; dados: DadosDaClinica; cadastrado: boolean; atualizadoEm: string | null }
  | { ok: false; erro: string };

export async function lerDadosDaClinicaDaOrg(db: SupabaseClient, organizationId: string): Promise<LeituraDaClinica> {
  const { data, error } = await db
    .from("clinica_dados")
    .select(COLUNAS_DA_CLINICA)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) return { ok: false, erro: error.message };
  const linha = (data ?? null) as Record<string, unknown> | null;
  return {
    ok: true,
    dados: lerDadosDaClinica(linha),
    cadastrado: linha !== null,
    atualizadoEm: linha && typeof linha.updated_at === "string" ? linha.updated_at : null,
  };
}

/** Dinheiro para FALAR: "R$ 150,00". A moeda é a da organização (`organizations.currency`). */
export function precoEmTexto(cents: number, moeda: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(cents / 100);
  } catch {
    return `${moeda} ${(cents / 100).toFixed(2)}`;
  }
}

export async function moedaDaOrg(db: SupabaseClient, organizationId: string): Promise<string> {
  const { data } = await db.from("organizations").select("currency").eq("id", organizationId).maybeSingle();
  const moeda = (data as { currency?: unknown } | null)?.currency;
  return typeof moeda === "string" && /^[A-Z]{3}$/.test(moeda) ? moeda : "BRL";
}
