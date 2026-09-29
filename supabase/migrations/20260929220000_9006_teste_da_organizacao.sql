-- Convexy (fork victorrabyfs/DeskcommCRM) — migration 9006: período de teste da organização.
-- Registro: CONVEXY.md, "Trial (v1.59.0-cvx.6)".
--
-- O MESMO SQL está no apêndice de supabase/baseline.sql, no bloco
-- "teste da organização (migration 9006)", logo depois do da 9005.
-- tests/invariants/convexy-teste-da-organizacao.test.ts compara os dois, sem comentários.

alter table public.organizations
  add column if not exists teste_termina_em timestamptz;

comment on column public.organizations.teste_termina_em is
  'Convexy (migration 9006): fim do período de teste. Nulo = sem teste (empresa contratada ou criada sem teste). O cron /api/v1/cron/convexy-teste suspende a organização quando passa (status suspended, nada é apagado); reativar pelo /admin limpa a coluna. Escrito só pelo admin da plataforma.';

create index if not exists organizations_teste_termina_em_idx
  on public.organizations (teste_termina_em)
  where teste_termina_em is not null;

notify pgrst, 'reload schema';
