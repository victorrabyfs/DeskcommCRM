import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEPENDENCIAS, OBRIGATORIAS, areasLiberadas, limitarInterface, type PerfilDeAreas } from "@/lib/convexy/areas/calculo";
import { AREAS_DO_SELETOR, areasDaEmpresaSchema, criarPerfilSchema, listaDeAreasSchema } from "@/lib/convexy/areas/esquema";
import { PERFIS_SEMENTE } from "@/lib/convexy/areas/semente";
import { ESCONDIDAS_PARA_TODOS } from "@/lib/convexy/telas-escondidas";
import { NAV_CATALOG } from "@/lib/navigation/catalogo";
import { PORTAS_ESSENCIAIS, destinosDaInterface } from "@/lib/navigation/interface";

/**
 * Convexy — perfis de áreas, fase 1 (spec
 * docs/superpowers/specs/2026-09-25-convexy-perfis-de-areas-design.md, rev. 5).
 * O cálculo das áreas liberadas, a forma das escritas e a tela de área fora do
 * pacote. O banco é testemunhado em tests/invariants/convexy-perfis-de-areas.test.ts.
 */
const estado = vi.hoisted(() => ({
  caminho: "/app/inbox",
  activeOrg: null as null | { role: string; areas_liberadas?: readonly string[] },
}));

vi.mock("next/navigation", () => ({ usePathname: () => estado.caminho }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: estado.activeOrg }) }));
vi.mock("@/lib/branding/contexto", () => ({ useMarcaDaInstalacao: () => ({ name: "Convexy" }) }));

import { GuardaDoPacote } from "@/components/convexy/areas/GuardaDoPacote";

const CATALOGO = NAV_CATALOG.map((d) => d.href);
const perfil = (areas: string[], liberaTudo = false): PerfilDeAreas => ({
  id: "p",
  nome: "P",
  descricao: "",
  liberaTudo,
  areas,
});
const semAjustes = { perfilId: "p", aMais: [], aMenos: [] };

describe("a semente", () => {
  it("toda área semeada existe no catálogo e nenhuma é escondida para todos", () => {
    for (const p of PERFIS_SEMENTE) {
      for (const href of p.areas) {
        expect(CATALOGO, `${p.nome}: ${href}`).toContain(href);
        expect(ESCONDIDAS_PARA_TODOS as readonly string[], `${p.nome}: ${href}`).not.toContain(href);
      }
    }
  });

  it("só a Completa libera tudo, e sem lista", () => {
    expect(PERFIS_SEMENTE.filter((p) => p.liberaTudo).map((p) => [p.nome, p.areas.length])).toEqual([["Completa", 0]]);
  });

  it("Essencial é o perfil Simplificada do sistema (sem as portas essenciais, que são obrigatórias)", () => {
    const simplificada = destinosDaInterface({ preset: "simplificada" }, true, "admin")
      .map((d) => d.href)
      .filter((href) => !(PORTAS_ESSENCIAIS as readonly string[]).includes(href));
    const essencial = PERFIS_SEMENTE.find((p) => p.nome === "Essencial")!.areas;
    expect([...essencial].sort()).toEqual([...simplificada].sort());
  });

  it("Clínicas deixa de fora prospecção, voz e o que a Convexy esconde", () => {
    const clinicas = PERFIS_SEMENTE.find((p) => p.nome === "Clínicas")!.areas;
    for (const href of ["/app/prospecting", "/app/calls", "/app/settings/voip-trunk", "/app/webhooks", "/app/settings/api-tokens"]) {
      expect(clinicas).not.toContain(href);
    }
  });
});

describe("áreas liberadas", () => {
  it("sem perfil e sem ajustes: sem limite (o sistema fica como sem perfis)", () => {
    expect(areasLiberadas(null, { perfilId: null, aMais: [], aMenos: [] })).toBeNull();
    expect(areasLiberadas(perfil([], true), semAjustes)).toBeNull();
  });

  it("perfil com lista: a lista mais as obrigatórias, na ordem do catálogo", () => {
    const liberadas = areasLiberadas(perfil(["/app/tasks", "/app/inbox"]), semAjustes)!;
    for (const href of ["/app/inbox", "/app/tasks", ...OBRIGATORIAS]) expect(liberadas.has(href), href).toBe(true);
    expect(liberadas.has("/app/kanban")).toBe(false);
    expect([...liberadas]).toEqual(CATALOGO.filter((h) => liberadas.has(h)));
  });

  it("a mais soma, a menos tira — mas obrigatória nunca sai", () => {
    const liberadas = areasLiberadas(perfil(["/app/inbox", "/app/tasks"]), {
      perfilId: "p",
      aMais: ["/app/kanban"],
      aMenos: ["/app/tasks", "/app/connections"],
    })!;
    expect(liberadas.has("/app/kanban")).toBe(true);
    expect(liberadas.has("/app/tasks")).toBe(false);
    expect(liberadas.has("/app/connections")).toBe(true);
  });

  it("Completa com ajuste a menos: tudo, menos o tirado", () => {
    const liberadas = areasLiberadas(perfil([], true), { perfilId: "p", aMais: [], aMenos: ["/app/campaigns"] })!;
    expect(liberadas.has("/app/campaigns")).toBe(false);
    expect(liberadas.has("/app/inbox")).toBe(true);
  });

  it("fecho de dependências: sem Casos, caem Pedidos da IA, Assistentes e o que depende deles", () => {
    const liberadas = areasLiberadas(
      perfil(["/app/ai/agents", "/app/ai/inbox", "/app/ai/routers", "/app/ai/followups", "/app/inbox"]),
      semAjustes,
    )!;
    for (const href of ["/app/ai/inbox", "/app/ai/agents", "/app/ai/routers", "/app/ai/followups"]) {
      expect(liberadas.has(href), href).toBe(false);
    }
    expect(liberadas.has("/app/inbox")).toBe(true);
  });

  it("toda dependência declarada aponta para área do catálogo", () => {
    for (const [area, precisa] of Object.entries(DEPENDENCIAS)) {
      expect(CATALOGO, area).toContain(area);
      for (const d of precisa) expect(CATALOGO, d).toContain(d);
    }
  });

  it("href morto de um perfil antigo é ignorado", () => {
    expect(areasLiberadas(perfil(["/app/tela-que-sumiu"]), semAjustes)!.has("/app/tela-que-sumiu")).toBe(false);
  });
});

describe("a interface sob o limite", () => {
  const liberadas = new Set(["/app/inbox", "/app/tasks", ...OBRIGATORIAS]);

  it("sem limite, a interface passa como veio", () => {
    const completa = { preset: "completa" as const };
    expect(limitarInterface(completa, null)).toBe(completa);
  });

  it("completa vira as áreas liberadas", () => {
    const destinos = limitarInterface({ preset: "completa" }, liberadas).destinos!;
    expect(destinos).toContain("/app/inbox");
    expect(destinos).not.toContain("/app/kanban");
  });

  it("a escolha da pessoa só estreita dentro do pacote", () => {
    const destinos = limitarInterface({ preset: "completa", destinos: ["/app/inbox", "/app/kanban"] }, liberadas).destinos!;
    expect(destinos).toContain("/app/inbox");
    expect(destinos).not.toContain("/app/kanban");
  });

  it("sem interseção, sobram as obrigatórias — nunca `destinos: []`", () => {
    const destinos = limitarInterface({ preset: "completa", destinos: ["/app/kanban"] }, liberadas).destinos!;
    expect(destinos.length).toBeGreaterThan(0);
    for (const href of destinos) expect(OBRIGATORIAS).toContain(href);
  });
});

describe("a forma das escritas", () => {
  it("área desconhecida ou escondida para todos é recusada", () => {
    expect(listaDeAreasSchema.safeParse(["/app/tela-inventada"]).success).toBe(false);
    expect(listaDeAreasSchema.safeParse(["/app/products"]).success).toBe(false);
    expect(AREAS_DO_SELETOR).not.toContain("/app/extensions");
  });

  it("a lista sai sem repetição e na ordem do catálogo", () => {
    const lida = listaDeAreasSchema.parse(["/app/tasks", "/app/inbox", "/app/tasks"]);
    expect(lida).toEqual(CATALOGO.filter((h) => h === "/app/inbox" || h === "/app/tasks"));
  });

  it("perfil com nome vazio ou longo demais é recusado; campo a mais também", () => {
    expect(criarPerfilSchema.safeParse({ nome: "  ", areas: [] }).success).toBe(false);
    expect(criarPerfilSchema.safeParse({ nome: "x".repeat(61), areas: [] }).success).toBe(false);
    expect(criarPerfilSchema.safeParse({ nome: "Ok", areas: [], libera_tudo: true }).success).toBe(false);
  });

  it("as áreas da empresa exigem a versão lida (ou null, nunca gravado)", () => {
    const base = { perfil_de_areas_id: null, areas_a_mais: [], areas_a_menos: [] };
    expect(areasDaEmpresaSchema.safeParse(base).success).toBe(false);
    expect(areasDaEmpresaSchema.safeParse({ ...base, versao: null }).success).toBe(true);
  });
});

describe("a tela de área fora do pacote", () => {
  const LIBERADAS = ["/app", "/app/inbox", "/app/settings/profile", "/app/settings/security", "/app/team", "/app/settings/tenant", "/app/lgpd/requests", "/app/connections"];

  beforeEach(() => {
    estado.activeOrg = { role: "admin", areas_liberadas: LIBERADAS };
  });

  it("área liberada: a tela abre", () => {
    estado.caminho = "/app/inbox/abc";
    render(<GuardaDoPacote><p>tela</p></GuardaDoPacote>);
    expect(screen.getByText("tela")).toBeInTheDocument();
  });

  it("área fora do pacote, inclusive por página de detalhe: o aviso no lugar da tela", () => {
    estado.caminho = "/app/campaigns/nova";
    render(<GuardaDoPacote><p>tela</p></GuardaDoPacote>);
    expect(screen.queryByText("tela")).toBeNull();
    expect(screen.getByRole("heading", { name: "Esta área não faz parte do pacote da sua empresa." })).toBeInTheDocument();
    expect(screen.getByText("Para incluí-la, fale com a Convexy.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao Início" })).toHaveAttribute("href", "/app");
  });

  it("quem não administra é mandado ao administrador da empresa", () => {
    estado.activeOrg = { role: "agent", areas_liberadas: LIBERADAS };
    estado.caminho = "/app/kanban";
    render(<GuardaDoPacote><p>tela</p></GuardaDoPacote>);
    expect(screen.getByText("Fale com o administrador da sua empresa.")).toBeInTheDocument();
  });

  it("dono extra (card do funil) também é bloqueado pela área dona", () => {
    estado.caminho = "/app/leads/abc";
    render(<GuardaDoPacote><p>tela</p></GuardaDoPacote>);
    expect(screen.queryByText("tela")).toBeNull();
  });

  it("hub e página sem dono não são bloqueados; sem limite, nada é", () => {
    estado.caminho = "/app/crm";
    const { unmount } = render(<GuardaDoPacote><p>tela</p></GuardaDoPacote>);
    expect(screen.getByText("tela")).toBeInTheDocument();
    unmount();
    estado.activeOrg = { role: "admin" };
    estado.caminho = "/app/campaigns";
    render(<GuardaDoPacote><p>tela</p></GuardaDoPacote>);
    expect(screen.getByText("tela")).toBeInTheDocument();
  });
});
