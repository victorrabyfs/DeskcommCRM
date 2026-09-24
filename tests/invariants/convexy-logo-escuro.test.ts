import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { sql } from "./gov-helpers";
import { motivoDoErro } from "./psql-transporte";

/**
 * Convexy — o logo escuro da instalação (migration 9001), testemunhado pelo
 * BANCO (spec docs/superpowers/specs/2026-09-22-identidade-convexy-design.md,
 * 7.3.1; molde: tests/invariants/marca-logo.test.ts). Registro: CONVEXY.md.
 *
 * O que só o banco prova: (1) a coluna existe depois do baseline — código novo
 * sobre banco sem ela recebe 42703 e a instalação perde TODA a marca do banco
 * (`COLUNAS` de lib/branding/instalacao.ts é tudo-ou-nada); (2) a regra aceita
 * o caminho que a rota gera e recusa o resto; (3) reaplicar o bloco do
 * baseline — o que o update.sh faz em toda atualização — limpa valor fora da
 * forma em vez de quebrar.
 *
 * Cada caso roda numa transação desfeita no fim: o banco do arquivo é um clone
 * do molde (tests/db/banco-limpo-por-arquivo.ts), e mesmo assim nenhum caso
 * depende do que o anterior deixou. A saída do psql traz também BEGIN, INSERT,
 * NOTIFY…: só contam as linhas marcadas com SONDA|.
 */

const RAIZ = process.cwd();
const BASELINE = readFileSync(join(RAIZ, "supabase", "baseline.sql"), "utf8");
const ROTULO = "-- ---- logo escuro da instalação (migration 9001) ----";
const ROTULO_0158 = "-- ---- logo da marca: BUCKET e COLUNA (migration 0158) ----";
const ROTULO_0159 = "-- ---- o teto de IA que vincula (migration 0159) ----";
const PROXIMO_ROTULO = "\n-- ---- ";

const ARQUIVO_DA_MIGRATION = readdirSync(join(RAIZ, "supabase", "migrations")).find((f) =>
  /^\d{14}_9001_logo_escuro_da_instalacao\.sql$/.test(f),
);

const MARCA = "SONDA|";
const NOME = "9001aaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.png";
const CAMINHO = `platform/${NOME}`;
const CAMINHO_JPG = `platform/${NOME.replace(".png", ".jpg")}`;
const CAMINHO_CLARO = "platform/9001cccc-dddd-4eee-8fff-000000000000.png";
const ORG = "90010000-0000-4000-8000-000000000001";

/** O bloco rotulado da 9001, do rótulo até o próximo rótulo de apêndice. */
function blocoDa9001(): string {
  const inicio = BASELINE.indexOf(ROTULO);
  if (inicio === -1) throw new Error("rótulo da 9001 não encontrado no baseline");
  if (BASELINE.indexOf(ROTULO, inicio + 1) !== -1) throw new Error("rótulo da 9001 repetido no baseline");
  const fim = BASELINE.indexOf(PROXIMO_ROTULO, inicio + ROTULO.length);
  if (fim === -1) throw new Error("fim do bloco da 9001 não encontrado");
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

function gravarEscuro(valor: string): string {
  return `insert into public.platform_branding (id, logo_dark_path) values (1, '${valor}')
            on conflict (id) do update set logo_dark_path = excluded.logo_dark_path;`;
}

describe("a coluna do logo escuro existe e tem a forma do logo claro", () => {
  it("`logo_dark_path` é text e anulável, depois do baseline", () => {
    const [coluna] = sondas(`
      select '${MARCA}' || data_type || '|' || is_nullable
        from information_schema.columns
       where table_schema = 'public' and table_name = 'platform_branding'
         and column_name = 'logo_dark_path';`);
    expect(coluna, "sem a coluna o PostgREST devolve 42703 e a marca inteira cai no .env").toBe(
      "text|YES",
    );
  });

  it("a regra é a do logo claro com a coluna trocada — mesma regex, byte a byte", () => {
    const [mesma] = sondas(`
      select '${MARCA}' || (replace(pg_get_constraintdef(c.oid), 'logo_path', 'logo_dark_path')
                            = pg_get_constraintdef(d.oid))::text
        from pg_constraint c, pg_constraint d
       where c.conname = 'platform_branding_logo_path'
         and d.conname = 'platform_branding_logo_dark_path';`);
    expect(mesma, "as duas constraints existem e dizem a mesma regra").toBe("true");
  });
});

describe("`platform_branding.logo_dark_path` — a forma vive no banco", () => {
  it("aceita o caminho que a rota gera, em PNG e em JPG (controle positivo)", () => {
    for (const valido of [CAMINHO, CAMINHO_JPG]) {
      const [gravado] = sondas(`
        begin;
        ${gravarEscuro(valido)}
        select '${MARCA}' || logo_dark_path from public.platform_branding where id = 1;
        rollback;`);
      expect(gravado).toBe(valido);
    }
  });

  it("RECUSA caminho fora da forma, pelo nome da constraint", () => {
    for (const torto of [
      `${ORG}/${NOME}`, // caminho de organização na coluna da instalação
      "platform/x.png", // nome que não é uuid
      `platform/${NOME.replace(".png", ".svg")}`, // extensão banida
      `platform/sub/${NOME}`, // subpasta
      `../platform/${NOME}`, // travessia
    ]) {
      const erro = erroDo(`
        begin;
        ${gravarEscuro(torto)}
        rollback;`);
      expect(erro, `o banco ACEITOU "${torto}"`).not.toBeNull();
      expect(erro).toContain("platform_branding_logo_dark_path");
    }
  });

  it("as duas colunas são independentes: apagar o escuro não toca no claro", () => {
    const [claro, escuro] = sondas(`
      begin;
      insert into public.platform_branding (id, logo_path, logo_dark_path)
        values (1, '${CAMINHO_CLARO}', '${CAMINHO}')
        on conflict (id) do update
          set logo_path = excluded.logo_path, logo_dark_path = excluded.logo_dark_path;
      update public.platform_branding set logo_dark_path = null where id = 1;
      select '${MARCA}' || coalesce(logo_path, 'NULO') from public.platform_branding where id = 1;
      select '${MARCA}' || coalesce(logo_dark_path, 'NULO') from public.platform_branding where id = 1;
      rollback;`);
    expect(claro).toBe(CAMINHO_CLARO);
    expect(escuro).toBe("NULO");
  });
});

describe("o bloco do baseline — reaplicável e igual à migration", () => {
  it("o bloco está logo depois do da 0158 e antes do da 0159", () => {
    const aqui = BASELINE.indexOf(ROTULO);
    expect(aqui, "rótulo da 9001 ausente").toBeGreaterThan(0);
    expect(aqui).toBeGreaterThan(BASELINE.indexOf(ROTULO_0158));
    expect(aqui).toBeLessThan(BASELINE.indexOf(ROTULO_0159));
  });

  it("o bloco é a migration, sem os comentários", () => {
    expect(ARQUIVO_DA_MIGRATION, "arquivo <timestamp>_9001_logo_escuro_da_instalacao.sql ausente").toBeDefined();
    const migration = readFileSync(join(RAIZ, "supabase", "migrations", ARQUIVO_DA_MIGRATION!), "utf8");
    expect(codigo(blocoDa9001())).toBe(codigo(migration));
  });

  it("aplicado duas vezes seguidas, não erra (install e update)", () => {
    const erro = erroDo(`
      begin;
      ${blocoDa9001()}
      ${blocoDa9001()}
      rollback;`);
    expect(erro, `o bloco não é reaplicável: ${erro ?? ""}`).toBeNull();
  });

  it("controle: SEM o bloco, um valor torto gravado sem a regra sobrevive", () => {
    const [valor, regras] = sondas(`
      begin;
      alter table public.platform_branding drop constraint platform_branding_logo_dark_path;
      ${gravarEscuro("lixo/de-antes.svg")}
      select '${MARCA}' || coalesce(logo_dark_path, 'NULO') from public.platform_branding where id = 1;
      select '${MARCA}' || count(*)::text from pg_constraint where conname = 'platform_branding_logo_dark_path';
      rollback;`);
    expect(valor, "a simulação não gravou o valor torto — o caso de baixo mediria nada").toBe(
      "lixo/de-antes.svg",
    );
    expect(regras).toBe("0");
  });

  it("COM o bloco, o valor torto vira NULL e a regra volta — o que o update.sh faz", () => {
    const [valor, regras] = sondas(`
      begin;
      alter table public.platform_branding drop constraint platform_branding_logo_dark_path;
      ${gravarEscuro("lixo/de-antes.svg")}
      ${blocoDa9001()}
      select '${MARCA}' || coalesce(logo_dark_path, 'NULO') from public.platform_branding where id = 1;
      select '${MARCA}' || count(*)::text from pg_constraint where conname = 'platform_branding_logo_dark_path';
      rollback;`);
    expect(valor, "reaplicar o baseline deixou o valor fora da forma").toBe("NULO");
    expect(regras, "reaplicar o baseline não recriou a regra").toBe("1");
  });
});
