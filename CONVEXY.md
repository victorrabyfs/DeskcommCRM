# CONVEXY.md — o que este fork muda no DeskcommCRM

Fork `victorrabyfs/DeskcommCRM` do `melgarafael/DeskcommCRM`. Desenho completo:
`docs/superpowers/specs/2026-09-22-identidade-convexy-design.md`.

Regra: configuração antes de código; código da Convexy em arquivos novos; alteração
em arquivo do original só quando não há outro caminho, pequena e **registrada aqui**,
com o trecho exato e como reaplicar num conflito de merge. Destino de toda mudança
(DoD 18): **instalação do fork**.

## Base e versões

- Base atual: `v1.44.0` do original (`refs/upstream-tags/v1.44.0` no clone).
- Versões: `v1.44.0-cvx.N`, tag anotada, criada só depois do merge, empurrada pelo nome.
  Nunca `--tags`/`--follow-tags`. Tag publicada nunca é refeita (corrigir = `N+1`).
- A única tag do original no fork é `v1.44.0`. Versões novas do original ficam em
  `refs/upstream-tags/` no clone: `git fetch --no-tags upstream refs/tags/vA.B.C:refs/upstream-tags/vA.B.C`.
- **Nunca empurrar tag `-rc`/`-alpha`/`-beta`**: `agent.sh:131` e `update.sh:63` escolhem
  `git tag -l 'v*' --sort=-v:refname | head -1` sem filtro, e o botão a ofereceria. O hook
  local `.git/hooks/pre-push` recusa tag fora de `vX.Y.Z-cvx.N` (recriar num clone novo:
  plano da etapa 2, Task 1 Step 3).
- CHANGELOG, do topo para baixo: `## [Não lançado]` › seções `-cvx` da base atual
  (mais nova primeiro) › seções do original › seções `-cvx` da base anterior › …
  Versão que exige passo manual traz `### ⚠️ Requer atenção`.

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
  a partir do fork escolhe a maior `-cvx.N`. Teste: `tests/unit/convexy-ultima-versao.test.ts`.

### Cabeçalho do CHANGELOG (etapa 2, `-cvx.1`)

- `tests/unit/release-chega-na-lp.test.ts`: `CABECALHO_VERSAO` passa a ser
  `CABECALHO_VERSAO_CONVEXY` (`tests/unit/_convexy-cabecalho.ts`), que aceita `-cvx.N`.
  Reaplicar: a linha da regex e o import.
- `CHANGELOG.md`: seções `-cvx` escritas à mão. Num merge do original, as seções dele entram
  **abaixo** das `-cvx` da base nova e acima das `-cvx` da base anterior (ordem acima).

## Desvios aceitos

- **DoD 17** — sem fragmento em `.changes/`: o CHANGELOG das versões `-cvx` é escrito à mão
  (o `release.yml`, que consome fragmentos, está desligado no fork).
- **DoD 15** — "bump não exige ação manual": a `-cvx.1` exige trocar o `origin` e limpar tags
  na VPS (procedimento abaixo). Só na transição do original para o fork.
- **DoD 16** — docs do original não são editados; o que não vale no fork está listado abaixo.
- **Rollback sem ensaio em VM** (decisão de 23/09): o procedimento abaixo foi conferido contra
  o código do kit, não executado.

## Afirmações de docs do original que não valem no fork

- Instruções de instalação (`README*.md`, `docs/deploy-*`, `docs/SETUP.md`,
  `hostgator-setup-kit/README.md`, `hostgator-setup-kit/CLAUDE.md`, skills `deskcomm-instalar`):
  clonam `melgarafael/DeskcommCRM`. No fork, clonar `victorrabyfs/DeskcommCRM`.
- `CLAUDE.md` (lista de checks e comandos `gh … melgarafael`): no fork, `-R victorrabyfs/DeskcommCRM`.

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

## Migrar uma VPS do original para o fork

Fora do expediente das clínicas. Tudo de `/opt/deskcommcrm`.

1. Pré-voo (parada obrigatória): as quatro imagens da versão-alvo respondem 200 anônimo no
   GHCR; VPS na base exata (`git describe --tags --exact-match HEAD`); `versionsort.suffix`
   vazio; nenhuma atualização pedida em `/app/settings/atualizacao`. Script: plano da etapa 2,
   Task 9 Step 2.
2. `cp -p .env ".env.bak-$(date +%Y%m%d)"`.
3. Numa linha só:
   `git remote set-url origin https://github.com/victorrabyfs/DeskcommCRM.git && git tag -l > /root/tags-antes.txt && git tag -l | xargs -r git tag -d >/dev/null && git fetch --tags origin && git tag -l`
   — só podem sobrar `v1.44.0` e `v1.44.0-cvx.*`.
4. Guarda e atualização, dentro do `tmux`:
   `[ -z "$(git tag -l | grep -vE '^v1\.44\.0(-cvx\.[0-9]+)?$')" ] || { echo "tag intrusa"; exit 1; }; bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.1`
5. Conferir: `describe` = `v1.44.0-cvx.1`; as quatro `*_IMAGE` do `.env` em `ghcr.io/victorrabyfs`; health `1.44.0-cvx.1`; domínio `307`.

Saída real da migração da `<dominio-de-producao>`: (acrescentada na Task 9).

## Rollback para o original

Só enquanto a base é a `v1.44.0` e antes da etapa 3. Não ensaiado (ver "Desvios").
```bash
cd /opt/deskcommcrm && git remote set-url origin https://github.com/melgarafael/DeskcommCRM.git \
  && git tag -l | xargs -r git tag -d >/dev/null && git fetch --tags origin \
  && bash hostgator-setup-kit/update.sh --to v1.44.0 --force
```
Volta código, `_common.sh` da v1.44.0, imagens `ghcr.io/melgarafael/*:1.44.0` no `.env` e o
agente. Depois disso a tela oferece a última versão **do original** — não clicar achando que é
o fork. O banco não volta (a etapa 2 não tem migration).
