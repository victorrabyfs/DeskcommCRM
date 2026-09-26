-- Convexy (fork victorrabyfs/DeskcommCRM) — migration 9002: símbolo da marca da instalação.
-- Registro: CONVEXY.md, "Símbolo da marca".
--
-- O MESMO SQL está no apêndice de supabase/baseline.sql, no bloco
-- "símbolo da instalação (migration 9002)", logo depois do bloco
-- "logo por tema: coluna da instalação (migration 0406)". O kit self-host
-- aplica só o baseline; este arquivo é para quem aplica a cadeia pelo
-- Supabase CLI. tests/invariants/convexy-simbolo.test.ts compara os dois, sem
-- comentários.
--
-- A arte quadrada que o menu recolhido mostra no lugar do logo inteiro. Mesma
-- forma de caminho do logo escuro (arquivo no bucket brand-logos, prefixo
-- platform/); só a rota de logo escreve, com tema "simbolo".

alter table public.platform_branding add column if not exists simbolo_path text;
update public.platform_branding set simbolo_path = null
 where simbolo_path is not null
   and simbolo_path !~ '^platform/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$';
alter table public.platform_branding drop constraint if exists platform_branding_simbolo_path;
alter table public.platform_branding add constraint platform_branding_simbolo_path check (
  simbolo_path is null or
  simbolo_path ~ '^platform/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$'
);
comment on column public.platform_branding.simbolo_path is
  'Convexy (migration 9002): o símbolo da marca, a arte quadrada do menu recolhido. Caminho em brand-logos; null mostra a inicial do nome.';

notify pgrst, 'reload schema';
