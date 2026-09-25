import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
}));

import { NavHub } from "@/components/shell/NavHub";
import type { Role } from "@/lib/auth/types";
import { destinoDoHub } from "@/lib/convexy/menu/montar";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
import type { NavGroupId } from "@/lib/navigation/catalogo";

/**
 * Convexy — sem páginas-hub (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.4).
 * Com o módulo ligado, cada hub vai à PRIMEIRA TELA VISÍVEL da porta dele; link
 * antigo ou favorito continua funcionando. Desligado, é o hub do original.
 */
const BASE = { isPlatformAdmin: false, title: "Hub", subtitle: "", locale: "pt-BR" as const };

describe("com o módulo ligado, o hub vai à porta dele", () => {
  it.each([
    ["crm", "admin", "/app/contacts"],
    ["ia", "admin", "/app/ai/agents"],
    ["analise", "admin", "/app/metrics"],
    ["organizacao", "admin", "/app/connections"],
    ["ia", "agent", "/app/ai/inbox"],
    ["organizacao", "agent", "/app/extensions"],
  ] as Array<[NavGroupId, Role, string]>)("hub %s, como %s, vai a %s", (group, role, destino) => {
    expect(() => NavHub({ ...BASE, group, role, modulosLigados: [MODULO_DO_MENU] })).toThrow(
      `NEXT_REDIRECT:${destino}`,
    );
  });

  it("respeita a interface: a primeira tela VISÍVEL", () => {
    expect(
      destinoDoHub("crm", {
        isPlatformAdmin: false,
        role: "admin",
        interfaceSettings: { preset: "completa", destinos: ["/app/products"] },
        modulosLigados: [MODULO_DO_MENU],
      }),
    ).toBe("/app/products");
  });

  it("porta sem tela visível não redireciona — o hub do original é desenhado", () => {
    expect(
      destinoDoHub("ia", {
        isPlatformAdmin: false,
        role: "viewer",
        interfaceSettings: { preset: "completa", destinos: ["/app/inbox"] },
        modulosLigados: [MODULO_DO_MENU],
      }),
    ).toBeNull();
  });
});

describe("com o módulo desligado, é o hub do original", () => {
  it("desenha, sem redirecionar", () => {
    expect(() => NavHub({ ...BASE, group: "crm", role: "admin", modulosLigados: [] })).not.toThrow();
    expect(destinoDoHub("crm", { isPlatformAdmin: false, role: "admin", modulosLigados: [] })).toBeNull();
  });
});
