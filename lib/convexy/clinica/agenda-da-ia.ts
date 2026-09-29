import type { SupabaseClient } from "@supabase/supabase-js";

import { horariosLivresDaOrg, type ResultadoDaConsulta } from "@/lib/agenda/consulta";
import type { Slot } from "@/lib/agenda/horarios-livres";
import { resolveUserNames } from "@/lib/mcp/tools/_users";

import { lerDadosDaClinicaDaOrg, moedaDaOrg, precoEmTexto } from "./dados";
import { membrosAtivos, podeAtender, quemFazPorTipo, type Membro, type QuemFazLinha } from "./especialistas";
import { filtrarPeloFuncionamento } from "./funcionamento";
import type { DadosDaClinica } from "./schema";

/**
 * Convexy — a AGENDA DA IA com especialistas (spec Minha clínica, §2.3 e §4;
 * CONVEXY.md, "Minha clínica").
 *
 * As ferramentas de agenda do original (`lib/mcp/tools/agendamento.ts`) consultam
 * UM dono por vez (`horariosLivresDaOrg`). Quando o tratamento tem "quem faz"
 * (`calendar_event_type_especialistas`), esta camada consulta cada um com a MESMA
 * função — o motor não muda —, junta os horários, diz de quem é cada um e tira o
 * que cai fora do funcionamento da clínica.
 *
 * Sem lista de "quem faz" e sem especialista pedido, o caminho é o do original,
 * horário a horário (critério 4: nada muda para quem não cadastrar especialista).
 * Uma falha de LEITURA das tabelas da Convexy também cai no caminho do original:
 * a agenda do dono padrão continua respondendo.
 */

export interface SlotComEspecialista extends Slot {
  especialistaId: string | null;
  especialistaNome: string | null;
}

type ConsultaOk = Extract<ResultadoDaConsulta, { ok: true }>;
type ConsultaRecusada = Extract<ResultadoDaConsulta, { ok: false }>;

export type ConsultaComEspecialistas =
  | (Omit<ConsultaOk, "slots"> & { slots: SlotComEspecialista[]; porEspecialista: boolean })
  | (Omit<ConsultaRecusada, "codigo"> & { codigo: string });

export interface ParametrosComEspecialista {
  eventTypeSlug: string;
  /** `especialista_id` da ferramenta, ou o `owner_user_id` antigo (alias). */
  especialistaId?: string | null;
  de: Date;
  ate: Date;
  agora: Date;
}

interface Contexto {
  tipoId: string;
  quem: QuemFazLinha[];
  membros: Map<string, Membro>;
  clinica: DadosDaClinica | null;
}

async function contexto(db: SupabaseClient, organizationId: string, slug: string): Promise<Contexto | null> {
  const { data: tipo, error } = await db
    .from("calendar_event_types")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !tipo) return null;
  const tipoId = String((tipo as { id: string }).id);
  const [quemPorTipo, membros, clinica] = await Promise.all([
    quemFazPorTipo(db, organizationId, [tipoId]),
    membrosAtivos(db, organizationId),
    lerDadosDaClinicaDaOrg(db, organizationId),
  ]);
  return { tipoId, quem: quemPorTipo.get(tipoId) ?? [], membros, clinica: clinica.ok ? clinica.dados : null };
}

const NAO_OFERECA =
  "Não ofereça horários e não diga que está sem vaga — avise que alguém da equipe confirma o horário.";

/** A recusa de um especialista pedido que não faz o tratamento ou não atende mais. Plateia: o modelo. */
export function recusaDoEspecialista(ctx: Contexto, especialistaId: string): { codigo: string; mensagem: string } | null {
  if (ctx.quem.length > 0 && !ctx.quem.some((q) => q.userId === especialistaId)) {
    return {
      codigo: "especialista_nao_faz",
      mensagem:
        "esse profissional não faz este tratamento. Chame `crm_list_specialists` (ou veja `especialistas` em " +
        "`crm_list_event_types`) e ofereça quem faz — ou busque sem `especialista_id` para ver todos.",
    };
  }
  if (!podeAtender(ctx.membros.get(especialistaId))) {
    return {
      codigo: "especialista_invalido",
      mensagem:
        "não encontrei esse profissional na clínica. Chame `crm_list_specialists` e use um `id` que voltar de lá.",
    };
  }
  return null;
}

function semEspecialista(slots: readonly Slot[]): SlotComEspecialista[] {
  return slots.map((s) => ({ ...s, especialistaId: null, especialistaNome: null }));
}

/**
 * Os horários livres de um tratamento — por especialista quando ele tem "quem faz".
 * Mesma forma de `horariosLivresDaOrg`, com `especialistaId`/`especialistaNome` em
 * cada horário.
 */
export async function horariosComEspecialistas(
  db: SupabaseClient,
  organizationId: string,
  params: ParametrosComEspecialista,
): Promise<ConsultaComEspecialistas> {
  let ctx: Contexto | null = null;
  try {
    ctx = await contexto(db, organizationId, params.eventTypeSlug);
  } catch {
    ctx = null;
  }

  const base = { eventTypeSlug: params.eventTypeSlug, de: params.de, ate: params.ate, agora: params.agora };

  // Caminho do original: sem as tabelas da Convexy legíveis, ou sem "quem faz" e sem pedido.
  if (!ctx || (ctx.quem.length === 0 && !params.especialistaId)) {
    const r = await horariosLivresDaOrg(db, organizationId, { ...base, ownerUserId: params.especialistaId ?? null });
    if (!r.ok) return r;
    const slots = ctx?.clinica
      ? filtrarPeloFuncionamento(r.slots, ctx.clinica.funcionamento, ctx.clinica.fechamentos)
      : r.slots;
    return { ...r, slots: semEspecialista(slots), porEspecialista: false };
  }

  let candidatos: string[];
  if (params.especialistaId) {
    const recusa = recusaDoEspecialista(ctx, params.especialistaId);
    if (recusa) {
      return { ok: false, codigo: recusa.codigo, motivoParaOperador: recusa.mensagem, motivoParaCliente: recusa.mensagem };
    }
    candidatos = [params.especialistaId];
  } else {
    candidatos = ctx.quem.map((q) => q.userId).filter((id) => podeAtender(ctx!.membros.get(id)));
    if (candidatos.length === 0) {
      return {
        ok: false,
        codigo: "sem_responsavel",
        motivoParaOperador: "Todos os profissionais deste tratamento estão desativados ou saíram da clínica.",
        motivoParaCliente: `Ainda não há profissional disponível para este atendimento. ${NAO_OFERECA}`,
      };
    }
  }

  const consultas = await Promise.all(
    candidatos.map(async (id) => ({ id, r: await horariosLivresDaOrg(db, organizationId, { ...base, ownerUserId: id }) })),
  );
  const boas = consultas.filter((c): c is { id: string; r: ConsultaOk } => c.r.ok);
  if (boas.length === 0) return consultas[0]!.r as ConsultaRecusada;

  let nomes = new Map<string, string | null>();
  try {
    nomes = await resolveUserNames(db, candidatos);
  } catch {
    // Nome é cortesia: a lista continua com o id.
  }

  // O mesmo horário livre com dois profissionais: fica o primeiro da ordem de "quem faz".
  const porInicio = new Map<number, SlotComEspecialista>();
  for (const { id, r } of boas) {
    for (const s of r.slots) {
      const chave = s.inicio.getTime();
      if (!porInicio.has(chave)) {
        porInicio.set(chave, { ...s, especialistaId: id, especialistaNome: nomes.get(id) ?? null });
      }
    }
  }
  const juntos = [...porInicio.values()].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const slots = ctx.clinica
    ? filtrarPeloFuncionamento(juntos, ctx.clinica.funcionamento, ctx.clinica.fechamentos)
    : juntos;
  const primeira = boas[0]!.r;
  return {
    ok: true,
    slots,
    porEspecialista: true,
    fusoDaRegra: primeira.fusoDaRegra,
    publicouHorarios: boas.some((b) => b.r.publicouHorarios),
    fusoSuposto: boas.some((b) => b.r.fusoSuposto),
    fontesDefasadas: boas.flatMap((b) => b.r.fontesDefasadas),
    agendaExternaNuncaLida: boas.some((b) => b.r.agendaExternaNuncaLida),
    googleCoberturaParcial: boas.some((b) => b.r.googleCoberturaParcial),
  };
}

export type DonoParaMarcar =
  | { ok: true; donoId: string | undefined }
  | { ok: false; codigo: string; mensagem: string };

/**
 * Com quem marcar um horário já escolhido. Com especialista pedido, valida; sem
 * ele e com "quem faz", fica com o primeiro que está livre naquele instante (se
 * ninguém estiver, o primeiro da lista — e a marcação recusa com o ensino de
 * consultar de novo). Sem "quem faz", `undefined`: o dono padrão do tipo decide,
 * como no original.
 */
export async function donoParaMarcar(
  db: SupabaseClient,
  organizationId: string,
  params: { eventTypeSlug: string; especialistaId?: string | null; startsAt: Date; agora: Date },
): Promise<DonoParaMarcar> {
  let ctx: Contexto | null = null;
  try {
    ctx = await contexto(db, organizationId, params.eventTypeSlug);
  } catch {
    ctx = null;
  }
  if (!ctx) return { ok: true, donoId: params.especialistaId ?? undefined };
  if (params.especialistaId) {
    const recusa = recusaDoEspecialista(ctx, params.especialistaId);
    return recusa ? { ok: false, codigo: recusa.codigo, mensagem: recusa.mensagem } : { ok: true, donoId: params.especialistaId };
  }
  const candidatos = ctx.quem.map((q) => q.userId).filter((id) => podeAtender(ctx!.membros.get(id)));
  if (candidatos.length === 0) return { ok: true, donoId: undefined };
  const alvo = params.startsAt.getTime();
  for (const id of candidatos) {
    const r = await horariosLivresDaOrg(db, organizationId, {
      eventTypeId: ctx.tipoId,
      ownerUserId: id,
      de: new Date(alvo - 60_000),
      ate: new Date(alvo + 6 * 3_600_000),
      agora: params.agora,
    });
    if (r.ok && r.slots.some((s) => s.inicio.getTime() === alvo)) return { ok: true, donoId: id };
  }
  return { ok: true, donoId: candidatos[0] };
}

export interface ExtrasDoTipo {
  preco: { valor_cents: number; moeda: string; texto: string } | null;
  especialistas: Array<{ id: string; nome: string | null; especialidade: string | null }>;
}

/** Preço (na moeda da organização) e quem faz, por slug — para `crm_list_event_types`. */
export async function extrasDosTipos(
  db: SupabaseClient,
  organizationId: string,
  tipos: ReadonlyArray<{ id: string; slug: string; precoPadraoCents: number | null }>,
): Promise<Map<string, ExtrasDoTipo>> {
  const extras = new Map<string, ExtrasDoTipo>();
  if (tipos.length === 0) return extras;
  const [moeda, quemPorTipo, membros] = await Promise.all([
    moedaDaOrg(db, organizationId),
    quemFazPorTipo(db, organizationId, tipos.map((t) => t.id)),
    membrosAtivos(db, organizationId),
  ]);
  const ids = [...new Set([...quemPorTipo.values()].flat().map((q) => q.userId))];
  let nomes = new Map<string, string | null>();
  try {
    nomes = await resolveUserNames(db, ids);
  } catch {
    // Nome é cortesia.
  }
  for (const t of tipos) {
    const quem = (quemPorTipo.get(t.id) ?? []).filter((q) => podeAtender(membros.get(q.userId)));
    extras.set(t.slug, {
      preco:
        t.precoPadraoCents === null
          ? null
          : { valor_cents: t.precoPadraoCents, moeda, texto: precoEmTexto(t.precoPadraoCents, moeda) },
      especialistas: quem.map((q) => ({
        id: q.userId,
        nome: nomes.get(q.userId) ?? null,
        especialidade: membros.get(q.userId)?.especialista?.especialidade ?? null,
      })),
    });
  }
  return extras;
}
