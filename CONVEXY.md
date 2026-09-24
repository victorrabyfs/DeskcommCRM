# CONVEXY.md — o que este fork muda no DeskcommCRM

Fork `victorrabyfs/DeskcommCRM` do `melgarafael/DeskcommCRM`. Desenho completo:
`docs/superpowers/specs/2026-09-22-identidade-convexy-design.md`.

Regra: configuração antes de código; código da Convexy em arquivos novos; alteração
em arquivo do original só quando não há outro caminho, pequena e **registrada aqui**,
com o trecho exato e como reaplicar num conflito de merge. Destino de toda mudança
(DoD 18): **instalação do fork**.

## Base e versões

- Base atual: `v1.47.0` do original (`refs/upstream-tags/v1.47.0` no clone), trazida em 2026-09-24
  (1.45.0 → 1.47.0: 179 commits, 7 migrations, conflito só em `CHANGELOG.md`). Base anterior: `v1.44.0`.
- Versões: `vX.Y.Z-cvx.N` sobre a base atual (hoje `v1.47.0-cvx.N`), tag anotada, criada só depois do merge, empurrada pelo nome.
  Nunca `--tags`/`--follow-tags`. Tag publicada nunca é refeita (corrigir = `N+1`).
- A única tag do original no fork é `v1.44.0`. Versões novas do original ficam em
  `refs/upstream-tags/` no clone: `git fetch --no-tags upstream refs/tags/vA.B.C:refs/upstream-tags/vA.B.C`.
- **Nunca empurrar tag `-rc`/`-alpha`/`-beta`**: `agent.sh:131` e `update.sh:63` escolhem
  `git tag -l 'v*' --sort=-v:refname | head -1` sem filtro, e o botão a ofereceria. O hook
  local `.git/hooks/pre-push` recusa tag fora de `vX.Y.Z-cvx.N` (recriar num clone novo:
  plano da etapa 2, Task 1 Step 3).
- CHANGELOG, do topo para baixo: `## [Não lançado]` › seções `-cvx` da base atual
  (mais nova primeiro) › seções do original **trazidas no merge** › seções `-cvx` da base
  anterior › `## [base anterior]` … Exemplo concreto:
  `[Não lançado] › [1.45.0-cvx.1] › [1.45.0] › [1.44.1] › [1.44.0-cvx.2] › [1.44.0-cvx.1] › [1.44.0] › …`
  Versão que exige passo manual traz `### ⚠️ Requer atenção`.

| Conteúdo | Versão |
|---|---|
| Fork só com infraestrutura (namespace das imagens, filtro de versão do kit, cabeçalho do CHANGELOG) | `v1.44.0-cvx.1` |
| Prova do botão "Atualizar" pelo fork, sem mudança na tela | `v1.44.0-cvx.2` |
| Paleta, fontes e barra do navegador (spec 7.2) | `v1.44.0-cvx.3` |
| Atualização para a base 1.47.0 do original (sem mudança da Convexy) | `v1.47.0-cvx.1` |

Versão revertida não é reaproveitada: a correção sai na `-cvx.N` seguinte e o conteúdo que
vinha depois (logo escuro, spec 7.3; marca das clínicas desligada, spec 7.4) desloca uma casa.
Acrescentar uma linha a cada versão publicada.

## Alterações em arquivos do original

### Namespace das imagens (etapa 2, `-cvx.1`)

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `tests/unit/_identidade-deste-repo.ts` | `NAMESPACE_DESTE_REPO = "ghcr.io/victorrabyfs"` | manter o nosso valor |
| `hostgator-setup-kit/_common.sh` | `IMG_NS="ghcr.io/victorrabyfs"`; `local url="${1:-https://github.com/victorrabyfs/DeskcommCRM.git}" ref` | manter o nosso valor |
| `docker-compose.prod.yml` | `image: ${APP_IMAGE:-ghcr.io/victorrabyfs/deskcommcrm:stable}` e o mesmo em `WORKER_IMAGE`, `SCHEDULER_IMAGE`, `VOICE_AGENT_IMAGE` | trocar o dono nas quatro linhas |
| `.env.hostgator.example` | `APP_IMAGE`, `WORKER_IMAGE`, `SCHEDULER_IMAGE` em `ghcr.io/victorrabyfs` | trocar o dono |
| `hostgator-setup-kit/install.sh`, `comecar.sh` | `REPO_URL="${REPO_URL:-https://github.com/victorrabyfs/DeskcommCRM.git}"`; `curl` do comentário de uso em `comecar.sh` | trocar o dono |
| `Dockerfile`, `Dockerfile.worker`, `Dockerfile.scheduler`, `Dockerfile.voice-agent` | `org.opencontainers.image.source="https://github.com/victorrabyfs/DeskcommCRM"` | trocar o dono |

Conferência depois de um merge: `pnpm vitest run tests/unit/namespace-das-imagens.test.ts`.

### Filtro de versão do kit (etapa 2, `-cvx.1`)

- `hostgator-setup-kit/_common.sh`, `ultima_versao_publicada`: `grep -v -- '-'` →
  `grep -E -- '^refs/tags/v[0-9]+\.[0-9]+\.[0-9]+(-cvx\.[0-9]+)?$'`. Motivo: instalação nova
  a partir do fork escolhe a maior `-cvx.N`. **Reaplicar o bloco inteiro num conflito de
  merge** — o comentário `# Convexy: aceita SÓ …` acima da linha explica o porquê do filtro
  para quem editar depois; reaplicar só a linha do `grep` deixa a explicação de fora e some no
  próximo merge. Teste: `tests/unit/convexy-ultima-versao.test.ts`.

### Cabeçalho do CHANGELOG (etapa 2, `-cvx.1`)

- `tests/unit/release-chega-na-lp.test.ts`: `CABECALHO_VERSAO` passa a ser
  `CABECALHO_VERSAO_CONVEXY` (`tests/unit/_convexy-cabecalho.ts`), que aceita `-cvx.N`.
  Reaplicar: a linha da regex e o import.
- `CHANGELOG.md`: seções `-cvx` escritas à mão. Num merge do original, as seções **trazidas
  no merge** entram **abaixo** das `-cvx` da base nova e **acima** das `-cvx` da base anterior
  (ordem acima).

### Paleta, fontes e barra do navegador (etapa 3, `-cvx.3`)

Arquivos novos (código da Convexy — não conflitam num merge): `app/convexy/tema.css`,
`lib/convexy/barra-do-navegador.ts`, `tests/unit/_convexy-tema.ts`,
`tests/unit/convexy-tema-cobre-os-tokens.test.ts`, `tests/unit/convexy-tema-contraste.test.ts`,
`tests/e2e/convexy-identidade.spec.ts`. O `app/globals.css` **não** é editado: o `tema.css`
vence os blocos de token do original com seletor de atributo dobrado (0,2,0), fora de camada,
em qualquer ordem de carga.

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `app/layout.tsx` | `import { IBM_Plex_Mono, Inter, Lexend_Deca } from "next/font/google";` | manter o nosso import |
| `app/layout.tsx` | `import "./convexy/tema.css";` (com o comentário `// Convexy: …`) **logo depois** de `import "./globals.css";` | manter depois do `globals.css` |
| `app/layout.tsx` | `const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-atkinson" })` e `const lexend = Lexend_Deca({ …, variable: "--font-lexend" })` no lugar de `const atkinson = Atkinson_Hyperlegible(…)` | manter o nome `--font-atkinson` (o `globals.css` o lê) |
| `app/layout.tsx` | ``className={`${inter.variable} ${lexend.variable} ${plexMono.variable}`}`` no `<html>` | idem |
| `app/layout.tsx` | `import { coresDaBarraConvexy } from "@/lib/convexy/barra-do-navegador";` (sai o import de `coresDaBarraDoNavegador`) e `themeColor: coresDaBarraConvexy(),` no `viewport`, com o comentário `Convexy:` acima | manter o nosso `viewport` |
| `tests/e2e/aviso-de-caso-no-whatsapp.spec.ts:280`, `tests/e2e/conversa-do-caso.spec.ts:340`, `tests/e2e/passagem-com-contexto.spec.ts:261` | `toMatch(/Inter/i)` no lugar de `toMatch(/Atkinson/i)` | trocar de novo se o original mexer na linha |
| `.github/workflows/e2e.yml` | linha `convexy-identidade.spec.ts` em `SPECS_PARTE_1`, logo depois de `icone-da-marca.spec.ts` | reaplicar a linha dentro do bloco `>-`, **sem comentário** no bloco |
| `CHANGELOG.md` | `## [1.44.0-cvx.3]` | ordem de "Base e versões" |

Conferência depois de um merge do original:
`pnpm vitest run tests/unit/convexy-tema-cobre-os-tokens.test.ts tests/unit/convexy-tema-contraste.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/branding-barra-do-navegador.test.ts tests/unit/e2e-cobertura-completa.test.ts`.
`convexy-tema-cobre-os-tokens` reprova quando o original renomeia ou cria token nos blocos
`[data-theme]` do `globals.css`: decidir o valor Convexy e acrescentá-lo ao `tema.css`.

## Desvios aceitos

- **DoD 17** — sem fragmento em `.changes/`: o CHANGELOG das versões `-cvx` é escrito à mão
  (o `release.yml`, que consome fragmentos, está desligado no fork).
- **DoD 15** — "bump não exige ação manual": a `-cvx.1` exige trocar o `origin` e limpar tags
  na VPS (procedimento abaixo). Só na transição do original para o fork.
- **DoD 16** — docs do original não são editados; o que não vale no fork está listado abaixo.
- **Rollback sem ensaio em VM** (decisão de 23/09): o procedimento abaixo foi conferido contra
  o código do kit, não executado.
- **Paleta (`-cvx.3`)** — popover igual ao cartão (`#131923` no escuro, e não `#171E2A` do
  CRM antigo: os aliases estão fixados em `globals.css:529-532`); campo no escuro igual ao
  fundo (`#0B0D10`, e não `#111720`). Ficam na paleta do original, aceitas: o nome do produto
  sem logo (`components/branding/MarcaDoProduto.tsx:30-31`, `CORES_DA_MARCA` em `lib/branding/desenho.ts:100`);
  `--color-accent-fg` escuro `#161510` (só vale sem cor de marca — aqui há); as prévias do
  `CampoDeLogo` e o fundo dos e-mails (leem `REGUA_DO_PRODUTO`, que não muda —
  `lib/branding/regua-do-produto.ts` é gerado do `globals.css`); o showcase `app/design/`.
- **Fontes (`-cvx.3`)** — Lexend Deca só em `h1–h3`: `CardTitle` é `<div>` e números de
  destaque ficam na Inter (exigiria classe em componente do original). `display: "swap"` nas
  duas fontes, como a Atkinson do original. Só o subconjunto `latin` (a spec manda assim; a
  Atkinson do original tinha também `latin-ext`): caractere fora do Latin-1 cai na fonte de
  reserva. `app/convexy/tema.css` declara `@layer properties, theme, base, components, utilities;`
  (a spec escreve sem `properties`; o Tailwind 4.3 publica essa camada primeiro).
- **Testes da `-cvx.3`** — nenhuma suíte rodou na máquina local (plano, Revisão 3): a spec
  nova e as specs afetadas (as três com `/Inter/i`, `icone-da-marca`,
  `logo-moldura-no-tema-escuro`, `agenda-kit-visual`) têm como prova o check `e2e` do PR
  (cinco partes em `pass`); typecheck, lint, unitários e shell, os checks `verify` e
  `build-and-size`; o layout, a medição na VPS depois da aplicação. `pnpm test:db` não é
  exigido (sem schema).
- **DoD 13 na `-cvx.3`** — Living System Checklist e `docs/testing/user-journey-map.md` não
  atualizados: mudança só de aparência (sem dado, rota, log, worker ou jornada nova).

## Afirmações de docs do original que não valem no fork

- Instruções de instalação (`README*.md`, `docs/deploy-*`, `docs/SETUP.md`,
  `hostgator-setup-kit/README.md`, `hostgator-setup-kit/CLAUDE.md`, skills `deskcomm-instalar`):
  clonam `melgarafael/DeskcommCRM`. No fork, clonar `victorrabyfs/DeskcommCRM`.
- `CLAUDE.md` (lista de checks e comandos `gh … melgarafael`): no fork, `-R victorrabyfs/DeskcommCRM`.
- `docs/white-label.md:80` ("a fonte é a Atkinson Hyperlegible"), `docs/brand/README.md:73`,
  `docs/design-system/00-overview.md:24,41` e `docs/design-system/03-typography.md`: no fork o
  texto é Inter e os títulos `h1–h3` são Lexend Deca (`-cvx.3`).
- `docs/white-label.md:81` ("o fundo é o mesmo em toda marca, e é por isso que a cor da barra do
  navegador também é") e o cabeçalho de `lib/branding/barra-do-navegador.ts` (`#faf9f6` /
  `#161510` são a cor da barra): no fork o fundo é `#F8FAFC`/`#0B0D10` e a barra vem de
  `lib/convexy/barra-do-navegador.ts`.

## Fica apontando para o original, de propósito

Fora da cadeia de atualização da VPS. Gerado no corte da `-cvx.1` com
`git grep -ln melgarafael -- . ':!*.md'`, por categoria:

- **Workflows (guardas e comentários — só agem no original):**

```
.github/ISSUE_TEMPLATE/bug_report.yml
.github/ISSUE_TEMPLATE/config.yml
.github/workflows/acolhida.yml
.github/workflows/e2e.yml
.github/workflows/release.yml
```

- **Testes-guarda (conferem o original ou citam em prosa):**

```
lib/campanhas/teto-diario-no-fuso-do-cliente.test.ts
lib/system/changelog.test.ts
tests/shell/deskcomm-contribuir.test.sh
tests/unit/acolhida-nao-toca-no-fork.test.ts
tests/unit/documentacao-aponta-para-o-que-existe.test.ts
tests/unit/executor-proprio-so-roda-o-que-e-nosso.test.ts
tests/unit/gatilho-dos-jobs-de-entrega.test.ts
tests/unit/guarda-da-release-confere-identidade.test.ts
tests/unit/guarda-da-release-reconhece-o-corte.test.ts
tests/unit/namespace-das-imagens-runtime-owner.test.ts
tests/unit/namespace-das-imagens.test.ts
tests/unit/release-chega-na-lp.test.ts
```

- **Evidência, triagem e fixtures (registro histórico):**

```
evidence/lp-guias-changelog/2026-09-15/prova.mjs
evidence/skills-embutidas/2026-09-10/antigravity.json
triagem/instrumentos/promessas.py
triagem/instrumentos/sonda.py
triagem/instrumentos/tests/fixtures/promessas-reais.json
triagem/instrumentos/tests/fixtures/sonda-1122-action-required.json
triagem/instrumentos/tests/fixtures/sonda-1170-verify-teto.json
triagem/instrumentos/tests/fixtures/sonda-reais.json
```

- **Dados das extensões oficiais (`repository` — elas são do original):**

```
extensoes/catalogo.json
extensoes/loja.json
```

- **Scripts fora da cadeia de atualização:**

```
.agents/skills/deskcomm-contribuir/scripts/pre-voo.sh
.agents/skills/deskcomm-contribuir/scripts/quem-sou.sh
.claude/skills/deskcomm-contribuir/scripts/pre-voo.sh
.claude/skills/deskcomm-contribuir/scripts/quem-sou.sh
hostgator-setup-kit/diagnostico.sh
infra/executor-proprio/instalar.sh
infra/executor-proprio/so-o-que-e-nosso.sh
infra/executor-proprio/vaga.sh
scripts/cortar-release.ts
scripts/instalar-guias.sh
scripts/vigia-colisao-de-migration.ts
ubuntu-local-installer.sh
```

- **Outros:**

```
.mailmap — identidades de contribuidores do original
docs/growth/awesome-selfhosted-deskcommcrm.yml — listagem aponta o source_code_url pro repositório original
hostgator-setup-kit/_common.sh — só comentários históricos
public/llms.txt — texto público do produto original
```

- Todos os `.md` e `docs/`.

## Configuração do fork no GitHub

- Workflows ligados: `ci.yml`, `e2e.yml`, `perf.yml`, `publish-image.yml`. Desligados:
  `acolhida.yml`, `release.yml`, `relogio.yml`, `vigia-de-colisao.yml`. **Workflow novo trazido
  por merge entra ligado**: conferir com
  `gh workflow list --all -R victorrabyfs/DeskcommCRM --json path,state --jq '.[]|[.path,.state]|@tsv'`.
- Ruleset `tags-de-versao` (`refs/tags/v*`: criação, atualização e remoção; bypass do Admin).
- `main` protegida: `verify`, `invariants`, `build-and-size`, `e2e`, `imagens-ok`; só merge commit.
- Pacotes GHCR públicos: `deskcommcrm`, `deskcomm-worker`, `deskcomm-scheduler`, `deskcomm-voice-agent`.
  Têm de ser públicos: o agente e o `update.sh` consultam e baixam do GHCR sem login.
- **Medido em 23/09: desligar o `publish-image` não impede a publicação.** O push da tag
  `v1.44.0` (com o workflow em `disabled_manually`) disparou o `publish-image`, a guarda
  `a-tag-veio-da-main` passou, e o fork publicou `victorrabyfs/*:1.44.0` e `:1.44` (código puro
  do original) e moveu `stable` para elas por ~1 h, até a `-cvx.1` movê-lo de volta. Sem dano
  (nenhuma VPS lia o `stable` do fork), e as imagens `1.44.0`/`1.44` ficaram (inofensivas: o
  botão escolhe a maior tag do git). A proteção real é **nunca empurrar tag do original** —
  o hook `pre-push` recusa, e só `--no-verify` passa.

## Migrar uma VPS do original para o fork

Fora do expediente das clínicas. Tudo de `/opt/deskcommcrm`.

1. Pré-voo (parada obrigatória): as quatro imagens da versão-alvo respondem 200 anônimo no
   GHCR; VPS na base exata (`git describe --tags --exact-match HEAD`); `versionsort.suffix`
   vazio; nenhuma atualização pedida em `/app/settings/atualizacao`. Script: plano da etapa 2,
   Task 9 Step 2.
2. `cp -p .env ".env.bak-$(date +%Y%m%d)"`.
3. Numa linha só:
   `git remote set-url origin https://github.com/victorrabyfs/DeskcommCRM.git && git config remote.origin.fetch "+refs/heads/main:refs/remotes/origin/main" && git tag -l > /root/tags-antes-$(date +%Y%m%d).txt && git tag -l | xargs -r git tag -d >/dev/null && git fetch --tags origin && git tag -l`
   — só podem sobrar `v1.44.0` e `v1.44.0-cvx.*`. O `git config remote.origin.fetch` é
   obrigatório: VPS instalada pelo kit com `git clone --branch vX.Y.Z` fica com o fetch preso
   àquela tag (`+refs/tags/vX.Y.Z:refs/tags/vX.Y.Z`); se a tag não existe no fork, o
   `git fetch --tags` falha com `couldn't find remote ref` e a VPS fica **sem nenhuma tag**
   (medido na migração de 23/09 — ver abaixo).
4. Guarda e atualização, dentro do `tmux` (script `/tmp/migra.sh` do plano da etapa 2, Task 9
   Step 5 — não numa linha só num pane interativo, senão a mensagem de "tag intrusa" some
   junto com o pane ao fechar):
   ```bash
   if [ -n "$(git tag -l | grep -vE '^v1\.44\.0(-cvx\.[0-9]+)?$')" ]; then
     echo "TAG INTRUSA — repetir o passo 3"
   else
     bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.1 2>&1 | tee "/root/update-$(date +%Y%m%d-%H%M)-cvx1.log"
   fi
   ```
5. Conferir: `describe` = `v1.44.0-cvx.1`; as quatro `*_IMAGE` do `.env` em `ghcr.io/victorrabyfs`; health `1.44.0-cvx.1`; domínio `307`.

Saída real da migração da `<dominio-de-producao>` (2026-09-23, 16:46 UTC):

- Pré-voo: as quatro imagens `1.44.0-cvx.1` com `200`; VPS em `v1.44.0` exata; `OK`. Lock do
  agente livre, nenhum `update.sh` rodando.
- Passo 3, primeira tentativa (sem o `git config remote.origin.fetch`):
  ```
  fatal: couldn't find remote ref refs/tags/v1.42.0
  --- tags:
  (nenhuma)
  ```
  `remote.origin.fetch` era `+refs/tags/v1.42.0:refs/tags/v1.42.0` (instalação original com
  `--branch v1.42.0`). Corrigido para `+refs/heads/main:refs/remotes/origin/main`; o fetch
  seguinte trouxe `v1.44.0` e `v1.44.0-cvx.1`.
- Passo 4 (`tmux` destacado, log em `/root/update-20260923-1646-cvx1.log`): `UPDATE_EXIT=0`,
  "Atualização concluída — app no ar e saudável", nenhuma imagem construída na VPS.
- Passo 5:
  ```
  v1.44.0-cvx.1
  APP_IMAGE=ghcr.io/victorrabyfs/deskcommcrm:1.44.0-cvx.1
  WORKER_IMAGE=ghcr.io/victorrabyfs/deskcomm-worker:1.44.0-cvx.1
  SCHEDULER_IMAGE=ghcr.io/victorrabyfs/deskcomm-scheduler:1.44.0-cvx.1
  VOICE_AGENT_IMAGE=ghcr.io/victorrabyfs/deskcomm-voice-agent:1.44.0-cvx.1
  tags: v1.44.0 v1.44.0-cvx.1
  domínio: 307
  health: {"status":"healthy","version":"1.44.0-cvx.1", supabase/redis/waha ok}
  ```

## Rollback para o original

Só enquanto a base é a `v1.44.0` e antes da etapa 3. Não ensaiado (ver "Desvios"). Como na
migração (acima), dentro do `tmux`, com log:
```bash
cd /opt/deskcommcrm && git remote set-url origin https://github.com/melgarafael/DeskcommCRM.git \
  && git tag -l | xargs -r git tag -d >/dev/null && git fetch --tags origin \
  && tmux new -s rollback "bash hostgator-setup-kit/update.sh --to v1.44.0 --force 2>&1 | tee /root/update-$(date +%Y%m%d-%H%M)-rollback.log; echo FIM; read"
```
Volta código, `_common.sh` da v1.44.0, imagens `ghcr.io/melgarafael/*:1.44.0` no `.env` e o
agente. Depois disso a tela oferece a última versão **do original** — não clicar achando que é
o fork. O banco não volta (a etapa 2 não tem migration).

## Rollback de uma versão da etapa 3

**Quando reverter:** só se algo ficou **ilegível** ou um **fluxo quebrou** (não dá para
entrar, atender, mover lead, agendar). Defeito cosmético (um corte de título, um tom) não
reverte: corrige para a frente, na `-cvx.N` seguinte.

Para a `-cvx` anterior, dentro do `tmux`, com log (exemplo: da `-cvx.3` para a `-cvx.2`).
Antes, conferir que não há sessão com o mesmo nome:
```bash
cd /opt/deskcommcrm && tmux has-session -t rollback-cvx3 2>/dev/null && echo "JÁ EXISTE: tmux attach -t rollback-cvx3 (não criar outra)" \
  || tmux new -s rollback-cvx3 "bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.2 --force 2>&1 | tee /root/update-$(date +%Y%m%d-%H%M)-rollback-cvx3.log; echo FIM; read"
```
`--force` porque o alvo é ancestral do HEAD (`update.sh:107-114`). Conferir depois:
```bash
cd /opt/deskcommcrm && git describe --tags --exact-match HEAD \
  && curl -s https://<dominio-de-producao>/api/v1/health | head -c 300; echo \
  && curl -s -o /dev/null -w "%{http_code}\n" https://<dominio-de-producao>/ \
  && curl -s https://<dominio-de-producao>/login | grep -oiE "<meta name=\"theme-color\"[^>]*>"
```
Esperado: `v1.44.0-cvx.2`; health com `1.44.0-cvx.2`; `307`; a `theme-color` de volta à do
original — `#faf9f6` (claro) e `#161510` (escuro), os `--color-bg` da régua
(`lib/branding/regua-do-produto.ts:45` e `:186`).

Depois disso o botão "Atualizar" **volta a oferecer** a versão revertida (ela não é ancestral
do HEAD — `agent.sh:161-164`): **não clicar**; corrigir com a `-cvx` seguinte (e o conteúdo
que vinha depois desloca uma casa — "Base e versões"). A `-cvx.3` não tem banco nem `.env`:
o rollback é só código e imagens.
