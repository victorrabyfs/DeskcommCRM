# Identidade Convexy no fork do DeskcommCRM — design

- **Data:** 2026-09-22 (revisão 3, 2026-09-23 — base passa a `v1.44.0`; incorpora a segunda
  rodada de quatro revisões: infraestrutura, visual, logo/marca/migration, coerência/operação)
- **Status:** aguardando revisão do Victor
- **Repositório:** `victorrabyfs/DeskcommCRM` (fork de `melgarafael/DeskcommCRM`)
- **Base:** release `v1.44.0` do original (tag `39b62486`, commit `7dbbf87`). Produção em
  `https://<dominio-de-producao>` roda hoje a `v1.43.0` e sobe para a `v1.44.0` no passo 0 (5.0).

Entre `v1.43.0` e `v1.44.0` (37 commits) **nenhum arquivo citado nas seções 6 e 7 mudou**
(`git diff --stat v1.43.0 v1.44.0 -- <arquivos>` vazio), exceto `CHANGELOG.md`,
`lib/i18n/dicionario.ts`, `supabase/baseline.sql` (+12 linhas, depois do trecho usado na 7.7) e
`MANIFEST.md`. As referências `arquivo:linha` abaixo valem para as duas tags.

## 1. Objetivo

A plataforma inteira aparece como **Convexy** — nome, cores, fontes, logo claro e escuro — com
**uma identidade só para todas as clínicas**. A restrição que governa o desenho: **continuar
recebendo as atualizações do original sem perder a identidade**. Por isso: configuração antes de
código; código da Convexy em arquivos novos; alteração em arquivo do original só quando não há
outro caminho, pequena, posta em região estável do arquivo e registrada em `CONVEXY.md`.

## 2. Decisões

| Decisão | Escolha |
|---|---|
| Onde vive o código próprio | Fork `victorrabyfs/DeskcommCRM`; original como remoto `upstream` |
| Contribuir de volta | **Não** |
| Base | `v1.44.0`, **congelada** até a etapa 3 estar validada em produção (seção 8 define a cadência depois) |
| Logo | Enviado pela tela `/admin/marca` (PNG/JPG): **um campo para o tema claro (o que já existe) e um novo para o tema escuro**. Nada de logo embutido no código |
| Marca por clínica (`/app/settings/marca`) | **Desligada** por chave de instalação (decisão de 23/09). A decisão de 22/09 — "marca por plano, enterprise com marca própria" — fica para a spec de SaaS, que troca a chave por regra de plano |
| Domínio por clínica | Fora (só SaaS em `<dominio-de-producao>`) |
| Entrega | Três etapas (seção 5): configuração → fork só com infraestrutura → identidade visual |

## 3. Fora de escopo

- SaaS (teste 7/14/30 dias, planos, cobrança, marca por plano) e Instagram direto — specs próprias.
- Ícone próprio na barra lateral recolhida e no favicon: continuam a inicial "C" sobre a cor da
  marca (`app/icon.tsx`, `components/shell/Sidebar.tsx:163-171`).
- Números de destaque em Lexend Deca, e Lexend em títulos que não são `h1–h3` (ex.: `CardTitle`
  é `<div>` — `components/ui/card.tsx:36`): exigiria classe em componentes do original.
- Fundo dos e-mails (convite, LGPD, GoTrue), régua de contraste do produto e as cores fixas
  listadas em 7.5: continuam os neutros do original.
- Logo escuro em e-mail, ícone, manifest e MFA (usam `marcaDaSaida`, tema claro sempre).
- `app/design/`, `public/llms.txt`, `global-error.tsx`, e as instruções de instalação que apontam
  para o original (lista na 6.2) — ficam como estão, registradas no `CONVEXY.md`.

## 4. Identidade de origem

Medida no CRM atual (`<frontend-atual>` na VPS): fontes **Inter** (texto) e **Lexend
Deca** (títulos); marca `#146BFF`; tinta `#0B0D10`; fundo claro `#F8FAFC`; escuro: fundo
`#0B0D10`, cartão `#131923`, popover `#171E2A`. Logos em SVG (`logo-light-v3.svg`,
`logo-dark-v3.svg`) — **exportar em PNG** (altura ≥ 96 px, fundo transparente, ≤ 512 KB) para
enviar pela tela, que recusa SVG por segurança.

## 5. Entregas

### 5.0 Passo 0 — produção na base (antes da etapa 2)

1. Com o `origin` da VPS ainda no original, atualizar pelo botão "Atualizar" (ou
   `bash hostgator-setup-kit/update.sh --to v1.44.0`) para a `v1.44.0`.
2. Conferir `/api/v1/health` = `1.44.0` e `git -C /opt/deskcommcrm describe --tags --exact-match
   HEAD` = `v1.44.0`.
3. **Daí até a migração (6.4), ninguém clica em "Atualizar"**: o original lança ~3 versões por dia
   e qualquer uma tira a VPS da base. Se acontecer, parar e refazer a base (seção 8) na versão em
   produção — nunca voltar a VPS para trás (6.4 explica por que o `update.sh` não recusa).

### 5.1 Etapa 1 — Configuração, sem código (parcial)

Feito em 2026-09-23:
- `/admin/marca`: nome **Convexy**, cor **#146bff**, logo claro enviado.
- `.env` da VPS: `APP_NAME="Convexy"` (lido direto por login, cadastro, boas-vindas e textos
  legais — `lib/branding.ts:99-105`), `APP_ACCENT_HEX="#146bff"`, `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL="nao-responda@convexy.tech"`.

Pendente do operador:
- SMTP do Resend no Supabase (painel do projeto `<projeto-supabase>`).
- Modelos de e-mail do GoTrue: `SUPABASE_ACCESS_TOKEN=… bash hostgator-setup-kit/marca-emails.sh`
  (sobe pela Management API — o Supabase é na nuvem). `--render-em` só gera o HTML
  (`marca-emails.sh:232-256`).

**Pronto quando:** título da aba e texto do login dizem "Convexy"; convite de equipe chega por
e-mail pelo Resend; e-mails de acesso chegam com assunto "… — Convexy".

### 5.2 Etapa 2 — `v1.44.0-cvx.1` e `v1.44.0-cvx.2`: fork só com infraestrutura

Nenhuma mudança visual. Existe para ensaiar, com diff trivial, o que é arriscado: numeração,
imagens próprias, botão "Atualizar", rollback. A `-cvx.1` é a migração (feita à mão); a `-cvx.2`
só acrescenta sua seção no `CHANGELOG.md` e existe para provar que o botão oferece e aplica uma
versão Convexy. Conteúdo na seção 6.

### 5.3 Etapa 3 — `v1.44.0-cvx.3`: identidade visual

Paleta, fontes, logo escuro e marca das clínicas desligada. Conteúdo na seção 7.

## 6. Etapa 2 — infraestrutura do fork

### 6.1 Repositório (ordem obrigatória)

1. **Tags do original ficam fora do espaço `refs/tags/` local.** No clone de trabalho:
   `git config remote.upstream.tagOpt --no-tags`, e toda busca de versão do original vai para um
   espaço privado: `git fetch --no-tags upstream refs/tags/vA.B.C:refs/upstream-tags/vA.B.C`.
   Motivo: o agente anuncia a maior tag `v*` que existir, sem olhar procedência
   (`agent.sh:131`), e `v1.45.0 > v1.44.0-cvx.N` na ordenação (6.3). Tags são sempre empurradas
   **pelo nome** (`git push origin v1.44.0-cvx.N`); nunca `--tags` nem `--follow-tags` (uma tag
   anotada do original alcançável pela `main` iria junto, dispararia `publish-image.yml` e moveria
   `stable` para o código sem identidade — `publish-image.yml:22-23,453,477-483`).
2. **Única exceção: a tag da base.** Com as Actions do fork ainda **desligadas** (estado de
   nascença de um fork), empurrar o objeto original da base, sem recriá-lo:
   `git fetch --no-tags upstream refs/tags/v1.44.0:refs/tags/v1.44.0 && git push origin
   refs/tags/v1.44.0`. Uma tag recriada teria outro objeto e a VPS recusaria o fetch ("would
   clobber existing tag"). Ela serve ao rollback para o original (6.4). Com as Actions
   desligadas, não publica imagem `victorrabyfs/*:1.44.0` nem move `stable`. É a única tag do
   original que o fork terá (8.5).
3. `main` do fork avança (fast-forward) para `v1.44.0`: o `main` atual (`6c73680`) não tem commit
   próprio e é ancestral da tag (conferido). Push da `main` ainda com Actions desligadas.
4. Ligar as Actions do fork e, **antes de qualquer outro push**, desligar sem editar arquivo:
   `gh workflow disable release.yml` (roda em todo push na `main`, falha sem os secrets do
   original e corta tag por heurística — `release.yml:21-24,65-215`), `relogio.yml`,
   `vigia-de-colisao.yml`. `acolhida.yml` já é inerte fora do original. `ci.yml`, `e2e.yml`,
   `perf.yml` e `publish-image.yml` seguem ligados.
5. **Segurança da cadeia.** Depois da troca, quem cria tag `v*` no fork executa bash como root na
   VPS após um clique (`agent.sh` → `update.sh:160,178,185`; sem verificação de assinatura).
   Obrigatório:
   - 2FA na conta; nenhum colaborador com escrita;
   - **ruleset de tag** (não a "proteção de tag" antiga) sobre `refs/tags/v*`: criação,
     atualização e remoção restritas, bypass só do dono;
   - proteção da `main` exigindo `verify`, `invariants`, `build-and-size`, `e2e`, `imagens-ok`
     (nomes conferidos: `ci.yml:452,603`, `perf.yml:21`, `e2e.yml:1933`,
     `publish-image.yml:805`);
   - regra: **tag publicada nunca é refeita** — a VPS não aceita tag reapontada; corrigir é `N+1`;
   - o job `a-tag-veio-da-main` de `publish-image.yml` fica como está;
   - cada merge do original (seção 8) é revisão de segurança, não só de conflito.
6. Criar `CONVEXY.md` nesta etapa (7.1 descreve o formato): a etapa 2 já altera arquivos do
   original.
7. A branch de trabalho `convexy/identidade` nasceu sobre a `v1.42.0`: antes de implementar,
   `git merge refs/upstream-tags/v1.44.0` nela (ou recriá-la a partir da `main` do fork depois do
   passo 3, trazendo só os commits de `docs/superpowers/`).

### 6.2 Troca de namespace e ajustes do kit

Cobrados por `tests/unit/namespace-das-imagens.test.ts` (`RECADO_AO_FORK` — o teste em si não
muda):

| Arquivo | Alteração |
|---|---|
| `hostgator-setup-kit/_common.sh` | `IMG_NS="ghcr.io/victorrabyfs"`; URL padrão de `ultima_versao_publicada` para o fork; filtro de versão (abaixo) |
| `docker-compose.prod.yml` | `image:` padrão de `app`, `worker`, `scheduler` e `voice-agent` |
| `.env.hostgator.example` | `*_IMAGE` |
| `tests/unit/_identidade-deste-repo.ts` | `NAMESPACE_DESTE_REPO = "ghcr.io/victorrabyfs"` (e dono) |
| `hostgator-setup-kit/install.sh`, `comecar.sh` | `REPO_URL` padrão |
| `Dockerfile`, `Dockerfile.worker`, `Dockerfile.scheduler`, `Dockerfile.voice-agent` | label `org.opencontainers.image.source` → fork |

Ajustes além do namespace:

| Arquivo | Alteração | Motivo |
|---|---|---|
| `hostgator-setup-kit/_common.sh:1068-1073` | `ultima_versao_publicada` passa a aceitar `-cvx.N` (troca `grep -v -- '-'` por `grep -vE -- '-(rc|alpha|beta)'`) | Sem isso, instalação nova a partir do fork pega a versão sem hífen, não acha a imagem no fork e cai para `stable` sobre o código do topo da `main` (`install.sh:866,1242`) |
| `tests/unit/release-chega-na-lp.test.ts:280-286` | regex do cabeçalho aceita `(-cvx\.\d+)?` | Sem isso a seção `## [1.44.0-cvx.1]` reprova o `verify`, check obrigatório |

**Quatro imagens**: `deskcommcrm`, `deskcomm-worker`, `deskcomm-scheduler`,
`deskcomm-voice-agent` — **todas públicas no GHCR** (pacote novo nasce privado). `docker login`
não serve: `ghcr_status` consulta com token anônimo (`_common.sh:1096-1108`).

Ficam apontando para o original, de propósito, registrados no `CONVEXY.md` (não estão na cadeia de
atualização): `ubuntu-local-installer.sh:40`, `hostgator-setup-kit/README.md:25`,
`hostgator-setup-kit/CLAUDE.md:17`, `hostgator-setup-kit/diagnostico.sh:22`,
`scripts/instalar-guias.sh:57`, `.claude/skills/deskcomm-instalar/SKILL.md:94` e a cópia em
`.agents/`, `infra/executor-proprio/*.sh`.

### 6.3 Versões

- Formato `vX.Y.Z-cvx.N`, `X.Y.Z` = versão do original na base, `N` cresce e nunca se repete.
  Medido (git 2.53): `git tag -l 'v*' --sort=-v:refname` ordena `v1.45.0 > v1.44.1 >
  v1.44.0-cvx.10 > v1.44.0-cvx.2 > v1.44.0-cvx.1 > v1.44.0`. Na VPS,
  `git config --get versionsort.suffix` tem de estar vazio (com `-`, a ordem inverte). Pré-release
  do original (`v1.44.0-rc1`) ordena acima de `-cvx.N` — mais um motivo para nunca haver tag do
  original no fork nem na VPS.
- `publish-image.yml` publica só `1.44.0-cvx.N` (pré-release não gera `1.44`), move `stable`
  (`promover-stable` aceita pré-release) e reporta `APP_VERSION=1.44.0-cvx.N` em
  `/api/v1/health`; `latest` = topo da `main` do fork.
- Tag anotada, criada à mão, depois do merge na `main`, sem fragmento em `.changes/`.
- **Toda tag Convexy tem uma seção `## [X.Y.Z-cvx.N] — AAAA-MM-DD` no `CHANGELOG.md`**, escrita à
  mão: o botão "Atualizar" mostra as notas cortando o changelog no cabeçalho da versão instalada
  (`agent.sh:222`, `lib/system/changelog.ts`, posicional). **Ordem fixa** do topo para baixo:
  `## [Não lançado]` › seções `-cvx` da base atual (mais nova primeiro) › `## [A.B.C]` e demais
  seções do original trazidas no merge › seções `-cvx` da base anterior › `## [base anterior]` …
  Assim, quem sobe de `1.44.0-cvx.3` para `1.45.0-cvx.1` vê as notas do original, inclusive
  "⚠️ Requer atenção". `lib/release/cabe-na-tela.ts:96` trata `-cvx` como seção sem número (igual a
  `[Não lançado]`): as seções Convexy ficam fora da régua de tamanho, e nunca acima de
  `[Não lançado]`. O corte da tela tem teto de 30.000 bytes em saltos grandes.
- Instalação nova a partir do fork (com o ajuste da 6.2): `install.sh` instala a última `-cvx`.

### 6.4 Migração da VPS para o fork

Fora do expediente das clínicas (recriação dos contêineres e pull de quatro imagens).

1. **Pré-voo:**
   - as quatro imagens `:1.44.0-cvx.1` respondem 200 anônimo no GHCR;
   - VPS em `v1.44.0` exata (`describe --tags --exact-match HEAD`) e `/api/v1/health` = `1.44.0`;
   - `cp /opt/deskcommcrm/.env /opt/deskcommcrm/.env.bak-AAAAMMDD` (o `update.sh` roda
     `backup.sh` — dump e storage local —, mas não salva o `.env`, e `gravar_imagens` regrava as
     chaves `*_IMAGE`/`*_PULL_POLICY`; as chaves da etapa 1 sobrevivem). O storage é do Supabase
     na nuvem: o tar local não cobre logos.
2. `cd /opt/deskcommcrm && git remote set-url origin https://github.com/victorrabyfs/DeskcommCRM.git`
3. **Limpar as tags locais do original:** `git tag -l | xargs -r git tag -d && git fetch --tags
   origin`. O agente busca tags do `origin` a cada 5 min (`agent.sh:127`) e `git fetch` nunca
   apaga tag local: sem este passo, a `v1.45.0` do original já guardada na VPS vence qualquer
   `-cvx`, o agente procura `victorrabyfs/deskcommcrm:1.45.0`, não acha e fica mudo
   (`_common.sh:315-337`, `agent.sh:194`); e o comando que a tela ensina (`update.sh` sem `--to`,
   `UpdatePanel.tsx:18`) faria checkout do código do original e releria o `_common.sh` dele
   (`update.sh:63,178`), devolvendo a VPS ao original em silêncio. O mesmo passo é o procedimento
   para qualquer tag errada que chegue à VPS.
4. **Primeira atualização, manual:** `bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.1`. O
   botão não aparece nesta transição: o `agent.sh` da v1.44.0 procura a imagem no namespace do
   original (`agent.sh:181-194`). O `update.sh` funciona porque relê o `_common.sh` da tag nova
   depois do checkout (`update.sh:178`).
5. Publicar a `-cvx.2` (5.2) e aplicá-la **pelo botão**.

**Rollback para o original** (válido só enquanto a base é a `v1.44.0` e antes da etapa 3):
`git remote set-url origin https://github.com/melgarafael/DeskcommCRM.git`, limpeza de tags do
passo 3, `bash hostgator-setup-kit/update.sh --to v1.44.0 --force` (volta ao `_common.sh` da
v1.44.0 e grava as imagens `ghcr.io/melgarafael/*:1.44.0`). Funciona porque a `v1.44.0` do fork é
o mesmo objeto do original (6.1.2). Depois do primeiro merge do original (seção 8), rollback é só
para a `-cvx` anterior. O `update.sh` **não recusa retrocesso** (`is_already_in_head`,
`_common.sh:759-771`, só testa ancestralidade): voltar código com banco mais novo é possível e
silencioso — por isso o passo 0.3 e o pré-voo. O botão só faz rollback automático de imagem
quando a atualização veio dele e falhou (`agent.sh:284-387`).

**Pronto quando:**
- `/api/v1/health` responde `1.44.0-cvx.1`, depois `1.44.0-cvx.2` aplicada **pelo botão**;
- `.env` da VPS aponta as quatro imagens para `ghcr.io/victorrabyfs`;
- `git -C /opt/deskcommcrm tag -l` só lista `v1.44.0` e `v1.44.0-cvx.*`;
- o rollback acima foi ensaiado numa VM descartável, com a saída real registrada no `CONVEXY.md`.

## 7. Etapa 3 — identidade visual (`v1.44.0-cvx.3`)

### 7.1 Arquivos novos da Convexy

```
app/convexy/tema.css                        paleta e fontes (7.2, 7.3)
lib/convexy/barra-do-navegador.ts           cores do theme-color (7.5)
lib/convexy/marca-por-organizacao.ts        leitura da chave (7.6)
supabase/migrations/<ts>_9001_logo_escuro_da_instalacao.sql   (7.7)
tests/unit/convexy-tema-cobre-os-tokens.test.ts   (7.2)
tests/unit/convexy-tema-contraste.test.ts          (7.2, 7.5)
tests/unit/convexy-logo-escuro.test.tsx            (7.4)
tests/unit/convexy-marca-por-organizacao.test.ts   (7.6)
tests/e2e/convexy-identidade.spec.ts               (7.9)
CONVEXY.md                                  criado na etapa 2 (6.1.6)
```

`CONVEXY.md`: uma entrada por arquivo do original alterado — trecho exato, local no arquivo,
motivo e como reaplicar num conflito; mais a lista de "fica de propósito" (6.2) e os desvios
aceitos (7.2, 7.5, 7.6).

### 7.2 Paleta — `app/convexy/tema.css`

Sobrepõe os tokens de `app/globals.css` com **seletor de atributo dobrado**
(`[data-theme="light"][data-theme="light"]`, `[data-theme="dark"][data-theme="dark"]`,
especificidade 0,2,0), **fora de qualquer `@layer`**. Os blocos do original (`:root`,
`[data-theme="light"]`, `[data-theme="dark"]` — `globals.css:33,252,329`) também estão fora de
camada, com 0,1,0: o `tema.css` vence em qualquer ordem de carga (que difere entre dev e produção
— `lib/branding/css.ts:17-23`), sem `!important`. O modo escuro é `@custom-variant dark
(&:where([data-theme="dark"], …))` (`globals.css:25`), e o `data-theme` está sempre gravado,
inclusive no modo "sistema" (`app/layout.tsx:122,279`, `lib/theme.tsx:42`). Toda cor chega aos
utilitários por `var(--color-…)` em tempo de execução (`@theme inline`); os aliases (`card`,
`popover`, `muted`, `input`, `background`, `secondary`, `--ring`) apontam para os tokens abaixo e
acompanham. Não toca em `--color-accent-*` (vem da cor configurada) nem nas cores semânticas.

| Token | Claro | Escuro |
|---|---|---|
| `--color-bg` | `#F8FAFC` | `#0B0D10` |
| `--color-surface` (cartão, popover, campo) | `#FFFFFF` | `#131923` |
| `--color-surface-elevated` | `#F1F5F9` | `#171E2A` |
| `--color-overlay` | `rgba(11, 13, 16, 0.42)` | `rgba(0, 0, 0, 0.60)` |
| `--color-text` | `#0B0D10` | `#F8FAFC` |
| `--color-text-muted` | `#475569` | `#94A3B8` |
| `--color-text-subtle` | `#64748B` | `#64748B` |
| `--color-border` | `#E2E8F0` | `#1E293B` |
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

Popover, cartão e campo compartilham `--color-surface`: são aliases fixados pelo `@theme inline`
do original (`globals.css:529-532`). Desvio aceito em relação ao CRM atual (popover `#171E2A`,
campo `#111720`).

**Testes novos:**
- `convexy-tema-cobre-os-tokens`: (a) toda propriedade declarada no `tema.css` existe nos blocos
  `[data-theme="light"]`/`[data-theme="dark"]` do `globals.css`; (b) todo `--color-*` desses
  blocos que não seja acento, semântica, agenda ou alias em `var()` está coberto pelo `tema.css`.
  É o que pega o original renomeando ou criando token (`globals.css` teve 12 commits em 30 dias).
- `convexy-tema-contraste`: lê o `tema.css` e, com `razaoDeContraste` (`lib/branding/contraste.ts:58`),
  exige ≥ 4,5 para `text` e `text-muted` e ≥ 3 para `text-subtle` sobre `bg`, `surface` e
  `surface-elevated`, nos dois temas. Valores calculados: pior caso `text-subtle` escuro sobre
  `surface-elevated` = 3,51; todos passam.

### 7.3 Fontes

- `app/layout.tsx`: `Inter` (pesos 400, 500, 600, 700) carregada com **`variable:
  "--font-atkinson"`** no lugar de `Atkinson_Hyperlegible`. O nome da variável fica o do original
  de propósito: `--font-sans` está no `@theme inline` e é inlinado na compilação
  (`globals.css:455,535`), o `body` usa `var(--font-atkinson)` direto (`globals.css:701`) e
  `tests/unit/tailwind-tokens.test.ts:89-93` exige o literal `"--font-atkinson"` no layout.
- `Lexend_Deca` (400–700) com `variable: "--font-lexend"`.
- `tema.css` começa com `@layer theme, base, components, utilities;` (fixa a ordem das camadas do
  Tailwind caso o `tema.css` carregue antes do `globals.css`) e contém:
  - dentro de `@layer base`: `h1, h2, h3 { font-family: var(--font-lexend), var(--font-atkinson),
    sans-serif; }` — em camada, para que utilitários como `font-mono` (quatro `<h1>` de
    `audit/incidents/lgpd`) continuem vencendo. `DialogTitle`/`SheetTitle`/`AlertDialogTitle`
    (`h2` do Radix) recebem Lexend; `CardTitle` (`div`) não — aceito (seção 3);
  - **fora de camada**: `body { font-feature-settings: normal; }`, anulando o `"ss01"`
    (`globals.css:703`, em `@layer base`) que em Inter troca o desenho dos dígitos. Dentro de
    `@layer base` empataria com o original e dependeria da ordem de carga.
- IBM Plex Mono continua.

### 7.4 Logo escuro — campo novo em `/admin/marca`

**Banco** — migration 9001 (7.7), no mesmo padrão do `logo_path` (`baseline.sql:14418-14423`):
`add column if not exists logo_dark_path text`, limpeza de valores fora do formato, `drop
constraint if exists` + `add constraint platform_branding_logo_dark_path check (logo_dark_path ~
'^platform/<uuid>\.(png|jpg)$')` com a mesma regex, `comment on column`, `notify pgrst, 'reload
schema'`. `platform_branding` só é escrita por `service_role`; o bucket `brand-logos` é público:
nada de RLS ou policy a ajustar. `lib/database.types.ts` (tipo gerado) ganha a coluna.

**Rota** `app/api/v1/marca/logo/route.ts`:
- `variante: z.enum(["claro", "escuro"])`, padrão `claro`, no POST (form) e no DELETE (query
  `?variante=`); `escuro` só vale com `escopo === "instalacao"`.
- `caminhoGravado`, `gravarCaminho` (`upsert({ id: 1, <coluna>: … })`) e a auditoria
  (`fields_changed`) escolhem `logo_path` ou `logo_dark_path` pela variante; mesma validação por
  bytes (PNG/JPG ≤ 512 KB) e mesmo apagar-o-anterior.

**Tela:**
- `components/branding/CampoDeLogo.tsx`: prop `variante` (padrão `claro`) enviada no POST
  (linha ~219) e no DELETE (~241); `id` e `data-campo-de-logo` incluem a variante quando é
  `escuro` (`logo-instalacao-escuro`) — o `#logo-instalacao` dos e2e
  (`logo-moldura-no-tema-escuro.spec.ts:215`, `marca-logo.spec.ts`) continua único; a prévia da
  variante escura fica sobre fundo escuro (hoje a "Aparência escura" põe `bg-white`, linha 328).
- `app/admin/(protected)/marca/page.tsx` (lê `logo_path`, linhas 77 e 97) lê também
  `logo_dark_path` e repassa; `_form.tsx` ganha o segundo `CampoDeLogo`, "Logo para o tema
  escuro". Textos pelo dicionário de i18n (chaves junto do bloco do logo, `dicionario.ts` ~3750,
  não no fim do objeto). Tradução para outros idiomas não é exigida
  (`catalogo-de-idioma-tem-forma.test.ts` não cobra completude).

**Leitura** — o campo novo `logoDarkUrl?: string | null` é **opcional** em todos os tipos (vários
testes montam esses objetos literais: `marca-na-fachada-de-acesso`, `marca-do-produto`,
`branding.test.ts:12`):
- `lib/branding/instalacao.ts`: coluna em `COLUNAS`. Atenção: ali é "tudo ou nada"
  (`instalacao.ts:88-105`) — sem a coluna no banco, o PostgREST devolve 42703 e a instalação perde
  **toda** a marca do banco (cai no `.env`). Na VPS o `update.sh` aplica o baseline antes da
  imagem; o risco entra na seção 10.
- `lib/branding/resolve.ts`: `LinhaDaInstalacao`, `CamadaDeMarca`, `camadaDaInstalacao`,
  `resolverMarca`, `MarcaResolvida`. `logoDarkUrl` só é preenchido quando o `logoUrl` resolvido
  vem da camada do banco da instalação (`origens.logoUrl`): logo de organização ou do `.env`
  nunca é trocado pelo escuro da instalação.
- Barra lateral: `lib/branding.ts` (tipo `Branding`), `lib/branding/contexto.tsx`
  (`useMarcaDaInstalacao`) e `MarcaDosClientComponents` em `app/layout.tsx` (hoje repassa só
  `name`, `logoUrl`, `initial`) passam o campo.
- Login: `lib/branding/saida.ts` (`MarcaDeSaida` e o mapeamento de `marcaDaSaida`) passa o campo;
  e-mails e demais consumidores de `marcaDaSaida` o ignoram.

**Desenho** (`components/shell/Sidebar.tsx:143` e `app/(public)/layout.tsx:79`): hoje a moldura é
uma `div` com `dark:bg-white dark:px-2 dark:py-1 dark:shadow-sm` em volta do `<img>`. Com
`logoDarkUrl` **e** logo exibido vindo da instalação (na barra lateral: `!activeOrg?.marca?.logoUrl`,
`Sidebar.tsx:114`), a `div` da moldura inteira ganha `dark:hidden` e, como irmão dela, um
`<img src={logoDarkUrl}>` com `hidden dark:block`, sem moldura. Sem `logoDarkUrl`, nada muda. A
troca é por CSS, sem divergência de hidratação. O primeiro `<img>` continua o claro, dentro da
moldura: `logo-nao-some-no-tema-escuro.test.ts`, `marca-do-produto.test.tsx`,
`marca-sem-divergencia-de-hidratacao.test.tsx` e `marca-na-fachada-de-acesso.test.tsx` seguem
válidos.

**Teste** `convexy-logo-escuro.test.tsx`: no jsdom o Tailwind não se aplica — usar
`getAllByRole("img")` e conferir as classes (`dark:hidden` na moldura, `hidden dark:block` no
segundo `<img>`), mais o caso "logo da organização presente → sem segundo `<img>`". O e2e (7.9)
limpa `logo_dark_path` no `afterAll`: o banco de e2e é compartilhado e
`logo-moldura-no-tema-escuro.spec.ts` mede a moldura no escuro.

### 7.5 Barra do navegador, acento e cores fixas

`lib/branding/regua-do-produto.ts` é gerado de `globals.css` e **não muda**
(`branding-regua-do-produto.test.ts` o prende ao original). Consequências:

- `<meta name="theme-color">`: hoje `export const viewport = { themeColor:
  coresDaBarraDoNavegador(REGUA_DO_PRODUTO) }` (`app/layout.tsx:116-118`). Passa a vir de
  `lib/convexy/barra-do-navegador.ts`, no mesmo formato `[{ media, color }]`: `#F8FAFC` (light) e
  `#0B0D10` (dark). A barra segue a preferência do sistema operacional, não o tema escolhido no
  app — como no original. `branding-barra-do-navegador.test.ts:68-82` só proíbe os hex antigos no
  layout: passa.
- Escala do acento: derivada contra o fundo do original. No escuro o fundo novo é mais escuro
  (contraste só sobe). No claro cai um pouco (`#F8FAFC` tem luminância 0,955 contra 0,950 do
  original; `#146BFF` cru dá 4,39 sobre o fundo novo). O teste de contraste (7.2) mede também
  `derivarMarca("#146BFF", …)` — texto de acento e `accent-fg` — contra `bg` e `surface` novos,
  com os mesmos pisos.
- Cores fixas que ficam na paleta do original, aceitas: nome do produto sem logo em
  `components/branding/MarcaDoProduto.tsx:30-31` e `lib/branding/desenho.ts:101`;
  `--color-accent-fg` escuro `#161510` (só vale sem cor de marca configurada — aqui há);
  prévias do `CampoDeLogo` (lê `REGUA_DO_PRODUTO`); fundo dos e-mails.

### 7.6 Marca das clínicas desligada

- **Chave:** `ORG_BRANDING_ENABLED` em `lib/env.ts`, `z.string().optional().default("true")`;
  **só o valor exato `false` desliga** (nunca `z.enum`: um valor inválido derrubaria a primeira
  requisição com o contêiner `healthy` — `lib/env.ts:237-247`). Entra em `.env.example` e
  `.env.hostgator.example` (DoD 9; `env-example-sync.test.ts`). Linhas postas junto das outras
  chaves de marca, não no fim. `lib/convexy/marca-por-organizacao.ts` exporta
  `marcaPorOrganizacaoLigada(): boolean` e é o único lugar que interpreta a chave. Todos os
  leitores são de servidor (conferido: nenhum `"use client"` importa `lib/branding/organizacao`).
- **Padrão `true` é deliberado:** o CI do fork roda com o comportamento do original, e
  `tests/e2e/marca-logo.spec.ts` e `tests/unit/sidebar-nome-da-organizacao.test.tsx` passam sem
  alteração. A VPS precisa de `ORG_BRANDING_ENABLED=false` no `.env` (passo manual, 7.8) — desvio
  da regra "bump não exige editar `.env`", aceito por ser decisão de instalação do fork.
- **Leitura:** com a chave desligada, `marcaDaOrganizacaoDeSettings()`
  (`lib/branding/organizacao.ts:73`) devolve `null`. É o único parser de `settings.branding`;
  `resolverMarcaDaOrganizacao` (layout, CSS da organização) e `marcaDaSaida(orgId)` (e-mail,
  push, LGPD, convite) passam por ele e caem na marca da instalação. Marcas já gravadas ficam no
  banco, ignoradas.
- **Escrita:** os únicos que gravam `settings.branding` são `updateMarcaDaOrganizacao` (RPC
  `fn_definir_marca_da_organizacao`) e a rota de logo (RPC `fn_definir_logo_da_organizacao`).
  - `app/actions/settings/updateMarcaDaOrganizacao.ts` devolve `{ ok: false, error:
    "marca_por_organizacao_desligada" }` antes de tocar o banco; o código entra na união
    `UpdateMarcaDaOrganizacaoResult` (linhas 17-29), com texto no i18n.
  - `app/api/v1/marca/logo/route.ts` responde 404 para `escopo === "organizacao"` no **POST e no
    DELETE**.
  - As RPCs não mudam (o banco não conhece o `.env`).
- **Tela e menu:** `/app/settings/marca` responde `notFound()`. O item continua em `NAV_CATALOG`
  (`navegacao-completude.test.ts:33` reprova tela sem porta). Ele não está na barra lateral
  (`catalogo.ts:816-830`): aparece no hub `/app/settings` e no ⌘K. Seguindo o modelo que já
  existe para `modulos_ligados`:
  - campo novo `marcaPorOrganizacao: boolean` em `ActiveOrg` (`lib/auth/types.ts:180`), preenchido
    em `app/app/layout.tsx` — o ⌘K (`components/shell/CommandPalette.tsx:59`) o lê;
  - `app/app/settings/page.tsx` (server) chama `marcaPorOrganizacaoLigada()` e repassa ao
    `components/shell/NavHub.tsx`;
  - parâmetro **opcional** (padrão ligado) em `sidebarGroups`, `hubSections` e `searchable`
    (`lib/navigation/registry.ts`), repassado ao filtro de `destinosDaInterface()`
    (`lib/navigation/interface.ts:102`). Os outros chamadores (`AlertsBell.tsx`,
    `InterfaceEditor.tsx`) não mudam.
- `/admin/marca` não é afetada.

### 7.7 Migration Convexy

- Faixa própria: `9001` em diante (`AAAAMMDDHHMMSS_9001_logo_escuro_da_instalacao.sql`), para
  nunca colidir com a sequência do original. Conferido: nenhum guarda exige sequência contígua.
  `scripts/checar-colisao-de-migration.sh` roda no `verify` (`ci.yml:263-265`) e no
  `vigia-de-colisao.yml` (desligado no fork); só reprova NNNN ou timestamp **repetido** e usa o
  maior NNNN para sugerir o "próximo livre" (no fork, `9002`). As regex de
  `manifest-x-migrations` (`\d{4,5}_`) e do script (`[0-9]{4}`) aceitam `9001`.
- Tripla do projeto:
  - arquivo em `supabase/migrations/`;
  - bloco `-- ---- logo escuro da instalação (migration 9001) ----` no `supabase/baseline.sql`
    **logo depois do bloco "logo da marca: BUCKET e COLUNA (migration 0158)"** (~linha 14430),
    não no fim: o fim tem `fn_conferir_modulos_instalados()` (0340), que levanta ERROR de
    propósito, e é onde o original acrescenta blocos (conflito a cada merge). Um bloco só com
    coluna e constraint pode ficar ali (`varredura-anon-e-o-ultimo-bloco` só restringe `create
    function` e `grant … to anon`);
  - linha no `MANIFEST.md` (`merge=union` no `.gitattributes`: acréscimos não conflitam).
- `hostgator-setup-kit/update.sh:258-281` reaplica o baseline na VPS; `test-db.sh` aplica o
  baseline, não a cadeia — o timestamp da 9001 não cria risco de ordem. `pnpm test:db` verde.
- Em conflito do `baseline.sql` num merge: prevalece o lado do original, e o bloco Convexy é
  reaplicado no mesmo lugar, conforme o `CONVEXY.md`.

### 7.8 Aplicar a etapa 3 na VPS

1. `cp .env .env.bak-AAAAMMDD`; acrescentar `ORG_BRANDING_ENABLED=false` ao `.env`.
2. Pelo botão (ou `update.sh --to v1.44.0-cvx.3`): o baseline, com a 9001, é reaplicado antes da
   imagem nova subir.
3. Enviar o logo escuro (PNG) em `/admin/marca`.

**Rollback para `-cvx.2`:** `update.sh --to v1.44.0-cvx.2 --force`. A coluna `logo_dark_path` fica
(inofensiva); o código antigo ignora a chave e as marcas de organização gravadas voltam a
aparecer.

### 7.9 Alterações em arquivos do original (etapa 3) e critérios

| Arquivo | Alteração |
|---|---|
| `app/layout.tsx` | Fontes (7.3), import de `tema.css`, `viewport.themeColor` (7.5), `logoDarkUrl` em `MarcaDosClientComponents` (7.4) |
| `app/admin/(protected)/marca/page.tsx`, `_form.tsx` | Logo escuro |
| `components/branding/CampoDeLogo.tsx` | `variante` |
| `app/api/v1/marca/logo/route.ts` | `variante`; 404 para organização com a chave desligada |
| `lib/branding/instalacao.ts`, `resolve.ts`, `saida.ts`, `contexto.tsx`, `lib/branding.ts` | `logoDarkUrl` |
| `components/shell/Sidebar.tsx`, `app/(public)/layout.tsx` | Moldura + segundo `<img>` |
| `lib/database.types.ts` | Coluna nova |
| `lib/branding/organizacao.ts` | Chave na leitura |
| `app/actions/settings/updateMarcaDaOrganizacao.ts` | Chave na escrita + código de erro |
| `app/app/settings/marca/page.tsx`, `app/app/settings/page.tsx`, `app/app/layout.tsx` | Página e menu |
| `lib/auth/types.ts`, `lib/navigation/registry.ts`, `components/shell/NavHub.tsx`, `components/shell/CommandPalette.tsx` | Menu |
| `lib/env.ts`, `.env.example`, `.env.hostgator.example` | `ORG_BRANDING_ENABLED` |
| `lib/i18n/dicionario.ts` | Textos do campo novo e do erro |
| `supabase/baseline.sql`, `supabase/migrations/MANIFEST.md` | Migration 7.7 |
| `tests/e2e/aviso-de-caso-no-whatsapp.spec.ts:280`, `conversa-do-caso.spec.ts:340`, `passagem-com-contexto.spec.ts:261` | `/Atkinson/` → `/Inter/` |
| `CHANGELOG.md` | Seção da versão (6.3) |

**Pronto quando:**
- no e2e `convexy-identidade.spec.ts`, em `/login` e `/app/settings` (rota fixa: `/app`
  redireciona para uma página inicial variável), o primeiro nome de `getComputedStyle(body)
  .fontFamily` casa `/Inter/i` e o de `h1` casa `/Lexend/i` (o Chrome põe aspas em nomes com
  espaço e o `next/font` pode gerar `__Inter_<hash>`);
- os tokens da tabela 7.2 medidos por `getPropertyValue` nas mesmas rotas, nos dois temas, batem
  com a tabela (comparação sem diferenciar maiúsculas);
- os testes novos da 7.1 verdes;
- com os dois logos enviados, o claro aparece só no tema claro e o escuro só no escuro, sem
  moldura branca no escuro, na barra lateral e no login;
- com `ORG_BRANDING_ENABLED=false`: "Marca" some do hub de ajustes e do ⌘K, `/app/settings/marca`
  dá 404, action e upload (POST e DELETE) de organização recusados, marca gravada de uma
  organização de teste não aparece;
- `curl https://<dominio-de-producao>/login` traz `theme-color` `#F8FAFC` e `#0B0D10`;
- `git diff --name-only refs/upstream-tags/<base> main` (hoje `v1.44.0`) bate com o `CONVEXY.md` (arquivos
  alterados do original) mais os arquivos novos da 7.1 e `docs/superpowers/`.

## 8. Trazer uma atualização do original

Cadência: **semanal**, ou fora dela quando o original publicar correção de segurança — nunca
release a release. Nada entra enquanto a etapa 3 não estiver validada em produção.

1. `git fetch --no-tags upstream refs/tags/vA.B.C:refs/upstream-tags/vA.B.C`; branch a partir da
   `main` do fork; `git merge refs/upstream-tags/vA.B.C`.
2. Conflitos esperados: arquivos das tabelas 6.2 e 7.9, e sempre `CHANGELOG.md` (ordem da 6.3).
   Resolver com o `CONVEXY.md` aberto; `baseline.sql` conforme 7.7; `dicionario.ts` reaplicando o
   bloco no mesmo lugar.
3. Revisar o diff do original como código que rodará como root na VPS. Em especial
   `git diff --stat main refs/upstream-tags/vA.B.C -- .github/workflows`: workflow **novo** entra
   ligado no fork (desligar o que não servir) e job obrigatório renomeado trava a proteção da
   `main`.
4. CI verde (obrigatório pela proteção da `main`) + conferência em tela, claro e escuro.
5. Merge na `main`; seção `## [A.B.C-cvx.1]` no `CHANGELOG.md`; tag `vA.B.C-cvx.1` pelo nome; o
   CI publica; o botão aparece. **A tag `vA.B.C` do original não vai para o fork** (só a
   `v1.44.0` foi, uma vez, com as Actions desligadas — 6.1.2): com as Actions ligadas ela
   publicaria `victorrabyfs/*:A.B.C` sem identidade e, ordenando acima de `vA.B.C-1-cvx.N`,
   seria oferecida pelo botão às VPS. A base do diff fica em `refs/upstream-tags/` no clone local.

Automatizar os passos 1–2 fica para depois de o fluxo manual rodar uma vez.

## 9. Testes do original afetados

Ajustados (não desligados), cada um registrado no `CONVEXY.md` com o motivo:

- `tests/unit/_identidade-deste-repo.ts` (6.2) — `namespace-das-imagens.test.ts` em si não muda;
- `tests/unit/release-chega-na-lp.test.ts:280-286` — cabeçalho `-cvx` (6.2);
- `tests/e2e/aviso-de-caso-no-whatsapp.spec.ts:280`, `conversa-do-caso.spec.ts:340`,
  `passagem-com-contexto.spec.ts:261` — `fontFamily` `/Atkinson/` → `/Inter/` (7.3).

Conferidos e **sem alteração**: `tests/e2e/marca-logo.spec.ts` e
`tests/unit/sidebar-nome-da-organizacao.test.tsx` (chave ligada por padrão no CI);
`tests/e2e/icone-da-marca.spec.ts:51`; `tailwind-tokens.test.ts:89-93`;
`branding-barra-do-navegador.test.ts`; `agenda-kit-visual.spec.ts` (trilhas ≥ 3 continuam, no
escuro sobem); `logo-moldura-no-tema-escuro.spec.ts` (limiar 200/255 separa o branco de
`#131923`); `branding-pares-pintados`, `branding-regua-do-produto`,
`branding-tema-claro-escopavel`, `branding-marca-css.test.ts:340-350`; os quatro testes de logo da
7.4; `catalogo-de-idioma-tem-forma.test.ts`.

Suítes antes de cada tag: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:shell`,
`pnpm test:db` (etapa 3) e `pnpm test:e2e`.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Push de tag no fork vira execução como root na VPS | 6.1.5 (2FA, ruleset de tag, proteção da `main`) |
| Botão oferecer versão do original / VPS voltar ao original em silêncio | Tags do original fora de `refs/tags/` (6.1.1); limpeza de tags na VPS (6.4.3); `release.yml` desligado (6.1.4) |
| Tag do original vazar para o fork por `--tags`/`--follow-tags` | Push só pelo nome (6.1.1); ruleset de tag (6.1.5) |
| VPS sair da base antes da migração; `update.sh` não recusa retrocesso | Passo 0.3 e pré-voo (6.4.1) |
| Pacote GHCR privado deixa o botão mudo | Quatro pacotes públicos + pré-voo (6.2, 6.4) |
| `-cvx.N` recusado por algum ponto do kit | Etapa 2 mede isso sem identidade em cima; ajustes da 6.2 |
| Workflow novo do original rodar no fork; job obrigatório renomeado | Revisão do passo 8.3 |
| Original reescreve `Sidebar.tsx`/`(public)/layout.tsx`/`layout.tsx` | Alterações mínimas, registradas no `CONVEXY.md`; conferência em tela a cada merge |
| Original renomeia ou cria tokens em `globals.css` | `convexy-tema-cobre-os-tokens` reprova (7.2) |
| Imagem da `-cvx.3` sobe sem a coluna `logo_dark_path` → instalação perde toda a marca do banco | `update.sh` aplica o baseline antes da imagem; se falhar, rollback para `-cvx.2` (7.8) |
| Arquivos quentes (`baseline.sql`, `dicionario.ts`, `MANIFEST.md`, `CHANGELOG.md` — 100 a 700 commits desde agosto) conflitarem a cada merge | Blocos em região estável (7.4, 7.7), `MANIFEST.md` em `merge=union`, ordem fixa do CHANGELOG (6.3), cadência semanal (8) |
| Numeração de migration colide com a do original | Faixa 9001+ (7.7) |
