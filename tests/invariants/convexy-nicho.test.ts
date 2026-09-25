import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { NICHOS } from "@/lib/convexy/nicho";

import { GOV_ADMIN, GOV_ORG, seedGov, sql, writeCountAs } from "./gov-helpers";
import { motivoDoErro } from "./psql-transporte";

/**
 * Convexy — o nicho da organização (migration 9001), testemunhado pelo BANCO
 * (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.1 e 9;
 * molde: o invariante do logo escuro da v1.47.0-cvx.2). Registro: CONVEXY.md.
 *
 * O que só o banco prova: (1) a coluna existe depois do baseline, em install e
 * em update (o check `invariants` roda os dois); (2) a CHECK fala exatamente o
 * vocabulário de `NICHOS`; (3) o admin da organização não grava o nicho pela
 * REST — só o admin da plataforma escreve em organizations; (4) reaplicar o
 * bloco do baseline, que é o que o update.sh faz, limpa valor torto em vez de
 * quebrar.
 *
 * Cada caso de escrita roda numa transação desfeita. Da saída do psql só contam
 * as linhas marcadas com SONDA|.
 */

const RAIZ = process.cwd();
const BASELINE = readFileSync(join(RAIZ, "supabase", "baseline.sql"), "utf8");
const ROTULO = "-- ---- nicho da organização (migration 9001) ----";
const ROTULO_0208 = "-- ---- a moeda da organização deixa de ser presumida (migration 0208) ----";
const ROTULO_0206 = "-- ---- elegibilidade da IA por origem do lead (migration 0206) ----";
const PROXIMO_ROTULO = "\n-- ---- ";

const ARQUIVO_DA_MIGRATION = readdirSync(join(RAIZ, "supabase", "migrations")).find((f) =>
  /^\d{14}_9001_nicho_da_organizacao\.sql$/.test(f),
);

const MARCA = "SONDA|";

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

function nichoGravado(valorSql: string): string | undefined {
  const [gravado] = sondas(`
    begin;
    update public.organizations set nicho = ${valorSql} where id = '${GOV_ORG}';
    select '${MARCA}' || coalesce(nicho, 'NULO') from public.organizations where id = '${GOV_ORG}';
    rollback;`);
  return gravado;
}

beforeAll(() => {
  seedGov();
});

describe("a coluna nicho existe e fala o vocabulário do TypeScript", () => {
  it("`organizations.nicho` é text e anulável, depois do baseline", () => {
    const [coluna] = sondas(`
      select '${MARCA}' || data_type || '|' || is_nullable
        from information_schema.columns
       where table_schema = 'public' and table_name = 'organizations' and column_name = 'nicho';`);
    expect(coluna, "sem a coluna a leitura própria do layout cai no genérico e o menu perde o nicho").toBe("text|YES");
  });

  it("a CHECK aceita exatamente `NICHOS` (lib/convexy/nicho.ts)", () => {
    const [definicao] = sondas(`
      select '${MARCA}' || pg_get_constraintdef(oid)
        from pg_constraint
       where conname = 'organizations_nicho_valido'
         and conrelid = 'public.organizations'::regclass;`);
    expect(definicao, "a CHECK organizations_nicho_valido não existe").toBeDefined();
    const valores = [...definicao!.matchAll(/'([a-z]+)'::text/g)].map((m) => m[1]).sort();
    expect(valores).toEqual([...NICHOS].sort());
  });
});

describe("a forma vive no banco", () => {
  it("aceita todo nicho e o nulo (controle positivo)", () => {
    for (const nicho of NICHOS) expect(nichoGravado(`'${nicho}'`)).toBe(nicho);
    expect(nichoGravado("null")).toBe("NULO");
  });

  it("RECUSA valor fora do vocabulário, pelo nome da constraint", () => {
    for (const torto of ["dentista", "Clinica", "", "generico "]) {
      const erro = erroDo(`
        begin;
        update public.organizations set nicho = '${torto}' where id = '${GOV_ORG}';
        rollback;`);
      expect(erro, `o banco ACEITOU "${torto}"`).not.toBeNull();
      expect(erro).toContain("organizations_nicho_valido");
    }
  });

  it("o admin da ORGANIZAÇÃO não grava o nicho pela REST — só o admin da plataforma escreve", () => {
    expect(
      writeCountAs(GOV_ADMIN, `update public.organizations set nicho = 'clinica' where id = '${GOV_ORG}'`),
    ).toBe(0);
  });

  it("controle positivo: o admin da PLATAFORMA grava pela mesma REST (a recusa de cima não é acidente)", () => {
    const dono = "90010000-0000-4000-8000-0000000000aa";
    const [gravadas] = sondas(`
      begin;
      insert into auth.users (id, email) values ('${dono}', 'dono-9001@invariant.test');
      insert into public.platform_admins (user_id, granted_by, scope, mfa_required, reason)
        values ('${dono}', '${dono}', 'full', false, 'Convexy invariant fixture');
      set local role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${dono}","role":"authenticated"}', true);
      with w as (update public.organizations set nicho = 'clinica' where id = '${GOV_ORG}' returning 1)
      select '${MARCA}' || count(*)::text from w;
      rollback;`);
    expect(gravadas).toBe("1");
  });
});

describe("o bloco do baseline — reaplicável e igual à migration", () => {
  it("o bloco está logo depois do da 0208 e antes do da 0206", () => {
    const aqui = BASELINE.indexOf(ROTULO);
    expect(aqui, "rótulo da 9001 ausente").toBeGreaterThan(0);
    expect(aqui).toBeGreaterThan(BASELINE.indexOf(ROTULO_0208));
    expect(aqui).toBeLessThan(BASELINE.indexOf(ROTULO_0206));
  });

  it("o bloco é a migration, sem os comentários", () => {
    expect(ARQUIVO_DA_MIGRATION, "arquivo <timestamp>_9001_nicho_da_organizacao.sql ausente").toBeDefined();
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
      alter table public.organizations drop constraint organizations_nicho_valido;
      update public.organizations set nicho = 'lixo-de-antes' where id = '${GOV_ORG}';
      select '${MARCA}' || coalesce(nicho, 'NULO') from public.organizations where id = '${GOV_ORG}';
      select '${MARCA}' || count(*)::text from pg_constraint where conname = 'organizations_nicho_valido';
      rollback;`);
    expect(valor, "a simulação não gravou o valor torto — o caso de baixo mediria nada").toBe("lixo-de-antes");
    expect(regras).toBe("0");
  });

  it("COM o bloco, o valor torto vira NULL e a regra volta — o que o update.sh faz", () => {
    const [valor, regras] = sondas(`
      begin;
      alter table public.organizations drop constraint organizations_nicho_valido;
      update public.organizations set nicho = 'lixo-de-antes' where id = '${GOV_ORG}';
      ${blocoDa9001()}
      select '${MARCA}' || coalesce(nicho, 'NULO') from public.organizations where id = '${GOV_ORG}';
      select '${MARCA}' || count(*)::text from pg_constraint where conname = 'organizations_nicho_valido';
      rollback;`);
    expect(valor, "reaplicar o baseline deixou o valor fora do vocabulário").toBe("NULO");
    expect(regras, "reaplicar o baseline não recriou a regra").toBe("1");
  });
});
