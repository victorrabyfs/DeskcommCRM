import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CAMINHO_DO_TEMA,
  PALETA_DA_SPEC,
  RAIZ,
  dentroDaCamada,
  foraDeCamada,
  lerBlocosDoGlobals,
  lerTemaConvexy,
  semComentarios,
  type Tema,
} from "./_convexy-tema";

/**
 * Convexy -cvx.3 (spec 7.2.5): o `app/convexy/tema.css` sobrepõe os tokens do
 * `app/globals.css` sem editá-lo. Este teste é o que pega o ORIGINAL renomeando
 * ou criando token num merge (spec seção 10): (a) nada no tema.css aponta para
 * token que sumiu; (b) todo `--color-*` literal dos blocos de tema do original —
 * menos acento e semânticas, que não são da paleta, e aliases em `var()`, que
 * acompanham sozinhos — está coberto. Registro: CONVEXY.md.
 */

const TEMAS: readonly Tema[] = ["claro", "escuro"];

/** Fora do alcance do tema.css (spec 7.2.1): acento e cores semânticas. */
const FORA_DO_TEMA = /^--color-(accent|success|warning|error|info)(-|$)/;

describe("tema da Convexy cobre os tokens do original", () => {
  const tema = lerTemaConvexy();
  const original = lerBlocosDoGlobals();

  it("o parser enxerga os dois lados (controle positivo)", () => {
    for (const t of TEMAS) {
      expect(original[t].size, `bloco ${t} do globals.css`).toBeGreaterThan(40);
      expect(tema[t].size, `bloco ${t} do tema.css`).toBeGreaterThanOrEqual(20);
    }
  });

  it.each(TEMAS)("(a) toda propriedade do tema.css existe no bloco %s do globals.css", (t) => {
    const orfas = [...tema[t].keys()].filter((k) => !original[t].has(k));
    expect(
      orfas,
      "o original renomeou ou removeu estes tokens — ajustar app/convexy/tema.css (CONVEXY.md)",
    ).toEqual([]);
  });

  it.each(TEMAS)("(b) todo --color-* literal do bloco %s do globals.css está no tema.css", (t) => {
    const exigidos = [...original[t]]
      .filter(([k, v]) => k.startsWith("--color-") && !FORA_DO_TEMA.test(k) && !v.startsWith("var("))
      .map(([k]) => k);
    expect(exigidos.length, "vacuidade: a tabela da spec tem 20 por tema").toBeGreaterThanOrEqual(20);
    const descobertos = exigidos.filter((k) => !tema[t].has(k));
    expect(
      descobertos,
      "o original criou tokens que a paleta da Convexy não cobre — decidir o valor e acrescentar ao tema.css",
    ).toEqual([]);
  });

  it.each(TEMAS)("as cores do tema %s são as da tabela da spec 7.2.1", (t) => {
    const cores = Object.fromEntries(
      [...tema[t]].filter(([k]) => k.startsWith("--color-")).map(([k, v]) => [k, v.toLowerCase()]),
    );
    const esperado = Object.fromEntries(
      Object.entries(PALETA_DA_SPEC[t]).map(([k, v]) => [k, v.toLowerCase()]),
    );
    expect(cores).toEqual(esperado);
  });

  it("sombras: as do claro trocam a tinta do original por #0B0D10; as do escuro ficam", () => {
    const sombrasDoOriginal = [...original.claro].filter(([k]) => k.startsWith("--shadow-"));
    expect(sombrasDoOriginal.length).toBe(5);
    for (const [k, v] of sombrasDoOriginal) {
      expect(tema.claro.get(k), k).toBe(v.replace(/rgba\(20, 18, 14,/g, "rgba(11, 13, 16,"));
    }
    expect([...tema.escuro.keys()].filter((k) => k.startsWith("--shadow-"))).toEqual([]);
  });

  describe("forma do tema.css", () => {
    const css = fs.readFileSync(path.join(RAIZ, CAMINHO_DO_TEMA), "utf8");

    it("começa fixando a ordem das camadas do Tailwind", () => {
      // `properties` primeiro: é a ordem que o Tailwind 4.3 publica (medido no build).
      expect(
        semComentarios(css).trimStart().startsWith("@layer properties, theme, base, components, utilities;"),
      ).toBe(true);
    });

    it("os blocos de token têm seletor dobrado e estão fora de qualquer @layer", () => {
      const fora = foraDeCamada(css);
      expect(fora).toMatch(/^\[data-theme="light"\]\[data-theme="light"\]\s*\{/m);
      expect(fora).toMatch(/^\[data-theme="dark"\]\[data-theme="dark"\]\s*\{/m);
    });

    it("sem !important", () => {
      expect(semComentarios(css)).not.toMatch(/!important/);
    });
  });

  it("o layout carrega o tema.css depois do globals.css", () => {
    const layout = fs.readFileSync(path.join(RAIZ, "app/layout.tsx"), "utf8");
    const globais = layout.indexOf('import "./globals.css";');
    const convexy = layout.indexOf('import "./convexy/tema.css";');
    expect(globais).toBeGreaterThan(-1);
    expect(convexy, "app/layout.tsx não importa ./convexy/tema.css depois do globals.css").toBeGreaterThan(
      globais,
    );
  });
});

describe("fontes da Convexy (spec 7.2.2)", () => {
  const css = fs.readFileSync(path.join(RAIZ, CAMINHO_DO_TEMA), "utf8");
  const layout = fs.readFileSync(path.join(RAIZ, "app/layout.tsx"), "utf8");

  it("h1–h3 em Lexend DENTRO de @layer base — utilitário (ex.: font-mono) continua vencendo", () => {
    const base = dentroDaCamada(css, "base");
    expect(base, "tema.css sem @layer base").not.toBeNull();
    expect((base ?? "").replace(/\s+/g, " ")).toContain(
      "h1, h2, h3 { font-family: var(--font-lexend), var(--font-atkinson), sans-serif; }",
    );
    expect(foraDeCamada(css), "regra de título fora de camada venceria o font-mono").not.toMatch(/\bh[1-3]\b/);
  });

  it("o ss01 do original é anulado FORA de camada (na Inter ele troca o desenho dos dígitos)", () => {
    expect(foraDeCamada(css).replace(/\s+/g, " ")).toContain("body { font-feature-settings: normal; }");
  });

  it("o layout usa Inter com a variável do original e Lexend Deca em --font-lexend", () => {
    expect(layout).not.toMatch(/Atkinson_Hyperlegible/);
    expect(layout).toMatch(/Inter\(\{[^}]*variable: "--font-atkinson"/);
    expect(layout).toMatch(/Lexend_Deca\(\{[^}]*variable: "--font-lexend"/);
    expect(layout).toContain("className={`${inter.variable} ${lexend.variable} ${plexMono.variable}`}");
  });
});
