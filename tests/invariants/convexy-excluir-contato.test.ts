import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_ORG, GOV_SESSION, seedGov, sql } from "./gov-helpers";
import { motivoDoErro } from "./psql-transporte";

/**
 * Convexy — excluir contato inteiro, ou nada (migration 9004; CONVEXY.md, "Excluir
 * contato"), testemunhado pelo BANCO.
 *
 * Defeito do original (1.59 e main): a guarda `fn_followup_generation_write`
 * recusava com 42501 o DELETE em cascata dos registros de follow-up, então todo
 * contato que já passou por retorno automático era impossível de apagar pela tela
 * — e a rota já tinha apagado mensagens e conversas em comandos separados.
 *
 * O que só o banco prova: (1) quem está logado apaga, por `fn_excluir_contato`,
 * um contato com turno de follow-up, mensagem e conversa; (2) a guarda segue
 * recusando o DELETE DIRETO do turno; (3) ficha recusada não leva nada (uma
 * transação só); (4) `anon` não executa a função; (5) o bloco do baseline é a
 * migration e segue sendo a ÚLTIMA definição da guarda — um bloco novo do original
 * depois dele desfaria a correção em silêncio.
 *
 * Cada caso roda numa transação desfeita. Da saída do psql só contam as linhas
 * marcadas com SONDA|.
 */

const RAIZ = process.cwd();
const BASELINE = readFileSync(join(RAIZ, "supabase", "baseline.sql"), "utf8");
const ROTULO = "-- ---- excluir contato (migration 9004) ----";
const MARCA = "SONDA|";

const CONTATO = "90040000-0000-4000-8000-0000000000c1";
const CONVERSA = "90040000-0000-4000-8000-0000000000c2";
const JOB = "90040000-0000-4000-8000-0000000000c3";

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

/** Só o que o Postgres executa: sem comentário de linha, espaço normalizado. */
function codigo(texto: string): string {
  return texto
    .split("\n")
    .map((linha) => linha.replace(/--.*$/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Contato com conversa, mensagem e turno de follow-up — o que a tela não conseguia apagar. */
const CONTATO_COM_HISTORICO = `
  insert into public.contacts (id, organization_id, display_name)
    values ('${CONTATO}', '${GOV_ORG}', 'Contato 9004');
  insert into public.conversations (id, organization_id, contact_id, channel_session_id, status)
    values ('${CONVERSA}', '${GOV_ORG}', '${CONTATO}', '${GOV_SESSION}', 'open');
  insert into public.messages
    (organization_id, conversation_id, channel_session_id, contact_id, type, direction, status, sent_via, body, sent_at)
    values ('${GOV_ORG}', '${CONVERSA}', '${GOV_SESSION}', '${CONTATO}', 'text', 'inbound', 'received', 'ai',
            'oi', '2026-09-28T12:00:00Z');
  insert into public.job_queue (id, organization_id, contact_id, kind)
    values ('${JOB}', '${GOV_ORG}', '${CONTATO}', 'followup_turn');
`;

const COMO_ADMIN = `
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"${GOV_ADMIN}","role":"authenticated"}', true);
`;

const RESTOS = `
  reset role;
  select '${MARCA}' || (select count(*) from public.contacts where id = '${CONTATO}')
    || '|' || (select count(*) from public.conversations where contact_id = '${CONTATO}')
    || '|' || (select count(*) from public.messages where contact_id = '${CONTATO}')
    || '|' || (select count(*) from public.job_queue where id = '${JOB}');
`;

beforeAll(() => {
  seedGov();
});

describe("fn_excluir_contato", () => {
  it("quem está logado apaga o contato com turno de follow-up, mensagem e conversa", () => {
    const [apagado, restos] = sondas(`
      begin;
      ${CONTATO_COM_HISTORICO}
      ${COMO_ADMIN}
      select '${MARCA}' || coalesce(public.fn_excluir_contato('${GOV_ORG}', '${CONTATO}')::text, 'NULO');
      ${RESTOS}
      rollback;`);
    expect(apagado, "a função não devolveu o contato apagado").toBe(CONTATO);
    expect(restos, "contato|conversas|mensagens|turno depois de apagar").toBe("0|0|0|0");
  });

  it("controle: a guarda do follow-up segue recusando o DELETE DIRETO do turno", () => {
    const erro = erroDo(`
      begin;
      ${CONTATO_COM_HISTORICO}
      ${COMO_ADMIN}
      delete from public.job_queue where id = '${JOB}';
      rollback;`);
    expect(erro, "o usuário apagou um turno de follow-up direto").not.toBeNull();
    expect(erro).toContain("followup_job_internal");
  });

  it("ficha recusada (compromisso na agenda) não leva nada: uma transação só", () => {
    const [recusa, restos] = sondas(`
      begin;
      ${CONTATO_COM_HISTORICO}
      insert into public.calendar_appointments
        (organization_id, contact_id, owner_user_id, title, starts_at, ends_at, status)
        values ('${GOV_ORG}', '${CONTATO}', '${GOV_ADMIN}', 'Consulta',
                '2026-09-29 14:00:00+00', '2026-09-29 15:00:00+00', 'scheduled');
      ${COMO_ADMIN}
      do $$
      begin
        perform public.fn_excluir_contato('${GOV_ORG}', '${CONTATO}');
        perform set_config('convexy.desfecho', 'apagou', true);
      exception when foreign_key_violation then
        perform set_config('convexy.desfecho', 'recusou', true);
      end $$;
      select '${MARCA}' || current_setting('convexy.desfecho', true);
      ${RESTOS}
      rollback;`);
    expect(recusa, "o compromisso na agenda não barrou a ficha").toBe("recusou");
    expect(restos, "contato|conversas|mensagens|turno depois da recusa").toBe("1|1|1|1");
  });

  it("anon não executa a função; authenticated executa", () => {
    const [anon, autenticado] = sondas(`
      select '${MARCA}' || has_function_privilege('anon', 'public.fn_excluir_contato(uuid, uuid)', 'execute');
      select '${MARCA}' || has_function_privilege('authenticated', 'public.fn_excluir_contato(uuid, uuid)', 'execute');`);
    expect(anon).toBe("false");
    expect(autenticado).toBe("true");
  });
});

describe("o bloco do baseline", () => {
  it("é a migration, sem os comentários", () => {
    const inicio = BASELINE.indexOf(ROTULO);
    expect(inicio, "rótulo da 9004 ausente no baseline").toBeGreaterThan(0);
    const fim = BASELINE.indexOf("\n-- ---- ", inicio + ROTULO.length);
    const bloco = BASELINE.slice(inicio, fim === -1 ? undefined : fim);
    const nome = readdirSync(join(RAIZ, "supabase", "migrations")).find((f) =>
      /^\d{14}_9004_excluir_contato\.sql$/.test(f),
    );
    expect(nome, "migration 9004 ausente").toBeDefined();
    const migration = readFileSync(join(RAIZ, "supabase", "migrations", nome!), "utf8");
    expect(codigo(bloco)).toBe(codigo(migration));
  });

  it("a ÚLTIMA definição da guarda do follow-up é a da 9004 (deixa passar a cascata)", () => {
    const ultima = BASELINE.lastIndexOf("create or replace function public.fn_followup_generation_write");
    expect(ultima, "um bloco depois da 9004 redefine a guarda — reaplicar a exceção da cascata").toBeGreaterThan(
      BASELINE.indexOf(ROTULO),
    );
    expect(BASELINE.slice(ultima, BASELINE.indexOf("$$;", ultima))).toContain("pg_trigger_depth() > 1");
  });

  it("aplicado duas vezes seguidas, não erra (install e update)", () => {
    const inicio = BASELINE.indexOf(ROTULO);
    const bloco = BASELINE.slice(inicio);
    expect(erroDo(`begin; ${bloco} ${bloco} rollback;`)).toBeNull();
  });
});
