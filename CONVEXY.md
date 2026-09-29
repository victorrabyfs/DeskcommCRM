# CONVEXY.md — o que este fork muda no DeskcommCRM

Fork `victorrabyfs/DeskcommCRM` do `melgarafael/DeskcommCRM`. Desenho completo:
`docs/superpowers/specs/2026-09-22-identidade-convexy-design.md`.

Regra: configuração antes de código; código da Convexy em arquivos novos; alteração
em arquivo do original só quando não há outro caminho, pequena e **registrada aqui**,
com o trecho exato e como reaplicar num conflito de merge. Destino de toda mudança
(DoD 18): **instalação do fork**.

## Base e versões

- Base atual: `v1.59.0` do original (`refs/upstream-tags/v1.59.0` no clone), trazida em 2026-09-28
  (1.52.0 → 1.59.0: 572 commits, 17 migrations; conflitos na rota de logo e em `/admin/marca`, que
  ganharam o ícone da aba — ver "Símbolo e ícone da aba" —, no `CHANGELOG.md` e no mapa de
  jornadas). Bases anteriores: `v1.52.0`, `v1.48.0`, `v1.47.0`, `v1.44.0`.
- Versões: `vX.Y.Z-cvx.N` sobre a base atual (hoje `v1.59.0-cvx.N`), tag anotada, criada só depois do merge, empurrada pelo nome.
  Nunca `--tags`/`--follow-tags`. Tag publicada nunca é refeita (corrigir = `N+1`).
- **Toda tag `-cvx` ganha uma Release no GitHub, logo depois de o `publish-image` ficar verde**
  (desde a `v1.48.0-cvx.1`): `gh release create vX.Y.Z-cvx.N -R victorrabyfs/DeskcommCRM
  --verify-tag --latest --title vX.Y.Z-cvx.N --notes "<texto da seção do CHANGELOG>"`. Desde a
  `1.48.0` o `update.sh` e o botão "Atualizar" (`agent.sh`) escolhem a versão por
  `ultima_release_estavel` (`_common.sh`), que pergunta a `/releases/latest` do `origin` — sem
  Release, o botão diz que não sabe se há versão nova e o `update.sh` sem `--to` recusa.
  Criar a Release não reconstrói imagem: o `publish-image.yml` não escuta o evento `release`.
  O `install.sh` continua usando `ultima_versao_publicada` (tags, com o filtro `-cvx`).
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
| Logo escuro em `/admin/marca` (spec 7.3; migration 9001) | `v1.47.0-cvx.2` |
| Logo maior na barra lateral (40px de altura em vez de 28px) | `v1.47.0-cvx.3` |
| Atualização para a base 1.48.0; logo escuro passa a ser o do original (0406) | `v1.48.0-cvx.1` |
| Menu novo da Convexy: portas, sub-sidebar, Início, tipo de negócio por organização (módulo `menu_convexy`; migration 9001) | `v1.48.0-cvx.2` |
| Atualização para a base 1.52.0 (fontes locais); refino do menu (dica do trilho, seções da sub-sidebar) e símbolo da marca no menu recolhido (migration 9002) | `v1.52.0-cvx.1` |
| Atualização para a base 1.59.0 (ícone da aba do original); ícone da aba para o modo escuro (migration 9003) e cartão "Ícones da marca" em `/admin/marca` | `v1.59.0-cvx.1` |
| Prospecção: etiqueta com o nome da campanha nos contatos criados, "Prospecção" no filtro de origem de Contatos e planilha (CSV) dos resultados | `v1.59.0-cvx.2` |
| Telas escondidas do menu: módulos que a Convexy não usa saem para todos; voz e prospecção saem na clínica | `v1.59.0-cvx.3` |
| Menu da clínica: portas Início (painel), Conversas, CRM, Agenda, Pacientes, Agentes, Fluxos, Minha clínica; telas de análise saem do menu | `v1.59.0-cvx.4` |
| Perfis de áreas, fase 1: pacotes de áreas por empresa no /admin, limite no menu, na busca e no Início, aviso na área fora do pacote (migration 9005) | `v1.59.0-cvx.5` |

Versão revertida não é reaproveitada: a correção sai na `-cvx.N` seguinte e o conteúdo que
vinha depois (marca das clínicas desligada, spec 7.4) desloca uma casa.
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
| `app/layout.tsx` | `import "./convexy/tema.css";` (com o comentário `// Convexy: …`) **logo depois** de `import "./globals.css";` | manter depois do `globals.css` |
| `app/layout.tsx` | `const inter = localFont({ src: [{ path: "./fonts/inter-400-700-latin.woff2", weight: "400 700" … }], …, variable: "--font-atkinson" })` e `const lexend = localFont({ …lexend-deca-400-700-latin.woff2…, variable: "--font-lexend" })` no lugar de `const atkinson = localFont(…)`, com o comentário `Convexy:` (desde a `v1.52.0-cvx.1`; antes era `next/font/google`) | manter o nome `--font-atkinson` (o `globals.css` o lê); fonte nova da Convexy entra em `app/fonts/` pela receita do README de lá |
| `app/fonts/` | `inter-400-700-latin.woff2` e `lexend-deca-400-700-latin.woff2`; duas linhas `(Convexy)` na tabela do `README.md` e duas linhas `Copyright` (Lexend, Inter) no `OFL.txt` | manter os arquivos; reacrescentar as linhas se o original reescrever o README ou o OFL |
| `app/layout.tsx` | ``className={`${inter.variable} ${lexend.variable} ${plexMono.variable}`}`` no `<html>` | idem |
| `app/layout.tsx` | `import { coresDaBarraConvexy } from "@/lib/convexy/barra-do-navegador";` (sai o import de `coresDaBarraDoNavegador`) e `themeColor: coresDaBarraConvexy(),` no `viewport`, com o comentário `Convexy:` acima | manter o nosso `viewport` |
| `tests/e2e/aviso-de-caso-no-whatsapp.spec.ts:280`, `tests/e2e/conversa-do-caso.spec.ts:340`, `tests/e2e/passagem-com-contexto.spec.ts:261` | `toMatch(/Inter/i)` no lugar de `toMatch(/Atkinson/i)` | trocar de novo se o original mexer na linha |
| `.github/workflows/e2e.yml` | linha `convexy-identidade.spec.ts` em `SPECS_PARTE_1`, logo depois de `icone-da-marca.spec.ts` | reaplicar a linha dentro do bloco `>-`, **sem comentário** no bloco |
| `CHANGELOG.md` | `## [1.44.0-cvx.3]` | ordem de "Base e versões" |

Conferência depois de um merge do original:
`pnpm vitest run tests/unit/convexy-tema-cobre-os-tokens.test.ts tests/unit/convexy-tema-contraste.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/branding-barra-do-navegador.test.ts tests/unit/e2e-cobertura-completa.test.ts`.
`convexy-tema-cobre-os-tokens` reprova quando o original renomeia ou cria token nos blocos
`[data-theme]` do `globals.css`: decidir o valor Convexy e acrescentá-lo ao `tema.css`.

### Logo escuro (etapa 3, `v1.47.0-cvx.2`) — absorvido pelo original na `v1.48.0-cvx.1`

A `1.48.0` do original trouxe o mesmo recurso (migration `0406_logo_por_tema`): a mesma coluna
`platform_branding.logo_dark_path`, com a mesma regex e o mesmo nome de CHECK
(`platform_branding_logo_dark_path`), e ainda o logo escuro por organização. No merge da
`1.48.0` o fork **ficou com a versão do original** e aposentou a sua: a migration
`9001_logo_escuro_da_instalacao` (arquivo, linha no MANIFEST e bloco no baseline), os seis
testes `convexy-logo-escuro*` e a linha deles no `e2e.yml` saíram, e os arquivos de marca
(`lib/branding*`, rota do logo, `CampoDeLogo.tsx`, `/admin/marca`, `Sidebar.tsx`,
`(public)/layout.tsx`, `app/layout.tsx`, `database.types.ts`, `dicionario.ts`) voltaram a ser
os do original — com a reaplicação da cvx.3 em `app/layout.tsx` e do "Logo maior" em
`Sidebar.tsx`.

Os dados passam sem nada a fazer: o caminho gravado pela `-cvx.2` (`platform/<uuid>.png`) cabe
na regra da 0406, e a 0406 é idempotente sobre a coluna e o CHECK que a 9001 já tinha criado.
Nas instalações do fork a linha `9001` some do MANIFEST, mas a coluna continua (quem a cria
agora é o bloco da 0406 no baseline).

### Logo maior (`v1.47.0-cvx.3`)

O logo da barra lateral passa de `h-7` (28px) para `h-10` (40px) de altura, nos dois `<img>` (o
claro e o escuro; desde a `1.48.0` o `Sidebar.tsx` é o do original, com o logo escuro dele). O cabeçalho da barra continua `h-14` (56px): com a moldura
do tema escuro (`dark:py-1`) o conjunto fica em 48px e cabe. A largura segue limitada por
`max-w-[10rem]`. A tela de entrada não muda (já era `h-10`).

| Arquivo | O que muda | Ao mesclar o original |
|---|---|---|
| `components/shell/Sidebar.tsx` | `h-7` → `h-10` nos dois `<img>` do logo, com o comentário `Convexy` — desde a `-cvx.2`, dentro de `MarcaDaBarra` | reaplicar a troca de classe dentro de `MarcaDaBarra` ("Menu novo") |
| `CHANGELOG.md` | `## [1.47.0-cvx.3]` | ordem de "Base e versões" |

Conferência depois de um merge do original: o CI do PR do merge em `pass`, com os testes de
logo do próprio original (`logo-por-tema*`, `logo-nao-some-no-tema-escuro.test.ts`,
`tests/invariants/logo-por-tema.test.ts`, `tests/e2e/logo-moldura-no-tema-escuro.spec.ts`).

### Teste de colisão de migration (`v1.48.0-cvx.1`)

`tests/shell/colisao-de-migration.test.sh` ganha `unset GITHUB_REF` logo depois de
`set -uo pipefail`, com o comentário `Convexy`. O gate tira da conta o PR em que o CI roda,
lido do `GITHUB_REF` (`refs/pull/N/merge`); os casos do teste montam PRs fictícios `#7`, `#8`
e `#9`, e no fork os PRs reais têm esses números (o PR da `1.48.0` foi o `#7` e reprovou nove
casos). No original os PRs estão na casa dos milhares e isso não aparece.

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `tests/shell/colisao-de-migration.test.sh` | bloco `# Convexy` + `unset GITHUB_REF` depois de `set -uo pipefail` | reaplicar o bloco no mesmo lugar |

### Menu novo (`v1.48.0-cvx.2`)

Spec `docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md`; plano
`docs/superpowers/plans/2026-09-25-convexy-menu-novo.md`. O menu da Convexy é um **módulo
opcional da instalação** (`menu_convexy`, linha `MODULO_MENU_CONVEXY` em `platform_config`,
sem migration): desligado, o app é exatamente o do original. **Ligar e desligar é em
`/admin/sistema` › Módulos opcionais › "Menu da Convexy"** — voltar ao menu clássico é
desligar ali, na hora, sem publicar versão e sem perder escolha de interface. Instalação nova
do fork nasce com ele desligado: ligar em `/admin/sistema` e escolher o "Tipo de negócio" de
cada empresa em `/admin/tenants/<id>`.

O menu é uma projeção do `NAV_CATALOG` do original (`lib/convexy/menu/mapa.ts`): tela nova do
original entra sozinha na porta do `group` dela, e o CI só reprova um `group` novo. O nicho
mora em `organizations.nicho` (migration `9001_nicho_da_organizacao`, faixa do fork), escrito
só pelo admin da plataforma (`PATCH /api/v1/admin/tenants/[id]/nicho`, auditado como
`tenant.nicho_changed`).

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `lib/instalacao/modulos.ts` | `"menu_convexy"` no fim de `MODULOS_OPCIONAIS`; `menu_convexy: "MODULO_MENU_CONVEXY"` em `CHAVE_DO_MODULO` (comentários `Convexy`) | reacrescentar os dois; módulo novo do original entra antes do nosso |
| `app/admin/(protected)/sistema/_form.tsx` | objeto `modulo: "menu_convexy"` no fim de `MODULOS_NA_TELA` | reacrescentar no fim da lista |
| `lib/navigation/catalogo.ts` | entrada `href: "/app"` (Início, `modulo: "menu_convexy"`, **sem** `sidebar`) no fim do `NAV_CATALOG` | manter como última entrada do array, sem `sidebar` |
| `lib/i18n/dicionario.ts` | três linhas: a descrição do Início depois de `Buscar: { es: "Buscar" },`; `"Menu da Convexy"` e a descrição do módulo depois da linha `"Ligado, cada empresa pode conectar o banco…"` | reacrescentar as três nos mesmos vizinhos; se o original criar a mesma chave, apagar a nossa |
| `lib/navigation/interface.ts` | `"/app"` no fim de `SIMPLIFICADA`; `&& d.href !== "/app"` em `interfaceTemDestino` e no segundo `find` de `homeDaInterface` | reaplicar as três condições |
| `tests/unit/interface-por-empresa.test.ts` | `:47` chama `sidebarGroups(false, role, settings as InterfaceSettings \| undefined, [])`, com comentário `Convexy` | manter o `[]` (a casca do original chama assim; sem ele o Início contaria no menu clássico) |
| `lib/audit/actions.ts` | `"tenant.nicho_changed"` no fim de `AUDIT_ACTIONS` | manter no fim, depois dos códigos novos do original |
| `app/admin/(protected)/tenants/[id]/page.tsx` | quatro imports; `moduloLigado(createAdminClient(), MODULO_DO_MENU)` e o fragmento com `<CampoDoNicho>` depois do `<TenantOverviewClient>` | inserir de novo; o resto da página é o do original |
| `supabase/baseline.sql` | bloco `-- ---- nicho da organização (migration 9001) ----`, logo depois do bloco da 0208 | prevalece o original no resto; reaplicar o bloco no mesmo lugar |
| `supabase/migrations/MANIFEST.md` | linha `9001_nicho_da_organizacao` no fim (cita a rota do nicho) | `merge=union`; conferir que ficou uma vez |
| `lib/database.types.ts` | `nicho` em `organizations` (`Row`/`Insert`/`Update`) | reacrescentar se o original regenerar o arquivo |
| `hooks/i18n/useT.ts` | `export { useT } from "@/lib/convexy/vocabulario";` | manter a nossa reexportação |
| `app/app/layout.tsx` | imports Convexy; `let nicho`; `nichoRes` no `Promise.all` (consulta própria do nicho); `nicho = lerNicho(…)` depois do primeiro `needsMfaGate = mfaRequired;`; `<ConvexyProvider>` entre `<IdiomaProvider>` e `<AuthProvider>` | reaplicar os cinco pontos |
| `lib/ui/icons.ts` | `CheckSquare` e `GearSix` depois de `House` | reacrescentar |
| `components/shell/Sidebar.tsx` | `export function MarcaDaBarra` (o cabeçalho `h-14` da marca, recortado do `SidebarContent` sem mudar uma classe) e `<MarcaDaBarra collapsed={collapsed} />` no lugar dele | ver "Reaplicar a `MarcaDaBarra`" abaixo |
| `app/app/_components/AppShell.tsx` | dois imports; `useConvexy()`; o ternário `MenuConvexy` / `Sidebar` | reaplicar o ternário |
| `components/shell/MobileSidebar.tsx` | dois imports; `useConvexy()`; o ternário `GavetaConvexy` / `SidebarContent` | reaplicar o ternário |
| `components/team/InterfaceEditor.tsx` | três imports; `useConvexy()` antes de `options`; o filtro de `options` ganha `&& (convexy?.menuLigado \|\| d.modulo !== MODULO_DO_MENU \|\| value.destinos?.includes(…))` (com o módulo desligado o Início não é gravado, a menos que já estivesse escolhido); `<InterfacePorPortas>` como irmão do bloco do original; a abertura `{!convexy?.menuLigado && NAV_GROUPS.map(` e `&& d.modulo !== MODULO_DO_MENU` na linha `items` | o bloco do original (handler inclusive) fica como vier; reaplicar só o filtro de `options`, as duas linhas e o irmão |
| `components/shell/NavHub.tsx` | dois imports; `destinoDoHub` + `redirect` antes de `hubSections` | reaplicar as duas linhas |
| `app/app/page.tsx` | `destinosDoInicio` e `<Inicio>` antes do `redirect` | reaplicar |
| `.github/workflows/e2e.yml` | `convexy-menu.spec.ts` na `SPECS_PARTE_N` escolhida pela sonda (a) | reaplicar a linha, sem comentário no bloco; se o original redistribuir as partes, repetir a sonda |
| `docs/testing/user-journey-map.md` | seção `## JCVX1` no fim | manter no fim do arquivo (exceção ao DoD 16, ver "Desvios aceitos") |
| `CHANGELOG.md` | `## [1.48.0-cvx.2]` | ordem de "Base e versões" |

Código só da Convexy, sem reaplicação: `lib/convexy/` (`modulo.ts` com `MODULO_DO_MENU`, `nicho.ts`,
`textos.ts`, `contexto.tsx`, `vocabulario.ts`, `orientacoes.ts`, `menu/`), `components/convexy/`,
`app/app/_convexy/inicio/`, `GET`/`PATCH /api/v1/admin/tenants/[id]/nicho` (leitura própria do
nicho: o painel do tenant e a rota `GET` do tenant do original não mudam) e
`GET /api/v1/convexy/orientacoes`.

**Reaplicar a `MarcaDaBarra`** quando o original mexer no cabeçalho da barra: (1) aceitar o
`Sidebar.tsx` do original; (2) recortar de novo o bloco `const brand = useMarcaDaInstalacao();` …
`const marcaDoProduto = …` e o `<div className={cn("flex h-14 …")}>` para dentro de
`MarcaDaBarra`, sem mudar uma classe (passo a passo na Task 6 do plano); (3) reaplicar o "Logo
maior" (`h-7` → `h-10` nos dois `<img>`), que agora mora dentro de `MarcaDaBarra`; (4) conferir
com `git diff -U0 components/shell/Sidebar.tsx | grep -E '^[-+]' | grep -vE '^(\+\+\+|---)' | sed 's/^[-+]//' | sort | uniq -u`
— só as linhas da função nova e da chamada aparecem.

**Reaplicar a Fila do Início** quando `tests/unit/convexy-inicio-fila-do-inbox.test.ts` reprovar
depois de um merge do original: ler o diff de `app/api/v1/conversations/counts/route.ts`, levar a
régua nova para `conversasEsperando` (`app/app/_convexy/inicio/blocos.ts`) e ajustar as
asserções do teste de fonte no MESMO commit. Nunca só afrouxar o teste: é ele que garante que o
número do Início é o badge da Fila.

Conferência depois de um merge do original: o CI do PR do merge em `pass`, lendo em especial
`tests/unit/convexy-menu-mapa.test.ts` — um `group` novo reprova com a mensagem que diz o que
decidir, e a linha `[convexy-menu] posições por padrão` do log mostra as telas novas que entraram
sozinhas (dar a elas posição explícita em `PORTAS`, se o lugar padrão não servir) —,
`convexy-menu-dono.test.ts` (página nova sem dono), `convexy-menu-modulo.test.tsx` e
`convexy-inicio-fila-do-inbox.test.ts`.

### Símbolo e ícone da aba (`v1.52.0-cvx.1`, reorganizado na `v1.59.0-cvx.1`)

O menu recolhido mostrava a inicial do nome em texto porque a marca do original só guarda o
logo claro e o escuro. A instalação ganha o **símbolo** — a arte quadrada da marca, sem o nome —
e, desde a `v1.59.0-cvx.1`, o **ícone da aba para o modo escuro**. Os dois moram na rota de logo
do original, no modelo de peças que ela ganhou na 1.59 (`peca` + `tema`, `lerAlvo`):

- `peca=simbolo` → `platform_branding.simbolo_path` (migration `9002_simbolo_da_instalacao`); sem
  versão por tema. Até a `v1.52.0-cvx.1` era `tema=simbolo`.
- `peca=icone&tema=escuro` → `platform_branding.favicon_dark_path` (migration
  `9003_icone_da_aba_escuro`). O claro é o `favicon_path` do original (0443).

Só a instalação tem as duas: a organização recebe 422 em `lerAlvo`, antes de qualquer efeito. Em
`/admin/marca`, o cartão da Convexy "Ícones da marca" (`CartaoDosIcones`), logo depois do cartão do
logo, junta o campo do ícone da aba do original (`CampoDoIconeDaAba`, trazido do cartão do logo), o
ícone escuro e o símbolo. Os campos da Convexy não passam pelo `ajustarLogo`, pelo motivo que o
original documenta no `CampoDoIconeDaAba`. No `<head>`, `iconesDaAba` (`lib/convexy/icones-da-aba.ts`)
devolve o do original quando não há ícone escuro e, com ele, os dois `<link rel="icon">` com
`media="(prefers-color-scheme: …)"`. A barra recolhida mostra o símbolo no lugar da inicial;
organização com logo próprio segue com a inicial dela.

No menu (`v1.52.0-cvx.1`): a dica com o nome da porta recomeça fechada a cada troca entre trilho
largo e só ícones; os itens da sub-sidebar não têm dica (e o `descricao` do item saiu de
`montarMenu`); a dica tem cor neutra e anima entrada e saída em `menu.css`; os títulos de seção
da sub-sidebar ganharam espaço acima.

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `app/api/v1/marca/logo/route.ts` | `"simbolo"` em `pecaSchema`; `campoDoLogo` como `function` com os ramos `simbolo_path` e `favicon_dark_path`; em `lerAlvo`, as duas recusas do símbolo (fora da instalação; com `tema=escuro`); no ramo da organização de `caminhoGravado`, `if (campo !== "logo_path" && campo !== "logo_dark_path") return null;` no lugar do `campo === "favicon_path"` (comentários `Convexy`) | reaplicar os quatro pontos; peça nova do original entra no enum antes da nossa |
| `lib/branding/instalacao.ts` | `favicon_dark_path, simbolo_path` em `COLUNAS`; os dois no tipo `LinhaDaMarca` | reacrescentar |
| `lib/branding.ts` | `simboloUrl?: string \| null` em `Branding` | reacrescentar |
| `app/layout.tsx` | import de `logoDaCamada`; `const { linha, marca }` e `simboloUrl: logoDaCamada(linha?.simbolo_path, null)` em `MarcaDosClientComponents`; `icons: iconesDaAba(linha)` no lugar de `icons: { icon: iconeDaAba(linha?.favicon_path) }` (sai o import de `iconeDaAba`) | reaplicar |
| `tests/unit/branding-icone-da-aba.test.ts` | a asserção do layout passa a `/icons:\s*iconesDaAba\(/`, com comentário `Convexy` | reaplicar se o original mexer no caso |
| `components/shell/Sidebar.tsx` | `const simbolo = …` depois de `marcaDoProduto`, e o ternário `simbolo ? <img …> : <span>` no bloco `collapsed && !marcaDoProduto`, dentro de `MarcaDaBarra` | reaplicar junto com "Reaplicar a `MarcaDaBarra`" |
| `app/admin/(protected)/marca/page.tsx` | `iconeEscuro` e `simbolo` (via `logoDaCamada`) depois de `iconeDaAba` | reaplicar |
| `app/admin/(protected)/marca/_form.tsx` | import de `CartaoDosIcones` no lugar do de `CampoDoIconeDaAba`; `iconeEscuro` e `simbolo` nos `Props` e na desestruturação; o `<CampoDoIconeDaAba>` sai do cartão do logo e entra `<CartaoDosIcones>` depois dele | reaplicar; se o original mexer no `CampoDoIconeDaAba`, a mudança chega pelo componente dele |
| `supabase/baseline.sql` | bloco `-- ---- símbolo da instalação (migration 9002) ----`, entre a coluna e as funções da 0406; bloco `-- ---- ícone da aba escuro (migration 9003) ----`, logo depois do da coluna da 0443 | reaplicar nos mesmos lugares |
| `supabase/migrations/MANIFEST.md` | linhas `9002_simbolo_da_instalacao` e `9003_icone_da_aba_escuro` depois da 9001 | `merge=union`; conferir que ficaram uma vez |
| `CHANGELOG.md` | `## [1.52.0-cvx.1]`, `## [1.59.0-cvx.1]` | ordem de "Base e versões" |
| `tests/unit/evidencia-no-caminho-versionado.test.ts` | três planos do fork (`2026-09-23-convexy-cvx3-…`, `2026-09-24-convexy-logo-escuro`, `2026-09-25-convexy-menu-novo`) na `QUARENTENA`, com comentário `Convexy` — registro histórico, como os do original | reacrescentar no fim do bloco de planos; as specs e2e da Convexy gravam em `evidence/` |

Código só da Convexy: `components/convexy/marca/` (`CartaoDosIcones.tsx`, `CampoDeIconeDaMarca.tsx`),
`lib/convexy/icones-da-aba.ts`, os textos `icones`, `iconeEscuro` e `simbolo` em
`lib/convexy/textos.ts`. Testes: `tests/unit/convexy-{icones-rota,cartao-dos-icones,icones-da-aba,simbolo-na-barra}.test.*`,
`tests/invariants/convexy-marca-da-instalacao.test.ts` e o bloco "a dica com o nome da porta" em
`tests/unit/convexy-menu-desktop.test.tsx`.

### Conversa selecionada no modo escuro (`v1.59.0-cvx.1`)

O item selecionado da lista de conversas usava `bg-accent-50`, e o bloco escuro do `globals.css`
mantém a escala do acento igual à do claro: no escuro o item ficava quase branco sob o texto
claro. Passa a usar `bg-accent-soft`, o token de fundo tingido que o tema escuro redefine (e que
o CSS da marca gera por tema). Defeito também do original — candidato a PR lá.

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `components/inbox/ConversationListItem.tsx` | `isSelected && "bg-accent-soft hover:bg-accent-soft"`, com comentário `Convexy` | reaplicar se o original não corrigir; se corrigir, aceitar o dele |

Teste: `tests/unit/convexy-conversa-selecionada-no-escuro.test.ts` (o token do fundo tem de ser
redefinido no tema escuro com outro valor).

### Excluir contato (`v1.59.0-cvx.1`)

Defeito do original (1.59 e `main` em 2026-09-28): apagar um contato que já passou por retorno
automático falhava com 42501. A guarda `fn_followup_generation_write` (gatilho `BEFORE` em
`job_queue` e `followup_enrollment_events`) recusa escrita de quem está logado sobre os registros
internos do follow-up, e o DELETE em cascata do contato caía nela. Pior: a rota apagava mensagens e
conversas em comandos separados ANTES da ficha, então a recusa deixava o histórico já apagado.

Migration `9004_excluir_contato`: `fn_excluir_contato(org, contato)` (`security invoker`, vale a
RLS de quem chama) apaga mensagens, conversas e a ficha numa transação só; e a guarda ganha, na
primeira linha, `if tg_op='DELETE' and pg_trigger_depth() > 1 then return old; end if;` — a
cascata da chave estrangeira roda dentro do gatilho dela (profundidade 2); o DELETE direto de quem
está logado (profundidade 1) segue recusado. O bloco fica logo antes da varredura de anon (0116), que
tem de ser o último bloco a criar função; a última definição da função é a que vale, e o invariante
reprova se um bloco novo do original a redefinir depois.

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `app/api/v1/contacts/_handler.ts` | em `deleteContactHandler`, o bloco dos três DELETE (`messages`, `conversations`, `contacts`) vira `supabase.rpc("fn_excluir_contato", …)` com a auditoria `falha_ao_apagar` de `apagados: []`; `return { id: deleted as string }` | reaplicar; se o original tornar a exclusão atômica, aceitar a dele e aposentar a função |
| `tests/unit/contato-delete.test.ts` | o cliente falso responde `rpc("fn_excluir_contato")` no lugar dos DELETE; o caso "ficha recusada" passa a cobrar `apagados: []` | reaplicar junto com a rota |
| `supabase/baseline.sql` | bloco `-- ---- excluir contato (migration 9004) ----` logo antes de `-- ---- VARREDURA anon:` | manter antes da varredura e como o ÚLTIMO bloco a definir `fn_followup_generation_write`; se o original redefinir a função, reaplicar a linha da cascata na definição dele |
| `supabase/migrations/MANIFEST.md` | linha `9004_excluir_contato` depois da 9003 | `merge=union`; conferir que ficou uma vez |

Teste: `tests/invariants/convexy-excluir-contato.test.ts`. Reportado no original: issue #1862.

### Prospecção: etiqueta, origem e planilha (`v1.59.0-cvx.2`)

A prospecção guarda as empresas encontradas por campanha, mas não havia como achar nem reaproveitar
esse público depois. Três ajustes, sem schema novo:

- **Etiqueta:** o contato que a prospecção cria ganha `Prospecção: <nome da campanha>` (no teto de
  `TAG_MAX`), que serve ao filtro de etiquetas de Contatos e ao público de Campanhas (que filtra por
  `contacts.tags`).
- **Origem:** `prospecting` (o `source` que a prospecção grava) entra no filtro de origem de Contatos.
- **Planilha:** "Baixar planilha (CSV)" em Prospecção › 3. Acompanhar resultados, pela rota da
  Convexy `GET /api/v1/convexy/prospeccao/[id]/planilha` — admin (a mesma porta da tela), filtrada pela
  organização da sessão, auditada como `prospecting.exported`. `;` e BOM (Excel em português), célula
  que começa com `= + - @` neutralizada com apóstrofo (o texto vem do Google Maps), telefone como
  `(11) 99999-9999`.

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `lib/prospecting/store.ts` | import de `etiquetaDaCampanha`; `tags: [etiquetaDaCampanha(c.name)]` no `createContactHandler` de `activateCampaign` | reaplicar |
| `app/app/contacts/_client.tsx` | `{ value: "prospecting", label: "Prospecção" }` no fim de `SOURCE_OPTIONS` | reaplicar; se o original incluir, apagar a nossa |
| `app/app/prospecting/_client.tsx` | import de `BotaoDaPlanilha`; o cabeçalho de "3. Acompanhar resultados" vira `flex` com o `<BotaoDaPlanilha>` ao lado | reaplicar |
| `lib/audit/actions.ts` | `"prospecting.exported"` no fim de `AUDIT_ACTIONS` | manter no fim |
| `CHANGELOG.md` | `## [1.59.0-cvx.2]` | ordem de "Base e versões" |

Código só da Convexy: `lib/convexy/prospeccao/planilha.ts`, `components/convexy/prospeccao/BotaoDaPlanilha.tsx`,
`app/api/v1/convexy/prospeccao/[id]/planilha/route.ts`, o texto `prospeccao` em `lib/convexy/textos.ts`.
Testes: `tests/unit/convexy-prospeccao-planilha{,-rota}.test.ts`.

### Telas escondidas do menu (`v1.59.0-cvx.3`)

Roteiro da plataforma nova, item 1 (decisão de 28/09/2026). A tela sai da barra lateral, do menu da
Convexy, dos hubs, da busca ⌘K, do Início e do editor de interface — **para todo papel, admin da
plataforma inclusive**, e com o menu da Convexy ligado ou não. A rota, a página e o código ficam
intactos: quem digita o endereço abre a tela. Nada é apagado, para o merge com o original seguir simples.

- **Para todas as organizações:** Comandas, Financeiro, Faturamento, Produtos, Nuvemshop, Dados
  externos e Extensões. O canal Datafy não é tela do menu: é aba de Conexões e só existe com
  `DATAFY_ENABLED=true`.
- **As "Orientações instaladas" ficam como estão** (menu da Convexy e hub do CRM): só aparecem com
  extensão instalada, e esconder o grupo quebraria `extensoes-declarativas` e
  `extensoes-portas-novas` do original. O aviso de leitura falha ainda leva a `/app/extensions`,
  que abre (a rota não foi tocada).
- **Só no nicho `clinica`:** Chamadas, Trunk SIP e Prospecção. Decide o nicho, que só o admin da
  plataforma altera (`/admin/tenants/[id]`), e não a interface da organização, que o admin da
  clínica edita e poderia religar. Organização sem nicho vale como genérico e vê as três.
- Na clínica, a porta Pacientes do menu da Convexy fica só com Contatos e vira link direto.
- O editor de interface não oferece a tela escondida pelo nicho, mas preserva a escolha já feita
  sobre ela ao gravar: salvar a interface na clínica e depois mudar o nicho para serviços traz
  Chamadas, Trunk SIP e Prospecção de volta.

A lista mora em `lib/convexy/telas-escondidas.ts`; quem aplica é `permitidos()`, de onde todas as
projeções do menu partem. O nicho chega pelo `ConvexyProvider` (cliente) e por
`lib/convexy/nicho-da-organizacao.ts` (hubs e Início, no servidor).

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `lib/navigation/interface.ts` | imports de `Nicho` e `escondidaPelaConvexy`; parâmetro `nicho` em `permitidos` (filtro `!escondidaPelaConvexy`) e em `destinosDaInterface` | reaplicar |
| `lib/navigation/registry.ts` | import de `Nicho`; parâmetro `nicho` em `sidebarGroups`, `hubSections` e `searchable`, repassado a `destinosDaInterface` | reaplicar |
| `components/shell/Sidebar.tsx`, `components/shell/CommandPalette.tsx` | `useConvexy()` e `convexy?.nicho` como último argumento | reaplicar |
| `components/shell/NavHub.tsx` | prop `nicho` (repassada a `destinoDoHub` e `hubSections`) | reaplicar |
| `app/app/{crm,ai,analise,settings}/page.tsx` | `nicho={await nichoDaOrganizacao(activeOrg?.orgId)}` no `NavHub` | reaplicar |
| `components/team/InterfaceEditor.tsx` | `convexy?.nicho` em `permitidos` (opções); `guardadas` + `mudar()` no lugar de `onChange` nas duas gravações — a escolha sobre tela escondida pelo nicho segue gravada, para trocar o nicho depois não perder Chamadas/Prospecção | reaplicar |
| `tests/unit/{nav-hub,navegacao-registry,interface-por-vinculo,interface-por-empresa}.test.*` | `vi.mock` de `telas-escondidas` que desliga o filtro (medem o catálogo do original) | reaplicar |
| `tests/e2e/navegacao.spec.ts`, `tests/e2e/interface-por-vinculo.spec.ts` | Produtos trocado por Campanhas (navegação, admin) e por Tarefas (interface por membro: o membro é agente, e Campanhas aparece para todo papel mas as APIs dela exigem gerente — inconsistência do original) | reaplicar; se o original mudar o caso, refazer a troca |
| `CHANGELOG.md` | `## [1.59.0-cvx.3]` | ordem de "Base e versões" |

Código só da Convexy: `lib/convexy/telas-escondidas.ts`, `lib/convexy/nicho-da-organizacao.ts`, o
nicho em `components/convexy/menu/useMenuConvexy.ts`,
`lib/convexy/menu/montar.ts` e `app/app/_convexy/inicio/visibilidade.ts`. Testes:
`tests/unit/convexy-telas-escondidas.test.ts`, os ajustes em `tests/unit/convexy-menu-{desktop,hubs}`
e `tests/e2e/convexy-menu.spec.ts` (a mecânica da sub-sidebar passou da porta Pacientes para a Agenda).

### Menu da clínica (`v1.59.0-cvx.4`)

Decisão de 29/09/2026 (roteiro da plataforma nova, replanejamento). Só o menu da Convexy (módulo
`menu_convexy`) muda; o menu clássico do original fica como está.

- **Portas, nesta ordem:** Início · Conversas (Inbox, Sem resposta, Modelos; Envios) · **CRM** (Funil,
  Tarefas, Prospecção) · Agenda · Pacientes/Contatos · **Agentes** (Assistentes, Base de conhecimento;
  "Acompanhar" e "Avançado" como grupos secundários) · **Fluxos** (Retornos automáticos, Roteadores,
  Fluxos de atendimento) · **Minha clínica**/Minha empresa (Tratamentos/Tipos de agendamento e Dados da
  clínica/empresa) · Configurações no rodapé. As portas Funil, Tarefas e Resultados deixaram de existir.
- **Fora do menu** (`FORA_DO_MENU` em `lib/convexy/menu/mapa.ts`): Métricas, Anúncios, Atividades,
  Faturamento, Evolução da IA e Audit Log. Continuam na busca ⌘K e abrem pelo painel do Início; nessas
  telas quem acende no menu é o Início (`DONOS_EXTRAS`). Tela de análise nova do original também fica
  fora (`PADRAO_POR_GRUPO.analise.porta = null`), listada no relatório do teste do mapa.
- **Hubs:** `/app/crm` abre o Funil e `/app/analise` abre o Início. As orientações das extensões passam
  para a porta CRM.
- **Início é o painel:** bloco "Resultados do mês" (conversas novas, pacientes/contatos novos,
  agendamentos sem os cancelados, compareceram, faltaram — mês no fuso da organização) com "Ver as
  métricas", e bloco do funil principal (etapas em aberto, cards abertos) com "Abrir o funil", antes
  dos três blocos do dia. Cada bloco só aparece com o destino dele visível (Métricas, Funil) e falha
  isolado. Consultas com o client de sessão em `app/app/_convexy/inicio/blocos.ts`
  (`numerosDoMes`, `funilDoCrm`).
- Especialistas e os dados completos da clínica entram em Minha clínica numa versão seguinte.

Código só da Convexy (sem trecho novo em arquivo do original): `lib/convexy/menu/mapa.ts`,
`lib/convexy/textos.ts`, `app/app/_convexy/inicio/{blocos.ts,dia.ts,Inicio.tsx,CartaoDeNumeros.tsx}`.
Testes: `tests/unit/convexy-menu-{mapa,montar,dono,desktop,gaveta,hubs,interface}`,
`tests/unit/convexy-inicio-{tela,dia}`, `tests/unit/convexy-telas-escondidas.test.ts` e
`tests/e2e/convexy-menu.spec.ts` (a mecânica da sub-sidebar passou para a porta Minha clínica; a
página de porta direta, para Pacientes).

### Perfis de áreas (`v1.59.0-cvx.5`)

Spec: `docs/superpowers/specs/2026-09-25-convexy-perfis-de-areas-design.md` (revisão 5, fase 1).
A Convexy decide, por empresa, quais **áreas** (hrefs do catálogo de navegação) ela tem — um pacote.

- **Perfis** (`perfis_de_areas`, migration 9005, só service role): Completa (libera tudo, protegida
  no banco), Essencial (o preset Simplificada) e Clínicas, semeados só quando a tabela nasce. Editados
  em `/admin/perfis-de-areas`; excluir só perfil sem empresas.
- **Empresa:** `organizations.perfil_de_areas_id` (nulo = Completa) + `areas_a_mais`/`areas_a_menos`,
  escolhidos na criação (`/admin/tenants/new`) e no cartão "Áreas liberadas" da página da empresa.
  Gravação condicional pela versão lida (409) e auditoria `tenant.areas_changed`.
- **Cálculo** (`lib/convexy/areas/calculo.ts`): perfil ∪ a mais − a menos ∪ obrigatórias (portas
  essenciais, Início, LGPD, Conexões), com fecho de dependências (Roteadores, Retornos, Fluxos de
  atendimento e Prospecção precisam de Assistentes; Assistentes precisa de Pedidos da IA e Casos).
  Completa sem ajustes = sem limite: nada muda.
- **Onde vale:** `loadAuthUser` limita a interface de cada vínculo às áreas liberadas
  (`limitarInterface`), então menu clássico, menu da Convexy, busca ⌘K, hubs e Início obedecem sem
  mudar; o editor de interface da clínica não oferece área de fora (e preserva a escolha salva sobre
  ela); `GuardaDoPacote` troca a tela por "Esta área não faz parte do pacote da sua empresa" quando
  alguém abre o endereço. O suporte da Convexy não é limitado.
- **Fase 2 (não feita):** pausar o que estiver ativo numa área retirada, aviso de impacto, filtro das
  ferramentas da IA e do MCP, reativação, mover empresas ao excluir perfil e "fora do pacote" no
  suporte. Até lá, retirar uma área de uma empresa que a usa deixa o que já está ativo funcionando —
  o cartão avisa ao salvar.
- **Desvio:** a doc do original diz que a interface "nunca é autorização"; aqui o pacote também é
  apresentação na fase 1 (a tela do servidor ainda roda e a API REST não é bloqueada), mas a tela de
  aviso é uma decisão por empresa que o original não tem.

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `supabase/baseline.sql` | bloco "perfis de áreas (migration 9005)" logo depois do da 9001 | reaplicar no mesmo lugar |
| `lib/auth/server.ts` | colunas do pacote no embed `interface_da_empresa`; `perfisSeAlgumaTemPacote`, `areasDaLinha`, `limitarInterface` na membership; `areas_liberadas` no `activeOrg` | reaplicar |
| `lib/auth/types.ts` | `areas_liberadas?` em `UserOrgMembership` e `ActiveOrg` | reaplicar |
| `app/app/layout.tsx` | `<GuardaDoPacote>` em volta dos children do `AppShell`; `areasLiberadas` no `ConvexyProvider` | reaplicar |
| `components/team/InterfaceEditor.tsx` | `foraDoPacote` nas opções e nas `guardadas` | reaplicar |
| `app/api/v1/admin/tenants/route.ts` | `perfilDeAreasDaCriacao` + `aplicarPerfilNaCriacao` depois do `rpc` | reaplicar |
| `hooks/useCreateTenant.ts` | `perfil_de_areas_id` fora do schema, na impressão digital | reaplicar |
| `app/admin/(protected)/tenants/new/_form.tsx` | estado e `<CampoDoPerfilNaCriacao>` depois do Plano | reaplicar |
| `app/admin/(protected)/tenants/[id]/page.tsx` | `<CartaoDasAreas>` | reaplicar |
| `components/admin/AdminSidebar.tsx`, `lib/i18n/dicionario.ts` | entrada "Perfis de áreas" | manter no fim |
| `lib/audit/actions.ts` | `platform.perfil_de_areas_*` e `tenant.areas_changed` no fim | manter no fim |
| `lib/database.types.ts` | colunas novas de `organizations` | regenerar/reaplicar |
| `CHANGELOG.md` | `## [1.59.0-cvx.5]` | ordem de "Base e versões" |

Código só da Convexy: `lib/convexy/areas/*`, `components/convexy/areas/*`,
`app/api/v1/admin/perfis-de-areas/*`, `app/api/v1/admin/tenants/[id]/areas/route.ts`,
`app/admin/(protected)/perfis-de-areas/page.tsx`, a migration 9005 e o mapa
`docs/architecture/convexy-areas.architecture.json`. Testes: `tests/invariants/convexy-perfis-de-areas.test.ts`,
`tests/unit/convexy-areas{,-rotas,-cartao}.test.*`.

## Desvios aceitos

- **DoD 17** — sem fragmento em `.changes/`: o CHANGELOG das versões `-cvx` é escrito à mão
  (o `release.yml`, que consome fragmentos, está desligado no fork).
- **DoD 15** — "bump não exige ação manual": a `-cvx.1` exige trocar o `origin` e limpar tags
  na VPS (procedimento abaixo). Só na transição do original para o fork.
- **DoD 16** — docs do original não são editados; o que não vale no fork está listado abaixo.
  Exceção desde a `-cvx.2`: `docs/testing/user-journey-map.md` ganha a seção `JCVX1` (menu
  novo), porque o DoD 12 manda registrar ali a jornada provada em tela; reaplicar mantendo a
  seção no fim do arquivo ("Menu novo").
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
- **Logo escuro (`v1.47.0-cvx.2`)** — aposentado na `v1.48.0-cvx.1` em favor do recurso do
  original (ver "Logo escuro"). A faixa de migrations `9001+` continua reservada ao fork; hoje
  há a `9001_nicho_da_organizacao` (menu novo, `v1.48.0-cvx.2`).
- **Menu novo (`-cvx.2`) — títulos desenhados no servidor.** O vocabulário por nicho troca só
  quatro títulos exatos ("Inbox", "Radar de risco", "Funis", "Central de avisos") e só no que
  passa pelo `useT` do cliente. Ficam com o nome do original: os títulos desenhados no servidor
  com `traduzir()` direto, os títulos fixos sem `t()`, o `metadata.title` da aba, e-mails,
  notificações e mensagens do agente (o vocabulário nunca é aplicado em `lib/agent-engine`,
  `lib/notifications` ou `workers`). A lista se mede, não se escreve:
  `git grep -l "traduzir(" -- 'app/app/*.tsx' 'app/app/**/*.tsx' | xargs grep -L '^"use client"'`
  (as telas de servidor que traduzem), e
  `git grep -nE '(t|traduzir)\("(Inbox|Funis|Radar de risco|Central de avisos)"' -- app components`
  (onde os quatro títulos aparecem e por qual caminho).
- **Menu novo — o vocabulário alcança a busca ⌘K e o sino** (decisão aceita na revisão do plano;
  a spec vai à revisão 5): a paleta desenha `t(d.label)` e o `AlertsBell` desenha
  `t("Central de avisos")`, então "Inbox", "Funis" e "Central de avisos" aparecem lá pelo
  vocabulário; os rótulos próprios do mapa (Pacientes, Anúncios, Assistentes) não chegam à busca.
  Provado em `tests/e2e/convexy-menu.spec.ts` ("o vocabulário do nicho aparece no sino (useT
  cliente) e na busca ⌘K"): o nome acessível do sino vira "Pedidos da IA" e a busca mostra
  "Funil de pacientes". O `<h1>` de `/app/kanban` não prova nada disso — é desenhado no servidor
  com `traduzir()` e continua "Funis" (desvio acima).
- **Menu novo — entradas que continuam indo para o Inbox:** trocar de organização, entrar e sair
  do suporte e terminar o onboarding, como no original. Onde: `git grep -n '"/app/inbox"' -- app/actions app/onboarding app/api/v1/impersonate lib/auth components/shell`.
- **Menu novo — "Tipo de negócio" num cartão da página do tenant**, e não dentro do
  `TenantOverview`: a página já é servidor e decide o módulo sem prop nova nos componentes do
  original, e o cartão lê o nicho pela rota dele (`GET …/nicho`) — o painel do tenant não muda. Na **criação** de organização pelo `/admin` (sem `ConvexyProvider`) a tela de
  interface fica no agrupamento do original, sem o Início; o Início chega pelo perfil
  Simplificada ou pela Completa.
- **Menu novo — `tests/unit/i18n-espanhol-cobre-a-tela.test.ts`** diz que "o português não
  muda". Com o módulo ligado, o `useT` da Convexy muda de propósito os quatro títulos acima.
- **Menu novo — estado "fechada no ×"** vive na aba enquanto ela navega no app (estado de tela,
  o menu mora no layout); recarregar reabre. Ler `sessionStorage` depois da hidratação faria a
  primeira pintura abrir e fechar a sub-sidebar.
- **Menu novo — orientações instaladas:** o endereço de uma orientação é dela (item de
  Contatos) depois que a sub-sidebar de Contatos abriu na aba; numa carga direta de
  `/app/extensions/<id>` antes disso, o dono é Extensões (Configurações). Com uma só tela de
  Contatos visível a porta vira link direto, e as orientações ficam em Configurações › Extensões.
- **Menu novo — `navegacao-completude.test.ts` não é editado** (o plano vence a spec §10: editar
  seria churn num arquivo do original). O motivo escrito na allowlist de `/app` do teste do
  original fica desatualizado no modo com o módulo ligado — o Início do menu novo dá alcance à
  tela que a allowlist descreve por outro caminho. Aceito porque o teste continua vigiando o
  modo clássico (módulo desligado), que é o do original.
- **Menu novo — dois blocos copiados do original, cada um vigiado por teste:** (1) o predicado
  da Fila do Início (`conversasEsperando`, `app/app/_convexy/inicio/blocos.ts`) repete a régua de
  `app/api/v1/conversations/counts/route.ts`, vigiado por
  `tests/unit/convexy-inicio-fila-do-inbox.test.ts` (ver "Reaplicar a Fila do Início" acima); (2)
  o toggle de área do `InterfacePorPortas` repete o handler do `InterfaceEditor` original,
  vigiado por teste de equivalência entre os dois (ruling da Task 8). Nos dois casos a duplicação
  é exigida pelo plano para não reescrever o arquivo do original; mudança futura do handler ou da
  régua do original precisa ser espelhada manualmente — o teste acusa quando alguém esquece.
- **Menu novo — o `/app` sempre faz uma leitura a mais de `modulosLigados`:** a página
  (`app/app/page.tsx` → `destinosDoInicio`, `app/app/_convexy/inicio/visibilidade.ts`) consulta
  `modulosLigados(db)` em TODA visita a `/app`, inclusive com o módulo desligado (é essa leitura
  que decide entre o Início e o redirect do original). O layout já tem a lista em
  `activeOrg.modulos_ligados`, mas não repassa `activeOrg` à página; propagar o campo exigiria
  mexer em mais lugares do original. Custo: uma leitura de `platform_config` por visita a `/app`.
- **Menu novo — a consulta própria do nicho no layout:** `app/app/layout.tsx` lê
  `organizations.nicho` numa consulta a mais em TODA navegação dentro do app, inclusive com o
  módulo desligado. Ela roda dentro do `Promise.all` que já existe (em paralelo, sem somar
  espera em série) e é separada da leitura de `onboarded_at`/`status` para que coluna ausente ou
  leitura recusada virem o nicho genérico sem alcançar os gates de onboarding e suspensão.
- **Menu novo — os rótulos das portas no trilho mantêm `truncate`.** O maior rótulo ("Assistente
  de IA") cabe nos 236px do trilho aberto; quebrar linha mudaria a altura fixa de 38px da spec.
  Nome de porta futura mais longo aparece com reticências — a queixa que motivou a régua era dos
  SUBMENUS cortando texto, não do trilho.
- **Testes da `-cvx.2`** — nenhuma suíte rodou na máquina local: unitários, cercas e
  typecheck/lint pelo `verify`; migration e RLS pelo `invariants` (install e update); a tela
  pelo `e2e` (`convexy-menu.spec.ts`, na parte escolhida pela sonda (a)) e pela conferência na
  VPS. A fase vermelha dos cinco guardas do "Review Focus" do plano foi vista no CI antes de cada
  implementação. A evidência visual é a captura feita na VPS. As capturas que o e2e grava vão para
  `evidence/convexy-menu/` (versionado, regra do original desde a 1.59; até a `v1.52.0-cvx.1`
  iam para uma pasta ignorada pelo git).

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
- `docs/white-label.md:17` e o cabeçalho de `tests/unit/logo-nao-some-no-tema-escuro.test.ts`
  ("um logo só"): no fork a instalação tem também o logo do tema escuro (`v1.47.0-cvx.2`).
  `docs/architecture/marca-propria.architecture.json` (`e58`) só cita `logo_path`.

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

**Da `v1.47.0-cvx.2` (logo escuro) para a `v1.47.0-cvx.1`** (histórico: desde a `v1.48.0-cvx.1`
o logo escuro é o do original). Antes de pensar em rollback: se
o problema é só o logo escuro (arte errada, contraste), basta **Remover** o logo do campo
"Logo para o tema escuro" em `/admin/marca` — a tela volta ao logo claro com a moldura, sem
atualização nenhuma. Rollback só se algo ficou ilegível ou um fluxo quebrou, sempre dentro
de `tmux`, conferindo antes que a sessão não existe:

    ssh -t <host-ssh> 'cd /opt/deskcommcrm && if tmux has-session -t rollback-logo-escuro 2>/dev/null; then echo "JÁ EXISTE: tmux attach -t rollback-logo-escuro"; else tmux new -s rollback-logo-escuro "bash hostgator-setup-kit/update.sh --to v1.47.0-cvx.1 --force 2>&1 | tee /root/update-$(date +%Y%m%d-%H%M)-rollback-logo-escuro.log; echo FIM; read"; fi'

Se o SSH cair: `ssh -t <host-ssh> 'tmux attach -t rollback-logo-escuro'`. A coluna
`logo_dark_path` fica no banco, inofensiva: o código da `-cvx.1` não a lê, e o baseline da
`-cvx.1` não a remove. **O valor gravado e o arquivo também ficam:** o `logo_dark_path` da
linha `id = 1` e o PNG no bucket `brand-logos` do Storage (na nuvem, fora do `tar` do
`backup.sh`) não são tocados pelo rollback, e a `-cvx.1` não tem campo para removê-los. Se o
motivo do rollback é o próprio logo escuro, clicar **Remover** no campo "Logo para o tema
escuro" **antes** do rollback. Se o rollback já foi feito, limpar o valor pelo `psql_run` do
kit (mesmo bloco `ssh <host-ssh> 'bash -s'` com `source hostgator-setup-kit/_common.sh` e
`enter_project` usado na conferência do banco, nunca com `bash -x`/`set -x`):
`update public.platform_branding set logo_dark_path = null where id = 1;` — o PNG órfão
(≤ 512 KB) no bucket é inofensivo. Depois do rollback o botão volta a oferecer a `-cvx.2`:
não clicar; corrigir na `-cvx.3`.
