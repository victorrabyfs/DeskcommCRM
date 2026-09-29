import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_ORG, seedGov, sql, writeCountAs } from "./gov-helpers";
import { motivoDoErro } from "./psql-transporte";

/**
 * Convexy — período de teste da organização (migration 9006), testemunhado pelo
 * BANCO. Registro: CONVEXY.md, "Trial (v1.59.0-cvx.6)". Molde: convexy-nicho.
 */
const RAIZ = process.cwd();
const BASELINE = readFileSync(join(RAIZ, "supabase", "baseline.sql"), "utf8");
const ROTULO = "-- ---- teste da organização (migration 9006) ----";
const ROTULO_9005 = "-- ---- perfis de áreas (migration 9005) ----";
const ROTULO_0206 = "-- ---- elegibilidade da IA por origem do lead (migration 0206) ----";
const MARCA = "SONDA|";

const ARQUIVO_DA_MIGRATION = readdirSync(join(RAIZ, "supabase", "migrations")).find((f) =>
  /^\d{14}_9006_teste_da_organizacao\.sql$/.test(f),
);

function bloco(): string {
  const inicio = BASELINE.indexOf(ROTULO);
  if (inicio === -1) throw new Error("rótulo da 9006 não encontrado no baseline");
  if (BASELINE.indexOf(ROTULO, inicio + 1) !== -1) throw new Error("rótulo da 9006 repetido no baseline");
  const fim = BASELINE.indexOf("\n-- ---- ", inicio + ROTULO.length);
  return BASELINE.slice(inicio, fim);
}

const codigo = (texto: string) =>
  texto
    .split("\n")
    .map((linha) => linha.replace(/--.*$/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

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

beforeAll(() => {
  seedGov();
});

describe("o fim do teste mora na organização", () => {
  it("`organizations.teste_termina_em` é timestamptz e anulável", () => {
    const [coluna] = sondas(`
      select '${MARCA}' || data_type || '|' || is_nullable
        from information_schema.columns
       where table_schema = 'public' and table_name = 'organizations' and column_name = 'teste_termina_em';`);
    expect(coluna).toBe("timestamp with time zone|YES");
  });

  it("o admin da ORGANIZAÇÃO não estende o próprio teste pela REST", () => {
    expect(
      writeCountAs(GOV_ADMIN, `update public.organizations set teste_termina_em = now() + interval '1 year' where id = '${GOV_ORG}'`),
    ).toBe(0);
  });
});

describe("o bloco do baseline — reaplicável e igual à migration", () => {
  it("está logo depois do da 9005 e antes do da 0206", () => {
    const aqui = BASELINE.indexOf(ROTULO);
    expect(aqui).toBeGreaterThan(BASELINE.indexOf(ROTULO_9005));
    expect(aqui).toBeLessThan(BASELINE.indexOf(ROTULO_0206));
  });

  it("é a migration, sem os comentários", () => {
    expect(ARQUIVO_DA_MIGRATION).toBeDefined();
    const migration = readFileSync(join(RAIZ, "supabase", "migrations", ARQUIVO_DA_MIGRATION!), "utf8");
    expect(codigo(bloco())).toBe(codigo(migration));
  });

  it("aplicado duas vezes seguidas, não erra", () => {
    expect(erroDo(`begin; ${bloco()} ${bloco()} rollback;`)).toBeNull();
  });
});
