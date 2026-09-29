-- Convexy (fork victorrabyfs/DeskcommCRM) — migration 9008: Minha clínica.
-- Spec: docs/superpowers/specs/2026-09-29-convexy-minha-clinica-design.md (rev. 1).
-- Registro: CONVEXY.md, "Minha clínica (v1.59.0-cvx.9)".
--
-- O MESMO SQL está no apêndice de supabase/baseline.sql, no bloco
-- "minha clínica (migration 9008)", logo depois do da 9006 (ou do da 9007).
-- tests/invariants/convexy-minha-clinica.test.ts compara os dois, sem comentários.
--
-- Três peças:
--   1. user_organizations.especialista — o profissional que NÃO usa a plataforma é
--      um membro sem acesso (usuário do Auth banido, papel viewer). Nulo = pessoa
--      comum. A agenda inteira (jornada, exceções, ocupação, marcar, Google) já gira
--      em torno de user_id, e assim continua sem mudar o motor.
--   2. clinica_dados — uma linha por organização com o que o agente de IA precisa
--      para responder sem inventar (contato, unidades, funcionamento, convênios,
--      pagamento, políticas). As listas (unidades, funcionamento, fechamentos) são
--      jsonb com UM schema central: lib/convexy/clinica/schema.ts.
--   3. calendar_event_type_especialistas — quem faz cada tratamento (N:N).

alter table public.user_organizations
  add column if not exists especialista jsonb;

alter table public.user_organizations
  drop constraint if exists user_organizations_especialista_objeto;
alter table public.user_organizations
  add constraint user_organizations_especialista_objeto
  check (especialista is null or jsonb_typeof(especialista) = 'object');

comment on column public.user_organizations.especialista is
  'Convexy (migration 9008): nulo = pessoa comum. Preenchido = especialista SEM ACESSO (usuário do Auth banido, e-mail .invalid): { especialidade, registro, bio, foto_path, ativo }. Tem agenda, não atende conversa, não aparece na Equipe. Schema em lib/convexy/clinica/schema.ts.';

create index if not exists user_organizations_especialistas_idx
  on public.user_organizations (organization_id)
  where especialista is not null;

create table if not exists public.clinica_dados (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  responsavel_tecnico_nome text,
  responsavel_tecnico_conselho text,
  responsavel_tecnico_numero text,
  especialidades text[] not null default '{}',
  telefone text,
  whatsapp text,
  email text,
  site text,
  instagram text,
  unidades jsonb not null default '[]',
  funcionamento jsonb not null default '{}',
  fechamentos jsonb not null default '[]',
  convenios text[] not null default '{}',
  so_particular boolean not null default false,
  formas_pagamento text[] not null default '{}',
  parcelas_max int,
  preco_avaliacao_cents bigint,
  cancelamento_antecedencia_horas int,
  cancelamento_politica text,
  tolerancia_atraso_minutos int,
  observacoes_agente text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint clinica_dados_unidades_lista check (jsonb_typeof(unidades) = 'array'),
  constraint clinica_dados_funcionamento_objeto check (jsonb_typeof(funcionamento) = 'object'),
  constraint clinica_dados_fechamentos_lista check (jsonb_typeof(fechamentos) = 'array'),
  constraint clinica_dados_parcelas check (parcelas_max is null or parcelas_max between 1 and 48),
  constraint clinica_dados_preco_avaliacao check (preco_avaliacao_cents is null or preco_avaliacao_cents >= 0),
  constraint clinica_dados_antecedencia check (cancelamento_antecedencia_horas is null or cancelamento_antecedencia_horas between 0 and 720),
  constraint clinica_dados_tolerancia check (tolerancia_atraso_minutos is null or tolerancia_atraso_minutos between 0 and 240),
  constraint clinica_dados_textos check (
    coalesce(char_length(cancelamento_politica), 0) <= 2000
    and coalesce(char_length(observacoes_agente), 0) <= 4000
  )
);

comment on table public.clinica_dados is
  'Convexy (migration 9008): os dados da clínica que o agente de IA lê (crm_get_clinic_info) — contato, unidades, funcionamento, fechamentos, convênios, pagamento e políticas. Uma linha por organização; lê membro, grava manager+. Tela: /app/clinica/dados.';

alter table public.clinica_dados enable row level security;
revoke all on table public.clinica_dados from anon;

drop policy if exists clinica_dados_select on public.clinica_dados;
create policy clinica_dados_select on public.clinica_dados
  for select using (
    (organization_id in (select public.fn_user_org_ids())) or public.fn_is_platform_admin()
  );
drop policy if exists clinica_dados_write on public.clinica_dados;
create policy clinica_dados_write on public.clinica_dados
  using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  )
  with check (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

create table if not exists public.calendar_event_type_especialistas (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type_id uuid not null references public.calendar_event_types(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ordem numeric not null default 1000,
  created_at timestamptz not null default now(),
  primary key (event_type_id, user_id)
);

comment on table public.calendar_event_type_especialistas is
  'Convexy (migration 9008): quem faz cada tratamento (tipo de agendamento). Com a lista preenchida, ela manda: o dono padrão do tipo passa a ser o primeiro dela, e a busca de horários da IA percorre todos. O tipo e a pessoa têm de ser da MESMA organização da linha (gatilho fn_tipo_especialista_coerente).';

create index if not exists calendar_event_type_especialistas_org_user_idx
  on public.calendar_event_type_especialistas (organization_id, user_id);

alter table public.calendar_event_type_especialistas enable row level security;
revoke all on table public.calendar_event_type_especialistas from anon;

drop policy if exists calendar_event_type_especialistas_select on public.calendar_event_type_especialistas;
create policy calendar_event_type_especialistas_select on public.calendar_event_type_especialistas
  for select using (
    (organization_id in (select public.fn_user_org_ids())) or public.fn_is_platform_admin()
  );
drop policy if exists calendar_event_type_especialistas_write on public.calendar_event_type_especialistas;
create policy calendar_event_type_especialistas_write on public.calendar_event_type_especialistas
  using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  )
  with check (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

create or replace function public.fn_tipo_especialista_coerente()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.calendar_event_types t
     where t.id = new.event_type_id and t.organization_id = new.organization_id
  ) then
    raise exception 'tipo_de_outra_organizacao: o tratamento não é desta organização'
      using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.user_organizations u
     where u.user_id = new.user_id
       and u.organization_id = new.organization_id
       and u.revoked_at is null
  ) then
    raise exception 'pessoa_de_outra_organizacao: quem faz o tratamento tem de ser membro ativo desta organização'
      using errcode = '23514';
  end if;
  return new;
end
$$;

revoke execute on function public.fn_tipo_especialista_coerente() from public, anon, authenticated;
grant execute on function public.fn_tipo_especialista_coerente() to service_role;

drop trigger if exists trg_tipo_especialista_coerente on public.calendar_event_type_especialistas;
create trigger trg_tipo_especialista_coerente
  before insert or update on public.calendar_event_type_especialistas
  for each row execute function public.fn_tipo_especialista_coerente();

notify pgrst, 'reload schema';
