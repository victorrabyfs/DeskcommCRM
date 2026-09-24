# Convexy — logo escuro em `/admin/marca` (`v1.47.0-cvx.2`) — plano de implementação

> **Execução sem recursos na máquina local, desde a primeira linha.** Decisão do Victor (mantida
> da Revisão 3 do plano da `-cvx.3`): nada de `pnpm`/`npm`/`npx`/`node`/`vitest`/`tsc`/`eslint`,
> Docker, Supabase local, `brew`, Playwright, `git worktree`, build, instalação ou processo em
> segundo plano nesta máquina (`node_modules` foi apagado de propósito). Os subagentes das tasks
> de código **só leem, editam e commitam**. Toda suíte — typecheck, lint, unitários, cercas,
> `test:db` (invariantes), `test:shell`, e2e, build — roda **no CI do PR** (checks obrigatórios
> `verify`, `invariants`, `build-and-size`, `e2e`, `imagens-ok`) ou na VPS. O PR é a primeira
> execução real: por isso cada task traz o código inteiro, coerente com o resto, e diz qual check
> prova cada teste.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar a `v1.47.0-cvx.2` — `/admin/marca` ganha um segundo campo, "Logo para o tema escuro"; com ele enviado, a barra lateral e a tela de entrada mostram esse logo no tema escuro, **sem a moldura branca**, e o logo claro continua no tema claro — e aplicá-la na VPS pelo botão "Atualizar" (o `update.sh` reaplica o baseline, com a migration 9001, antes de subir a imagem).

**Architecture:** Uma coluna nova, `platform_branding.logo_dark_path` (migration 9001 do fork: arquivo + bloco no apêndice do `baseline.sql` logo depois do bloco da 0158 + linha no `MANIFEST.md`), no mesmo formato e com a mesma regex do `logo_path`. A rota `app/api/v1/marca/logo/route.ts` ganha `variante` (`claro` | `escuro`, padrão `claro`) no POST e no DELETE, que escolhe a coluna, o arquivo anterior a apagar e o `fields_changed` da auditoria. A leitura (`instalacao.ts` → `resolve.ts` → `lib/branding.ts`/`saida.ts` → `app/layout.tsx`) carrega um `logoDarkUrl?: string | null` **opcional**, preenchido só quando o logo exibido saiu da camada do banco da instalação. O desenho troca por CSS (`dark:hidden` na moldura inteira, `hidden dark:block` num `<img>` irmão), sem divergência de hidratação. `CampoDeLogo` ganha a prop `variante`, com prévia própria para o escuro.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, Tailwind 4 (variante `dark:` = `[data-theme="dark"]`), Zod, Supabase (Postgres + Storage, bucket `brand-logos`), Vitest (jsdom e node), Playwright, `gh` CLI (fork `victorrabyfs/DeskcommCRM`), bash/tmux na VPS.

**Spec:** `docs/superpowers/specs/2026-09-22-identidade-convexy-design.md` — seções 1, 2, 5.3, 7.1, **7.3 (7.3.1–7.3.6 é o escopo)**, 8, 9, 10. Nomeação por conteúdo: a spec chama esta versão de `-cvx.4` sobre a base `v1.44.0`; com a base trocada para a `v1.47.0` (`CONVEXY.md`, "Base e versões"), o "logo escuro" sai como **`v1.47.0-cvx.2`**.

## Global Constraints

- Clone de trabalho: `/Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM`. Branch: **`convexy/logo-escuro`**, criada de `origin/main` (`0f34ef09d`, merge da `v1.47.0-cvx.1`, base `v1.47.0` do original; `refs/upstream-tags/v1.47.0` existe no clone), já contendo o commit deste plano. **Nunca tocar** em `.git/hooks` (o `pre-push` da etapa 2 continua valendo) nem nas branches `convexy/identidade-v142` e `convexy/identidade-pre-scrub`.
- Repositório: `victorrabyfs/DeskcommCRM`. Todo `gh` leva `-R victorrabyfs/DeskcommCRM`; PR só na `main` do fork; **merge só por merge commit**. Tag `v1.47.0-cvx.2` anotada, criada **só depois de o PR estar `MERGED`** e de `origin/main` ser o sha do merge, empurrada **pelo nome** (`git push origin v1.47.0-cvx.2`), nunca `--tags`/`--follow-tags`. Tag publicada nunca é refeita (corrigir = `-cvx.3`).
- `CHANGELOG.md`: seção `## [1.47.0-cvx.2] — AAAA-MM-DD` (data do dia do corte) logo abaixo de `## [Não lançado]` e **acima** de `## [1.47.0-cvx.1] — 2026-09-24`. Sem `### ⚠️ Requer atenção`: o banco muda sozinho pelo `update.sh`, o `.env` não muda, e enviar o logo escuro é opcional.
- Sem `.env`, sem fragmento em `.changes/` (desvio DoD 17 já registrado). Destino (DoD 18): **instalação do fork**.
- Placeholders de infraestrutura (o repositório é público): `<dominio-de-producao>`, `<host-ssh>`, `<projeto-supabase>`. Pasta da VPS: `/opt/deskcommcrm`. `update.sh` na VPS roda **sempre dentro de `tmux`**, com log `/root/update-<data>-<rótulo>.log`.
- Nenhum `.md` cita nome de imagem com extensão entre crases (nem link), exceto caminho versionado real (`tests/unit/evidencia-citada.test.ts`); caminho sob `.superpowers/` é livre. Nenhum arquivo novo em `app/`, `components/`, `lib/` escreve a palavra do produto original (`tests/unit/branding.test.ts`).
- Commits terminam com a linha em branco e `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Números de linha citados são os da `origin/main` `0f34ef09d`, conferidos um a um nesta revisão. Depois que uma task edita um arquivo, as linhas andam: **localizar pelo texto citado**, nunca pelo número. Se o texto citado não existir, parar e relatar — nunca "adaptar".

**Valores exatos (verbatim da spec 7.3, com a forma real do código):**

- Migration: número **`9001`**, nome **`logo_escuro_da_instalacao`**, arquivo **`supabase/migrations/20260924180901_9001_logo_escuro_da_instalacao.sql`** (timestamp escolhido acima de todos os da base — o maior hoje é `20260923230000` — e fora do padrão redondo do original).
- Rótulo do bloco no baseline: **`-- ---- logo escuro da instalação (migration 9001) ----`**, logo depois do bloco `-- ---- logo da marca: BUCKET e COLUNA (migration 0158) ----` e antes de `-- ---- o teto de IA que vincula (migration 0159) ----`.
- Coluna **`logo_dark_path text`** (anulável); constraint **`platform_branding_logo_dark_path`**: `check (logo_dark_path is null or logo_dark_path ~ '^platform/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$')` — a **mesma** regex de `platform_branding_logo_path` (`baseline.sql:14577`; a spec a abrevia como `^platform/<uuid>\.(png|jpg)$`).
- Rota: `variante: z.enum(["claro", "escuro"])`, padrão `claro`, no POST (campo de formulário `variante`) e no DELETE (query `?variante=`); `escuro` só vale com `escopo === "instalacao"` (senão **422 `validation_failed`**). Coluna: `claro` → `logo_path`, `escuro` → `logo_dark_path`. Auditoria `platform_branding.updated` com `metadata.fields_changed` = `["logo_path"]` ou `["logo_dark_path"]`.
- Tipos: **`logoDarkUrl?: string | null`**, opcional em `Branding` (`lib/branding.ts`), `CamadaDeMarca` (`resolve.ts`) e `MarcaDeSaida` (`saida.ts`); `MarcaResolvida` o herda de `Branding`. `LinhaDaInstalacao` ganha `logo_dark_path?: string | null`. A chave só aparece quando há valor (espalhamento condicional) — objetos sem logo escuro ficam idênticos aos de hoje.
- Regra de leitura: `logoDarkUrl` só é preenchido quando o logo exibido saiu da camada do banco da instalação (a mesma camada que venceu `logoUrl`); logo de organização ou do `.env` **nunca** é trocado pelo escuro da instalação.
- Regra de desenho (spec 7.3.5): com `logoDarkUrl` **e** logo exibido vindo da instalação (na barra lateral: `!activeOrg?.marca?.logoUrl`, `Sidebar.tsx:114`), a `div` da moldura inteira ganha `dark:hidden` e, como **irmão** dela, um `<img src={logoDarkUrl}>` com `hidden dark:block`, sem moldura. Sem `logoDarkUrl`, nada muda. O primeiro `<img>` continua o claro, dentro da moldura.
- Tela: prop `variante` (padrão `claro`) em `CampoDeLogo`; `id` e `data-campo-de-logo` ganham `-escuro` só na variante escura (`logo-instalacao-escuro`, `instalacao-escuro`); `#logo-instalacao` e `[data-campo-de-logo='instalacao']` continuam únicos. A prévia escura é um componente próprio (`PreviaDoLogoEscuro`) com o atributo **`data-previa-do-logo-escuro`** (não `data-previa-do-logo`), para `[data-previa-do-logo='escuro'] img` continuar único. Na tela de entrada, o `<img>` escuro tem `data-testid="logo-da-fachada-escuro"`.
- Testes novos: `tests/invariants/convexy-logo-escuro.test.ts` (check `invariants`), `tests/unit/convexy-logo-escuro-rota.test.ts`, `tests/unit/convexy-logo-escuro-leitura.test.ts`, `tests/unit/convexy-logo-escuro.test.tsx`, `tests/unit/convexy-logo-escuro-campo.test.tsx` (check `verify`), `tests/e2e/convexy-logo-escuro.spec.ts` (check `e2e`, `SPECS_PARTE_1`).
- Textos novos (pt-BR = chave; `es` obrigatório): "Logo para o tema escuro"; "Como o logo aparece no tema escuro, sem moldura:"; "Sem logo para o tema escuro, o sistema mostra o logo claro sobre uma moldura branca."; "Aparece no tema escuro no lugar do logo claro, sem moldura. Só vale junto com o logo claro da instalação (o campo acima)."

## Modo de execução

- **Tasks 0–7 (código e registro):** uma por vez, na ordem, por subagente (superpowers:subagent-driven-development). O subagente **só** usa Read/Edit/Write e `git` de leitura (`status`, `log`, `diff`, `show`, `grep`, `ls-files`) mais `git add`/`git commit`. **Proibido** rodar `pnpm`, `npm`, `npx`, `node`, `vitest`, `tsc`, `eslint`, `docker`, `supabase`, `playwright`, build ou instalação — nem "só para conferir". Se um trecho citado não bater com o arquivo, parar e relatar. Cada task termina com um commit próprio. Depois de cada task, a sessão principal (ou um subagente revisor, também só leitura) confere o diff contra a task e a spec antes da seguinte.
- **Task 8 [GitHub]** e **Task 9 [VPS]** rodam **na sessão principal, no modo padrão de permissão**, com o Victor aprovando cada comando; confirmação explícita dele antes do merge, antes de empurrar a tag, antes de clicar "Atualizar" e antes de qualquer rollback.
- Vermelho no CI: diagnosticar pelo log (`gh run view … --log-failed`), corrigir **na branch** por subagente (editar + commitar), empurrar, esperar de novo. Nunca desligar check, nunca `--no-verify`.

## Review Focus

1. **Instalação sem a coluna → a marca inteira cai no `.env`.** `COLUNAS` de `lib/branding/instalacao.ts:104-105` é tudo-ou-nada (`:88-103`): código novo sobre banco sem `logo_dark_path` recebe PostgREST `42703` e perde nome, logo e cor do banco. Fixado: invariante da Task 1 (a coluna existe depois do baseline em install **e** update — o `invariants` roda `test:db` e `test:db:update`); o `e2e` do CI aplica o baseline e depois sobe o app (se a coluna faltasse, a marca do caso (1) da Task 6 não apareceria); Task 9 confere a coluna no banco da VPS **antes** de considerar a versão aplicada (o `update.sh:282-305` reaplica o baseline antes da imagem).
2. **Logo da organização trocado pelo escuro da instalação.** Fixado: Task 3, `convexy-logo-escuro-leitura.test.ts` (camada de organização com logo → sem `logoDarkUrl`; organização sem logo → o escuro da instalação vale) e Task 4, `convexy-logo-escuro.test.tsx` (`activeOrg.marca.logoUrl` presente → um `<img>` só, sem `dark:hidden`).
3. **Moldura branca vazia no escuro** (a moldura fica e só o `<img>` some, ou os dois logos aparecem juntos). Fixado: a classe `dark:hidden` vai na `div` da moldura (pai do `<img>` claro), não no `<img>`; o escuro é irmão da moldura. Task 4 (o pai do claro tem `dark:bg-white` **e** `dark:hidden`; o escuro tem `hidden` e `dark:block` e não está dentro da moldura) e Task 6 (no tema escuro o claro está oculto, o escuro visível e nenhum ancestral dele até o `<aside>`/`<body>` tem fundo claro).
4. **Seletores dos e2e do original duplicados** (`#logo-instalacao`, `[data-campo-de-logo='instalacao']`, `[data-previa-do-logo='escuro'] img`, `logo-da-fachada`). Fixado: Task 5, `convexy-logo-escuro-campo.test.tsx` (ids e atributos da variante escura; nenhum `[data-previa-do-logo]` nela) e as specs existentes `logo-moldura-no-tema-escuro.spec.ts` (`SPECS_PARTE_3`) e `marca-logo.spec.ts` (`SPECS_PARTE_5`), que rodam sem alteração no check `e2e`.
5. **CHECK recusando caminho válido, ou baseline que não reaplica.** Fixado: Task 1, invariante (caminho `png` e `jpg` válidos gravam; cinco caminhos tortos são recusados pelo nome da constraint; a regra é a do `logo_path` com a coluna trocada; o bloco reaplicado duas vezes não erra; reaplicado sobre um valor torto, zera o valor e recria a regra; o bloco é a migration sem comentários) e as cercas `baseline-reaplicavel`, `baseline-constraint-reconstruida`, `check-do-baseline-nao-diverge-da-cadeia`, `manifest-x-migrations`, `manifest-cita-caminho-que-existe` (check `verify`).

---

## Estrutura de arquivos

| Arquivo | Ação | Task | Responsabilidade |
|---|---|---|---|
| `supabase/migrations/20260924180901_9001_logo_escuro_da_instalacao.sql` | Criar | 1 | Coluna, backfill, regra |
| `supabase/baseline.sql` | Modificar (depois de `:14585`) | 1 | Mesmo bloco no apêndice |
| `supabase/migrations/MANIFEST.md` | Modificar (linha no fim) | 1 | Registro da 9001 |
| `lib/database.types.ts` | Modificar (`:7516-7552`) | 1 | `logo_dark_path` em `Row`/`Insert`/`Update` |
| `tests/invariants/convexy-logo-escuro.test.ts` | Criar | 1 | Forma no banco, reaplicação, bloco = migration |
| `app/api/v1/marca/logo/route.ts` | Modificar | 2 | `variante` |
| `tests/unit/convexy-logo-escuro-rota.test.ts` | Criar | 2 | Rota com espião |
| `lib/branding/instalacao.ts` | Modificar (`:104-105`) | 3 | Coluna em `COLUNAS` |
| `lib/branding/resolve.ts` | Modificar (`:79`, `:316`, `:363`, `:395`) | 3 | `logoDarkUrl` da camada e da resolução |
| `lib/branding.ts` | Modificar (`:21-28`) | 3 | `Branding.logoDarkUrl?` |
| `lib/branding/saida.ts` | Modificar (`:59-74`, `:198-200`) | 3 | `MarcaDeSaida.logoDarkUrl?` |
| `app/layout.tsx` | Modificar (`:275-289`) | 3 | `MarcaDosClientComponents` repassa o campo |
| `tests/unit/convexy-logo-escuro-leitura.test.ts` | Criar | 3 | Cadeia de leitura |
| `components/shell/Sidebar.tsx` | Modificar (`:114`, `:143-151`) | 4 | Moldura + `<img>` escuro |
| `app/(public)/layout.tsx` | Modificar (`:1-5`, `:79-87`) | 4 | Idem na tela de entrada |
| `tests/unit/convexy-logo-escuro.test.tsx` | Criar | 4 | Desenho (barra lateral e entrada) |
| `components/branding/CampoDeLogo.tsx` | Modificar | 5 | `variante`, prévia escura |
| `app/admin/(protected)/marca/page.tsx` | Modificar (`:1-12`, `:93-112`) | 5 | Lê e repassa `logo_dark_path` |
| `app/admin/(protected)/marca/_form.tsx` | Modificar (`:25-55`, `:67-76`, `:337-347`) | 5 | Segundo `CampoDeLogo` |
| `lib/i18n/dicionario.ts` | Modificar (depois de `:3689`) | 5 | Quatro textos, junto do bloco do logo |
| `tests/unit/convexy-logo-escuro-campo.test.tsx` | Criar | 5 | Campo na variante escura |
| `tests/e2e/convexy-logo-escuro.spec.ts` | Criar | 6 | Na tela, claro e escuro, barra e entrada |
| `.github/workflows/e2e.yml` | Modificar (`:624`) | 6 | Spec nova em `SPECS_PARTE_1` |
| `CONVEXY.md` | Modificar | 7 | Registro, desvios, rollback |
| `CHANGELOG.md` | Modificar (`:9-11`) | 7 | `## [1.47.0-cvx.2]` |

`lib/branding/contexto.tsx` **não muda**: `MarcaDaInstalacaoProvider`/`useMarcaDaInstalacao` (`:75`) trafegam `Branding`, que passa a carregar o campo opcional.

### Onde o código diverge da spec (o código vence)

Conferido contra `origin/main` `0f34ef09d` (base `v1.47.0`); a spec foi escrita contra a `v1.44.0`:

1. **Versão:** spec `-cvx.4` sobre `v1.44.0` → **`v1.47.0-cvx.2`** (base trocada; nomes por conteúdo).
2. **`baseline.sql`:** o bloco "BUCKET e COLUNA" da 0158 está em `:14509-14585` (spec: `14354-14430`); a 0159 começa em `:14588` (spec: `14433`); a regex real é a do UUID por extenso (`:14568`, `:14577`). O `-- ---- VARREDURA anon:` está em `:37143` — muito abaixo; o bloco novo não cria função nem concede a `anon`. O fim do arquivo segue com a 0340 (`:38015-38021`, `fn_conferir_modulos_instalados()`).
3. **Rota:** auditoria em `route.ts:329` (spec: `:325`). **`update.sh`:** a reaplicação do baseline está em `:282-305` (spec: `258-281`). **`app/layout.tsx`:** `MarcaDosClientComponents` em `:275-289` (spec: `259-271`). **`lib/database.types.ts`:** `platform_branding` em `:7516-7552` (spec: ~7513/~7526). Demais referências da 7.3 conferem (`resolve.ts:79,99,316,363,395`; `saida.ts:59`; `contexto.tsx:75`; `Sidebar.tsx:114,143`; `(public)/layout.tsx:79`; `page.tsx:77,97`; `CampoDeLogo.tsx:219,241,326-330`; `logo-nao-some-no-tema-escuro.test.ts:64-72,100-108`; `marca-previa-do-logo-sem-refresh.test.tsx:91`; `dicionario.ts:3662-3780`; `ci.yml:265`).
4. **Tradução:** a spec 7.3.3 diz que outros idiomas não são exigidos. `tests/unit/i18n-espanhol-cobre-a-tela.test.ts` ("nenhuma chamada t() cai no português por falta de tradução") reprova **toda** chave de `t()` em `app/`/`components/` sem `es` (o espanhol é idioma `completo` em `lib/i18n/registro.ts`). O plano traz o `es` dos quatro textos.
5. **Arquivos de teste:** a spec põe o desenho e a rota em `convexy-logo-escuro.test.tsx`. A rota exige `// @vitest-environment node` (como `app/api/v1/marca/logo/route.test.ts`), e o desenho exige jsdom — ambiente é por arquivo. Ficam quatro unitários: `convexy-logo-escuro.test.tsx` (desenho), `-rota.test.ts`, `-leitura.test.ts`, `-campo.test.tsx`.
6. **Seletores que a spec não previu:** a prévia escura usa `data-previa-do-logo-escuro` (e não `data-previa-do-logo`), e o `<img>` escuro da entrada usa `data-testid="logo-da-fachada-escuro"`: `logo-moldura-no-tema-escuro.spec.ts` (caso 4), `marca-logo.spec.ts` (`:696-699`) e o `getByTestId("logo-da-fachada")` dependem de seletores únicos.
7. **e2e:** spec nova `tests/e2e/convexy-logo-escuro.spec.ts` em vez de estender `convexy-identidade.spec.ts` — aquela é da `-cvx.3`, declara "um login só" e não usa o dono do servidor; esta precisa do dono (`/admin/marca`), promovido por `scripts/seed-e2e-system-update.ts` como em `logo-moldura-no-tema-escuro.spec.ts:98-99`. O `e2e.yml` tem cinco partes (spec 7.1 diz 1..3); a spec nova entra na `SPECS_PARTE_1`, ao lado de `convexy-identidade.spec.ts` (`:624`).
8. **`lib/branding/contexto.tsx`** está na tabela da spec, mas não precisa de edição (o tipo `Branding` carrega o campo).
9. **Logo escuro sem logo claro:** a regra de leitura só usa o escuro quando o logo exibido é o da instalação; se a instalação tiver só o escuro, nada muda na tela (o campo mostra o aviso). Consequência direta da spec 7.3.4, registrada como desvio aceito no `CONVEXY.md`.

---

### Task 0: Estado da branch

**Files:** nenhum.

**Interfaces:**
- Consumes: branch `convexy/logo-escuro` = `origin/main` + commit deste plano.
- Produces: confirmação de que a árvore está limpa e na base certa.

- [ ] **Step 1: Conferir (só leitura)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git status --short
git branch --show-current
git fetch -q origin main
git log --oneline origin/main..HEAD
git merge-base --is-ancestor origin/main HEAD && echo "base ok"
git show --no-patch --format=%h origin/main
```
Expected: `git status` vazio; `convexy/logo-escuro`; o `log` lista **só** `docs(convexy): plano do logo escuro (spec 7.3)` (e revisões do plano, se houver); `base ok`; `origin/main` = `0f34ef09d` ou um descendente dele. Se a `main` andou: `git merge --ff-only origin/main` só se a branch não tiver commits além do plano; senão parar e perguntar. Commit na branch que não seja do plano = parar e perguntar.

---

### Task 1: Banco — migration 9001, bloco no baseline, MANIFEST, tipos e invariante

**Files:**
- Create: `supabase/migrations/20260924180901_9001_logo_escuro_da_instalacao.sql`
- Modify: `supabase/baseline.sql` (inserir entre `:14585` — `notify pgrst, 'reload schema';` do bloco da 0158 — e `:14588`, rótulo da 0159)
- Modify: `supabase/migrations/MANIFEST.md` (linha nova no fim do arquivo)
- Modify: `lib/database.types.ts:7516-7552`
- Create: `tests/invariants/convexy-logo-escuro.test.ts`

**Interfaces:**
- Consumes: tabela `public.platform_branding` (bloco da 0155, antes de `:14500`), constraint `platform_branding_logo_path` (`:14572-14578`); helpers `sql(script): string` (`tests/invariants/gov-helpers.ts:23`) e `motivoDoErro(err): string` (`tests/invariants/psql-transporte.ts:63`).
- Produces: coluna `platform_branding.logo_dark_path text` + constraint `platform_branding_logo_dark_path`; tipos `logo_dark_path: string | null` (`Row`) e `logo_dark_path?: string | null` (`Insert`/`Update`).

- [ ] **Step 1: Arquivo da migration**

Criar `supabase/migrations/20260924180901_9001_logo_escuro_da_instalacao.sql` com exatamente:
```sql
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
```

- [ ] **Step 2: Bloco no apêndice do baseline**

Em `supabase/baseline.sql`, localizar o trecho único (fim do bloco da 0158 + rótulo da 0159):
```sql
-- `platform_branding_accent_hex`.

notify pgrst, 'reload schema';


-- ---- o teto de IA que vincula (migration 0159) ----
```
e substituí-lo por:
```sql
-- `platform_branding_accent_hex`.

notify pgrst, 'reload schema';


-- ---- logo escuro da instalação (migration 9001) ----
--
-- Convexy (fork victorrabyfs/DeskcommCRM) — spec
-- docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, seção 7.3.1;
-- registro em CONVEXY.md, "Logo escuro (etapa 3, v1.47.0-cvx.2)". O mesmo SQL
-- está em supabase/migrations/20260924180901_9001_logo_escuro_da_instalacao.sql.
--
-- A instalação ganha um SEGUNDO logo, para o tema escuro: com ele, a barra
-- lateral e a tela de entrada trocam o logo claro (dentro da moldura branca)
-- por este, sem moldura. Mesmo padrão do logo_path (bloco logo acima): caminho,
-- e NÃO url, sempre platform/<uuid>.<png|jpg>; escrito só pela rota
-- app/api/v1/marca/logo/route.ts (variante escuro); bucket brand-logos (público,
-- zero policy). platform_branding só é escrita por service_role: sem RLS nova,
-- sem policy, sem função.
--
-- POR QUE AQUI, e não no fim do arquivo: o fim é onde o original acrescenta os
-- blocos dele, e o último comando é a conferência de módulos da 0340, que
-- levanta ERROR de propósito. Num conflito de merge neste arquivo prevalece o
-- lado do original, e este bloco é reaplicado neste mesmo lugar.
--
-- Idempotente e auto-curativo, na ordem da 0158: coluna, backfill do que
-- estiver fora da forma e só então a regra (drop if exists + add) — o update.sh
-- roda SEM ON_ERROR_STOP, e uma constraint que estourasse deixaria a coluna sem
-- validação em silêncio.

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


-- ---- o teto de IA que vincula (migration 0159) ----
```
Nenhum comentário do bloco pode conter a sequência de quebra de linha + `-- ---- ` (o invariante recorta o bloco até o próximo rótulo). Nenhum comentário escreve `dark:bg-white`.

- [ ] **Step 3: Linha no MANIFEST**

No **fim** de `supabase/migrations/MANIFEST.md` (depois da última linha da tabela, hoje a de `0396_conversa_fica_com_quem_atendeu`; o arquivo é `merge=union`), acrescentar uma linha:
```markdown
| `20260924180901` | `9001_logo_escuro_da_instalacao` | **Convexy (fork): a instalação ganha um logo para o tema escuro.** `platform_branding.logo_dark_path text`, no mesmo formato e com a mesma regra do `logo_path` (0158): caminho `platform/<uuid>` em PNG ou JPG no bucket `brand-logos`, CHECK `platform_branding_logo_dark_path` com a mesma regex, backfill antes da regra. Escrito só por `app/api/v1/marca/logo/route.ts` (variante escuro); lido por `lib/branding/instalacao.ts`. Faixa 9001+ do fork, para nunca colidir com a numeração do original. Bloco no apêndice logo depois do da 0158, não no fim. Registro: `CONVEXY.md`. Gate: `tests/invariants/convexy-logo-escuro.test.ts` |
```
(Sem `|` solto no texto: a coluna usa a tabela Markdown.)

- [ ] **Step 4: Tipos à mão**

Em `lib/database.types.ts`, dentro de `platform_branding: {` (`:7516`), acrescentar a linha logo **antes** de `logo_path` nos três blocos, com a mesma indentação (10 espaços):
- em `Row: {` (antes de `          logo_path: string | null`): `          logo_dark_path: string | null`
- em `Insert: {` (antes de `          logo_path?: string | null`): `          logo_dark_path?: string | null`
- em `Update: {` (antes de `          logo_path?: string | null`): `          logo_dark_path?: string | null`

Regenerar o arquivo reescreveria tudo; nenhum teste o compara ao baseline (`tests/unit/e2e-nao-escolhe-a-primeira-linha.test.ts` só lê a indentação de `Row`, preservada).

- [ ] **Step 5: Invariante**

Criar `tests/invariants/convexy-logo-escuro.test.ts`:
```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { sql } from "./gov-helpers";
import { motivoDoErro } from "./psql-transporte";

/**
 * Convexy — o logo escuro da instalação (migration 9001), testemunhado pelo
 * BANCO (spec docs/superpowers/specs/2026-09-22-identidade-convexy-design.md,
 * 7.3.1; molde: tests/invariants/marca-logo.test.ts). Registro: CONVEXY.md.
 *
 * O que só o banco prova: (1) a coluna existe depois do baseline — código novo
 * sobre banco sem ela recebe 42703 e a instalação perde TODA a marca do banco
 * (`COLUNAS` de lib/branding/instalacao.ts é tudo-ou-nada); (2) a regra aceita
 * o caminho que a rota gera e recusa o resto; (3) reaplicar o bloco do
 * baseline — o que o update.sh faz em toda atualização — limpa valor fora da
 * forma em vez de quebrar.
 *
 * Cada caso roda numa transação desfeita no fim: o banco do arquivo é um clone
 * do molde (tests/db/banco-limpo-por-arquivo.ts), e mesmo assim nenhum caso
 * depende do que o anterior deixou. A saída do psql traz também BEGIN, INSERT,
 * NOTIFY…: só contam as linhas marcadas com SONDA|.
 */

const RAIZ = process.cwd();
const BASELINE = readFileSync(join(RAIZ, "supabase", "baseline.sql"), "utf8");
const ROTULO = "-- ---- logo escuro da instalação (migration 9001) ----";
const ROTULO_0158 = "-- ---- logo da marca: BUCKET e COLUNA (migration 0158) ----";
const ROTULO_0159 = "-- ---- o teto de IA que vincula (migration 0159) ----";
const PROXIMO_ROTULO = "\n-- ---- ";

const ARQUIVO_DA_MIGRATION = readdirSync(join(RAIZ, "supabase", "migrations")).find((f) =>
  /^\d{14}_9001_logo_escuro_da_instalacao\.sql$/.test(f),
);

const MARCA = "SONDA|";
const NOME = "9001aaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.png";
const CAMINHO = `platform/${NOME}`;
const CAMINHO_JPG = `platform/${NOME.replace(".png", ".jpg")}`;
const CAMINHO_CLARO = "platform/9001cccc-dddd-4eee-8fff-000000000000.png";
const ORG = "90010000-0000-4000-8000-000000000001";

/** O bloco rotulado da 9001, do rótulo até o próximo rótulo de apêndice. */
function blocoDa9001(): string {
  const inicio = BASELINE.indexOf(ROTULO);
  if (inicio === -1) throw new Error("rótulo da 9001 não encontrado no baseline");
  if (BASELINE.indexOf(ROTULO, inicio + 1) !== -1) throw new Error("rótulo da 9001 repetido no baseline");
  const fim = BASELINE.indexOf(PROXIMO_ROTULO, inicio + ROTULO.length);
  if (fim === -1) throw new Error("fim do bloco da 9001 não encontrado");
  return BASELINE.slice(inicio, fim);
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

function gravarEscuro(valor: string): string {
  return `insert into public.platform_branding (id, logo_dark_path) values (1, '${valor}')
            on conflict (id) do update set logo_dark_path = excluded.logo_dark_path;`;
}

describe("a coluna do logo escuro existe e tem a forma do logo claro", () => {
  it("`logo_dark_path` é text e anulável, depois do baseline", () => {
    const [coluna] = sondas(`
      select '${MARCA}' || data_type || '|' || is_nullable
        from information_schema.columns
       where table_schema = 'public' and table_name = 'platform_branding'
         and column_name = 'logo_dark_path';`);
    expect(coluna, "sem a coluna o PostgREST devolve 42703 e a marca inteira cai no .env").toBe(
      "text|YES",
    );
  });

  it("a regra é a do logo claro com a coluna trocada — mesma regex, byte a byte", () => {
    const [mesma] = sondas(`
      select '${MARCA}' || (replace(pg_get_constraintdef(c.oid), 'logo_path', 'logo_dark_path')
                            = pg_get_constraintdef(d.oid))::text
        from pg_constraint c, pg_constraint d
       where c.conname = 'platform_branding_logo_path'
         and d.conname = 'platform_branding_logo_dark_path';`);
    expect(mesma, "as duas constraints existem e dizem a mesma regra").toBe("true");
  });
});

describe("`platform_branding.logo_dark_path` — a forma vive no banco", () => {
  it("aceita o caminho que a rota gera, em PNG e em JPG (controle positivo)", () => {
    for (const valido of [CAMINHO, CAMINHO_JPG]) {
      const [gravado] = sondas(`
        begin;
        ${gravarEscuro(valido)}
        select '${MARCA}' || logo_dark_path from public.platform_branding where id = 1;
        rollback;`);
      expect(gravado).toBe(valido);
    }
  });

  it("RECUSA caminho fora da forma, pelo nome da constraint", () => {
    for (const torto of [
      `${ORG}/${NOME}`, // caminho de organização na coluna da instalação
      "platform/x.png", // nome que não é uuid
      `platform/${NOME.replace(".png", ".svg")}`, // extensão banida
      `platform/sub/${NOME}`, // subpasta
      `../platform/${NOME}`, // travessia
    ]) {
      const erro = erroDo(`
        begin;
        ${gravarEscuro(torto)}
        rollback;`);
      expect(erro, `o banco ACEITOU "${torto}"`).not.toBeNull();
      expect(erro).toContain("platform_branding_logo_dark_path");
    }
  });

  it("as duas colunas são independentes: apagar o escuro não toca no claro", () => {
    const [claro, escuro] = sondas(`
      begin;
      insert into public.platform_branding (id, logo_path, logo_dark_path)
        values (1, '${CAMINHO_CLARO}', '${CAMINHO}')
        on conflict (id) do update
          set logo_path = excluded.logo_path, logo_dark_path = excluded.logo_dark_path;
      update public.platform_branding set logo_dark_path = null where id = 1;
      select '${MARCA}' || coalesce(logo_path, 'NULO') from public.platform_branding where id = 1;
      select '${MARCA}' || coalesce(logo_dark_path, 'NULO') from public.platform_branding where id = 1;
      rollback;`);
    expect(claro).toBe(CAMINHO_CLARO);
    expect(escuro).toBe("NULO");
  });
});

describe("o bloco do baseline — reaplicável e igual à migration", () => {
  it("o bloco está logo depois do da 0158 e antes do da 0159", () => {
    const aqui = BASELINE.indexOf(ROTULO);
    expect(aqui, "rótulo da 9001 ausente").toBeGreaterThan(0);
    expect(aqui).toBeGreaterThan(BASELINE.indexOf(ROTULO_0158));
    expect(aqui).toBeLessThan(BASELINE.indexOf(ROTULO_0159));
  });

  it("o bloco é a migration, sem os comentários", () => {
    expect(ARQUIVO_DA_MIGRATION, "arquivo <timestamp>_9001_logo_escuro_da_instalacao.sql ausente").toBeDefined();
    const migration = readFileSync(join(RAIZ, "supabase", "migrations", ARQUIVO_DA_MIGRATION!), "utf8");
    expect(codigo(blocoDa9001())).toBe(codigo(migration));
  });

  it("aplicado duas vezes seguidas, não erra (install e update)", () => {
    const erro = erroDo(`
      begin;
      ${blocoDa9001()}
      ${blocoDa9001()}
      rollback;`);
    expect(erro, `o bloco não é reaplicável: ${erro ?? ""}`).toBeNull();
  });

  it("controle: SEM o bloco, um valor torto gravado sem a regra sobrevive", () => {
    const [valor, regras] = sondas(`
      begin;
      alter table public.platform_branding drop constraint platform_branding_logo_dark_path;
      ${gravarEscuro("lixo/de-antes.svg")}
      select '${MARCA}' || coalesce(logo_dark_path, 'NULO') from public.platform_branding where id = 1;
      select '${MARCA}' || count(*)::text from pg_constraint where conname = 'platform_branding_logo_dark_path';
      rollback;`);
    expect(valor, "a simulação não gravou o valor torto — o caso de baixo mediria nada").toBe(
      "lixo/de-antes.svg",
    );
    expect(regras).toBe("0");
  });

  it("COM o bloco, o valor torto vira NULL e a regra volta — o que o update.sh faz", () => {
    const [valor, regras] = sondas(`
      begin;
      alter table public.platform_branding drop constraint platform_branding_logo_dark_path;
      ${gravarEscuro("lixo/de-antes.svg")}
      ${blocoDa9001()}
      select '${MARCA}' || coalesce(logo_dark_path, 'NULO') from public.platform_branding where id = 1;
      select '${MARCA}' || count(*)::text from pg_constraint where conname = 'platform_branding_logo_dark_path';
      rollback;`);
    expect(valor, "reaplicar o baseline deixou o valor fora da forma").toBe("NULO");
    expect(regras, "reaplicar o baseline não recriou a regra").toBe("1");
  });
});
```

- [ ] **Step 6: Conferir o texto (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git grep -n "logo escuro da instalação (migration 9001)" -- supabase/baseline.sql
git grep -c "add constraint platform_branding_logo_dark_path" -- supabase/baseline.sql
grep -n "9001_logo_escuro_da_instalacao" supabase/migrations/MANIFEST.md
git grep -n "logo_dark_path" -- lib/database.types.ts
git add supabase/migrations/20260924180901_9001_logo_escuro_da_instalacao.sql supabase/baseline.sql supabase/migrations/MANIFEST.md lib/database.types.ts tests/invariants/convexy-logo-escuro.test.ts
git commit -m "feat(convexy): coluna logo_dark_path — migration 9001 (spec 7.3.1)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: o rótulo aparece uma vez (linha ≈14588); `add constraint platform_branding_logo_dark_path` conta `1`; uma linha no MANIFEST; três linhas em `database.types.ts`.

**Quem prova (no PR):**
- `invariants` (matriz `invariants-majors`, `pnpm test:db` e `pnpm test:db:update`): `tests/invariants/convexy-logo-escuro.test.ts` — 10 casos PASS; mais o baseline aplicado em install com `ON_ERROR_STOP=1` e em update.
- `verify` (`pnpm cercas`, `pnpm checar:colisao-de-migration`, `pnpm typecheck`): `tests/unit/manifest-x-migrations.test.ts`, `manifest-cita-caminho-que-existe.test.ts` (o `Gate:` aponta para arquivo que existe), `baseline-reaplicavel.test.ts` (o `add constraint` tem `drop constraint if exists` do mesmo nome nas 10 linhas acima), `baseline-constraint-reconstruida.test.ts` (nome único), `check-do-baseline-nao-diverge-da-cadeia.test.ts` (mesmo conjunto de literais na migration e no baseline), `varredura-anon-e-o-ultimo-bloco.test.ts`, `apendice-do-baseline-nao-diverge-da-cadeia.test.ts` — todos PASS; o script de colisão diz "OK — 1 migration(ões) nova(s)".

---

### Task 2: Rota — `variante` no POST e no DELETE

**Files:**
- Modify: `app/api/v1/marca/logo/route.ts` (`:85-86`, `:189-206`, `:221-226`, `:315-325`, `:358-450`, `:459-496`)
- Create: `tests/unit/convexy-logo-escuro-rota.test.ts`

**Interfaces:**
- Consumes: coluna `logo_dark_path` (Task 1); `caminhoNovoDoLogo`, `podeApagar`, `urlPublicaDoLogo`, `baseDoStorage` (inalterados).
- Produces: `POST /api/v1/marca/logo` com campo `variante` (`claro`|`escuro`, ausente = `claro`); `DELETE /api/v1/marca/logo?escopo=…&variante=…`; resposta inalterada (`{ data: { logo_path, logo_url } }`); recusa 422 `validation_failed` para variante inválida ou `escuro` fora da instalação.

- [ ] **Step 1: Esquema da variante**

Em `route.ts`, logo depois de `type Escopo = z.infer<typeof escopoSchema>;` (`:86`), inserir:
```ts

/**
 * Convexy (spec 7.3.2) — QUAL logo da instalação esta chamada troca: o do tema
 * claro (`logo_path`, o de sempre) ou o do tema escuro (`logo_dark_path`,
 * migration 9001). ALLOWLIST pelo mesmo motivo do escopo: o valor escolhe a
 * COLUNA gravada. Ausente = `claro`, e é isso que mantém o pedido de sempre
 * (sem o campo) com o comportamento de antes. `escuro` só existe na marca da
 * INSTALAÇÃO: a organização não tem coluna para ele. Registro: CONVEXY.md,
 * "Logo escuro".
 */
const varianteSchema = z.enum(["claro", "escuro"]);
type Variante = z.infer<typeof varianteSchema>;

function colunaDaVariante(variante: Variante): "logo_path" | "logo_dark_path" {
  return variante === "escuro" ? "logo_dark_path" : "logo_path";
}

/** A variante do pedido (formulário no POST, query no DELETE), conferida contra o escopo. */
function lerVariante(
  bruto: unknown,
  escopo: Escopo,
): { readonly variante: Variante } | { readonly recusa: string } {
  const lida = varianteSchema.safeParse(bruto ?? "claro");
  if (!lida.success) return { recusa: "Campo 'variante' inválido." };
  if (lida.data === "escuro" && escopo !== "instalacao") {
    return { recusa: "O logo para o tema escuro só existe na marca da instalação." };
  }
  return { variante: lida.data };
}
```

- [ ] **Step 2: `caminhoGravado` e `gravarCaminho` escolhem a coluna**

Substituir o trecho de `caminhoGravado` (`:189-199`):
```ts
/** O caminho HOJE gravado, lido do BANCO. Nunca do cliente. */
async function caminhoGravado(ctx: Contexto): Promise<string | null> {
  const admin = createAdminClient();
  if (ctx.escopo === "instalacao") {
    const { data } = await admin
      .from("platform_branding")
      .select("logo_path")
      .eq("id", 1)
      .maybeSingle();
    return (data as { logo_path?: string | null } | null)?.logo_path ?? null;
  }
```
por:
```ts
/** O caminho HOJE gravado, lido do BANCO. Nunca do cliente. */
async function caminhoGravado(ctx: Contexto, variante: Variante): Promise<string | null> {
  const admin = createAdminClient();
  if (ctx.escopo === "instalacao") {
    // Convexy: a coluna da variante — apagar o anterior do escuro nunca apaga o claro.
    const coluna = colunaDaVariante(variante);
    const { data } = await admin
      .from("platform_branding")
      .select(coluna)
      .eq("id", 1)
      .maybeSingle();
    return (
      (data as Partial<Record<"logo_path" | "logo_dark_path", string | null>> | null)?.[coluna] ??
      null
    );
  }
```
Substituir (`:221-226`):
```ts
async function gravarCaminho(ctx: Contexto, caminho: string | null): Promise<Recusa | null> {
  const admin = createAdminClient();
  if (ctx.escopo === "instalacao") {
    const { error } = await admin
      .from("platform_branding")
      .upsert({ id: 1, logo_path: caminho, seeded_from_env: false }, { onConflict: "id" });
```
por:
```ts
async function gravarCaminho(
  ctx: Contexto,
  caminho: string | null,
  variante: Variante,
): Promise<Recusa | null> {
  const admin = createAdminClient();
  if (ctx.escopo === "instalacao") {
    // Convexy: só a coluna da variante entra no upsert — a outra fica como está.
    const { error } = await admin
      .from("platform_branding")
      .upsert(
        { id: 1, [colunaDaVariante(variante)]: caminho, seeded_from_env: false },
        { onConflict: "id" },
      );
```
(O resto de `gravarCaminho`, inclusive o ramo da organização, não muda.)

- [ ] **Step 3: Auditoria com a coluna da variante**

Substituir (`:315-325`):
```ts
async function registrarAuditoria(
  ctx: Contexto,
  req: NextRequest,
  requestId: string,
  acao: "definido" | "removido",
): Promise<void> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;
  // FORMA, nunca IDENTIDADE — mesma disciplina de `resolve.ts`. O caminho do
  // arquivo não entra: a trilha é lida por quem opera a plataforma inteira.
  const metadata = { fields_changed: ["logo_path"], logo_definido: acao === "definido" };
```
por:
```ts
async function registrarAuditoria(
  ctx: Contexto,
  req: NextRequest,
  requestId: string,
  acao: "definido" | "removido",
  variante: Variante,
): Promise<void> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;
  // FORMA, nunca IDENTIDADE — mesma disciplina de `resolve.ts`. O caminho do
  // arquivo não entra: a trilha é lida por quem opera a plataforma inteira.
  // Convexy: `fields_changed` diz QUAL das duas colunas mudou.
  const metadata = {
    fields_changed: [colunaDaVariante(variante)],
    logo_definido: acao === "definido",
  };
```

- [ ] **Step 4: POST lê a variante**

No `POST`, substituir:
```ts
  const escopoLido = escopoSchema.safeParse(form?.get("escopo"));
  if (!escopoLido.success) {
    return fail("validation_failed", "Campo 'escopo' inválido.", 422, { requestId });
  }

  const aberto = await abrirContexto(escopoLido.data);
```
por:
```ts
  const escopoLido = escopoSchema.safeParse(form?.get("escopo"));
  if (!escopoLido.success) {
    return fail("validation_failed", "Campo 'escopo' inválido.", 422, { requestId });
  }
  const varianteLida = lerVariante(form?.get("variante"), escopoLido.data);
  if ("recusa" in varianteLida) {
    return fail("validation_failed", varianteLida.recusa, 422, { requestId });
  }
  const { variante } = varianteLida;

  const aberto = await abrirContexto(escopoLido.data);
```
E, no mesmo `POST`, trocar as três chamadas:
- `const anterior = await caminhoGravado(ctx);` → `const anterior = await caminhoGravado(ctx, variante);`
- `const recusa = await gravarCaminho(ctx, caminho);` → `const recusa = await gravarCaminho(ctx, caminho, variante);`
- `await registrarAuditoria(ctx, req, requestId, "definido");` → `await registrarAuditoria(ctx, req, requestId, "definido", variante);`

- [ ] **Step 5: DELETE lê a variante**

No `DELETE`, substituir:
```ts
  const escopoLido = escopoSchema.safeParse(new URL(req.url).searchParams.get("escopo"));
  if (!escopoLido.success) {
    return fail("validation_failed", "Parâmetro 'escopo' inválido.", 422, { requestId });
  }

  const aberto = await abrirContexto(escopoLido.data);
```
por:
```ts
  const busca = new URL(req.url).searchParams;
  const escopoLido = escopoSchema.safeParse(busca.get("escopo"));
  if (!escopoLido.success) {
    return fail("validation_failed", "Parâmetro 'escopo' inválido.", 422, { requestId });
  }
  const varianteLida = lerVariante(busca.get("variante"), escopoLido.data);
  if ("recusa" in varianteLida) {
    return fail("validation_failed", varianteLida.recusa, 422, { requestId });
  }
  const { variante } = varianteLida;

  const aberto = await abrirContexto(escopoLido.data);
```
E trocar, no `DELETE`:
- `const anterior = await caminhoGravado(ctx);` → `const anterior = await caminhoGravado(ctx, variante);`
- `const recusa = await gravarCaminho(ctx, null);` → `const recusa = await gravarCaminho(ctx, null, variante);`
- `await registrarAuditoria(ctx, req, requestId, "removido");` → `await registrarAuditoria(ctx, req, requestId, "removido", variante);`

Conferir por texto que não sobrou chamada de `caminhoGravado(ctx)`, `gravarCaminho(ctx, caminho)`, `gravarCaminho(ctx, null)` nem `registrarAuditoria(` com quatro argumentos: `git grep -n "caminhoGravado(ctx)\|gravarCaminho(ctx, caminho)\|gravarCaminho(ctx, null)\|\"definido\");\|\"removido\");" -- app/api/v1/marca/logo/route.ts` → vazio.

- [ ] **Step 6: Teste da rota**

Criar `tests/unit/convexy-logo-escuro-rota.test.ts`:
```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import type { AuthUser } from "@/lib/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Convexy — a rota do logo com `variante` (spec
 * docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, 7.3.2).
 * Mesmo desenho de app/api/v1/marca/logo/route.test.ts: espião no client do
 * Supabase, porque o que se prova é QUAL coluna a rota lê, grava e apaga —
 * decisão em TypeScript, não em SQL (a forma da coluna é o invariante da 9001).
 * Registro: CONVEXY.md, "Logo escuro".
 */

vi.mock("@/lib/auth/server", () => ({
  loadAuthUser: vi.fn(),
  resolveActiveOrg: vi.fn(),
  mfaEmDivida: vi.fn(async () => false),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/ai/dispatcher/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const ORG_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOGO_CLARO = "platform/33333333-3333-4333-8333-333333333333.png";
const LOGO_ESCURO_ANTIGO = "platform/55555555-5555-4555-8555-555555555555.png";

/** Os 8 bytes que `farejarTipo` exige para reconhecer PNG. */
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

function arquivoPng(): File {
  return new File([PNG_BYTES], "logo.png", { type: "image/png" });
}

/** Espião: registra tabela, colunas lidas, upserts, RPCs e remoções do Storage. */
function criarAdminEspiao(linha: Record<string, string | null>) {
  const fromChamadas: string[] = [];
  const colunasLidas: string[] = [];
  const gravacoes: Array<Record<string, unknown>> = [];
  const rpcChamadas: string[] = [];
  const removidos: string[] = [];

  const client = {
    from: (tabela: string) => {
      fromChamadas.push(tabela);
      const builder = {
        select: (colunas: string) => {
          colunasLidas.push(colunas);
          return builder;
        },
        eq: () => builder,
        maybeSingle: async () => ({
          data: tabela === "platform_branding" ? linha : null,
          error: null,
        }),
        upsert: async (valores: Record<string, unknown>) => {
          gravacoes.push(valores);
          return { error: null };
        },
      };
      return builder;
    },
    rpc: async (nome: string) => {
      rpcChamadas.push(nome);
      return { data: 1, error: null };
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        remove: async (caminhos: string[]) => {
          removidos.push(...caminhos);
          return { error: null };
        },
      }),
    },
  };

  return { client, fromChamadas, colunasLidas, gravacoes, rpcChamadas, removidos };
}

function donoDoServidor(): AuthUser {
  return {
    id: USER_ID,
    email: "dono@instalacao.test",
    full_name: null,
    avatar_url: null,
    is_platform_admin: true,
    idioma: "pt-BR",
    organizations: [],
  } as AuthUser;
}

function adminDeOrganizacao(): AuthUser {
  return {
    id: USER_ID,
    email: "admin@org.test",
    full_name: null,
    avatar_url: null,
    is_platform_admin: false,
    idioma: "pt-BR",
    organizations: [{ organization_id: ORG_ID, organization_name: "Org", role: "admin" }],
  } as AuthUser;
}

function formulario(campos: Record<string, string>): FormData {
  const form = new FormData();
  for (const [chave, valor] of Object.entries(campos)) form.set(chave, valor);
  form.set("file", arquivoPng());
  return form;
}

async function postar(form: FormData): Promise<Response> {
  const { POST } = await import("@/app/api/v1/marca/logo/route");
  return POST(new NextRequest("http://localhost/api/v1/marca/logo", { method: "POST", body: form }));
}

async function apagar(query: string): Promise<Response> {
  const { DELETE } = await import("@/app/api/v1/marca/logo/route");
  return DELETE(new NextRequest(`http://localhost/api/v1/marca/logo?${query}`, { method: "DELETE" }));
}

function metadadosDaAuditoria(): Record<string, unknown> | undefined {
  const chamada = vi.mocked(audit).mock.calls[0]?.[0] as { metadata?: Record<string, unknown> } | undefined;
  return chamada?.metadata;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveActiveOrg).mockResolvedValue({ orgId: ORG_ID, name: "Org", role: "admin" } as never);
});

describe("POST /api/v1/marca/logo com variante=escuro", () => {
  it("lê, grava e apaga SÓ a coluna do escuro — o logo claro não é tocado", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(donoDoServidor());
    const espiao = criarAdminEspiao({ logo_path: LOGO_CLARO, logo_dark_path: LOGO_ESCURO_ANTIGO });
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await postar(formulario({ escopo: "instalacao", variante: "escuro" }));

    expect(res.status, await res.clone().text()).toBe(200);
    expect(espiao.colunasLidas).toEqual(["logo_dark_path"]);
    expect(espiao.gravacoes).toHaveLength(1);
    const gravado = espiao.gravacoes[0]!;
    expect(gravado).toMatchObject({ id: 1, seeded_from_env: false });
    expect(String(gravado.logo_dark_path)).toMatch(/^platform\/[0-9a-f-]{36}\.png$/);
    expect(gravado, "o upload do escuro gravou na coluna do claro").not.toHaveProperty("logo_path");
    expect(espiao.removidos, "apagou outro arquivo que não o escuro anterior").toEqual([
      LOGO_ESCURO_ANTIGO,
    ]);
    expect(espiao.rpcChamadas).toEqual([]);
    expect(metadadosDaAuditoria()).toEqual({ fields_changed: ["logo_dark_path"], logo_definido: true });
    const corpo = (await res.json()) as { data: { logo_path: string; logo_url: string } };
    expect(corpo.data.logo_path).toBe(gravado.logo_dark_path);
    expect(corpo.data.logo_url).toContain("/storage/v1/object/public/brand-logos/platform/");
  });

  it("controle: SEM o campo, vale o claro — o pedido de sempre não muda", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(donoDoServidor());
    const espiao = criarAdminEspiao({ logo_path: LOGO_CLARO, logo_dark_path: LOGO_ESCURO_ANTIGO });
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await postar(formulario({ escopo: "instalacao" }));

    expect(res.status, await res.clone().text()).toBe(200);
    expect(espiao.colunasLidas).toEqual(["logo_path"]);
    expect(espiao.gravacoes[0]).toHaveProperty("logo_path");
    expect(espiao.gravacoes[0]).not.toHaveProperty("logo_dark_path");
    expect(espiao.removidos).toEqual([LOGO_CLARO]);
    expect(metadadosDaAuditoria()).toEqual({ fields_changed: ["logo_path"], logo_definido: true });
  });

  it("variante=escuro com escopo=organizacao é recusada com 422, antes de tocar banco ou Storage", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(adminDeOrganizacao());
    const espiao = criarAdminEspiao({});
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await postar(formulario({ escopo: "organizacao", variante: "escuro" }));

    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("validation_failed");
    expect(espiao.fromChamadas).toEqual([]);
    expect(espiao.rpcChamadas).toEqual([]);
    expect(espiao.removidos).toEqual([]);
  });

  it("variante fora da allowlist é recusada com 422", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(donoDoServidor());
    const espiao = criarAdminEspiao({});
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await postar(formulario({ escopo: "instalacao", variante: "roxo" }));

    expect(res.status).toBe(422);
    expect(espiao.gravacoes).toEqual([]);
  });
});

describe("DELETE /api/v1/marca/logo com variante=escuro", () => {
  it("zera só o escuro e apaga só o arquivo do escuro", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(donoDoServidor());
    const espiao = criarAdminEspiao({ logo_path: LOGO_CLARO, logo_dark_path: LOGO_ESCURO_ANTIGO });
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await apagar("escopo=instalacao&variante=escuro");

    expect(res.status, await res.clone().text()).toBe(200);
    expect(espiao.colunasLidas).toEqual(["logo_dark_path"]);
    expect(espiao.gravacoes).toEqual([{ id: 1, logo_dark_path: null, seeded_from_env: false }]);
    expect(espiao.removidos).toEqual([LOGO_ESCURO_ANTIGO]);
    expect(metadadosDaAuditoria()).toEqual({ fields_changed: ["logo_dark_path"], logo_definido: false });
  });

  it("variante=escuro com escopo=organizacao é recusada com 422", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(adminDeOrganizacao());
    const espiao = criarAdminEspiao({});
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await apagar("escopo=organizacao&variante=escuro");

    expect(res.status).toBe(422);
    expect(espiao.fromChamadas).toEqual([]);
    expect(espiao.rpcChamadas).toEqual([]);
  });
});
```

- [ ] **Step 7: Commit**

```bash
git add app/api/v1/marca/logo/route.ts tests/unit/convexy-logo-escuro-rota.test.ts
git commit -m "feat(convexy): rota do logo aceita variante escuro (spec 7.3.2)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

**Quem prova (no PR):** `verify` — `tests/unit/convexy-logo-escuro-rota.test.ts` (6 casos PASS); `app/api/v1/marca/logo/route.test.ts` (6 casos, sem alteração, PASS: o pedido sem `variante` segue igual); `tests/unit/suporte-cobertura-de-efeitos.test.ts` (o `requireSupportWrite()` continua antes do efeito); `pnpm typecheck` e `pnpm lint`.

---

### Task 3: Leitura — `logoDarkUrl` da coluna até o layout

**Files:**
- Modify: `lib/branding/instalacao.ts:88-105`
- Modify: `lib/branding/resolve.ts:79-90`, `:316-348`, `:363-379`, `:395-413`
- Modify: `lib/branding.ts:21-28`
- Modify: `lib/branding/saida.ts:59-74`, `:198-200`
- Modify: `app/layout.tsx:275-289`
- Create: `tests/unit/convexy-logo-escuro-leitura.test.ts`

**Interfaces:**
- Consumes: coluna `logo_dark_path` (Task 1); `logoDaCamada(caminho, url, base?)` (`lib/branding/logo.ts:191`).
- Produces: `Branding.logoDarkUrl?: string | null`; `CamadaDeMarca.logoDarkUrl?: string | null`; `LinhaDaInstalacao.logo_dark_path?: string | null`; `MarcaResolvida.logoDarkUrl` (herdado); `MarcaDeSaida.logoDarkUrl?: string | null`; o provedor `MarcaDaInstalacaoProvider` recebe `logoDarkUrl` quando existe. Consumidores: Task 4 (`Sidebar` via `useMarcaDaInstalacao()`, `(public)/layout` via `marcaDaSaida(null)`).

- [ ] **Step 1: `COLUNAS` com a coluna nova**

Em `lib/branding/instalacao.ts`, substituir:
```ts
const COLUNAS =
  "app_name, logo_url, logo_path, accent_hex, show_powered_by, seeded_from_env, fallback_at, fallback_reason";
```
por:
```ts
// Convexy (spec 7.3.4): `logo_dark_path` (migration 9001) entra pela MESMA regra
// do tudo-ou-nada descrita acima — o `update.sh` aplica o baseline antes de subir
// a imagem. CONVEXY.md, "Logo escuro".
const COLUNAS =
  "app_name, logo_url, logo_path, logo_dark_path, accent_hex, show_powered_by, seeded_from_env, fallback_at, fallback_reason";
```

- [ ] **Step 2: `Branding` ganha o campo opcional**

Em `lib/branding.ts`, substituir:
```ts
  /** Primeira letra do nome — usada onde só cabe um caractere (sidebar recolhida). */
  initial: string;
};
```
por:
```ts
  /** Primeira letra do nome — usada onde só cabe um caractere (sidebar recolhida). */
  initial: string;
  /**
   * Convexy (spec 7.3.4): o logo da INSTALAÇÃO para o tema escuro. Opcional de
   * propósito — os testes montam `Branding` literal — e só presente quando o
   * logo exibido veio do banco da instalação (`resolverMarca`). CONVEXY.md,
   * "Logo escuro".
   */
  logoDarkUrl?: string | null;
};
```
`resolveBranding` e `branding()` não mudam.

- [ ] **Step 3: `resolve.ts` — camada, linha e resolução**

(a) Em `CamadaDeMarca` (`:79`), substituir:
```ts
  readonly logoUrl?: string | null;
  /**
   * O envelope CRU, como veio da fonte — `unknown` de propósito: validar é
```
por:
```ts
  readonly logoUrl?: string | null;
  /**
   * Convexy (spec 7.3.4): o logo desta camada para o TEMA ESCURO. Só a camada do
   * banco da instalação o preenche (`camadaDaInstalacao`), e ele só chega à marca
   * resolvida quando o logo exibido saiu desta MESMA camada (`resolverMarca`).
   * CONVEXY.md, "Logo escuro".
   */
  readonly logoDarkUrl?: string | null;
  /**
   * O envelope CRU, como veio da fonte — `unknown` de propósito: validar é
```

(b) Em `resolverMarca` (`:316`), substituir:
```ts
  const logo = primeiroDefinido(camadas, (c) => c.logoUrl);
  const base = resolveBranding(nome?.valor, logo?.valor);
```
por:
```ts
  const logo = primeiroDefinido(camadas, (c) => c.logoUrl);
  const base = resolveBranding(nome?.valor, logo?.valor);
  // Convexy (spec 7.3.4): o logo escuro acompanha o logo EXIBIDO — vem da mesma
  // camada que venceu `logoUrl` (a primeira com logo não vazio, a regra de
  // `primeiroDefinido`). Logo de organização ou do `.env` nunca é trocado pelo
  // escuro da instalação: essas camadas não têm `logoDarkUrl`.
  const camadaDoLogo = camadas.find((c) => (c.logoUrl ?? "").trim().length > 0);
  const logoDarkUrl = (camadaDoLogo?.logoDarkUrl ?? "").trim();
```
e, no `return` da mesma função, substituir:
```ts
  return {
    ...base,
    cor,
    origens: {
```
por:
```ts
  return {
    ...base,
    // Só com valor: marca sem logo escuro fica idêntica à de antes.
    ...(logoDarkUrl.length > 0 ? { logoDarkUrl } : {}),
    cor,
    origens: {
```

(c) Em `LinhaDaInstalacao` (`:363`), substituir:
```ts
  readonly logo_path?: string | null;
  readonly accent_hex?: string | null;
};

/**
 * A camada do BANCO — a configuração viva da instalação, acima do `.env`.
```
por:
```ts
  readonly logo_path?: string | null;
  /**
   * Convexy (migration 9001): o arquivo do logo para o TEMA ESCURO, mesma forma
   * de `logo_path`. Sem `logo_url` par: não há semente do `.env` para ele.
   */
  readonly logo_dark_path?: string | null;
  readonly accent_hex?: string | null;
};

/**
 * A camada do BANCO — a configuração viva da instalação, acima do `.env`.
```

(d) Em `camadaDaInstalacao` (`:395`), substituir:
```ts
  const logoUrl = logoDaCamada(linha.logo_path, linha.logo_url);
  // Mesma regra do `.env`: campo vazio é ausência de configuração, não cor com
  // defeito. Sem isto, uma linha semeada de um `.env` sem cor emitiria
  // `cor_ausente` em toda instalação de fábrica — e aviso no caso normal ensina
  // o operador a ignorar avisos.
  if (hex.length === 0) {
    return { origem: "banco", nome: linha.app_name, logoUrl };
  }
  return {
    origem: "banco",
    nome: linha.app_name,
    logoUrl,
    cor: envelopeDeSemente(hex),
  };
```
por:
```ts
  const logoUrl = logoDaCamada(linha.logo_path, linha.logo_url);
  // Convexy (spec 7.3.4): o arquivo do tema escuro; a chave só existe com valor.
  const escuro = logoDaCamada(linha.logo_dark_path, null);
  const logoDark = escuro ? { logoDarkUrl: escuro } : {};
  // Mesma regra do `.env`: campo vazio é ausência de configuração, não cor com
  // defeito. Sem isto, uma linha semeada de um `.env` sem cor emitiria
  // `cor_ausente` em toda instalação de fábrica — e aviso no caso normal ensina
  // o operador a ignorar avisos.
  if (hex.length === 0) {
    return { origem: "banco", nome: linha.app_name, logoUrl, ...logoDark };
  }
  return {
    origem: "banco",
    nome: linha.app_name,
    logoUrl,
    ...logoDark,
    cor: envelopeDeSemente(hex),
  };
```
`camadaDoAmbiente` e `camadaDaOrganizacao` **não** mudam (nunca produzem `logoDarkUrl`).

- [ ] **Step 4: `saida.ts` — tipo e mapeamento**

Em `MarcaDeSaida` (`:59`), substituir:
```ts
  readonly logoUrl: string | null;
  /** `#hex` sempre — o formato que cliente de e-mail e @react-pdf entendem. */
```
por:
```ts
  readonly logoUrl: string | null;
  /**
   * Convexy (spec 7.3.4): o logo do tema escuro da instalação — só a tela de
   * entrada (`app/(public)/layout.tsx`) o lê. E-mail, ícone, manifest e MFA
   * ignoram o campo (tema claro sempre, spec seção 3).
   */
  readonly logoDarkUrl?: string | null;
  /** `#hex` sempre — o formato que cliente de e-mail e @react-pdf entendem. */
```
E em `marcaDaSaida`, substituir:
```ts
    return {
      nome: marca.name,
      logoUrl: marca.logoUrl,
      accent,
```
por:
```ts
    return {
      nome: marca.name,
      logoUrl: marca.logoUrl,
      ...(marca.logoDarkUrl ? { logoDarkUrl: marca.logoDarkUrl } : {}),
      accent,
```

- [ ] **Step 5: `app/layout.tsx` repassa o campo aos client components**

Substituir:
```tsx
  return (
    <MarcaDaInstalacaoProvider
      marca={{ name: marca.name, logoUrl: marca.logoUrl, initial: marca.initial }}
    >
```
por:
```tsx
  return (
    <MarcaDaInstalacaoProvider
      marca={{
        name: marca.name,
        logoUrl: marca.logoUrl,
        initial: marca.initial,
        // Convexy (spec 7.3.4): o logo do tema escuro, só quando existe — o
        // mesmo objeto chega ao SSR e à hidratação. CONVEXY.md, "Logo escuro".
        ...(marca.logoDarkUrl ? { logoDarkUrl: marca.logoDarkUrl } : {}),
      }}
    >
```
(O comentário "Só os três campos de `Branding`…" acima fica; `MarcaNoNavegador` não muda.)

- [ ] **Step 6: Teste da cadeia de leitura**

Criar `tests/unit/convexy-logo-escuro-leitura.test.ts`:
```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { marcaDaInstalacao, type LinhaDaMarca } from "@/lib/branding/instalacao";
import { baseDoStorage, urlPublicaDoLogo } from "@/lib/branding/logo";
import { REGUA_DO_PRODUTO } from "@/lib/branding/regua-do-produto";
import {
  camadaDaInstalacao,
  camadaDaOrganizacao,
  camadaDoAmbiente,
  resolverMarca,
} from "@/lib/branding/resolve";
import { marcaDaSaida } from "@/lib/branding/saida";

/**
 * Convexy — o logo escuro atravessa a leitura só quando o logo exibido é o da
 * instalação (spec docs/superpowers/specs/2026-09-22-identidade-convexy-design.md,
 * 7.3.4). Registro: CONVEXY.md, "Logo escuro".
 */

vi.mock("@/lib/branding/instalacao", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/branding/instalacao")>()),
  marcaDaInstalacao: vi.fn(),
}));

const CLARO = "platform/33333333-3333-4333-8333-333333333333.png";
const ESCURO = "platform/55555555-5555-4555-8555-555555555555.png";
const ORG = "22222222-2222-4222-8222-222222222222";
const DA_ORG = `${ORG}/44444444-4444-4444-8444-444444444444.png`;
const DO_AMBIENTE = "https://cdn.exemplo.test/revenda.png";

const url = (caminho: string): string => urlPublicaDoLogo(caminho, baseDoStorage());

function linha(parcial: Partial<LinhaDaMarca>): LinhaDaMarca {
  return {
    app_name: "Convexy",
    logo_url: null,
    logo_path: null,
    logo_dark_path: null,
    accent_hex: null,
    show_powered_by: true,
    seeded_from_env: false,
    fallback_at: null,
    fallback_reason: null,
    ...parcial,
  };
}

beforeEach(() => {
  vi.mocked(marcaDaInstalacao).mockReset();
});

describe("a camada do banco da instalação", () => {
  it("controle: há base do Storage — sem ela todo caminho viraria null e os casos mediriam nada", () => {
    expect(baseDoStorage().length).toBeGreaterThan(0);
  });

  it("com o arquivo escuro gravado, a camada traz `logoDarkUrl`", () => {
    const camada = camadaDaInstalacao(linha({ logo_path: CLARO, logo_dark_path: ESCURO }));
    expect(camada.logoUrl).toBe(url(CLARO));
    expect(camada.logoDarkUrl).toBe(url(ESCURO));
  });

  it("sem o arquivo escuro (ou vazio), a chave nem aparece", () => {
    expect("logoDarkUrl" in camadaDaInstalacao(linha({ logo_path: CLARO }))).toBe(false);
    expect("logoDarkUrl" in camadaDaInstalacao(linha({ logo_path: CLARO, logo_dark_path: "  " }))).toBe(
      false,
    );
  });
});

describe("resolverMarca — o escuro acompanha o logo exibido", () => {
  it("logo da instalação com escuro → a marca resolvida traz os dois", () => {
    const marca = resolverMarca(
      [camadaDaInstalacao(linha({ logo_path: CLARO, logo_dark_path: ESCURO })), camadaDoAmbiente({})],
      REGUA_DO_PRODUTO,
    );
    expect(marca.logoUrl).toBe(url(CLARO));
    expect(marca.logoDarkUrl).toBe(url(ESCURO));
    expect(marca.origens.logoUrl).toBe("banco");
  });

  it("logo da ORGANIZAÇÃO por cima → nunca é trocado pelo escuro da instalação", () => {
    const marca = resolverMarca(
      [
        camadaDaOrganizacao({ logo_path: DA_ORG }),
        camadaDaInstalacao(linha({ logo_path: CLARO, logo_dark_path: ESCURO })),
        camadaDoAmbiente({}),
      ],
      REGUA_DO_PRODUTO,
    );
    expect(marca.logoUrl).toBe(url(DA_ORG));
    expect("logoDarkUrl" in marca, "o logo da organização ganhou o escuro da instalação").toBe(false);
  });

  it("organização SEM logo próprio → vale o logo da instalação, e o escuro junto", () => {
    const marca = resolverMarca(
      [
        camadaDaOrganizacao({ app_name: "Clínica Sorriso" }),
        camadaDaInstalacao(linha({ logo_path: CLARO, logo_dark_path: ESCURO })),
        camadaDoAmbiente({}),
      ],
      REGUA_DO_PRODUTO,
    );
    expect(marca.logoUrl).toBe(url(CLARO));
    expect(marca.logoDarkUrl).toBe(url(ESCURO));
  });

  it("logo do `.env` (instalação só com o escuro) → sem logo escuro", () => {
    const marca = resolverMarca(
      [camadaDaInstalacao(linha({ logo_dark_path: ESCURO })), camadaDoAmbiente({ APP_LOGO_URL: DO_AMBIENTE })],
      REGUA_DO_PRODUTO,
    );
    expect(marca.logoUrl).toBe(DO_AMBIENTE);
    expect("logoDarkUrl" in marca).toBe(false);
  });
});

describe("marcaDaSaida(null) — a tela de entrada recebe o escuro", () => {
  it("com o escuro gravado, a saída o traz ao lado do claro", async () => {
    vi.mocked(marcaDaInstalacao).mockResolvedValue(linha({ logo_path: CLARO, logo_dark_path: ESCURO }));
    const saida = await marcaDaSaida(null);
    expect(saida.logoUrl).toBe(url(CLARO));
    expect(saida.logoDarkUrl).toBe(url(ESCURO));
  });

  it("sem o escuro, a saída é a de antes (a chave nem aparece)", async () => {
    vi.mocked(marcaDaInstalacao).mockResolvedValue(linha({ logo_path: CLARO }));
    const saida = await marcaDaSaida(null);
    expect(saida.logoUrl).toBe(url(CLARO));
    expect("logoDarkUrl" in saida).toBe(false);
  });
});
```

- [ ] **Step 7: Commit**

```bash
git add lib/branding/instalacao.ts lib/branding/resolve.ts lib/branding.ts lib/branding/saida.ts app/layout.tsx tests/unit/convexy-logo-escuro-leitura.test.ts
git commit -m "feat(convexy): logoDarkUrl na leitura da marca (spec 7.3.4)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

**Quem prova (no PR):** `verify` — `tests/unit/convexy-logo-escuro-leitura.test.ts` (9 casos PASS); sem alteração e PASS: `tests/unit/branding-instalacao.test.ts` (as asserções `toEqual` de `origens` não mudam), `branding-marca-organizacao.test.ts`, `branding-fallback-alcancavel.test.ts`, `marca-sem-divergencia-de-hidratacao.test.tsx` (o layout segue montando `<MarcaDaInstalacaoProvider` e `<MarcaDosClientComponents>`), `email-marca-e-remetente.test.ts`, `branding.test.ts`; `pnpm typecheck` (tipos opcionais; objetos literais de `Branding`/`MarcaDeSaida` nos testes seguem válidos). `build-and-size`: `next build`.

---

### Task 4: Desenho — moldura e `<img>` escuro na barra lateral e na tela de entrada

**Files:**
- Modify: `components/shell/Sidebar.tsx:114` e `:143-151`
- Modify: `app/(public)/layout.tsx:1-5` e `:79-87`
- Create: `tests/unit/convexy-logo-escuro.test.tsx`

**Interfaces:**
- Consumes: `useMarcaDaInstalacao(): Branding` com `logoDarkUrl?` (Task 3); `marcaDaSaida(null): Promise<MarcaDeSaida>` com `logoDarkUrl?` (Task 3); `cn` de `@/lib/utils`.
- Produces: DOM — moldura (`div` pai do `<img>` claro) com `dark:hidden` quando há escuro; `<img>` escuro irmão, `className` com `hidden` e `dark:block`, na tela de entrada com `data-testid="logo-da-fachada-escuro"`. Consumido pela Task 6.

**Restrições de forma** (`tests/unit/logo-nao-some-no-tema-escuro.test.ts:64-72`, `:75-98`): a **primeira** ocorrência de `dark:bg-white` no arquivo (fora de comentário `/* */`) tem de estar na tag que embrulha **diretamente** o `<img>` claro, a tag não pode se auto-fechar e o trecho entre `dark:bg-white` e o fim da tag não pode conter `>` (nada de `=>`). Comentários `//` novos **não** escrevem `dark:bg-white`.

- [ ] **Step 1: Barra lateral**

Em `components/shell/Sidebar.tsx`, substituir:
```tsx
  const logo = activeOrg?.marca?.logoUrl || brand.logoUrl;
```
por:
```tsx
  const logo = activeOrg?.marca?.logoUrl || brand.logoUrl;
  // Convexy (spec 7.3.5): o logo do tema escuro da INSTALAÇÃO só vale quando o
  // logo exibido é o dela — com logo da organização, nada muda. CONVEXY.md,
  // "Logo escuro".
  const logoEscuro = activeOrg?.marca?.logoUrl ? null : (brand.logoDarkUrl ?? null);
```
e substituir:
```tsx
          <div className="rounded-md dark:bg-white dark:px-2 dark:py-1 dark:shadow-sm">
            {/* <img> em vez de next/image de propósito: a URL vem de quem hospeda
              (banco ou .env), e next/image exige allowlist de domínios fechada em
              build — a imagem pré-buildada rejeitaria o domínio do self-hoster.
              Altura fixa e largura livre porque a arte enviada tem proporção
              desconhecida; forçar as duas distorceria o logo de quem configurou. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={nome} className="h-7 w-auto max-w-[10rem] object-contain" />
          </div>
```
por:
```tsx
          <>
            <div
              className={cn(
                "rounded-md dark:bg-white dark:px-2 dark:py-1 dark:shadow-sm",
                logoEscuro ? "dark:hidden" : null,
              )}
            >
              {/* <img> em vez de next/image de propósito: a URL vem de quem hospeda
                (banco ou .env), e next/image exige allowlist de domínios fechada em
                build — a imagem pré-buildada rejeitaria o domínio do self-hoster.
                Altura fixa e largura livre porque a arte enviada tem proporção
                desconhecida; forçar as duas distorceria o logo de quem configurou. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt={nome} className="h-7 w-auto max-w-[10rem] object-contain" />
            </div>
            {/* Convexy (spec 7.3.5): com o logo do tema escuro, a moldura INTEIRA
              some no escuro (acima) e este logo aparece no lugar dela, sem
              moldura. Troca só por CSS: servidor e cliente desenham o mesmo
              DOM, sem divergência de hidratação. */}
            {logoEscuro ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoEscuro}
                alt={nome}
                className="hidden h-7 w-auto max-w-[10rem] object-contain dark:block"
              />
            ) : null}
          </>
```
(`cn` já é importado na `:7`.)

- [ ] **Step 2: Tela de entrada**

Em `app/(public)/layout.tsx`, substituir:
```tsx
import { IdiomaProvider } from "@/lib/i18n/IdiomaProvider";
```
por:
```tsx
import { IdiomaProvider } from "@/lib/i18n/IdiomaProvider";
import { cn } from "@/lib/utils";
```
e substituir:
```tsx
              <div className="rounded-md dark:bg-white dark:px-3 dark:py-2 dark:shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  data-testid="logo-da-fachada"
                  src={marca.logoUrl}
                  alt={marca.nome}
                  className="h-10 w-auto max-w-[12rem] object-contain"
                />
              </div>
```
por:
```tsx
              <div
                className={cn(
                  "rounded-md dark:bg-white dark:px-3 dark:py-2 dark:shadow-sm",
                  marca.logoDarkUrl ? "dark:hidden" : null,
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  data-testid="logo-da-fachada"
                  src={marca.logoUrl}
                  alt={marca.nome}
                  className="h-10 w-auto max-w-[12rem] object-contain"
                />
              </div>
              {/* Convexy (spec 7.3.5): o logo do tema escuro da instalação, sem
                moldura, no lugar da moldura inteira (que some no escuro, acima).
                `data-testid` próprio: `logo-da-fachada` continua único para
                tests/e2e/marca-logo.spec.ts. */}
              {marca.logoDarkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  data-testid="logo-da-fachada-escuro"
                  src={marca.logoDarkUrl}
                  alt={marca.nome}
                  className="hidden h-10 w-auto max-w-[12rem] object-contain dark:block"
                />
              ) : null}
```

- [ ] **Step 3: Teste do desenho**

Criar `tests/unit/convexy-logo-escuro.test.tsx`:
```tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/shell/Sidebar";
import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import type { Branding } from "@/lib/branding";
import { MarcaDaInstalacaoProvider } from "@/lib/branding/contexto";
import type { MarcaDeSaida } from "@/lib/branding/saida";

/**
 * Convexy — o logo do tema escuro na barra lateral e na tela de entrada (spec
 * docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, 7.3.5 e 7.3.6).
 *
 * No jsdom o Tailwind não se aplica: o que se mede é o DOM e as CLASSES — a
 * moldura inteira (pai do logo claro) com `dark:hidden`, e o logo escuro como
 * IRMÃO dela, com `hidden dark:block`. Que as classes pintam de verdade é a
 * spec e2e tests/e2e/convexy-logo-escuro.spec.ts. Registro: CONVEXY.md.
 */

vi.mock("next/navigation", () => ({ usePathname: () => "/app/inbox" }));
vi.mock("@/app/actions/shell/toggleSidebar", () => ({ toggleSidebar: vi.fn() }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (chave: string) => chave }));
vi.mock("@/components/connections/ConnectionHealthDot", () => ({
  ConnectionHealthDot: () => null,
}));
vi.mock("@/components/shell/VersionFooter", () => ({ VersionFooter: () => null }));

const marcaDaSaida = vi.hoisted(() => vi.fn());
vi.mock("@/lib/branding/saida", () => ({ marcaDaSaida }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
  })),
}));

const CLARO = "https://cdn.exemplo.test/convexy-claro.png";
const ESCURO = "https://cdn.exemplo.test/convexy-escuro.png";
const DA_ORG = "https://cdn.exemplo.test/clinica.png";

const usuario = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@exemplo.test",
  is_platform_admin: false,
  organizations: [],
} as unknown as AuthUser;

const org = {
  orgId: "00000000-0000-4000-8000-0000000000aa",
  name: "Clínica Sorriso",
  role: "admin",
} as ActiveOrg;

let contexto: { user: AuthUser; activeOrg: ActiveOrg | null } = { user: usuario, activeOrg: org };
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => contexto }));

function renderSidebar(marca: Branding, collapsed = false) {
  return render(
    <MarcaDaInstalacaoProvider marca={marca}>
      <Sidebar collapsed={collapsed} />
    </MarcaDaInstalacaoProvider>,
  );
}

const COM_ESCURO: Branding = { name: "Convexy", logoUrl: CLARO, initial: "C", logoDarkUrl: ESCURO };
const SEM_ESCURO: Branding = { name: "Convexy", logoUrl: CLARO, initial: "C" };

function classes(el: Element | null | undefined): string[] {
  return (el?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  contexto = { user: usuario, activeOrg: org };
});

describe("barra lateral", () => {
  it("instalação com os dois logos: o claro na moldura que some no escuro, o escuro fora dela", () => {
    renderSidebar(COM_ESCURO);
    const imagens = screen.getAllByRole("img");
    expect(imagens.map((i) => i.getAttribute("src"))).toEqual([CLARO, ESCURO]);
    const [claro, escuro] = imagens;

    const moldura = claro!.parentElement;
    expect(classes(moldura)).toEqual(expect.arrayContaining(["dark:bg-white", "dark:hidden"]));
    expect(classes(escuro)).toEqual(expect.arrayContaining(["hidden", "dark:block"]));
    expect(escuro!.parentElement, "o logo escuro ficou DENTRO da moldura").not.toBe(moldura);
    expect(classes(escuro!.parentElement)).not.toContain("dark:bg-white");
    expect(escuro!.getAttribute("alt")).toBe("Convexy");
  });

  it("com logo da ORGANIZAÇÃO: um logo só, e a moldura não some — o escuro da instalação não entra", () => {
    contexto = { user: usuario, activeOrg: { ...org, marca: { nome: "Clínica Sorriso", logoUrl: DA_ORG } } };
    renderSidebar(COM_ESCURO);
    const imagens = screen.getAllByRole("img");
    expect(imagens.map((i) => i.getAttribute("src"))).toEqual([DA_ORG]);
    expect(classes(imagens[0]!.parentElement)).not.toContain("dark:hidden");
  });

  it("sem logo escuro, nada muda: um logo, moldura sem `dark:hidden`", () => {
    renderSidebar(SEM_ESCURO);
    const imagens = screen.getAllByRole("img");
    expect(imagens.map((i) => i.getAttribute("src"))).toEqual([CLARO]);
    expect(classes(imagens[0]!.parentElement)).toEqual(expect.arrayContaining(["dark:bg-white"]));
    expect(classes(imagens[0]!.parentElement)).not.toContain("dark:hidden");
  });

  it("recolhida: nenhum logo, nem o escuro", () => {
    renderSidebar(COM_ESCURO, true);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });
});

const SAIDA: MarcaDeSaida = {
  nome: "Convexy",
  logoUrl: CLARO,
  accent: "#1756c4",
  accentFg: "#ffffff",
  origens: { nome: "banco", cor: "banco" },
};

async function fachada(marca: MarcaDeSaida): Promise<HTMLElement> {
  marcaDaSaida.mockResolvedValue(marca);
  const { default: PublicLayout } = await import("@/app/(public)/layout");
  const html = renderToStaticMarkup(await PublicLayout({ children: <p>formulário</p> }));
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

describe("tela de entrada", () => {
  it("com os dois logos: o claro na moldura que some no escuro, o escuro fora dela", async () => {
    const host = await fachada({ ...SAIDA, logoDarkUrl: ESCURO });
    const imagens = within(host).getAllByRole("img");
    expect(imagens.map((i) => i.getAttribute("src"))).toEqual([CLARO, ESCURO]);
    const [claro, escuro] = imagens;

    expect(claro!.getAttribute("data-testid")).toBe("logo-da-fachada");
    expect(escuro!.getAttribute("data-testid")).toBe("logo-da-fachada-escuro");
    const moldura = claro!.parentElement;
    expect(classes(moldura)).toEqual(expect.arrayContaining(["dark:bg-white", "dark:hidden"]));
    expect(classes(escuro)).toEqual(expect.arrayContaining(["hidden", "dark:block"]));
    expect(escuro!.parentElement).not.toBe(moldura);
    expect(classes(escuro!.parentElement)).not.toContain("dark:bg-white");
    expect(host.textContent).toContain("formulário");
  });

  it("sem logo escuro, a fachada é a de antes", async () => {
    const host = await fachada(SAIDA);
    const imagens = within(host).getAllByRole("img");
    expect(imagens.map((i) => i.getAttribute("src"))).toEqual([CLARO]);
    expect(classes(imagens[0]!.parentElement)).not.toContain("dark:hidden");
    expect(host.querySelector("[data-testid='logo-da-fachada-escuro']")).toBeNull();
  });
});
```

- [ ] **Step 4: Conferência de forma (só leitura) e commit**

```bash
git grep -n "dark:bg-white" -- components/shell/Sidebar.tsx "app/(public)/layout.tsx"
git add components/shell/Sidebar.tsx "app/(public)/layout.tsx" tests/unit/convexy-logo-escuro.test.tsx
git commit -m "feat(convexy): logo escuro na barra lateral e na tela de entrada (spec 7.3.5)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected do `grep`: em cada arquivo, a primeira linha com `dark:bg-white` fora de `{/* … */}` é a do `cn(` da moldura (no `Sidebar.tsx`, a linha do comentário `//` antigo não cita a classe; no `(public)/layout.tsx` a menção em `{/* O chip \`dark:bg-white\` … */}` é removida pela cerca junto com o comentário).

**Quem prova (no PR):** `verify` — `tests/unit/convexy-logo-escuro.test.tsx` (6 casos PASS); sem alteração e PASS: `logo-nao-some-no-tema-escuro.test.ts` (4 casos: o chip existe, embrulha o `<img>` claro direto, a prévia do `CampoDeLogo` intacta, as três superfícies com `<img`), `marca-do-produto.test.tsx`, `marca-sem-divergencia-de-hidratacao.test.tsx`, `marca-na-fachada-de-acesso.test.tsx` (sem logo → nenhum `<img`), `sidebar-nome-da-organizacao.test.tsx` (`getByRole("img")` único sem escuro); `pnpm lint` (`@next/next/no-img-element` desligado por linha). `e2e`: `logo-moldura-no-tema-escuro.spec.ts` (`SPECS_PARTE_3`, sem logo escuro gravado nessa parte) inalterada e PASS.

---

### Task 5: Tela — `CampoDeLogo` com `variante` e o segundo campo em `/admin/marca`

**Files:**
- Modify: `components/branding/CampoDeLogo.tsx` (`:57`, `:77-104`, `:215-241`, `:257-365`, fim do arquivo)
- Modify: `app/admin/(protected)/marca/page.tsx` (`:4-12`, `:93-112`)
- Modify: `app/admin/(protected)/marca/_form.tsx` (`:25-55`, `:67-76`, depois de `:347`)
- Modify: `lib/i18n/dicionario.ts` (depois de `:3689`, `"Assim ele aparece:"`)
- Create: `tests/unit/convexy-logo-escuro-campo.test.tsx`

**Interfaces:**
- Consumes: rota com `variante` (Task 2); `logoDaCamada` (`lib/branding/logo.ts:191`); `LinhaDaMarca.logo_dark_path` (Task 3).
- Produces: `export type VarianteDoLogo = "claro" | "escuro"`; `CampoDeLogo` prop `variante?: VarianteDoLogo`; DOM da variante escura: `[data-campo-de-logo='instalacao-escuro'][data-hidratado]`, `#logo-instalacao-escuro`, `[data-previa-do-logo-escuro] img`; `MarcaGravada.logo_dark_path: string | null`; prop `logoEscuroEmVigor: string | null` do `FormularioDaMarca`. Consumido pela Task 6.

**Restrição de forma** (`tests/unit/logo-nao-some-no-tema-escuro.test.ts:100-108`): o ternário existente `rotulo === t("Aparência escura") ? "rounded-md bg-white px-2 py-1 shadow-sm" : undefined` (`CampoDeLogo.tsx:326-330`) **não muda**; a prévia escura é um componente próprio, sem ternário aninhado nem `&&` antes daquele `?`.

- [ ] **Step 1: Tipo e prop**

Em `CampoDeLogo.tsx`, substituir:
```tsx
export type EscopoDoLogo = "instalacao" | "organizacao";
```
por:
```tsx
export type EscopoDoLogo = "instalacao" | "organizacao";

/**
 * Convexy (spec 7.3.3): `escuro` = o logo que a INSTALAÇÃO mostra no tema escuro,
 * no lugar do claro com moldura. Só existe com `escopo="instalacao"` (a rota
 * recusa o resto). CONVEXY.md, "Logo escuro".
 */
export type VarianteDoLogo = "claro" | "escuro";
```
Em `interface Props`, substituir:
```tsx
  /** O nome em vigor — vira o `alt` da prévia e o texto do caso sem logo. */
  readonly nomeEmVigor: string;
}
```
por:
```tsx
  /** O nome em vigor — vira o `alt` da prévia e o texto do caso sem logo. */
  readonly nomeEmVigor: string;
  /**
   * Convexy (spec 7.3.3): qual logo este campo troca. Padrão `claro`. O `id` e o
   * `data-campo-de-logo` só ganham o sufixo `-escuro` nesta variante:
   * `#logo-instalacao` continua único para os e2e do original.
   */
  readonly variante?: VarianteDoLogo;
}
```
E substituir:
```tsx
export function CampoDeLogo({
  escopo,
  logoDaCamada,
  logoHerdado,
  origemDoHerdado,
  nomeEmVigor,
}: Props) {
  const t = useT();
```
por:
```tsx
export function CampoDeLogo({
  escopo,
  logoDaCamada,
  logoHerdado,
  origemDoHerdado,
  nomeEmVigor,
  variante = "claro",
}: Props) {
  const t = useT();
  // Convexy: a chave do DOM (`id`, `data-campo-de-logo`) — sem sufixo no claro.
  const chave = variante === "escuro" ? `${escopo}-escuro` : escopo;
```

- [ ] **Step 2: A variante vai no POST e no DELETE**

Substituir:
```tsx
      corpo.set("escopo", escopo);
      corpo.set("file", arquivo);
```
por:
```tsx
      corpo.set("escopo", escopo);
      corpo.set("variante", variante);
      corpo.set("file", arquivo);
```
e substituir:
```tsx
      const resposta = await fetch(`/api/v1/marca/logo?escopo=${escopo}`, { method: "DELETE" });
```
por:
```tsx
      const resposta = await fetch(`/api/v1/marca/logo?escopo=${escopo}&variante=${variante}`, {
        method: "DELETE",
      });
```

- [ ] **Step 3: Chave do DOM e rótulo**

Substituir:
```tsx
    <div className="space-y-4" data-campo-de-logo={escopo} data-hidratado={hidratado ? "" : undefined}>
      <div className="space-y-2">
        <Label htmlFor={`logo-${escopo}`}>{t("Logo")}</Label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={entrada}
            id={`logo-${escopo}`}
```
por:
```tsx
    <div className="space-y-4" data-campo-de-logo={chave} data-hidratado={hidratado ? "" : undefined}>
      <div className="space-y-2">
        <Label htmlFor={`logo-${chave}`}>
          {variante === "escuro" ? t("Logo para o tema escuro") : t("Logo")}
        </Label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={entrada}
            id={`logo-${chave}`}
```

- [ ] **Step 4: A prévia escura num ramo próprio**

Substituir a abertura da prévia:
```tsx
      <div className="space-y-2">
        <p className="text-sm text-text-muted">
          {/*
            `logoGravado`, e não a prop: com a prop, a tela diria "Sem logo
```
por:
```tsx
      {variante === "escuro" ? (
        <PreviaDoLogoEscuro logo={logoGravado} nome={nomeEmVigor} />
      ) : (
      <div className="space-y-2">
        <p className="text-sm text-text-muted">
          {/*
            `logoGravado`, e não a prop: com a prop, a tela diria "Sem logo
```
e substituir o fechamento do componente:
```tsx
          ))}
        </div>
      </div>
    </div>
  );
}
```
por:
```tsx
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

/**
 * Convexy (spec 7.3.3) — a prévia do logo do TEMA ESCURO, num bloco próprio: a
 * prévia de cima (duas caixas, com o chip claro na escura) é a do logo claro e
 * continua como está. Aqui o logo aparece CRU sobre a superfície escura da régua,
 * que é exatamente o que a barra lateral e a tela de entrada desenham com ele
 * (sem moldura). Atributo próprio, `data-previa-do-logo-escuro`: o seletor
 * `[data-previa-do-logo='escuro'] img` dos e2e do original continua único.
 * Sem logo escuro, nenhuma imagem — o sistema segue com o claro na moldura.
 */
function PreviaDoLogoEscuro({ logo, nome }: { readonly logo: string | null; readonly nome: string }) {
  const t = useT();
  return (
    <div className="space-y-2">
      <p className="text-sm text-text-muted">
        {logo
          ? t("Como o logo aparece no tema escuro, sem moldura:")
          : t("Sem logo para o tema escuro, o sistema mostra o logo claro sobre uma moldura branca.")}
      </p>
      {logo ? (
        <div
          data-previa-do-logo-escuro=""
          className="flex h-24 items-center justify-center rounded-sm border border-border px-4 sm:max-w-[50%]"
          style={{ backgroundColor: SUPERFICIE_ESCURA }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={nome} className="max-h-12 w-auto max-w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}
```
O conteúdo entre a abertura e o fechamento (o `.map` das duas caixas, `:302-361`) não muda; reindentar é opcional (o CI não roda `prettier`). Conferir: `git grep -n "Apar.ncia escura\")" -- components/branding/CampoDeLogo.tsx` continua mostrando o ternário `rotulo === t("Aparência escura")` seguido, na linha de baixo, de `? "rounded-md bg-white px-2 py-1 shadow-sm"`.

- [ ] **Step 5: `page.tsx` lê e repassa o escuro**

Em `app/admin/(protected)/marca/page.tsx`, substituir:
```tsx
import { marcaDaInstalacao } from "@/lib/branding/instalacao";
```
por:
```tsx
import { marcaDaInstalacao } from "@/lib/branding/instalacao";
import { logoDaCamada } from "@/lib/branding/logo";
```
Substituir:
```tsx
          logo_path: linha?.logo_path ?? null,
          accent_hex: linha?.accent_hex ?? null,
```
por:
```tsx
          logo_path: linha?.logo_path ?? null,
          // Convexy (spec 7.3.3): o arquivo do tema escuro, como está no banco.
          logo_dark_path: linha?.logo_dark_path ?? null,
          accent_hex: linha?.accent_hex ?? null,
```
e substituir:
```tsx
        logoDoAmbiente={semOArquivo.logoUrl}
```
por:
```tsx
        logoDoAmbiente={semOArquivo.logoUrl}
        // Convexy: a URL do arquivo escuro GRAVADO — direto da coluna, e não da
        // marca resolvida (que só o traz junto do logo claro da instalação): a
        // tela mostra o que está salvo mesmo quando ele ainda não aparece.
        logoEscuroEmVigor={logoDaCamada(linha?.logo_dark_path, null)}
```

- [ ] **Step 6: `_form.tsx` — segundo campo**

Em `app/admin/(protected)/marca/_form.tsx`, substituir:
```tsx
  readonly logo_path: string | null;
  readonly accent_hex: string | null;
  readonly show_powered_by: boolean;
}
```
por:
```tsx
  readonly logo_path: string | null;
  /**
   * Convexy (spec 7.3.3): o arquivo do logo do TEMA ESCURO. Também não vai no
   * `Salvar` — mesma rota, com `variante=escuro`. CONVEXY.md, "Logo escuro".
   */
  readonly logo_dark_path: string | null;
  readonly accent_hex: string | null;
  readonly show_powered_by: boolean;
}
```
Substituir:
```tsx
  /** O que apareceria SEM o arquivo subido — a URL colada no `.env`, se houver. */
  readonly logoDoAmbiente: string | null;
```
por:
```tsx
  /** O que apareceria SEM o arquivo subido — a URL colada no `.env`, se houver. */
  readonly logoDoAmbiente: string | null;
  /** Convexy: a URL do logo do tema escuro gravado; `null` = nenhum. */
  readonly logoEscuroEmVigor: string | null;
```
Substituir:
```tsx
  logoEmVigor,
  logoDoAmbiente,
  origens,
```
por:
```tsx
  logoEmVigor,
  logoDoAmbiente,
  logoEscuroEmVigor,
  origens,
```
E substituir:
```tsx
          origemDoHerdado="do arquivo de instalação do servidor"
          nomeEmVigor={nomeEmVigor}
        />
      </Card>

      <EstadoDaMarca
```
por:
```tsx
          origemDoHerdado="do arquivo de instalação do servidor"
          nomeEmVigor={nomeEmVigor}
        />
      </Card>

      {/*
        Convexy (spec 7.3.3): o logo do TEMA ESCURO, em cartão próprio pela mesma
        razão do de cima (não passa pelo Salvar). CONVEXY.md, "Logo escuro".
      */}
      <Card className="space-y-4 p-6">
        <p className="text-xs text-text-muted">
          {t(
            "Aparece no tema escuro no lugar do logo claro, sem moldura. Só vale junto com o logo claro da instalação (o campo acima).",
          )}
        </p>
        <CampoDeLogo
          escopo="instalacao"
          variante="escuro"
          // Literal, nunca memoizado — ver os Props de CampoDeLogo.
          logoDaCamada={{ url: gravada.logo_dark_path ? logoEscuroEmVigor : null }}
          logoHerdado={null}
          origemDoHerdado="do arquivo de instalação do servidor"
          nomeEmVigor={nomeEmVigor}
        />
      </Card>

      <EstadoDaMarca
```
O `handleSubmit` **não** muda: o `upsert` de `updateBranding` não inclui `logo_dark_path`, então salvar nome/cor não apaga o logo escuro.

- [ ] **Step 7: Textos no dicionário, junto do bloco do logo**

Em `lib/i18n/dicionario.ts`, substituir:
```ts
  "Sem logo próprio, o sistema usa o logo": { es: "Sin logo propio, el sistema usa el logo" },
  "Assim ele aparece:": { es: "Así se ve:" },
```
por:
```ts
  "Sem logo próprio, o sistema usa o logo": { es: "Sin logo propio, el sistema usa el logo" },
  "Assim ele aparece:": { es: "Así se ve:" },
  // Convexy (spec 7.3.3): o logo do tema escuro em /admin/marca — CONVEXY.md, "Logo escuro".
  "Logo para o tema escuro": { es: "Logo para el tema oscuro" },
  "Como o logo aparece no tema escuro, sem moldura:": {
    es: "Cómo se ve el logo en el tema oscuro, sin marco:",
  },
  "Sem logo para o tema escuro, o sistema mostra o logo claro sobre uma moldura branca.": {
    es: "Sin logo para el tema oscuro, el sistema muestra el logo claro sobre un marco blanco.",
  },
  "Aparece no tema escuro no lugar do logo claro, sem moldura. Só vale junto com o logo claro da instalação (o campo acima).": {
    es: "Aparece en el tema oscuro en lugar del logo claro, sin marco. Solo vale junto con el logo claro de la instalación (el campo de arriba).",
  },
```
Antes de editar, conferir que nenhuma das quatro chaves já existe (`git grep -n "tema escuro" -- lib/i18n/dicionario.ts` → vazio): chave repetida em literal de objeto é erro de `typecheck`.

- [ ] **Step 8: Teste do campo**

Criar `tests/unit/convexy-logo-escuro-campo.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { CampoDeLogo } from "@/components/branding/CampoDeLogo";

/**
 * Convexy — o campo do logo na variante ESCURA (spec
 * docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, 7.3.3).
 * Prova: ids e atributos próprios (os do claro seguem únicos para os e2e do
 * original), prévia própria sem chip claro, e a variante indo à rota no POST e no
 * DELETE. Registro: CONVEXY.md, "Logo escuro".
 */

const URL_ESCURO = "http://127.0.0.1:54321/storage/v1/object/public/brand-logos/platform/escuro.png";

const fetchMock = vi.fn();

function respostaOk(corpo: unknown): Response {
  return { ok: true, json: async () => corpo } as unknown as Response;
}

function pintar(props: Partial<Parameters<typeof CampoDeLogo>[0]> = {}) {
  return render(
    <CampoDeLogo
      escopo="instalacao"
      variante="escuro"
      logoDaCamada={{ url: null }}
      logoHerdado={null}
      origemDoHerdado="do arquivo de instalação do servidor"
      nomeEmVigor="Convexy"
      {...props}
    />,
  );
}

function escolherArquivo(seletor: string) {
  const entrada = document.querySelector<HTMLInputElement>(seletor)!;
  const arquivo = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "logo.png", {
    type: "image/png",
  });
  fireEvent.change(entrada, { target: { files: [arquivo] } });
}

beforeEach(() => {
  fetchMock.mockReset();
  refreshMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CampoDeLogo variante=escuro", () => {
  it("usa id e âncora próprios — os do logo claro ficam livres", () => {
    pintar();
    expect(document.querySelector("#logo-instalacao-escuro")).not.toBeNull();
    expect(document.querySelector("[data-campo-de-logo='instalacao-escuro'][data-hidratado]")).not.toBeNull();
    expect(document.querySelector("#logo-instalacao")).toBeNull();
    expect(document.querySelector("[data-campo-de-logo='instalacao']")).toBeNull();
    expect(screen.getByText("Logo para o tema escuro")).toBeTruthy();
  });

  it("controle: sem `variante`, o campo é o de sempre", () => {
    render(
      <CampoDeLogo
        escopo="instalacao"
        logoDaCamada={{ url: null }}
        logoHerdado={null}
        origemDoHerdado="do arquivo de instalação do servidor"
        nomeEmVigor="Convexy"
      />,
    );
    expect(document.querySelector("#logo-instalacao")).not.toBeNull();
    expect(document.querySelector("[data-campo-de-logo='instalacao']")).not.toBeNull();
    expect(document.querySelector("[data-previa-do-logo='escuro']")).not.toBeNull();
  });

  it("a prévia escura mostra o logo cru, sem chip claro, fora das caixas do logo claro", () => {
    pintar({ logoDaCamada: { url: URL_ESCURO } });
    expect(document.querySelectorAll("[data-previa-do-logo]")).toHaveLength(0);
    const img = document.querySelector<HTMLImageElement>("[data-previa-do-logo-escuro] img");
    expect(img?.getAttribute("src")).toBe(URL_ESCURO);
    expect(img?.parentElement?.hasAttribute("data-previa-do-logo-escuro")).toBe(true);
    expect(document.querySelector("[class*='bg-white']")).toBeNull();
    expect(screen.getByRole("button", { name: /^remover$/i })).toBeTruthy();
  });

  it("sem logo escuro, diz que o sistema segue com o claro na moldura — e não desenha imagem", () => {
    pintar();
    expect(
      screen.getByText("Sem logo para o tema escuro, o sistema mostra o logo claro sobre uma moldura branca."),
    ).toBeTruthy();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("o upload leva variante=escuro, e a prévia mostra o arquivo sem esperar o refresh", async () => {
    fetchMock.mockResolvedValue(respostaOk({ data: { logo_path: "platform/escuro.png", logo_url: URL_ESCURO } }));
    pintar();
    escolherArquivo("#logo-instalacao-escuro");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/marca/logo");
    const corpo = init.body as FormData;
    expect(corpo.get("escopo")).toBe("instalacao");
    expect(corpo.get("variante")).toBe("escuro");
    await waitFor(() =>
      expect(document.querySelector("[data-previa-do-logo-escuro] img")?.getAttribute("src")).toBe(URL_ESCURO),
    );
  });

  it("remover leva variante=escuro na query do DELETE", async () => {
    fetchMock.mockResolvedValue(respostaOk({ data: { logo_path: null, logo_url: null } }));
    pintar({ logoDaCamada: { url: URL_ESCURO } });
    fireEvent.click(screen.getByRole("button", { name: /^remover$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/marca/logo?escopo=instalacao&variante=escuro");
    expect(init.method).toBe("DELETE");
  });

  it("controle: o campo claro leva variante=claro", async () => {
    fetchMock.mockResolvedValue(respostaOk({ data: { logo_path: "platform/claro.png", logo_url: URL_ESCURO } }));
    render(
      <CampoDeLogo
        escopo="instalacao"
        logoDaCamada={{ url: null }}
        logoHerdado={null}
        origemDoHerdado="do arquivo de instalação do servidor"
        nomeEmVigor="Convexy"
      />,
    );
    escolherArquivo("#logo-instalacao");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.body as FormData).get("variante")).toBe("claro");
  });
});
```

- [ ] **Step 9: Commit**

```bash
git add components/branding/CampoDeLogo.tsx "app/admin/(protected)/marca/page.tsx" "app/admin/(protected)/marca/_form.tsx" lib/i18n/dicionario.ts tests/unit/convexy-logo-escuro-campo.test.tsx
git commit -m "feat(convexy): campo do logo escuro em /admin/marca (spec 7.3.3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

**Quem prova (no PR):** `verify` — `tests/unit/convexy-logo-escuro-campo.test.tsx` (7 casos PASS); sem alteração e PASS: `campo-de-logo-marca-hidratacao.test.tsx`, `marca-previa-do-logo-sem-refresh.test.tsx` (4 casos; o campo claro manda também `variante=claro`, que nenhum deles inspeciona), `logo-nao-some-no-tema-escuro.test.ts`, `i18n-espanhol-cobre-a-tela.test.ts` (as quatro chaves com `es`; nenhuma prosa fora de `t()`), `catalogo-de-idioma-tem-forma.test.ts`, `controle-decorativo.test.ts`; `pnpm typecheck` (`MarcaGravada.logo_dark_path` obrigatório, só `page.tsx` monta). `e2e`: `marca-logo.spec.ts` (`SPECS_PARTE_5`) e `logo-moldura-no-tema-escuro.spec.ts` (`SPECS_PARTE_3`) sem alteração e PASS — seus seletores seguem únicos.

---

### Task 6: e2e — `tests/e2e/convexy-logo-escuro.spec.ts`

**Files:**
- Create: `tests/e2e/convexy-logo-escuro.spec.ts`
- Modify: `.github/workflows/e2e.yml:624` (linha nova em `SPECS_PARTE_1`)

**Interfaces:**
- Consumes: `lerCreds(): CredsE2E`, `loginComoDono(page, creds): Promise<CredsE2E>` (`tests/e2e/helpers/login-admin.ts:44,118`); `scripts/seed-e2e-system-update.ts` (promove o `dono` a dono do servidor, idempotente); controle de tema `getByRole("button", { name: /^Tema:/ })`; chave `deskcomm-theme` do `THEME_INIT_SCRIPT` (`app/layout.tsx`); DOM das Tasks 4 e 5.
- Produces: 2 casos + `afterAll` na `SPECS_PARTE_1`; evidência em `.superpowers/evidence/convexy-logo-escuro/` (ignorada pelo git; no CI, só no artefato do run).

Regras que a spec cumpre: está em exatamente uma lista (`tests/unit/e2e-cobertura-completa.test.ts:188-198`), numa linha dentro do bloco `>-` sem comentário; loga duas vezes (`loginComoDono(` no caso 1 e no `afterAll`), então declara teto ≥ 60 000 ms (`e2e-dois-logins-nao-cabem-no-teto-padrao.test.ts`: padrão 30 000 + janela TOTP 30 000) — declara 120 000; navega só para rotas que existem (`/admin/marca`, `/app/inbox`, `/login`); não lê `.env.local`; não toca tabela tenant-aware sem filtro (nem toca banco: tudo pela tela). Banco compartilhado na parte: o caso (1) monta a própria precondição (remove os dois logos) e o `afterAll` remove os dois de novo, mesmo se um caso estourar.

- [ ] **Step 1: A spec**

Criar `tests/e2e/convexy-logo-escuro.spec.ts`:
```ts
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

import { test, expect, type Locator, type Page } from "@playwright/test";

import { lerCreds, loginComoDono } from "./helpers/login-admin";

/**
 * Convexy — o logo da instalação para o TEMA ESCURO, medido NA TELA (spec
 * docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, 7.3.6).
 *
 * Com os dois logos enviados por `/admin/marca`, o claro aparece só no tema
 * claro e o escuro só no escuro, SEM moldura branca no escuro — na barra
 * lateral e na tela de entrada. Por ferramenta: `toBeVisible`/`toBeHidden` e
 * `getComputedStyle` da cadeia de ancestrais, nunca a olho.
 *
 * O banco do e2e é compartilhado pelas specs da mesma parte: o caso (1) monta a
 * precondição (sem logo nenhum) e o `afterAll` remove os dois logos — é ele que
 * limpa `logo_dark_path` mesmo quando um caso estoura (a moldura do logo claro
 * é medida por tests/e2e/logo-moldura-no-tema-escuro.spec.ts). Registro:
 * CONVEXY.md, "Logo escuro".
 */

test.describe.configure({ mode: "serial", timeout: 120_000 });

const EVIDENCIA = path.join(process.cwd(), ".superpowers", "evidence", "convexy-logo-escuro");

// `/admin/marca` é do DONO DO SERVIDOR: o seed o promove (idempotente) — o mesmo
// passo de logo-moldura-no-tema-escuro.spec.ts.
let creds = lerCreds();
execFileSync("npx", ["tsx", "scripts/seed-e2e-system-update.ts"], { stdio: "inherit" });

type Chave = "instalacao" | "instalacao-escuro";

// ── PNG de verdade, montado byte a byte (mesma construção de marca-logo.spec.ts) ──

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(tipo: string, dados: Buffer): Buffer {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "latin1"), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

function pngSolido(lado: number, cor: [number, number, number]): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const linhas: Buffer[] = [];
  for (let y = 0; y < lado; y++) {
    const linha = Buffer.alloc(1 + lado * 3);
    for (let x = 0; x < lado; x++) {
      linha[1 + x * 3] = cor[0];
      linha[2 + x * 3] = cor[1];
      linha[3 + x * 3] = cor[2];
    }
    linhas.push(linha);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(linhas))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Azul-marinho: arte pensada para fundo claro. */
const PNG_CLARO = pngSolido(64, [16, 24, 64]);
/** Quase branco: arte pensada para fundo escuro. */
const PNG_ESCURO = pngSolido(64, [240, 244, 250]);

// ── Medição ─────────────────────────────────────────────────────────────────

function canais(cor: string): { r: number; g: number; b: number; a: number } | null {
  const m = cor.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/);
  if (!m) return null;
  return { r: +m[1]!, g: +m[2]!, b: +m[3]!, a: m[4] === undefined ? 1 : +m[4]! };
}

/** Fundo claro medido: opaco e com os três canais ≥ 200 (a moldura é `bg-white`). */
function fundoEClaro(cor: string): boolean {
  const c = canais(cor);
  if (!c || c.a < 0.9) return false;
  return c.r >= 200 && c.g >= 200 && c.b >= 200;
}

function fundoETransparente(cor: string): boolean {
  const c = canais(cor);
  return c !== null && c.a === 0;
}

/** O fundo de cada ancestral do logo, até (sem incluir) a tag de parada. */
async function fundosAte(logo: Locator, parada: "aside" | "body"): Promise<string[]> {
  return logo.evaluate((el, alvo) => {
    const fundos: string[] = [];
    let no = el.parentElement;
    while (no && no.tagName.toLowerCase() !== alvo) {
      fundos.push(getComputedStyle(no).backgroundColor);
      no = no.parentElement;
    }
    return fundos;
  }, parada);
}

function evidencia(nome: string): string {
  fs.mkdirSync(EVIDENCIA, { recursive: true });
  return path.join(EVIDENCIA, nome);
}

async function temaDaPagina(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

/** Troca o tema CLICANDO no controle (claro → escuro → sistema → claro), com teto. */
async function escolherTemaPelaTela(page: Page, alvo: "light" | "dark"): Promise<void> {
  const botao = page.getByRole("button", { name: /^Tema:/ });
  await expect(botao, "o controle de tema não está na tela").toBeVisible({ timeout: 15_000 });
  for (let i = 0; i < 4; i++) {
    const antes = await temaDaPagina(page);
    if (antes === alvo) return;
    await botao.click();
    await expect
      .poll(() => temaDaPagina(page), { timeout: 3_000 })
      .not.toBe(antes)
      .catch(() => undefined);
  }
  throw new Error(`o controle de tema não chegou em "${alvo}" em 4 cliques (data-theme=${await temaDaPagina(page)})`);
}

async function campoHidratado(page: Page, chave: Chave): Promise<Locator> {
  await expect(
    page.locator(`[data-campo-de-logo='${chave}'][data-hidratado]`),
    `o campo "${chave}" não hidratou`,
  ).toBeVisible({ timeout: 15_000 });
  return page.locator(`[data-campo-de-logo='${chave}']`);
}

/** Sobe um PNG pelo campo e devolve a `logo_url` que a rota gravou. */
async function subir(page: Page, chave: Chave, bytes: Buffer, nome: string): Promise<string> {
  const campo = await campoHidratado(page, chave);
  const resposta = page.waitForResponse(
    (r) => r.url().includes("/api/v1/marca/logo") && r.request().method() === "POST",
    { timeout: 20_000 },
  );
  await page.locator(`#logo-${chave}`).setInputFiles({ name: nome, mimeType: "image/png", buffer: bytes });
  const r = await resposta;
  expect(r.status(), await r.text()).toBe(200);
  const corpo = (await r.json()) as { data?: { logo_url?: string | null } };
  const url = corpo.data?.logo_url ?? "";
  expect(url, "a rota não devolveu logo_url do bucket").toMatch(/\/brand-logos\/platform\//);
  await expect(campo.getByRole("button", { name: /^remover$/i })).toBeVisible({ timeout: 15_000 });
  return url;
}

async function removerSeHouver(page: Page, chave: Chave): Promise<void> {
  await page.goto("/admin/marca");
  const campo = await campoHidratado(page, chave);
  const remover = campo.getByRole("button", { name: /^remover$/i });
  if ((await remover.count()) === 0) return;
  const resposta = page.waitForResponse(
    (r) => r.url().includes("/api/v1/marca/logo") && r.request().method() === "DELETE",
    { timeout: 20_000 },
  );
  await remover.click();
  expect((await resposta).status()).toBe(200);
  await expect(remover).toHaveCount(0, { timeout: 15_000 });
}

let urlClaro = "";
let urlEscuro = "";

test.describe("o logo do tema escuro (spec 7.3)", () => {
  test("(1) /admin/marca grava os dois logos, e a barra lateral troca o claro pelo escuro no tema escuro", async ({
    page,
  }) => {
    creds = await loginComoDono(page, creds);
    await removerSeHouver(page, "instalacao-escuro");
    await removerSeHouver(page, "instalacao");

    await page.goto("/admin/marca");
    urlClaro = await subir(page, "instalacao", PNG_CLARO, "logo-claro.png");
    urlEscuro = await subir(page, "instalacao-escuro", PNG_ESCURO, "logo-escuro.png");
    expect(urlEscuro).not.toBe(urlClaro);
    // Colunas independentes, vistas pela tela: subir o escuro não trocou o claro.
    await expect(page.locator("[data-previa-do-logo='claro'] img")).toHaveAttribute("src", urlClaro);
    await expect(page.locator("[data-previa-do-logo-escuro] img")).toHaveAttribute("src", urlEscuro);
    await page.screenshot({ path: evidencia("admin-marca.png"), fullPage: true });

    await page.goto("/app/inbox");
    const claro = page.locator(`aside img[src="${urlClaro}"]`).first();
    const escuro = page.locator(`aside img[src="${urlEscuro}"]`).first();

    await escolherTemaPelaTela(page, "light");
    await expect(claro, "tema claro sem o logo claro").toBeVisible({ timeout: 15_000 });
    await expect(escuro, "o logo escuro apareceu no tema claro").toBeHidden();
    const fundoDaMoldura = await claro.evaluate((el) => getComputedStyle(el.parentElement as HTMLElement).backgroundColor);
    expect(fundoETransparente(fundoDaMoldura), `no claro a moldura pintou fundo (${fundoDaMoldura})`).toBe(true);
    await page.screenshot({ path: evidencia("barra-claro.png") });

    await escolherTemaPelaTela(page, "dark");
    await expect(escuro, "tema escuro sem o logo escuro").toBeVisible({ timeout: 15_000 });
    await expect(claro, "o logo claro (e a moldura) continuou no tema escuro").toBeHidden();
    const fundos = await fundosAte(escuro, "aside");
    expect(fundos.filter(fundoEClaro), `moldura branca no escuro: ${JSON.stringify(fundos)}`).toEqual([]);
    await page.screenshot({ path: evidencia("barra-escuro.png") });
  });

  test("(2) a tela de entrada, sem sessão: o claro só no claro, o escuro só no escuro, sem moldura", async ({
    browser,
  }) => {
    expect(urlClaro && urlEscuro, "o caso (1) não gravou os dois logos").toBeTruthy();
    for (const tema of ["light", "dark"] as const) {
      const contexto = await browser.newContext();
      try {
        const pagina = await contexto.newPage();
        // A fachada não tem controle de tema: o estado é semeado antes do primeiro
        // byte, como no navegador de quem escolheu o tema e saiu da conta.
        await pagina.addInitScript((t) => window.localStorage.setItem("deskcomm-theme", t), tema);
        await pagina.goto("/login");
        expect(await temaDaPagina(pagina), `a fachada não ficou em ${tema}`).toBe(tema);

        const claro = pagina.getByTestId("logo-da-fachada");
        const escuro = pagina.getByTestId("logo-da-fachada-escuro");
        await expect(claro).toHaveAttribute("src", urlClaro);
        await expect(escuro).toHaveAttribute("src", urlEscuro);

        if (tema === "light") {
          await expect(claro).toBeVisible({ timeout: 15_000 });
          await expect(escuro).toBeHidden();
        } else {
          await expect(escuro).toBeVisible({ timeout: 15_000 });
          await expect(claro).toBeHidden();
          const fundos = await fundosAte(escuro, "body");
          expect(fundos.filter(fundoEClaro), `moldura branca na entrada escura: ${JSON.stringify(fundos)}`).toEqual(
            [],
          );
        }
        await pagina.screenshot({ path: evidencia(`login-${tema}.png`) });
      } finally {
        await contexto.close();
      }
    }
  });

  /** A restauração: roda mesmo quando um caso estoura, e limpa as duas colunas. */
  test.afterAll(async ({ browser }) => {
    const contexto = await browser.newContext();
    try {
      const pagina = await contexto.newPage();
      creds = await loginComoDono(pagina, creds);
      await removerSeHouver(pagina, "instalacao-escuro");
      await removerSeHouver(pagina, "instalacao");
    } finally {
      await contexto.close();
    }
  });
});
```

- [ ] **Step 2: Registrar na `SPECS_PARTE_1`**

Em `.github/workflows/e2e.yml`, substituir:
```yaml
        icone-da-marca.spec.ts
        convexy-identidade.spec.ts
```
por:
```yaml
        icone-da-marca.spec.ts
        convexy-identidade.spec.ts
        convexy-logo-escuro.spec.ts
```
(8 espaços, dentro do bloco `>-`, sem comentário.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/convexy-logo-escuro.spec.ts .github/workflows/e2e.yml
git commit -m "test(convexy): e2e do logo escuro (spec 7.3.6)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

**Quem prova (no PR):** `e2e` — a parte `e2e-parte (1)` roda `convexy-logo-escuro.spec.ts` (2 casos PASS; o `afterAll` limpa); as partes 3 e 5 rodam `logo-moldura-no-tema-escuro.spec.ts` e `marca-logo.spec.ts` sem alteração. `verify` — `tests/unit/e2e-cobertura-completa.test.ts`, `e2e-dois-logins-nao-cabem-no-teto-padrao.test.ts` (um caso novo, PASS com 120 000), `e2e-navega-para-rota-que-existe.test.ts`, `e2e-nao-escolhe-a-primeira-linha.test.ts`, `seed-nao-le-env-local-do-disco.test.ts` (um caso novo por spec, PASS); `pnpm typecheck` inclui `tests/e2e`.

---

### Task 7: `CONVEXY.md` e `CHANGELOG.md`

**Files:**
- Modify: `CONVEXY.md` ("Base e versões" `:29-38`; seção nova antes de `## Desvios aceitos` `:98`; bullets em "Desvios aceitos" e "Afirmações de docs…"; "Rollback de uma versão da etapa 3" no fim)
- Modify: `CHANGELOG.md` (`:9-11`)

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: registro que a Task 9 cita no rollback; notas que o botão "Atualizar" mostra.

- [ ] **Step 1: "Base e versões"**

Em `CONVEXY.md`, substituir:
```markdown
| Atualização para a base 1.47.0 do original (sem mudança da Convexy) | `v1.47.0-cvx.1` |

Versão revertida não é reaproveitada: a correção sai na `-cvx.N` seguinte e o conteúdo que
vinha depois (logo escuro, spec 7.3; marca das clínicas desligada, spec 7.4) desloca uma casa.
Acrescentar uma linha a cada versão publicada.
```
por:
```markdown
| Atualização para a base 1.47.0 do original (sem mudança da Convexy) | `v1.47.0-cvx.1` |
| Logo escuro em `/admin/marca` (spec 7.3; migration 9001) | `v1.47.0-cvx.2` |

Versão revertida não é reaproveitada: a correção sai na `-cvx.N` seguinte e o conteúdo que
vinha depois (marca das clínicas desligada, spec 7.4) desloca uma casa.
Acrescentar uma linha a cada versão publicada.
```

- [ ] **Step 2: Seção de alterações do logo escuro**

Logo antes de `## Desvios aceitos`, inserir:
```markdown
### Logo escuro (etapa 3, `v1.47.0-cvx.2`)

A instalação ganha um segundo logo, para o tema escuro: com ele, a barra lateral e a tela de
entrada mostram esse arquivo no escuro, sem a moldura branca; sem ele, nada muda. Só vale
quando o logo exibido é o da instalação (logo de organização ou do `.env` nunca é trocado).

Arquivos novos (código da Convexy — não conflitam num merge):
`supabase/migrations/20260924180901_9001_logo_escuro_da_instalacao.sql`,
`tests/invariants/convexy-logo-escuro.test.ts`, `tests/unit/convexy-logo-escuro.test.tsx`,
`tests/unit/convexy-logo-escuro-rota.test.ts`, `tests/unit/convexy-logo-escuro-leitura.test.ts`,
`tests/unit/convexy-logo-escuro-campo.test.tsx`, `tests/e2e/convexy-logo-escuro.spec.ts`.

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `supabase/baseline.sql` | bloco `-- ---- logo escuro da instalação (migration 9001) ----` logo depois do bloco "logo da marca: BUCKET e COLUNA (migration 0158)" e antes do da 0159 — nunca no fim (lá está a 0340, que levanta ERROR de propósito) | num conflito, prevalece o lado do original e o bloco inteiro é reaplicado no mesmo lugar |
| `supabase/migrations/MANIFEST.md` | linha `9001_logo_escuro_da_instalacao` no fim | `merge=union`: conferir que não duplicou (`manifest-x-migrations`) |
| `lib/database.types.ts` | `logo_dark_path` em `Row`/`Insert`/`Update` de `platform_branding`, antes de `logo_path` | reaplicar as três linhas à mão (nunca regenerar o arquivo) |
| `app/api/v1/marca/logo/route.ts` | `varianteSchema`, `colunaDaVariante`, `lerVariante`; `variante` em `caminhoGravado`, `gravarCaminho` (`[colunaDaVariante(variante)]` no `upsert`), `registrarAuditoria` (`fields_changed`); leitura no `POST` (formulário) e no `DELETE` (`busca.get("variante")`) | reaplicar os blocos com o comentário `Convexy`; a versão da marca das clínicas desligada (spec 7.4) mexe no mesmo arquivo depois |
| `lib/branding/instalacao.ts` | `logo_dark_path` em `COLUNAS`, com o comentário `Convexy` | manter a coluna na string |
| `lib/branding/resolve.ts` | `CamadaDeMarca.logoDarkUrl?`; `LinhaDaInstalacao.logo_dark_path?`; em `resolverMarca`, `camadaDoLogo`/`logoDarkUrl` e o espalhamento no `return`; em `camadaDaInstalacao`, `escuro`/`logoDark` nos dois `return` | reaplicar os trechos `Convexy` |
| `lib/branding.ts` | `logoDarkUrl?: string \| null` em `Branding` | idem |
| `lib/branding/saida.ts` | `MarcaDeSaida.logoDarkUrl?` e o espalhamento em `marcaDaSaida` | idem |
| `app/layout.tsx` | `MarcaDosClientComponents` passa `...(marca.logoDarkUrl ? { logoDarkUrl: … } : {})` | idem |
| `components/shell/Sidebar.tsx` | `const logoEscuro = …`; moldura com `cn(…, logoEscuro ? "dark:hidden" : null)` dentro de um fragmento, e o `<img>` escuro irmão com `hidden … dark:block` | a moldura continua embrulhando DIRETO o `<img>` claro (`logo-nao-some-no-tema-escuro.test.ts`) |
| `app/(public)/layout.tsx` | `import { cn }`; mesma moldura com `dark:hidden`; `<img data-testid="logo-da-fachada-escuro">` irmão | idem |
| `components/branding/CampoDeLogo.tsx` | `VarianteDoLogo`, prop `variante`, `chave` (`id`/`data-campo-de-logo` com `-escuro`), `variante` no POST e no DELETE, rótulo "Logo para o tema escuro", ramo `PreviaDoLogoEscuro` (`data-previa-do-logo-escuro`) | o ternário `rotulo === t("Aparência escura") ? "…bg-white…"` fica intacto |
| `app/admin/(protected)/marca/page.tsx` | `import { logoDaCamada }`; `logo_dark_path` em `gravada`; prop `logoEscuroEmVigor` | reaplicar |
| `app/admin/(protected)/marca/_form.tsx` | `MarcaGravada.logo_dark_path`; prop `logoEscuroEmVigor`; cartão com o segundo `CampoDeLogo` (`variante="escuro"`) logo depois do cartão do logo | reaplicar o cartão no mesmo lugar |
| `lib/i18n/dicionario.ts` | quatro chaves (com `es`) logo depois de `"Assim ele aparece:"`, com o comentário `Convexy` | reaplicar o bloco no mesmo lugar, não no fim do objeto |
| `.github/workflows/e2e.yml` | linha `convexy-logo-escuro.spec.ts` em `SPECS_PARTE_1`, logo depois de `convexy-identidade.spec.ts` | dentro do bloco `>-`, sem comentário |
| `CHANGELOG.md` | `## [1.47.0-cvx.2]` | ordem de "Base e versões" |

Conferência depois de um merge do original: o CI do PR do merge (checks `verify` e `invariants`)
com `tests/invariants/convexy-logo-escuro.test.ts`, `tests/unit/convexy-logo-escuro*.test.ts*`,
`logo-nao-some-no-tema-escuro.test.ts`, `check-do-baseline-nao-diverge-da-cadeia.test.ts`,
`baseline-reaplicavel.test.ts`, `manifest-x-migrations.test.ts` e
`i18n-espanhol-cobre-a-tela.test.ts` em `pass`; e o `e2e` com a `SPECS_PARTE_1` em `pass`.
```

- [ ] **Step 3: Desvios aceitos e afirmações que não valem**

No fim da lista de `## Desvios aceitos`, acrescentar:
```markdown
- **Logo escuro (`v1.47.0-cvx.2`)** — só aparece junto com o logo claro da instalação: se a
  instalação tiver só o escuro, ou se o logo exibido for o de uma organização ou o do `.env`,
  nada muda (o campo avisa). E-mail, ícone, manifest e MFA continuam com o logo claro
  (spec, seção 3). O mapa `docs/architecture/marca-propria.architecture.json` (aresta `e58`,
  "upsert de logo_path") não é editado: a coluna nova e a variante da rota ficam registradas
  aqui (DoD 13). `docs/testing/user-journey-map.md` não é editado (doc do original); a prova de
  tela é `tests/e2e/convexy-logo-escuro.spec.ts` e a conferência na VPS.
- **Testes do logo escuro** — nenhuma suíte rodou na máquina local: a prova é o CI do PR
  (`verify`, `invariants` com `test:db` e `test:db:update`, `build-and-size`, `e2e` com as
  cinco partes em `pass`, `imagens-ok`) e a conferência na VPS depois da aplicação.
- **Migration da faixa 9001+** — numeração própria do fork (nunca colide com a do original).
  O `checar-colisao-de-migration.sh` passa a sugerir `9002` como "próximo livre" no fork.
```
No fim de `## Afirmações de docs do original que não valem no fork`, acrescentar:
```markdown
- `docs/white-label.md:17` e o cabeçalho de `tests/unit/logo-nao-some-no-tema-escuro.test.ts`
  ("um logo só"): no fork a instalação tem também o logo do tema escuro (`v1.47.0-cvx.2`).
  `docs/architecture/marca-propria.architecture.json` (`e58`) só cita `logo_path`.
```

- [ ] **Step 4: Rollback do logo escuro**

No fim de `CONVEXY.md` (depois do último parágrafo de "Rollback de uma versão da etapa 3"), acrescentar:
```markdown
**Da `v1.47.0-cvx.2` (logo escuro) para a `v1.47.0-cvx.1`.** Antes de pensar em rollback: se
o problema é só o logo escuro (arte errada, contraste), basta **Remover** o logo do campo
"Logo para o tema escuro" em `/admin/marca` — a tela volta ao logo claro com a moldura, sem
atualização nenhuma. Rollback só se algo ficou ilegível ou um fluxo quebrou, pelo mesmo
comando acima com `--to v1.47.0-cvx.1 --force` (sessão `tmux` `rollback-logo-escuro`, log
`/root/update-<data>-rollback-logo-escuro.log`). A coluna `logo_dark_path` fica no banco,
inofensiva: o código da `-cvx.1` não a lê, e o baseline da `-cvx.1` não a remove. Depois
disso o botão volta a oferecer a `-cvx.2`: não clicar; corrigir na `-cvx.3`.
```

- [ ] **Step 5: Seção no CHANGELOG**

Em `CHANGELOG.md`, substituir:
```markdown
## [Não lançado]

## [1.47.0-cvx.1] — 2026-09-24
```
por (trocar `AAAA-MM-DD` pela data do corte, que a sessão principal informa no despacho desta task; a Task 8 Step 4 confere):
```markdown
## [Não lançado]

## [1.47.0-cvx.2] — AAAA-MM-DD

Logo para o tema escuro. Em `/admin/marca` há um campo novo, **Logo para o tema escuro** (PNG ou JPG, até 512 KB, fundo transparente). Com ele enviado, o tema escuro mostra esse logo na barra lateral e na tela de entrada, sem a moldura branca; o tema claro continua com o logo de sempre. Sem ele, nada muda. A atualização acrescenta sozinha uma coluna ao banco; não há nada a fazer no `.env`.

## [1.47.0-cvx.1] — 2026-09-24
```

- [ ] **Step 6: Conferir (só leitura) e commitar**

```bash
sed -n 9,16p CHANGELOG.md
git diff --name-only origin/main HEAD | grep -vE '^docs/superpowers/' | while read -r f; do grep -qF "$f" CONVEXY.md || echo "FORA DO CONVEXY.md: $f"; done
git add CONVEXY.md CHANGELOG.md
git commit -m "docs(convexy): registro e notas da 1.47.0-cvx.2

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: o `sed` mostra `## [Não lançado]`, depois `## [1.47.0-cvx.2] — <data do corte>`, o parágrafo e `## [1.47.0-cvx.1] — 2026-09-24`; o laço não imprime nada (todo arquivo tocado por esta branch está citado no `CONVEXY.md`).

**Quem prova (no PR):** `verify` — `tests/unit/release-chega-na-lp.test.ts` (cabeçalho `-cvx` aceito por `CABECALHO_VERSAO_CONVEXY`), `convexy-cabecalho-cvx.test.ts`, `changelog-cabe-na-tela-da-vps.test.ts`, `lib/system/changelog.test.ts`, `documentacao-aponta-para-o-que-existe.test.ts`, `evidencia-citada.test.ts` (nenhuma imagem citada entre crases).

---

### Task 8 [GitHub]: PR, CI, merge, tag e publicação da `v1.47.0-cvx.2`

**Files:** nenhum novo.

**Interfaces:**
- Consumes: Tasks 0–7 em `convexy/logo-escuro`.
- Produces: `main` do fork com o logo escuro; tag `v1.47.0-cvx.2`; quatro imagens `:1.47.0-cvx.2` e `stable` apontando para elas.

- [ ] **Step 1: Estado antes do push (só leitura, sessão principal)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git status --short
git fetch -q origin main
git log --oneline origin/main..HEAD
git diff --name-only origin/main...HEAD | sort
git diff origin/main...HEAD -- app components lib | grep -iE '^\+.*deskcomm' || echo "sem a palavra do original no código novo"
```
Expected: `git status` vazio; o `log` com o plano e os sete commits das Tasks 1–7; o `diff --name-only` com exatamente estes 26 arquivos: `.github/workflows/e2e.yml`, `CHANGELOG.md`, `CONVEXY.md`, `app/(public)/layout.tsx`, `app/admin/(protected)/marca/_form.tsx`, `app/admin/(protected)/marca/page.tsx`, `app/api/v1/marca/logo/route.ts`, `app/layout.tsx`, `components/branding/CampoDeLogo.tsx`, `components/shell/Sidebar.tsx`, `docs/superpowers/plans/2026-09-24-convexy-logo-escuro.md`, `lib/branding.ts`, `lib/branding/instalacao.ts`, `lib/branding/resolve.ts`, `lib/branding/saida.ts`, `lib/database.types.ts`, `lib/i18n/dicionario.ts`, `supabase/baseline.sql`, `supabase/migrations/20260924180901_9001_logo_escuro_da_instalacao.sql`, `supabase/migrations/MANIFEST.md`, `tests/e2e/convexy-logo-escuro.spec.ts`, `tests/invariants/convexy-logo-escuro.test.ts`, `tests/unit/convexy-logo-escuro-campo.test.tsx`, `tests/unit/convexy-logo-escuro-leitura.test.ts`, `tests/unit/convexy-logo-escuro-rota.test.ts`, `tests/unit/convexy-logo-escuro.test.tsx`; "sem a palavra do original no código novo".

- [ ] **Step 2: Workflows, push e PR**

Pedir confirmação ao Victor. Depois:
```bash
gh workflow list --all -R victorrabyfs/DeskcommCRM --json path,state --jq '.[]|[.path,.state]|@tsv'
git push -u origin convexy/logo-escuro
gh pr create -R victorrabyfs/DeskcommCRM --base main --head convexy/logo-escuro \
  --title "Convexy 1.47.0-cvx.2: logo escuro em /admin/marca" \
  --body "Etapa 3, logo escuro (spec docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, seção 7.3; plano docs/superpowers/plans/2026-09-24-convexy-logo-escuro.md). Migration 9001 (platform_branding.logo_dark_path: arquivo + bloco no baseline logo depois da 0158 + MANIFEST); rota do logo com variante claro/escuro; logoDarkUrl opcional na leitura, só quando o logo exibido é o da instalação; barra lateral e tela de entrada trocam a moldura pelo logo escuro no tema escuro, por CSS. Destino (DoD 18): instalação do fork. Sem .env.

Living System Checklist (DoD 13): entrada = campo 'Logo para o tema escuro' em /admin/marca (porta existente no NAV_CATALOG) → POST /api/v1/marca/logo com variante=escuro; saída = barra lateral e tela de entrada no tema escuro; log = api_audit_log platform_branding.updated com fields_changed [logo_dark_path]; anti-morte = sem o logo escuro vale o claro com moldura (nada muda); laço de retorno = a prévia mostra o arquivo sobre a superfície escura na hora do envio, e a rota diz por que recusou (SVG, tamanho, tipo); mapa vivo não editado (desvio registrado no CONVEXY.md). Nenhuma suíte rodou na máquina local: a prova é este CI (invariants com test:db e test:db:update; e2e com a spec nova na parte 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
Expected: `ci.yml`, `e2e.yml`, `perf.yml`, `publish-image.yml` em `active`; `acolhida.yml`, `release.yml`, `relogio.yml`, `vigia-de-colisao.yml` em `disabled_manually` (workflow novo trazido pela base 1.47.0 também tem de estar desligado, se não servir — parar e perguntar); URL `https://github.com/victorrabyfs/DeskcommCRM/pull/…`.

- [ ] **Step 3: Esperar os cinco obrigatórios resolverem**

`gh pr checks --watch` sai antes de os cinco aparecerem; esperar por nome, com teto de 90 min:
```bash
inicio=$(date +%s)
while :; do
  linhas=$(gh pr checks convexy/logo-escuro -R victorrabyfs/DeskcommCRM --json name,bucket \
    --jq '.[] | select(.name=="verify" or .name=="invariants" or .name=="build-and-size" or .name=="e2e" or .name=="imagens-ok") | "\(.name) \(.bucket)"' 2>/dev/null)
  vistos=$(printf '%s\n' "$linhas" | awk 'NF{print $1}' | sort -u | wc -l | tr -d ' ')
  pendentes=$(printf '%s\n' "$linhas" | grep -c ' pending$')
  echo "$(date +%T) obrigatórios vistos=$vistos/5 pendentes=$pendentes"
  [ "$vistos" -eq 5 ] && [ "$pendentes" -eq 0 ] && break
  [ $(( $(date +%s) - inicio )) -gt 5400 ] && { echo "TETO DE 90 MIN — parar e investigar (fila? job preso?)"; break; }
  sleep 60
done
printf '%s\n' "$linhas" | sort -u
gh pr checks convexy/logo-escuro -R victorrabyfs/DeskcommCRM --json name,bucket --jq '.[]|select((.name|startswith("e2e-parte")) or (.name|startswith("invariants-majors")))|"\(.name) \(.bucket)"'
```
Expected: `build-and-size pass`, `e2e pass`, `imagens-ok pass`, `invariants pass`, `verify pass`; as cinco `e2e-parte (N)` em `pass` — **nunca** `skipping` (o PR toca `app/`, `components/`, `lib/` e `supabase/`, que o `pr-alcanca-o-e2e.sh` mede); toda perna `invariants-majors (…)` em `pass`.

Se o laço bater no teto: **não** seguir — `gh run list -R victorrabyfs/DeskcommCRM --branch convexy/logo-escuro` (fila, job preso, aprovação pendente) e decidir com o Victor.

Se algum falhar, ler o motivo:
```bash
id=$(gh run list -R victorrabyfs/DeskcommCRM --branch convexy/logo-escuro --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId')   # ci.yml → verify/invariants; e2e.yml → e2e; perf.yml → build-and-size; publish-image.yml → imagens-ok
gh run view "$id" -R victorrabyfs/DeskcommCRM --log-failed | grep -aE "FAIL|✗|Error|error TS|expected" | head -40
```
- Erro de rede do Google Fonts no `next build` (`fonts.googleapis.com`, `fonts.gstatic.com`, `Failed to fetch`): **um** `gh run rerun "$id" -R victorrabyfs/DeskcommCRM --failed` e voltar ao laço.
- Qualquer outro vermelho: diagnosticar (superpowers:systematic-debugging) pelo log, corrigir **na branch** por subagente (só editar + commitar, com o motivo no commit), `git push`, voltar ao laço. Nunca desligar check.

- [ ] **Step 4: Data da seção e merge por merge commit**

```bash
git fetch -q origin && git diff --quiet HEAD origin/convexy/logo-escuro && echo "branch local = remota"
grep -n "^## \[1.47.0-cvx.2\] — $(date +%F)$" CHANGELOG.md || echo "DATA DA SEÇÃO DIFERENTE DE HOJE — corrigir, commitar, empurrar e voltar ao Step 3"
```
Expected: `branch local = remota`; a linha da seção com a data de hoje.

**Pedir confirmação explícita ao Victor para o merge** (mostrar os cinco obrigatórios, as cinco `e2e-parte` e as pernas `invariants-majors` em `pass`). Só com o "sim" dele:
```bash
gh pr merge convexy/logo-escuro -R victorrabyfs/DeskcommCRM --merge
gh pr view convexy/logo-escuro -R victorrabyfs/DeskcommCRM --json state,mergeCommit --jq '.state, .mergeCommit.oid'
```
Expected: `MERGED` e o sha do merge — **anotar o sha**.

- [ ] **Step 5: Tag e publicação**

```bash
git fetch origin main
test "$(gh pr view convexy/logo-escuro -R victorrabyfs/DeskcommCRM --json state --jq .state)" = MERGED || { echo "PR não está MERGED — não criar tag"; exit 1; }
merge=$(gh pr view convexy/logo-escuro -R victorrabyfs/DeskcommCRM --json mergeCommit --jq .mergeCommit.oid)
test "$(git rev-parse origin/main)" = "$merge" || { echo "origin/main ($(git rev-parse origin/main)) não é o merge do PR ($merge) — não criar tag"; exit 1; }
git tag -a v1.47.0-cvx.2 -m "Convexy 1.47.0-cvx.2 — logo escuro em /admin/marca" origin/main
git show --no-patch --format='%H %s' v1.47.0-cvx.2^{commit}
```
Expected: o commit da tag é o sha anotado no Step 4. **Pedir confirmação explícita ao Victor para empurrar a tag** (ela publica as imagens e move a `stable`). Só com o "sim" dele:
```bash
git push origin v1.47.0-cvx.2
until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow publish-image.yml --event push --limit 20 --json databaseId,headBranch --jq '[.[]|select(.headBranch=="v1.47.0-cvx.2")][0].databaseId // empty') && [ -n "$id" ]; do sleep 5; done
gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status
git ls-remote --tags origin
```
Expected: o `pre-push` local aceita (`vX.Y.Z-cvx.N`); o run termina verde (inclui `a-tag-veio-da-main` e `promover-stable`); `ls-remote` lista `v1.44.0`, `v1.44.0-cvx.1`, `-cvx.2`, `-cvx.3`, `v1.47.0-cvx.1`, `v1.47.0-cvx.2` (cada uma com `^{}`), e nenhuma outra tag do original.

Se o run da tag falhar: `gh run view "$id" -R victorrabyfs/DeskcommCRM --log-failed | grep -iE "fonts\.(googleapis|gstatic)\.com|Failed to fetch" | head -5`. Erro de fonte: **um** `gh run rerun "$id" -R victorrabyfs/DeskcommCRM --failed` e de novo `gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status`. Outro erro, ou falha de novo: parar e investigar com o Victor. **Nunca** apagar nem refazer a tag (a `stable` não anda enquanto `promover-stable` não passar).

- [ ] **Step 6: Conferir as imagens publicadas**

```bash
digest_de() { local i=$1 ref=$2 t; t=$(curl -s "https://ghcr.io/token?scope=repository:victorrabyfs/$i:pull&service=ghcr.io" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  curl -sI -H "Authorization: Bearer $t" -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.docker.distribution.manifest.v2+json" \
    "https://ghcr.io/v2/victorrabyfs/$i/manifests/$ref" | awk 'tolower($1)=="docker-content-digest:"{print $2} /^HTTP/{print $2}' | tr -d '\r' | paste -sd' ' -; }
for i in deskcommcrm deskcomm-worker deskcomm-scheduler deskcomm-voice-agent; do
  echo "$i tag=$(digest_de $i 1.47.0-cvx.2) stable=$(digest_de $i stable)"
done
```
Expected: em cada imagem, `tag` e `stable` com `200` e **o mesmo digest**.

---

### Task 9 [VPS]: Aplicar a `-cvx.2` pelo botão e conferir

**Files:** nenhum.

**Interfaces:**
- Consumes: Task 8 (tag e imagens públicas); VPS em `v1.47.0-cvx.1`.
- Produces: produção em `1.47.0-cvx.2`, coluna `logo_dark_path` no banco, logo escuro enviado e conferido nos dois temas.

- [ ] **Step 1: Confirmação e estado de partida**

Pedir confirmação ao Victor (a recriação dos contêineres derruba o app por alguns segundos — fora do pico das clínicas). Depois:
```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; git tag -l | tr "\n" " "; echo; git config --get versionsort.suffix || echo "versionsort.suffix vazio (ok)"; git config --get remote.origin.fetch; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300'
```
Expected: `v1.47.0-cvx.1`; tags só `v1.44.0`, `v1.44.0-cvx.*` e `v1.47.0-cvx.*`; `versionsort.suffix vazio (ok)`; `+refs/heads/main:refs/remotes/origin/main`; health com `"version":"1.47.0-cvx.1"`. Tag intrusa (qualquer `vA.B.C` sem `-cvx`, fora a `v1.44.0`): repetir a limpeza de `CONVEXY.md`, "Migrar uma VPS do original para o fork", passo 3, antes de seguir.

A coluna ainda **não** existe (antes/depois medido no banco, sem imprimir segredo — o `psql_run` do kit usa a connection string do `.env`, e só o resultado da consulta sai na tela):
```bash
ssh <host-ssh> 'bash -s' <<'EOF'
set -euo pipefail
cd /opt/deskcommcrm
source hostgator-setup-kit/_common.sh
enter_project
psql_run -tA -c "select 'COLUNA|' || data_type || '|' || is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'platform_branding' and column_name = 'logo_dark_path';" </dev/null
psql_run -tA -c "select 'REGRA|' || count(*) from pg_constraint where conname = 'platform_branding_logo_dark_path';" </dev/null
EOF
```
Expected: nenhuma linha `COLUNA|`; `REGRA|0`. (O `</dev/null` é obrigatório: o `psql_run` roda `docker run -i` e, sem ele, engoliria o resto do script lido pelo `bash -s`.)

- [ ] **Step 2: Atualizar pelo botão (Victor)**

Esperar até 5 min (ciclo do agente, `agent.sh:127`). Em `https://<dominio-de-producao>/app/settings/atualizacao` deve aparecer `1.47.0-cvx.2` com as notas "Logo para o tema escuro…". **Victor clica em "Atualizar".** Se não aparecer em 10 min: `git tag -l` na VPS e o manifesto `1.47.0-cvx.2` (Task 8 Step 6). Acompanhar até a versão nova responder (teto de 20 min):
```bash
ssh <host-ssh> 'for i in $(seq 1 60); do v=$(curl -s https://<dominio-de-producao>/api/v1/health | grep -o "\"version\":\"[^\"]*\""); echo "$(date +%T) $v"; case "$v" in *1.47.0-cvx.2*) break;; esac; sleep 20; done'
```

- [ ] **Step 3: Verificar versão, saúde, 307 e o banco**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; grep -E "^(APP|WORKER|SCHEDULER|VOICE_AGENT)_IMAGE=" .env; curl -s -o /dev/null -w "%{http_code}\n" https://<dominio-de-producao>/; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300; echo'
ssh <host-ssh> 'bash -s' <<'EOF'
set -euo pipefail
cd /opt/deskcommcrm
source hostgator-setup-kit/_common.sh
enter_project
psql_run -tA -c "select 'COLUNA|' || data_type || '|' || is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'platform_branding' and column_name = 'logo_dark_path';" </dev/null
psql_run -tA -c "select 'REGRA|' || count(*) from pg_constraint where conname = 'platform_branding_logo_dark_path';" </dev/null
psql_run -tA -c "select 'LINHA|' || (logo_path is not null) || '|' || (logo_dark_path is not null) from public.platform_branding where id = 1;" </dev/null
EOF
```
Expected: `v1.47.0-cvx.2`; as quatro `*_IMAGE` em `ghcr.io/victorrabyfs/…:1.47.0-cvx.2`; `307`; health com `"version":"1.47.0-cvx.2"` e dependências ok; `COLUNA|text|YES`; `REGRA|1`; `LINHA|true|false` (logo claro da etapa 1 gravado; escuro ainda não). Se a coluna faltar com a imagem nova no ar (Review Focus 1: a marca inteira cai no `.env`): parar e decidir com o Victor entre reaplicar o baseline (`update.sh --to v1.47.0-cvx.2 --force` no `tmux`) e o rollback do Step 6.

- [ ] **Step 4: O logo escuro (Victor)**

Victor exporta o logo escuro da identidade (o SVG logo-dark-v3) em **PNG**, altura ≥ 96 px, fundo transparente, ≤ 512 KB (a tela recusa SVG), abre `https://<dominio-de-producao>/admin/marca` e sobe o arquivo no campo **"Logo para o tema escuro"**. Esperado na tela: aviso "Logo atualizado."; a prévia "Como o logo aparece no tema escuro, sem moldura:" mostra o arquivo sobre o fundo escuro; o campo "Logo" de cima continua com o logo claro. Conferir no banco (mesmo `bash -s` do Step 3, só a consulta `LINHA|`): `LINHA|true|true`.

- [ ] **Step 5: Conferência em tela, claro e escuro — checklist do Victor + medida por ferramenta**

Com o Claude in Chrome, na sessão do Victor (ele aprova o uso do navegador e cada tela), recarregando sem cache. Para ver o `/login` no escuro: escolher o escuro dentro do `/app` (controle "Tema:" no menu do usuário) e sair — a escolha fica no navegador.

Em cada tela, medir pelo `javascript_tool`:
```js
JSON.stringify({
  url: location.pathname,
  largura: innerWidth,
  tema: document.documentElement.getAttribute("data-theme"),
  logos: [...document.querySelectorAll("aside img, [data-testid^='logo-da-fachada']")].map((el) => ({
    arquivo: (el.getAttribute("src") || "").split("/").pop(),
    visivel: el.offsetParent !== null,
    fundoDoPai: getComputedStyle(el.parentElement).backgroundColor,
  })),
})
```
Checklist (cada item com a medida gravada em `.superpowers/evidence/convexy-logo-escuro/vps-medidas.jsonl`, uma linha JSON por tela, e captura na mesma pasta: vps-barra-claro, vps-barra-escuro, vps-login-claro, vps-login-escuro, vps-admin-marca, vps-barra-escuro-390):
- [ ] `/app/inbox`, tema **claro**: exatamente um logo `visivel: true` — o claro —, `fundoDoPai` transparente (`rgba(0, 0, 0, 0)`).
- [ ] `/app/inbox`, tema **escuro**: exatamente um logo `visivel: true` — o escuro —, `fundoDoPai` **não** branco (nada de moldura).
- [ ] `/login`, tema claro: só o claro visível; tema escuro: só o escuro visível, sem moldura.
- [ ] Barra recolhida: a inicial "C" (inalterada).
- [ ] 390 px de largura, tema escuro: o logo escuro no lugar, sem transbordo (`document.documentElement.scrollWidth > document.documentElement.clientWidth` = `false`).
- [ ] `/admin/marca`: os dois campos, cada um com o seu arquivo.
- [ ] No olho do Victor: o logo escuro legível sobre o fundo `#0B0D10`/`#131923`.

Se a ferramenta só devolver a imagem na conversa, sem arquivo, registrar isso — a prova é a medida; a captura é complemento.

- [ ] **Step 6: Se algo estiver errado — regra de decisão e rollback**

Parar e perguntar ao Victor. **Só o logo escuro errado** (arte, contraste): **Remover** no campo "Logo para o tema escuro" — volta o claro com moldura, sem atualização. **Reverter só se algo ficou ilegível ou um fluxo quebrou** (entrar, atender, mover lead, agendar; ou a marca inteira sumiu). Rollback (só com a aprovação dele), conferindo antes que a sessão `tmux` não existe:
```bash
ssh -t <host-ssh> 'cd /opt/deskcommcrm && if tmux has-session -t rollback-logo-escuro 2>/dev/null; then echo "JÁ EXISTE: tmux attach -t rollback-logo-escuro"; else tmux new -s rollback-logo-escuro "bash hostgator-setup-kit/update.sh --to v1.47.0-cvx.1 --force 2>&1 | tee /root/update-$(date +%Y%m%d-%H%M)-rollback-logo-escuro.log; echo FIM; read"; fi'
```
Se o SSH cair: `ssh -t <host-ssh> 'tmux attach -t rollback-logo-escuro'`. Conferir:
```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300; echo; curl -s -o /dev/null -w "%{http_code}\n" https://<dominio-de-producao>/'
```
Esperado: `v1.47.0-cvx.1`; health `"version":"1.47.0-cvx.1"`; `307`; o tema escuro volta ao logo claro com moldura. A coluna `logo_dark_path` fica no banco, inofensiva (`--force` porque o alvo é ancestral do HEAD, `update.sh:107-114`). Depois disso o botão **volta a oferecer** a `-cvx.2` (não é ancestral do HEAD): **não clicar**; a correção sai como `v1.47.0-cvx.3`, e a marca das clínicas desligada (spec 7.4) desloca uma casa — atualizar a tabela de "Base e versões" do `CONVEXY.md`.

---

## Cobertura da spec (7.3)

| Requisito | Onde |
|---|---|
| 7.3 arquivos novos (migration 9001, `convexy-logo-escuro.test.tsx`, invariante) | Tasks 1, 4, 1 (+ três unitários por ambiente: Tasks 2, 3, 5 — desvio 5) |
| 7.3 tabela: `baseline.sql`, `MANIFEST.md`, `database.types.ts` à mão | Task 1 Steps 2–4 |
| 7.3 tabela: rota, `CampoDeLogo`, `page.tsx`/`_form.tsx` | Tasks 2 e 5 |
| 7.3 tabela: `instalacao.ts`, `resolve.ts`, `saida.ts`, `contexto.tsx`, `lib/branding.ts`, `app/layout.tsx` | Task 3 (`contexto.tsx` sem edição — desvio 8) |
| 7.3 tabela: `Sidebar.tsx`, `(public)/layout.tsx` | Task 4 |
| 7.3 tabela: `dicionario.ts` junto do bloco do logo | Task 5 Step 7 (com `es` — desvio 4) |
| 7.3 tabela: `CHANGELOG.md` | Task 7 Step 5 |
| 7.3.1 coluna, backfill, `drop if exists` + `add`, mesma regex, `comment on column`, `notify pgrst`; sem RLS/policy | Task 1 Steps 1–2 |
| 7.3.1 numeração 9001; colisão só por NNNN/timestamp repetido; regex dos guardas aceita | Task 1 (quem prova: `verify`) |
| 7.3.1 tripla: arquivo + bloco depois da 0158 (não no fim) + MANIFEST (`merge=union`) | Task 1 Steps 1–3; invariante "logo depois do da 0158" |
| 7.3.1 `update.sh` reaplica o baseline antes da imagem; `test-db.sh` aplica o baseline | Task 9 Steps 1 e 3 (antes/depois); Task 1 (`invariants`) |
| 7.3.1 conflito do baseline: lado do original + bloco reaplicado no lugar | Task 7 Step 2 (`CONVEXY.md`) |
| 7.3.1 invariante: válido grava, torto recusado, reaplicar limpa | Task 1 Step 5 |
| 7.3.2 `variante` enum, padrão `claro`, POST (form) e DELETE (query), `escuro` só na instalação | Task 2 Steps 1, 4, 5 |
| 7.3.2 `caminhoGravado`, `gravarCaminho` (`upsert` da coluna), auditoria com `fields_changed`, mesma validação e apagar-o-anterior | Task 2 Steps 2–3; teste da rota |
| 7.3.3 prop `variante` no POST e no DELETE; `id`/`data-campo-de-logo` com `-escuro`; `#logo-instalacao` único | Task 5 Steps 1–3; teste do campo |
| 7.3.3 restrições de forma (`Aparência escura` + `bg-white`; chip embrulha o `<img>`; sem `>`) | Task 4 (restrições) e Task 5 Step 4 |
| 7.3.3 `page.tsx` lê e repassa `logo_dark_path`; `_form.tsx` segundo campo "Logo para o tema escuro" | Task 5 Steps 5–6 |
| 7.3.4 `logoDarkUrl?` opcional em todos os tipos | Task 3 Steps 2–4 |
| 7.3.4 `COLUNAS` (tudo-ou-nada) e baseline antes da imagem | Task 3 Step 1; Review Focus 1; Task 9 |
| 7.3.4 só da camada do banco da instalação; organização/`.env` nunca trocados | Task 3 Step 3; teste de leitura |
| 7.3.4 barra lateral (`Branding`, contexto, `MarcaDosClientComponents`) e login (`MarcaDeSaida`); e-mail ignora | Task 3 Steps 2, 4, 5 |
| 7.3.5 moldura inteira `dark:hidden` + `<img>` irmão `hidden dark:block`; condição `!activeOrg?.marca?.logoUrl`; sem escuro nada muda; CSS sem divergência de hidratação | Task 4 Steps 1–2; teste do desenho |
| 7.3.6 unitário: `getAllByRole("img")`, classes, "logo da organização → sem segundo `<img>`", rota com variante no POST e no DELETE | Tasks 4 e 2 |
| 7.3.6 invariante; `test:db` verde | Task 1; Task 8 Step 3 (`invariants`) |
| 7.3.6 e2e: claro só no claro, escuro só no escuro, sem moldura, barra e login; `afterAll` limpa | Task 6 |
| 7.3.6 na VPS: enviar o logo escuro depois da atualização | Task 9 Step 4 |
| 7.3 rollback para a anterior (`--force`), coluna fica, botão reoferece | Task 7 Step 4; Task 9 Step 6 |
| 7.1 `CONVEXY.md` (trecho, local, motivo, reaplicar; desvios; docs que não valem); `e2e.yml` registrado | Tasks 6 e 7 |
| 7.1 suítes antes da tag (`test:db` obrigatório nesta versão), depois conferência em tela claro/escuro | Task 8 Step 3 (CI — execução sem recursos locais); Task 9 Step 5 |
| 5.3 versão com plano, seção no CHANGELOG, rollback e validação em produção | Tasks 7, 8, 9 |
| 8 cadência / 10 riscos (coluna ausente; numeração) | Review Focus 1 e 5; Task 1 |

## Pronto quando

- `/api/v1/health` responde `1.47.0-cvx.2`, aplicada **pelo botão**, e o domínio responde `307` (Task 9 Steps 2–3);
- o banco da VPS tem `logo_dark_path` (`COLUNA|text|YES`, `REGRA|1`) e, depois do envio, `LINHA|true|true` (Task 9 Steps 3–4);
- as quatro imagens `:1.47.0-cvx.2` publicadas e a `stable` com o mesmo digest de cada uma (Task 8 Step 6);
- CI do PR com os cinco obrigatórios, as cinco `e2e-parte` e todas as pernas `invariants-majors` em `pass`, nenhuma `skipping` (Task 8 Step 3);
- na VPS, medido por ferramenta: tema claro só com o logo claro, tema escuro só com o escuro e sem moldura, na barra lateral e no `/login` (Task 9 Step 5);
- `CONVEXY.md` registra cada arquivo do original alterado, os desvios, a linha da versão e o rollback; `git diff --name-only origin/main HEAD` da branch cabe inteiro no `CONVEXY.md` (Task 7 Step 6).
