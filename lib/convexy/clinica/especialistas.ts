import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveUserNames } from "@/lib/mcp/tools/_users";

import { lerEspecialista, type DadosDoEspecialista } from "./schema";

/**
 * Convexy — o ESPECIALISTA SEM ACESSO (migration 9008; CONVEXY.md, "Minha clínica").
 *
 * É um membro da organização (`user_organizations`, papel `viewer`) com a coluna
 * `especialista` preenchida, e um usuário do Auth criado pelo servidor: banido,
 * sem senha, com um e-mail que ninguém recebe (`.invalid`, RFC 2606). Assim a
 * agenda inteira — jornada, exceções, ocupação, marcar, Google — funciona sem
 * mudar o motor, porque tudo ali gira em torno de `user_id`.
 *
 * Ele nunca entra: o ban recusa o login, e `loadAuthUser` recusa de novo
 * (`ehEspecialistaSemAcesso`) caso o ban seja retirado por engano.
 */

/** `.invalid` é reservado (RFC 2606): nenhum servidor de e-mail responde por ele. */
export const DOMINIO_DO_ESPECIALISTA = "especialistas.invalid";

/** ~100 anos. O Auth guarda `banned_until`; o especialista nunca abre sessão. */
export const BAN_DO_ESPECIALISTA = "876000h";

export function emailDoEspecialista(chave: string): string {
  return `especialista+${chave}@${DOMINIO_DO_ESPECIALISTA}`;
}

export function ehEmailDeEspecialista(email: string | null | undefined): boolean {
  return typeof email === "string" && email.toLowerCase().endsWith(`@${DOMINIO_DO_ESPECIALISTA}`);
}

/** O cinto de `loadAuthUser`: a conta do especialista não abre sessão nem com o ban retirado. */
export function ehEspecialistaSemAcesso(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): boolean {
  return user.user_metadata?.especialista === true || ehEmailDeEspecialista(user.email);
}

export interface TratamentoResumido {
  id: string;
  slug: string;
  nome: string;
  ativo: boolean;
}

export interface Especialista extends DadosDoEspecialista {
  userId: string;
  nome: string | null;
  tratamentos: TratamentoResumido[];
}

export type LeituraDosEspecialistas =
  | { ok: true; especialistas: Especialista[] }
  | { ok: false; erro: string };

interface LinhaDeVinculo {
  user_id: string;
  especialista: unknown;
  created_at: string;
}

interface LinhaDeQuemFaz {
  user_id: string;
  ordem: number | string;
  calendar_event_types: { id: string; slug: string; name: string; is_active: boolean } | null;
}

/**
 * Os especialistas da organização, com os tratamentos de cada um.
 *
 * ⚠️ `db` costuma ser o client de SERVIÇO (a ferramenta da IA, a tela que precisa
 * do nome): o `organization_id` vem de fonte confiável e filtra as DUAS consultas.
 */
export async function listarEspecialistas(
  db: SupabaseClient,
  organizationId: string,
  opcoes?: { incluirInativos?: boolean; nomes?: (ids: string[]) => Promise<Map<string, string | null>> },
): Promise<LeituraDosEspecialistas> {
  const [vinculos, quemFaz] = await Promise.all([
    db
      .from("user_organizations")
      .select("user_id, especialista, created_at")
      .eq("organization_id", organizationId)
      .not("especialista", "is", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: true }),
    db
      .from("calendar_event_type_especialistas")
      .select("user_id, ordem, calendar_event_types(id, slug, name, is_active)")
      .eq("organization_id", organizationId)
      .order("ordem", { ascending: true }),
  ]);
  if (vinculos.error) return { ok: false, erro: vinculos.error.message };
  if (quemFaz.error) return { ok: false, erro: quemFaz.error.message };

  const linhas = (vinculos.data ?? []) as LinhaDeVinculo[];
  const porPessoa = new Map<string, TratamentoResumido[]>();
  for (const l of (quemFaz.data ?? []) as unknown as LinhaDeQuemFaz[]) {
    const t = l.calendar_event_types;
    if (!t) continue;
    const lista = porPessoa.get(l.user_id) ?? [];
    lista.push({ id: String(t.id), slug: String(t.slug), nome: String(t.name), ativo: Boolean(t.is_active) });
    porPessoa.set(l.user_id, lista);
  }

  const ids = linhas.map((l) => l.user_id);
  const nomes = opcoes?.nomes ? await opcoes.nomes(ids) : await resolveUserNames(db, ids);

  const especialistas: Especialista[] = [];
  for (const l of linhas) {
    const dados = lerEspecialista(l.especialista);
    if (!dados) continue;
    if (!dados.ativo && !opcoes?.incluirInativos) continue;
    especialistas.push({
      ...dados,
      userId: l.user_id,
      nome: nomes.get(l.user_id) ?? null,
      tratamentos: porPessoa.get(l.user_id) ?? [],
    });
  }
  return { ok: true, especialistas };
}

export interface QuemFazLinha {
  userId: string;
  ordem: number;
}

/** Quem faz cada tratamento, por id do tipo, na ordem gravada. */
export async function quemFazPorTipo(
  db: SupabaseClient,
  organizationId: string,
  tipoIds?: readonly string[],
): Promise<Map<string, QuemFazLinha[]>> {
  let q = db
    .from("calendar_event_type_especialistas")
    .select("event_type_id, user_id, ordem, created_at")
    .eq("organization_id", organizationId);
  if (tipoIds && tipoIds.length > 0) q = q.in("event_type_id", [...tipoIds]);
  const { data, error } = await q.order("ordem", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const mapa = new Map<string, QuemFazLinha[]>();
  for (const l of (data ?? []) as Array<{ event_type_id: string; user_id: string; ordem: number | string }>) {
    const lista = mapa.get(l.event_type_id) ?? [];
    lista.push({ userId: l.user_id, ordem: Number(l.ordem) });
    mapa.set(l.event_type_id, lista);
  }
  return mapa;
}

export interface Membro {
  userId: string;
  especialista: DadosDoEspecialista | null;
}

/** Os membros ATIVOS da organização (revogado não faz tratamento), com o especialista lido. */
export async function membrosAtivos(db: SupabaseClient, organizationId: string): Promise<Map<string, Membro>> {
  const { data, error } = await db
    .from("user_organizations")
    .select("user_id, especialista")
    .eq("organization_id", organizationId)
    .is("revoked_at", null);
  if (error) throw new Error(error.message);
  const mapa = new Map<string, Membro>();
  for (const l of (data ?? []) as Array<{ user_id: string; especialista: unknown }>) {
    mapa.set(l.user_id, { userId: l.user_id, especialista: lerEspecialista(l.especialista) });
  }
  return mapa;
}

/** Pode atender? Membro ativo e, se for especialista, não desativado. */
export function podeAtender(membro: Membro | undefined): boolean {
  if (!membro) return false;
  return membro.especialista === null || membro.especialista.ativo;
}
