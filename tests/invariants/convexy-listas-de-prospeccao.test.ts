import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_ORG, seedGov, sql } from "./gov-helpers";
import { motivoDoErro } from "./psql-transporte";

/**
 * Convexy — listas de prospecção e pedidos de enriquecimento (migration 9007),
 * testemunhados pelo BANCO. Registro: CONVEXY.md, "Prospecção v2
 * (v1.59.0-cvx.8)". Molde: convexy-perfis-de-areas.
 *
 * Cada caso de escrita roda numa transação desfeita. Da saída do psql só contam
 * as linhas marcadas com SONDA|.
 */

const RAIZ = process.cwd();
const BASELINE = readFileSync(join(RAIZ, "supabase", "baseline.sql"), "utf8");
const ROTULO = "-- ---- listas de prospecção (migration 9007) ----";
const ROTULO_0369 = "-- APÊNDICE 20260921030100_0369_prospeccao_nativa.sql";
const ROTULO_0371 = "-- ---- Conversa de configuração da prospecção (migration 0371) ----";
const PROXIMO_ROTULO = "\n-- ---- ";
const TABELAS = ["prospeccao_listas", "prospeccao_lista_itens", "prospeccao_enriquecimentos"] as const;

const ARQUIVO_DA_MIGRATION = readdirSync(join(RAIZ, "supabase", "migrations")).find((f) =>
  /^\d{14}_9007_listas_de_prospeccao\.sql$/.test(f),
);

const MARCA = "SONDA|";
const OUTRA_ORG = "c0a1e7a0-9007-4000-8000-00000000000a";
const CAMPANHA = "c0a1e7a0-9007-4000-8000-000000000001";
const CAMPANHA_OUTRA = "c0a1e7a0-9007-4000-8000-000000000002";
const CANDIDATO = "c0a1e7a0-9007-4000-8000-000000000003";
const CANDIDATO_OUTRA = "c0a1e7a0-9007-4000-8000-000000000004";
const LISTA = "c0a1e7a0-9007-4000-8000-000000000005";

function bloco(): string {
  const inicio = BASELINE.indexOf(ROTULO);
  if (inicio === -1) throw new Error("rótulo da 9007 não encontrado no baseline");
  if (BASELINE.indexOf(ROTULO, inicio + 1) !== -1) throw new Error("rótulo da 9007 repetido no baseline");
  const fim = BASELINE.indexOf(PROXIMO_ROTULO, inicio + ROTULO.length);
  if (fim === -1) throw new Error("fim do bloco da 9007 não encontrado");
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

/** Duas organizações, uma campanha e um candidato em cada; e uma lista na GOV_ORG. */
const SEMENTE = `
  insert into public.organizations (id, slug, display_name, legal_name)
    values ('${OUTRA_ORG}', 'org-9007', 'Org 9007', 'Org 9007') on conflict (id) do nothing;
  insert into public.prospecting_campaigns (id, organization_id, request_id, name, search)
    values ('${CAMPANHA}', '${GOV_ORG}', gen_random_uuid(), 'Campanha 9007', '{}'::jsonb),
           ('${CAMPANHA_OUTRA}', '${OUTRA_ORG}', gen_random_uuid(), 'Campanha 9007 vizinha', '{}'::jsonb)
    on conflict (id) do nothing;
  insert into public.prospecting_candidates (id, organization_id, campaign_id, place_id, data)
    values ('${CANDIDATO}', '${GOV_ORG}', '${CAMPANHA}', 'place-9007', '{"key":"place-9007","name":"Padaria"}'::jsonb),
           ('${CANDIDATO_OUTRA}', '${OUTRA_ORG}', '${CAMPANHA_OUTRA}', 'place-9007-b', '{"key":"place-9007-b","name":"Vizinha"}'::jsonb)
    on conflict (id) do nothing;
  insert into public.prospeccao_listas (id, organization_id, nome)
    values ('${LISTA}', '${GOV_ORG}', 'Padarias boas') on conflict (id) do nothing;
`;

beforeAll(() => {
  seedGov();
});

describe("as tabelas existem depois do baseline, só para o servidor", () => {
  it.each(TABELAS)("%s com RLS ligada, sem policy, e fechada para anon e authenticated", (tabela) => {
    const [rls, policies, privilegios, servico] = sondas(`
      select '${MARCA}' || relrowsecurity::text from pg_class where oid = 'public.${tabela}'::regclass;
      select '${MARCA}' || count(*)::text from pg_policies where schemaname = 'public' and tablename = '${tabela}';
      select '${MARCA}' || bool_or(has_table_privilege(r, 'public.${tabela}', o))::text
        from unnest(array['anon','authenticated']) r
       cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) o;
      select '${MARCA}' || bool_and(has_table_privilege('service_role', 'public.${tabela}', o))::text
        from unnest(array['SELECT','INSERT','UPDATE','DELETE']) o;`);
    expect(rls).toBe("true");
    expect(policies).toBe("0");
    expect(privilegios, `anon ou authenticated alcança ${tabela}`).toBe("false");
    expect(servico, `service_role não alcança ${tabela}`).toBe("true");
  });

  it("o admin da organização, logado, não lê nem grava as listas pela REST", () => {
    const comoAdmin = (comando: string) =>
      erroDo(`begin; ${SEMENTE}
        set local role authenticated;
        select set_config('request.jwt.claims', '{"sub":"${GOV_ADMIN}"}', true);
        ${comando};
        rollback;`);
    expect(comoAdmin("select count(*) from public.prospeccao_listas")).toContain("permission denied");
    expect(
      comoAdmin(`insert into public.prospeccao_listas (organization_id, nome) values ('${GOV_ORG}', 'Pela REST')`),
    ).toContain("permission denied");
    expect(comoAdmin("select count(*) from public.prospeccao_lista_itens")).toContain("permission denied");
  });
});

describe("as regras vivem no banco", () => {
  it("controle positivo: item da mesma organização entra e sai com a lista", () => {
    const [entrou, saiu] = sondas(`
      begin;
      ${SEMENTE}
      insert into public.prospeccao_lista_itens (organization_id, lista_id, candidate_id)
        values ('${GOV_ORG}', '${LISTA}', '${CANDIDATO}');
      select '${MARCA}' || count(*)::text from public.prospeccao_lista_itens where lista_id = '${LISTA}';
      delete from public.prospeccao_listas where id = '${LISTA}';
      select '${MARCA}' || count(*)::text from public.prospeccao_lista_itens where lista_id = '${LISTA}';
      rollback;`);
    expect(entrou).toBe("1");
    expect(saiu).toBe("0");
  });

  it("apagar o candidato (expurgo) apaga o item da lista", () => {
    const [restou] = sondas(`
      begin;
      ${SEMENTE}
      insert into public.prospeccao_lista_itens (organization_id, lista_id, candidate_id)
        values ('${GOV_ORG}', '${LISTA}', '${CANDIDATO}');
      delete from public.prospecting_candidates where id = '${CANDIDATO}';
      select '${MARCA}' || count(*)::text from public.prospeccao_lista_itens where lista_id = '${LISTA}';
      rollback;`);
    expect(restou).toBe("0");
  });

  it("uma lista não recebe a empresa de OUTRA organização (chave composta)", () => {
    const erro = erroDo(`
      begin;
      ${SEMENTE}
      insert into public.prospeccao_lista_itens (organization_id, lista_id, candidate_id)
        values ('${GOV_ORG}', '${LISTA}', '${CANDIDATO_OUTRA}');
      rollback;`);
    expect(erro).toContain("prospeccao_lista_itens_candidato_fk");
    const erroDaLista = erroDo(`
      begin;
      ${SEMENTE}
      insert into public.prospeccao_lista_itens (organization_id, lista_id, candidate_id)
        values ('${OUTRA_ORG}', '${LISTA}', '${CANDIDATO_OUTRA}');
      rollback;`);
    expect(erroDaLista).toContain("prospeccao_lista_itens_lista_fk");
  });

  it("nome único por organização sem diferenciar maiúsculas; outra organização pode repetir", () => {
    expect(
      erroDo(`begin; ${SEMENTE} insert into public.prospeccao_listas (organization_id, nome) values ('${GOV_ORG}', 'PADARIAS BOAS'); rollback;`),
    ).toContain("prospeccao_listas_nome_unico");
    expect(
      erroDo(`begin; ${SEMENTE} insert into public.prospeccao_listas (organization_id, nome) values ('${OUTRA_ORG}', 'Padarias boas'); rollback;`),
    ).toBeNull();
  });

  it("nome vazio, longo ou com vírgula é recusado (a etiqueta 'Lista: <nome>' cabe no TAG_MAX e não se parte no filtro)", () => {
    for (const nome of ["   ", "x".repeat(51), "Padarias, boas"]) {
      expect(
        erroDo(`begin; insert into public.prospeccao_listas (organization_id, nome) values ('${GOV_ORG}', '${nome}'); rollback;`),
        nome,
      ).toContain("prospeccao_listas_nome_valido");
    }
  });

  it("pedido de enriquecimento: tamanho, decisores e teto no banco", () => {
    const base = `insert into public.prospeccao_enriquecimentos (organization_id, request_id, candidate_ids, contatos, resumo, decisores, teto_usd)`;
    expect(erroDo(`begin; ${base} values ('${GOV_ORG}', gen_random_uuid(), '{}', true, false, 0, 1); rollback;`)).toContain(
      "prospeccao_enriquecimentos_tamanho",
    );
    expect(
      erroDo(`begin; ${base} values ('${GOV_ORG}', gen_random_uuid(), array['${CANDIDATO}']::uuid[], true, false, 6, 1); rollback;`),
    ).toContain("prospeccao_enriquecimentos_decisores");
    expect(
      erroDo(`begin; ${base} values ('${GOV_ORG}', gen_random_uuid(), array['${CANDIDATO}']::uuid[], false, false, 0, 1); rollback;`),
    ).toContain("prospeccao_enriquecimentos_algo");
    expect(
      erroDo(`begin; ${base} values ('${GOV_ORG}', gen_random_uuid(), array['${CANDIDATO}']::uuid[], true, true, 2, 11); rollback;`),
    ).toContain("prospeccao_enriquecimentos_teto");
    expect(
      erroDo(`begin; ${base} values ('${GOV_ORG}', gen_random_uuid(), array['${CANDIDATO}']::uuid[], true, true, 2, 2); rollback;`),
    ).toBeNull();
  });
});

describe("o bloco do baseline — reaplicável e igual à migration", () => {
  it("o bloco está depois dos da 0369 e da 0371 (depende de prospecting_candidates)", () => {
    const aqui = BASELINE.indexOf(ROTULO);
    expect(aqui, "rótulo da 9007 ausente").toBeGreaterThan(0);
    expect(aqui).toBeGreaterThan(BASELINE.indexOf(ROTULO_0369));
    expect(aqui).toBeGreaterThan(BASELINE.indexOf(ROTULO_0371));
  });

  it("o bloco é a migration, sem os comentários", () => {
    expect(ARQUIVO_DA_MIGRATION, "arquivo <timestamp>_9007_listas_de_prospeccao.sql ausente").toBeDefined();
    const migration = readFileSync(join(RAIZ, "supabase", "migrations", ARQUIVO_DA_MIGRATION!), "utf8");
    expect(codigo(bloco())).toBe(codigo(migration));
  });

  it("aplicado duas vezes seguidas, não erra (install e update) e preserva as listas", () => {
    const [listas] = sondas(`
      begin;
      ${SEMENTE}
      ${bloco()}
      ${bloco()}
      select '${MARCA}' || count(*)::text from public.prospeccao_listas where id = '${LISTA}';
      rollback;`);
    expect(listas).toBe("1");
  });
});
