import { describe, expect, it } from "vitest";

import {
  HREF_DA_ATUALIZACAO,
  PADRAO_POR_GRUPO,
  PORTAS,
  PORTA_DO_HUB,
  organizarPorPortas,
  posicoesPorPadrao,
} from "@/lib/convexy/menu/mapa";
import { NAV_CATALOG, NAV_GROUPS, type NavGroupId, type NavMetadata } from "@/lib/navigation/catalogo";

/**
 * Convexy — o mapa do menu (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md,
 * 3.1 e 3.2). O menu é uma PROJEÇÃO do `NAV_CATALOG` do original: tela nova do
 * original entra sozinha pela porta do `group` dela, e o CI só reprova o que não
 * dá para decidir sozinho — um `group` novo.
 */
const CATALOGO = NAV_CATALOG as readonly NavMetadata[];
const ORGANIZADO = organizarPorPortas(CATALOGO);
const EXPLICITOS = PORTAS.flatMap((p) => p.grupos.flatMap((g) => g.hrefs));
const PADRAO = posicoesPorPadrao(CATALOGO);

function posicaoDe(href: string) {
  for (const { porta, grupos } of ORGANIZADO) {
    for (const { grupo, itens } of grupos) {
      if (itens.some((i) => i.href === href)) return { porta, grupo };
    }
  }
  return null;
}

describe("cobertura", () => {
  it("todo href do catálogo cai numa porta, exatamente uma vez", () => {
    const vistos = ORGANIZADO.flatMap((p) => p.grupos.flatMap((g) => g.itens.map((i) => i.href)));
    expect([...vistos].sort()).toEqual(CATALOGO.map((d) => d.href).sort());
  });

  it("todo href explícito existe no catálogo — a tela de atualização é a única de fora", () => {
    const catalogo = new Set(CATALOGO.map((d) => d.href));
    expect(EXPLICITOS.filter((h) => h !== HREF_DA_ATUALIZACAO && !catalogo.has(h))).toEqual([]);
  });

  it("nenhum endereço aparece em duas posições (nenhum botão divide endereço)", () => {
    expect(new Set(EXPLICITOS).size).toBe(EXPLICITOS.length);
  });

  it("as portas são as da spec, nesta ordem, e só Configurações mora no rodapé", () => {
    expect(PORTAS.map((p) => p.id)).toEqual([
      "inicio", "conversas", "agenda", "contatos", "funil", "tarefas", "ia", "resultados", "configuracoes",
    ]);
    expect(PORTAS.filter((p) => p.rodape).map((p) => p.id)).toEqual(["configuracoes"]);
  });
});

describe("posição padrão pelo group do original", () => {
  it("todo group do original tem porta padrão", () => {
    for (const grupo of NAV_GROUPS) expect(PADRAO_POR_GRUPO[grupo.id], grupo.id).toBeDefined();
  });

  it("um group NOVO no original reprova, dizendo o que decidir", () => {
    expect(() =>
      organizarPorPortas([{ href: "/app/tela-nova", group: "grupo_novo" as NavGroupId }]),
    ).toThrow(/PADRAO_POR_GRUPO/);
  });

  it("tela nova de uso diário entra no grupo principal da porta do group dela", () => {
    const [ia] = organizarPorPortas([{ href: "/app/ai/nova", group: "ia", sidebar: true }]).filter(
      (p) => p.grupos.some((g) => g.itens.length > 0),
    );
    expect(ia?.porta.id).toBe("ia");
    expect(ia?.grupos.find((g) => g.itens.length > 0)?.grupo.id).toBe("principal");
  });

  it("tela nova sem uso diário entra no grupo secundário da tabela", () => {
    const [ia] = organizarPorPortas([{ href: "/app/ai/nova", group: "ia" }]).filter((p) =>
      p.grupos.some((g) => g.itens.length > 0),
    );
    expect(ia?.grupos.find((g) => g.itens.length > 0)?.grupo.id).toBe("avancado");
  });

  it("lista as posições por padrão, sem reprovar — o relatório de quem revisa o merge do original", () => {
    // `info` e não `log`: é relatório de propósito, lido no log do CI pela linha marcada.
    console.info(
      `[convexy-menu] posições por padrão (${PADRAO.length}): ${
        PADRAO.map((p) => `${p.href} → ${p.porta}/${p.grupo}`).join(", ") || "nenhuma"
      }`,
    );
    for (const p of PADRAO) expect(CATALOGO.some((d) => d.href === p.href)).toBe(true);
  });

  it("todo hub do original tem porta — hub novo sem porta reprova", () => {
    for (const grupo of NAV_GROUPS) {
      if (grupo.hub) expect(PORTA_DO_HUB[grupo.id], grupo.hub.href).toBeDefined();
    }
  });
});

describe("o uso diário do original fica no primeiro grupo da porta", () => {
  it("nenhuma entrada com sidebar: true cai em grupo secundário", () => {
    const erradas = CATALOGO.filter((d) => d.sidebar && posicaoDe(d.href)?.grupo.secundario).map(
      (d) => d.href,
    );
    expect(erradas).toEqual([]);
  });

  it("Roteadores, Provedores e Tipos de agendamento estão no grupo principal", () => {
    for (const href of ["/app/ai/routers", "/app/ai/providers", "/app/settings/tenant/agenda"]) {
      expect(posicaoDe(href)?.grupo.id, href).toBe("principal");
    }
  });

  it("Canais e integrações, com Conexões, abre Configurações", () => {
    const configuracoes = PORTAS.find((p) => p.id === "configuracoes");
    expect(configuracoes?.grupos[0]?.id).toBe("canais");
    expect(configuracoes?.grupos[0]?.hrefs[0]).toBe("/app/connections");
  });
});
