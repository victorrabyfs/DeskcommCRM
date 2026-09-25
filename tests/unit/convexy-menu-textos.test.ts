import { describe, expect, it } from "vitest";

import { PORTAS, ROTULOS_DOS_ITENS } from "@/lib/convexy/menu/mapa";
import { TEXTOS } from "@/lib/convexy/textos";
import { DICIONARIO } from "@/lib/i18n/dicionario";

/**
 * Convexy — todo texto tem espanhol (spec 8). Folha `{ pt, es }` é texto novo da
 * Convexy e traz as duas colunas; folha `string` é chave do dicionário do original
 * e precisa de `es` lá. Textos em `lib/convexy/textos.ts`, rótulos por nicho no
 * `mapa.ts`; aqui os dois são lidos como dado, folha por folha.
 */
function folhas(valor: unknown, caminho: string, achadas: Array<{ caminho: string; pt: string; es: string }> = []) {
  if (typeof valor === "string") {
    achadas.push({ caminho, pt: valor, es: DICIONARIO[valor]?.es ?? "" });
  } else if (valor && typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    if (typeof objeto.pt === "string" && typeof objeto.es === "string") {
      achadas.push({ caminho, pt: objeto.pt, es: objeto.es });
      return achadas;
    }
    for (const [chave, filho] of Object.entries(objeto)) folhas(filho, `${caminho}.${chave}`, achadas);
  }
  return achadas;
}

const DOS_TEXTOS = folhas(TEXTOS, "TEXTOS");
const DO_MAPA = [
  ...PORTAS.flatMap((p) => [
    ...folhas(p.rotulo, `porta:${p.id}`),
    ...p.grupos.flatMap((g) => (g.rotulo ? folhas(g.rotulo, `grupo:${p.id}/${g.id}`) : [])),
  ]),
  ...[...ROTULOS_DOS_ITENS.entries()].flatMap(([href, rotulo]) => folhas(rotulo, `item:${href}`)),
];

describe("espanhol nos textos da Convexy", () => {
  it("leu os textos de verdade (guarda de vacuidade)", () => {
    expect(DOS_TEXTOS.length).toBeGreaterThan(40);
    expect(DO_MAPA.length).toBeGreaterThan(20);
  });

  it("todo texto de textos.ts tem pt e es não vazios", () => {
    const buracos = DOS_TEXTOS.filter((f) => !f.pt.trim() || !f.es.trim()).map((f) => f.caminho);
    expect(buracos).toEqual([]);
  });

  it("todo rótulo do mapa — portas, grupos e rótulos por nicho — tem pt e es", () => {
    const buracos = DO_MAPA.filter((f) => !f.pt.trim() || !f.es.trim()).map((f) => f.caminho);
    expect(buracos).toEqual([]);
  });
});
