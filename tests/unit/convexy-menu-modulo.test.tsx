import { readFileSync } from "node:fs";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/settings/updateModuloDaInstalacao", () => ({ updateModuloDaInstalacao: vi.fn() }));
vi.mock("@/app/actions/settings/updateComportamento", () => ({ updateComportamento: vi.fn() }));

import { FormularioDeModulos } from "@/app/admin/(protected)/sistema/_form";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
import { CHAVE_DO_MODULO, MODULOS_OPCIONAIS } from "@/lib/instalacao/modulos";
import { NAV_CATALOG } from "@/lib/navigation/catalogo";
import {
  destinosDaInterface,
  homeDaInterface,
  interfaceSettingsSchema,
  interfaceTemDestino,
} from "@/lib/navigation/interface";
import { searchable, sidebarGroups } from "@/lib/navigation/registry";

/**
 * Convexy — o menu novo é um MÓDULO OPCIONAL da instalação (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 5 e 3.6).
 * Registro: CONVEXY.md, "Menu novo".
 */
describe("o módulo menu_convexy", () => {
  it("é um módulo opcional com a chave no formato da platform_config", () => {
    expect(MODULOS_OPCIONAIS).toContain(MODULO_DO_MENU);
    expect(CHAVE_DO_MODULO.menu_convexy).toBe("MODULO_MENU_CONVEXY");
    expect(CHAVE_DO_MODULO.menu_convexy).toMatch(/^[A-Z][A-Z0-9_]{2,63}$/);
  });

  it("tem interruptor em /admin/sistema", () => {
    render(<FormularioDeModulos ligados={["menu_convexy"]} />);
    expect(screen.getByRole("switch", { name: "Menu da Convexy" })).toHaveAttribute("aria-checked", "true");
  });

  it("todo módulo opcional tem interruptor — a lista da tela não é derivada da lista de módulos", () => {
    const fonte = readFileSync("app/admin/(protected)/sistema/_form.tsx", "utf8");
    for (const modulo of MODULOS_OPCIONAIS) expect(fonte).toContain(`modulo: "${modulo}"`);
  });
});

describe("o Início no catálogo do original", () => {
  it("é uma entrada do módulo, fora do menu clássico, com um ícone que o registro já conhece", () => {
    const inicio = NAV_CATALOG.find((d) => d.href === "/app");
    expect(inicio).toMatchObject({ label: "Início", icon: "Gauge", group: "atendimento", modulo: "menu_convexy" });
    expect(inicio && "sidebar" in inicio).toBe(false);
  });

  it("some por completo com o módulo desligado — menu clássico e busca", () => {
    expect(searchable(false, "admin", undefined, []).map((d) => d.href)).not.toContain("/app");
    expect(searchable(false, "admin", undefined, ["menu_convexy"]).map((d) => d.href)).toContain("/app");
    const noClassico = sidebarGroups(false, "admin", { preset: "completa", destinos: ["/app", "/app/inbox"] }, [])
      .flatMap((g) => g.items.map((i) => i.href));
    expect(noClassico).not.toContain("/app");
  });

  it("entra no perfil Simplificada — a recepção não fica sem o Início", () => {
    const hrefs = destinosDaInterface({ preset: "simplificada" }, false, "agent", ["menu_convexy"]).map((d) => d.href);
    expect(hrefs).toContain("/app");
    expect(hrefs).toContain("/app/inbox");
  });

  it("o redirect de /app nunca volta para /app — nem com o Início como única área escolhida", () => {
    const soInicio = interfaceSettingsSchema.parse({ preset: "completa", destinos: ["/app"] });
    expect(homeDaInterface(soInicio, false, "agent")).toBe("/app/settings/profile");
    expect(homeDaInterface({ preset: "completa", destinos: ["/app", "/app/tasks"] }, false, "agent")).toBe("/app/tasks");
    expect(homeDaInterface(null, false, "agent")).toBe("/app/inbox");
  });

  it("o Início não é área de trabalho: sozinho ele não resume nada", () => {
    expect(interfaceTemDestino({ preset: "completa", destinos: ["/app"] }, "agent")).toBe(false);
    expect(interfaceTemDestino({ preset: "completa", destinos: ["/app", "/app/tasks"] }, "agent")).toBe(true);
  });
});
