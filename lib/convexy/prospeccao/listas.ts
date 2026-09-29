import type pg from "pg";

import { createContactHandler, patchContactHandler } from "@/app/api/v1/contacts/_handler";
import { phoneLookupVariants } from "@/lib/channels/phone-variants";
import { withProspectingLock } from "@/lib/prospecting/store";
import type { Prospect } from "@/lib/prospecting/schema";
import type { createAdminClient } from "@/lib/supabase/admin";

import { etiquetaDaLista } from "./schemas";

/**
 * Convexy — listas de prospecção (migration 9007; CONVEXY.md, "Prospecção v2").
 *
 * Tudo pelo pool do servidor (as tabelas são só do service role, como as da
 * prospecção do original), e TODA consulta filtra `organization_id`, que vem da
 * sessão — nunca do corpo.
 */
export class ListaError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}

type Admin = ReturnType<typeof createAdminClient>;

/** A mesma derivação de "respondeu/qualificado" do GET do original (`app/api/v1/prospecting/route.ts`). */
const PROGRESSO = `case when l.stage_id::text=c.config->>'qualified_stage_id' then 'qualified'
  when v.last_inbound_at is not null then 'replied' else p.status end`;
const JUNCOES = `join prospecting_campaigns c on c.organization_id=p.organization_id and c.id=p.campaign_id
  left join crm_leads l on l.organization_id=p.organization_id and l.id=p.lead_id
  left join conversations v on v.organization_id=p.organization_id and v.id=p.conversation_id`;

export interface ListaResumo {
  id: string;
  nome: string;
  descricao: string;
  itens: number;
  created_at: string;
  updated_at: string;
}

export interface ItemDaLista {
  id: string;
  campaign_id: string;
  campanha: string;
  data: Prospect;
  status: string;
  progress: string;
  error: string | null;
  contact_id: string | null;
  conversation_id: string | null;
  added_at: string;
}

function eDuplicado(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "23505";
}

export async function listarListas(db: pg.Pool, org: string): Promise<ListaResumo[]> {
  const { rows } = await db.query<ListaResumo>(
    `select l.id, l.nome, l.descricao, l.created_at, l.updated_at,
            (select count(*)::int from prospeccao_lista_itens i where i.organization_id=l.organization_id and i.lista_id=l.id) as itens
       from prospeccao_listas l where l.organization_id=$1 order by lower(l.nome)`,
    [org],
  );
  return rows;
}

async function exigirLista(db: pg.Pool | pg.PoolClient, org: string, listaId: string) {
  const { rows } = await db.query<{ id: string; nome: string }>(
    "select id, nome from prospeccao_listas where organization_id=$1 and id=$2",
    [org, listaId],
  );
  if (!rows[0]) throw new ListaError("Lista não encontrada.", 404);
  return rows[0];
}

export async function adicionarItens(db: pg.Pool, org: string, listaId: string, ids: readonly string[]) {
  await exigirLista(db, org, listaId);
  if (ids.length === 0) return 0;
  // Só candidato da MESMA organização e não anonimizado (a chave composta da
  // 9007 recusaria o de outra; o filtro evita o erro e o conta como ignorado).
  const r = await db.query(
    `insert into prospeccao_lista_itens (organization_id, lista_id, candidate_id)
     select $1, $2, p.id from prospecting_candidates p
      where p.organization_id=$1 and p.id = any($3::uuid[]) and p.place_id not like 'redacted:%'
     on conflict do nothing`,
    [org, listaId, ids],
  );
  await db.query("update prospeccao_listas set updated_at=now() where organization_id=$1 and id=$2", [org, listaId]);
  return r.rowCount ?? 0;
}

export async function removerItens(db: pg.Pool, org: string, listaId: string, ids: readonly string[]) {
  await exigirLista(db, org, listaId);
  const r = await db.query(
    "delete from prospeccao_lista_itens where organization_id=$1 and lista_id=$2 and candidate_id = any($3::uuid[])",
    [org, listaId, ids],
  );
  await db.query("update prospeccao_listas set updated_at=now() where organization_id=$1 and id=$2", [org, listaId]);
  return r.rowCount ?? 0;
}

export async function criarLista(
  db: pg.Pool,
  org: string,
  userId: string,
  entrada: { nome: string; descricao: string; candidate_ids: readonly string[] },
) {
  let id: string;
  try {
    const { rows } = await db.query<{ id: string }>(
      "insert into prospeccao_listas (organization_id, nome, descricao, created_by) values ($1,$2,$3,$4) returning id",
      [org, entrada.nome, entrada.descricao, userId],
    );
    id = rows[0]!.id;
  } catch (err) {
    if (eDuplicado(err)) throw new ListaError("Já existe uma lista com esse nome.", 409);
    throw err;
  }
  const adicionados = await adicionarItens(db, org, id, entrada.candidate_ids);
  return { id, adicionados };
}

export async function editarLista(
  db: pg.Pool,
  org: string,
  listaId: string,
  patch: { nome?: string; descricao?: string },
) {
  try {
    const { rows } = await db.query<{ id: string }>(
      `update prospeccao_listas set nome=coalesce($3, nome), descricao=coalesce($4, descricao), updated_at=now()
        where organization_id=$1 and id=$2 returning id`,
      [org, listaId, patch.nome ?? null, patch.descricao ?? null],
    );
    if (!rows[0]) throw new ListaError("Lista não encontrada.", 404);
  } catch (err) {
    if (eDuplicado(err)) throw new ListaError("Já existe uma lista com esse nome.", 409);
    throw err;
  }
}

export async function excluirLista(db: pg.Pool, org: string, listaId: string) {
  const r = await db.query("delete from prospeccao_listas where organization_id=$1 and id=$2", [org, listaId]);
  if (!r.rowCount) throw new ListaError("Lista não encontrada.", 404);
}

export async function itensDaLista(db: pg.Pool, org: string, listaId: string): Promise<ItemDaLista[]> {
  await exigirLista(db, org, listaId);
  const { rows } = await db.query<ItemDaLista>(
    `select p.id, p.campaign_id, c.name as campanha, p.data, p.status, ${PROGRESSO} as progress, p.error,
            p.contact_id, p.conversation_id, i.added_at
       from prospeccao_lista_itens i
       join prospecting_candidates p on p.organization_id=i.organization_id and p.id=i.candidate_id
       ${JUNCOES}
      where i.organization_id=$1 and i.lista_id=$2
      order by i.added_at desc, p.id`,
    [org, listaId],
  );
  return rows;
}

export interface PerfilDoCandidato {
  id: string;
  campaign_id: string;
  campanha: string;
  data: Prospect & { convexy?: unknown };
  status: string;
  progress: string;
  error: string | null;
  contact_id: string | null;
  lead_id: string | null;
  conversation_id: string | null;
  attempted_at: string | null;
  created_at: string;
  listas: { id: string; nome: string }[];
}

export async function perfilDoCandidato(db: pg.Pool, org: string, id: string): Promise<PerfilDoCandidato> {
  const { rows } = await db.query<Omit<PerfilDoCandidato, "listas">>(
    `select p.id, p.campaign_id, c.name as campanha, p.data, p.status, ${PROGRESSO} as progress, p.error,
            p.contact_id, p.lead_id, p.conversation_id, p.attempted_at, p.created_at
       from prospecting_candidates p ${JUNCOES}
      where p.organization_id=$1 and p.id=$2`,
    [org, id],
  );
  const perfil = rows[0];
  if (!perfil) throw new ListaError("Empresa não encontrada.", 404);
  const listas = await db.query<{ id: string; nome: string }>(
    `select l.id, l.nome from prospeccao_lista_itens i
       join prospeccao_listas l on l.organization_id=i.organization_id and l.id=i.lista_id
      where i.organization_id=$1 and i.candidate_id=$2 order by lower(l.nome)`,
    [org, id],
  );
  return { ...perfil, listas: listas.rows };
}

/**
 * "Abordar com IA" a partir de uma lista.
 *
 * O motor do original (`activateCampaign` + worker) trabalha por CAMPANHA: ativa
 * todos os `new` dela, e o candidato pertence a UMA campanha só (único por
 * organização + lugar e por telefone). Para abordar só a lista sem mexer no
 * motor, cria-se uma campanha nova, já com a busca concluída, e os candidatos
 * da lista que ainda estão LIVRES passam para ela:
 *
 *  - livre = `status='new'` numa campanha ainda em `draft` (nunca ativada:
 *    sem contato, negócio, conversa nem fila). Candidato já abordado, na fila
 *    ou de campanha ativa fica onde está — nunca há duas abordagens;
 *  - a campanha nova nasce `draft`: a pessoa escolhe agente, canal e funil no
 *    passo 2 de sempre e inicia pelo botão de sempre, que continua recusando
 *    iniciar com outra campanha em andamento ("uma running por organização");
 *  - o candidato deixa a busca de origem (a planilha dela deixa de listá-lo) —
 *    é o preço de não duplicar a empresa. O `request_id` torna o pedido
 *    idempotente: repetir o clique devolve a mesma campanha.
 */
export async function abordarLista(pool: pg.Pool, org: string, listaId: string, requestId: string) {
  return withProspectingLock(pool, org, async (db) => {
    const anterior = await db.query<{ id: string }>(
      "select id from prospecting_campaigns where organization_id=$1 and request_id=$2",
      [org, requestId],
    );
    if (anterior.rows[0]) return { campaign_id: anterior.rows[0].id, movidas: 0, presas: 0, repetido: true };
    const lista = await exigirLista(db, org, listaId);
    const { rows } = await db.query<{ id: string; livre: boolean }>(
      `select p.id, (p.status='new' and c.status='draft' and p.place_id not like 'redacted:%') as livre
         from prospeccao_lista_itens i
         join prospecting_candidates p on p.organization_id=i.organization_id and p.id=i.candidate_id
         join prospecting_campaigns c on c.organization_id=p.organization_id and c.id=p.campaign_id
        where i.organization_id=$1 and i.lista_id=$2`,
      [org, listaId],
    );
    const livres = rows.filter((r) => r.livre).map((r) => r.id);
    if (livres.length === 0)
      throw new ListaError(
        "Nenhuma empresa desta lista está livre para abordar: todas já estão em campanhas iniciadas.",
        409,
      );
    const nome = `Lista: ${lista.nome}`.slice(0, 120);
    await db.query("begin");
    try {
      const criada = await db.query<{ id: string }>(
        `insert into prospecting_campaigns (organization_id, request_id, name, search, search_status, result_count)
         values ($1,$2,$3,$4,'succeeded',$5) returning id`,
        [
          org,
          requestId,
          nome,
          {
            name: nome,
            niche: lista.nome,
            location: "Lista de prospecção",
            limit: Math.min(100, livres.length),
            budget_usd: 0.5,
            enrich: false,
            lista_id: listaId,
          },
          livres.length,
        ],
      );
      const campaignId = criada.rows[0]!.id;
      // A mesma condição de "livre" de novo, dentro da transação: o que mudou
      // entre a leitura e aqui não passa.
      const movidas = await db.query(
        `update prospecting_candidates p set campaign_id=$3, updated_at=now()
           from prospecting_campaigns c
          where p.organization_id=$1 and p.id = any($2::uuid[]) and p.status='new'
            and c.organization_id=p.organization_id and c.id=p.campaign_id and c.status='draft'`,
        [org, livres, campaignId],
      );
      await db.query("commit");
      return {
        campaign_id: campaignId,
        movidas: movidas.rowCount ?? 0,
        presas: rows.length - (movidas.rowCount ?? 0),
        repetido: false,
      };
    } catch (err) {
      await db.query("rollback");
      throw err;
    }
  });
}

/**
 * "Disparo em massa": garante um contato para cada empresa da lista com
 * telefone e põe nele a etiqueta `Lista: <nome>`, que o público de Campanhas
 * filtra. Contato que já existe (mesmo telefone) só ganha a etiqueta — e NÃO
 * vira o contato da prospecção daquele candidato, para uma abordagem com IA
 * posterior não tratar um cliente antigo como empresa nova.
 */
export async function disparoDaLista(
  pool: pg.Pool,
  admin: Admin,
  org: string,
  userId: string,
  listaId: string,
  baseLegalRef: string,
  requestId: string,
) {
  const lista = await exigirLista(pool, org, listaId);
  const etiqueta = etiquetaDaLista(lista.nome);
  const { rows } = await pool.query<{
    id: string;
    campaign_id: string;
    phone: string | null;
    contact_id: string | null;
    data: Prospect;
  }>(
    `select p.id, p.campaign_id, p.phone, p.contact_id, p.data
       from prospeccao_lista_itens i
       join prospecting_candidates p on p.organization_id=i.organization_id and p.id=i.candidate_id
      where i.organization_id=$1 and i.lista_id=$2 and p.place_id not like 'redacted:%'
      order by i.added_at, p.id`,
    [org, listaId],
  );
  const ctx = { organization_id: org, actor: { type: "user" as const, id: userId }, requestId };
  const resultado = { etiqueta, criados: 0, marcados: 0, sem_telefone: 0, ignorados: 0 };
  for (const p of rows) {
    if (!p.phone && !p.contact_id) {
      resultado.sem_telefone++;
      continue;
    }
    try {
      let contatoId = p.contact_id;
      if (!contatoId) {
        const conhecido = await pool.query<{ id: string }>(
          "select id from contacts where organization_id=$1 and phone_number=any($2::text[]) and is_merged_into is null limit 1",
          [org, phoneLookupVariants(p.phone!)],
        );
        contatoId = conhecido.rows[0]?.id ?? null;
      }
      if (contatoId) {
        const atual = await pool.query<{ tags: string[] | null; is_anonymized: boolean; is_blocked: boolean }>(
          "select tags, is_anonymized, is_blocked from contacts where organization_id=$1 and id=$2",
          [org, contatoId],
        );
        const c = atual.rows[0];
        if (!c || c.is_anonymized || c.is_blocked) {
          resultado.ignorados++;
          continue;
        }
        const tags = c.tags ?? [];
        if (!tags.includes(etiqueta))
          await patchContactHandler(admin, ctx, contatoId, { tags: [...tags, etiqueta] });
        resultado.marcados++;
        continue;
      }
      const criado = await createContactHandler(admin, ctx, {
        name: p.data.name,
        display_name: p.data.name,
        phone_number: p.phone!,
        source: "prospecting",
        tags: [etiqueta],
        source_metadata: {
          campaign_id: p.campaign_id,
          place_id: p.data.key,
          maps_url: p.data.maps_url,
          lista_id: listaId,
        },
        consent: { legitimate_interest: { ref: baseLegalRef } },
      });
      await pool.query(
        "update prospecting_candidates set contact_id=$3, updated_at=now() where organization_id=$1 and id=$2 and contact_id is null",
        [org, p.id, String(criado.contact.id)],
      );
      resultado.criados++;
    } catch {
      resultado.ignorados++;
    }
  }
  return resultado;
}
