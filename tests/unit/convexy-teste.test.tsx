import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — o período de teste (CONVEXY.md, "Trial"): contagem de dias, o cron
 * que suspende a organização vencida (sem apagar nada, com gravação condicional),
 * a organização suspensa que para de ser atendida e a etiqueta do menu.
 */
const estado = vi.hoisted(() => ({
  audit: vi.fn(),
  activeOrg: null as null | { teste?: { terminaEm: string; terminaEmLegivel: string; dias: number } },
}));
vi.mock("@/lib/audit", () => ({ audit: estado.audit }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: estado.activeOrg }) }));

import { TesteNoMenu } from "@/components/convexy/teste/TesteNoMenu";
import { organizacaoSuspensa, organizacaoSuspensaNoSupabase } from "@/lib/convexy/suspensao";
import { MOTIVO_DO_TESTE_ENCERRADO, diasRestantes, encerrarTestesVencidos, fimDoTeste } from "@/lib/convexy/teste";
import { testeDaOrganizacao } from "@/lib/convexy/teste-na-sessao";

const AGORA = new Date("2026-09-29T15:00:00Z");
const DIA = 86_400_000;

beforeEach(() => vi.clearAllMocks());

describe("contagem de dias", () => {
  it("dias de calendário no fuso: teste de 7 dias recém-criado mostra 7; o dia do fim é hoje; véspera é 1", () => {
    const SP = "America/Sao_Paulo";
    expect(diasRestantes(new Date(fimDoTeste(7, AGORA)), new Date(AGORA.getTime() + 50), SP)).toBe(7);
    expect(diasRestantes(new Date(AGORA.getTime() + 3 * 3600_000), AGORA, SP)).toBe(0);
    expect(diasRestantes(new Date(AGORA.getTime() + DIA), AGORA, SP)).toBe(1);
    expect(diasRestantes(new Date(AGORA.getTime() - DIA), AGORA, SP)).toBe(-1);
  });

  it("a virada do dia é a da organização, não a do servidor em UTC", () => {
    // 23:30 de 29/09 em São Paulo (02:30 UTC de 30/09); o teste acaba às 10:00 de 30/09 em SP.
    const noite = new Date("2026-09-30T02:30:00Z");
    expect(diasRestantes(new Date("2026-09-30T13:00:00Z"), noite, "America/Sao_Paulo")).toBe(1);
  });

  it("fim do teste = agora + N dias", () => {
    expect(fimDoTeste(14, AGORA)).toBe(new Date(AGORA.getTime() + 14 * DIA).toISOString());
  });

  it("na sessão: dias prontos e data no fuso da organização", () => {
    const t = testeDaOrganizacao(new Date(AGORA.getTime() + 4 * DIA + 60_000).toISOString(), "America/Sao_Paulo", "pt-BR", AGORA);
    expect(t.dias).toBe(4);
    expect(t.terminaEmLegivel).toContain("03/10");
  });
});

type Passo = [string, ...unknown[]];

function adminFalso(vencidas: Array<{ id: string; slug: string }>, gravaveis: string[]) {
  const cadeias: Array<{ tabela: string; passos: Passo[] }> = [];
  const admin = {
    from: (tabela: string) => {
      const passos: Passo[] = [];
      cadeias.push({ tabela, passos });
      const cadeia: Record<string, unknown> = {};
      for (const m of ["select", "eq", "not", "lte", "update", "insert"]) {
        cadeia[m] = (...args: unknown[]) => {
          passos.push([m, ...args]);
          return cadeia;
        };
      }
      cadeia.then = (fim: (v: unknown) => unknown) => {
        const atualiza = passos.some(([m]) => m === "update");
        if (!atualiza) return Promise.resolve({ data: vencidas, error: null }).then(fim);
        const alvo = passos.find(([m, k]) => m === "eq" && k === "id")?.[2] as string;
        return Promise.resolve({ data: gravaveis.includes(alvo) ? [{ id: alvo }] : [], error: null }).then(fim);
      };
      return cadeia;
    },
  };
  return { admin: admin as never, cadeias };
}

describe("o cron do teste", () => {
  it("suspende só as ativas vencidas, com gravação condicional, auditoria e evento — sem apagar nada", async () => {
    const { admin, cadeias } = adminFalso(
      [
        { id: "org-a", slug: "a" },
        { id: "org-b", slug: "b" },
      ],
      ["org-a"],
    );
    const suspensas = await encerrarTestesVencidos(admin, AGORA);
    expect(suspensas.map((o) => o.id)).toEqual(["org-a"]);

    const leitura = cadeias[0]!.passos;
    expect(leitura).toContainEqual(["eq", "status", "active"]);
    expect(leitura).toContainEqual(["lte", "teste_termina_em", AGORA.toISOString()]);

    const updateA = cadeias.find((c) => c.passos.some(([m, k, v]) => m === "eq" && k === "id" && v === "org-a"))!.passos;
    expect(updateA[0]).toEqual([
      "update",
      expect.objectContaining({ status: "suspended", suspended_by: null, suspended_reason: MOTIVO_DO_TESTE_ENCERRADO }),
    ]);
    expect(updateA).toContainEqual(["eq", "status", "active"]);
    expect(cadeias.some((c) => c.passos.some(([m]) => m === "delete"))).toBe(false);

    expect(estado.audit).toHaveBeenCalledTimes(1);
    expect(estado.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "tenant.suspended", organizationId: "org-a" }));
    expect(cadeias.filter((c) => c.tabela === "event_log")).toHaveLength(1);
  });

  it("sem vencidas, nada é gravado nem auditado", async () => {
    const { admin, cadeias } = adminFalso([], []);
    expect(await encerrarTestesVencidos(admin, AGORA)).toEqual([]);
    expect(cadeias).toHaveLength(1);
    expect(estado.audit).not.toHaveBeenCalled();
  });
});

describe("organização suspensa", () => {
  it("pelo pool do worker: só `suspended` barra; erro de leitura deixa passar", async () => {
    const pool = (status: string | null) => ({ query: async () => ({ rows: status === null ? [] : [{ status }] }) });
    expect(await organizacaoSuspensa(pool("suspended") as never, "o")).toBe(true);
    expect(await organizacaoSuspensa(pool("active") as never, "o")).toBe(false);
    expect(await organizacaoSuspensa(pool(null) as never, "o")).toBe(false);
    expect(await organizacaoSuspensa({ query: async () => { throw new Error("caiu"); } } as never, "o")).toBe(false);
  });

  it("pelo cliente do Supabase: o mesmo, e tabela que o dublê não conhece deixa passar", async () => {
    const supa = (status: string) => ({
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { status } }) }) }) }),
    });
    expect(await organizacaoSuspensaNoSupabase(supa("suspended"), "o")).toBe(true);
    expect(await organizacaoSuspensaNoSupabase(supa("active"), "o")).toBe(false);
    expect(await organizacaoSuspensaNoSupabase({ from: () => { throw new Error("tabela inesperada"); } }, "o")).toBe(false);
  });
});

describe("o teste no rodapé do menu", () => {
  const com = (dias: number) => ({ teste: { terminaEm: "x", terminaEmLegivel: "03/10 12:00", dias } });

  it("sem teste: nada", () => {
    estado.activeOrg = {};
    const { container } = render(<TesteNoMenu collapsed={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [12, "12 dias restantes", false],
    [7, "7 dias restantes", true],
    [2, "2 dias restantes", true],
    [1, "1 dia restante", true],
    [0, "Seu teste acaba hoje!", true],
  ])("%i dias: %s", (dias, texto, aviso) => {
    estado.activeOrg = com(dias);
    render(<TesteNoMenu collapsed={false} />);
    expect(screen.getByText("Teste grátis")).toBeInTheDocument();
    expect(screen.getByText(texto)).toBeInTheDocument();
    expect(screen.getByText("Termina em 03/10 12:00")).toBeInTheDocument();
    expect(screen.queryByRole("status") !== null).toBe(aviso);
  });

  it("recolhido: o relógio com o número de dias, e o texto para leitor de tela", () => {
    estado.activeOrg = com(5);
    render(<TesteNoMenu collapsed />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("5 dias restantes")).toHaveClass("sr-only");
  });
});
