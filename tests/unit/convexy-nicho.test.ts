import { describe, expect, it } from "vitest";

import { NICHOS, NICHO_PADRAO, lerNicho, nichoSchema } from "@/lib/convexy/nicho";
import { PACOTES } from "@/lib/onboarding/pacotes-de-funil";

/**
 * Convexy — o nicho da organização (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.1).
 * Um vocabulário só: os ids dos pacotes de funil do onboarding. A CHECK do banco
 * é conferida contra o mesmo `NICHOS` em tests/invariants/convexy-nicho.test.ts.
 */
describe("nicho da organização", () => {
  it("os valores são os ids dos pacotes de funil do onboarding", () => {
    expect([...NICHOS].sort()).toEqual(PACOTES.map((p) => p.id).sort());
  });

  it("o padrão é o genérico, que também é o último recurso do onboarding", () => {
    expect(NICHO_PADRAO).toBe("generico");
  });

  it("nulo, desconhecido ou de outro tipo vira genérico, sem lançar", () => {
    for (const bruto of [null, undefined, "", "dentista", "Clinica", 3, { nicho: "clinica" }]) {
      expect(lerNicho(bruto)).toBe(NICHO_PADRAO);
    }
  });

  it("valor válido passa como veio", () => {
    for (const nicho of NICHOS) expect(lerNicho(nicho)).toBe(nicho);
  });

  it("o schema da rota recusa o que o banco recusa", () => {
    expect(nichoSchema.safeParse("dentista").success).toBe(false);
    expect(nichoSchema.safeParse(null).success).toBe(false);
    expect(nichoSchema.safeParse("clinica").success).toBe(true);
  });
});
