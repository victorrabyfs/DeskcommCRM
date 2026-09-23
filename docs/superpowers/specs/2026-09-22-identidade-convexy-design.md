# Identidade Convexy no fork do DeskcommCRM — design

- **Data:** 2026-09-22 (revisão 2, 2026-09-23, depois de quatro revisões independentes)
- **Status:** aguardando revisão do Victor (autorrevisão da revisão 2 concluída em 2026-09-23)
- **Repositório:** `victorrabyfs/DeskcommCRM` (fork de `melgarafael/DeskcommCRM`)
- **Base:** release `v1.43.0` do original, em produção em `https://<dominio-de-producao>`

## 1. Objetivo

A plataforma inteira aparece como **Convexy** — nome, cores, fontes, logo claro e escuro — com
**uma identidade só para todas as clínicas**. A restrição que governa o desenho: **continuar
recebendo as atualizações do original sem perder a identidade**. Por isso: configuração antes de
código; código da Convexy em arquivos novos; alteração em arquivo do original só quando não há
outro caminho, pequena e registrada em `CONVEXY.md`.

## 2. Decisões

| Decisão | Escolha |
|---|---|
| Onde vive o código próprio | Fork `victorrabyfs/DeskcommCRM`; original como remoto `upstream` |
| Contribuir de volta | **Não** |
| Logo | Enviado pela tela `/admin/marca` (PNG/JPG): **um campo para o tema claro (o que já existe) e um novo para o tema escuro**. Nada de logo embutido no código |
| Marca por clínica (`/app/settings/marca`) | **Desligada** por chave de instalação; todas as clínicas veem a marca da instalação |
| Domínio por clínica | Fora (só SaaS em `<dominio-de-producao>`) |
| Entrega | Três etapas (seção 5): configuração → fork só com infraestrutura → identidade visual |

## 3. Fora de escopo

- SaaS (teste 7/14/30 dias, planos, cobrança) e Instagram direto — specs próprias.
- Ícone próprio na barra lateral recolhida e no favicon: continuam a inicial "C" sobre a cor da
  marca, que é o que o produto já desenha quando a marca não é a do DeskcommCRM
  (`app/icon.tsx`, `components/shell/Sidebar.tsx:163-171`).
- Números de destaque em Lexend Deca: exigiria classe em componentes do original.
- Fundo dos e-mails (convite, LGPD, GoTrue) e régua de contraste do produto: continuam os
  neutros do original (seção 7.5 lista o que isso afeta).
- `app/design/` (vitrine interna do design system), `public/llms.txt`, textos do kit de
  instalação e `global-error.tsx` (HTML próprio, fora do layout raiz).

## 4. Identidade de origem

Medida no CRM atual (`<frontend-atual>` na VPS): fontes **Inter** (texto) e **Lexend
Deca** (títulos); marca `#146BFF`; tinta `#0B0D10`; fundo claro `#F8FAFC`; escuro: fundo
`#0B0D10`, cartão `#131923`, popover `#171E2A`. Logos em SVG (`logo-light-v3.svg`,
`logo-dark-v3.svg`) — **exportar em PNG** (altura ≥ 96 px, fundo transparente) para enviar pela
tela, que recusa SVG por segurança.

## 5. Entregas

### Etapa 1 — Configuração, sem código (feita em 2026-09-23)

- `/admin/marca`: nome **Convexy**, cor **#146bff**, logo claro enviado.
- `.env` da VPS: `APP_NAME="Convexy"` (lido direto por login, cadastro, boas-vindas e textos
  legais — `lib/branding.ts:99-105`), `APP_ACCENT_HEX="#146bff"`, `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL="nao-responda@convexy.tech"`.
- Pendente do operador: SMTP do Resend no Supabase e os dois modelos de e-mail
  (`marca-emails.sh --render-em`).

**Pronto quando:** título da aba e texto do login dizem "Convexy"; convite de equipe chega por
e-mail pelo Resend; e-mails de acesso chegam com assunto "… — Convexy".

### Etapa 2 — `v1.43.0-cvx.1`: fork só com infraestrutura

Nenhuma mudança visual. Existe para ensaiar, com diff trivial, o que é arriscado: numeração,
imagens próprias, botão "Atualizar", rollback. Conteúdo na seção 6.

### Etapa 3 — `v1.43.0-cvx.2`: identidade visual

Paleta, fontes, logo escuro e marca das clínicas desligada. Conteúdo na seção 7.

## 6. Etapa 2 — infraestrutura do fork

### 6.1 Repositório

1. `main` do fork avança (fast-forward) para `v1.43.0`: o `main` atual não tem commit próprio e é
   ancestral da tag.
2. `git config remote.upstream.tagOpt --no-tags`. **Tag do original nunca vai para o fork**: o
   agente anuncia a maior tag `v*` local sem olhar procedência (`agent.sh:131`,
   `publish-image.yml:84-88`), então uma `v1.44.0` no fork seria oferecida no lugar da Convexy.
3. Workflows desligados no fork, sem editar arquivo: `gh workflow disable release.yml` (roda em
   todo push na `main`, falha sem os secrets do original e decide cortar tag por heurística de
   fragmentos — `release.yml:21-24,65-215`), `relogio.yml`, `vigia-de-colisao.yml`.
   `acolhida.yml` já é inerte fora do original. `ci.yml`, `e2e.yml`, `perf.yml` e
   `publish-image.yml` seguem ligados.
4. **Segurança da cadeia.** Depois da troca, quem cria tag `v*` no fork executa bash como root na
   VPS após um clique (`agent.sh` → `update.sh:160,178,186`; sem verificação de assinatura).
   Obrigatório: 2FA na conta, nenhum colaborador com escrita, regra de proteção de tag `v*` e
   proteção da `main` exigindo os checks `verify`, `invariants`, `build-and-size`, `e2e`,
   `imagens-ok`. O job `a-tag-veio-da-main` de `publish-image.yml` fica como está. Cada merge do
   original (seção 8) é revisão de segurança, não só de conflito.

### 6.2 Troca de namespace das imagens

Lista cobrada por `tests/unit/namespace-das-imagens.test.ts` (`RECADO_AO_FORK`) — sem ela
`pnpm test:unit` reprova fora do Actions:

| Arquivo | Alteração |
|---|---|
| `hostgator-setup-kit/_common.sh` | `IMG_NS="ghcr.io/victorrabyfs"`; URL padrão de `ultima_versao_publicada` para o fork |
| `docker-compose.prod.yml` | `image:` padrão de `app`, `worker`, `scheduler` e `voice-agent` |
| `.env.hostgator.example` | `*_IMAGE` |
| `tests/unit/_identidade-deste-repo.ts` | `NAMESPACE_DESTE_REPO = "ghcr.io/victorrabyfs"` (e dono) |
| `hostgator-setup-kit/install.sh`, `comecar.sh` | `REPO_URL` padrão |
| `Dockerfile`, `Dockerfile.worker`, `Dockerfile.scheduler`, `Dockerfile.voice-agent` | label `org.opencontainers.image.source` → fork (vincula o pacote GHCR ao repositório) |

**Quatro imagens**: `deskcommcrm`, `deskcomm-worker`, `deskcomm-scheduler`,
`deskcomm-voice-agent` — **todas públicas no GHCR** (pacote novo nasce privado). `docker login`
não serve: `ghcr_status` consulta com token anônimo (`_common.sh:1072-1104`).

### 6.3 Versões

- Formato `vX.Y.Z-cvx.N`, `X.Y.Z` = versão do original na base. Ensaio medido: `git tag -l 'v*'
  --sort=-v:refname` ordena `v1.44.0 > v1.43.1 > v1.43.0-cvx.10 > v1.43.0-cvx.2 >
  v1.43.0-cvx.1 > v1.43.0`. Na VPS, `git config --get versionsort.suffix` tem de estar vazio
  (com `-`, a ordem inverte).
- `publish-image.yml` publica só `1.43.0-cvx.1` (pré-release não gera `1.43`) e move `stable`
  para ela; `latest` = topo da `main` do fork. `/api/v1/health` reporta `1.43.0-cvx.1`.
- Tag criada à mão, depois do merge na `main`, sem fragmento em `.changes/`.
- **Toda tag Convexy tem uma seção `## [X.Y.Z-cvx.N] — AAAA-MM-DD` no topo do `CHANGELOG.md`**,
  escrita à mão: o botão "Atualizar" mostra as notas cortando o changelog nesse cabeçalho
  (`agent.sh:222`, `lib/system/changelog.ts`). Sem ela, a tela anuncia a versão sem notas.
- Instalação nova a partir do fork: `install.sh` descarta tag com hífen (`_common.sh:1048`) e
  instala a base; em seguida `update.sh --to vX.Y.Z-cvx.N`.

### 6.4 Migração da VPS para o fork

1. Pré-voo: as quatro imagens `:1.43.0-cvx.1` respondem 200 anônimo no GHCR.
2. `cd /opt/deskcommcrm && git remote set-url origin https://github.com/victorrabyfs/DeskcommCRM.git`
3. **Primeira atualização manual:** `bash hostgator-setup-kit/update.sh --to v1.43.0-cvx.1`. O
   botão não aparece nesta transição: o `agent.sh` da v1.43.0 procura a imagem no namespace do
   original e, sem achar, fica em silêncio (`agent.sh:181-194`). O `update.sh` funciona porque
   re-carrega o `_common.sh` da tag nova depois do checkout (`update.sh:178`). O primeiro
   `update.sh` completa o histórico raso a partir do fork.
4. A partir de `-cvx.2`, o botão volta a funcionar.

**Rollback** para o original: `bash hostgator-setup-kit/update.sh --to v1.43.0 --force` — volta ao
`_common.sh` da v1.43.0 e grava as imagens `ghcr.io/melgarafael/*:1.43.0` (públicas) no `.env`.
Exige a tag `v1.43.0` no fork (mantida). O banco não volta (o baseline é idempotente e a etapa 2
não tem migration). O botão só faz rollback automático de imagem quando a atualização veio dele e
o `update.sh` falhou (`agent.sh:284-387`).

**Pronto quando:** `/api/v1/health` responde `1.43.0-cvx.1`; `.env` da VPS aponta as quatro
imagens para `ghcr.io/victorrabyfs`; uma `-cvx.2` de teste aparece no botão "Atualizar"; o
rollback acima foi ensaiado numa branch/VM descartável ou documentado com a saída real.

## 7. Etapa 3 — identidade visual

### 7.1 Arquivos novos da Convexy

```
app/convexy/tema.css     paleta e fontes (7.2, 7.3)
CONVEXY.md               registro de toda alteração em arquivo do original, com trecho e motivo
```

### 7.2 Paleta — `app/convexy/tema.css`

Sobrepõe os tokens de `app/globals.css` com **seletor de atributo dobrado**
(`[data-theme="light"][data-theme="light"]`, `[data-theme="dark"][data-theme="dark"]`,
especificidade 0,2,0): vence os blocos do original (0,1,0) em qualquer ordem de carga — a ordem
de CSS difere entre dev e produção, como `lib/branding/css.ts:17-23` documenta — sem
`!important`. Não toca em `--color-accent-*` (vem da cor configurada) nem nas cores semânticas.

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
| `--shadow-xs … --shadow-xl` | mesmos valores do original com a tinta `rgba(11, 13, 16, α)` no lugar de `rgba(20, 18, 14, α)` | inalteradas (já são pretas) |

Popover, cartão e campo compartilham `--color-surface`: `--color-popover`/`--color-card` são
aliases fixados pelo `@theme inline` do original (`globals.css:527-531`) e separá-los exigiria
editar `globals.css`. Desvio aceito em relação ao CRM atual (popover `#171E2A`, campo `#111720`).

### 7.3 Fontes

- `app/layout.tsx`: `Inter` (pesos 400, 500, 600, 700) carregada com **`variable:
  "--font-atkinson"`** no lugar de `Atkinson_Hyperlegible`. O nome da variável fica o do
  original de propósito: `--font-sans` está dentro do `@theme inline` e é inlinado na compilação
  (`globals.css:455,535`), o `body` usa `var(--font-atkinson)` direto (`globals.css:701`), e
  `tests/unit/tailwind-tokens.test.ts:89-93` exige o literal no layout. Reaproveitar o nome
  muda a fonte do produto inteiro sem tocar em `globals.css`.
- `Lexend_Deca` (400–700) com `variable: "--font-lexend"`; `tema.css` aplica em `h1, h2, h3`
  (`@layer base`).
- `font-feature-settings: "ss01"` do `body` (`globals.css:703`) em Inter troca o desenho dos
  dígitos: `tema.css` o anula (`normal`).
- IBM Plex Mono continua.

### 7.4 Logo escuro — campo novo em `/admin/marca`

- **Banco:** coluna `platform_branding.logo_dark_path text null`, por migration Convexy (7.6),
  com o mesmo tratamento do `logo_path` (bucket `brand-logos`, leitura pública da URL).
- **Upload:** `app/api/v1/marca/logo/route.ts` aceita `variante: "escuro"` no escopo
  `instalacao` — mesma validação por bytes (PNG/JPG ≤ 512 KB), mesmo apagar-o-anterior.
- **Tela:** `app/admin/(protected)/marca/_form.tsx` ganha um segundo `CampoDeLogo`, "Logo para o
  tema escuro", com prévia sobre o fundo escuro. Textos pelo dicionário de i18n.
- **Leitura:** `lib/branding/instalacao.ts` seleciona a coluna; `MarcaResolvida` ganha
  `logoDarkUrl: string | null`.
- **Desenho** (`components/shell/Sidebar.tsx` e `app/(public)/layout.tsx`): com `logoDarkUrl`, o
  `<img>` do logo claro, dentro da moldura `dark:bg-white` que já existe, ganha `dark:hidden`, e
  um segundo `<img src={logoDarkUrl}>` sem moldura ganha `hidden dark:block`. Sem
  `logoDarkUrl`, nada muda. A troca é por CSS — o tema está sempre gravado em `<html
  data-theme>` pelo script do `<head>` (`app/layout.tsx:122`), inclusive no modo "sistema" —,
  sem divergência de hidratação. O primeiro `<img>` continua sendo o logo claro, o que mantém
  `tests/unit/logo-nao-some-no-tema-escuro.test.ts`, `marca-do-produto.test.tsx`,
  `marca-sem-divergencia-de-hidratacao.test.tsx` e `marca-na-fachada-de-acesso.test.tsx`
  válidos; teste novo cobre o segundo `<img>`.
- E-mails usam o logo claro (fundo claro): nada muda neles.

### 7.5 Barra do navegador e régua

`lib/branding/regua-do-produto.ts` é gerado de `globals.css` e **não muda** (o teste
`branding-regua-do-produto.test.ts` o prende ao original). Consequências aceitas e o que se faz:

- `<meta name="theme-color">` (barra do navegador no celular): `app/layout.tsx` passa a emitir
  `#F8FAFC`/`#0B0D10` a partir de constante em `app/convexy/`.
- Derivação da escala do acento mede contraste contra o fundo antigo: para `#146BFF`, o fundo
  escuro novo é mais escuro (contraste só sobe) e o claro é praticamente igual. Aceito.
- Prévias em `/admin/marca` e fundo dos e-mails continuam nos neutros do original. Aceito.

### 7.6 Marca das clínicas desligada

- **Chave:** `ORG_BRANDING_ENABLED` em `lib/env.ts`, `z.string().optional().default("true")`;
  **só o valor exato `false` desliga** (nunca `z.enum`: um valor inválido derrubaria a primeira
  requisição com o contêiner `healthy` — `lib/env.ts:237-247`). Entra em `.env.example` e
  `.env.hostgator.example`. Desvio deliberado da regra "banco acima do `.env`": é decisão de
  instalação do fork, sem tela; registrado no `CONVEXY.md`.
- **Leitura:** com `false`, `marcaDaOrganizacaoDeSettings()` (`lib/branding/organizacao.ts:73`)
  devolve `null`. É o único parser de `settings.branding`; todos os consumidores — layout,
  barra lateral, logo, e-mails (`marcaDaSaida(orgId)`) — caem na marca da instalação. Conferir
  com `git grep -n "marcaDaOrganizacaoDeSettings(\|resolverMarcaDaOrganizacao(\|marcaDaSaida(" -- app lib`.
  Marcas já gravadas ficam no banco, ignoradas.
- **Escrita:** `app/actions/settings/updateMarcaDaOrganizacao.ts` devolve
  `{ ok: false, error: "marca_por_organizacao_desligada" }` antes de tocar o banco;
  `app/api/v1/marca/logo/route.ts` responde 404 para `escopo === "organizacao"`. As RPCs não
  mudam (o banco não conhece o `.env`).
- **Tela e menu:** `/app/settings/marca` responde `notFound()`. O item continua em `NAV_CATALOG`
  (`tests/unit/navegacao-completude.test.ts:33` reprova tela sem porta); quem o esconde é o
  filtro de `destinosDaInterface()` (`lib/navigation/interface.ts`), alimentado por um booleano
  que `app/app/layout.tsx` calcula no servidor (o cliente não lê `env`).
- `/admin/marca` não é afetada.

### 7.7 Migration Convexy

- Faixa própria de numeração: `9001` em diante
  (`AAAAMMDDHHMMSS_9001_logo_escuro_da_instalacao.sql`), para nunca colidir com a sequência do
  original. Conferido na v1.43.0: nenhum guarda exige sequência contígua — o passo do `ci.yml`
  coberto por `tests/unit/main-sem-migration-duplicada.test.ts` só reprova NNNN ou timestamp
  **repetido**, e `scripts/checar-colisao-de-migration.sh` (só `vigia-de-colisao.yml`, desligado
  no fork, e `pnpm checar:colisao-de-migration`) usa o maior NNNN apenas para sugerir o
  "próximo livre" — no fork a sugestão passa a ser `9002`, o que é o desejado para migrations
  Convexy.
- Tripla do projeto: arquivo em `supabase/migrations/`, bloco rotulado no apêndice de
  `supabase/baseline.sql` (é o que o `update.sh` reaplica na VPS — `update.sh:258-281`) e linha no
  `MANIFEST.md`; `pnpm test:db` verde.
- Em conflito do `baseline.sql` num merge do original: prevalece o lado do original, e o bloco
  Convexy é reaplicado ao fim do apêndice.

### 7.8 Alterações em arquivos do original (etapa 3)

| Arquivo | Alteração |
|---|---|
| `app/layout.tsx` | Fontes (7.3), import de `tema.css`, `theme-color` (7.5) |
| `app/admin/(protected)/marca/_form.tsx` | Campo de logo escuro |
| `app/api/v1/marca/logo/route.ts` | `variante: "escuro"`; 404 para organização com a chave desligada |
| `lib/branding/instalacao.ts`, `lib/branding/resolve.ts` (tipo) | `logo_dark_path` / `logoDarkUrl` |
| `components/shell/Sidebar.tsx`, `app/(public)/layout.tsx` | Segundo `<img>` (7.4) |
| `lib/branding/organizacao.ts` | Chave na leitura (7.6) |
| `app/actions/settings/updateMarcaDaOrganizacao.ts` | Chave na escrita |
| `app/app/settings/marca/page.tsx`, `app/app/layout.tsx`, `lib/navigation/interface.ts` | Página e menu (7.6) |
| `lib/env.ts`, `.env.example`, `.env.hostgator.example` | `ORG_BRANDING_ENABLED` |
| `lib/i18n/…` | Textos do campo novo |
| `supabase/baseline.sql`, `supabase/migrations/MANIFEST.md` | Migration 7.7 |
| `CHANGELOG.md` | Seção da versão (6.3) |

**Pronto quando:**
- `getComputedStyle(document.body).fontFamily` começa com `Inter` e o de `h1` com `Lexend Deca`
  em `/login` e `/app` (Playwright);
- os tokens da tabela 7.2 medidos em `/app` nos dois temas batem com a tabela; teste novo lê
  `app/convexy/tema.css` e exige contraste ≥ 4,5 para `text` e `text-muted` e ≥ 3 para
  `text-subtle` sobre `bg` e `surface` (com `razaoDeContraste` de `lib/branding/contraste.ts`);
- com os dois logos enviados, o claro aparece só no tema claro e o escuro só no escuro, na barra
  lateral e no login;
- com `ORG_BRANDING_ENABLED=false`: menu sem "Marca", `/app/settings/marca` 404, action e upload
  de organização recusados, marca gravada de uma organização de teste não aparece;
- `curl https://<dominio-de-producao>/login` traz `theme-color` `#F8FAFC` e `#0B0D10`;
- `git diff --name-only v1.43.0 main` só lista arquivos das tabelas 6.2 e 7.8 e os novos.

## 8. Trazer uma atualização do original

1. `git fetch upstream tag vA.B.C --no-tags`; branch a partir da `main` do fork; `git merge vA.B.C`.
2. Conflitos esperados: arquivos das tabelas 6.2 e 7.8, e sempre `CHANGELOG.md` (as duas seções
   entram no topo). Resolver com o `CONVEXY.md` aberto; `baseline.sql` conforme 7.7.
3. Revisar o diff do original como código que rodará como root na VPS.
4. CI verde (obrigatório pela proteção da `main`) + conferência em tela, claro e escuro.
5. Merge na `main`, seção `## [A.B.C-cvx.1]` no `CHANGELOG.md`, tag `vA.B.C-cvx.1`; o CI publica;
   o botão "Atualizar" aparece.

Automatizar os passos 1–2 fica para depois de o fluxo manual rodar uma vez.

## 9. Testes do original afetados

Ajustados (não desligados), cada um registrado no `CONVEXY.md` com o motivo:

- `tests/unit/namespace-das-imagens.test.ts` e `_identidade-deste-repo.ts` (6.2);
- `tests/e2e/aviso-de-caso-no-whatsapp.spec.ts:280`, `conversa-do-caso.spec.ts:340`,
  `passagem-com-contexto.spec.ts:261` — esperam `fontFamily` `/Atkinson/` (7.3);
- `tests/e2e/marca-logo.spec.ts` caso (3) e `tests/unit/sidebar-nome-da-organizacao.test.tsx`
  — medem marca por organização, que a chave desliga: rodam com a chave ligada ou saem para
  `FORA_DO_CI` com motivo (`tests/unit/e2e-cobertura-completa.test.ts` cobra o motivo);
- `tests/e2e/icone-da-marca.spec.ts:51` — confere com nome e `.env` iguais a "Convexy".

Suítes que o fork roda antes de cada tag: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`,
`pnpm test:shell`, `pnpm test:db` (etapa 3) e `pnpm test:e2e`.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Push de tag no fork vira execução como root na VPS | 6.1.4 |
| Botão "Atualizar" oferecer versão do original | Tags do original nunca no fork (6.1.2); `release.yml` desligado (6.1.3) |
| Pacote GHCR privado deixa o botão mudo | Quatro pacotes públicos + pré-voo (6.2, 6.4) |
| `-cvx.N` recusado por algum ponto do kit | Etapa 2 existe para medir isso sem identidade em cima |
| Original reescreve `Sidebar.tsx`/`(public)/layout.tsx`/`layout.tsx` | Alterações mínimas, registradas no `CONVEXY.md`; conferência em tela a cada merge |
| Original renomeia tokens de `globals.css` | `tema.css` deixa de sobrepor; o teste de tokens da 7.8 reprova |
| Numeração de migration colide com a do original | Faixa 9001+ (7.7) |
