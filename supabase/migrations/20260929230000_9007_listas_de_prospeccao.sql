-- Convexy (fork victorrabyfs/DeskcommCRM) — migration 9007: listas de prospecção
-- e pedidos de enriquecimento. Registro: CONVEXY.md, "Prospecção v2 (v1.59.0-cvx.8)".
--
-- O MESMO SQL está no apêndice de supabase/baseline.sql, no bloco
-- "listas de prospecção (migration 9007)", logo depois do da 0371 (a conversa
-- de configuração da prospecção): as tabelas apontam para prospecting_candidates,
-- que só nasce no bloco da 0369 — antes dele o install com ON_ERROR_STOP quebraria.
-- tests/invariants/convexy-listas-de-prospeccao.test.ts compara os dois, sem comentários.
--
-- Postura das tabelas de prospecção (0369): só o servidor lê e grava (RLS
-- ligada, sem policy, revoke de anon/authenticated); as rotas autenticadas
-- resolvem a organização pela sessão e filtram organization_id.
--
-- Uma lista junta empresas de VÁRIAS buscas. O item aponta para o candidato com
-- chave composta (organização, id): um item nunca liga a lista de uma
-- organização ao candidato de outra. Apagar o candidato (expurgo de 365 dias da
-- 0408, ou exclusão da campanha) apaga o item; apagar a lista apaga os itens.

create unique index if not exists prospecting_candidates_org_id_unico
  on public.prospecting_candidates (organization_id, id);

create table if not exists public.prospeccao_listas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null,
  descricao text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospeccao_listas_org_id_unico unique (organization_id, id),
  constraint prospeccao_listas_nome_valido check (
    char_length(btrim(nome)) between 1 and 50 and position(',' in nome) = 0
  ),
  constraint prospeccao_listas_descricao_tamanho check (char_length(descricao) <= 300)
);

create unique index if not exists prospeccao_listas_nome_unico
  on public.prospeccao_listas (organization_id, lower(nome));

create table if not exists public.prospeccao_lista_itens (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lista_id uuid not null,
  candidate_id uuid not null,
  added_at timestamptz not null default now(),
  primary key (lista_id, candidate_id),
  constraint prospeccao_lista_itens_lista_fk foreign key (organization_id, lista_id)
    references public.prospeccao_listas (organization_id, id) on delete cascade,
  constraint prospeccao_lista_itens_candidato_fk foreign key (organization_id, candidate_id)
    references public.prospecting_candidates (organization_id, id) on delete cascade
);

create index if not exists prospeccao_lista_itens_candidato
  on public.prospeccao_lista_itens (organization_id, candidate_id);

create table if not exists public.prospeccao_enriquecimentos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid not null,
  candidate_ids uuid[] not null,
  contatos boolean not null default true,
  resumo boolean not null default false,
  decisores integer not null default 0,
  teto_usd numeric not null default 1,
  status text not null default 'buscando',
  run_id text,
  dataset_id text,
  custo_usd numeric,
  resumos_feitos integer not null default 0,
  erro text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospeccao_enriquecimentos_pedido_unico unique (organization_id, request_id),
  constraint prospeccao_enriquecimentos_tamanho check (cardinality(candidate_ids) between 1 and 100),
  constraint prospeccao_enriquecimentos_decisores check (decisores between 0 and 5),
  constraint prospeccao_enriquecimentos_teto check (teto_usd > 0 and teto_usd <= 10),
  constraint prospeccao_enriquecimentos_algo check (contatos or resumo or decisores > 0),
  constraint prospeccao_enriquecimentos_status check (
    status in ('buscando', 'resumindo', 'concluido', 'falhou')
  )
);

create index if not exists prospeccao_enriquecimentos_pendentes
  on public.prospeccao_enriquecimentos (status, updated_at)
  where status in ('buscando', 'resumindo');

alter table public.prospeccao_listas enable row level security;
alter table public.prospeccao_lista_itens enable row level security;
alter table public.prospeccao_enriquecimentos enable row level security;
revoke all on public.prospeccao_listas, public.prospeccao_lista_itens, public.prospeccao_enriquecimentos
  from public, anon, authenticated;
grant all on public.prospeccao_listas, public.prospeccao_lista_itens, public.prospeccao_enriquecimentos
  to service_role;

comment on table public.prospeccao_listas is
  'Convexy (migration 9007): listas de empresas encontradas pela prospecção, montadas pelo admin da organização em /app/prospecting (aba Listas). Só o servidor lê e grava.';
comment on table public.prospeccao_lista_itens is
  'Convexy (migration 9007): empresas (prospecting_candidates) de uma lista; uma empresa pode estar em várias listas.';
comment on table public.prospeccao_enriquecimentos is
  'Convexy (migration 9007): pedidos de enriquecimento de empresas escolhidas (contatos do site pela Apify, decisores pagos, resumo do site por IA). O cron /api/v1/cron/convexy-prospeccao acompanha e grava o resultado em prospecting_candidates.data.convexy.';

notify pgrst, 'reload schema';
