import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { listConversationsHandler } from "@/app/api/v1/conversations/_handler";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { listaAgendamentos } from "@/lib/agenda/consulta";
import { SITUACOES_QUE_OCUPAM } from "@/lib/agenda/ocupados";
import { orgTemAutomatico } from "@/lib/ai/agents/org-tem-automatico";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import { traduzir } from "@/lib/i18n/dicionario";
import type { Idioma } from "@/lib/i18n/idiomas";
import { comandosDaFila, esperaDaConversa } from "@/lib/inbox/comando-da-conversa";
import { logger } from "@/lib/logger";
import { listConversationsQuerySchema } from "@/lib/schemas";
import { SITUACOES_DA_TAREFA, estaAtrasada, estaEncerrada, type Tarefa } from "@/lib/tarefas/tipos";

import type { LimitesDoDia } from "./dia";

/**
 * Os TRÊS BLOCOS do Início (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 7).
 * Client de SESSÃO (RLS) e `organization_id` da sessão, nunca o admin client.
 * Cada bloco lança quando não consegue responder; `carregarBloco` isola a falha.
 */
const LINHAS_POR_BLOCO = 5;

/** O padrão da rota da agenda (`GET /api/v1/agenda/agendamentos`). */
export const LIMITE_DA_AGENDA = 200;

export type ResultadoDoBloco<T> = { readonly ok: true; readonly dados: T } | { readonly ok: false };

export async function carregarBloco<T>(
  bloco: string,
  organizationId: string,
  carregar: () => Promise<T>,
): Promise<ResultadoDoBloco<T>> {
  try {
    return { ok: true, dados: await carregar() };
  } catch (erro) {
    logger.warn("[convexy] bloco do Início sem dados", {
      bloco,
      organization_id: organizationId,
      detalhe: erro instanceof Error ? erro.message : String(erro),
    });
    return { ok: false };
  }
}

interface ConversaEsperando {
  readonly id: string;
  readonly nome: string;
  readonly desde: string | null;
}

/**
 * A Fila do Inbox, com a MESMA régua da aba e do badge
 * (`app/api/v1/conversations/counts/route.ts`): primeiro o fato org-wide
 * (`orgTemAutomatico`), depois o conjunto que a Fila pede (`comandosDaFila`),
 * a contagem `head` com o mesmo predicado, e as linhas pelo próprio handler da
 * lista (mesma ordem por espera). O número bate com o Inbox da pessoa.
 * O predicado é CÓPIA (lá não há função extraída): quem o prende é
 * `tests/unit/convexy-inicio-fila-do-inbox.test.ts`; reaplicar pelo CONVEXY.md.
 */
export async function conversasEsperando(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  idioma: Idioma,
): Promise<{ total: number; linhas: ConversaEsperando[] }> {
  const automaticoDaOrg = await orgTemAutomatico(supabase, organizationId);
  const comando = comandosDaFila(automaticoDaOrg);
  const [contagem, lista] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("comando_da_conversa", comando),
    listConversationsHandler(
      supabase,
      { organization_id: organizationId, actor: { type: "user", id: userId }, requestId: randomUUID(), idioma },
      listConversationsQuerySchema.parse({ comando: comando.join(","), limit: String(LINHAS_POR_BLOCO) }),
    ),
  ]);
  if (contagem.error) throw new Error(contagem.error.message);
  const t = (texto: string) => traduzir(texto, idioma);
  // O `SELECT_COLS` da lista embute `contacts`, como o Inbox lê.
  const conversas = lista.conversations as ConversationWithContact[];
  return {
    total: contagem.count ?? 0,
    linhas: conversas.map((c) => ({ id: c.id, nome: rotuloDoContato(c.contacts, t), desde: esperaDaConversa(c) })),
  };
}

interface CompromissoDeHoje {
  readonly id: string;
  readonly titulo: string;
  readonly inicio: string;
}

/**
 * A agenda de hoje da organização: `listaAgendamentos` com `de`/`ate` do dia no
 * fuso dela (sem recorte ela recusa com `sem_alvo`; `dia` corta em UTC). Conta
 * só o que ocupa o horário — cancelado e não compareceu ficam fora.
 */
export async function agendaDeHoje(
  supabase: SupabaseClient,
  organizationId: string,
  dia: LimitesDoDia,
): Promise<{ total: number; linhas: CompromissoDeHoje[] }> {
  const resultado = await listaAgendamentos(supabase, organizationId, {
    de: dia.de.toISOString(),
    ate: dia.ate.toISOString(),
    limite: LIMITE_DA_AGENDA,
  });
  if (!resultado.ok) throw new Error(resultado.motivoParaOperador);
  const ocupam: readonly string[] = SITUACOES_QUE_OCUPAM;
  const doDia = resultado.agendamentos.filter((a) => ocupam.includes(a.situacao));
  return {
    total: doDia.length,
    linhas: doDia.slice(0, LINHAS_POR_BLOCO).map((a) => ({
      id: a.id,
      titulo: a.contatoNome ? `${a.titulo} · ${a.contatoNome}` : a.titulo,
      inicio: a.iniciaEm,
    })),
  };
}

interface TarefaDeHoje {
  readonly id: string;
  readonly titulo: string;
  readonly atrasada: boolean;
}

/** As situações de tarefa em aberto, derivadas da regra do original (`estaEncerrada`). */
const ABERTAS = SITUACOES_DA_TAREFA.filter((situacao) => !estaEncerrada({ status: situacao }));

/**
 * As tarefas da pessoa (`assigned_to`), abertas, vencidas ou de hoje no fuso da
 * organização: o fim do dia dela só CORTA a consulta. "Atrasada" é a regra do
 * original (`estaAtrasada`: tem prazo, o prazo passou, não foi encerrada), a
 * mesma da tela de tarefas. `crm_tasks` não está em `lib/database.types.ts`: a
 * linha é tipada por `Tarefa`, como faz `GET /api/v1/tasks`.
 */
export async function minhasTarefas(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  dia: LimitesDoDia,
  agora: Date,
): Promise<{ total: number; linhas: TarefaDeHoje[] }> {
  const { data, count, error } = await supabase
    .from("crm_tasks")
    .select("id, title, due_date, status", { count: "exact" })
    .eq("organization_id", organizationId)
    .eq("assigned_to", userId)
    .in("status", ABERTAS)
    .lt("due_date", dia.ate.toISOString())
    .order("due_date", { ascending: true })
    .limit(LINHAS_POR_BLOCO);
  if (error) throw new Error(error.message);
  const tarefas = (data ?? []) as Array<Pick<Tarefa, "id" | "title" | "due_date" | "status">>;
  return {
    total: count ?? 0,
    linhas: tarefas.map((t) => ({ id: t.id, titulo: t.title, atrasada: estaAtrasada(t, agora) })),
  };
}

export interface NumerosDoMes {
  readonly conversas: number;
  readonly contatos: number;
  readonly agendamentos: number;
  readonly compareceram: number;
  readonly faltaram: number;
}

/**
 * Os números do mês (painel do Início, 29/09). Contagens `head` com o client de
 * SESSÃO (RLS) e a organização da sessão. Agendamentos contam pelo INÍCIO do
 * compromisso dentro do mês e deixam os cancelados de fora; compareceram e
 * faltaram são as situações `completed` e `no_show` que a Agenda grava.
 */
export async function numerosDoMes(
  supabase: SupabaseClient,
  organizationId: string,
  mes: LimitesDoDia,
): Promise<NumerosDoMes> {
  const de = mes.de.toISOString();
  const ate = mes.ate.toISOString();
  const criadosNoMes = (tabela: "conversations" | "contacts") =>
    supabase
      .from(tabela)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", de)
      .lt("created_at", ate);
  const compromissos = () =>
    supabase
      .from("calendar_appointments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("starts_at", de)
      .lt("starts_at", ate);
  const [conversas, contatos, agendamentos, compareceram, faltaram] = await Promise.all([
    criadosNoMes("conversations"),
    criadosNoMes("contacts"),
    compromissos().neq("status", "cancelled"),
    compromissos().eq("status", "completed"),
    compromissos().eq("status", "no_show"),
  ]);
  for (const r of [conversas, contatos, agendamentos, compareceram, faltaram]) {
    if (r.error) throw new Error(r.error.message);
  }
  return {
    conversas: conversas.count ?? 0,
    contatos: contatos.count ?? 0,
    agendamentos: agendamentos.count ?? 0,
    compareceram: compareceram.count ?? 0,
    faltaram: faltaram.count ?? 0,
  };
}

interface EtapaDoFunil {
  readonly id: string;
  readonly nome: string;
  readonly abertos: number;
}

/**
 * O funil principal em números (painel do Início, 29/09): o funil padrão da
 * organização (ou o primeiro não arquivado), cada etapa aberta com os cards em
 * aberto nela. Etapas de ganho e perda ficam de fora — o painel mostra o que
 * ainda está andando.
 */
export async function funilDoCrm(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<{ total: number; nome: string | null; linhas: EtapaDoFunil[] }> {
  const funis = await supabase
    .from("crm_pipelines")
    .select("id, name, is_default, position")
    .eq("organization_id", organizationId)
    .eq("is_archived", false)
    .order("is_default", { ascending: false })
    .order("position", { ascending: true })
    .limit(1);
  if (funis.error) throw new Error(funis.error.message);
  const funil = (funis.data ?? [])[0] as { id: string; name: string } | undefined;
  if (!funil) return { total: 0, nome: null, linhas: [] };
  const etapas = await supabase
    .from("crm_stages")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("pipeline_id", funil.id)
    .eq("is_archived", false)
    .eq("is_won", false)
    .eq("is_lost", false)
    .order("position", { ascending: true });
  if (etapas.error) throw new Error(etapas.error.message);
  const lista = (etapas.data ?? []) as Array<{ id: string; name: string }>;
  const contagens = await Promise.all(
    lista.map((etapa) =>
      supabase
        .from("crm_leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("stage_id", etapa.id)
        .eq("status", "open"),
    ),
  );
  const linhas = lista.map((etapa, i) => {
    const r = contagens[i]!;
    if (r.error) throw new Error(r.error.message);
    return { id: etapa.id, nome: etapa.name, abertos: r.count ?? 0 };
  });
  return { total: linhas.reduce((soma, l) => soma + l.abertos, 0), nome: funil.name, linhas };
}
