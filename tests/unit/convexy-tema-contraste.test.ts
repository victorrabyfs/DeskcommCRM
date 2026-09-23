import { describe, expect, it } from "vitest";

import { derivarMarca, razaoDeContraste } from "@/lib/branding/contraste";
import { REGUA_DO_PRODUTO } from "@/lib/branding/regua-do-produto";

import { lerTemaConvexy, type Tema } from "./_convexy-tema";

/**
 * Convexy -cvx.3 (spec 7.2.5): pisos WCAG da paleta da Convexy, lendo o
 * `app/convexy/tema.css` de verdade — texto 4,5 (1.4.3), texto sutil 3 — e o
 * acento que a cor da Convexy gera pelo derivador do original, medido contra os
 * fundos NOVOS (o derivador mede contra a régua do original). Registro: CONVEXY.md.
 */

const TEMAS: readonly Tema[] = ["claro", "escuro"];
const FUNDOS = ["--color-bg", "--color-surface", "--color-surface-elevated"] as const;
const PISOS_DO_TEXTO = { "--color-text": 4.5, "--color-text-muted": 4.5, "--color-text-subtle": 3 } as const;
const COR_DA_CONVEXY = "#146BFF";

describe("contraste do tema da Convexy", () => {
  const tema = lerTemaConvexy();
  const marca = derivarMarca(COR_DA_CONVEXY, REGUA_DO_PRODUTO);

  function hex(t: Tema, token: string): string {
    const v = tema[t].get(token);
    if (!v || !/^#[0-9a-f]{6}$/i.test(v)) {
      throw new Error(`${token} (${t}) não é hex opaco no tema.css: ${String(v)}`);
    }
    return v;
  }

  const paresDeTexto = TEMAS.flatMap((t) =>
    FUNDOS.flatMap((fundo) =>
      Object.entries(PISOS_DO_TEXTO).map(([texto, piso]) => ({ t, fundo, texto, piso })),
    ),
  );

  it.each(paresDeTexto)("$texto sobre $fundo no tema $t ≥ $piso", ({ t, fundo, texto, piso }) => {
    const r = razaoDeContraste(hex(t, texto), hex(t, fundo));
    expect(r, `${texto} ${hex(t, texto)} sobre ${fundo} ${hex(t, fundo)} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(
      piso,
    );
  });

  it("o acento derivado da cor da Convexy é o medido na spec 7.2.4", () => {
    // Se isto mudar, o derivador do original mudou: reconferir 7.2.4 antes de atualizar.
    expect([marca.claro.accent, marca.claro.accentFg, marca.escuro.accent, marca.escuro.accentFg]).toEqual([
      "#1756c4",
      "#ffffff",
      "#6ea3ff",
      "#000000",
    ]);
  });

  const paresDoAcento = TEMAS.flatMap((t) => FUNDOS.map((fundo) => ({ t, fundo })));

  it.each(paresDoAcento)("acento sobre $fundo no tema $t ≥ 4,5", ({ t, fundo }) => {
    const r = razaoDeContraste(marca[t].accent, hex(t, fundo));
    expect(r, `${marca[t].accent} sobre ${hex(t, fundo)} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEMAS)("frente do acento sobre o acento no tema %s ≥ 4,5", (t) => {
    const r = razaoDeContraste(marca[t].accentFg, marca[t].accent);
    expect(r, `${marca[t].accentFg} sobre ${marca[t].accent} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  });
});
