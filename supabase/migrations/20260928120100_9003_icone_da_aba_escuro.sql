-- Convexy (fork victorrabyfs/DeskcommCRM) — migration 9003: ícone da aba para o modo escuro.
-- Registro: CONVEXY.md, "Símbolo e ícone da aba".
--
-- O MESMO SQL está no apêndice de supabase/baseline.sql, no bloco
-- "ícone da aba escuro (migration 9003)", logo depois do bloco
-- "ícone da aba: coluna da instalação (migration 0443)". O kit self-host aplica
-- só o baseline; este arquivo é para quem aplica a cadeia pelo Supabase CLI.
-- tests/invariants/convexy-marca-da-instalacao.test.ts compara os dois, sem comentários.
--
-- A versão do ícone da aba (0443) para quando o sistema está no modo escuro: o
-- <head> publica as duas com `media="(prefers-color-scheme: …)"`. Mesma forma de
-- caminho e mesma regra do ícone; só a rota de logo escreve (`peca=icone`,
-- `tema=escuro`).

alter table public.platform_branding add column if not exists favicon_dark_path text;
update public.platform_branding set favicon_dark_path = null
 where favicon_dark_path is not null
   and favicon_dark_path !~ '^platform/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$';
alter table public.platform_branding drop constraint if exists platform_branding_favicon_dark_path;
alter table public.platform_branding add constraint platform_branding_favicon_dark_path check (
  favicon_dark_path is null or
  favicon_dark_path ~ '^platform/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$'
);
comment on column public.platform_branding.favicon_dark_path is
  'Convexy (migration 9003): o ícone da aba para o modo escuro do sistema. Caminho em brand-logos; null usa o ícone da aba (favicon_path) nos dois modos.';

notify pgrst, 'reload schema';
