import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { PERFIS_SEMENTE } from "@/lib/convexy/areas/semente";

import { GOV_ADMIN, GOV_ORG, seedGov, sql, writeCountAs } from "./gov-helpers";
import { motivoDoErro } from "./psql-transporte";

/**
 * Convexy — perfis de áreas (migration 9005), testemunhados pelo BANCO. Spec:
 * docs/superpowers/specs/2026-09-25-convexy-perfis-de-areas-design.md (rev. 5).
 * Registro: CONVEXY.md, "Perfis de áreas (v1.59.0-cvx.5)". Molde: convexy-nicho.
 *
 * Cada caso de escrita roda numa transação desfeita. Da saída do psql só contam
 * as linhas marcadas com SONDA|.
 */

const RAIZ = process.cwd();
const BASELINE = readFileSync(join(RAIZ, "supabase", "baseline.sql"), "utf8");
const ROTULO = "-- ---- perfis de áreas (migration 9005) ----";
const ROTULO_9001 = "-- ---- nicho da organização (migration 9001) ----";
const ROTULO_0206 = "-- ---- elegibilidade da IA por origem do lead (migration 0206) ----";
const PROXIMO_ROTULO = "\n-- ---- ";
const COMPLETA = PERFIS_SEMENTE.find((p) => p.liberaTudo)!.id;
const ESSENCIAL = PERFIS_SEMENTE.find((p) => p.nome === "Essencial")!.id;

const ARQUIVO_DA_MIGRATION = readdirSync(join(RAIZ, "supabase", "migrations")).find((f) =>
  /^\d{14}_9005_perfis_de_areas\.sql$/.test(f),
);

const MARCA = "SONDA|";

function blocoDa9005(): string {
  const inicio = BASELINE.indexOf(ROTULO);
  if (inicio === -1) throw new Error("rótulo da 9005 não encontrado no baseline");
  if (BASELINE.indexOf(ROTULO, inicio + 1) !== -1) throw new Error("rótulo da 9005 repetido no baseline");
  const fim = BASELINE.indexOf(PROXIMO_ROTULO, inicio + ROTULO.length);
  if (fim === -1) throw new Error("fim do bloco da 9005 não encontrado");
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

beforeAll(() => {
  seedGov();
});

describe("a tabela e as colunas existem depois do baseline", () => {
  it("perfis_de_areas com RLS ligada, sem policy, e fechada para anon e authenticated", () => {
    const [rls, policies, privilegios] = sondas(`
      select '${MARCA}' || relrowsecurity::text from pg_class where oid = 'public.perfis_de_areas'::regclass;
      select '${MARCA}' || count(*)::text from pg_policies where schemaname = 'public' and tablename = 'perfis_de_areas';
      select '${MARCA}' || bool_or(has_table_privilege(r, 'public.perfis_de_areas', o))::text
        from unnest(array['anon','authenticated']) r
       cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) o;`);
    expect(rls).toBe("true");
    expect(policies).toBe("0");
    expect(privilegios, "anon ou authenticated alcança perfis_de_areas").toBe("false");
  });

  it("organizations ganha perfil, ajustes e versão", () => {
    const colunas = sondas(`
      select '${MARCA}' || column_name || '|' || data_type || '|' || is_nullable
        from information_schema.columns
       where table_schema = 'public' and table_name = 'organizations'
         and column_name in ('perfil_de_areas_id','areas_a_mais','areas_a_menos','areas_atualizadas_em')
       order by column_name;`);
    expect(colunas).toEqual([
      "areas_a_mais|ARRAY|NO",
      "areas_a_menos|ARRAY|NO",
      "areas_atualizadas_em|timestamp with time zone|YES",
      "perfil_de_areas_id|uuid|YES",
    ]);
  });

  it("a semente do banco é a do TypeScript (lib/convexy/areas/semente.ts)", () => {
    const linhas = sondas(`
      select '${MARCA}' || id || '|' || nome || '|' || libera_tudo::text || '|' || array_to_string(areas, ',')
        from public.perfis_de_areas
       where id in (${PERFIS_SEMENTE.map((p) => `'${p.id}'`).join(",")})
       order by id;`);
    const esperado = [...PERFIS_SEMENTE]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((p) => `${p.id}|${p.nome}|${String(p.liberaTudo)}|${p.areas.join(",")}`);
    expect(linhas).toEqual(esperado);
  });
});

describe("as regras vivem no banco", () => {
  it("o perfil que libera tudo não pode ser excluído nem deixar de liberar tudo", () => {
    for (const dml of [
      `delete from public.perfis_de_areas where id = '${COMPLETA}'`,
      `update public.perfis_de_areas set libera_tudo = false where id = '${COMPLETA}'`,
    ]) {
      const erro = erroDo(`begin; ${dml}; rollback;`);
      expect(erro, `o banco aceitou: ${dml}`).not.toBeNull();
      expect(erro).toContain("perfil_completo_protegido");
    }
  });

  it("controle positivo: renomear a Completa e excluir um perfil sem empresa passam", () => {
    const [renomeada, excluidas] = sondas(`
      begin;
      update public.perfis_de_areas set nome = 'Tudo liberado' where id = '${COMPLETA}';
      select '${MARCA}' || nome from public.perfis_de_areas where id = '${COMPLETA}';
      with d as (delete from public.perfis_de_areas where id = '${ESSENCIAL}' returning 1)
      select '${MARCA}' || count(*)::text from d;
      rollback;`);
    expect(renomeada).toBe("Tudo liberado");
    expect(excluidas).toBe("1");
  });

  it("só uma Completa, e nome único sem diferenciar maiúsculas", () => {
    expect(erroDo(`begin; insert into public.perfis_de_areas (nome, libera_tudo) values ('Outra', true); rollback;`))
      .toContain("perfis_de_areas_uma_completa");
    expect(erroDo(`begin; insert into public.perfis_de_areas (nome) values ('essencial'); rollback;`))
      .toContain("perfis_de_areas_nome_unico");
  });

  it("área fora do formato de href é recusada, no perfil e na organização", () => {
    expect(
      erroDo(`begin; insert into public.perfis_de_areas (nome, areas) values ('Torto', array['/app','javascript:x']); rollback;`),
    ).toContain("perfis_de_areas_areas_validas");
    expect(
      erroDo(`begin; update public.organizations set areas_a_mais = array['/App/Inbox'] where id = '${GOV_ORG}'; rollback;`),
    ).toContain("organizations_areas_validas");
    expect(
      erroDo(`begin; update public.organizations set areas_a_mais = array['/app/ai/cases/avisos'] where id = '${GOV_ORG}'; rollback;`),
    ).toBeNull();
  });

  it("perfil em uso não pode ser excluído (FK restrict)", () => {
    const erro = erroDo(`
      begin;
      update public.organizations set perfil_de_areas_id = '${ESSENCIAL}' where id = '${GOV_ORG}';
      delete from public.perfis_de_areas where id = '${ESSENCIAL}';
      rollback;`);
    expect(erro).not.toBeNull();
    expect(erro).toMatch(/foreign key|violates/i);
  });

  it("o admin da ORGANIZAÇÃO não grava o próprio pacote pela REST", () => {
    expect(
      writeCountAs(GOV_ADMIN, `update public.organizations set perfil_de_areas_id = '${COMPLETA}' where id = '${GOV_ORG}'`),
    ).toBe(0);
    expect(
      writeCountAs(GOV_ADMIN, `update public.organizations set areas_a_mais = array['/app/prospecting'] where id = '${GOV_ORG}'`),
    ).toBe(0);
  });
});

describe("o bloco do baseline — reaplicável e igual à migration", () => {
  it("o bloco está logo depois do da 9001 e antes do da 0206", () => {
    const aqui = BASELINE.indexOf(ROTULO);
    expect(aqui, "rótulo da 9005 ausente").toBeGreaterThan(0);
    expect(aqui).toBeGreaterThan(BASELINE.indexOf(ROTULO_9001));
    expect(aqui).toBeLessThan(BASELINE.indexOf(ROTULO_0206));
  });

  it("o bloco é a migration, sem os comentários", () => {
    expect(ARQUIVO_DA_MIGRATION, "arquivo <timestamp>_9005_perfis_de_areas.sql ausente").toBeDefined();
    const migration = readFileSync(join(RAIZ, "supabase", "migrations", ARQUIVO_DA_MIGRATION!), "utf8");
    expect(codigo(blocoDa9005())).toBe(codigo(migration));
  });

  it("aplicado duas vezes seguidas, não erra (install e update)", () => {
    const erro = erroDo(`
      begin;
      ${blocoDa9005()}
      ${blocoDa9005()}
      rollback;`);
    expect(erro, `o bloco não é reaplicável: ${erro ?? ""}`).toBeNull();
  });

  it("reaplicar não recria perfil renomeado nem excluído (a semente só nasce com a tabela)", () => {
    const [nome, essencial] = sondas(`
      begin;
      update public.perfis_de_areas set nome = 'Renomeada' where id = '${COMPLETA}';
      delete from public.perfis_de_areas where id = '${ESSENCIAL}';
      ${blocoDa9005()}
      select '${MARCA}' || nome from public.perfis_de_areas where id = '${COMPLETA}';
      select '${MARCA}' || count(*)::text from public.perfis_de_areas where id = '${ESSENCIAL}';
      rollback;`);
    expect(nome).toBe("Renomeada");
    expect(essencial).toBe("0");
  });
});
