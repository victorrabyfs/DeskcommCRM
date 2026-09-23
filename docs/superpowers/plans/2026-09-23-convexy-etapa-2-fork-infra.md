# Convexy — passo 0 e etapa 2 (fork só com infraestrutura) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended — ver "Modo de execução") or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revisão 2** (2026-09-23): comandos, código e cobertura conferidos por três revisões; Tasks 4–7
executadas de verdade numa cópia da `v1.44.0`.

**Goal:** Pôr a produção na `v1.44.0` do original, montar o fork `victorrabyfs/DeskcommCRM` como fonte das atualizações (imagens próprias no GHCR, versões `v1.44.0-cvx.N`) e migrar a VPS para ele, provando o botão "Atualizar" com uma `-cvx.2` — sem nenhuma mudança visual.

**Architecture:** O código do produto não muda. Muda o namespace das imagens no kit (`IMG_NS` e as cópias conferidas pelo teste de namespace), o filtro de versão do kit (aceitar `-cvx.N`), a régua do cabeçalho do CHANGELOG e a configuração do fork no GitHub (tags, workflows, proteção). A VPS troca o `origin` para o fork, apaga as tags do original e sobe `-cvx.1` à mão; a `-cvx.2` chega pelo botão.

**Tech Stack:** git 2.53, GitHub (`gh` CLI ≥ 2.92, Actions, GHCR, rulesets), bash (kit `hostgator-setup-kit/`), Vitest, pnpm 9.15.9, Node ≥ 22, Docker Compose na VPS (Traefik do Easypanel), `tmux` na VPS.

**Spec:** `docs/superpowers/specs/2026-09-22-identidade-convexy-design.md` — seções 5.0, 5.1, 5.2 e 6 (revisão 4, aprovada em 2026-09-23).

## Global Constraints

- Clone de trabalho: `/Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM` (todos os comandos locais rodam dele).
- Repositório do fork: `victorrabyfs/DeskcommCRM`; original: `melgarafael/DeskcommCRM` (remoto `upstream`). **Nunca abrir PR no original**: todo `gh` leva `-R victorrabyfs/DeskcommCRM`, e `gh pr checks`/`merge`/`view` levam o nome da branch como argumento.
- Base: `v1.44.0` (objeto de tag `39b62486f3891eb0f222fe4638705851ddb50049`, commit `7dbbf87`), no clone como `refs/upstream-tags/v1.44.0`.
- Namespace das imagens: `ghcr.io/victorrabyfs`. Imagens: `deskcommcrm`, `deskcomm-worker`, `deskcomm-scheduler`, `deskcomm-voice-agent` — todas **públicas**.
- Versões: `v1.44.0-cvx.N`, tag anotada, criada à mão **só depois de o PR estar `MERGED`**, empurrada **pelo nome**. Nunca `git push --tags` nem `--follow-tags`. Tag publicada nunca é refeita (corrigir = `N+1`).
- Nenhuma tag do original em `refs/tags/` do clone, exceto `v1.44.0` (empurrada ao fork uma única vez, na Task 2).
- Merge de PR no fork **só por merge commit**; proteção da `main` sem "Require linear history".
- Toda tag Convexy tem `## [1.44.0-cvx.N] — AAAA-MM-DD` (data do dia do corte, `date +%F`) no `CHANGELOG.md`, logo abaixo de `## [Não lançado]` e acima das seções do original.
- Comandos na VPS: host `<host-ssh>`, pasta `/opt/deskcommcrm`; o kit já usa os dois arquivos de compose quando `REVERSE_PROXY=traefik`. Não mexer nos serviços do Easypanel.
- **`update.sh` na VPS roda sempre dentro de `tmux`**, com log em `/root/update-<data>.log`: se o SSH cair, o script não morre no meio.
- Entre a Task 0 e a Task 9 **ninguém clica em "Atualizar"**. Release nova do original nesse período: não trazer; anotar para a seção 8 da spec.
- A etapa 1 (spec 5.1: SMTP do Resend no Supabase e `marca-emails.sh`) segue pendente com o operador. Não bloqueia a etapa 2 (não há dependência técnica; o `marca-emails.sh` é o mesmo no fork).
- O rollback não é ensaiado em VM (decisão de 23/09): fica documentado no `CONVEXY.md`.
- Desvios de DoD registrados no `CONVEXY.md`: sem fragmento em `.changes/` (DoD 17 — CHANGELOG escrito à mão, spec 6.3); a `-cvx.1` exige a troca de remoto na VPS (DoD 15); destino de toda mudança = instalação do fork (DoD 18). Docs do original não são editados (DoD 16 via `CONVEXY.md`).
- Suítes antes de cada tag: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:shell` (local); `e2e` pelo CI do PR — a etapa 2 não muda tela, então o e2e local é dispensado.
- Ambiente local (macOS): `pnpm typecheck` pode estourar a memória — usar `NODE_OPTIONS=--max-old-space-size=8192`. `pnpm test:shell` já falha na base em três scripts no bash 3.2 do macOS (`hostgator-setup-kit/test-validators.sh`, `tests/shell/hooks-nao-acusam-a-main.test.sh`, `tests/shell/desinstalar-docker.test.sh`) e, por encadear com `&&`, para no primeiro; comparar sempre script a script com a linha de base (Task 3).

## Modo de execução

- As Tasks marcadas **[VPS]** e **[GitHub]** rodam **na sessão principal, no modo padrão de permissão**, com o Victor aprovando cada comando — nunca em subagente nem no modo automático (o classificador bloqueia comandos de produção, e o Victor prefere aprovar com um clique).
- Ações só de tela ficam com o Victor, ou com Claude pelo navegador com aprovação: registrar os workflows (Task 2 Step 2), tornar os pacotes públicos (Task 8 Step 4), conferir `/app/settings/atualizacao` (Task 9) e clicar em "Atualizar" (Task 10).
- Tasks 3–7 (código) podem ir para subagente; o resto não.

## Review Focus

1. **Tag do original reaparecendo** (no clone ou na VPS, por `fetch`, por um ciclo do agente em andamento, por push de tag) → o botão deve continuar oferecendo só `-cvx`; hook `pre-push` local (Task 1) recusa tag fora de `v*-cvx.N`; guarda antes do `update.sh` na VPS (Task 9) recusa tag intrusa.
2. **Pacote GHCR privado ou ausente na hora da migração** → o pré-voo da Task 9 é um script que sai ≠ 0 e a Task 9 só segue com a saída `OK`.
3. **Workflow do original disparando no fork** (`release.yml` ao registrar os workflows, `publish-image` na tag `v1.44.0`) → Task 2 desliga todos antes de qualquer push e confere o estado dos oito; Tasks 8 e 10 reconferem antes de empurrar.
4. **Instalação nova a partir do fork** → `ultima_versao_publicada` devolve a maior `vX.Y.Z` ou `vX.Y.Z-cvx.N`, e nada mais (nem `-rc`, `-RC3`, `-cvx.N-teste`); testes na Task 5.
5. **CHANGELOG com seção `-cvx`** → aceita `## [1.44.0-cvx.N] — data`, recusa cabeçalho torto, e as outras 13 réguas que leem o CHANGELOG seguem verdes; Task 6.

---

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `tests/unit/_identidade-deste-repo.ts` | Modificar | Âncora do namespace (`NAMESPACE_DESTE_REPO`) |
| `hostgator-setup-kit/_common.sh` | Modificar | `IMG_NS`, URL padrão e filtro de `ultima_versao_publicada` |
| `docker-compose.prod.yml` | Modificar | `image:` padrão das quatro imagens |
| `.env.hostgator.example` | Modificar | `APP_IMAGE`, `WORKER_IMAGE`, `SCHEDULER_IMAGE` |
| `hostgator-setup-kit/install.sh`, `comecar.sh` | Modificar | `REPO_URL` padrão (e o `curl` do comentário em `comecar.sh`) |
| `Dockerfile`, `Dockerfile.worker`, `Dockerfile.scheduler`, `Dockerfile.voice-agent` | Modificar | Label `org.opencontainers.image.source` |
| `tests/unit/convexy-ultima-versao.test.ts` | Criar | O kit escolhe a maior versão válida |
| `tests/unit/_convexy-cabecalho.ts` | Criar | Regex do cabeçalho de versão do CHANGELOG no fork |
| `tests/unit/convexy-cabecalho-cvx.test.ts` | Criar | Prova da regex |
| `tests/unit/release-chega-na-lp.test.ts` | Modificar | Usa a regex do fork |
| `CHANGELOG.md` | Modificar | Seções `1.44.0-cvx.1` e `1.44.0-cvx.2` |
| `CONVEXY.md` | Criar | Registro de toda alteração em arquivo do original, desvios, procedimentos |
| `.git/hooks/pre-push` (local, não versionado) | Criar | Recusa empurrar tag fora de `v*-cvx.N` |

---

### Task 0 [VPS]: Passo 0 — produção na `v1.44.0`

**Files:** nenhum.

**Interfaces:**
- Consumes: —
- Produces: VPS em `v1.44.0` exata; regra "ninguém clica em Atualizar" em vigor até a Task 9.

- [ ] **Step 1: Confirmação e aviso.** Pedir confirmação ao Victor (janela fora do expediente das clínicas) e avisar quem usa `/app/settings/atualizacao`: **não clicar em "Atualizar"** até a migração para o fork.

- [ ] **Step 2: Conferir o estado e salvar o `.env`**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300; echo; git config --get versionsort.suffix || echo "versionsort.suffix vazio (ok)"; command -v tmux || echo "SEM TMUX"; cp -p .env ".env.bak-$(date +%Y%m%d)-passo0" && ls -l .env*'
```
Expected: `v1.43.0` ou `v1.42.0` (qualquer outra: **parar** e perguntar ao Victor); health com a mesma versão; `versionsort.suffix vazio (ok)`; caminho do `tmux` (se `SEM TMUX`: `ssh <host-ssh> 'apt-get install -y tmux'`, com confirmação); o backup do `.env` listado com permissão `-rw-------` ou igual à do `.env`.

- [ ] **Step 3: Atualizar para a base, pelo `update.sh`, dentro do `tmux`**

```bash
ssh -t <host-ssh> 'cd /opt/deskcommcrm && tmux new -s passo0 "bash hostgator-setup-kit/update.sh --to v1.44.0 2>&1 | tee /root/update-$(date +%Y%m%d-%H%M)-passo0.log; echo FIM; read"'
```
Expected: termina com a mensagem de sucesso do kit e `FIM`; sem `Erro`/`die`. Se o SSH cair: `ssh -t <host-ssh> 'tmux attach -t passo0'`. Se o `update.sh` falhar: **parar**, guardar o log e perguntar ao Victor (o botão, se a atualização não veio dele, não faz rollback).

- [ ] **Step 4: Verificar**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; curl -s -o /dev/null -w "%{http_code}\n" https://<dominio-de-producao>/; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300'
```
Expected: `v1.44.0`; `307`; health com `"version":"1.44.0"`. Login pela tela funciona.

---

### Task 1: Clone de trabalho sem tags do original

**Files:**
- Create: `.git/hooks/pre-push` (local)

**Interfaces:**
- Consumes: `refs/upstream-tags/v1.44.0` (já buscada).
- Produces: clone com `gh` no fork, sem `refs/tags/v*` do original, `upstream` sem tags automáticas, hook que recusa tag fora de `-cvx`.

- [ ] **Step 1: `gh` mira o fork e enxerga o 2FA**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
gh repo set-default victorrabyfs/DeskcommCRM && gh repo set-default --view
gh auth refresh -h github.com -s read:user
```
Expected: `victorrabyfs/DeskcommCRM`; o `refresh` abre o navegador para autorizar o escopo `read:user` (necessário para ler o 2FA na Task 2).

- [ ] **Step 2: Apagar as tags do original e desligar tags automáticas do `upstream`**

```bash
git tag -l 'v*'            # hoje: v1.42.0 v1.43.0
for t in $(git tag -l 'v*'); do git tag -d "$t"; done   # (o xargs do macOS roda mesmo com lista vazia)
git config remote.upstream.tagOpt --no-tags
git fetch --no-tags upstream refs/tags/v1.44.0:refs/upstream-tags/v1.44.0
git tag -l 'v*' | wc -l
git rev-parse refs/upstream-tags/v1.44.0
```
Expected: `0`; `39b62486f3891eb0f222fe4638705851ddb50049`.

- [ ] **Step 3: Hook `pre-push` que recusa tag fora de `-cvx`**

```bash
cat > .git/hooks/pre-push <<'SH'
#!/usr/bin/env bash
# Convexy: só tags vX.Y.Z-cvx.N vão para o fork. A v1.44.0 (base) vai uma vez, com --no-verify (Task 2).
while read -r local_ref _ remote_ref _; do
  case "$remote_ref" in
    refs/tags/*)
      t="${remote_ref#refs/tags/}"
      if ! printf '%s' "$t" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+-cvx\.[0-9]+$'; then
        echo "pre-push Convexy: recusando tag '$t' (só vX.Y.Z-cvx.N). Ver CONVEXY.md." >&2
        exit 1
      fi;;
  esac
done
exit 0
SH
chmod +x .git/hooks/pre-push
printf 'refs/tags/v9.9.9 0 refs/tags/v9.9.9 0\n' | .git/hooks/pre-push; echo "exit=$?"
printf 'refs/tags/v1.44.0-cvx.1 0 refs/tags/v1.44.0-cvx.1 0\n' | .git/hooks/pre-push; echo "exit=$?"
```
Expected: primeira chamada imprime a recusa e `exit=1`; segunda `exit=0`.

---

### Task 2 [GitHub]: Fork com a base, workflows e proteções

**Files:** nenhum versionado.

**Interfaces:**
- Consumes: Task 1.
- Produces: fork com tag `v1.44.0` (objeto original), `main` = `7dbbf87`, só `ci.yml`/`e2e.yml`/`perf.yml`/`publish-image.yml` ligados, ruleset de tag, proteção da `main`, só merge commit.

- [ ] **Step 1: Confirmação e estado de partida**

Pedir confirmação ao Victor. Depois:
```bash
gh api user --jq .two_factor_authentication
gh api repos/victorrabyfs/DeskcommCRM/collaborators --jq '[.[] | select(.login != "victorrabyfs") | .login]'
gh api repos/victorrabyfs/DeskcommCRM/tags --jq 'length'
gh api repos/victorrabyfs/DeskcommCRM/branches/main --jq .commit.sha
gh api repos/victorrabyfs/DeskcommCRM --jq '[.allow_merge_commit,.allow_squash_merge,.allow_rebase_merge]'
gh api repos/victorrabyfs/DeskcommCRM/actions/workflows --jq .total_count
```
Expected: `true` (se `false`: parar e pedir ao Victor que ligue o 2FA em github.com/settings/security); `[]`; `0`; `6c7368030…`; `[true,true,true]` (estado anterior, anotado); `0` (nenhum workflow registrado ainda).

- [ ] **Step 2: Registrar e desligar todos os workflows (Victor, pela tela)**

Na aba **Actions** de `https://github.com/victorrabyfs/DeskcommCRM`, clicar em "I understand my workflows, go ahead and enable them". Isso registra os workflows da `main` atual (`6c73680`) **ligados**; em seguida, sem pausa:
```bash
for w in acolhida.yml ci.yml e2e.yml perf.yml publish-image.yml release.yml relogio.yml; do
  gh workflow disable "$w" -R victorrabyfs/DeskcommCRM
done
gh workflow list --all -R victorrabyfs/DeskcommCRM --json path,state --jq '.[]|[.path,.state]|@tsv'
gh run list -R victorrabyfs/DeskcommCRM --limit 5
```
Expected: os sete com `disabled_manually`. Se algum `relogio` rodou entre o clique e o `disable` (aparece no `run list`), é inofensivo: `permissions: {}` e nenhum segredo no fork.

- [ ] **Step 3: Empurrar a tag da base (objeto original) antes da `main`**

```bash
git push --no-verify origin refs/upstream-tags/v1.44.0:refs/tags/v1.44.0
git ls-remote --tags origin
```
Expected: duas linhas — `39b62486… refs/tags/v1.44.0` e `7dbbf87… refs/tags/v1.44.0^{}`. (`--no-verify` só aqui: a base é a única tag que não é `-cvx`.)

- [ ] **Step 4: Avançar a `main` do fork (fast-forward)**

```bash
git push origin 'refs/upstream-tags/v1.44.0^{commit}:refs/heads/main'
gh api repos/victorrabyfs/DeskcommCRM/branches/main --jq .commit.sha
gh run list -R victorrabyfs/DeskcommCRM --limit 5
```
Expected: push aceito sem `--force`; sha começa com `7dbbf87`; nenhum run disparado pelo push (todos desligados).

- [ ] **Step 5: Desligar o `vigia-de-colisao` (novo) e ligar só os quatro**

```bash
gh workflow disable vigia-de-colisao.yml -R victorrabyfs/DeskcommCRM
for w in ci.yml e2e.yml perf.yml publish-image.yml; do gh workflow enable "$w" -R victorrabyfs/DeskcommCRM; done
gh workflow list --all -R victorrabyfs/DeskcommCRM --json path,state --jq '.[]|[.path,.state]|@tsv'
```
Expected: oito linhas — `ci.yml`, `e2e.yml`, `perf.yml`, `publish-image.yml` em `active`; `acolhida.yml`, `release.yml`, `relogio.yml`, `vigia-de-colisao.yml` em `disabled_manually`.

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
id=$(gh api repos/victorrabyfs/DeskcommCRM/rulesets --jq '.[]|select(.name=="tags-de-versao").id')
gh api "repos/victorrabyfs/DeskcommCRM/rulesets/$id" --jq '.enforcement, .current_user_can_bypass, .bypass_actors'
```
Expected: `active`; `always`; o ator `RepositoryRole` 5 (Admin). Se `current_user_can_bypass` não for `always`, apagar o ruleset (`gh api -X DELETE …/rulesets/$id`) e parar — o dono ficaria sem poder criar tags.

- [ ] **Step 7: Proteção da `main` e só merge commit**

```bash
gh api repos/victorrabyfs/DeskcommCRM/branches/main/protection 2>&1 | head -3   # estado anterior (esperado: Branch not protected)
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

**Files:** nenhum novo.

**Interfaces:**
- Consumes: Task 2 (`origin/main` = `7dbbf87`); a revisão final deste plano e da spec **commitadas** em `convexy/identidade`.
- Produces: branch `convexy/identidade` recriada = `7dbbf87` + 8+ commits `docs(convexy)`; a antiga guardada como `convexy/identidade-v142`; `node_modules`; linha de base dos testes.

- [ ] **Step 1: Recriar a branch sobre a base, trazendo só os docs**

```bash
git status --short                      # tem de estar vazio
git branch -m convexy/identidade convexy/identidade-v142
git log --format=%H --reverse "refs/upstream-tags/v1.44.0^{commit}..convexy/identidade-v142" -- docs/superpowers | tee /tmp/docs-commits.txt | wc -l
git switch -c convexy/identidade "refs/upstream-tags/v1.44.0^{commit}"
xargs git cherry-pick < /tmp/docs-commits.txt
git diff --stat "refs/upstream-tags/v1.44.0^{commit}" | tail -3
git diff convexy/identidade-v142 convexy/identidade -- docs/superpowers/specs/2026-09-22-identidade-convexy-design.md docs/superpowers/plans/2026-09-23-convexy-etapa-2-fork-infra.md
```
Expected: contagem ≥ 8, todos `docs(convexy)`; cherry-pick sem conflito (cada commit toca só a spec ou este plano); o `diff --stat` só lista esses dois arquivos; o último `diff` vazio.

- [ ] **Step 2: Dependências**

```bash
node --version   # ≥ v22
corepack enable && pnpm install --frozen-lockfile
git status --short
```
Expected: instala; `git status` vazio.

- [ ] **Step 3: Linha de base verde**

```bash
pnpm test:unit > /tmp/vt-base.log 2>&1; echo "exit=$?"; grep -aE "Test Files|Tests |Errors " /tmp/vt-base.log | tail -3
node -e 'console.log(require("./package.json").scripts["test:shell"].split(" && ").map(s=>s.replace(/^bash /,"")).join("\n"))' \
  | while read -r s; do bash "$s" </dev/null >/dev/null 2>&1; echo "$? $s"; done | tee /tmp/shell-base.txt
```
Expected: `exit=0` no Vitest (se houver vermelho, anotar os arquivos antes de qualquer mudança; não ter `.env.local` com `UPSTASH_*` sem Redis de pé). `/tmp/shell-base.txt`: `0` em todos, exceto os três scripts já conhecidos no macOS (Global Constraints).

---

### Task 4: Troca do namespace das imagens

**Files:**
- Modify: `tests/unit/_identidade-deste-repo.ts` (`export const NAMESPACE_DESTE_REPO`)
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
Expected: `Tests 2 failed | 15 passed (17)` — em `namespace-das-imagens.test.ts`: `IMG_NS é o valor literal que este repositório publica` e `os defaults de código e os labels de origem apontam para este repositório`. (Os casos de `APP_IMAGE` etc. comparam com `imgNs()` e seguem verdes; o `runtime-owner` é no-op fora do Actions.)

- [ ] **Step 3: Trocar as cópias conferidas**

```bash
sed -i '' 's#^IMG_NS="ghcr.io/melgarafael"#IMG_NS="ghcr.io/victorrabyfs"#' hostgator-setup-kit/_common.sh
sed -i '' 's#local url="${1:-https://github.com/melgarafael/DeskcommCRM.git}" ref#local url="${1:-https://github.com/victorrabyfs/DeskcommCRM.git}" ref#' hostgator-setup-kit/_common.sh
sed -i '' 's#ghcr.io/melgarafael/deskcomm#ghcr.io/victorrabyfs/deskcomm#' docker-compose.prod.yml .env.hostgator.example
sed -i '' 's#https://github.com/melgarafael/DeskcommCRM.git#https://github.com/victorrabyfs/DeskcommCRM.git#' hostgator-setup-kit/install.sh hostgator-setup-kit/comecar.sh
sed -i '' 's#raw.githubusercontent.com/melgarafael/DeskcommCRM#raw.githubusercontent.com/victorrabyfs/DeskcommCRM#' hostgator-setup-kit/comecar.sh
sed -i '' 's#org.opencontainers.image.source="https://github.com/melgarafael/DeskcommCRM"#org.opencontainers.image.source="https://github.com/victorrabyfs/DeskcommCRM"#' Dockerfile Dockerfile.worker Dockerfile.scheduler Dockerfile.voice-agent
git diff --stat | tail -1
grep -n "melgarafael" hostgator-setup-kit/_common.sh docker-compose.prod.yml .env.hostgator.example hostgator-setup-kit/install.sh hostgator-setup-kit/comecar.sh Dockerfile Dockerfile.worker Dockerfile.scheduler Dockerfile.voice-agent
```
Expected: `10 files changed` (com o `_identidade-deste-repo.ts`). O `grep` só lista **comentários** de `_common.sh` (linhas ~1087-1095, prosa sobre o PR #605).

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run tests/unit/namespace-das-imagens.test.ts tests/unit/namespace-das-imagens-runtime-owner.test.ts
GITHUB_ACTIONS=true GITHUB_REPOSITORY_OWNER=victorrabyfs pnpm vitest run tests/unit/namespace-das-imagens.test.ts tests/unit/namespace-das-imagens-runtime-owner.test.ts
```
Expected: `17 passed` nas duas (a segunda simula o CI do fork).

- [ ] **Step 5: Kit em shell, contra a linha de base**

```bash
node -e 'console.log(require("./package.json").scripts["test:shell"].split(" && ").map(s=>s.replace(/^bash /,"")).join("\n"))' \
  | while read -r s; do bash "$s" </dev/null >/dev/null 2>&1; echo "$? $s"; done > /tmp/shell-t4.txt
diff /tmp/shell-base.txt /tmp/shell-t4.txt && echo "shell igual à base"
```
Expected: `shell igual à base`.

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
- Consumes: Task 4.
- Produces: `ultima_versao_publicada [url]` devolve, sem o `v`, a maior tag que seja exatamente `vX.Y.Z` ou `vX.Y.Z-cvx.N`.

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/convexy-ultima-versao.test.ts`:
```ts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Convexy: o fork publica versões `vX.Y.Z-cvx.N`. `ultima_versao_publicada`
 * (hostgator-setup-kit/_common.sh) é o que a instalação nova usa para escolher a
 * versão; no original ela descartava QUALQUER hífen e, no fork, instalaria a base
 * sem identidade (que nem tem imagem publicada no GHCR do fork).
 * Registro: CONVEXY.md, "Filtro de versão do kit".
 */

const RAIZ = process.cwd();
// Isola do git config de quem roda: um `versionsort.suffix` global inverteria a ordem.
const ENV_GIT = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };

function repoComTags(tags: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cvx-tags-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "ignore", env: ENV_GIT });
  git("init", "-q");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "base");
  for (const t of tags) git("tag", t);
  return dir;
}

function ultima(dir: string): { saida: string } {
  // stdout do `source` descartado; stderr não — um _common.sh quebrado aparece no log do teste,
  // e o último caso confere que a função existe (o "" não passa pelo motivo errado).
  const r = execFileSync(
    "bash",
    ["-c", 'source hostgator-setup-kit/_common.sh >/dev/null; ultima_versao_publicada "$1"', "teste", `file://${dir}`],
    { cwd: RAIZ, encoding: "utf8", env: ENV_GIT, stdio: ["ignore", "pipe", "inherit"] },
  );
  return { saida: r.trim() };
}

function comRepo(tags: string[], fn: (dir: string) => void) {
  const dir = repoComTags(tags);
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("ultima_versao_publicada no fork Convexy", () => {
  it("escolhe a maior -cvx.N acima da base", () => {
    comRepo(["v1.44.0", "v1.44.0-cvx.1", "v1.44.0-cvx.2", "v1.44.0-cvx.10"], (dir) => {
      expect(ultima(dir).saida).toBe("1.44.0-cvx.10");
    });
  });

  it("ignora release candidate, alpha, beta, maiúsculas e sufixo depois do -cvx.N", () => {
    comRepo(
      ["v1.44.0", "v1.44.0-cvx.10", "v1.44.0-rc1", "v1.44.0-RC3", "v1.45.0-alpha.1", "v1.45.0-beta.2", "v1.44.0-cvx.10-teste"],
      (dir) => {
        expect(ultima(dir).saida).toBe("1.44.0-cvx.10");
      },
    );
  });

  it("sem -cvx ainda, fica com a base", () => {
    comRepo(["v1.44.0", "v1.44.0-rc1"], (dir) => {
      expect(ultima(dir).saida).toBe("1.44.0");
    });
  });

  it("sem tag nenhuma devolve vazio, e o _common.sh carregou (a função existe)", () => {
    comRepo([], (dir) => {
      expect(ultima(dir).saida).toBe("");
      const tipo = execFileSync(
        "bash",
        ["-c", "source hostgator-setup-kit/_common.sh >/dev/null; type -t ultima_versao_publicada"],
        { cwd: RAIZ, encoding: "utf8" },
      ).trim();
      expect(tipo).toBe("function");
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/convexy-ultima-versao.test.ts`
Expected: FAIL em `escolhe a maior -cvx.N acima da base` e em `ignora release candidate…` (recebem `1.44.0`); os outros dois passam.

- [ ] **Step 3: Implementar**

Em `hostgator-setup-kit/_common.sh`, dentro de `ultima_versao_publicada`, trocar o comentário e o filtro (as duas linhas de `ref=…`):
```bash
  # Convexy: aceita SÓ `vX.Y.Z` e `vX.Y.Z-cvx.N` (as versões do fork). Todo outro
  # sufixo — `-rc1`, `-RC3`, `-alpha`, `-cvx.N-teste` — fica de fora. O
  # `--sort=-v:refname` do git põe o sufixo ACIMA do release final quando
  # `versionsort.suffix` não está configurado: é o que faz a `-cvx.N` vencer a base.
  ref="$(git ls-remote --tags --refs --sort=-v:refname "$url" 'v*' 2>/dev/null \
        | awk '{print $2}' | grep -E -- '^refs/tags/v[0-9]+\.[0-9]+\.[0-9]+(-cvx\.[0-9]+)?$' | head -1)" || return 0
```

- [ ] **Step 4: Rodar e ver passar**

```bash
pnpm vitest run tests/unit/convexy-ultima-versao.test.ts
bash hostgator-setup-kit/test-validators.sh 2>&1 | grep -iE "ultima_versao|✗" | head
```
Expected: `4 passed`; em `test-validators.sh` os casos de `ultima_versao_publicada` seguem ✓ (o único ✗ no macOS é o já conhecido "nome antigo com apóstrofo").

- [ ] **Step 5: Commit**

```bash
git add tests/unit/convexy-ultima-versao.test.ts hostgator-setup-kit/_common.sh
git commit -m "feat(convexy): instalação nova escolhe a maior versão -cvx.N

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: CHANGELOG aceita seções `-cvx.N`

**Files:**
- Create: `tests/unit/_convexy-cabecalho.ts`
- Create: `tests/unit/convexy-cabecalho-cvx.test.ts`
- Modify: `tests/unit/release-chega-na-lp.test.ts` (imports e o caso `toda seção do CHANGELOG segue o cabeçalho que a LP sabe ler`, ~280-286)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: Task 3.
- Produces: `CABECALHO_VERSAO_CONVEXY: RegExp` em `tests/unit/_convexy-cabecalho.ts` (grupo 1 = versão com sufixo, grupo 2 = data); seção `## [1.44.0-cvx.1]` no CHANGELOG.

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
Expected: FAIL — `Failed to resolve import "./_convexy-cabecalho"`.

- [ ] **Step 3: Implementar a regex e usá-la na régua do original**

`tests/unit/_convexy-cabecalho.ts` (sem `.test`: o vitest não coleta — mesmo padrão de `_identidade-deste-repo.ts`):
```ts
/**
 * Cabeçalho de versão do CHANGELOG no fork Convexy: o do original
 * (deskcomm-site/lib/changelog.ts, CABECALHO_VERSAO) mais o sufixo `-cvx.N`.
 * Registro: CONVEXY.md, "Cabeçalho do CHANGELOG".
 */
export const CABECALHO_VERSAO_CONVEXY =
  /^## \[(\d+\.\d+\.\d+(?:-cvx\.\d+)?)\]\s*[—–-]\s*(\d{4}-\d{2}-\d{2})\s*$/;
```

Em `tests/unit/release-chega-na-lp.test.ts`, acrescentar aos imports do topo:
```ts
import { CABECALHO_VERSAO_CONVEXY } from "./_convexy-cabecalho";
```
e, no caso `toda seção do CHANGELOG segue o cabeçalho que a LP sabe ler`, trocar
```ts
    const CABECALHO_VERSAO = /^## \[(\d+\.\d+\.\d+)\]\s*[—–-]\s*(\d{4}-\d{2}-\d{2})\s*$/;
```
por
```ts
    // Convexy: aceita também `X.Y.Z-cvx.N` (tests/unit/_convexy-cabecalho.ts; CONVEXY.md).
    const CABECALHO_VERSAO = CABECALHO_VERSAO_CONVEXY;
```

- [ ] **Step 4: Seção da `-cvx.1` no CHANGELOG**

Em `CHANGELOG.md`, entre `## [Não lançado]` e `## [1.44.0] — 2026-09-23`, inserir (trocar `AAAA-MM-DD` pela saída de `date +%F` no dia do merge):
```markdown
## [1.44.0-cvx.1] — AAAA-MM-DD

Primeira versão da Convexy, sobre a 1.44.0 do DeskcommCRM. Não muda nada na tela: a partir dela as atualizações chegam pelo repositório da Convexy (`victorrabyfs/DeskcommCRM`) e as imagens vêm de `ghcr.io/victorrabyfs`.

### ⚠️ Requer atenção

- Instalação que vinha do DeskcommCRM original: antes de atualizar, troque o `origin` para o repositório da Convexy e apague as tags antigas — procedimento em `CONVEXY.md`, "Migrar uma VPS do original para o fork". O botão "Atualizar" não aparece nesta transição; atualize com `bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.1`.

```

- [ ] **Step 5: Rodar e ver passar — a régua nova e as 13 que leem o CHANGELOG**

```bash
pnpm vitest run tests/unit/convexy-cabecalho-cvx.test.ts tests/unit/release-chega-na-lp.test.ts \
  tests/unit/changelog-cabe-na-tela-da-vps.test.ts tests/unit/acervo-do-changelog-cobra-a-casa.test.ts \
  lib/system/changelog.test.ts lib/release/montar-secao.test.ts app/api/v1/system/version/route.test.ts \
  tests/unit/branding.test.ts tests/unit/fragmentos-de-release.test.ts tests/unit/guarda-da-release-confere-identidade.test.ts \
  tests/unit/guarda-da-release-reconhece-o-corte.test.ts tests/unit/opt-out-deteccao.test.ts \
  tests/unit/tag-so-nasce-da-main.test.ts tests/unit/triagem-termina-na-versao.test.ts
pnpm release:acervo-cabe
```
Expected: todos PASS (medido na revisão: 348 casos); `release:acervo-cabe` exit 0. Contraprova opcional: com a regex antiga e a seção `-cvx.1`, `release-chega-na-lp` reprova 1 caso.

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
- Consumes: Tasks 4–6.
- Produces: registro que as etapas seguintes vão acrescentando; o procedimento que a nota da `-cvx.1` cita.

- [ ] **Step 1: Gerar a lista "fica apontando para o original", por categoria**

```bash
git grep -ln melgarafael -- . ':!*.md' | sort > /tmp/ficam.txt; wc -l < /tmp/ficam.txt
for cat in '^\.github/' '^(tests/|lib/.*\.test\.ts$|hostgator-setup-kit/test-)' '^(evidence|triagem)/' '^(extensoes)/' '^(scripts|infra|ubuntu-local-installer\.sh|hostgator-setup-kit/diagnostico\.sh|\.claude|\.agents)' ; do
  echo "== $cat"; grep -E "$cat" /tmp/ficam.txt
done
echo "== outros"; grep -vE '^\.github/|^(tests/|lib/.*\.test\.ts$|hostgator-setup-kit/test-)|^(evidence|triagem)/|^extensoes/|^(scripts|infra|ubuntu-local-installer\.sh|hostgator-setup-kit/diagnostico\.sh|\.claude|\.agents)' /tmp/ficam.txt
```
Expected: ~42 arquivos. `hostgator-setup-kit/_common.sh` aparece em "outros" (só comentários). Os demais de "outros" (ex.: `.mailmap`, `public/llms.txt`) entram na categoria "outros" do `CONVEXY.md` com uma linha de motivo cada.

- [ ] **Step 2: Escrever `CONVEXY.md`**

Criar com este conteúdo, colando nas marcações `(saída do Step 1: …)` as listas do Step 1 em blocos de código:

````markdown
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

- **Workflows (guardas e comentários — só agem no original):** (saída do Step 1: `^\.github/`)
- **Testes-guarda (conferem o original ou citam em prosa):** (saída do Step 1: testes)
- **Evidência, triagem e fixtures (registro histórico):** (saída do Step 1: `evidence|triagem`)
- **Dados das extensões oficiais (`repository` — elas são do original):** (saída do Step 1: `extensoes`)
- **Scripts fora da cadeia de atualização:** (saída do Step 1: `scripts|infra|…`)
- **Outros:** (saída do Step 1: "outros", uma linha de motivo por arquivo; `hostgator-setup-kit/_common.sh` = só comentários históricos)
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
````

- [ ] **Step 3: Conferir e commitar**

```bash
grep -n "saída do Step 1" CONVEXY.md || echo "sem marcações pendentes"
pnpm vitest run tests/unit/documentacao-aponta-para-o-que-existe.test.ts tests/unit/evidencia-citada.test.ts tests/unit/traducao-nao-defasa.test.ts
git add CONVEXY.md
git commit -m "docs(convexy): CONVEXY.md — registro das alterações do fork

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: `sem marcações pendentes`; os três testes PASS.

---

### Task 8 [GitHub]: Publicar a `v1.44.0-cvx.1`

**Files:** nenhum novo.

**Interfaces:**
- Consumes: Tasks 4–7 em `convexy/identidade`.
- Produces: `main` do fork com a etapa 2; quatro pacotes GHCR públicos com `1.44.0-cvx.1`; `stable` = `1.44.0-cvx.1`.

- [ ] **Step 1: Suítes locais**

```bash
NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck && pnpm lint
pnpm test:unit > /tmp/vt.log 2>&1; echo "exit=$?"; grep -aE "Test Files|Tests |Errors " /tmp/vt.log | tail -3
node -e 'console.log(require("./package.json").scripts["test:shell"].split(" && ").map(s=>s.replace(/^bash /,"")).join("\n"))' \
  | while read -r s; do bash "$s" </dev/null >/dev/null 2>&1; echo "$? $s"; done > /tmp/shell-t8.txt; diff /tmp/shell-base.txt /tmp/shell-t8.txt && echo "shell igual à base"
```
Expected: typecheck e lint exit 0 (lint: 0 erros; os warnings já existentes); Vitest `exit=0`, sem `failed` e sem linha `Errors`; `shell igual à base`.

- [ ] **Step 2: Workflows conferidos, PR e CI**

Pedir confirmação ao Victor. Depois:
```bash
gh workflow list --all -R victorrabyfs/DeskcommCRM --json path,state --jq '.[]|[.path,.state]|@tsv'
git push -u origin convexy/identidade
gh pr create -R victorrabyfs/DeskcommCRM --base main --head convexy/identidade \
  --title "Convexy etapa 2: fork com imagens próprias (1.44.0-cvx.1)" \
  --body "Etapa 2 da spec docs/superpowers/specs/2026-09-22-identidade-convexy-design.md (seção 6). Sem mudança visual. Destino: instalação do fork.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
until [ "$(gh pr checks convexy/identidade -R victorrabyfs/DeskcommCRM --json name --jq length 2>/dev/null || echo 0)" -gt 0 ]; do sleep 10; done
gh pr checks convexy/identidade -R victorrabyfs/DeskcommCRM --watch --required
```
Expected: estados dos workflows iguais aos da Task 2 Step 5; a URL do PR é `https://github.com/victorrabyfs/DeskcommCRM/pull/…`; os cinco obrigatórios verdes. Vermelho: corrigir na branch, nunca desligar check.

- [ ] **Step 3: Merge por merge commit e primeira publicação**

```bash
gh pr merge convexy/identidade -R victorrabyfs/DeskcommCRM --merge
gh pr view convexy/identidade -R victorrabyfs/DeskcommCRM --json state,mergeCommit --jq '.state, .mergeCommit.oid'
sha=$(gh pr view convexy/identidade -R victorrabyfs/DeskcommCRM --json mergeCommit --jq .mergeCommit.oid)
until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow publish-image.yml --branch main --commit "$sha" --limit 5 --json databaseId --jq '.[0].databaseId // empty') && [ -n "$id" ]; do sleep 10; done
gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status
```
Expected: `MERGED` e o sha do merge; o run do `publish-image` da `main` termina com sucesso (publica `latest`/`main` e cria os quatro pacotes, privados).

- [ ] **Step 4: Tornar os quatro pacotes públicos (Victor, pela tela)**

Em `https://github.com/victorrabyfs?tab=packages`, para `deskcommcrm`, `deskcomm-worker`, `deskcomm-scheduler`, `deskcomm-voice-agent`: Package settings › Change visibility › Public (a API não permite). Conferir:
```bash
for i in deskcommcrm deskcomm-worker deskcomm-scheduler deskcomm-voice-agent; do
  t=$(curl -s "https://ghcr.io/token?scope=repository:victorrabyfs/$i:pull&service=ghcr.io" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  curl -s -o /dev/null -w "$i %{http_code}\n" -H "Authorization: Bearer $t" \
    -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.docker.distribution.manifest.v2+json" \
    "https://ghcr.io/v2/victorrabyfs/$i/manifests/latest"
done
```
Expected: `200` nas quatro.

- [ ] **Step 5: Tag e publicação da versão**

```bash
git fetch origin main
test "$(gh pr view convexy/identidade -R victorrabyfs/DeskcommCRM --json state --jq .state)" = MERGED || { echo "PR não está MERGED — não criar tag"; exit 1; }
git tag -a v1.44.0-cvx.1 -m "Convexy 1.44.0-cvx.1 — fork com imagens próprias" origin/main
git push origin v1.44.0-cvx.1
until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow publish-image.yml --event push --limit 20 --json databaseId,headBranch --jq '[.[]|select(.headBranch=="v1.44.0-cvx.1")][0].databaseId // empty') && [ -n "$id" ]; do sleep 5; done
gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status
git ls-remote --tags origin
```
Expected: run verde (inclui `a-tag-veio-da-main` e `promover-stable`); `ls-remote` lista só `v1.44.0` (+`^{}`) e `v1.44.0-cvx.1` (+`^{}`).

- [ ] **Step 6: Conferir as imagens publicadas**

```bash
digest_de() { local i=$1 ref=$2 t; t=$(curl -s "https://ghcr.io/token?scope=repository:victorrabyfs/$i:pull&service=ghcr.io" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  curl -sI -H "Authorization: Bearer $t" -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.docker.distribution.manifest.v2+json" \
    "https://ghcr.io/v2/victorrabyfs/$i/manifests/$ref" | awk 'tolower($1)=="docker-content-digest:"{print $2} /^HTTP/{print $2}' | tr -d '\r' | paste -sd' ' -; }
for i in deskcommcrm deskcomm-worker deskcomm-scheduler deskcomm-voice-agent; do
  echo "$i cvx1=$(digest_de $i 1.44.0-cvx.1) stable=$(digest_de $i stable) um44=$(digest_de $i 1.44)"
done
```
Expected: em cada imagem, `cvx1` e `stable` com `200` e **o mesmo digest**; `um44` com `404` (pré-release não gera `1.44`).

---

### Task 9 [VPS]: Migrar a VPS para o fork (`-cvx.1`)

**Files:** `CONVEXY.md` (saída real da migração).

**Interfaces:**
- Consumes: Task 0 (VPS em `v1.44.0`), Task 8 (imagens públicas).
- Produces: VPS em `1.44.0-cvx.1`, `origin` = fork, só tags `v1.44.0`/`-cvx.*`.

- [ ] **Step 1: Confirmação.** Pedir confirmação ao Victor (fora do expediente das clínicas).

- [ ] **Step 2: Pré-voo — parada obrigatória**

```bash
cat > /tmp/prevoo.sh <<'SH'
set -u
falhou=0
for i in deskcommcrm deskcomm-worker deskcomm-scheduler deskcomm-voice-agent; do
  t=$(curl -s "https://ghcr.io/token?scope=repository:victorrabyfs/$i:pull&service=ghcr.io" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  c=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $t" \
    -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.docker.distribution.manifest.v2+json" \
    "https://ghcr.io/v2/victorrabyfs/$i/manifests/1.44.0-cvx.1")
  echo "$i $c"; [ "$c" = 200 ] || falhou=1
done
cd /opt/deskcommcrm || exit 1
[ "$(git describe --tags --exact-match HEAD 2>/dev/null)" = "v1.44.0" ] || { echo "VPS fora da base"; falhou=1; }
curl -s https://<dominio-de-producao>/api/v1/health | grep -q '"1.44.0"' || { echo "health não é 1.44.0"; falhou=1; }
[ -z "$(git config --get versionsort.suffix)" ] || { echo "versionsort.suffix configurado"; falhou=1; }
command -v tmux >/dev/null || { echo "sem tmux"; falhou=1; }
[ "$falhou" = 0 ] && echo OK || { echo "PRÉ-VOO FALHOU — não seguir"; exit 1; }
SH
scp /tmp/prevoo.sh <host-ssh>:/tmp/prevoo.sh && ssh <host-ssh> 'bash /tmp/prevoo.sh'
```
Expected: quatro `200` e `OK`. Qualquer outra saída: **parar**. "VPS fora da base" (alguém clicou em Atualizar): parar e escalar ao Victor — a spec manda refazer a base na versão em produção (seção 8), que é um plano novo.

Na tela `https://<dominio-de-producao>/app/settings/atualizacao` (Victor): nenhuma atualização pedida nem em andamento — um pedido pendente dispararia um segundo `update.sh` depois da troca.

- [ ] **Step 3: Backup do `.env`**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && cp -p .env ".env.bak-$(date +%Y%m%d)" && ls -l .env*'
```

- [ ] **Step 4: Trocar o remoto e limpar as tags, numa linha só**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git remote set-url origin https://github.com/victorrabyfs/DeskcommCRM.git && git tag -l > /root/tags-antes-$(date +%Y%m%d).txt && git tag -l | xargs -r git tag -d >/dev/null && git fetch --tags origin && git tag -l'
```
Expected: exatamente `v1.44.0` e `v1.44.0-cvx.1`.

- [ ] **Step 5: Guarda contra tag intrusa e atualização, no `tmux`**

```bash
cat > /tmp/migra.sh <<'SH'
cd /opt/deskcommcrm || exit 1
intrusas="$(git tag -l | grep -vE '^v1\.44\.0(-cvx\.[0-9]+)?$')"
if [ -n "$intrusas" ]; then
  echo "TAG INTRUSA — repetir o Step 4:"; echo "$intrusas"
else
  bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.1 2>&1 | tee "/root/update-$(date +%Y%m%d-%H%M)-cvx1.log"
fi
echo FIM; read -r _
SH
scp /tmp/migra.sh <host-ssh>:/tmp/migra.sh && ssh -t <host-ssh> 'tmux new -s migra "bash /tmp/migra.sh"'
```
Expected: sem `TAG INTRUSA`; o `update.sh` termina com sucesso, sem construir imagem local; `FIM`. Se aparecer `TAG INTRUSA`: repetir o Step 4 e este Step. Se o SSH cair: `ssh -t <host-ssh> 'tmux attach -t migra'`.

**Se o `update.sh` falhar ou o Step 6 não bater:** parar, guardar o log e perguntar ao Victor. Rollback para o original (comando em `CONVEXY.md`, "Rollback para o original"; não ensaiado) só com a aprovação dele; depois do rollback, **não clicar** em "Atualizar" (a tela vai oferecer a última do original).

- [ ] **Step 6: Verificar**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; grep -E "^(APP|WORKER|SCHEDULER|VOICE_AGENT)_IMAGE=" .env; git tag -l; curl -s -o /dev/null -w "%{http_code}\n" https://<dominio-de-producao>/; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300'
```
Expected: `v1.44.0-cvx.1`; as quatro `*_IMAGE` em `ghcr.io/victorrabyfs/…:1.44.0-cvx.1`; tags só `v1.44.0`/`v1.44.0-cvx.1`; `307`; health com `1.44.0-cvx.1`. Login pela tela, claro e escuro, igual a antes.

- [ ] **Step 7: Registrar a saída real**

```bash
git fetch origin main && git switch -c convexy/cvx-2 origin/main
```
Em `CONVEXY.md`, na linha "Saída real da migração da `<dominio-de-producao>`", trocar "(acrescentada na Task 9)" pela data e pelas saídas dos Steps 2, 4 e 6 em blocos de código.
```bash
git add CONVEXY.md && git commit -m "docs(convexy): saída real da migração da VPS

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

Em `CHANGELOG.md`, entre `## [Não lançado]` e `## [1.44.0-cvx.1] — …`, inserir (trocar `AAAA-MM-DD` por `date +%F` do dia do merge):
```markdown
## [1.44.0-cvx.2] — AAAA-MM-DD

Sem mudança na tela. Confirma que as atualizações da Convexy chegam pelo botão "Atualizar".

```
(Esta versão também leva o registro da migração no `CONVEXY.md` — além do que a spec 5.2 descreve, inofensivo.)

- [ ] **Step 2: Testes, PR e merge**

```bash
pnpm vitest run tests/unit/release-chega-na-lp.test.ts tests/unit/convexy-cabecalho-cvx.test.ts tests/unit/changelog-cabe-na-tela-da-vps.test.ts
git add CHANGELOG.md && git commit -m "chore(convexy): 1.44.0-cvx.2

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
gh workflow list --all -R victorrabyfs/DeskcommCRM --json path,state --jq '.[]|[.path,.state]|@tsv'
git push -u origin convexy/cvx-2
gh pr create -R victorrabyfs/DeskcommCRM --base main --head convexy/cvx-2 --title "Convexy 1.44.0-cvx.2" --body "Ensaio do botão Atualizar (spec 5.2) e saída real da migração no CONVEXY.md. Destino: instalação do fork.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
until [ "$(gh pr checks convexy/cvx-2 -R victorrabyfs/DeskcommCRM --json name --jq length 2>/dev/null || echo 0)" -gt 0 ]; do sleep 10; done
gh pr checks convexy/cvx-2 -R victorrabyfs/DeskcommCRM --watch --required
gh pr merge convexy/cvx-2 -R victorrabyfs/DeskcommCRM --merge
```
Expected: testes PASS; workflows como na Task 2; CI verde; merge feito.

- [ ] **Step 3: Tag e publicação**

```bash
git fetch origin main
test "$(gh pr view convexy/cvx-2 -R victorrabyfs/DeskcommCRM --json state --jq .state)" = MERGED || { echo "PR não está MERGED — não criar tag"; exit 1; }
git tag -a v1.44.0-cvx.2 -m "Convexy 1.44.0-cvx.2 — ensaio do botão Atualizar" origin/main
git push origin v1.44.0-cvx.2
until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow publish-image.yml --event push --limit 20 --json databaseId,headBranch --jq '[.[]|select(.headBranch=="v1.44.0-cvx.2")][0].databaseId // empty') && [ -n "$id" ]; do sleep 5; done
gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status
git ls-remote --tags origin
```
Expected: run verde; `ls-remote` lista `v1.44.0`, `v1.44.0-cvx.1`, `v1.44.0-cvx.2` (cada uma com `^{}`). A conferência da Task 8 Step 6 com `1.44.0-cvx.2` dá `200` e o mesmo digest de `stable`.

- [ ] **Step 4: Aplicar pelo botão (Victor)**

Esperar até 5 min (ciclo do agente). Em `/app/settings/atualizacao` deve aparecer `1.44.0-cvx.2` com as notas "Sem mudança na tela…". Clicar em "Atualizar". Depois:
```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; git tag -l; grep -E "^APP_IMAGE=" .env; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300'
```
Expected: `v1.44.0-cvx.2`; tags só `v1.44.0`, `-cvx.1`, `-cvx.2`; `APP_IMAGE=ghcr.io/victorrabyfs/deskcommcrm:1.44.0-cvx.2`; health `1.44.0-cvx.2`. Se o botão não aparecer em 10 min: `git tag -l` na VPS (tag intrusa → repetir a limpeza da Task 9 Step 4) e o manifesto `1.44.0-cvx.2` público (Task 8 Step 6).

---

## Pronto quando (spec 6.4)

- `/api/v1/health` responde `1.44.0-cvx.1` (Task 9), depois `1.44.0-cvx.2` aplicada pelo botão (Task 10);
- `.env` da VPS aponta as quatro imagens para `ghcr.io/victorrabyfs` (Task 9 Step 6, Task 10 Step 4);
- `git tag -l` na VPS só lista `v1.44.0` e `v1.44.0-cvx.*` (Tasks 9 e 10);
- rollback documentado no `CONVEXY.md` (Task 7), sem ensaio em VM (decisão de 23/09).
