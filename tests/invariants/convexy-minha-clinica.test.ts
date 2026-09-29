import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_AGENT_A, GOV_MANAGER, GOV_ORG, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";
import { motivoDoErro } from "./psql-transporte";

/**
 * Convexy — Minha clínica (migration 9008), testemunhada pelo BANCO. Spec:
 * docs/superpowers/specs/2026-09-29-convexy-minha-clinica-design.md. Registro:
 * CONVEXY.md, "Minha clínica (v1.59.0-cvx.9)". Molde: convexy-perfis-de-areas.
 *
 * Prova de isolamento por JWT (countAs/writeCountAs) entre DUAS organizações para
 * as duas tabelas novas — é o que `rls-completude-varredura.test.ts` cita em
 * PROVA_PROPRIA. Cada escrita de fixture roda como superusuário; cada sonda de
 * RLS, como `authenticated` com o JWT de um membro.
 */

const RAIZ = process.cwd();
const BASELINE = readFileSync(join(RAIZ, "supabase", "baseline.sql"), "utf8");
const ROTULO = "-- ---- minha clínica (migration 9008) ----";
const ROTULO_9006 = "-- ---- teste da organização (migration 9006) ----";
const ROTULO_9007_PREFIXO = "(migration 9007) ----";
const ROTULO_0206 = "-- ---- elegibilidade da IA por origem do lead (migration 0206) ----";
const MARCA = "SONDA|";

const ARQUIVO_DA_MIGRATION = readdirSync(join(RAIZ, "supabase", "migrations")).find((f) =>
  /^\d{14}_9008_minha_clinica\.sql$/.test(f),
);

// Organização B, própria deste arquivo (namespace c9008…), e um especialista em A.
const ORG_B = "c9008000-0000-4000-8000-000000000001";
const MANAGER_B = "c9008000-1111-4000-8000-000000000001";
const ESPECIALISTA_A = "c9008000-1111-4000-8000-000000000002";
const TIPO_A = "c9008000-2222-4000-8000-000000000001";
const TIPO_B = "c9008000-2222-4000-8000-000000000002";

function bloco(): string {
  const inicio = BASELINE.indexOf(ROTULO);
  if (inicio === -1) throw new Error("rótulo da 9008 não encontrado no baseline");
  if (BASELINE.indexOf(ROTULO, inicio + 1) !== -1) throw new Error("rótulo da 9008 repetido no baseline");
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
  sql(`
    insert into auth.users (id, email) values
      ('${MANAGER_B}', 'c9008-manager-b@invariant.test'),
      ('${ESPECIALISTA_A}', 'especialista+c9008@especialistas.invalid')
      on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'c9008-org-b', 'Minha Clinica Org B', 'Org B 9008')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${MANAGER_B}', '${ORG_B}', 'manager', now()) on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at, especialista)
      values ('${ESPECIALISTA_A}', '${GOV_ORG}', 'viewer', now(), '{"especialidade":"Ortodontia","ativo":true}')
      on conflict do nothing;
    insert into public.calendar_event_types (id, organization_id, name, slug)
      values ('${TIPO_A}', '${GOV_ORG}', 'Limpeza 9008', 'limpeza-9008'),
             ('${TIPO_B}', '${ORG_B}', 'Limpeza 9008 B', 'limpeza-9008-b')
      on conflict do nothing;
    insert into public.clinica_dados (organization_id, telefone) values
      ('${GOV_ORG}', '(11) 3000-0000'), ('${ORG_B}', '(21) 3000-0000')
      on conflict do nothing;
    insert into public.calendar_event_type_especialistas (organization_id, event_type_id, user_id) values
      ('${GOV_ORG}', '${TIPO_A}', '${ESPECIALISTA_A}'),
      ('${ORG_B}', '${TIPO_B}', '${MANAGER_B}')
      on conflict do nothing;
  `);
});

describe("o schema existe depois do baseline", () => {
  it("user_organizations.especialista é jsonb anulável e só aceita objeto", () => {
    const [coluna] = sondas(`
      select '${MARCA}' || data_type || '|' || is_nullable from information_schema.columns
       where table_schema = 'public' and table_name = 'user_organizations' and column_name = 'especialista';`);
    expect(coluna).toBe("jsonb|YES");
    expect(
      erroDo(`begin; update public.user_organizations set especialista = '[]' where user_id = '${ESPECIALISTA_A}'; rollback;`),
    ).toContain("user_organizations_especialista_objeto");
  });

  it("as duas tabelas novas têm RLS ligada e estão fechadas para anon", () => {
    const linhas = sondas(`
      select '${MARCA}' || c.relname || '|' || c.relrowsecurity::text || '|' ||
             bool_or(has_table_privilege('anon', c.oid, o))::text
        from pg_class c cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) o
       where c.oid in ('public.clinica_dados'::regclass, 'public.calendar_event_type_especialistas'::regclass)
       group by c.relname, c.relrowsecurity order by c.relname;`);
    expect(linhas).toEqual(["calendar_event_type_especialistas|true|false", "clinica_dados|true|false"]);
  });

  it("jsonb torto e número fora da faixa são recusados em clinica_dados", () => {
    expect(erroDo(`begin; update public.clinica_dados set unidades = '{}' where organization_id = '${GOV_ORG}'; rollback;`))
      .toContain("clinica_dados_unidades_lista");
    expect(erroDo(`begin; update public.clinica_dados set parcelas_max = 99 where organization_id = '${GOV_ORG}'; rollback;`))
      .toContain("clinica_dados_parcelas");
  });

  it("fn_tipo_especialista_coerente não é alcançável por anon nem authenticated", () => {
    const [anon, auth] = sondas(`
      select '${MARCA}' || has_function_privilege('anon', 'public.fn_tipo_especialista_coerente()', 'execute')::text;
      select '${MARCA}' || has_function_privilege('authenticated', 'public.fn_tipo_especialista_coerente()', 'execute')::text;`);
    expect(anon).toBe("false");
    expect(auth).toBe("false");
  });
});

describe("isolamento entre duas organizações (JWT de membro)", () => {
  it("clinica_dados: cada organização lê só a própria linha", () => {
    expect(countAs(GOV_AGENT_A, `select count(*) from public.clinica_dados where organization_id = '${GOV_ORG}';`)).toBe(1);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.clinica_dados where organization_id = '${ORG_B}';`)).toBe(0);
    expect(countAs(MANAGER_B, `select count(*) from public.clinica_dados where organization_id = '${GOV_ORG}';`)).toBe(0);
    expect(countAs(MANAGER_B, `select count(*) from public.clinica_dados;`)).toBe(1);
  });

  it("clinica_dados: grava manager+ da própria organização; agent e o vizinho não", () => {
    expect(writeCountAs(GOV_AGENT_A, `update public.clinica_dados set site = 'x' where organization_id = '${GOV_ORG}'`)).toBe(0);
    expect(writeCountAs(MANAGER_B, `update public.clinica_dados set site = 'x' where organization_id = '${GOV_ORG}'`)).toBe(0);
    const [site] = sondas(`
      begin;
      set local role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${GOV_MANAGER}"}', true);
      update public.clinica_dados set site = 'clinica.example' where organization_id = '${GOV_ORG}';
      reset role;
      select '${MARCA}' || coalesce(site, '') from public.clinica_dados where organization_id = '${GOV_ORG}';
      rollback;`);
    expect(site).toBe("clinica.example");
  });

  it("calendar_event_type_especialistas: leitura e escrita não cruzam organizações", () => {
    expect(countAs(GOV_AGENT_A, `select count(*) from public.calendar_event_type_especialistas where organization_id = '${GOV_ORG}';`)).toBe(1);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.calendar_event_type_especialistas where organization_id = '${ORG_B}';`)).toBe(0);
    expect(countAs(MANAGER_B, `select count(*) from public.calendar_event_type_especialistas;`)).toBe(1);
    expect(
      writeCountAs(MANAGER_B, `delete from public.calendar_event_type_especialistas where organization_id = '${GOV_ORG}'`),
    ).toBe(0);
    expect(
      writeCountAs(GOV_ADMIN, `delete from public.calendar_event_type_especialistas where organization_id = '${ORG_B}'`),
    ).toBe(0);
  });

  it("o gatilho recusa tipo ou pessoa de outra organização (mesmo pelo service role)", () => {
    expect(
      erroDo(`begin; insert into public.calendar_event_type_especialistas (organization_id, event_type_id, user_id)
                values ('${GOV_ORG}', '${TIPO_B}', '${ESPECIALISTA_A}'); rollback;`),
    ).toContain("tipo_de_outra_organizacao");
    expect(
      erroDo(`begin; insert into public.calendar_event_type_especialistas (organization_id, event_type_id, user_id)
                values ('${GOV_ORG}', '${TIPO_A}', '${MANAGER_B}'); rollback;`),
    ).toContain("pessoa_de_outra_organizacao");
  });

  it("apagar o tipo leva junto quem faz (on delete cascade)", () => {
    const [restantes] = sondas(`
      begin;
      delete from public.calendar_event_types where id = '${TIPO_A}';
      select '${MARCA}' || count(*)::text from public.calendar_event_type_especialistas where event_type_id = '${TIPO_A}';
      rollback;`);
    expect(restantes).toBe("0");
  });
});

describe("o bloco do baseline — reaplicável e igual à migration", () => {
  it("está depois do da 9006 (e do da 9007, se houver) e antes do da 0206", () => {
    const aqui = BASELINE.indexOf(ROTULO);
    expect(aqui).toBeGreaterThan(BASELINE.indexOf(ROTULO_9006));
    const bloco9007 = BASELINE.indexOf(ROTULO_9007_PREFIXO);
    if (bloco9007 !== -1) expect(aqui).toBeGreaterThan(bloco9007);
    expect(aqui).toBeLessThan(BASELINE.indexOf(ROTULO_0206));
  });

  it("é a migration, sem os comentários", () => {
    expect(ARQUIVO_DA_MIGRATION, "arquivo <timestamp>_9008_minha_clinica.sql ausente").toBeDefined();
    const migration = readFileSync(join(RAIZ, "supabase", "migrations", ARQUIVO_DA_MIGRATION!), "utf8");
    expect(codigo(bloco())).toBe(codigo(migration));
  });

  it("aplicado duas vezes seguidas, não erra", () => {
    const erro = erroDo(`begin; ${bloco()} ${bloco()} rollback;`);
    expect(erro, `o bloco não é reaplicável: ${erro ?? ""}`).toBeNull();
  });
});
