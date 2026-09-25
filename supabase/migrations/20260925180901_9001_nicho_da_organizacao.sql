-- Convexy (fork victorrabyfs/DeskcommCRM) — migration 9001: nicho da organização.
-- Spec: docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, seção 6.1.
-- Registro: CONVEXY.md, "Menu novo (v1.48.0-cvx.2)".
--
-- O MESMO SQL está no apêndice de supabase/baseline.sql, no bloco
-- "nicho da organização (migration 9001)", logo depois do bloco
-- "a moeda da organização deixa de ser presumida (migration 0208)". O kit
-- self-host aplica só o baseline; este arquivo é para quem aplica a cadeia pelo
-- Supabase CLI. tests/invariants/convexy-nicho.test.ts compara os dois, sem
-- comentários.
--
-- Faixa 9001+ do fork: nunca colide com a numeração do original. (A 9001 do
-- logo escuro foi aposentada na v1.48.0-cvx.1; CONVEXY.md, "Logo escuro".)

alter table public.organizations
  add column if not exists nicho text;

comment on column public.organizations.nicho is
  'Convexy (migration 9001): o tipo de negócio da organização, um de clinica, servicos, imobiliaria, curso, loja, generico (os ids de lib/onboarding/pacotes-de-funil.ts). Nulo vale generico. Escolhe os nomes do menu da Convexy (lib/convexy/menu/mapa.ts) e o vocabulário dos títulos (lib/convexy/vocabulario.ts). Escrito só pelo admin da plataforma, por app/api/v1/admin/tenants/[id]/nicho/route.ts.';

update public.organizations
   set nicho = null
 where nicho is not null
   and nicho not in ('clinica', 'servicos', 'imobiliaria', 'curso', 'loja', 'generico');

alter table public.organizations
  drop constraint if exists organizations_nicho_valido;
alter table public.organizations
  add constraint organizations_nicho_valido check (
    nicho is null
    or nicho in ('clinica', 'servicos', 'imobiliaria', 'curso', 'loja', 'generico')
  );

notify pgrst, 'reload schema';
