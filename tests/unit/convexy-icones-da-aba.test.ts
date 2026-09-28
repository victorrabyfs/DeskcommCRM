import { describe, expect, it } from "vitest";

import { iconeDaAba } from "@/lib/branding/icone";
import { iconesDaAba } from "@/lib/convexy/icones-da-aba";

/**
 * Convexy — o ícone da aba nos dois modos do sistema (migration 9003; CONVEXY.md,
 * "Símbolo e ícone da aba"). Sem ícone escuro, o resultado é o do original.
 */
const BASE = "https://storage.exemplo.test";
const CLARO = "platform/0b5c1f7e-2a3d-4c8e-9f10-1234567890ab.png";
const ESCURO = "platform/1c6d2a8f-3b4e-4d9f-8a21-2345678901bc.png";

describe("iconesDaAba", () => {
  it("sem ícone escuro, é exatamente o do original", () => {
    expect(iconesDaAba({ favicon_path: CLARO }, BASE)).toEqual({ icon: iconeDaAba(CLARO, BASE) });
    expect(iconesDaAba(null, BASE)).toEqual({ icon: "/icon" });
    expect(iconesDaAba({ favicon_path: CLARO, favicon_dark_path: "  " }, BASE)).toEqual({ icon: iconeDaAba(CLARO, BASE) });
  });

  it("com ícone escuro, um link por modo do sistema", () => {
    expect(iconesDaAba({ favicon_path: CLARO, favicon_dark_path: ESCURO }, BASE)).toEqual({
      icon: [
        { url: iconeDaAba(CLARO, BASE), media: "(prefers-color-scheme: light)" },
        { url: `${BASE}/storage/v1/object/public/brand-logos/${ESCURO}`, media: "(prefers-color-scheme: dark)" },
      ],
    });
  });

  it("só o escuro subido: o claro é o ícone desenhado", () => {
    const icones = iconesDaAba({ favicon_dark_path: ESCURO }, BASE) as { icon: Array<{ url: string }> };
    expect(icones.icon[0]!.url).toBe("/icon");
  });

  it("sem base de storage, cai no ícone do original", () => {
    expect(iconesDaAba({ favicon_path: CLARO, favicon_dark_path: ESCURO }, "")).toEqual({ icon: "/icon" });
  });
});
