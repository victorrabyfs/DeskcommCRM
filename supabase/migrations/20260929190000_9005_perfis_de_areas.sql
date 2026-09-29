-- Convexy (fork victorrabyfs/DeskcommCRM) — migration 9005: perfis de áreas.
-- Spec: docs/superpowers/specs/2026-09-25-convexy-perfis-de-areas-design.md (rev. 5), seções 0 e 3.1–3.2.
-- Registro: CONVEXY.md, "Perfis de áreas (v1.59.0-cvx.5)".
--
-- O MESMO SQL está no apêndice de supabase/baseline.sql, no bloco
-- "perfis de áreas (migration 9005)", logo depois do bloco do nicho (9001).
-- tests/invariants/convexy-perfis-de-areas.test.ts compara os dois, sem comentários.

create or replace function public.fn_hrefs_validos(p_hrefs text[])
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(array_length(p_hrefs, 1), 0) <= 200
     and coalesce(bool_and(h is not null and h ~ '^/app(/[a-z0-9-]+)*$'), true)
    from unnest(p_hrefs) as h
$$;

revoke execute on function public.fn_hrefs_validos(text[]) from public, anon;
grant execute on function public.fn_hrefs_validos(text[]) to authenticated, service_role;

do $$
begin
  if to_regclass('public.perfis_de_areas') is null then
    create table public.perfis_de_areas (
      id uuid primary key default gen_random_uuid(),
      nome text not null,
      descricao text not null default '',
      libera_tudo boolean not null default false,
      areas text[] not null default '{}',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      updated_by uuid references auth.users(id) on delete set null,
      constraint perfis_de_areas_nome_tamanho check (char_length(btrim(nome)) between 1 and 60),
      constraint perfis_de_areas_descricao_tamanho check (char_length(descricao) <= 200),
      constraint perfis_de_areas_areas_validas check (public.fn_hrefs_validos(areas)),
      constraint perfis_de_areas_completa_sem_lista check (not libera_tudo or areas = '{}')
-- O fechamento na coluna zero é de propósito: as varreduras de schema leem o
-- corpo da tabela até um ");" no começo da linha.
);

    insert into public.perfis_de_areas (id, nome, descricao, libera_tudo, areas) values
      ('c0a1e7a0-9005-4000-8000-000000000001', 'Completa',
       'Todas as áreas do sistema.', true, '{}'),
      ('c0a1e7a0-9005-4000-8000-000000000002', 'Essencial',
       'O dia a dia do atendimento: conversas, agenda, funil, contatos e tarefas.', false,
       array['/app', '/app/inbox', '/app/agenda', '/app/kanban', '/app/contacts', '/app/tasks', '/app/connections']),
      ('c0a1e7a0-9005-4000-8000-000000000003', 'Clínicas',
       'O que uma clínica usa: atendimento, agenda, pacientes, agentes, fluxos e Minha clínica.', false,
       array[
         '/app',
         '/app/inbox', '/app/radar', '/app/templates', '/app/campaigns',
         '/app/kanban', '/app/tasks',
         '/app/agenda',
         '/app/contacts',
         '/app/ai/agents', '/app/ai/knowledge/sources', '/app/ai/inbox', '/app/ai/cases', '/app/ai/proposals',
         '/app/ai/runs', '/app/ai/usage', '/app/ai/cases/avisos', '/app/ai/providers', '/app/ai/credentials',
         '/app/ai/memory', '/app/ai/skills',
         '/app/ai/followups', '/app/ai/routers', '/app/ai/atendimento',
         '/app/settings/tenant/agenda', '/app/settings/tenant',
         '/app/metrics', '/app/ads/meta', '/app/activities',
         '/app/connections', '/app/team', '/app/settings/tags', '/app/settings/tenant/pipelines',
         '/app/settings/atendimento', '/app/settings/marca',
         '/app/settings/profile', '/app/settings/security', '/app/settings/notifications', '/app/lgpd/requests'
       ]);
  end if;
end
$$;

comment on table public.perfis_de_areas is
  'Convexy (migration 9005): pacotes de áreas da instalação (Completa, Essencial, Clínicas…). Uma área é um href do catálogo de navegação (lib/navigation/catalogo.ts). Só o service role lê e grava; o admin da plataforma edita em /admin/perfis-de-areas. Spec: docs/superpowers/specs/2026-09-25-convexy-perfis-de-areas-design.md.';

create unique index if not exists perfis_de_areas_nome_unico
  on public.perfis_de_areas (lower(nome));
create unique index if not exists perfis_de_areas_uma_completa
  on public.perfis_de_areas (libera_tudo) where libera_tudo;

alter table public.perfis_de_areas enable row level security;
revoke all on table public.perfis_de_areas from anon, authenticated;

create or replace function public.fn_protege_perfil_completo()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    if old.libera_tudo then
      raise exception 'perfil_completo_protegido: o perfil que libera tudo não pode ser excluído'
        using errcode = 'P0001';
    end if;
    return old;
  end if;
  if old.libera_tudo and not new.libera_tudo then
    raise exception 'perfil_completo_protegido: o perfil que libera tudo continua liberando tudo'
      using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end
$$;

revoke execute on function public.fn_protege_perfil_completo() from public, anon;

drop trigger if exists trg_protege_perfil_completo on public.perfis_de_areas;
create trigger trg_protege_perfil_completo
  before update or delete on public.perfis_de_areas
  for each row execute function public.fn_protege_perfil_completo();

alter table public.organizations
  add column if not exists perfil_de_areas_id uuid references public.perfis_de_areas(id) on delete restrict;
alter table public.organizations
  add column if not exists areas_a_mais text[] not null default '{}';
alter table public.organizations
  add column if not exists areas_a_menos text[] not null default '{}';
alter table public.organizations
  add column if not exists areas_atualizadas_em timestamptz;

comment on column public.organizations.perfil_de_areas_id is
  'Convexy (migration 9005): o perfil de áreas da organização. Nulo vale o perfil Completa. Escrito só pelo admin da plataforma.';
comment on column public.organizations.areas_a_mais is
  'Convexy (migration 9005): áreas liberadas além do perfil (hrefs do catálogo).';
comment on column public.organizations.areas_a_menos is
  'Convexy (migration 9005): áreas retiradas do perfil (hrefs do catálogo).';
comment on column public.organizations.areas_atualizadas_em is
  'Convexy (migration 9005): versão das áreas da organização, para gravação condicional e "alterado em".';

create index if not exists organizations_perfil_de_areas_idx
  on public.organizations (perfil_de_areas_id);

update public.organizations set areas_a_mais = '{}' where not public.fn_hrefs_validos(areas_a_mais);
update public.organizations set areas_a_menos = '{}' where not public.fn_hrefs_validos(areas_a_menos);

alter table public.organizations
  drop constraint if exists organizations_areas_validas;
alter table public.organizations
  add constraint organizations_areas_validas check (
    public.fn_hrefs_validos(areas_a_mais) and public.fn_hrefs_validos(areas_a_menos)
  );

notify pgrst, 'reload schema';
