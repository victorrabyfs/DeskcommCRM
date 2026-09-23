# Convexy — passo 0 e etapa 2 (fork só com infraestrutura) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pôr a produção na `v1.44.0` do original, montar o fork `victorrabyfs/DeskcommCRM` como fonte das atualizações (imagens próprias no GHCR, versões `v1.44.0-cvx.N`) e migrar a VPS para ele, provando o botão "Atualizar" com uma `-cvx.2` — sem nenhuma mudança visual.

**Architecture:** O código do produto não muda. Muda o namespace das imagens no kit (`IMG_NS` e as cópias conferidas pelo teste de namespace), o filtro de versão do kit (aceitar `-cvx.N`), a régua do cabeçalho do CHANGELOG e a configuração do fork no GitHub (tags, workflows, proteção). A VPS troca o `origin` para o fork, apaga as tags do original e sobe `-cvx.1` à mão; a `-cvx.2` chega pelo botão.

**Tech Stack:** git 2.53, GitHub (`gh` CLI, Actions, GHCR, rulesets), bash (kit `hostgator-setup-kit/`), Vitest, pnpm 9.15.9, Node 22, Docker Compose na VPS (Traefik do Easypanel).

**Spec:** `docs/superpowers/specs/2026-09-22-identidade-convexy-design.md` — seções 5.0, 5.2 e 6 (revisão 4, aprovada em 2026-09-23).

## Global Constraints

- Repositório do fork: `victorrabyfs/DeskcommCRM`; original: `melgarafael/DeskcommCRM` (remoto `upstream`). **Nunca abrir PR no original**: todo `gh` leva `-R victorrabyfs/DeskcommCRM`.
- Base: `v1.44.0` (objeto de tag `39b62486f3891eb0f222fe4638705851ddb50049`, commit `7dbbf87`), disponível no clone como `refs/upstream-tags/v1.44.0`.
- Namespace das imagens: `ghcr.io/victorrabyfs`. Imagens: `deskcommcrm`, `deskcomm-worker`, `deskcomm-scheduler`, `deskcomm-voice-agent` — todas **públicas**.
- Versões: `v1.44.0-cvx.N`, tag anotada, criada à mão depois do merge na `main`, empurrada **pelo nome**. Nunca `git push --tags` nem `--follow-tags`. Tag publicada nunca é refeita (corrigir = `N+1`).
- Nenhuma tag do original em `refs/tags/` do clone, exceto `v1.44.0` (empurrada ao fork uma única vez, com Actions desligadas).
- Merge de PR no fork **só por merge commit**; proteção da `main` sem "Require linear history".
- Toda tag Convexy tem `## [1.44.0-cvx.N] — AAAA-MM-DD` no `CHANGELOG.md`, logo abaixo de `## [Não lançado]` e acima das seções do original.
- Comandos na VPS: sempre de `/opt/deskcommcrm`; compose sempre com os dois arquivos (`-f docker-compose.prod.yml -f docker-compose.traefik.yml`), o que o kit já faz quando `REVERSE_PROXY=traefik`.
- Não mexer nos serviços do Easypanel.
- Tarefas marcadas **[VPS]** ou **[GitHub]** mexem em produção ou em configuração externa: cada uma exige confirmação explícita do Victor antes de rodar.
- Suítes antes de cada tag: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:shell`, `pnpm test:e2e` (o `e2e` também roda no CI do PR).

## Review Focus

1. **Tag do original reaparecendo** (no clone ou na VPS, por `fetch`, por um ciclo do agente em andamento, por `--follow-tags`) → o botão deve continuar oferecendo só `-cvx`; toda tarefa que mexe em tag termina conferindo `git tag -l` / `git ls-remote --tags origin`.
2. **Pacote GHCR privado ou ausente na hora da migração** → o operador deve parar antes do `update.sh`; o pré-voo da Task 9 é um script que sai com código ≠ 0 e a Task 9 só segue com saída "OK".
3. **Workflow do original disparando no fork** (`release.yml` ao ligar as Actions, `publish-image` na tag `v1.44.0`) → nada é publicado com o código sem identidade; Task 2 confere o estado dos workflows antes de cada push.
4. **Instalação nova a partir do fork** pegando a versão sem hífen → `ultima_versao_publicada` deve devolver a maior `-cvx.N`, ignorando `-rc`/`-alpha`/`-beta`; teste na Task 5.
5. **CHANGELOG com seção `-cvx`** → `release-chega-na-lp.test.ts` deve aceitar `## [1.44.0-cvx.N] — data` e continuar recusando cabeçalho torto; teste na Task 6.

---

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `tests/unit/_identidade-deste-repo.ts` | Modificar | Âncora do namespace do repositório (`NAMESPACE_DESTE_REPO`) |
| `hostgator-setup-kit/_common.sh` | Modificar | `IMG_NS`, URL padrão e filtro de `ultima_versao_publicada` |
| `docker-compose.prod.yml` | Modificar | `image:` padrão das quatro imagens |
| `.env.hostgator.example` | Modificar | `APP_IMAGE`, `WORKER_IMAGE`, `SCHEDULER_IMAGE` |
| `hostgator-setup-kit/install.sh`, `hostgator-setup-kit/comecar.sh` | Modificar | `REPO_URL` padrão (e o `curl` do comentário em `comecar.sh`) |
| `Dockerfile`, `Dockerfile.worker`, `Dockerfile.scheduler`, `Dockerfile.voice-agent` | Modificar | Label `org.opencontainers.image.source` |
| `tests/unit/convexy-ultima-versao.test.ts` | Criar | Prova que o kit escolhe a maior `-cvx.N` |
| `tests/unit/release-chega-na-lp.test.ts` | Modificar | Regex do cabeçalho aceita `-cvx.N` |
| `tests/unit/convexy-cabecalho-cvx.test.ts` | Criar | Prova da regex nova (aceita `-cvx`, recusa torto) |
| `CHANGELOG.md` | Modificar | Seções `1.44.0-cvx.1` e `1.44.0-cvx.2` |
| `CONVEXY.md` | Criar | Registro de toda alteração em arquivo do original |

---

### Task 0 [VPS]: Passo 0 — produção na `v1.44.0`

**Files:** nenhum (operação na VPS `<host-ssh>`, pasta `/opt/deskcommcrm`).

**Interfaces:**
- Consumes: —
- Produces: VPS em `v1.44.0` exata; regra "ninguém clica em Atualizar" em vigor até a Task 9.

- [ ] **Step 1: Pedir confirmação ao Victor** para atualizar a produção (janela fora do expediente das clínicas) e avisar quem usa a tela `/app/settings/atualizacao` para **não clicar em "Atualizar"** até a migração.

- [ ] **Step 2: Conferir o estado atual**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300; echo; git config --get versionsort.suffix || echo "versionsort.suffix vazio (ok)"'
```
Expected: `v1.43.0`; health com `"version":"1.43.0"`; `versionsort.suffix vazio (ok)`.

- [ ] **Step 3: Atualizar para a base, pelo `update.sh` (não pelo botão)**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && bash hostgator-setup-kit/update.sh --to v1.44.0'
```
Expected: termina sem erro; o `update.sh` roda o backup, reaplica o baseline e sobe as imagens `ghcr.io/melgarafael/*:1.44.0`.

- [ ] **Step 4: Verificar**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; curl -s -o /dev/null -w "%{http_code}\n" https://<dominio-de-producao>/; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300'
```
Expected: `v1.44.0`; `307`; health com `"version":"1.44.0"`. Login pela tela funciona.

---

### Task 1: Clone de trabalho sem tags do original

**Files:** nenhum versionado (configuração do clone em `DeskcommCRM/`).

**Interfaces:**
- Consumes: `refs/upstream-tags/v1.44.0` (já buscada).
- Produces: clone com `gh` apontando para o fork, sem `refs/tags/v*` do original, `upstream` sem tags automáticas.

- [ ] **Step 1: `gh` mira o fork**

```bash
cd DeskcommCRM && gh repo set-default victorrabyfs/DeskcommCRM && gh repo set-default --view
```
Expected: `victorrabyfs/DeskcommCRM`.

- [ ] **Step 2: Apagar as tags do original do clone e desligar tags automáticas do `upstream`**

```bash
git tag -l 'v*'            # esperado hoje: v1.42.0 v1.43.0
git tag -d $(git tag -l 'v*')
git config remote.upstream.tagOpt --no-tags
git fetch --no-tags upstream refs/tags/v1.44.0:refs/upstream-tags/v1.44.0
git tag -l 'v*' | wc -l
git rev-parse refs/upstream-tags/v1.44.0
```
Expected: contagem `0`; `39b62486f3891eb0f222fe4638705851ddb50049`.

---

### Task 2 [GitHub]: Fork com a base, workflows e proteções

**Files:** nenhum versionado (configuração do repositório `victorrabyfs/DeskcommCRM`).

**Interfaces:**
- Consumes: Task 1.
- Produces: fork com tag `v1.44.0` (objeto original), `main` = `7dbbf87`, só `ci.yml`/`e2e.yml`/`perf.yml`/`publish-image.yml` ligados, ruleset de tag, proteção da `main`.

- [ ] **Step 1: Pedir confirmação ao Victor** e conferir 2FA e colaboradores:

```bash
gh api user --jq .two_factor_authentication
gh api repos/victorrabyfs/DeskcommCRM/collaborators --jq '[.[] | select(.login != "victorrabyfs") | .login]'
gh api repos/victorrabyfs/DeskcommCRM/tags --jq 'length'
gh api repos/victorrabyfs/DeskcommCRM/branches/main --jq .commit.sha
```
Expected: `true`; `[]`; `0`; `6c7368030…`. Se o 2FA vier `false` ou `null`, parar e pedir ao Victor que ligue.

- [ ] **Step 2: Confirmar que as Actions estão desligadas**

```bash
gh workflow list --all -R victorrabyfs/DeskcommCRM
```
Expected: todos os workflows em estado `disabled_fork` (ou a lista vazia com a mensagem de Actions desligadas). Se algum estiver `active`, **parar**: desligar com `gh workflow disable -R victorrabyfs/DeskcommCRM <arquivo>` todos antes do Step 3.

- [ ] **Step 3: Empurrar a tag da base (objeto original) antes da `main`**

```bash
git push origin refs/upstream-tags/v1.44.0:refs/tags/v1.44.0
git ls-remote --tags origin
```
Expected: uma linha `39b62486… refs/tags/v1.44.0` (e a `^{}` apontando para `7dbbf87…`).

- [ ] **Step 4: Avançar a `main` do fork (fast-forward)**

```bash
git push origin 'refs/upstream-tags/v1.44.0^{commit}:refs/heads/main'
gh api repos/victorrabyfs/DeskcommCRM/branches/main --jq .commit.sha
```
Expected: push aceito sem `--force`; sha começa com `7dbbf87`.

- [ ] **Step 5: Ligar só os quatro workflows**

```bash
for w in ci.yml e2e.yml perf.yml publish-image.yml; do gh workflow enable -R victorrabyfs/DeskcommCRM "$w"; done
gh workflow list --all -R victorrabyfs/DeskcommCRM | grep -E 'release|relogio|vigia-de-colisao|ci|e2e|perf|publish'
```
Expected: `ci`, `e2e`, `perf`, `publish-image` ativos; `release`, `relogio`, `vigia-de-colisao` desligados. Se o GitHub exigir ligar as Actions pela tela (Settings › Actions), fazer isso e **imediatamente** `gh workflow disable -R victorrabyfs/DeskcommCRM release.yml relogio.yml vigia-de-colisao.yml` antes de qualquer push.

- [ ] **Step 6: Ruleset de tag `v*`**

```bash
gh api -X POST repos/victorrabyfs/DeskcommCRM/rulesets --input - <<'JSON'
{
  "name": "tags-de-versao",
  "target": "tag",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "rules": [ { "type": "creation" }, { "type": "update" }, { "type": "deletion" } ],
  "bypass_actors": [ { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" } ]
}
JSON
gh api repos/victorrabyfs/DeskcommCRM/rulesets --jq '.[] | [.name, .target, .enforcement] | @tsv'
```
Expected: `tags-de-versao	tag	active` (o `actor_id` 5 é o papel Admin do repositório — o dono).

- [ ] **Step 7: Proteção da `main`**

```bash
gh api -X PUT repos/victorrabyfs/DeskcommCRM/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": false, "contexts": ["verify", "invariants", "build-and-size", "e2e", "imagens-ok"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
gh api -X PATCH repos/victorrabyfs/DeskcommCRM -F allow_merge_commit=true -F allow_squash_merge=false -F allow_rebase_merge=false --jq '[.allow_merge_commit,.allow_squash_merge,.allow_rebase_merge]'
gh api repos/victorrabyfs/DeskcommCRM/branches/main/protection --jq '.required_status_checks.contexts|join(", ")'
```
Expected: `[true,false,false]`; `verify, invariants, build-and-size, e2e, imagens-ok`.

---

### Task 3: Branch de trabalho da etapa 2

**Files:** nenhum novo (branch).

**Interfaces:**
- Consumes: Task 2 (`origin/main` = `7dbbf87`).
- Produces: branch `convexy/etapa-2` = `origin/main` + commits de `docs/superpowers/`; `node_modules` instalado.

- [ ] **Step 1: Criar a branch a partir da `main` do fork e trazer os docs**

```bash
git fetch origin main
git switch -c convexy/etapa-2 origin/main
git log --format=%H --reverse origin/main..convexy/identidade -- docs/superpowers | xargs git cherry-pick
git log --oneline -8
```
Expected: os commits `docs(convexy): …` (spec e este plano) sobre `7dbbf87`; `git diff --stat origin/main` só lista `docs/superpowers/`.

- [ ] **Step 2: Dependências**

```bash
node --version   # v22.x
corepack enable && pnpm install --frozen-lockfile
```
Expected: instala sem alterar `pnpm-lock.yaml` (`git status --short` vazio).

- [ ] **Step 3: Linha de base verde**

```bash
pnpm test:unit > /tmp/vt.log 2>&1; echo "exit=$?"; grep -aE "Test Files|Tests |Errors " /tmp/vt.log | tail -3
```
Expected: `exit=0`. Se houver vermelho, anotar os arquivos antes de qualquer mudança (vermelho local conhecido: `lib/ai/dispatcher/rate-limit.test.ts` quando há `UPSTASH_*` no `.env.local` sem Redis de pé — não ter `.env.local` com essas chaves).

---

### Task 4: Troca do namespace das imagens

**Files:**
- Modify: `tests/unit/_identidade-deste-repo.ts` (linha `export const NAMESPACE_DESTE_REPO`)
- Modify: `hostgator-setup-kit/_common.sh:1046,1066`
- Modify: `docker-compose.prod.yml:35,92,213,380`
- Modify: `.env.hostgator.example:32,39,41`
- Modify: `hostgator-setup-kit/install.sh:18`, `hostgator-setup-kit/comecar.sh:12,16`
- Modify: `Dockerfile:89`, `Dockerfile.worker:9`, `Dockerfile.scheduler:10`, `Dockerfile.voice-agent:7`
- Test: `tests/unit/namespace-das-imagens.test.ts` (existente, não muda)

**Interfaces:**
- Consumes: Task 3.
- Produces: `IMG_NS="ghcr.io/victorrabyfs"`; defaults de imagem e URLs do kit no fork.

- [ ] **Step 1: Trocar a âncora (o teste passa a falhar)**

Em `tests/unit/_identidade-deste-repo.ts`:
```ts
export const NAMESPACE_DESTE_REPO = "ghcr.io/victorrabyfs";
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/namespace-das-imagens.test.ts tests/unit/namespace-das-imagens-runtime-owner.test.ts`
Expected: FAIL — `IMG_NS é o valor literal que este repositório publica` (recebe `ghcr.io/melgarafael`), os casos de `APP_IMAGE`/`WORKER_IMAGE`/`SCHEDULER_IMAGE` e `os defaults de código e os labels de origem apontam para este repositório`.

- [ ] **Step 3: Trocar as cópias conferidas**

```bash
sed -i '' 's#^IMG_NS="ghcr.io/melgarafael"#IMG_NS="ghcr.io/victorrabyfs"#' hostgator-setup-kit/_common.sh
sed -i '' 's#local url="${1:-https://github.com/melgarafael/DeskcommCRM.git}" ref#local url="${1:-https://github.com/victorrabyfs/DeskcommCRM.git}" ref#' hostgator-setup-kit/_common.sh
sed -i '' 's#ghcr.io/melgarafael/deskcomm#ghcr.io/victorrabyfs/deskcomm#' docker-compose.prod.yml .env.hostgator.example
sed -i '' 's#https://github.com/melgarafael/DeskcommCRM.git#https://github.com/victorrabyfs/DeskcommCRM.git#' hostgator-setup-kit/install.sh hostgator-setup-kit/comecar.sh
sed -i '' 's#raw.githubusercontent.com/melgarafael/DeskcommCRM#raw.githubusercontent.com/victorrabyfs/DeskcommCRM#' hostgator-setup-kit/comecar.sh
sed -i '' 's#org.opencontainers.image.source="https://github.com/melgarafael/DeskcommCRM"#org.opencontainers.image.source="https://github.com/victorrabyfs/DeskcommCRM"#' Dockerfile Dockerfile.worker Dockerfile.scheduler Dockerfile.voice-agent
git diff --stat
grep -n "melgarafael" hostgator-setup-kit/_common.sh docker-compose.prod.yml .env.hostgator.example hostgator-setup-kit/install.sh hostgator-setup-kit/comecar.sh Dockerfile Dockerfile.worker Dockerfile.scheduler Dockerfile.voice-agent
```
Expected: 11 arquivos alterados (com o `_identidade-deste-repo.ts`). O `grep` final só pode listar **comentários** de `_common.sh` (linhas ~1087-1095, prosa histórica sobre o PR #605) — nenhuma linha executável.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run tests/unit/namespace-das-imagens.test.ts tests/unit/namespace-das-imagens-runtime-owner.test.ts`
Expected: PASS (inclusive a catraca "o literal do namespace só aparece nos arquivos permitidos": `ghcr.io/victorrabyfs` só em `_common.sh`, compose, `.env.hostgator.example` e `_identidade-deste-repo.ts`; docs e `.md` ficam fora da varredura).

- [ ] **Step 5: Kit em shell**

Run: `pnpm test:shell`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add tests/unit/_identidade-deste-repo.ts hostgator-setup-kit/_common.sh docker-compose.prod.yml .env.hostgator.example hostgator-setup-kit/install.sh hostgator-setup-kit/comecar.sh Dockerfile Dockerfile.worker Dockerfile.scheduler Dockerfile.voice-agent
git commit -m "chore(convexy): imagens e kit apontam para o fork victorrabyfs

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: O kit reconhece versões `-cvx.N`

**Files:**
- Create: `tests/unit/convexy-ultima-versao.test.ts`
- Modify: `hostgator-setup-kit/_common.sh:1068-1073` (`ultima_versao_publicada`)

**Interfaces:**
- Consumes: Task 4 (`_common.sh` com o namespace novo).
- Produces: `ultima_versao_publicada [url]` devolve a maior tag `v*` sem sufixo `-rc*`/`-alpha*`/`-beta*` (aceita `-cvx.N`), sem o `v`.

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/convexy-ultima-versao.test.ts`:
```ts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Convexy: o fork publica versões `vX.Y.Z-cvx.N`. `ultima_versao_publicada`
 * (hostgator-setup-kit/_common.sh) é o que a instalação nova usa para escolher a
 * versão; no original ela descartava QUALQUER hífen e, no fork, instalaria a base
 * sem identidade (que nem tem imagem publicada no GHCR do fork).
 * Registro: CONVEXY.md, seção "_common.sh".
 */

const RAIZ = process.cwd();
let repo = "";

function git(...args: string[]) {
  execFileSync("git", args, { cwd: repo, stdio: "ignore" });
}

function ultima(url: string): string {
  return execFileSync(
    "bash",
    ["-c", 'source hostgator-setup-kit/_common.sh >/dev/null 2>&1; ultima_versao_publicada "$1"', "teste", url],
    { cwd: RAIZ, encoding: "utf8" },
  ).trim();
}

beforeAll(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "cvx-tags-"));
  git("init", "-q");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  git("config", "commit.gpgsign", "false");
  git("config", "tag.gpgsign", "false");
  git("commit", "-q", "--allow-empty", "-m", "base");
});

afterAll(() => {
  fs.rmSync(repo, { recursive: true, force: true });
});

describe("ultima_versao_publicada no fork Convexy", () => {
  it("escolhe a maior -cvx.N acima da base", () => {
    for (const t of ["v1.44.0", "v1.44.0-cvx.1", "v1.44.0-cvx.2", "v1.44.0-cvx.10"]) git("tag", t);
    expect(ultima(`file://${repo}`)).toBe("1.44.0-cvx.10");
  });

  it("ignora release candidate, alpha e beta", () => {
    for (const t of ["v1.44.0-rc1", "v1.45.0-alpha.1", "v1.45.0-beta.2"]) git("tag", t);
    expect(ultima(`file://${repo}`)).toBe("1.44.0-cvx.10");
  });

  it("sem tag nenhuma devolve vazio (falha aberta, como no original)", () => {
    const vazio = fs.mkdtempSync(path.join(os.tmpdir(), "cvx-vazio-"));
    execFileSync("git", ["init", "-q"], { cwd: vazio });
    try {
      expect(ultima(`file://${vazio}`)).toBe("");
    } finally {
      fs.rmSync(vazio, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/convexy-ultima-versao.test.ts`
Expected: FAIL nos dois primeiros casos — recebe `1.44.0` em vez de `1.44.0-cvx.10`.

- [ ] **Step 3: Implementar**

Em `hostgator-setup-kit/_common.sh`, dentro de `ultima_versao_publicada`, trocar o comentário e o filtro:
```bash
  # Convexy: descarta só PRERELEASE (v1.11.0-rc1, -alpha, -beta) e ACEITA as
  # versões do fork `vX.Y.Z-cvx.N`. O `--sort=-v:refname` do git põe o sufixo
  # ACIMA do release final quando `versionsort.suffix` não está configurado — é o
  # que faz a `-cvx.N` vencer a base, e o que fazia um `-rc` vencer no original.
  ref="$(git ls-remote --tags --refs --sort=-v:refname "$url" 'v*' 2>/dev/null \
        | awk '{print $2}' | grep -vE -- '-(rc|alpha|beta)' | head -1)" || return 0
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run tests/unit/convexy-ultima-versao.test.ts && pnpm test:shell`
Expected: PASS; `test:shell` exit 0.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/convexy-ultima-versao.test.ts hostgator-setup-kit/_common.sh
git commit -m "feat(convexy): instalação nova escolhe a maior versão -cvx.N

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: CHANGELOG aceita seções `-cvx.N`

**Files:**
- Create: `tests/unit/convexy-cabecalho-cvx.test.ts`
- Modify: `tests/unit/release-chega-na-lp.test.ts:280-286`
- Modify: `CHANGELOG.md` (seção nova entre `## [Não lançado]` e `## [1.44.0]`)

**Interfaces:**
- Consumes: Task 3.
- Produces: regex `CABECALHO_VERSAO_CONVEXY` exportada por `tests/unit/_convexy-cabecalho.ts`; seção `## [1.44.0-cvx.1]` no CHANGELOG.

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/convexy-cabecalho-cvx.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { CABECALHO_VERSAO_CONVEXY } from "./_convexy-cabecalho";

/**
 * Convexy: as versões do fork são `X.Y.Z-cvx.N` e cada uma tem sua seção no
 * CHANGELOG (o botão "Atualizar" corta as notas no cabeçalho da versão
 * instalada). A régua de `release-chega-na-lp.test.ts` passa a usar esta regex.
 */
describe("cabeçalho de versão do CHANGELOG no fork", () => {
  it.each([
    "## [1.44.0] — 2026-09-23",
    "## [1.44.0-cvx.1] — 2026-09-24",
    "## [1.44.0-cvx.12] - 2026-10-01",
  ])("aceita %s", (linha) => {
    expect(CABECALHO_VERSAO_CONVEXY.test(linha)).toBe(true);
  });

  it.each([
    "## [1.44.0-rc1] — 2026-09-23",
    "## [1.44.0-cvx] — 2026-09-23",
    "## [1.44.0-cvx.1]",
    "## 1.44.0-cvx.1 — 2026-09-23",
  ])("recusa %s", (linha) => {
    expect(CABECALHO_VERSAO_CONVEXY.test(linha)).toBe(false);
  });

  it("captura a versão inteira, com o sufixo", () => {
    expect("## [1.44.0-cvx.3] — 2026-09-30".match(CABECALHO_VERSAO_CONVEXY)?.[1]).toBe("1.44.0-cvx.3");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/convexy-cabecalho-cvx.test.ts`
Expected: FAIL — `Cannot find module './_convexy-cabecalho'`.

- [ ] **Step 3: Implementar a regex e usá-la na régua do original**

Criar `tests/unit/_convexy-cabecalho.ts` (sem `.test.ts`: o vitest não coleta):
```ts
/**
 * Cabeçalho de versão do CHANGELOG no fork Convexy: o do original
 * (deskcomm-site/lib/changelog.ts, CABECALHO_VERSAO) mais o sufixo `-cvx.N`.
 * Registro: CONVEXY.md, seção "release-chega-na-lp.test.ts".
 */
export const CABECALHO_VERSAO_CONVEXY =
  /^## \[(\d+\.\d+\.\d+(?:-cvx\.\d+)?)\]\s*[—–-]\s*(\d{4}-\d{2}-\d{2})\s*$/;
```

Em `tests/unit/release-chega-na-lp.test.ts`, no caso `toda seção do CHANGELOG segue o cabeçalho que a LP sabe ler`, trocar a linha
```ts
    const CABECALHO_VERSAO = /^## \[(\d+\.\d+\.\d+)\]\s*[—–-]\s*(\d{4}-\d{2}-\d{2})\s*$/;
```
por
```ts
    // Convexy: aceita também `X.Y.Z-cvx.N` (ver tests/unit/_convexy-cabecalho.ts e CONVEXY.md).
    const CABECALHO_VERSAO = CABECALHO_VERSAO_CONVEXY;
```
e acrescentar aos imports do topo do arquivo:
```ts
import { CABECALHO_VERSAO_CONVEXY } from "./_convexy-cabecalho";
```

- [ ] **Step 4: Seção da `-cvx.1` no CHANGELOG**

Em `CHANGELOG.md`, entre `## [Não lançado]` e `## [1.44.0] — 2026-09-23`, inserir (data = dia do corte da tag):
```markdown
## [1.44.0-cvx.1] — 2026-09-24

Primeira versão da Convexy, sobre a 1.44.0 do DeskcommCRM. Não muda nada na tela: a partir dela as atualizações chegam pelo repositório da Convexy (`victorrabyfs/DeskcommCRM`) e as imagens vêm de `ghcr.io/victorrabyfs`.

### ⚠️ Requer atenção

- Instalação que vinha do DeskcommCRM original: antes de atualizar, troque o `origin` para o repositório da Convexy e apague as tags antigas (procedimento em `CONVEXY.md`, "Migrar uma VPS"). O botão "Atualizar" não aparece nesta transição; atualize com `bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.1`.

```

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm vitest run tests/unit/convexy-cabecalho-cvx.test.ts tests/unit/release-chega-na-lp.test.ts`
Expected: PASS.

Run também as réguas que leem o CHANGELOG:
`pnpm vitest run tests/unit/changelog-cabe-na-tela-da-vps.test.ts tests/unit/acervo-do-changelog-cobra-a-casa.test.ts`
Expected: PASS (a seção `-cvx` é tratada como seção sem número, `lib/release/cabe-na-tela.ts:96`). Se algum reprovar por causa da seção `-cvx`, parar e registrar o motivo antes de ajustar: o ajuste vira mais uma entrada no `CONVEXY.md`.

- [ ] **Step 6: Commit**

```bash
git add tests/unit/_convexy-cabecalho.ts tests/unit/convexy-cabecalho-cvx.test.ts tests/unit/release-chega-na-lp.test.ts CHANGELOG.md
git commit -m "feat(convexy): CHANGELOG com seções -cvx.N e notas da 1.44.0-cvx.1

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `CONVEXY.md`

**Files:**
- Create: `CONVEXY.md`

**Interfaces:**
- Consumes: Tasks 4–6 (lista exata do que mudou).
- Produces: registro que as seções 7 e 8 da spec vão acrescentando.

- [ ] **Step 1: Gerar a lista "fica apontando para o original"**

```bash
git grep -ln melgarafael -- . ':!docs' ':!*.md' ':!CHANGELOG.md' | sort > /tmp/ficam.txt; wc -l < /tmp/ficam.txt; cat /tmp/ficam.txt
```
Expected: nenhuma linha dos 11 arquivos da Task 4 (exceto `hostgator-setup-kit/_common.sh`, por causa dos comentários históricos); o resto é da lista da spec 6.2.

- [ ] **Step 2: Escrever `CONVEXY.md`**

```markdown
# CONVEXY.md — o que este fork muda no DeskcommCRM

Fork `victorrabyfs/DeskcommCRM` do `melgarafael/DeskcommCRM`. Desenho completo:
`docs/superpowers/specs/2026-09-22-identidade-convexy-design.md`.

Regra: configuração antes de código; código da Convexy em arquivos novos; alteração
em arquivo do original só quando não há outro caminho, pequena e **registrada aqui**,
com o trecho exato e como reaplicar num conflito de merge.

## Base e versões

- Base atual: `v1.44.0` do original (`refs/upstream-tags/v1.44.0` no clone).
- Versões: `v1.44.0-cvx.N`, tag anotada, empurrada pelo nome. Nunca `--tags`/`--follow-tags`.
- A única tag do original no fork é `v1.44.0`. Versões novas do original ficam em
  `refs/upstream-tags/` no clone: `git fetch --no-tags upstream refs/tags/vA.B.C:refs/upstream-tags/vA.B.C`.
- CHANGELOG, do topo para baixo: `## [Não lançado]` › seções `-cvx` da base atual
  (mais nova primeiro) › seções do original › seções `-cvx` da base anterior › …

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

- `hostgator-setup-kit/_common.sh`, `ultima_versao_publicada`: `grep -v -- '-'` → `grep -vE -- '-(rc|alpha|beta)'`.
  Motivo: instalação nova a partir do fork tem de escolher a maior `-cvx.N`. Teste:
  `tests/unit/convexy-ultima-versao.test.ts`.

### Cabeçalho do CHANGELOG (etapa 2, `-cvx.1`)

- `tests/unit/release-chega-na-lp.test.ts`: `CABECALHO_VERSAO` passa a ser
  `CABECALHO_VERSAO_CONVEXY` (`tests/unit/_convexy-cabecalho.ts`), que aceita `-cvx.N`.
  Reaplicar: trocar a linha da regex e o import.

## Fica apontando para o original, de propósito

Fora da cadeia de atualização da VPS. Lista gerada no corte da `-cvx.1` com
`git grep -ln melgarafael -- . ':!docs' ':!*.md'`:

<colar aqui a saída de /tmp/ficam.txt do Step 1, uma linha por arquivo, em bloco de código>

Mais os `.md` e `docs/` (README, guias de instalação, SECURITY, CONTRIBUTING, skills).
Guardas de repositório (workflows e testes que só agem no original) não mudam.

## Configuração do fork no GitHub

- Workflows ligados: `ci.yml`, `e2e.yml`, `perf.yml`, `publish-image.yml`. Desligados:
  `release.yml`, `relogio.yml`, `vigia-de-colisao.yml`. **Workflow novo trazido por merge
  entra ligado**: conferir com `gh workflow list --all -R victorrabyfs/DeskcommCRM`.
- Ruleset `tags-de-versao` (`refs/tags/v*`: criação, atualização e remoção só pelo dono).
- `main` protegida: `verify`, `invariants`, `build-and-size`, `e2e`, `imagens-ok`; só merge commit.
- Pacotes GHCR públicos: `deskcommcrm`, `deskcomm-worker`, `deskcomm-scheduler`, `deskcomm-voice-agent`.

## Migrar uma VPS do original para o fork

<preenchido na Task 9 com os comandos exatamente como rodaram>

## Ensaio de rollback

<preenchido na Task 11 com a saída real>
```

O Step 1 fornece o bloco "Fica apontando para o original": substituir a linha `<colar aqui …>` pela saída de `/tmp/ficam.txt` num bloco de código. As duas últimas seções ficam com a frase "preenchido na Task 9/11" até essas tarefas rodarem.

- [ ] **Step 3: Commit**

```bash
git add CONVEXY.md
git commit -m "docs(convexy): CONVEXY.md — registro das alterações do fork

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8 [GitHub]: Publicar a `v1.44.0-cvx.1`

**Files:** nenhum novo.

**Interfaces:**
- Consumes: Tasks 4–7 na branch `convexy/etapa-2`.
- Produces: `main` do fork com a etapa 2; quatro pacotes GHCR públicos com a tag `1.44.0-cvx.1`; `stable` = `1.44.0-cvx.1`.

- [ ] **Step 1: Suítes locais**

```bash
pnpm typecheck && pnpm lint && pnpm test:shell
pnpm test:unit > /tmp/vt.log 2>&1; echo "exit=$?"; grep -aE "Test Files|Tests |Errors " /tmp/vt.log | tail -3
```
Expected: tudo exit 0; o rodapé do Vitest sem `failed` e sem linha `Errors`.

- [ ] **Step 2: PR para a `main` do fork e CI**

```bash
git push -u origin convexy/etapa-2
gh pr create -R victorrabyfs/DeskcommCRM --base main --head convexy/etapa-2 \
  --title "Convexy etapa 2: fork com imagens próprias (1.44.0-cvx.1)" \
  --body "Etapa 2 da spec docs/superpowers/specs/2026-09-22-identidade-convexy-design.md (seção 6). Sem mudança visual.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks -R victorrabyfs/DeskcommCRM --watch
```
Expected: o PR abre em `victorrabyfs/DeskcommCRM` (conferir a URL impressa); `verify`, `invariants`, `build-and-size`, `e2e`, `imagens-ok` verdes.

- [ ] **Step 3: Merge por merge commit e primeira publicação**

```bash
gh pr merge -R victorrabyfs/DeskcommCRM --merge --delete-branch=false
gh run list -R victorrabyfs/DeskcommCRM --workflow publish-image.yml --branch main --limit 1
gh run watch -R victorrabyfs/DeskcommCRM "$(gh run list -R victorrabyfs/DeskcommCRM --workflow publish-image.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId')"
```
Expected: run concluído com sucesso; publica `latest`/`main` e cria os quatro pacotes (privados).

- [ ] **Step 4: Tornar os quatro pacotes públicos**

Em `https://github.com/victorrabyfs?tab=packages`, para cada pacote (`deskcommcrm`, `deskcomm-worker`, `deskcomm-scheduler`, `deskcomm-voice-agent`): Package settings › Change visibility › Public. (A API não permite mudar visibilidade de pacote de conta pessoal.) Conferir:
```bash
for i in deskcommcrm deskcomm-worker deskcomm-scheduler deskcomm-voice-agent; do
  t=$(curl -s "https://ghcr.io/token?scope=repository:victorrabyfs/$i:pull&service=ghcr.io" | sed -E 's/.*"token":"([^"]+)".*/\1/')
  curl -s -o /dev/null -w "$i %{http_code}\n" -H "Authorization: Bearer $t" \
    -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.docker.distribution.manifest.v2+json" \
    "https://ghcr.io/v2/victorrabyfs/$i/manifests/latest"
done
```
Expected: `200` nas quatro.

- [ ] **Step 5: Tag e publicação da versão**

```bash
git fetch origin main && git switch main && git merge --ff-only origin/main
git tag -a v1.44.0-cvx.1 -m "Convexy 1.44.0-cvx.1 — fork com imagens próprias"
git push origin v1.44.0-cvx.1
gh run watch -R victorrabyfs/DeskcommCRM "$(gh run list -R victorrabyfs/DeskcommCRM --workflow publish-image.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
git ls-remote --tags origin
```
Expected: run verde (inclui `a-tag-veio-da-main` e `promover-stable`); `ls-remote` lista só `v1.44.0` e `v1.44.0-cvx.1`. O comando de conferência do Step 4 com `manifests/1.44.0-cvx.1` e `manifests/stable` dá `200` nas quatro.

---

### Task 9 [VPS]: Migrar a VPS para o fork (`-cvx.1`)

**Files:** `CONVEXY.md` (seção "Migrar uma VPS").

**Interfaces:**
- Consumes: Task 0 (VPS em `v1.44.0`), Task 8 (imagens públicas).
- Produces: VPS em `1.44.0-cvx.1`, `origin` = fork, só tags `v1.44.0`/`-cvx.*`.

- [ ] **Step 1: Pedir confirmação ao Victor** (fora do expediente das clínicas).

- [ ] **Step 2: Pré-voo — parada obrigatória**

Criar `/tmp/prevoo.sh` na máquina local e rodar contra a VPS:
```bash
cat > /tmp/prevoo.sh <<'SH'
set -u
falhou=0
for i in deskcommcrm deskcomm-worker deskcomm-scheduler deskcomm-voice-agent; do
  t=$(curl -s "https://ghcr.io/token?scope=repository:victorrabyfs/$i:pull&service=ghcr.io" | sed -E 's/.*"token":"([^"]+)".*/\1/')
  c=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $t" \
    -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.docker.distribution.manifest.v2+json" \
    "https://ghcr.io/v2/victorrabyfs/$i/manifests/1.44.0-cvx.1")
  echo "$i $c"; [ "$c" = 200 ] || falhou=1
done
cd /opt/deskcommcrm || exit 1
[ "$(git describe --tags --exact-match HEAD 2>/dev/null)" = "v1.44.0" ] || { echo "VPS fora da base"; falhou=1; }
curl -s https://<dominio-de-producao>/api/v1/health | grep -q '"1.44.0"' || { echo "health não é 1.44.0"; falhou=1; }
[ -z "$(git config --get versionsort.suffix)" ] || { echo "versionsort.suffix configurado"; falhou=1; }
[ "$falhou" = 0 ] && echo OK || { echo "PRÉ-VOO FALHOU — não seguir"; exit 1; }
SH
scp /tmp/prevoo.sh <host-ssh>:/tmp/prevoo.sh && ssh <host-ssh> 'bash /tmp/prevoo.sh'
```
Expected: quatro `200` e `OK`. Qualquer outra saída: **parar**.

Na tela `https://<dominio-de-producao>/app/settings/atualizacao`: nenhuma atualização pedida nem em andamento.

- [ ] **Step 3: Backup do `.env`**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && cp .env ".env.bak-$(date +%Y%m%d)" && ls -l .env*'
```

- [ ] **Step 4: Trocar o remoto e limpar as tags, numa linha só**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git remote set-url origin https://github.com/victorrabyfs/DeskcommCRM.git && git tag -l | xargs -r git tag -d >/dev/null && git fetch --tags origin && git tag -l'
```
Expected: exatamente `v1.44.0` e `v1.44.0-cvx.1`.

- [ ] **Step 5: Conferir as tags de novo e atualizar**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git tag -l && bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.1'
```
Expected: a lista continua só `v1.44.0`/`v1.44.0-cvx.1` (se aparecer outra tag, repetir o Step 4 antes); o `update.sh` termina sem erro, sem construir imagem local.

- [ ] **Step 6: Verificar**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; grep -E "^(APP|WORKER|SCHEDULER|VOICE_AGENT)_IMAGE=" .env; git tag -l; curl -s -o /dev/null -w "%{http_code}\n" https://<dominio-de-producao>/; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300'
```
Expected: `v1.44.0-cvx.1`; as quatro `*_IMAGE` em `ghcr.io/victorrabyfs/…:1.44.0-cvx.1`; tags só `v1.44.0`/`v1.44.0-cvx.1`; `307`; health com `1.44.0-cvx.1`. Login pela tela, claro e escuro, igual a antes.

- [ ] **Step 7: Registrar e commitar**

Primeiro criar a branch, depois editar:
```bash
git fetch origin main && git switch -c convexy/cvx-2 origin/main
```
Substituir o conteúdo da seção "Migrar uma VPS do original para o fork" do `CONVEXY.md` pelos comandos dos Steps 2–6 exatamente como rodaram (em blocos de código), e:
```bash
git add CONVEXY.md && git commit -m "docs(convexy): procedimento de migração da VPS, como rodou

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10 [GitHub + VPS]: `v1.44.0-cvx.2` pelo botão

**Files:**
- Modify: `CHANGELOG.md` (seção `1.44.0-cvx.2` acima da `-cvx.1`)

**Interfaces:**
- Consumes: Task 9 (branch `convexy/cvx-2` com o `CONVEXY.md` atualizado).
- Produces: VPS em `1.44.0-cvx.2` aplicada pelo botão.

- [ ] **Step 1: Seção no CHANGELOG**

Em `CHANGELOG.md`, entre `## [Não lançado]` e `## [1.44.0-cvx.1] — …`, inserir (data do corte):
```markdown
## [1.44.0-cvx.2] — 2026-09-25

Sem mudança na tela. Confirma que as atualizações da Convexy chegam pelo botão "Atualizar".

```

- [ ] **Step 2: Testes, PR, merge e tag**

```bash
pnpm vitest run tests/unit/release-chega-na-lp.test.ts tests/unit/convexy-cabecalho-cvx.test.ts
git add CHANGELOG.md && git commit -m "chore(convexy): 1.44.0-cvx.2

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push -u origin convexy/cvx-2
gh pr create -R victorrabyfs/DeskcommCRM --base main --head convexy/cvx-2 --title "Convexy 1.44.0-cvx.2" --body "Ensaio do botão Atualizar (spec 5.2) e registro da migração no CONVEXY.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks -R victorrabyfs/DeskcommCRM --watch && gh pr merge -R victorrabyfs/DeskcommCRM --merge
git switch main && git pull --ff-only origin main
git tag -a v1.44.0-cvx.2 -m "Convexy 1.44.0-cvx.2 — ensaio do botão Atualizar"
git push origin v1.44.0-cvx.2
gh run watch -R victorrabyfs/DeskcommCRM "$(gh run list -R victorrabyfs/DeskcommCRM --workflow publish-image.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
```
Expected: testes PASS; CI verde; run de publicação verde; `git ls-remote --tags origin` lista `v1.44.0`, `-cvx.1`, `-cvx.2`.

- [ ] **Step 3: Aplicar pelo botão (com confirmação do Victor)**

Esperar até 5 min (ciclo do agente). Em `/app/settings/atualizacao` deve aparecer a versão `1.44.0-cvx.2` com as notas "Sem mudança na tela…". Clicar em "Atualizar".
```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300'
```
Expected: `v1.44.0-cvx.2`; health `1.44.0-cvx.2`. Se o botão não aparecer em 10 min: `ssh <host-ssh> 'cd /opt/deskcommcrm && git tag -l'` (tag intrusa? repetir a limpeza da Task 9 Step 4) e o manifesto `1.44.0-cvx.2` público (Task 8 Step 4).

---

### Task 11 [VM descartável]: Ensaio do rollback para o original

**Files:** `CONVEXY.md` (seção "Ensaio de rollback").

**Interfaces:**
- Consumes: Tasks 8 e 10 (tags publicadas).
- Produces: saída real do rollback registrada.

- [ ] **Step 1: Pedir ao Victor uma VM descartável** (Ubuntu com Docker, um subdomínio de teste apontado para ela, e um projeto Supabase de teste — nunca o `<projeto-supabase>`). Não usar a produção.

- [ ] **Step 2: Instalar a partir do fork e conferir a versão escolhida**

Na VM (o instalador pergunta domínio, chaves e senha; usar o subdomínio e o Supabase de teste):
```bash
git clone https://github.com/victorrabyfs/DeskcommCRM.git deskcommcrm && cd deskcommcrm
bash hostgator-setup-kit/install.sh
git tag -l; grep -E "^APP_IMAGE=" .env; curl -s https://<subdominio-de-teste>/api/v1/health | head -c 200
```
Expected: `APP_IMAGE=ghcr.io/victorrabyfs/deskcommcrm:1.44.0-cvx.2` (a instalação escolhe a maior `-cvx`, Task 5; se o `install.sh` clonou o topo da `main`, rodar `bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.2` e conferir de novo); health `1.44.0-cvx.2`.

- [ ] **Step 3: Rollback para o original**

```bash
git remote set-url origin https://github.com/melgarafael/DeskcommCRM.git \
  && git tag -l | xargs -r git tag -d >/dev/null && git fetch --tags origin \
  && bash hostgator-setup-kit/update.sh --to v1.44.0 --force
git describe --tags --exact-match HEAD; grep -E "^(APP|WORKER|SCHEDULER|VOICE_AGENT)_IMAGE=" .env; curl -s https://<subdominio-de-teste>/api/v1/health | head -c 200
```
Expected: `v1.44.0`; imagens `ghcr.io/melgarafael/*:1.44.0`; health `1.44.0`.

- [ ] **Step 4: Registrar e commitar**

Colar a saída dos Steps 2–3 na seção "Ensaio de rollback" do `CONVEXY.md`; PR para a `main` do fork (merge commit), sem tag.
```bash
git switch -c convexy/ensaio-rollback origin/main
git add CONVEXY.md && git commit -m "docs(convexy): ensaio de rollback para o original, com a saída real

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push -u origin convexy/ensaio-rollback
gh pr create -R victorrabyfs/DeskcommCRM --base main --head convexy/ensaio-rollback --title "Convexy: ensaio de rollback" --body "Spec 6.4, critério 'rollback ensaiado'.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Pronto quando (spec 6.4)

- `/api/v1/health` responde `1.44.0-cvx.1` (Task 9), depois `1.44.0-cvx.2` aplicada pelo botão (Task 10);
- `.env` da VPS aponta as quatro imagens para `ghcr.io/victorrabyfs` (Task 9 Step 6);
- `git tag -l` na VPS só lista `v1.44.0` e `v1.44.0-cvx.*` (Tasks 9 e 10);
- rollback ensaiado numa VM descartável, com a saída no `CONVEXY.md` (Task 11).
