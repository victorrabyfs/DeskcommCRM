import { describe, expect, it } from "vitest";

import {
  ESCONDIDAS_NA_CLINICA,
  ESCONDIDAS_PARA_TODOS,
  escondidaPelaConvexy,
} from "@/lib/convexy/telas-escondidas";
import { NICHOS } from "@/lib/convexy/nicho";
import { NAV_CATALOG } from "@/lib/navigation/catalogo";
import { destinosDaInterface, permitidos } from "@/lib/navigation/interface";
import { hubSections, searchable, sidebarGroups } from "@/lib/navigation/registry";
import { destinoDoHub, montarMenu } from "@/lib/convexy/menu/montar";
import type { Nicho } from "@/lib/convexy/nicho";

/**
 * Convexy — limpeza do menu (roteiro da plataforma nova, item 1). CONVEXY.md,
 * "Telas escondidas do menu". Esconder é APRESENTAÇÃO: a porta some do menu, do
 * hub, do ⌘K e do editor de interface; a rota e a página continuam existindo.
 */
const TODOS_OS_MODULOS = ["banco_externo", "fluxos_atendimento", "menu_convexy"] as const;
const hrefs = (lista: ReadonlyArray<{ href: string }>) => lista.map((d) => d.href);

describe("telas escondidas pela Convexy", () => {
  it("toda tela da lista existe no catálogo — href com erro de digitação não esconderia nada", () => {
    const catalogo = new Set<string>(NAV_CATALOG.map((d) => d.href));
    for (const href of [...ESCONDIDAS_PARA_TODOS, ...ESCONDIDAS_NA_CLINICA]) {
      expect(catalogo.has(href), href).toBe(true);
    }
  });

  it("as de todos somem em qualquer nicho, e mesmo sem nicho", () => {
    for (const href of ESCONDIDAS_PARA_TODOS) {
      expect(escondidaPelaConvexy(href)).toBe(true);
      for (const nicho of NICHOS) expect(escondidaPelaConvexy(href, nicho)).toBe(true);
    }
  });

  it("as da clínica somem só na clínica", () => {
    for (const href of ESCONDIDAS_NA_CLINICA) {
      expect(escondidaPelaConvexy(href, "clinica")).toBe(true);
      expect(escondidaPelaConvexy(href, "servicos")).toBe(false);
      expect(escondidaPelaConvexy(href, "generico")).toBe(false);
      expect(escondidaPelaConvexy(href)).toBe(false);
    }
  });

  it("o resto do catálogo não é tocado", () => {
    expect(escondidaPelaConvexy("/app/inbox", "clinica")).toBe(false);
    expect(escondidaPelaConvexy("/app/connections", "clinica")).toBe(false);
    expect(escondidaPelaConvexy("/app/campaigns", "clinica")).toBe(false);
  });

  it("some para o admin da plataforma também, com todos os módulos ligados", () => {
    const visiveis = hrefs(searchable(true, "admin", undefined, TODOS_OS_MODULOS, "clinica"));
    for (const href of [...ESCONDIDAS_PARA_TODOS, ...ESCONDIDAS_NA_CLINICA]) {
      expect(visiveis, href).not.toContain(href);
    }
    expect(visiveis).toContain("/app/inbox");
  });

  it("serviços vê Chamadas, Trunk SIP e Prospecção; clínica não", () => {
    const servicos = hrefs(searchable(false, "admin", undefined, TODOS_OS_MODULOS, "servicos"));
    for (const href of ESCONDIDAS_NA_CLINICA) expect(servicos, href).toContain(href);
    for (const href of ESCONDIDAS_PARA_TODOS) expect(servicos, href).not.toContain(href);
  });

  it("barra lateral, hub e editor de interface usam o mesmo filtro", () => {
    const naBarra = sidebarGroups(false, "admin", undefined, TODOS_OS_MODULOS, "clinica").flatMap((g) =>
      hrefs(g.items),
    );
    const noHub = (["crm", "analise", "organizacao", "canais"] as const).flatMap((g) =>
      hubSections(g, false, "admin", undefined, TODOS_OS_MODULOS, "clinica").flatMap((s) => hrefs(s.items)),
    );
    const noEditor = hrefs(permitidos(false, "admin", undefined, "clinica"));
    const naInterface = hrefs(destinosDaInterface(undefined, false, "admin", undefined, "clinica"));
    for (const lista of [naBarra, noHub, noEditor, naInterface]) {
      for (const href of [...ESCONDIDAS_PARA_TODOS, ...ESCONDIDAS_NA_CLINICA]) {
        expect(lista, href).not.toContain(href);
      }
    }
  });

  it("uma interface salva que marcou uma tela escondida não a traz de volta", () => {
    const salva = { preset: "completa", destinos: ["/app/inbox", "/app/products", "/app/prospecting"] };
    expect(hrefs(destinosDaInterface(salva, false, "admin", undefined, "clinica"))).not.toContain("/app/products");
    expect(hrefs(destinosDaInterface(salva, false, "admin", undefined, "clinica"))).not.toContain(
      "/app/prospecting",
    );
  });

  it("o hub do CRM na clínica, com o menu Convexy, não leva a uma tela escondida", () => {
    const destino = destinoDoHub("crm", {
      isPlatformAdmin: false,
      role: "admin",
      modulosLigados: ["menu_convexy"],
      nicho: "clinica",
    });
    expect(destino).not.toBeNull();
    expect([...ESCONDIDAS_PARA_TODOS, ...ESCONDIDAS_NA_CLINICA]).not.toContain(destino);
  });

  it("no menu da Convexy, a porta Pacientes da clínica vira link direto para Contatos", () => {
    const portas = (nicho: Nicho) =>
      montarMenu({
        visiveis: searchable(false, "admin", undefined, ["menu_convexy"], nicho),
        atualizacao: false,
        nicho,
        idioma: "pt-BR",
      });
    const itens = (nicho: Nicho, id: string) =>
      hrefs(portas(nicho).find((p) => p.id === id)?.itens ?? []);

    const contatosDaClinica = portas("clinica").find((p) => p.id === "contatos");
    expect(contatosDaClinica?.direta).toBe(true);
    expect(hrefs(contatosDaClinica?.itens ?? [])).toEqual(["/app/contacts"]);
    expect(itens("clinica", "conversas")).not.toContain("/app/calls");
    expect(itens("clinica", "agenda")).toEqual(["/app/agenda", "/app/settings/tenant/agenda"]);
    expect(itens("clinica", "resultados")).not.toContain("/app/faturamento");

    expect(itens("servicos", "contatos")).toEqual(["/app/contacts", "/app/prospecting"]);
    expect(itens("servicos", "conversas")).toContain("/app/calls");
  });
});
