import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ativoNoCaminho, donoDoCaminho } from "@/lib/convexy/menu/dono";
import { PORTAS, posicoesPorPadrao } from "@/lib/convexy/menu/mapa";
import { NAV_CATALOG, NAV_GROUPS, type NavMetadata } from "@/lib/navigation/catalogo";

/**
 * Convexy — uma tela, um dono (spec 3.3). Cada item é dono do seu endereço e do
 * que fica abaixo, exceto o que estiver abaixo de um item mais específico. As
 * páginas de detalhe fora da árvore são declaradas em `DONOS_EXTRAS`.
 */
/**
 * As páginas de `app/app`, como endereços. `_pasta` não é rota; `(grupo)` é
 * transparente (não entra no endereço); `@slot` é rota paralela, não página do
 * menu; `[id]` vira um exemplo concreto.
 */
function paginas(dir: string, prefixo = "/app"): string[] {
  const rotas: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.isFile() && entrada.name === "page.tsx") rotas.push(prefixo);
    if (!entrada.isDirectory() || entrada.name.startsWith("_") || entrada.name.startsWith("@")) continue;
    const transparente = entrada.name.startsWith("(") && entrada.name.endsWith(")");
    const segmento = entrada.name.startsWith("[") ? "exemplo" : entrada.name;
    rotas.push(...paginas(path.join(dir, entrada.name), transparente ? prefixo : `${prefixo}/${segmento}`));
  }
  return rotas;
}

const PAGINAS = paginas(path.join(process.cwd(), "app", "app")).sort();
const HREFS = [
  ...PORTAS.flatMap((p) => p.grupos.flatMap((g) => g.hrefs)),
  ...posicoesPorPadrao(NAV_CATALOG as readonly NavMetadata[]).map((p) => p.href),
];
const HUBS = new Set(NAV_GROUPS.flatMap((g) => (g.hub ? [g.hub.href] : [])));

describe("cada page.tsx de app/app tem um dono", () => {
  it("varreu as páginas de verdade (guarda de vacuidade)", () => {
    expect(PAGINAS.length).toBeGreaterThan(60);
    expect(PAGINAS).toContain("/app/ai/agents/exemplo");
  });

  it("toda página tem dono — só os quatro hubs não, e eles vão à porta deles", () => {
    const semDono = PAGINAS.filter((rota) => !HUBS.has(rota) && donoDoCaminho(rota, HREFS) === null);
    expect(semDono, `Página sem dono no menu da Convexy — dê uma posição em lib/convexy/menu/mapa.ts:\n  ${semDono.join("\n  ")}`).toEqual([]);
    for (const hub of HUBS) expect(donoDoCaminho(hub, HREFS), hub).toBeNull();
  });

  it("o Início é dono só de /app, nunca do que está abaixo", () => {
    expect(donoDoCaminho("/app", HREFS)).toBe("/app");
    expect(donoDoCaminho("/app/crm", HREFS)).toBeNull();
  });
});

describe("os pares que a spec nomeia resolvem certo", () => {
  it.each([
    ["/app/ai/agents/new", "/app/ai/agents"],
    ["/app/ai/agents/exemplo", "/app/ai/agents"],
    ["/app/settings/tenant/agenda", "/app/settings/tenant/agenda"],
    ["/app/settings/tenant", "/app/settings/tenant"],
    ["/app/settings/tenant/pipelines", "/app/settings/tenant/pipelines"],
    ["/app/ai/cases/avisos", "/app/ai/cases/avisos"],
    ["/app/ai/cases/exemplo", "/app/ai/cases"],
    ["/app/leads/exemplo", "/app/kanban"],
    ["/app/pipelines/exemplo", "/app/kanban"],
    ["/app/settings/canal-oficial", "/app/connections"],
    ["/app/settings/templates", "/app/connections"],
    ["/app/settings/tenant/whatsapp", "/app/connections"],
    ["/app/team/invite", "/app/team"],
    ["/app/ai/followups/enrollments/exemplo", "/app/ai/followups"],
    ["/app/settings/atualizacao", "/app/settings/atualizacao"],
  ])("%s é de %s", (caminho, dono) => {
    expect(donoDoCaminho(caminho, HREFS)).toBe(dono);
  });

  it("dono extra só vale com o dono visível — escondido, a tela não acende nada", () => {
    expect(donoDoCaminho("/app/leads/exemplo", ["/app/inbox"])).toBeNull();
  });
});

describe("ativoNoCaminho", () => {
  const portas = [
    { id: "contatos" as const, itens: [{ href: "/app/contacts" }] },
    { id: "configuracoes" as const, itens: [{ href: "/app/extensions" }] },
  ];

  it("devolve a porta que contém o dono", () => {
    expect(ativoNoCaminho("/app/contacts/exemplo", portas)).toEqual({ porta: "contatos", href: "/app/contacts" });
  });

  it("uma orientação carregada é o item mais específico, e é de Contatos", () => {
    expect(ativoNoCaminho("/app/extensions/abc", portas)).toEqual({ porta: "configuracoes", href: "/app/extensions" });
    expect(ativoNoCaminho("/app/extensions/abc", portas, ["/app/extensions/abc"])).toEqual({
      porta: "contatos",
      href: "/app/extensions/abc",
    });
  });

  it("sem dono visível, nada fica ativo", () => {
    expect(ativoNoCaminho("/app/crm", portas)).toBeNull();
  });
});
