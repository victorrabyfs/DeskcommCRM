import { describe, expect, it } from "vitest";

import { HREF_DA_ATUALIZACAO } from "@/lib/convexy/menu/mapa";
import { montarMenu, type EntradaDoMenu, type PortaDoMenu } from "@/lib/convexy/menu/montar";
import { searchable } from "@/lib/navigation/registry";

/**
 * Convexy — `montarMenu` (spec 3.5): a visibilidade NÃO é decidida aqui. O menu
 * recebe `searchable()` — papel, interface por vínculo, módulos e admin de
 * plataforma — e só agrupa, rotula e poda.
 */
const LIGADO = ["menu_convexy"] as const;

function montar(visiveis: EntradaDoMenu["visiveis"], extra: Partial<EntradaDoMenu> = {}): PortaDoMenu[] {
  return montarMenu({ visiveis, atualizacao: false, nicho: "generico", idioma: "pt-BR", ...extra });
}
const porta = (portas: PortaDoMenu[], id: PortaDoMenu["id"]) => portas.find((p) => p.id === id);
const hrefs = (p: PortaDoMenu | undefined) => p?.itens.map((i) => i.href) ?? [];

describe("filtra por searchable()", () => {
  it("perfil Simplificada da recepção: Início, portas diretas e Configurações", () => {
    const portas = montar(searchable(false, "agent", { preset: "simplificada" }, LIGADO));
    expect(portas.map((p) => p.id)).toEqual([
      "inicio", "conversas", "agenda", "contatos", "funil", "tarefas", "configuracoes",
    ]);
    expect(portas.filter((p) => p.direta).map((p) => p.id)).toEqual([
      "inicio", "conversas", "agenda", "contatos", "funil", "tarefas",
    ]);
  });

  it("destinos escolhidos: porta com dois itens tem sub; porta vazia some", () => {
    const portas = montar(
      searchable(false, "manager", { preset: "completa", destinos: ["/app/inbox", "/app/radar"] }, LIGADO),
    );
    expect(portas.map((p) => p.id)).toEqual(["conversas", "configuracoes"]);
    expect(porta(portas, "conversas")?.direta).toBe(false);
    expect(hrefs(porta(portas, "conversas"))).toEqual(["/app/inbox", "/app/radar"]);
  });

  it("viewer não vê o que o papel não alcança", () => {
    const portas = montar(searchable(false, "viewer", undefined, LIGADO));
    expect(hrefs(porta(portas, "ia"))).toEqual(["/app/ai/inbox", "/app/ai/proposals"]);
    expect(hrefs(porta(portas, "conversas"))).not.toContain("/app/calls");
  });

  it("módulo desligado: sem o Início (a entrada é do módulo)", () => {
    expect(porta(montar(searchable(false, "admin", undefined, [])), "inicio")).toBeUndefined();
  });

  it("porta com um item só vira direta", () => {
    const portas = montar(searchable(false, "agent", { preset: "completa", destinos: ["/app/tasks"] }, LIGADO));
    expect(porta(portas, "tarefas")).toMatchObject({ direta: true, itens: [{ href: "/app/tasks" }] });
  });
});

describe("atualização do sistema: só admin de plataforma fora do suporte", () => {
  it("aparece em Configurações › Sistema quando quem chama diz que pode", () => {
    const portas = montar(searchable(true, "admin", undefined, LIGADO), { atualizacao: true });
    const configuracoes = porta(portas, "configuracoes");
    expect(configuracoes?.grupos.at(-1)).toMatchObject({ id: "sistema", itens: [{ href: HREF_DA_ATUALIZACAO }] });
  });

  it("admin da organização, ou admin de plataforma em suporte, não vê", () => {
    // Quem chama passa `user.is_platform_admin && !user.support` nos dois lugares.
    const portas = montar(searchable(false, "admin", undefined, LIGADO), { atualizacao: false });
    expect(hrefs(porta(portas, "configuracoes"))).not.toContain(HREF_DA_ATUALIZACAO);
  });
});

describe("saúde da conexão", () => {
  it("sobe do item Conexões para a porta Configurações", () => {
    const configuracoes = porta(montar(searchable(false, "admin", undefined, LIGADO)), "configuracoes");
    expect(configuracoes?.healthDot).toBe(true);
    expect(configuracoes?.itens.find((i) => i.href === "/app/connections")?.healthDot).toBe(true);
  });

  it("quem não vê Conexões não vê o ponto", () => {
    expect(porta(montar(searchable(false, "agent", undefined, LIGADO)), "configuracoes")?.healthDot).toBe(false);
  });
});

describe("nomes", () => {
  it.each([
    ["clinica", "Pacientes", "Funil de pacientes"],
    ["servicos", "Contatos", "Funil de vendas"],
    ["generico", "Contatos", "Funil"],
    ["loja", "Contatos", "Funil"],
  ] as const)("nicho %s: %s e %s", (nicho, contatos, funil) => {
    const portas = montar(searchable(false, "admin", undefined, LIGADO), { nicho });
    expect(porta(portas, "contatos")?.rotulo).toBe(contatos);
    expect(porta(portas, "contatos")?.itens[0]).toMatchObject({ href: "/app/contacts", rotulo: contatos });
    expect(porta(portas, "funil")?.rotulo).toBe(funil);
  });

  it("os dois Meta Ads ficam distintos: Anúncios em Resultados, Meta Ads nas integrações", () => {
    const portas = montar(searchable(false, "admin", undefined, LIGADO));
    expect(porta(portas, "resultados")?.itens.find((i) => i.href === "/app/ads/meta")?.rotulo).toBe("Anúncios");
    expect(porta(portas, "configuracoes")?.itens.find((i) => i.href === "/app/settings/meta-ads")?.rotulo).toBe("Meta Ads");
  });

  it("item sem rótulo próprio usa o do catálogo, traduzido", () => {
    const portas = montar(searchable(false, "admin", undefined, LIGADO), { idioma: "es" });
    const templates = porta(portas, "conversas")?.itens.find((i) => i.href === "/app/templates");
    expect(templates?.rotulo).toBe("Respuestas rápidas");
    expect(porta(portas, "contatos")?.rotulo).toBe("Contactos");
    expect(porta(portas, "funil")?.rotulo).toBe("Embudo");
  });
});
