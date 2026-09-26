# CONVEXY.md — o que este fork muda no DeskcommCRM

Fork `victorrabyfs/DeskcommCRM` do `melgarafael/DeskcommCRM`. Desenho completo:
`docs/superpowers/specs/2026-09-22-identidade-convexy-design.md`.

Regra: configuração antes de código; código da Convexy em arquivos novos; alteração
em arquivo do original só quando não há outro caminho, pequena e **registrada aqui**,
com o trecho exato e como reaplicar num conflito de merge. Destino de toda mudança
(DoD 18): **instalação do fork**.

## Base e versões

- Base atual: `v1.52.0` do original (`refs/upstream-tags/v1.52.0` no clone), trazida em 2026-09-26
  (1.48.0 → 1.52.0: 365 commits, 16 migrations; conflitos só no `CHANGELOG.md` e nas fontes de
  `app/layout.tsx`, que o original passou a versionar em `app/fonts/`). Bases anteriores:
  `v1.48.0`, `v1.47.0`, `v1.44.0`.
- Versões: `vX.Y.Z-cvx.N` sobre a base atual (hoje `v1.52.0-cvx.N`), tag anotada, criada só depois do merge, empurrada pelo nome.
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

### Símbolo da marca e refino do menu (`v1.52.0-cvx.1`)

O menu recolhido mostrava a inicial do nome em texto porque a marca do original só guarda o
logo claro e o escuro. A instalação ganha o **símbolo** — a arte quadrada da marca, sem o nome —
em `/admin/marca`, no cartão do logo. Coluna `platform_branding.simbolo_path` (migration
`9002_simbolo_da_instalacao`), mesma forma de caminho e mesma CHECK do logo escuro; escrita só
pela rota de logo do original com `tema=simbolo` e escopo da instalação (a organização recebe
422 antes de qualquer efeito, e a função do banco da 0406 já recusa o tema). Não passa pela
pilha de camadas de `lib/branding/resolve.ts`: só a instalação tem símbolo, e o layout raiz o
lê da linha da marca que já busca. Organização com logo próprio continua com a inicial dela.

No menu: a dica com o nome da porta recomeça fechada a cada troca entre trilho largo e só
ícones (antes, um hover no trilho largo ficava guardado e todas as portas tocadas abriam
juntas ao compactar); os itens da sub-sidebar não têm mais dica (e o `descricao` do item
saiu de `montarMenu`); a dica tem cor neutra e anima entrada e saída em `menu.css`; os
títulos de seção da sub-sidebar ganharam espaço acima.

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `app/api/v1/marca/logo/route.ts` | `"simbolo"` em `temaSchema`; `campoDoLogo` com o ramo `simbolo_path`; `temaSoDaInstalacao` e a recusa 422 logo depois do `const tema` no `POST` e no `DELETE`; `if (tema === "simbolo") return null;` no ramo da organização de `caminhoGravado` (comentários `Convexy`) | reaplicar os quatro pontos; se o original ganhar tema novo, somar ao nosso enum |
| `lib/branding/instalacao.ts` | `simbolo_path` em `COLUNAS` e no tipo `LinhaDaMarca` | reacrescentar |
| `lib/branding.ts` | `simboloUrl?: string \| null` em `Branding` | reacrescentar |
| `app/layout.tsx` | import de `logoDaCamada`; `const { linha, marca }` e `simboloUrl: logoDaCamada(linha?.simbolo_path, null)` em `MarcaDosClientComponents` | reaplicar |
| `components/shell/Sidebar.tsx` | `const simbolo = …` depois de `marcaDoProduto`, e o ternário `simbolo ? <img …> : <span>` no bloco `collapsed && !marcaDoProduto`, dentro de `MarcaDaBarra` | reaplicar junto com "Reaplicar a `MarcaDaBarra`" |
| `app/admin/(protected)/marca/page.tsx` | import de `logoDaCamada`; prop `simboloEmVigor` | reaplicar |
| `app/admin/(protected)/marca/_form.tsx` | import de `CampoDoSimbolo`; `simboloEmVigor` nos `Props` e na desestruturação; `<CampoDoSimbolo>` depois do `<CampoDeLogo>`, no mesmo cartão | reaplicar |
| `supabase/baseline.sql` | bloco `-- ---- símbolo da instalação (migration 9002) ----`, entre a coluna e as funções da 0406 | reaplicar no mesmo lugar |
| `supabase/migrations/MANIFEST.md` | linha `9002_simbolo_da_instalacao` depois da 9001 | `merge=union`; conferir que ficou uma vez |
| `CHANGELOG.md` | `## [1.52.0-cvx.1]` | ordem de "Base e versões" |

Código só da Convexy: `components/convexy/marca/CampoDoSimbolo.tsx`, os textos `simbolo` em
`lib/convexy/textos.ts`. Testes: `tests/unit/convexy-simbolo-{rota,na-barra,campo}.test.*`,
`tests/invariants/convexy-simbolo.test.ts` e o bloco "a dica com o nome da porta" em
`tests/unit/convexy-menu-desktop.test.tsx`.

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
  implementação. A evidência visual é a captura feita na VPS. As capturas que o e2e grava em
  `.superpowers/evidence/convexy-menu/` não duram: a pasta é ignorada pelo git e o CI só sobe
  artefatos quando o e2e falha.

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
