import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { sql } from "./gov-helpers";
import { motivoDoErro } from "./psql-transporte";

/**
 * Convexy — as colunas da marca da instalação que o fork acrescenta, testemunhadas
 * pelo BANCO (CONVEXY.md, "Símbolo e ícone da aba"; molde: convexy-nicho.test.ts):
 * o símbolo do menu recolhido (migration 9002) e o ícone da aba para o modo
 * escuro (migration 9003). As duas têm a forma de caminho do logo escuro (0406) e
 * do ícone da aba (0443) do original.
 *
 * O que só o banco prova: (1) a coluna existe depois do baseline, em install e em
 * update; (2) a CHECK aceita só caminho de arquivo da instalação no bucket;
 * (3) reaplicar o bloco do baseline, que é o que o update.sh faz, limpa valor
 * torto em vez de quebrar; (4) o bloco é a migration.
 *
 * Cada caso de escrita roda numa transação desfeita. Da saída do psql só contam
 * as linhas marcadas com SONDA|.
 */

const RAIZ = process.cwd();
const BASELINE = readFileSync(join(RAIZ, "supabase", "baseline.sql"), "utf8");
const MIGRATIONS = readdirSync(join(RAIZ, "supabase", "migrations"));
const PROXIMO_ROTULO = "\n-- ---- ";
const MARCA = "SONDA|";
const VALIDO = "platform/0b5c1f7e-2a3d-4c8e-9f10-1234567890ab.png";

const COLUNAS = [
  {
    coluna: "simbolo_path",
    rotulo: "-- ---- símbolo da instalação (migration 9002) ----",
    depoisDe: "-- ---- logo por tema: coluna da instalação (migration 0406) ----",
    antesDe: "-- ---- logo por tema: funções (migration 0406) ----",
    arquivo: /^\d{14}_9002_simbolo_da_instalacao\.sql$/,
  },
  {
    coluna: "favicon_dark_path",
    rotulo: "-- ---- ícone da aba escuro (migration 9003) ----",
    depoisDe: "-- ---- ícone da aba: coluna da instalação (migration 0443) ----",
    antesDe: null,
    arquivo: /^\d{14}_9003_icone_da_aba_escuro\.sql$/,
  },
] as const;

function blocoDe(rotulo: string): string {
  const inicio = BASELINE.indexOf(rotulo);
  if (inicio === -1) throw new Error(`rótulo "${rotulo}" não encontrado no baseline`);
  if (BASELINE.indexOf(rotulo, inicio + 1) !== -1) throw new Error(`rótulo "${rotulo}" repetido no baseline`);
  const fim = BASELINE.indexOf(PROXIMO_ROTULO, inicio + rotulo.length);
  return BASELINE.slice(inicio, fim === -1 ? undefined : fim);
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

describe.each(COLUNAS)("platform_branding.$coluna", ({ coluna, rotulo, depoisDe, antesDe, arquivo }) => {
  const regra = `platform_branding_${coluna}`;
  const gravar = (valorSql: string) => `
    insert into public.platform_branding (id, ${coluna}) values (1, ${valorSql})
    on conflict (id) do update set ${coluna} = excluded.${coluna};`;
  const ler = `select '${MARCA}' || coalesce(${coluna}, 'NULO') from public.platform_branding where id = 1;`;

  it("existe depois do baseline, text e anulável", () => {
    const [tipo] = sondas(`
      select '${MARCA}' || data_type || '|' || is_nullable
        from information_schema.columns
       where table_schema = 'public' and table_name = 'platform_branding' and column_name = '${coluna}';`);
    expect(tipo, "sem a coluna a leitura da marca da instalação falha").toBe("text|YES");
  });

  it("aceita caminho de arquivo da instalação e o nulo (controle positivo)", () => {
    const [gravado, nulo] = sondas(`begin; ${gravar(`'${VALIDO}'`)} ${ler} ${gravar("null")} ${ler} rollback;`);
    expect(gravado).toBe(VALIDO);
    expect(nulo).toBe("NULO");
  });

  it("RECUSA URL solta, caminho de organização e SVG, pelo nome da regra", () => {
    for (const torto of [
      "https://evil.test/x.png",
      "22222222-2222-4222-8222-222222222222/0b5c1f7e-2a3d-4c8e-9f10-1234567890ab.png",
      "platform/0b5c1f7e-2a3d-4c8e-9f10-1234567890ab.svg",
    ]) {
      const erro = erroDo(`begin; ${gravar(`'${torto}'`)} rollback;`);
      expect(erro, `o banco ACEITOU "${torto}"`).not.toBeNull();
      expect(erro).toContain(regra);
    }
  });

  it("o bloco do baseline fica no lugar registrado no CONVEXY.md", () => {
    const aqui = BASELINE.indexOf(rotulo);
    expect(aqui, "rótulo ausente").toBeGreaterThan(0);
    expect(aqui).toBeGreaterThan(BASELINE.indexOf(depoisDe));
    if (antesDe) expect(aqui).toBeLessThan(BASELINE.indexOf(antesDe));
  });

  it("o bloco é a migration, sem os comentários", () => {
    const nome = MIGRATIONS.find((f) => arquivo.test(f));
    expect(nome, `migration ${arquivo} ausente`).toBeDefined();
    const migration = readFileSync(join(RAIZ, "supabase", "migrations", nome!), "utf8");
    expect(codigo(blocoDe(rotulo))).toBe(codigo(migration));
  });

  it("aplicado duas vezes seguidas, não erra (install e update)", () => {
    const erro = erroDo(`begin; ${blocoDe(rotulo)} ${blocoDe(rotulo)} rollback;`);
    expect(erro, `o bloco não é reaplicável: ${erro ?? ""}`).toBeNull();
  });

  it("COM o bloco, um valor torto gravado sem a regra vira NULL e a regra volta", () => {
    const [antes, depois, regras] = sondas(`
      begin;
      alter table public.platform_branding drop constraint ${regra};
      ${gravar("'lixo-de-antes'")}
      ${ler}
      ${blocoDe(rotulo)}
      ${ler}
      select '${MARCA}' || count(*)::text from pg_constraint where conname = '${regra}';
      rollback;`);
    expect(antes, "a simulação não gravou o valor torto — o caso mediria nada").toBe("lixo-de-antes");
    expect(depois, "reaplicar o baseline deixou o valor torto").toBe("NULO");
    expect(regras, "reaplicar o baseline não recriou a regra").toBe("1");
  });
});
