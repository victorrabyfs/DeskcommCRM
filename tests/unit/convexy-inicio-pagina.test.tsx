import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveOrg, AuthUser } from "@/lib/auth/types";

/**
 * Convexy — `/app` (spec 7): com o módulo ligado e o Início visível, é o Início;
 * senão, o redirect de `homeDaInterface` do original — nunca de volta para `/app`.
 */
const deps = vi.hoisted(() => ({
  org: null as ActiveOrg | null,
  modulos: [] as string[],
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: async () => ({ id: "u-1", is_platform_admin: false, support: null, idioma: "pt-BR" }) as unknown as AuthUser,
  resolveActiveOrg: async () => deps.org,
}));
vi.mock("@/lib/instalacao/modulos", () => ({ modulosLigados: async () => deps.modulos }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/app/app/_convexy/inicio/Inicio", () => ({ Inicio: () => null }));

import AppHome from "@/app/app/page";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
import { Inicio } from "@/app/app/_convexy/inicio/Inicio";

const ADMIN: ActiveOrg = { orgId: "org-1", name: "Org", role: "admin", timezone: null };

beforeEach(() => {
  deps.org = ADMIN;
  deps.modulos = [];
});

describe("/app", () => {
  it("módulo desligado: o redirect do original", async () => {
    await expect(AppHome()).rejects.toThrow("NEXT_REDIRECT:/app/inbox");
  });

  it("módulo ligado e Início visível: o Início, com a lista do que a pessoa vê", async () => {
    deps.modulos = [MODULO_DO_MENU];
    const pagina = (await AppHome()) as ReactElement<{ visiveis: readonly string[] }>;
    expect(pagina.type).toBe(Inicio);
    expect(pagina.props.visiveis).toEqual(expect.arrayContaining(["/app", "/app/inbox", "/app/agenda", "/app/tasks"]));
  });

  it("módulo ligado e Início escondido: a primeira tela visível, pela regra do original", async () => {
    deps.modulos = [MODULO_DO_MENU];
    deps.org = { ...ADMIN, interface_settings: { preset: "completa", destinos: ["/app/tasks"] } };
    await expect(AppHome()).rejects.toThrow("NEXT_REDIRECT:/app/tasks");
  });

  it("módulo desligado e só o Início escolhido: sem laço", async () => {
    deps.org = { ...ADMIN, role: "agent", interface_settings: { preset: "completa", destinos: ["/app"] } };
    await expect(AppHome()).rejects.toThrow("NEXT_REDIRECT:/app/settings/profile");
  });

  it("sem organização ativa: o redirect do original", async () => {
    deps.org = null;
    deps.modulos = [MODULO_DO_MENU];
    await expect(AppHome()).rejects.toThrow("NEXT_REDIRECT:/app/settings/profile");
  });
});
