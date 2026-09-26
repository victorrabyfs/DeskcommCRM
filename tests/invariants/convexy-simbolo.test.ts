import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { sql } from "./gov-helpers";
import { motivoDoErro } from "./psql-transporte";

/**
 * Convexy — o símbolo da marca da instalação (migration 9002), testemunhado pelo
 * BANCO (CONVEXY.md, "Símbolo da marca"; molde: tests/invariants/convexy-nicho.test.ts).
 *
 * O que só o banco prova: (1) a coluna existe depois do baseline, em install e
 * em update; (2) a CHECK aceita só caminho de arquivo da instalação no bucket;
 * (3) reaplicar o bloco do baseline, que é o que o update.sh faz, limpa valor
 * torto em vez de quebrar; (4) o bloco é a migration.
 *
 * Cada caso de escrita roda numa transação desfeita. Da saída do psql só contam
 * as linhas marcadas com SONDA|.
 */

const RAIZ = process.cwd();
const BASELINE = readFileSync(join(RAIZ, "supabase", "baseline.sql"), "utf8");
const ROTULO = "-- ---- símbolo da instalação (migration 9002) ----";
const ROTULO_COLUNA_0406 = "-- ---- logo por tema: coluna da instalação (migration 0406) ----";
const ROTULO_FUNCOES_0406 = "-- ---- logo por tema: funções (migration 0406) ----";
const PROXIMO_ROTULO = "\n-- ---- ";

const ARQUIVO_DA_MIGRATION = readdirSync(join(RAIZ, "supabase", "migrations")).find((f) =>
  /^\d{14}_9002_simbolo_da_instalacao\.sql$/.test(f),
);

const MARCA = "SONDA|";
const VALIDO = "platform/0b5c1f7e-2a3d-4c8e-9f10-1234567890ab.png";

function blocoDa9002(): string {
  const inicio = BASELINE.indexOf(ROTULO);
  if (inicio === -1) throw new Error("rótulo da 9002 não encontrado no baseline");
  if (BASELINE.indexOf(ROTULO, inicio + 1) !== -1) throw new Error("rótulo da 9002 repetido no baseline");
  const fim = BASELINE.indexOf(PROXIMO_ROTULO, inicio + ROTULO.length);
  if (fim === -1) throw new Error("fim do bloco da 9002 não encontrado");
  return BASELINE.slice(inicio, fim);
}

/** Só o que o Postgres executa: sem comentário de linha, espaço normalizado. */
function codigo(texto: string): string {
  return texto
    .split("\n")
    .map((linha) => linha.replace(/--.*$/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function sondas(script: string): string[] {
  return sql(script)
    .split("\n")
    .filter((linha) => linha.startsWith(MARCA))
    .map((linha) => linha.slice(MARCA.length));
}

function erroDo(script: string): string | null {
  try {
    sql(script);
    return null;
  } catch (err) {
    return motivoDoErro(err);
  }
}

const GRAVAR = (valorSql: string) => `
  insert into public.platform_branding (id, simbolo_path) values (1, ${valorSql})
  on conflict (id) do update set simbolo_path = excluded.simbolo_path;`;

describe("a coluna simbolo_path", () => {
  it("existe depois do baseline, text e anulável", () => {
    const [coluna] = sondas(`
      select '${MARCA}' || data_type || '|' || is_nullable
        from information_schema.columns
       where table_schema = 'public' and table_name = 'platform_branding' and column_name = 'simbolo_path';`);
    expect(coluna, "sem a coluna a leitura da marca da instalação falha e a barra perde o símbolo").toBe("text|YES");
  });

  it("aceita caminho de arquivo da instalação e o nulo (controle positivo)", () => {
    const [gravado, nulo] = sondas(`
      begin;
      ${GRAVAR(`'${VALIDO}'`)}
      select '${MARCA}' || simbolo_path from public.platform_branding where id = 1;
      ${GRAVAR("null")}
      select '${MARCA}' || coalesce(simbolo_path, 'NULO') from public.platform_branding where id = 1;
      rollback;`);
    expect(gravado).toBe(VALIDO);
    expect(nulo).toBe("NULO");
  });

  it("RECUSA URL solta, caminho de organização e SVG, pelo nome da constraint", () => {
    for (const torto of [
      "https://evil.test/x.png",
      "22222222-2222-4222-8222-222222222222/0b5c1f7e-2a3d-4c8e-9f10-1234567890ab.png",
      "platform/0b5c1f7e-2a3d-4c8e-9f10-1234567890ab.svg",
    ]) {
      const erro = erroDo(`begin; ${GRAVAR(`'${torto}'`)} rollback;`);
      expect(erro, `o banco ACEITOU "${torto}"`).not.toBeNull();
      expect(erro).toContain("platform_branding_simbolo_path");
    }
  });
});

describe("o bloco do baseline — reaplicável e igual à migration", () => {
  it("o bloco está entre a coluna e as funções da 0406", () => {
    const aqui = BASELINE.indexOf(ROTULO);
    expect(aqui, "rótulo da 9002 ausente").toBeGreaterThan(0);
    expect(aqui).toBeGreaterThan(BASELINE.indexOf(ROTULO_COLUNA_0406));
    expect(aqui).toBeLessThan(BASELINE.indexOf(ROTULO_FUNCOES_0406));
  });

  it("o bloco é a migration, sem os comentários", () => {
    expect(ARQUIVO_DA_MIGRATION, "arquivo <timestamp>_9002_simbolo_da_instalacao.sql ausente").toBeDefined();
    const migration = readFileSync(join(RAIZ, "supabase", "migrations", ARQUIVO_DA_MIGRATION!), "utf8");
    expect(codigo(blocoDa9002())).toBe(codigo(migration));
  });

  it("aplicado duas vezes seguidas, não erra (install e update)", () => {
    const erro = erroDo(`begin; ${blocoDa9002()} ${blocoDa9002()} rollback;`);
    expect(erro, `o bloco não é reaplicável: ${erro ?? ""}`).toBeNull();
  });

  it("COM o bloco, um valor torto gravado sem a regra vira NULL e a regra volta", () => {
    const [antes, depois, regras] = sondas(`
      begin;
      alter table public.platform_branding drop constraint platform_branding_simbolo_path;
      ${GRAVAR("'lixo-de-antes'")}
      select '${MARCA}' || coalesce(simbolo_path, 'NULO') from public.platform_branding where id = 1;
      ${blocoDa9002()}
      select '${MARCA}' || coalesce(simbolo_path, 'NULO') from public.platform_branding where id = 1;
      select '${MARCA}' || count(*)::text from pg_constraint where conname = 'platform_branding_simbolo_path';
      rollback;`);
    expect(antes, "a simulação não gravou o valor torto — o caso mediria nada").toBe("lixo-de-antes");
    expect(depois, "reaplicar o baseline deixou o valor torto").toBe("NULO");
    expect(regras, "reaplicar o baseline não recriou a regra").toBe("1");
  });
});
