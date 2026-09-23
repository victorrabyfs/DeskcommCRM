import { describe, expect, it } from "vitest";

import { CABECALHO_VERSAO_CONVEXY } from "./_convexy-cabecalho";

/**
 * Convexy: as versões do fork são `X.Y.Z-cvx.N` e cada uma tem sua seção no
 * CHANGELOG (o botão "Atualizar" corta as notas no cabeçalho da versão
 * instalada). A régua de `release-chega-na-lp.test.ts` passa a usar esta regex.
 */
describe("cabeçalho de versão do CHANGELOG no fork", () => {
  it.each([
    "## [1.44.0] — 2026-09-23",
    "## [1.44.0-cvx.1] — 2026-09-24",
    "## [1.44.0-cvx.12] - 2026-10-01",
  ])("aceita %s", (linha) => {
    expect(CABECALHO_VERSAO_CONVEXY.test(linha)).toBe(true);
  });

  it.each([
    "## [1.44.0-rc1] — 2026-09-23",
    "## [1.44.0-cvx] — 2026-09-23",
    "## [1.44.0-cvx.1]",
    "## 1.44.0-cvx.1 — 2026-09-23",
  ])("recusa %s", (linha) => {
    expect(CABECALHO_VERSAO_CONVEXY.test(linha)).toBe(false);
  });

  it("captura a versão inteira, com o sufixo", () => {
    expect("## [1.44.0-cvx.3] — 2026-09-30".match(CABECALHO_VERSAO_CONVEXY)?.[1]).toBe("1.44.0-cvx.3");
  });
});
