# Identidade Convexy no fork do DeskcommCRM — design

- **Data:** 2026-09-22 (revisão 4, 2026-09-23 — base `v1.44.0`; etapa 3 dividida em três versões;
  incorpora a terceira rodada de revisão: conferência de fatos, simulação do operador e
  viabilidade da implementação)
- **Status:** aprovada em 2026-09-23 (etapa 3 em três versões confirmada)
- **Repositório:** `victorrabyfs/DeskcommCRM` (fork de `melgarafael/DeskcommCRM`)
- **Base:** release `v1.44.0` do original (tag `39b62486`, commit `7dbbf87`). Produção em
  `https://<dominio-de-producao>` roda hoje a `v1.43.0` e sobe para a `v1.44.0` no passo 0 (5.0).

Entre `v1.43.0` e `v1.44.0` (37 commits) nenhum arquivo citado nas seções 6 e 7 mudou, exceto
`CHANGELOG.md`, `lib/i18n/dicionario.ts`, `supabase/baseline.sql` (+12 linhas, na 37142, longe do
trecho da 7.3.1) e `MANIFEST.md`. As referências `arquivo:linha` valem para a `v1.44.0` (≈ 95
conferidas uma a uma na revisão 4).

## 1. Objetivo

A plataforma inteira aparece como **Convexy** — nome, cores, fontes, logo claro e escuro — com
**uma identidade só para todas as clínicas**. A restrição que governa o desenho: **continuar
recebendo as atualizações do original sem perder a identidade**. Por isso: configuração antes de
código; código da Convexy em arquivos novos; alteração em arquivo do original só quando não há
outro caminho, pequena, posta em região estável do arquivo e registrada em `CONVEXY.md`; docs do
original não são editados (o que deixa de valer no fork é registrado no `CONVEXY.md`).

## 2. Decisões

| Decisão | Escolha |
|---|---|
| Onde vive o código próprio | Fork `victorrabyfs/DeskcommCRM`; original como remoto `upstream` |
| Contribuir de volta | **Não** |
| Base | `v1.44.0`, **congelada** até a etapa 3 estar validada em produção (seção 8 define a cadência depois) |
| Logo | Enviado pela tela `/admin/marca` (PNG/JPG): **um campo para o tema claro (o que já existe) e um novo para o tema escuro**. Nada de logo embutido no código |
| Marca por clínica (`/app/settings/marca`) | **Desligada** por chave de instalação (decisão de 23/09). A decisão de 22/09 — "marca por plano, enterprise com marca própria" — fica para a spec de SaaS, que troca a chave por regra de plano |
| Domínio por clínica | Fora (só SaaS em `<dominio-de-producao>`) |
| Entrega | Passo 0 → etapa 1 (configuração) → etapa 2 (fork só com infraestrutura, `-cvx.1`/`-cvx.2`) → etapa 3 em três versões: `-cvx.3` paleta e fontes, `-cvx.4` logo escuro, `-cvx.5` marca das clínicas desligada |

## 3. Fora de escopo

- SaaS (teste 7/14/30 dias, planos, cobrança, marca por plano) e Instagram direto — specs próprias.
- Ícone próprio na barra lateral recolhida e no favicon: continuam a inicial "C" sobre a cor da
  marca (`app/icon.tsx`, `components/shell/Sidebar.tsx:163-171`).
- Números de destaque em Lexend Deca, e Lexend em títulos que não são `h1–h3` (ex.: `CardTitle`
  é `<div>` — `components/ui/card.tsx:36`): exigiria classe em componentes do original.
- Fundo dos e-mails (convite, LGPD, GoTrue), régua de contraste do produto e as cores fixas
  listadas em 7.2.4: continuam os neutros do original.
- Logo escuro em e-mail, ícone, manifest e MFA (usam `marcaDaSaida`, tema claro sempre).
- `app/design/`, `public/llms.txt`, `global-error.tsx`, docs do original e referências ao
  original fora da cadeia de atualização (6.2) — ficam como estão, registradas no `CONVEXY.md`.

## 4. Identidade de origem

Medida no CRM atual (`<frontend-atual>` na VPS): fontes **Inter** (texto) e **Lexend
Deca** (títulos); marca `#146BFF`; tinta `#0B0D10`; fundo claro `#F8FAFC`; escuro: fundo
`#0B0D10`, cartão `#131923`, popover `#171E2A`. Logos em SVG (logo-light-v3.svg,
logo-dark-v3.svg) — **exportar em PNG** (altura ≥ 96 px, fundo transparente, ≤ 512 KB) para
enviar pela tela, que recusa SVG por segurança.

## 5. Entregas

Todo comando na VPS roda de `/opt/deskcommcrm` (`enter_project` procura o compose no diretório
atual — `_common.sh:833-837`).

### 5.0 Passo 0 — produção na base (antes da etapa 2)

1. `cd /opt/deskcommcrm && bash hostgator-setup-kit/update.sh --to v1.44.0`. **Não pelo botão**:
   o botão instala a maior tag do original (`agent.sh:131,329`), que a esta altura já não é a
   `v1.44.0`. O `update.sh` completa histórico raso sozinho (`_common.sh:759-771`).
2. Conferir `/api/v1/health` = `1.44.0` e `git describe --tags --exact-match HEAD` = `v1.44.0`.
3. **Daí até a migração (6.4), ninguém clica em "Atualizar"** — a tela seguirá oferecendo versões
   novas do original. Se alguém clicar e a VPS sair da base, parar e refazer a base (seção 8) na
   versão em produção; não tentar voltar a VPS (6.4 explica o que o `update.sh` recusa e o que
   deixa passar).

### 5.1 Etapa 1 — Configuração, sem código (parcial)

Feito em 2026-09-23:
- `/admin/marca`: nome **Convexy**, cor **#146bff**, logo claro enviado.
- `.env` da VPS: `APP_NAME="Convexy"` (lido direto por login, cadastro, boas-vindas e textos
  legais — `lib/branding.ts:99-105`), `APP_ACCENT_HEX="#146bff"`, `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL="nao-responda@convexy.tech"`.

Pendente do operador:
- SMTP do Resend no Supabase (painel do projeto `<projeto-supabase>`).
- Modelos de e-mail do GoTrue: `SUPABASE_ACCESS_TOKEN=… bash hostgator-setup-kit/marca-emails.sh`
  (sobe pela Management API — `marca-emails.sh:261-290`; o Supabase é na nuvem). `--render-em` só
  gera o HTML (`:235-257`).

**Pronto quando:** título da aba e texto do login dizem "Convexy"; convite de equipe chega por
e-mail pelo Resend; e-mails de acesso chegam com assunto "… — Convexy".

### 5.2 Etapa 2 — `v1.44.0-cvx.1` e `-cvx.2`: fork só com infraestrutura

Nenhuma mudança visual. Ensaia, com diff trivial, o que é arriscado: numeração, imagens próprias,
botão "Atualizar", rollback. A `-cvx.1` é a migração (manual); a `-cvx.2` só acrescenta sua seção
no `CHANGELOG.md` e prova que o botão oferece e aplica uma versão Convexy. Conteúdo na seção 6.

### 5.3 Etapa 3 — identidade visual, em três versões

Cada versão tem seu plano, sua seção no `CHANGELOG.md`, seu rollback e sua validação em
produção antes da seguinte. Conteúdo na seção 7.

| Versão | Conteúdo | Banco | `.env` | Rollback |
|---|---|---|---|---|
| `-cvx.3` | Paleta, fontes, barra do navegador (7.2) | não | não | trivial |
| `-cvx.4` | Logo escuro (7.3) | migration 9001 | não | coluna fica, inofensiva |
| `-cvx.5` | Marca das clínicas desligada (7.4) | não | `ORG_BRANDING_ENABLED=false` | marcas de organização voltam |

`-cvx.4` e `-cvx.5` mexem em `app/api/v1/marca/logo/route.ts`: nessa ordem.

## 6. Etapa 2 — infraestrutura do fork

### 6.1 Repositório (ordem obrigatória)

1. **No clone de trabalho:**
   - `gh repo set-default victorrabyfs/DeskcommCRM`; todo comando `gh` desta spec leva
     `-R victorrabyfs/DeskcommCRM` (num fork, `gh` e o botão "Compare & pull request" miram o
     original por padrão — contrariaria "Contribuir de volta: Não");
   - `git tag -d v1.42.0 v1.43.0` (tags do original já presentes no clone; um `--tags` ou
     `--follow-tags` as empurraria e, com Actions ligadas, publicaria `victorrabyfs/*:1.43.0` e
     moveria `stable` para trás — `publish-image.yml:453,477-483`);
   - `git config remote.upstream.tagOpt --no-tags`; toda versão do original é buscada para um
     espaço privado: `git fetch --no-tags upstream refs/tags/vA.B.C:refs/upstream-tags/vA.B.C`.
   Motivo geral: o agente anuncia a maior tag `v*` que existir, sem olhar procedência
   (`agent.sh:131`), e `v1.45.0 > v1.44.0-cvx.N` (6.3). Tags vão para o fork **pelo nome**
   (`git push origin v1.44.0-cvx.N`), nunca `--tags`/`--follow-tags`. O ruleset (passo 5) tem
   bypass do dono — que é quem empurra —, então essa disciplina é a proteção real.
2. **A tag da base, uma única vez, com as Actions do fork ainda desligadas:**
   `git fetch --no-tags upstream refs/tags/v1.44.0:refs/tags/v1.44.0 && git push origin
   refs/tags/v1.44.0` (objeto original, sem recriar). Serve ao rollback para o original (6.4). É a
   única tag do original que o fork terá (8.5). Vai **antes** da `main`: se as Actions estivessem
   ligadas por engano, `a-tag-veio-da-main` compararia `main...7dbbf87`, veria `ahead` e reprovaria
   — nada publicado, `stable` parado (`publish-image.yml:153-163`). Na ordem inversa a `v1.44.0`
   publicaria e moveria `stable`.
3. **`main` do fork avança para a base** (fast-forward; `6c73680` é ancestral, conferido):
   `git push origin 'refs/upstream-tags/v1.44.0^{commit}:refs/heads/main'`.
4. **Actions:** em fork os workflows nascem desligados. Ligar só os quatro necessários —
   `gh workflow enable -R victorrabyfs/DeskcommCRM ci.yml e2e.yml perf.yml publish-image.yml` — e
   conferir com `gh workflow list --all -R …` que `release.yml`, `relogio.yml` e
   `vigia-de-colisao.yml` seguem desligados (se a tela obrigar a ligar todos: desligar esses três
   **antes de qualquer push**). Se o `release.yml` escapar, ele falha sem os secrets e o corte de
   tag só roda no original (`release.yml:479`): um run vermelho, não uma tag. `ci`, `e2e` e `perf`
   não precisam de secret além do `GITHUB_TOKEN`; sem `vars.EXECUTOR_PROPRIO` rodam em
   `ubuntu-latest`.
5. **Segurança da cadeia.** Depois da troca, quem cria tag `v*` no fork executa bash como root na
   VPS após um clique (`agent.sh` → `update.sh:160,178,185`; sem verificação de assinatura).
   - 2FA na conta; nenhum colaborador com escrita;
   - **ruleset de tag** sobre `refs/tags/v*`: criação, atualização e remoção restritas, bypass só
     do dono;
   - proteção da `main` exigindo `verify`, `invariants`, `build-and-size`, `e2e`, `imagens-ok`
     (`ci.yml:452,603`, `perf.yml:21`, `e2e.yml:1933`, `publish-image.yml:805`); **sem** "Require
     linear history"; merge de PR **só por merge commit** (squash/rebase de um merge do original
     apaga a ancestralidade com `vA.B.C` e o merge seguinte conflita em tudo);
   - **tag publicada nunca é refeita** — corrigir é `N+1`;
   - `a-tag-veio-da-main` (`publish-image.yml`) fica como está;
   - cada merge do original (seção 8) é revisão de segurança, não só de conflito.
6. Criar `CONVEXY.md` nesta etapa (formato em 7.1).
7. A branch `convexy/identidade` nasceu sobre a `v1.42.0`: recriá-la a partir da `main` do fork
   (depois do passo 3) trazendo só os commits de `docs/superpowers/`.
8. **Primeira publicação dos pacotes:** o merge da etapa 2 na `main` publica `latest`/`main`
   (`publish-image.yml:229-239`) e cria os quatro pacotes GHCR **privados**. Esperar esse run,
   tornar os quatro públicos e só então criar a tag `v1.44.0-cvx.1`.

### 6.2 Troca de namespace e ajustes do kit

Cobrados por `tests/unit/namespace-das-imagens.test.ts` (`RECADO_AO_FORK` — o teste não muda):

| Arquivo | Alteração |
|---|---|
| `hostgator-setup-kit/_common.sh` | `IMG_NS="ghcr.io/victorrabyfs"` (`:1046`); URL padrão de `ultima_versao_publicada`; filtro de versão (abaixo) |
| `docker-compose.prod.yml` | `image:` padrão de `app`, `worker`, `scheduler` e `voice-agent` |
| `.env.hostgator.example` | `*_IMAGE` |
| `tests/unit/_identidade-deste-repo.ts` | `NAMESPACE_DESTE_REPO = "ghcr.io/victorrabyfs"` (e dono) |
| `hostgator-setup-kit/install.sh`, `comecar.sh` | `REPO_URL` padrão (e o `curl` do comentário de uso, `comecar.sh:12`) |
| `Dockerfile`, `Dockerfile.worker`, `Dockerfile.scheduler`, `Dockerfile.voice-agent` | label `org.opencontainers.image.source` → fork |

Ajustes além do namespace:

| Arquivo | Alteração | Motivo |
|---|---|---|
| `hostgator-setup-kit/_common.sh:1068-1073` | `ultima_versao_publicada` aceita `-cvx.N` (`grep -v -- '-'` → `grep -vE -- '-(rc|alpha|beta)'`) | Sem isso, instalação nova pega a versão sem hífen, não acha a imagem no fork e cai para `stable` sobre o código do topo da `main` (`install.sh:866,1242`) |
| `tests/unit/release-chega-na-lp.test.ts:280-286` | regex do cabeçalho aceita `(-cvx\.\d+)?` | Sem isso a seção `## [1.44.0-cvx.1]` reprova o `verify` |

**Quatro imagens**: `deskcommcrm`, `deskcomm-worker`, `deskcomm-scheduler`,
`deskcomm-voice-agent` — **todas públicas** (6.1.8). `docker login` não serve: `ghcr_status`
consulta com token anônimo (`_common.sh:1096-1108`).

**Ficam apontando para o original**, de propósito, e o `CONVEXY.md` guarda a lista gerada por
`git grep -n melgarafael` no momento do corte, por categoria (nenhuma está na cadeia de
atualização da VPS):
- instruções de instalação e docs: `README*.md`, `docs/deploy-hostgator/`, `docs/deploy-selfhost/`,
  `docs/SETUP.md`, `hostgator-setup-kit/README.md`, `hostgator-setup-kit/CLAUDE.md`,
  `.claude/`/`.agents/skills/deskcomm-instalar/**`, `CONTRIBUTING.md`, `SECURITY.md`,
  `.github/ISSUE_TEMPLATE/*`;
- scripts fora da cadeia: `ubuntu-local-installer.sh`, `hostgator-setup-kit/diagnostico.sh`,
  `scripts/instalar-guias.sh`, `scripts/cortar-release.ts`, `scripts/vigia-colisao-de-migration.ts`,
  `infra/executor-proprio/*.sh`, `.claude/`/`.agents/skills/deskcomm-contribuir/scripts/*`;
- dados: `extensoes/catalogo.json`, `extensoes/loja.json` (`repository` das extensões oficiais —
  elas são do original);
- guardas de repositório (workflows e testes que só agem no original): não mudam.

### 6.3 Versões

- Formato `vX.Y.Z-cvx.N`, `X.Y.Z` = versão do original na base, `N` cresce e nunca se repete.
  Medido (git 2.53): `git tag -l 'v*' --sort=-v:refname` ordena `v1.45.0 > v1.44.1 >
  v1.44.0-cvx.10 > v1.44.0-cvx.2 > v1.44.0-cvx.1 > v1.44.0`. Na VPS,
  `git config --get versionsort.suffix` tem de estar vazio (com `-`, a ordem inverte). Pré-release
  do original (`v1.44.0-rc1`) ordena acima de `-cvx.N`.
- `publish-image.yml` publica só `1.44.0-cvx.N` (pré-release não gera `1.44` nem `latest`), move
  `stable` e reporta `APP_VERSION=1.44.0-cvx.N` em `/api/v1/health`; `latest` = topo da `main`.
- Tag anotada, criada à mão, depois do merge na `main`, sem fragmento em `.changes/` (o CI só
  cobra a forma dos fragmentos, não a presença).
- **Toda tag Convexy tem uma seção `## [X.Y.Z-cvx.N] — AAAA-MM-DD` no `CHANGELOG.md`**, escrita à
  mão: o botão mostra as notas cortando no cabeçalho da versão instalada (`agent.sh:222`,
  `lib/system/changelog.ts`, posicional). Versão que exige passo manual traz o bloco
  `### ⚠️ Requer atenção` (medido por `lib/release/cabe-na-tela.ts:284`). **Ordem fixa** do topo
  para baixo: `## [Não lançado]` › seções `-cvx` da base atual (mais nova primeiro) › seções do
  original trazidas no merge › seções `-cvx` da base anterior › `## [base anterior]` … Assim quem
  sobe de `1.44.0-cvx.5` para `1.45.0-cvx.1` vê as notas do original, inclusive os avisos.
  `cabe-na-tela.ts:96` trata `-cvx` como seção sem número: as seções Convexy ficam fora da régua de
  tamanho e nunca acima de `[Não lançado]`. O corte tem teto de 30.000 bytes em saltos grandes.

### 6.4 Migração da VPS para o fork

Fora do expediente das clínicas (recriação dos contêineres e pull de quatro imagens).

1. **Pré-voo — parada obrigatória; qualquer falha interrompe aqui.**
   - As quatro imagens `:1.44.0-cvx.1` respondem anônimo no GHCR, medido **fora** do kit instalado
     (o kit da VPS ainda mede o namespace do original):
     ```bash
     for i in deskcommcrm deskcomm-worker deskcomm-scheduler deskcomm-voice-agent; do
       t=$(curl -s "https://ghcr.io/token?scope=repository:victorrabyfs/$i:pull" | sed -E 's/.*"token":"([^"]+)".*/\1/')
       curl -s -o /dev/null -w "$i %{http_code}\n" -H "Authorization: Bearer $t" \
         -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json" \
         "https://ghcr.io/v2/victorrabyfs/$i/manifests/1.44.0-cvx.1"
     done   # as quatro têm de dar 200
     ```
     Se o `update.sh` seguir sem as imagens, o `up -d` falha e `construir_aqui_e_subir` compila as
     quatro **na VPS de produção** com o app parado (`update.sh:567-576`).
   - VPS em `v1.44.0` exata e `/api/v1/health` = `1.44.0`.
   - Nenhuma atualização pedida ou em andamento em `/app/settings/atualizacao` (o agente executa
     no ciclo seguinte um pedido feito antes, com `--to` a maior tag).
   - `cp .env .env.bak-AAAAMMDD` (o `update.sh` roda `backup.sh` — dump e storage local —, mas não
     salva o `.env`; `gravar_imagens` regrava `*_IMAGE`/`*_PULL_POLICY`; as chaves da etapa 1
     sobrevivem). O storage é do Supabase na nuvem: o tar local não cobre logos.
2. **Trocar o remoto e limpar tags, numa linha só** (o agente busca tags do `origin` a cada 5 min —
   `agent.sh:127` — e `git fetch` nunca apaga tag local; entre um passo e outro, o agente ainda
   com o `_common.sh` da v1.44.0 veria uma `v1.45.x` do original como `publicada` e ofereceria o
   original):
   ```bash
   cd /opt/deskcommcrm && git remote set-url origin https://github.com/victorrabyfs/DeskcommCRM.git \
     && git tag -l | xargs -r git tag -d && git fetch --tags origin && git tag -l
   ```
   A saída tem de listar só `v1.44.0` e `v1.44.0-cvx.*`. Sem a limpeza, a `v1.45.x` do original
   vence qualquer `-cvx`, o agente fica mudo (`_common.sh:315-337`, `agent.sh:194`) e o comando que
   a tela ensina (`update.sh` sem `--to`, `UpdatePanel.tsx:18`) levaria a VPS de volta ao original
   (`update.sh:63,178`). O mesmo comando de limpeza é o procedimento para qualquer tag errada que
   chegue à VPS.
3. Repetir `git tag -l` imediatamente antes do passo 4 (um ciclo do agente iniciado antes da troca
   pode terminar depois e recriar tags do original; se aparecerem, repetir a limpeza). O
   `update.sh` não usa o lock do agente; desligar o cron não adianta (`update.sh:58` o reinstala).
4. **Primeira atualização, manual:** `cd /opt/deskcommcrm && bash hostgator-setup-kit/update.sh
   --to v1.44.0-cvx.1`. O botão não aparece nesta transição (`agent.sh:181-194`). O `update.sh`
   funciona porque relê o `_common.sh` da tag nova depois do checkout (`update.sh:178`) e grava as
   quatro imagens `victorrabyfs`.
5. Publicar a `-cvx.2` (5.2) e aplicá-la **pelo botão**.

**Retrocesso:** o `update.sh` recusa, sem `--force`, alvo que é ancestral do HEAD
(`update.sh:107-114`), mas deixa passar alvo que não é ancestral — ex.: uma `-cvx` de base mais
velha vista de uma VPS que andou no original (`is_already_in_head`, `_common.sh:759-771`). Por
isso o passo 0.3 e o pré-voo.

**Rollback para o original** (só enquanto a base é a `v1.44.0` e antes da etapa 3):
```bash
cd /opt/deskcommcrm && git remote set-url origin https://github.com/melgarafael/DeskcommCRM.git \
  && git tag -l | xargs -r git tag -d && git fetch --tags origin \
  && bash hostgator-setup-kit/update.sh --to v1.44.0 --force
```
Volta código, o `_common.sh` da v1.44.0, as imagens `ghcr.io/melgarafael/*:1.44.0` no `.env` e o
agente. Depois disso a tela oferece a última versão **do original** — não clicar achando que é o
fork. Depois do primeiro merge do original (seção 8), rollback é só para a `-cvx` anterior. O
botão só faz rollback automático de imagem quando a atualização veio dele e falhou
(`agent.sh:284-387`).

**Pronto quando:**
- `/api/v1/health` responde `1.44.0-cvx.1`, depois `1.44.0-cvx.2` aplicada **pelo botão**;
- `.env` da VPS aponta as quatro imagens para `ghcr.io/victorrabyfs`;
- `git tag -l` na VPS só lista `v1.44.0` e `v1.44.0-cvx.*`;
- o rollback acima está documentado no `CONVEXY.md`, com os comandos exatos. **Não é ensaiado
  numa VM** (decisão de 23/09): o procedimento foi conferido contra o código do kit, e o risco
  de ele falhar na hora é aceito.

## 7. Etapa 3 — identidade visual

### 7.1 Comum às três versões

**`CONVEXY.md`** (criado na etapa 2): uma entrada por arquivo do original alterado — trecho exato,
local no arquivo, motivo, como reaplicar num conflito; a lista "fica de propósito" (6.2); os
desvios aceitos; e as afirmações de docs do original que não valem no fork (ex.:
`docs/white-label.md:17` — um logo só; `:58-71` — marca por organização; `:80` — "a fonte é a
Atkinson Hyperlegible"). Docs do original **não** são editados (DoD 16 cumprido pelo
`CONVEXY.md`: editar o `.md` obrigaria `.en`/`.es` — `traducao-nao-defasa.test.ts` — e conflitaria
a cada merge). Destino de toda mudança (DoD 18): **instalação do fork**. O mapa
`docs/architecture/marca-propria.architecture.json` (aresta `e58` "upsert de logo_path", nó
`env`) não é editado; o desvio fica no `CONVEXY.md` (DoD 13).

**Spec e2e nova** `tests/e2e/convexy-identidade.spec.ts`: registrada numa `SPECS_PARTE_1..3` de
`.github/workflows/e2e.yml` (não precisa de WAHA) — uma linha dentro do bloco `>-`, sem
comentário no bloco (`tests/unit/e2e-cobertura-completa.test.ts:153,190-198` reprova spec do
disco fora das listas). `e2e.yml` entra no `CONVEXY.md`. Login pelos helpers de
`tests/e2e/helpers/login-admin.ts`; se logar duas vezes, declara teto de tempo
(`e2e-dois-logins-nao-cabem-no-teto-padrao.test.ts`). Cada versão acrescenta seus casos.

**Suítes antes de cada tag:** `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:shell`,
`pnpm test:db` (obrigatório na `-cvx.4`) e `pnpm test:e2e`; depois, conferência em tela na VPS,
claro e escuro.

### 7.2 `-cvx.3` — paleta, fontes e barra do navegador

**Arquivos novos:** `app/convexy/tema.css`, `lib/convexy/barra-do-navegador.ts`,
`tests/unit/convexy-tema-cobre-os-tokens.test.ts`, `tests/unit/convexy-tema-contraste.test.ts`.

**Arquivos do original:**

| Arquivo | Alteração |
|---|---|
| `app/layout.tsx` | Fontes (7.2.2); `import "./convexy/tema.css"` depois de `globals.css` (`:26`); `viewport.themeColor` (7.2.3) |
| `tests/e2e/aviso-de-caso-no-whatsapp.spec.ts:280`, `conversa-do-caso.spec.ts:340`, `passagem-com-contexto.spec.ts:261` | `/Atkinson/` → `/Inter/` |
| `.github/workflows/e2e.yml` | Spec e2e nova (7.1) |
| `CHANGELOG.md` | Seção da versão |

#### 7.2.1 Paleta — `app/convexy/tema.css`

Sobrepõe os tokens de `app/globals.css` com **seletor de atributo dobrado**
(`[data-theme="light"][data-theme="light"]`, `[data-theme="dark"][data-theme="dark"]`,
especificidade 0,2,0), **fora de qualquer `@layer`**. Os blocos do original (`:root`,
`[data-theme="light"]`, `[data-theme="dark"]` — `globals.css:33,252,329`) estão fora de camada, com
0,1,0: o `tema.css` vence em qualquer ordem de carga (que difere entre dev e produção —
`lib/branding/css.ts:17-23`), sem `!important`. O CSS de marca injetado só emite tokens de acento
(`css.ts:160-170`), sem disputa. O modo escuro é `@custom-variant dark
(&:where([data-theme="dark"], …))` (`globals.css:25`) e o `data-theme` está sempre gravado,
inclusive no modo "sistema" (`app/layout.tsx:122,279`, `lib/theme.tsx:42`). Toda cor chega aos
utilitários por `var(--color-…)` em tempo de execução (`@theme inline`); os aliases (`card`,
`popover`, `muted`, `input`, `background`, `secondary`, `--ring`) apontam para os tokens abaixo e
acompanham. Não toca em `--color-accent-*` nem nas cores semânticas. Um CSS importado sem
diretiva do Tailwind já tem precedente (`app/design/layout.tsx:4`, `showcase.css`); o `@source
"../app"` já cobre `app/convexy`.

| Token | Claro | Escuro |
|---|---|---|
| `--color-bg` (fundo; também o fundo dos campos — `components/ui/input.tsx:11` usa `bg-bg`) | `#F8FAFC` | `#0B0D10` |
| `--color-surface` (cartão, popover) | `#FFFFFF` | `#131923` |
| `--color-surface-elevated` | `#F1F5F9` | `#171E2A` |
| `--color-overlay` | `rgba(11, 13, 16, 0.42)` | `rgba(0, 0, 0, 0.60)` |
| `--color-text` | `#0B0D10` | `#F8FAFC` |
| `--color-text-muted` | `#475569` | `#94A3B8` |
| `--color-text-subtle` | `#64748B` | `#64748B` |
| `--color-border` (também a borda dos campos — `--color-input`, `globals.css:517`) | `#E2E8F0` | `#1E293B` |
| `--color-border-strong` | `#CBD5E1` | `#334155` |
| `--color-neutral-50` | `#F8FAFC` | `#F8FAFC` |
| `--color-neutral-100` | `#F1F5F9` | `#E2E8F0` |
| `--color-neutral-200` | `#E2E8F0` | `#CBD5E1` |
| `--color-neutral-300` | `#CBD5E1` | `#94A3B8` |
| `--color-neutral-400` | `#94A3B8` | `#64748B` |
| `--color-neutral-500` | `#64748B` | `#334155` |
| `--color-neutral-600` | `#475569` | `#1E293B` |
| `--color-neutral-700` | `#334155` | `#171E2A` |
| `--color-neutral-800` | `#1E293B` | `#131923` |
| `--color-neutral-900` | `#0F172A` | `#0B0D10` |
| `--color-neutral-950` | `#0B0D10` | `#06080A` |
| `--shadow-xs … --shadow-xl` | valores do original com a tinta `rgba(11, 13, 16, α)` no lugar de `rgba(20, 18, 14, α)` | inalteradas |

Desvios aceitos em relação ao CRM atual: popover igual ao cartão (`#131923`, e não `#171E2A` —
aliases fixados em `globals.css:529-532`); campo no escuro igual ao fundo (`#0B0D10`, e não
`#111720`).

#### 7.2.2 Fontes

- `app/layout.tsx` (já usa `next/font/google`, `:2,28-40`): `Inter({ subsets: ["latin"], weight:
  ["400","500","600","700"], variable: "--font-atkinson" })` no lugar de `Atkinson_Hyperlegible`.
  O nome da variável fica o do original de propósito: `--font-sans` está no `@theme inline` e é
  inlinado na compilação (`globals.css:455,535`), o `body` usa `var(--font-atkinson)` direto
  (`globals.css:701`) e `tests/unit/tailwind-tokens.test.ts:89-93` exige o literal no layout.
- `Lexend_Deca({ subsets: ["latin"], weight: ["400","500","600","700"], variable:
  "--font-lexend" })`. Os dois `.variable` entram no `className` do `<html>` (`layout.tsx:281`).
- `tema.css` começa com `@layer theme, base, components, utilities;` (fixa a ordem das camadas do
  Tailwind caso o `tema.css` carregue antes) e contém:
  - dentro de `@layer base`: `h1, h2, h3 { font-family: var(--font-lexend), var(--font-atkinson),
    sans-serif; }` — em camada, para que utilitários como `font-mono` (quatro `<h1>` de
    `audit/incidents/lgpd`) continuem vencendo. `h2` do Radix (`DialogTitle` etc.) recebem
    Lexend; `CardTitle` não (seção 3);
  - **fora de camada**: `body { font-feature-settings: normal; }`, anulando o `"ss01"`
    (`globals.css:703`, em `@layer base`), que em Inter troca o desenho dos dígitos.
- IBM Plex Mono continua.

#### 7.2.3 Barra do navegador

`lib/branding/regua-do-produto.ts` é gerado de `globals.css` e **não muda**
(`branding-regua-do-produto.test.ts`). Hoje `viewport = { themeColor:
coresDaBarraDoNavegador(REGUA_DO_PRODUTO) }` (`layout.tsx:116-118`); passa a vir de
`lib/convexy/barra-do-navegador.ts`, no mesmo formato `[{ media, color }]`: `#F8FAFC` (light) e
`#0B0D10` (dark). A barra segue a preferência do sistema operacional, não o tema do app — como no
original. `branding-barra-do-navegador.test.ts:68-82` só proíbe os hex antigos no layout: passa.

#### 7.2.4 Acento e cores fixas

- Escala do acento: derivada pelo original contra a régua dele. Os fundos novos só ajudam: no
  escuro são mais escuros; no claro `#F8FAFC` (luminância 0,9536) é mais claro que `#faf9f6`
  (0,9473). `derivarMarca("#146BFF", REGUA_DO_PRODUTO)` (`contraste.ts:839`) dá `accent`
  `#1756c4`/`fg #ffffff` (claro) e `#6ea3ff`/`#000000` (escuro).
- Cores fixas que ficam na paleta do original, aceitas: nome do produto sem logo
  (`components/branding/MarcaDoProduto.tsx:30-31`, `lib/branding/desenho.ts:101`);
  `--color-accent-fg` escuro `#161510` (só vale sem cor de marca — aqui há); prévias do
  `CampoDeLogo` (leem `REGUA_DO_PRODUTO`); fundo dos e-mails.

#### 7.2.5 Testes e critérios

- `convexy-tema-cobre-os-tokens`: (a) toda propriedade do `tema.css` existe nos blocos
  `[data-theme="light"]`/`[data-theme="dark"]` do `globals.css`; (b) todo `--color-*` desses blocos
  que não seja acento, semântica, agenda ou alias em `var()` está coberto pelo `tema.css`
  (conferido: satisfazível; o único literal fora da tabela é `--destructive-foreground`, que não é
  `--color-*`). É o que pega o original renomeando ou criando token.
- `convexy-tema-contraste` (lê o `tema.css`; `razaoDeContraste`, `contraste.ts:58`):
  - `text` e `text-muted` ≥ 4,5 e `text-subtle` ≥ 3 sobre `bg`, `surface` e `surface-elevated`, nos
    dois temas (pior caso: `text-subtle` escuro sobre `surface-elevated` = 3,51);
  - `accent` de `derivarMarca("#146BFF", REGUA_DO_PRODUTO)` ≥ 4,5 sobre `bg`, `surface` e
    `surface-elevated` (medido 6,06–7,73) e `accentFg` ≥ 4,5 sobre `accent` (6,64 claro, 8,35
    escuro);
  - as cores de `lib/convexy/barra-do-navegador.ts` são iguais ao `--color-bg` de cada tema no
    `tema.css` (uma fonte só, como a doutrina de `branding-barra-do-navegador`).
- e2e (`convexy-identidade.spec.ts`), em `/login` e `/app/settings` (rota fixa: `/app` redireciona
  para uma inicial variável):
  - primeiro nome de `getComputedStyle(body).fontFamily` casa `/Inter/i` e o de `h1` casa
    `/Lexend/i` (o Chrome põe aspas em nomes com espaço; o `next/font` pode gerar `__Inter_<hash>`);
  - tokens: um elemento-sonda recebe `background: var(--color-…)` e o `getComputedStyle` (em
    `rgb()`) é comparado com a tabela convertida para `rgb()`, nos dois temas — o minificador pode
    reescrever o texto das custom properties (`#FFFFFF` → `#fff`), e a mesma medida prova que o
    seletor dobrado sobreviveu à minificação.
- `curl https://<dominio-de-producao>/login` traz `theme-color` `#F8FAFC` e `#0B0D10`.

**Rollback:** `cd /opt/deskcommcrm && bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.2
--force`. O botão volta a oferecer a `-cvx.3` (não é ancestral do HEAD — `agent.sh:161-164`): não
clicar; corrigir com a `-cvx` seguinte.

### 7.3 `-cvx.4` — logo escuro em `/admin/marca`

**Arquivos novos:** `supabase/migrations/<ts>_9001_logo_escuro_da_instalacao.sql`,
`tests/unit/convexy-logo-escuro.test.tsx`, `tests/invariants/convexy-logo-escuro.test.ts`.

**Arquivos do original:**

| Arquivo | Alteração |
|---|---|
| `supabase/baseline.sql`, `supabase/migrations/MANIFEST.md` | Migration (7.3.1) |
| `lib/database.types.ts` | `logo_dark_path` em `Row`/`Insert`/`Update` de `platform_branding` (~7513, ~7526), **à mão** — regenerar reescreveria o arquivo inteiro; nenhum teste o compara ao baseline |
| `app/api/v1/marca/logo/route.ts` | `variante` (7.3.2) |
| `components/branding/CampoDeLogo.tsx` | `variante` (7.3.3) |
| `app/admin/(protected)/marca/page.tsx`, `_form.tsx` | Segundo campo (7.3.3) |
| `lib/branding/instalacao.ts`, `resolve.ts`, `saida.ts`, `contexto.tsx`, `lib/branding.ts`, `app/layout.tsx` | `logoDarkUrl` (7.3.4) |
| `components/shell/Sidebar.tsx`, `app/(public)/layout.tsx` | Moldura + segundo `<img>` (7.3.5) |
| `lib/i18n/dicionario.ts` | Textos, junto do bloco do logo (~3661–3779), não no fim do objeto |
| `CHANGELOG.md` | Seção da versão |

#### 7.3.1 Banco — migration 9001

- Mesmo padrão do `logo_path` (`baseline.sql:14418-14423`): `add column if not exists
  logo_dark_path text`; limpeza de valores fora do formato; `drop constraint if exists` + `add
  constraint platform_branding_logo_dark_path check (logo_dark_path ~ '^platform/<uuid>\.(png|jpg)$')`
  com a mesma regex; `comment on column`; `notify pgrst, 'reload schema'`. `platform_branding` só é
  escrita por `service_role` e o bucket `brand-logos` é público: nada de RLS ou policy.
- Numeração própria, `9001` em diante, para nunca colidir com a do original. Nenhum guarda exige
  sequência contígua: `scripts/checar-colisao-de-migration.sh` roda no `verify` (`ci.yml:263-265`)
  e só reprova NNNN ou timestamp **repetido** (o maior NNNN só sugere o "próximo livre" — no fork,
  `9002`); as regex de `manifest-x-migrations` (`\d{4,5}_`) e do script (`[0-9]{4}`) aceitam 9001.
- Tripla do projeto:
  - arquivo em `supabase/migrations/`;
  - bloco `-- ---- logo escuro da instalação (migration 9001) ----` no `baseline.sql` **logo depois
    do bloco da migration 0158** (`14354-14430`, antes do 0159 em `14433`), não no fim: o fim tem
    `fn_conferir_modulos_instalados()` (0340), que levanta ERROR de propósito, e é onde o original
    acrescenta blocos. Bloco só com coluna e constraint pode ficar ali
    (`varredura-anon-e-o-ultimo-bloco` só restringe `create function` e `grant … to anon`; o par
    drop/add passa em `baseline-reaplicavel`);
  - linha no `MANIFEST.md` (`merge=union`, `.gitattributes:10`).
- `hostgator-setup-kit/update.sh:258-281` reaplica o baseline na VPS antes da imagem nova;
  `test-db.sh` aplica o baseline, não a cadeia: o timestamp não cria risco de ordem.
- Em conflito do `baseline.sql` num merge: prevalece o lado do original, e o bloco Convexy é
  reaplicado no mesmo lugar.
- **Invariante** `tests/invariants/convexy-logo-escuro.test.ts` (no molde de
  `tests/invariants/marca-logo.test.ts:237-260`): caminho válido grava, caminho torto é recusado,
  reaplicar o baseline limpa valor fora do formato.

#### 7.3.2 Rota `app/api/v1/marca/logo/route.ts`

- `variante: z.enum(["claro", "escuro"])`, padrão `claro`, no POST (form) e no DELETE (query
  `?variante=`); `escuro` só vale com `escopo === "instalacao"`.
- `caminhoGravado`, `gravarCaminho` (`upsert({ id: 1, <coluna>: … })`) e a auditoria
  (`platform_branding.updated`, `route.ts:325`, com `fields_changed` = a coluna da variante)
  escolhem `logo_path` ou `logo_dark_path`; mesma validação por bytes (PNG/JPG ≤ 512 KB) e mesmo
  apagar-o-anterior.

#### 7.3.3 Tela

- `components/branding/CampoDeLogo.tsx`: prop `variante` (padrão `claro`) enviada no POST (`:219`)
  e no DELETE (`:241`); `id` e `data-campo-de-logo` incluem a variante só quando é `escuro`
  (`logo-instalacao-escuro`), mantendo `#logo-instalacao` único para
  `logo-moldura-no-tema-escuro.spec.ts:318,321,332`, `marca-logo.spec.ts` e
  `marca-previa-do-logo-sem-refresh.test.tsx:91`.
- **Restrições de forma** impostas por `tests/unit/logo-nao-some-no-tema-escuro.test.ts`:
  - a prévia "Aparência escura" (`CampoDeLogo.tsx:326-330`) tem de continuar casando
    `/Apar.ncia escura["')\s]*\s*\?\s*["'`][^"'`]*bg-white/` (`:100-108`): a prévia da variante
    escura vai num ramo **separado** (componente ou bloco próprio), sem aninhar ternário nem pôr
    `&&` antes do `?` existente;
  - `imgDoLogoEstaDentroDoChip` (`:65-72`) exige que a primeira tag com `dark:bg-white` embrulhe
    direto o `<img>` e que o `className` não contenha `>` (nada de `=>` ali).
- `app/admin/(protected)/marca/page.tsx` (lê `logo_path`, `:77,97`) lê também `logo_dark_path` e
  repassa; `_form.tsx` ganha o segundo `CampoDeLogo`, "Logo para o tema escuro". Tradução para
  outros idiomas não é exigida (`catalogo-de-idioma-tem-forma.test.ts`).

#### 7.3.4 Leitura

O campo `logoDarkUrl?: string | null` é **opcional** em todos os tipos (testes montam esses
objetos literais: `marca-na-fachada-de-acesso`, `marca-do-produto`, `branding.test.ts:12`).
- `lib/branding/instalacao.ts`: coluna em `COLUNAS`. Ali é "tudo ou nada" (`:88-105`): sem a coluna
  no banco, o PostgREST devolve 42703 e a instalação perde **toda** a marca do banco (cai no
  `.env`). Na VPS o baseline é reaplicado antes da imagem (seção 10).
- `lib/branding/resolve.ts`: `LinhaDaInstalacao` (`:363`), `CamadaDeMarca` (`:79`),
  `camadaDaInstalacao` (`:395`), `resolverMarca` (`:316`), `MarcaResolvida` (`:99`).
  `logoDarkUrl` só é preenchido quando `origens.logoUrl` é a camada do banco da instalação: logo de
  organização ou do `.env` nunca é trocado pelo escuro da instalação.
- Barra lateral: `lib/branding.ts` (`Branding`), `lib/branding/contexto.tsx`
  (`useMarcaDaInstalacao`, `:75`) e `MarcaDosClientComponents` em `app/layout.tsx` (`:259-271`,
  hoje repassa só `name`, `logoUrl`, `initial`).
- Login: `lib/branding/saida.ts` (`MarcaDeSaida`, `:59`, e o mapeamento de `marcaDaSaida`); e-mails
  e demais consumidores de `marcaDaSaida` ignoram o campo.

#### 7.3.5 Desenho

Hoje a moldura é uma `div` em volta do `<img>`: `dark:bg-white dark:px-2 dark:py-1 dark:shadow-sm`
em `Sidebar.tsx:143`; `dark:bg-white dark:px-3 dark:py-2 …` em `(public)/layout.tsx:79`. Com
`logoDarkUrl` **e** logo exibido vindo da instalação (na barra lateral: `!activeOrg?.marca?.logoUrl`,
`Sidebar.tsx:114`), a `div` da moldura inteira ganha `dark:hidden` e, como irmão dela, um
`<img src={logoDarkUrl}>` com `hidden dark:block`, sem moldura. Sem `logoDarkUrl`, nada muda. Troca
por CSS, sem divergência de hidratação. O primeiro `<img>` continua o claro, dentro da moldura:
`logo-nao-some-no-tema-escuro.test.ts`, `marca-do-produto.test.tsx`,
`marca-sem-divergencia-de-hidratacao.test.tsx` e `marca-na-fachada-de-acesso.test.tsx` seguem
válidos (com as restrições da 7.3.3).

#### 7.3.6 Testes e critérios

- `convexy-logo-escuro.test.tsx`: no jsdom o Tailwind não se aplica — `getAllByRole("img")` e
  conferência das classes (`dark:hidden` na moldura, `hidden dark:block` no segundo `<img>`), mais o
  caso "logo da organização presente → sem segundo `<img>`"; rota com `variante` no POST e no
  DELETE.
- Invariante (7.3.1); `pnpm test:db` verde.
- e2e: com os dois logos enviados, o claro aparece só no tema claro e o escuro só no escuro, sem
  moldura branca no escuro, na barra lateral e no login; `afterAll` limpa `logo_dark_path` (banco de
  e2e compartilhado; `logo-moldura-no-tema-escuro.spec.ts` mede a moldura no escuro).
- Na VPS: enviar o logo escuro (PNG) em `/admin/marca` depois da atualização.

**Rollback** para `-cvx.3` (`--force`): a coluna fica, inofensiva; mesma observação do botão da 7.2.

### 7.4 `-cvx.5` — marca das clínicas desligada

**Arquivos novos:** `lib/convexy/marca-por-organizacao.ts`,
`tests/unit/convexy-marca-por-organizacao.test.ts`.

**Arquivos do original:**

| Arquivo | Alteração |
|---|---|
| `lib/env.ts`, `.env.example`, `.env.hostgator.example` | `ORG_BRANDING_ENABLED` |
| `lib/branding/organizacao.ts` | Chave na leitura |
| `app/actions/settings/updateMarcaDaOrganizacao.ts` | Chave na escrita + código de erro |
| `app/api/v1/marca/logo/route.ts` | 404 para organização |
| `app/app/settings/marca/page.tsx`, `app/app/settings/page.tsx`, `app/app/layout.tsx` | Página e menu |
| `lib/auth/types.ts`, `lib/navigation/registry.ts`, `components/shell/NavHub.tsx`, `components/shell/CommandPalette.tsx` | Menu |
| `lib/i18n/dicionario.ts` | Texto do erro |
| `CHANGELOG.md` | Seção da versão, com `### ⚠️ Requer atenção` (passo manual) |

- **Chave:** `ORG_BRANDING_ENABLED` em `lib/env.ts`, `z.string().optional().default("true")`,
  junto das chaves de marca; **só o valor exato `false` desliga** (nunca `z.enum`: um valor inválido
  derrubaria a primeira requisição com o contêiner `healthy` — aviso em `lib/env.ts:244-249`).
  Entra em `.env.example` e `.env.hostgator.example` (DoD 9; `env-example-sync.test.ts`), linha
  vazia (resolve para ligado) e sem comentário na mesma linha
  (`env-template-sem-comentario-inline.test.ts`). `lib/convexy/marca-por-organizacao.ts` exporta
  `marcaPorOrganizacaoLigada(): boolean` (lê `env`) e é o único lugar que interpreta a chave. Todos
  os leitores são de servidor (nenhum `"use client"` importa `lib/branding/organizacao`); o
  `worker` também recebe o `.env` (`docker-compose.prod.yml:98`).
- **Padrão `true` é deliberado:** o CI roda com o comportamento do original, e
  `tests/e2e/marca-logo.spec.ts` e `tests/unit/sidebar-nome-da-organizacao.test.tsx` passam sem
  alteração. A VPS precisa de `ORG_BRANDING_ENABLED=false` no `.env` — desvio da regra "bump não
  exige editar `.env`", aceito por ser decisão de instalação do fork.
- **Leitura:** com a chave desligada, `marcaDaOrganizacaoDeSettings()` (`organizacao.ts:73`)
  devolve `null`. É o único parser de `settings.branding`; `resolverMarcaDaOrganizacao` (layout, CSS
  da organização) e `marcaDaSaida(orgId)` (e-mail, push, LGPD, convite) passam por ele. Marcas já
  gravadas ficam no banco, ignoradas.
- **Escrita:** os únicos que gravam `settings.branding` são `updateMarcaDaOrganizacao` (RPC
  `fn_definir_marca_da_organizacao`) e a rota de logo (RPC `fn_definir_logo_da_organizacao`).
  - `updateMarcaDaOrganizacao.ts` devolve `{ ok: false, error: "marca_por_organizacao_desligada" }`
    antes de tocar o banco; o código entra na união `UpdateMarcaDaOrganizacaoResult` (`:17-29`).
  - A rota responde 404 para `escopo === "organizacao"` no **POST e no DELETE**.
  - As RPCs não mudam.
- **Tela e menu:** `/app/settings/marca` responde `notFound()`. O item continua em `NAV_CATALOG`
  (`navegacao-completude.test.ts:33`). Ele não está na barra lateral (`catalogo.ts:816-830`):
  aparece no hub `/app/settings` e no ⌘K. No modelo de `modulos_ligados`:
  - campo **opcional** `marca_por_organizacao?: boolean` em `ActiveOrg` (`lib/auth/types.ts:150`,
    ao lado de `modulos_ligados?:`, `:180`), ausente = ligado — há dezenas de literais `ActiveOrg`
    em testes (ex.: `agenda-google-connect-route.test.ts:49`) e o `typecheck` inclui `tests/`;
    preenchido em `app/app/layout.tsx`; o ⌘K (`CommandPalette.tsx:59`) o lê;
  - `app/app/settings/page.tsx` (server) chama `marcaPorOrganizacaoLigada()` e repassa ao `NavHub`;
  - parâmetro **opcional** (padrão ligado) em `sidebarGroups`, `hubSections`, `searchable`
    (`registry.ts:116,144,166`), repassado ao filtro de `destinosDaInterface()`
    (`interface.ts:102`). `AlertsBell.tsx` e `InterfaceEditor.tsx` não mudam.
- `/admin/marca` não é afetada.

**Testes e critérios.** O CI sobe um servidor só, com a chave ligada, e `env` é congelado no import:
o comportamento desligado é provado em **unitário**, com
`vi.mock("@/lib/convexy/marca-por-organizacao")`, caso a caso — parser devolve `null`;
`marcaDaSaida(orgId)` cai na instalação; action recusa com o código novo; rota dá 404 no POST e no
DELETE de organização; página chama `notFound`; `hubSections`/`searchable` sem o item. Na VPS, com
a chave `false`: "Marca" some do hub e do ⌘K, `/app/settings/marca` dá 404, e a marca gravada de
uma organização de teste não aparece.

**Aplicar na VPS:** `cp .env .env.bak-AAAAMMDD`; acrescentar `ORG_BRANDING_ENABLED=false`;
atualizar pelo botão. **Rollback** para `-cvx.4` (`--force`): o código antigo ignora a chave e as
marcas de organização gravadas voltam a aparecer.

### 7.5 Critério comum de fechamento da etapa 3

`git diff --name-only refs/upstream-tags/v1.44.0 main` bate com o `CONVEXY.md` (arquivos alterados
do original) mais os arquivos novos das seções 7.2–7.4 e `docs/superpowers/`.

## 8. Trazer uma atualização do original

Cadência: **semanal**, ou fora dela quando o original publicar correção de segurança — nunca
release a release. Nada entra enquanto a etapa 3 (`-cvx.5`) não estiver validada em produção.

1. `git fetch --no-tags upstream refs/tags/vA.B.C:refs/upstream-tags/vA.B.C`; branch a partir da
   `main` do fork; `git merge refs/upstream-tags/vA.B.C` (sempre gera commit de merge).
2. Conflitos esperados: arquivos das tabelas 6.2 e 7.2–7.4, `e2e.yml`, e sempre `CHANGELOG.md`
   (ordem da 6.3). Resolver com o `CONVEXY.md` aberto; `baseline.sql` conforme 7.3.1;
   `dicionario.ts` reaplicando o bloco no mesmo lugar.
3. Revisar o diff do original como código que rodará como root na VPS. Em especial
   `git diff --stat main refs/upstream-tags/vA.B.C -- .github/workflows`: workflow **novo** entra
   ligado no fork (desligar o que não servir) e job obrigatório renomeado trava a proteção da
   `main`.
4. PR para a `main` **do fork** (`gh pr create -R victorrabyfs/DeskcommCRM --base main`), CI verde,
   merge **por merge commit**; conferência em tela, claro e escuro.
5. Seção `## [A.B.C-cvx.1]` no `CHANGELOG.md`; tag `vA.B.C-cvx.1` pelo nome; o CI publica; o botão
   aparece. **A tag `vA.B.C` do original não vai para o fork** (só a `v1.44.0` foi, uma vez, com as
   Actions desligadas — 6.1.2): com as Actions ligadas ela publicaria `victorrabyfs/*:A.B.C` sem
   identidade e, ordenando acima das `-cvx` da base anterior, seria oferecida pelo botão. A base do
   diff fica em `refs/upstream-tags/` no clone local.

Automatizar os passos 1–2 fica para depois de o fluxo manual rodar uma vez.

## 9. Testes do original afetados

Ajustados (não desligados), registrados no `CONVEXY.md` com o motivo:

- `tests/unit/_identidade-deste-repo.ts` (6.2) — `namespace-das-imagens.test.ts` em si não muda;
- `tests/unit/release-chega-na-lp.test.ts:280-286` — cabeçalho `-cvx` (6.2);
- `tests/e2e/aviso-de-caso-no-whatsapp.spec.ts:280`, `conversa-do-caso.spec.ts:340`,
  `passagem-com-contexto.spec.ts:261` — `/Atkinson/` → `/Inter/` (7.2);
- `.github/workflows/e2e.yml` — registro da spec nova (7.1).

Conferidos e **sem alteração**: `marca-logo.spec.ts` e `sidebar-nome-da-organizacao.test.tsx`
(chave ligada por padrão no CI); `icone-da-marca.spec.ts:51`; `tailwind-tokens.test.ts:89-93`;
`branding.test.ts` (só procura `/deskcomm/i`: "convexy" em caminho ou código não reprova);
`branding-barra-do-navegador.test.ts`; `agenda-kit-visual.spec.ts` (trilhas ≥ 3 continuam, no
escuro sobem); `logo-moldura-no-tema-escuro.spec.ts` (limiar 200/255 separa o branco de `#131923`);
`branding-pares-pintados`, `branding-regua-do-produto`, `branding-tema-claro-escopavel`,
`branding-marca-css.test.ts:340-350`; os testes de logo da 7.3.5 (com as restrições da 7.3.3);
`marca-previa-do-logo-sem-refresh.test.tsx`; `catalogo-de-idioma-tem-forma.test.ts`;
`mapas-de-arquitetura.test.ts`; `build-and-size` (só reporta tamanho, sem teto — `perf.yml:47-55`).

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Push de tag no fork vira execução como root na VPS | 6.1.5 (2FA, ruleset de tag, proteção da `main`) |
| Botão oferecer versão do original / VPS voltar ao original em silêncio | Tags do original fora de `refs/tags/` (6.1.1); limpeza de tags na VPS numa linha só, conferida antes do `update.sh` (6.4.2–3); workflows desligados (6.1.4) |
| Tag do original vazar para o fork | Tags antigas apagadas do clone e push só pelo nome (6.1.1) — o ruleset tem bypass do dono |
| Trabalho Convexy aberto como PR no original | `gh repo set-default` e `-R` (6.1.1, 8.4) |
| Squash/rebase apagar a ancestralidade de um merge do original | Só merge commit; sem histórico linear (6.1.5) |
| VPS sair da base antes da migração | Passo 0 pelo `update.sh --to`, proibição do botão, pré-voo (5.0, 6.4.1) |
| Pacote GHCR privado ou ausente → build de quatro imagens na VPS de produção | Pacotes públicos antes da tag (6.1.8); pré-voo com `curl` como parada obrigatória (6.4.1) |
| `-cvx.N` recusado por algum ponto do kit | Etapa 2 mede sem identidade em cima; ajustes da 6.2 |
| Workflow novo do original rodar no fork; job obrigatório renomeado | Revisão do passo 8.3 |
| Original reescreve `Sidebar.tsx`/`(public)/layout.tsx`/`layout.tsx` | Alterações mínimas, registradas no `CONVEXY.md`; conferência em tela a cada merge |
| Original renomeia ou cria tokens em `globals.css` | `convexy-tema-cobre-os-tokens` (7.2.5) |
| Imagem da `-cvx.4` sobe sem a coluna `logo_dark_path` → instalação perde toda a marca do banco | Versão isolada; baseline reaplicado antes da imagem; rollback para `-cvx.3` |
| Botão reoferecer uma `-cvx` revertida | Não clicar; corrigir com `N+1` (7.2.5) |
| Arquivos quentes (`baseline.sql`, `dicionario.ts`, `MANIFEST.md`, `CHANGELOG.md`, `e2e.yml` — 100 a 700 commits desde agosto) conflitarem a cada merge | Blocos em região estável, `MANIFEST.md` em `merge=union`, ordem fixa do CHANGELOG, uma linha no `e2e.yml`, cadência semanal |
| Numeração de migration colide com a do original | Faixa 9001+ (7.3.1) |
