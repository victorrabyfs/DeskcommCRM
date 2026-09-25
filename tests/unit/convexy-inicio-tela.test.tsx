import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveOrg, AuthUser } from "@/lib/auth/types";

/**
 * Convexy — a tela do Início (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 7):
 * cada bloco só com o destino dele visível; um bloco que falha não derruba os
 * outros; a espera anterior a hoje mostra o dia; os números se renovam quando a
 * aba volta a ficar visível (não a cada foco).
 */
const deps = vi.hoisted(() => ({
  conversas: vi.fn(),
  agenda: vi.fn(),
  tarefas: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: deps.refresh, push: vi.fn() }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock("@/app/api/v1/conversations/_handler", () => ({ listConversationsHandler: vi.fn() }));
vi.mock("@/lib/agenda/consulta", () => ({ listaAgendamentos: vi.fn() }));
vi.mock("@/lib/ai/agents/org-tem-automatico", () => ({ orgTemAutomatico: vi.fn() }));
vi.mock("@/app/app/_convexy/inicio/blocos", async (original) => ({
  ...(await original<typeof import("@/app/app/_convexy/inicio/blocos")>()),
  conversasEsperando: deps.conversas,
  agendaDeHoje: deps.agenda,
  minhasTarefas: deps.tarefas,
}));

import { Inicio } from "@/app/app/_convexy/inicio/Inicio";
import { RecarregarAoVoltar } from "@/app/app/_convexy/inicio/RecarregarAoVoltar";

const USER = { id: "u-1", idioma: "pt-BR", is_platform_admin: false, support: null } as unknown as AuthUser;
const ORG: ActiveOrg = { orgId: "org-1", name: "Org", role: "admin", timezone: "America/Sao_Paulo" };
const TUDO = ["/app", "/app/inbox", "/app/agenda", "/app/tasks"];
const FALHOU = "Não deu para carregar agora. A página tenta de novo quando você voltar a ela.";
const bloco = (nome: string) => screen.getByRole("region", { name: nome });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T15:00:00Z"));
  deps.conversas.mockResolvedValue({
    total: 3,
    linhas: [
      { id: "c1", nome: "Ana", desde: "2026-09-25T14:05:00Z" },
      { id: "c2", nome: "Bia", desde: "2026-09-24T15:00:00Z" },
    ],
  });
  deps.agenda.mockResolvedValue({ total: 1, linhas: [{ id: "a1", titulo: "Avaliação", inicio: "2026-09-25T17:00:00Z" }] });
  deps.tarefas.mockResolvedValue({ total: 1, linhas: [{ id: "t1", titulo: "Ligar para a Ana", atrasada: true }] });
});
afterEach(() => vi.useRealTimers());

describe("o Início", () => {
  it("cada bloco só aparece com o destino dele visível — e o escondido nem é consultado", async () => {
    render(await Inicio({ user: USER, org: ORG, visiveis: ["/app", "/app/agenda"] }));
    expect(bloco("Agenda de hoje")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Conversas esperando" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Minhas tarefas" })).toBeNull();
    expect(deps.conversas).not.toHaveBeenCalled();
    expect(deps.tarefas).not.toHaveBeenCalled();
  });

  it("um bloco que falha mostra o aviso só nele; os outros seguem com os números", async () => {
    deps.agenda.mockRejectedValue(new Error("caiu"));
    render(await Inicio({ user: USER, org: ORG, visiveis: TUDO }));
    expect(within(bloco("Agenda de hoje")).getByRole("status")).toHaveTextContent(FALHOU);
    expect(within(bloco("Conversas esperando")).getByText("3")).toBeInTheDocument();
    expect(within(bloco("Minhas tarefas")).getByText("Atrasada")).toBeInTheDocument();
    expect(deps.tarefas).toHaveBeenCalledWith({}, "org-1", "u-1", expect.anything(), new Date("2026-09-25T15:00:00Z"));
  });

  it("a espera de hoje mostra a hora; a de antes de hoje, o dia", async () => {
    render(await Inicio({ user: USER, org: ORG, visiveis: TUDO }));
    const conversas = bloco("Conversas esperando");
    expect(within(conversas).getByRole("link", { name: /Ana/ })).toHaveTextContent("11:05");
    expect(within(conversas).getByRole("link", { name: /Bia/ })).toHaveTextContent("24/09");
  });
});

describe("frescor", () => {
  function visibilidade(estado: "visible" | "hidden") {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => estado });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
  }

  it("a aba voltar a ficar visível pede os números de agora; foco sozinho e aba escondida, não", () => {
    render(<RecarregarAoVoltar />);
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(deps.refresh).not.toHaveBeenCalled();
    visibilidade("hidden");
    expect(deps.refresh).not.toHaveBeenCalled();
    visibilidade("visible");
    expect(deps.refresh).toHaveBeenCalledTimes(1);
  });
});
