-- Convexy (fork victorrabyfs/DeskcommCRM) — migration 9001: logo escuro da instalação.
-- Spec: docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, seção 7.3.1.
-- Registro: CONVEXY.md, "Logo escuro (etapa 3, v1.47.0-cvx.2)".
--
-- O MESMO SQL está no apêndice de supabase/baseline.sql, no bloco
-- "logo escuro da instalação (migration 9001)", logo depois do bloco
-- "logo da marca: BUCKET e COLUNA (migration 0158)". O kit self-host aplica só o
-- baseline; este arquivo é para quem aplica a cadeia pelo Supabase CLI.
-- tests/invariants/convexy-logo-escuro.test.ts compara os dois, sem comentários.
--
-- Numeração da faixa 9001+ do fork: nunca colide com a do original.

alter table public.platform_branding
  add column if not exists logo_dark_path text;

comment on column public.platform_branding.logo_dark_path is
  'Convexy (migration 9001): logo da instalação para o TEMA ESCURO. Caminho em storage/brand-logos, sempre platform/<uuid>.<png|jpg>, como logo_path. Com ele, a barra lateral e a tela de entrada mostram este arquivo no tema escuro, sem a moldura branca do logo claro; vale só quando o logo exibido é o da instalação. Escrito por app/api/v1/marca/logo/route.ts (variante escuro).';

update public.platform_branding
   set logo_dark_path = null
 where logo_dark_path is not null
   and logo_dark_path !~ '^platform/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$';

alter table public.platform_branding
  drop constraint if exists platform_branding_logo_dark_path;
alter table public.platform_branding
  add constraint platform_branding_logo_dark_path check (
    logo_dark_path is null
    or logo_dark_path ~ '^platform/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$'
  );

notify pgrst, 'reload schema';
