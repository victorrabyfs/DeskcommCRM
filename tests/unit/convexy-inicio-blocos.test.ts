// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — os três blocos do Início (spec 7). A Fila é a do Inbox: o mesmo fato
 * org-wide (`orgTemAutomatico`), o mesmo conjunto (`comandosDaFila`), a mesma
 * contagem do badge e as linhas do próprio handler da lista. Agenda e tarefas no
 * dia da organização. Cada bloco falha sozinho.
 */
const deps = vi.hoisted(() => ({
  orgTemAutomatico: vi.fn(),
  listConversationsHandler: vi.fn(),
  listaAgendamentos: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/lib/ai/agents/org-tem-automatico", () => ({ orgTemAutomatico: deps.orgTemAutomatico }));
vi.mock("@/app/api/v1/conversations/_handler", () => ({ listConversationsHandler: deps.listConversationsHandler }));
vi.mock("@/lib/agenda/consulta", () => ({ listaAgendamentos: deps.listaAgendamentos }));
vi.mock("@/lib/logger", () => ({ logger: { warn: deps.warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import {
  LIMITE_DA_AGENDA,
  agendaDeHoje,
  carregarBloco,
  conversasEsperando,
  minhasTarefas,
} from "@/app/app/_convexy/inicio/blocos";
import { limitesDoDia } from "@/app/app/_convexy/inicio/dia";

type Chamada = [metodo: string, ...args: unknown[]];

/** Um builder do supabase-js que registra a cadeia e resolve com `resposta`. */
function consulta(resposta: unknown) {
  const chamadas: Chamada[] = [];
  const tabelas: string[] = [];
  const builder: Record<string, unknown> = {};
  for (const metodo of ["select", "eq", "in", "lt", "order", "limit"]) {
    builder[metodo] = (...args: unknown[]) => {
      chamadas.push([metodo, ...args]);
      return builder;
    };
  }
  builder.then = (resolver: (valor: unknown) => unknown) => Promise.resolve(resposta).then(resolver);
  const supabase = {
    from: (tabela: string) => {
      tabelas.push(tabela);
      return builder;
    },
  } as unknown as SupabaseClient;
  return { supabase, chamadas, tabelas };
}

const AGORA = new Date("2026-09-26T02:30:00Z");
const DIA = limitesDoDia(AGORA, "America/Sao_Paulo");

beforeEach(() => vi.clearAllMocks());

describe("conversas esperando", () => {
  it("usa a régua da Fila: sem automático no ar, 'automatico' também espera gente", async () => {
    deps.orgTemAutomatico.mockResolvedValue(false);
    deps.listConversationsHandler.mockResolvedValue({
      conversations: [{ id: "c1", awaiting_since: "2026-09-25T12:00:00Z", contacts: { name: "Ana" } }],
      cursor: null,
      has_more: false,
    });
    const { supabase, chamadas, tabelas } = consulta({ count: 7, error: null });
    const resultado = await conversasEsperando(supabase, "org-1", "u-1", "pt-BR");
    expect(tabelas).toEqual(["conversations"]);
    expect(chamadas).toEqual([
      ["select", "id", { count: "exact", head: true }],
      ["eq", "organization_id", "org-1"],
      ["in", "comando_da_conversa", ["aguardando", "automatico"]],
    ]);
    const [, contexto, filtros] = deps.listConversationsHandler.mock.calls[0]!;
    expect(contexto).toMatchObject({ organization_id: "org-1", actor: { type: "user", id: "u-1" } });
    expect(filtros).toMatchObject({ comando: ["aguardando", "automatico"], limit: 5 });
    expect(resultado).toEqual({ total: 7, linhas: [{ id: "c1", nome: "Ana", desde: "2026-09-25T12:00:00Z" }] });
  });

  it("não deu para saber se há automático: assume que há, como a regra manda", async () => {
    deps.orgTemAutomatico.mockResolvedValue(undefined);
    deps.listConversationsHandler.mockResolvedValue({ conversations: [], cursor: null, has_more: false });
    const { supabase, chamadas } = consulta({ count: 0, error: null });
    await conversasEsperando(supabase, "org-1", "u-1", "pt-BR");
    expect(chamadas).toContainEqual(["in", "comando_da_conversa", ["aguardando"]]);
  });

  it("contagem recusada vira falha do bloco (lança)", async () => {
    deps.orgTemAutomatico.mockResolvedValue(true);
    deps.listConversationsHandler.mockResolvedValue({ conversations: [], cursor: null, has_more: false });
    const { supabase } = consulta({ count: null, error: { message: "rls" } });
    await expect(conversasEsperando(supabase, "org-1", "u-1", "pt-BR")).rejects.toThrow("rls");
  });
});

describe("agenda de hoje", () => {
  it("pede o dia da organização por de/ate e conta só o que ocupa o horário", async () => {
    deps.listaAgendamentos.mockResolvedValue({
      ok: true,
      agendamentos: [
        { id: "a1", titulo: "Avaliação", iniciaEm: "2026-09-25T13:00:00Z", situacao: "confirmed", contatoNome: "Ana" },
        { id: "a2", titulo: "Retorno", iniciaEm: "2026-09-25T14:00:00Z", situacao: "cancelled", contatoNome: null },
        { id: "a3", titulo: "Limpeza", iniciaEm: "2026-09-25T15:00:00Z", situacao: "pending", contatoNome: null },
      ],
    });
    const { supabase } = consulta(null);
    const resultado = await agendaDeHoje(supabase, "org-1", DIA);
    expect(deps.listaAgendamentos).toHaveBeenCalledWith(supabase, "org-1", {
      de: "2026-09-25T03:00:00.000Z",
      ate: "2026-09-26T03:00:00.000Z",
      limite: LIMITE_DA_AGENDA,
    });
    expect(resultado).toEqual({
      total: 2,
      linhas: [
        { id: "a1", titulo: "Avaliação · Ana", inicio: "2026-09-25T13:00:00Z" },
        { id: "a3", titulo: "Limpeza", inicio: "2026-09-25T15:00:00Z" },
      ],
    });
  });

  it("recusa da consulta vira falha do bloco", async () => {
    deps.listaAgendamentos.mockResolvedValue({ ok: false, codigo: "erro_interno", motivoParaOperador: "timeout", motivoParaCliente: "" });
    const { supabase } = consulta(null);
    await expect(agendaDeHoje(supabase, "org-1", DIA)).rejects.toThrow("timeout");
  });
});

describe("minhas tarefas", () => {
  it("vencidas e de hoje, da pessoa, abertas, até o fim do dia da organização; 'atrasada' é a regra do original", async () => {
    const { supabase, chamadas, tabelas } = consulta({
      data: [
        { id: "t1", title: "Ligar para a Ana", due_date: "2026-09-24T15:00:00Z", status: "pending" },
        { id: "t2", title: "Enviar orçamento", due_date: "2026-09-25T20:00:00Z", status: "in_progress" },
        { id: "t3", title: "Confirmar retorno", due_date: "2026-09-26T02:50:00Z", status: "pending" },
      ],
      count: 9,
      error: null,
    });
    // 23:30 em São Paulo: t2 venceu às 17:00 de hoje (atrasada, como na tela de
    // tarefas), t3 vence às 23:50 (ainda de hoje).
    const resultado = await minhasTarefas(supabase, "org-1", "u-1", DIA, AGORA);
    expect(tabelas).toEqual(["crm_tasks"]);
    expect(chamadas).toEqual([
      ["select", "id, title, due_date, status", { count: "exact" }],
      ["eq", "organization_id", "org-1"],
      ["eq", "assigned_to", "u-1"],
      ["in", "status", ["pending", "in_progress"]],
      ["lt", "due_date", "2026-09-26T03:00:00.000Z"],
      ["order", "due_date", { ascending: true }],
      ["limit", 5],
    ]);
    expect(resultado).toEqual({
      total: 9,
      linhas: [
        { id: "t1", titulo: "Ligar para a Ana", atrasada: true },
        { id: "t2", titulo: "Enviar orçamento", atrasada: true },
        { id: "t3", titulo: "Confirmar retorno", atrasada: false },
      ],
    });
  });
});

describe("falha isolada por bloco", () => {
  it("um bloco que lança vira 'não deu' e o log diz qual", async () => {
    const resultado = await carregarBloco("agenda", "org-1", async () => {
      throw new Error("caiu");
    });
    expect(resultado).toEqual({ ok: false });
    expect(deps.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ bloco: "agenda", organization_id: "org-1", detalhe: "caiu" }),
    );
  });

  it("um bloco que responde passa os dados como vieram", async () => {
    expect(await carregarBloco("tarefas", "org-1", async () => ({ total: 1 }))).toEqual({ ok: true, dados: { total: 1 } });
  });
});
