import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Convexy — guarda de fonte da Fila do Início (Decisão 15 do plano). O Início
 * COPIA o predicado da contagem da Fila de `app/api/v1/conversations/counts/route.ts`
 * (lá ele vive dentro do `GET`, sem função extraída). Se o original mudar a
 * régua, este teste reprova e a cópia é reaplicada à mão — a regra está no
 * CONVEXY.md, "Menu novo". Sem esta guarda, o número do Início e o badge do
 * Inbox divergiriam em silêncio.
 */
const leia = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const CONTAGEM = leia("app/api/v1/conversations/counts/route.ts");
const INICIO = leia("app/app/_convexy/inicio/blocos.ts");

describe("a Fila do Início é a Fila do Inbox", () => {
  it("o original ainda monta a contagem como o Início copiou", () => {
    const inicio = CONTAGEM.indexOf("  const countExact = () => {");
    expect(inicio).toBeGreaterThan(-1);
    const corpo = CONTAGEM.slice(inicio, CONTAGEM.indexOf("\n  };\n", inicio) + 5);
    expect(corpo).toContain('.select("id", { count: "exact", head: true })');
    expect(corpo).toContain('.eq("organization_id", org);');
    // `let q = …` e as três reatribuições condicionadas à URL (filtros auxiliares,
    // marcador, não lidas), que o Início não usa. Uma quinta é régua nova: reaplicar.
    expect(corpo.match(/\bq = /g)).toHaveLength(4);
  });

  it("o original ainda resolve o automático antes e pede o conjunto da Fila", () => {
    expect(CONTAGEM).toContain("const automaticoDaOrg = await orgTemAutomatico(supabase, org);");
    expect(CONTAGEM).toContain('countExact().in("comando_da_conversa", comandosDaFila(automaticoDaOrg)),');
  });

  it("o Início usa as mesmas peças, na mesma ordem", () => {
    const peças = [
      "await orgTemAutomatico(supabase, organizationId)",
      "comandosDaFila(automaticoDaOrg)",
      '.select("id", { count: "exact", head: true })',
      '.eq("organization_id", organizationId)',
      '.in("comando_da_conversa", comando)',
    ];
    const posicoes = peças.map((p) => INICIO.indexOf(p));
    expect(posicoes.every((p) => p > -1)).toBe(true);
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });
});
