/**
 * Convexy: a cor da barra do navegador (`<meta name="theme-color">`).
 *
 * É o `--color-bg` de cada tema do `app/convexy/tema.css`. No original a cor sai
 * da régua (`lib/branding/barra-do-navegador.ts`, gerada do `globals.css`), e a
 * régua não muda no fork: o tema da Convexy é uma camada por cima dela. Os dois
 * hexes daqui são conferidos contra o `tema.css` em
 * `tests/unit/convexy-tema-contraste.test.ts` — uma fonte só, com um teste que
 * reprova a divergência.
 *
 * Segue a preferência do sistema operacional, não o tema escolhido no app, como
 * no original. Constante de propósito: o porquê de não virar
 * `generateViewport()` lendo o banco está no cabeçalho do arquivo do original.
 * Registro: CONVEXY.md, "Paleta, fontes e barra do navegador".
 */

import type { CorDaBarra } from "@/lib/branding/barra-do-navegador";

/** As duas entradas de `theme-color`, na ordem claro → escuro (o formato do original). */
export function coresDaBarraConvexy(): CorDaBarra[] {
  return [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0D10" },
  ];
}
