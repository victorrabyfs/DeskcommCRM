# Menu novo da Convexy — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar a `v1.48.0-cvx.2` — o app ganha, atrás do módulo opcional da instalação `menu_convexy`, o menu da Convexy (8 portas + Configurações no rodapé, sub-sidebar por porta, trilho compacto, gaveta no celular), o Início simples em `/app`, a tela de interface agrupada pelas portas, o nicho por organização (`organizations.nicho`, migration 9001) com o vocabulário dos títulos — e, com o módulo desligado, tudo exatamente como o original.

**Architecture:** O menu é uma projeção pura do `NAV_CATALOG` do original: `lib/convexy/menu/mapa.ts` (posições explícitas por href + posição padrão por `group` do original), `dono.ts` (um dono por endereço, regra de segmento) e `montar.ts` (recebe a lista de `searchable()` e devolve portas/grupos/itens rotulados por nicho e idioma). O `ConvexyProvider` (por pedido, alimentado pelo `app/app/layout.tsx` com `modulos_ligados` e `organizations.nicho`) decide o modo; as alterações no original são trocas pontuais nos pontos de extensão (`AppShell`, `MobileSidebar`, `NavHub`, `InterfaceEditor`, `hooks/i18n/useT.ts`, `app/app/page.tsx`), cada uma com comentário `Convexy` e registrada no `CONVEXY.md`. Escrita do nicho só pelo admin da plataforma (`PATCH admin/tenants/[id]/nicho`, auditada). Todo teste roda no CI do fork.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6 estrito (`noUncheckedIndexedAccess`), Tailwind 4 (CSS-first, variantes `md:`/`lg:`), Radix Tooltip/Sheet (shadcn), `@tanstack/react-query` 5, Zod, Supabase (Postgres + RLS), Vitest 4 (jsdom e node), Playwright (Chromium), `gh` CLI (fork `victorrabyfs/DeskcommCRM`), bash/tmux na VPS.

**Spec:** docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md

> **Execução sem recursos na máquina local, desde a primeira linha** (decisão do Victor, a mesma da `-cvx.3` e do logo escuro). Nada de `pnpm`/`npm`/`npx`/`node`/`vitest`/`tsc`/`eslint`/`playwright`, Docker, Supabase local, `brew`, `git worktree`, build, instalação ou processo em segundo plano nesta máquina (`node_modules` não existe no clone, de propósito). Os subagentes das tasks de código **só leem, editam e commitam**; `git` só de leitura, mais `add`/`commit`/`push`. Toda suíte — typecheck, lint, unitários, cercas, `test:db`, e2e, build — roda **no CI do PR** (checks `verify`, `invariants`, `build-and-size`, `e2e`, `imagens-ok`). Por isso cada task traz o código inteiro e diz qual check prova cada teste. "Rodar o teste" neste plano é: commitar, empurrar a branch e ler o resultado do arquivo de teste no log do GitHub Actions com `gh`.

## Decisões do plano

Onde a spec deixa escolha, onde o código medido pede outro caminho (o código vence), ou onde a revisão de 2026-09-25 decidiu (coordenação; decisões finais):

1. **Dicionário do original: três linhas, todas exigidas por tela que traduz pelo dicionário.** O rótulo "Início" já existe (`lib/i18n/dicionario.ts:1470`; chave repetida em literal nem compila), então entra só a **descrição** do Início (cobrada por `i18n-catalogo-do-menu`), mais o **rótulo e a descrição do módulo** em `/admin/sistema` (o cartão desenha `t(m.rotulo)`; os módulos do original têm as linhas deles em `dicionario.ts:2539-2542`). Nenhuma outra linha.
2. **Texto que o dicionário já tem não se repete em `textos.ts`.** As folhas de rótulo são `Texto = string | TextoConvexy`: `string` é chave do dicionário do original (traduzida por `traduzir`), `{ pt, es }` é texto novo da Convexy. Ex.: "Início", "Conversas", "Configurações", "Organização", "Fechar", "Atualizado às", "Não deu para salvar. Tente de novo em instantes." são chaves; "Assistente de IA", "Envios", "‹ Voltar" são novos. As opções do "Tipo de negócio" são o `comoSeApresenta` dos pacotes do onboarding (`lib/onboarding/pacotes-de-funil.ts`), já traduzidos.
3. **`homeDaInterface` não devolve `/app`, e o Início não é "área de trabalho".** `homeDaInterface` e `interfaceTemDestino` não recebem módulos: com o módulo desligado e só o Início escolhido, o redirect de `/app` iria para `/app` (laço) e o editor clássico aceitaria "ao menos uma área" sem área nenhuma à vista. O Início só resume as outras telas, então sai das duas contas (uma condição em cada função, no `lib/navigation/interface.ts` que já muda por `SIMPLIFICADA`). Testes na Task 2 e na Task 8.
4. **A entrada do Início vai no FIM do `NAV_CATALOG`**, `group: "atendimento"` (sem hub: não pede `section` nem aparece em página-hub), **sem `sidebar`** (o mapa a posiciona explicitamente; `sidebar: true` a faria contar no menu clássico de quem chama `sidebarGroups` sem módulos), `icon: "Gauge"`, `modulo: "menu_convexy"`. O `tests/unit/interface-por-empresa.test.ts:47` passa a chamar `sidebarGroups` com `[]` como a casca (`Sidebar.tsx:48`).
5. **A constante do módulo mora em `lib/convexy/modulo.ts`** (Task 2), para toda task compilar sozinha; o mapa, o layout, a página do tenant, o editor e o Início a importam de lá.
6. **O contexto da Convexy mora em `lib/convexy/contexto.tsx`** (`ConvexyProvider`, `useConvexy`), e não em `components/`: `lib/` nunca importa `components/`.
7. **Hubs e "um dono":** `/app/crm`, `/app/ai`, `/app/analise` e `/app/settings` não têm item dono no menu novo — com o módulo ligado o `NavHub` os redireciona. O teste de dono os aceita porque cada hub do original tem porta em `PORTA_DO_HUB` (e reprova hub novo sem porta). A única página dona de si é `/app` (o Início). O varredor de páginas trata pastas `(grupo)` como transparentes e pula `@slot`.
8. **Orientações instaladas e o dono:** cada orientação é um item (`/app/extensions/<id>`), mais específico que Extensões, e é dona do próprio endereço **quando já foi carregada** (a sub-sidebar de Contatos abriu nesta aba). Numa carga direta de `/app/extensions/<id>` antes disso, o dono é Extensões (Configurações). Registrado no `CONVEXY.md`.
9. **"Fechada no × nesta aba" é estado de React**, não `sessionStorage`: vive enquanto a aba navega no app (o menu mora no layout); recarregar reabre. Ler `sessionStorage` depois da hidratação faria a primeira pintura abrir e fechar a sub-sidebar.
10. **Largura intermediária (`md`–`lg`) por CSS; a sobreposição é estado de tela.** Em `lg` a sub-sidebar mora num invólucro que anima a largura de 0 a 240px (a caixa de dentro tem 240px fixos: o conteúdo não pula) e continua montada enquanto fecha (`inert` + `aria-hidden`). Entre `md` e `lg` ela só aparece aberta por clique, por cima da página, com fundo `bg-overlay` de largura `calc(100vw - 100%)` (sem rolagem horizontal); Esc no documento e clique fora fecham **só a sobreposição** e devolvem o foco à porta; o foco entra na sobreposição ao abrir; navegar sem clique numa porta a desfaz. Só o `aria-expanded` e o foco usam `matchMedia("(min-width: 1024px)")` (`useSyncExternalStore`, servidor = tela larga).
11. **"Tipo de negócio" é um cartão próprio na página do tenant**, inserido depois do `<TenantOverviewClient>` (Server Component decide o módulo com `moduloLigado()`); o `TenantOverview`, o hook `useTenantDetail` e a rota GET do tenant **não mudam**: o nicho tem leitura própria (`GET` na rota `…/nicho`, o mesmo arquivo do `PATCH`), para uma coluna ausente nunca derrubar o painel do tenant.
12. **O layout lê o nicho numa consulta PRÓPRIA** (`.select("nicho")`, dentro do mesmo `Promise.all`, sem consulta sequencial nova): se a coluna faltar ou a leitura falhar, vale `generico` e os gates de onboarding e suspensão, que leem a outra consulta, seguem intactos. O módulo é lido no JSX direto de `activeOrg.modulos_ligados`.
13. **O vocabulário alcança o ⌘K e o sino** (decisão aceita pela coordenação; a spec vai à revisão 5): a paleta desenha `t(d.label)` e o `AlertsBell` desenha `t("Central de avisos")`, então "Inbox", "Funis" e "Central de avisos" aparecem lá pelo vocabulário. Os rótulos próprios do mapa (Pacientes, Anúncios, Assistentes) não chegam à busca.
14. **Rótulos próprios do mapa, alinhados ao vocabulário:** `/app/inbox` "Conversas", `/app/radar` "Sem resposta", `/app/ai/inbox` "Pedidos da IA", `/app/ai/agents` "Assistentes" (spec 3.3), `/app/ads/meta` "Anúncios" (spec 6.2), `/app/contacts` e `/app/kanban` por nicho. O resto usa o rótulo do catálogo traduzido.
15. **A Fila do Início copia o predicado da contagem do Inbox, e um teste de fonte o prende.** Não existe função extraída (a contagem da Fila vive dentro do `GET` de `app/api/v1/conversations/counts/route.ts`). O Início usa as mesmas peças, na mesma ordem — `orgTemAutomatico` + `comandosDaFila` + contagem `head` em `conversations` com `.eq("organization_id", …)` e `.in("comando_da_conversa", …)` — e as linhas vêm do próprio `listConversationsHandler`. `tests/unit/convexy-inicio-fila-do-inbox.test.ts` lê o fonte do `counts/route.ts` e reprova se o predicado de lá mudar; a regra de reaplicar está no `CONVEXY.md`.
16. **`crm_tasks` não está em `lib/database.types.ts`.** O client de sessão (`createServerClient` sem genérico) não é tipado; as linhas das tarefas são tipadas por `Tarefa` (`lib/tarefas/tipos.ts`), como `GET /api/v1/tasks` já faz. O rótulo "Atrasada" usa `estaAtrasada({ due_date, status }, agora)` do original; o fim do dia no fuso da organização só corta a consulta.
17. **"Hoje" é o da organização.** O Início usa `limitesDoDia(agora, fuso)` sobre `partesNoFuso`/`instanteDe` (`lib/agenda/fuso.ts`, que resolve horário de verão), com `fusoUtilizavel(org.timezone)` (`lib/tempo/fusos.ts`: `FUSO_PADRAO = "America/Sao_Paulo"` quando `ActiveOrg.timezone` é nulo ou inválido). `listaAgendamentos` recebe `de`/`ate` (sem recorte ela recusa com `sem_alvo`; `dia` corta em UTC) e `limite: 200` (o padrão da rota da agenda); o bloco conta só `SITUACOES_QUE_OCUPAM`. A espera de conversa anterior a hoje mostra dia/mês.
18. **"A rota recusa quem não é admin de plataforma" é provado em dois lados:** o banco (invariante: o `admin` da organização não grava `nicho` pela REST, com controle positivo do admin de plataforma) e a rota (unitário: 403, suporte somente leitura antes do efeito, id inválido, gravação condicional com 409, auditoria com antes/depois).
19. **`MarcaDaBarra` extraída de `components/shell/Sidebar.tsx`** (fora da tabela da spec): o trilho novo precisa do mesmo logo; copiar as ~100 linhas de logo seria lógica duplicada. Recorte sem mudar uma classe; reaplicação registrada no `CONVEXY.md` (inclui o "Logo maior").
20. **`lib/ui/icons.ts` ganha `CheckSquare` e `GearSix`** (a doutrina do barril manda importar dali). Os dois existem no `@phosphor-icons/react` 2.1.10 (conferido no `src/ssr/index.ts` da tag `v2.1.10`); o `typecheck` do `verify` confirma.
21. **Login no e2e:** o helper `loginComoPapel` espera `/\/app\//` depois do MFA, e com o Início a entrada é `/app`. A spec salva as sessões (`storageState`) no `beforeAll` **antes** de ligar o módulo; o dono do servidor liga o módulo e escolhe o nicho **pela tela**. O helper do original não muda. A spec se recusa a rodar fora de banco local ou do CI.
22. **Bloco da 9001 no baseline logo depois do bloco da 0208** (`organizations.currency`, coluna irmã com CHECK), e não no fim (precedente do logo escuro).
23. **Porta com um item visível é Link** — inclusive Contatos com uma tela só: as orientações seguem alcançáveis por Configurações › Extensões.
24. **Parte do e2e pela sonda de orçamento.** A spec entra na `SPECS_PARTE_*` escolhida pela sonda (a) do `e2e.yml` (maior folga, sem a parte 4); o padrão, se ela couber, é a `SPECS_PARTE_1` logo depois de `convexy-identidade.spec.ts`, como a spec pede.
25. **Fase vermelha provada no CI para os cinco guardas do Review Focus:** o commit só com o teste vai ao CI primeiro; o vermelho daquele arquivo é lido e anotado; só então o commit da implementação.
26. **Gravação condicional do nicho:** o `PATCH` só grava se o valor no banco ainda é o que ele leu (`.eq("nicho", antes)` ou `.is("nicho", null)`), senão responde 409 `state_conflict` — duas abas do admin não se sobrescrevem em silêncio.
27. **O editor de interface do original não é reescrito.** O bloco `NAV_GROUPS.map` fica byte a byte (o handler inclusive); só a abertura ganha `!convexy?.menuLigado &&` e a linha `items` ganha o filtro do Início. O `InterfacePorPortas` é irmão do bloco e tem a própria função de marcar, com a MESMA regra do handler (o próximo conjunto parte das opções marcadas e mantém o perfil); o teste "o dado gravado é o mesmo nos dois modos" prende a equivalência.
28. **Frescor do Início por `visibilitychange`** (aba volta a ficar visível), como o `hooks/auth/InterfaceRefresh.tsx` do original — não `focus`, que refaria as três consultas a cada clique de volta na janela.
29. **Movimento pelas propriedades individuais.** Os keyframes usam `scale`/`translate` (não `transform`), para não disputar com os utilitários do Tailwind 4; a barra do ativo só cresce (`scale: 1 0` → `1 1`, a partir do centro). O "afundar" da porta anima `scale`, que é o que `active:scale-[.97]` escreve no Tailwind 4.
30. **A gaveta devolve o foco com `flushSync`**: ao "‹ Voltar", a lista de portas precisa existir no DOM antes do `focus()`; um efeito que só foca seria a outra forma, com um estado a mais para lembrar de onde se voltou.

## Global Constraints

- Clone: `/Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM`. Branch: `convexy/menu-novo` (base `origin/main` = `v1.48.0` do original + `v1.48.0-cvx.1`; já contém a spec). Repositório: `victorrabyfs/DeskcommCRM`; todo `gh` leva `-R victorrabyfs/DeskcommCRM`.
- Sem recursos locais (quadro acima). O CI roda em `pull_request`: a Task 1 abre o PR em rascunho (com ok do Victor).
- Versão: `v1.48.0-cvx.2`. Tag anotada só depois do PR `MERGED`, empurrada pelo nome; **GitHub Release obrigatória** (o kit da 1.48 escolhe a versão por `/releases/latest`). `CHANGELOG.md`: `## [1.48.0-cvx.2] — <data real>` abaixo de `## [Não lançado]` e acima de `## [1.48.0-cvx.1] — 2026-09-25`.
- Menu largo **236px**; porta **38px** de altura, texto **14,5px**, ícone **19px**; porta compacta **40px**. Trilho compacto **64px**, ícones **20px**. Sub-sidebar **240px**, título **15,5px**; itens **32px** de altura mínima, texto **13,5px**. Movimento **~300ms `cubic-bezier(.2,.8,.2,1)`** (largura, alça, barra do ativo); realces e "afundar" (`active:scale-[.97]`) em **200ms**; seta **250ms**; `prefers-reduced-motion` desliga tudo. Dica da descrição depois de **500ms** (e no foco). `md` = 768px, `lg` = 1024px.
- Módulo: chave **`menu_convexy`**, linha de `platform_config` **`MODULO_MENU_CONVEXY`**, constante `MODULO_DO_MENU` em `lib/convexy/modulo.ts`. Sem migration para o módulo.
- Nicho: **`clinica`, `servicos`, `imobiliaria`, `curso`, `loja`, `generico`**; nulo = `generico`. Coluna `organizations.nicho text`, CHECK **`organizations_nicho_valido`**. Migration **`supabase/migrations/20260925180901_9001_nicho_da_organizacao.sql`**, rótulo do bloco no baseline **`-- ---- nicho da organização (migration 9001) ----`**.
- Auditoria: **`tenant.nicho_changed`**, no **fim** de `AUDIT_ACTIONS`, com `metadata: { tenant_slug, de, para }`.
- `lib/i18n/dicionario.ts`: **três** linhas novas (descrição do Início; rótulo e descrição do módulo) — nada mais. Texto novo em `lib/convexy/textos.ts`; texto que o dicionário já tem é chave (Decisão 2). **Nenhum** literal de prosa em JSX ou em `aria-label`/`title` nos arquivos novos (`tests/unit/i18n-espanhol-cobre-a-tela.test.ts`).
- Cores só por token (`bg-surface`, `bg-surface-elevated`, `bg-accent`, `bg-accent-soft`, `bg-overlay`, `text-text`, `text-text-muted`, `text-text-subtle`, `text-accent`, `text-accent-foreground`, `border-border`, `border-border-strong`, `ring-ring`); nada de hex/rgb literal. Foco: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden` (**nunca** `outline-none`, reprovado por `tests/unit/tailwind-tokens.test.ts`). `tailwindcss-animate` **não** está instalado: animação é CSS à mão (`components/convexy/menu/menu.css`).
- Trilho `sticky top-0 h-screen shrink-0`, nunca `fixed`; `AppShell` sem `ml-*` e mantendo `useOcupacaoDoRodape`/`estiloDaReserva`.
- Toda alteração em arquivo do original leva comentário `// Convexy: … CONVEXY.md, "Menu novo".` (`-- Convexy:` em SQL), muda **só as linhas estritamente necessárias** (inserir, nunca reescrever um arquivo do original), e ganha uma linha na tabela da seção "Menu novo (`v1.48.0-cvx.2`)" do `CONVEXY.md` (Task 12). Código novo só em arquivo novo. **Nenhuma** export sem consumidor.
- Nenhum arquivo novo em `app/`, `components/`, `lib/`, `hooks/` escreve a palavra do produto original (`tests/unit/branding.test.ts`).
- Infraestrutura só por placeholder: `<dominio-de-producao>`, `<host-ssh>`. Pasta da VPS: `/opt/deskcommcrm`; `update.sh` sempre em `tmux`; nunca `set -x` em bloco com `psql_run`.
- Números de linha citados são os da branch no início desta execução; depois de editar, **localizar pelo texto citado**. Texto citado que não existir: parar e relatar, nunca "adaptar".
- Commits terminam com a linha em branco e `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Passos marcados **PARAR e pedir ok ao Victor** só seguem com o "sim" dele (abrir/pôr PR em revisão, merge, tag, Release, atualização da VPS, ligar o módulo em produção).
- **Leitura do CI (vale para todo Step "Empurrar e ler o CI").** A autoridade é o **exit code** do `gh run watch` e as linhas de rodapé do Vitest (`Test Files`, `Tests`, `Errors`) — não títulos de caso no log. As linhas `✓`/`×` por arquivo são conveniência. Os logs ficam em `.superpowers/sdd/convexy-menu/` (ignorado pelo git), nunca em `/tmp`. O id de cada run vem de `gh run list -R victorrabyfs/DeskcommCRM --workflow <wf> --branch convexy/menu-novo --json databaseId,headSha`, filtrado pelo sha empurrado.
- **CI vermelho: diagnóstico antes de editar.** (1) Guardar `gh run view <id> -R victorrabyfs/DeskcommCRM --log-failed` em `.superpowers/sdd/convexy-menu/`. (2) Em `perf.yml`, `e2e.yml` e `publish-image.yml`, procurar primeiro a queda do Google Fonts no `next build`: `grep -iE "fonts\.(googleapis|gstatic)\.com|@vercel/turbopack-next/internal/font/google|Failed to fetch"`; se casar, **exatamente um** `gh run rerun <id> -R victorrabyfs/DeskcommCRM --failed` naquele workflow e esperar de novo; segunda falha, ou erro de outra natureza: **parar e investigar** (superpowers:systematic-debugging) e mostrar ao Victor. (3) Só com a causa nomeada, corrigir na branch com commit novo. Nunca desligar check, nunca `--no-verify`, nunca `rerun` em série.

## Review Focus

Os cinco modos de falha que mais machucam quem usa e que nenhum teste do original cobre — cada um ganha teste na task dona, e a fase vermelha dele é **vista no CI** antes da implementação (Decisão 25):

1. **Laço `/app` → `/app`.** Com o módulo desligado e o Início como única área escolhida, o redirect voltaria ao próprio `/app` e o login nunca terminaria. Fixado: condição em `homeDaInterface` + caso "sem laço" em `tests/unit/convexy-menu-modulo.test.tsx` (Task 2) e na página (`tests/unit/convexy-inicio-pagina.test.tsx`, Task 10).
2. **"Hoje" no fuso do servidor.** A VPS roda em UTC: às 23:30 de São Paulo já é amanhã no servidor, e agenda/tarefas "de hoje" mostrariam o dia errado. Fixado: `limitesDoDia` no fuso da organização + casos 23:30 SP, UTC, virada de ano e dia com horário de verão sem meia-noite (`tests/unit/convexy-inicio-dia.test.ts`), e os blocos conferem que `de`/`ate` vêm dele (Task 10).
3. **Compactação automática chamando `toggleSidebar`.** Abrir uma porta que chamasse a ação do cookie revalidaria o layout no servidor a cada clique e trocaria a preferência "recolhido". Fixado: "clicar numa porta nunca chama `toggleSidebar`" e "a alça é quem chama" em `tests/unit/convexy-menu-desktop.test.tsx` (Task 6).
4. **Início vazando no clássico e no `/admin`.** O `InterfaceEditor` chama `permitidos()` sem módulos; o Início apareceria no editor clássico e na criação de organização do `/admin` (sem `ConvexyProvider`), e contaria como "área de trabalho" escondida. Fixado: casos "sem provider", "desligado" e "só o Início não basta" em `tests/unit/convexy-menu-interface.test.tsx` (Task 8).
5. **Nicho ou módulo vazando.** Um vocabulário guardado em variável de módulo trocaria os títulos de uma organização pelos de outra; e o e2e que liga o módulo e cai no meio deixaria as specs do original no menu novo. Fixado: "duas organizações lado a lado" em `tests/unit/convexy-menu-vocabulario.test.tsx` (Task 5); `beforeAll` que captura e `afterAll` que restaura exatamente módulo, nicho e interface em `tests/e2e/convexy-menu.spec.ts` (Task 11).

## File Structure

**Novos (Convexy):**

| Arquivo | Task | Responsabilidade |
|---|---|---|
| `supabase/migrations/20260925180901_9001_nicho_da_organizacao.sql` | 1 | Coluna `nicho`, backfill, CHECK |
| `lib/convexy/nicho.ts` | 1 | `NICHOS`, `Nicho`, `NICHO_PADRAO`, `nichoSchema`, `lerNicho` |
| `tests/invariants/convexy-nicho.test.ts` | 1 | Coluna, CHECK × `NICHOS`, RLS (com controle positivo), bloco reaplicável = migration |
| `tests/unit/convexy-nicho.test.ts` | 1 | `NICHOS` = ids dos pacotes; `lerNicho` |
| `lib/convexy/modulo.ts` | 2 | `MODULO_DO_MENU` |
| `tests/unit/convexy-menu-modulo.test.tsx` | 2 | Módulo, interruptor, Início no catálogo, `SIMPLIFICADA`, sem laço, Início não é área de trabalho |
| `lib/convexy/textos.ts` | 3 | `Texto`, `texto()`, `RotuloPorNicho`, `rotuloPorNicho()`, `TEXTOS`, rótulos por nicho |
| `app/api/v1/admin/tenants/[id]/nicho/route.ts` | 3 | `GET` e `PATCH` do nicho (admin de plataforma, suporte, Zod, gravação condicional, auditoria) |
| `components/convexy/CampoDoNicho.tsx` | 3 | "Tipo de negócio" na página do tenant |
| `tests/unit/convexy-nicho-rota.test.ts` | 3 | Rota: guardas, 400/403/404/409, auditoria antes/depois |
| `tests/unit/convexy-nicho-campo.test.tsx` | 3 | Campo grava pela rota; a página só o mostra com o módulo |
| `lib/convexy/menu/mapa.ts` | 4 | Portas, grupos, posições explícitas, padrão por `group`, hubs, donos extras, rótulos por href |
| `lib/convexy/menu/dono.ts` | 4 | `donoDoCaminho`, `ativoNoCaminho` |
| `lib/convexy/menu/montar.ts` | 4 | `montarMenu`, `rotuloDoItem`, `destinoDoHub` |
| `tests/unit/convexy-menu-mapa.test.ts`, `-dono.test.ts`, `-montar.test.ts`, `-textos.test.ts` | 4 | Cobertura, padrão, um dono, montagem, espanhol |
| `lib/convexy/contexto.tsx` | 5 | `ConvexyProvider`, `useConvexy` (por pedido) |
| `lib/convexy/vocabulario.ts` | 5 | `useT` da Convexy |
| `tests/unit/convexy-menu-vocabulario.test.tsx` | 5 | `useT`: sem provider/desligado = original; títulos exatos; nichos; es; por árvore |
| `components/convexy/menu/menu.css` | 6 | Movimento (só com movimento permitido) |
| `components/convexy/menu/useMenuConvexy.ts`, `useLarguraLarga.ts`, `useOrientacoes.ts` | 6 | Portas em vigor; `lg`; orientações sob demanda |
| `components/convexy/menu/BotaoDaPorta.tsx`, `ListaDaPorta.tsx`, `SubSidebar.tsx`, `MenuConvexy.tsx` | 6 | Porta, lista, sub-sidebar, trilho |
| `lib/convexy/orientacoes.ts` | 6 | Tipo da resposta e `hrefDaOrientacao` |
| `tests/unit/convexy-menu-desktop.test.tsx`, `-estrutura.test.ts` | 6 | Comportamento, a11y, hidratação; cercas de texto |
| `components/convexy/menu/GavetaConvexy.tsx`, `tests/unit/convexy-menu-gaveta.test.tsx` | 7 | Gaveta do celular |
| `components/convexy/InterfacePorPortas.tsx`, `tests/unit/convexy-menu-interface.test.tsx` | 8 | Agrupamento por portas |
| `app/api/v1/convexy/orientacoes/route.ts`, `tests/unit/convexy-menu-hubs.test.ts`, `-orientacoes.test.ts`, `-orientacoes-hook.test.tsx` | 9 | Hubs e orientações |
| `app/app/_convexy/inicio/{dia,blocos,visibilidade}.ts`, `{CartaoDoInicio,RecarregarAoVoltar,Inicio}.tsx` | 10 | O Início |
| `tests/unit/convexy-inicio-{dia,blocos,fila-do-inbox}.test.ts`, `-{pagina,tela}.test.tsx` | 10 | Fuso, blocos, guarda da Fila, decisão de `/app`, tela |
| `tests/e2e/convexy-menu.spec.ts` | 11 | Prova em tela |
| `docs/architecture/convexy-menu.architecture.json` | 12 | Mapa vivo (DoD 13) |

**Alterados (original)** — cada um com comentário `Convexy` e linha no `CONVEXY.md`:

| Arquivo | Task | Alteração |
|---|---|---|
| `supabase/baseline.sql` | 1 | Bloco 9001 antes do rótulo da 0206 |
| `supabase/migrations/MANIFEST.md` | 1, 3 | Linha da 9001 (no fim; a Task 3 acrescenta o caminho da rota) |
| `lib/database.types.ts` | 1 | `nicho` em `organizations` Row/Insert/Update |
| `lib/instalacao/modulos.ts` | 2 | `menu_convexy` + `MODULO_MENU_CONVEXY` |
| `app/admin/(protected)/sistema/_form.tsx` | 2 | Entrada em `MODULOS_NA_TELA` |
| `lib/navigation/catalogo.ts` | 2 | Entrada do Início (fim do array) |
| `lib/i18n/dicionario.ts` | 2 | Três linhas (Decisão 1) |
| `lib/navigation/interface.ts` | 2 | `"/app"` em `SIMPLIFICADA`; `/app` fora de `homeDaInterface` e `interfaceTemDestino` |
| `tests/unit/interface-por-empresa.test.ts` | 2 | `sidebarGroups(…, [])` na contagem do menu lateral |
| `lib/audit/actions.ts` | 3 | `tenant.nicho_changed` no fim |
| `app/admin/(protected)/tenants/[id]/page.tsx` | 3 | Cartão "Tipo de negócio" inserido, com o módulo ligado |
| `lib/ui/icons.ts` | 4 | `CheckSquare`, `GearSix` |
| `hooks/i18n/useT.ts` | 5 | Reexporta o `useT` da Convexy |
| `app/app/layout.tsx` | 5 | Consulta própria do nicho; `ConvexyProvider` |
| `components/shell/Sidebar.tsx` | 6 | `MarcaDaBarra` extraída (sem mudar o desenho) |
| `app/app/_components/AppShell.tsx` | 6 | `MenuConvexy` ou `Sidebar`, pelo provider |
| `components/shell/MobileSidebar.tsx` | 7 | `GavetaConvexy` ou `SidebarContent` |
| `components/team/InterfaceEditor.tsx` | 8 | `InterfacePorPortas` como irmão do bloco do original; Início fora do agrupamento clássico |
| `components/shell/NavHub.tsx` | 9 | Redireciona com o módulo ligado |
| `app/app/page.tsx` | 10 | Início ou redirect |
| `.github/workflows/e2e.yml` | 11 | `convexy-menu.spec.ts` na parte escolhida |
| `CONVEXY.md`, `CHANGELOG.md`, `docs/testing/user-journey-map.md` | 12 | Registro, versão, jornada |

---

### Task 0: Estado da branch e o plano commitado

**Files:** `docs/superpowers/plans/2026-09-25-convexy-menu-novo.md` (este plano, já escrito).

**Interfaces:**
- Consumes: branch `convexy/menu-novo` com a spec revisão 4 (`f8822fd66`).
- Produces: plano commitado; confirmação de árvore limpa e base atual.

- [ ] **Step 1: Conferir (só leitura)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git status --short
git branch --show-current
git fetch -q origin
git merge-base --is-ancestor origin/main HEAD && echo "base atual: origin/main está na branch"
git log --oneline origin/main..HEAD
ls node_modules 2>/dev/null | head -1 || echo "sem node_modules (esperado)"
git ls-remote --heads origin | awk '{print $2}'
```
Expected: `git status` mostra só `?? docs/superpowers/plans/2026-09-25-convexy-menu-novo.md`; branch `convexy/menu-novo`; "base atual…"; o log lista só os commits da spec; "sem node_modules (esperado)". Se `origin/main` andou e não é ancestral: parar e pedir ao Victor o merge da `main` (regra de higiene de branches do `CLAUDE.md`), nunca `reset`.

Expected também: `git ls-remote` lista só `refs/heads/main` (a branch de trabalho ainda não foi empurrada; ela sobe na Task 1). Outra branch remota com uma migration `9001`: parar e avisar o Victor (o gate de colisão do `verify` compararia os números).

- [ ] **Step 2: Commitar o plano**

```bash
git add docs/superpowers/plans/2026-09-25-convexy-menu-novo.md
git commit -m "docs(convexy): plano do menu novo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: um commit, só este arquivo.

---

### Task 1: Banco — migration 9001, baseline, MANIFEST, tipos, `lib/convexy/nicho.ts` e invariante

**Files:**
- Create: `supabase/migrations/20260925180901_9001_nicho_da_organizacao.sql`
- Modify: `supabase/baseline.sql` (inserir imediatamente antes da linha `-- ---- elegibilidade da IA por origem do lead (migration 0206) ----`, hoje ~`:17566`, que vem logo depois do bloco `-- ---- a moeda da organização deixa de ser presumida (migration 0208) ----`, ~`:17508`)
- Modify: `supabase/migrations/MANIFEST.md` (linha nova no fim do arquivo)
- Modify: `lib/database.types.ts:7238-7239`, `:7264-7265`, `:7290-7291` (dentro de `organizations: {`, `:7226`)
- Create: `lib/convexy/nicho.ts`
- Create: `tests/invariants/convexy-nicho.test.ts`
- Create: `tests/unit/convexy-nicho.test.ts`

**Interfaces:**
- Consumes: `public.organizations` (RLS `orgs_select`, `orgs_write_platform_admin`); `sql`, `seedGov`, `writeCountAs`, `GOV_ORG`, `GOV_ADMIN` (`tests/invariants/gov-helpers.ts`); `motivoDoErro` (`tests/invariants/psql-transporte.ts:63`); `PACOTES` (`lib/onboarding/pacotes-de-funil.ts`).
- Produces:
  - coluna `organizations.nicho text` + CHECK `organizations_nicho_valido`;
  - `lib/convexy/nicho.ts`: `export const NICHOS: readonly ["clinica","servicos","imobiliaria","curso","loja","generico"]`, `export type Nicho = (typeof NICHOS)[number]`, `export const NICHO_PADRAO: Nicho`, `export const nichoSchema: z.ZodEnum<…>`, `export function lerNicho(valor: unknown): Nicho`;
  - tipos `nicho: string | null` (`Row`) e `nicho?: string | null` (`Insert`/`Update`).

- [ ] **Step 1: Teste da regra do nicho (vermelho até o Step 2)**

Criar `tests/unit/convexy-nicho.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { NICHOS, NICHO_PADRAO, lerNicho, nichoSchema } from "@/lib/convexy/nicho";
import { PACOTES } from "@/lib/onboarding/pacotes-de-funil";

/**
 * Convexy — o nicho da organização (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.1).
 * Um vocabulário só: os ids dos pacotes de funil do onboarding. A CHECK do banco
 * é conferida contra o mesmo `NICHOS` em tests/invariants/convexy-nicho.test.ts.
 */
describe("nicho da organização", () => {
  it("os valores são os ids dos pacotes de funil do onboarding", () => {
    expect([...NICHOS].sort()).toEqual(PACOTES.map((p) => p.id).sort());
  });

  it("o padrão é o genérico, que também é o último recurso do onboarding", () => {
    expect(NICHO_PADRAO).toBe("generico");
  });

  it("nulo, desconhecido ou de outro tipo vira genérico, sem lançar", () => {
    for (const bruto of [null, undefined, "", "dentista", "Clinica", 3, { nicho: "clinica" }]) {
      expect(lerNicho(bruto)).toBe(NICHO_PADRAO);
    }
  });

  it("valor válido passa como veio", () => {
    for (const nicho of NICHOS) expect(lerNicho(nicho)).toBe(nicho);
  });

  it("o schema da rota recusa o que o banco recusa", () => {
    expect(nichoSchema.safeParse("dentista").success).toBe(false);
    expect(nichoSchema.safeParse(null).success).toBe(false);
    expect(nichoSchema.safeParse("clinica").success).toBe(true);
  });
});
```

- [ ] **Step 2: `lib/convexy/nicho.ts`**

```ts
import { z } from "zod";

/**
 * O TIPO DE NEGÓCIO de uma organização — Convexy (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.1).
 *
 * Os valores são os ids dos pacotes de funil do onboarding
 * (`lib/onboarding/pacotes-de-funil.ts`), e a CHECK `organizations_nicho_valido`
 * (migration 9001) aceita exatamente estes. Os dois lados são conferidos:
 * tests/unit/convexy-nicho.test.ts (TypeScript × pacotes) e
 * tests/invariants/convexy-nicho.test.ts (banco × TypeScript).
 *
 * Quem lê: o layout do app (`lerNicho`, para o menu e o vocabulário). Quem grava:
 * só o admin da plataforma (`app/api/v1/admin/tenants/[id]/nicho/route.ts`).
 */
export const NICHOS = ["clinica", "servicos", "imobiliaria", "curso", "loja", "generico"] as const;

export type Nicho = (typeof NICHOS)[number];

/** Coluna nula vale este. É o mesmo último recurso do onboarding. */
export const NICHO_PADRAO: Nicho = "generico";

export const nichoSchema = z.enum(NICHOS);

/**
 * O nicho em vigor. Nunca lança: roda no layout de toda tela do app, e um valor
 * que o banco não deveria ter (ou coluna ainda ausente) vira o genérico.
 */
export function lerNicho(valor: unknown): Nicho {
  const lido = nichoSchema.safeParse(valor);
  return lido.success ? lido.data : NICHO_PADRAO;
}
```

- [ ] **Step 3: Arquivo da migration**

Criar `supabase/migrations/20260925180901_9001_nicho_da_organizacao.sql` com exatamente:
```sql
-- Convexy (fork victorrabyfs/DeskcommCRM) — migration 9001: nicho da organização.
-- Spec: docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, seção 6.1.
-- Registro: CONVEXY.md, "Menu novo (v1.48.0-cvx.2)".
--
-- O MESMO SQL está no apêndice de supabase/baseline.sql, no bloco
-- "nicho da organização (migration 9001)", logo depois do bloco
-- "a moeda da organização deixa de ser presumida (migration 0208)". O kit
-- self-host aplica só o baseline; este arquivo é para quem aplica a cadeia pelo
-- Supabase CLI. tests/invariants/convexy-nicho.test.ts compara os dois, sem
-- comentários.
--
-- Faixa 9001+ do fork: nunca colide com a numeração do original. (A 9001 do
-- logo escuro foi aposentada na v1.48.0-cvx.1; CONVEXY.md, "Logo escuro".)

alter table public.organizations
  add column if not exists nicho text;

comment on column public.organizations.nicho is
  'Convexy (migration 9001): o tipo de negócio da organização, um de clinica, servicos, imobiliaria, curso, loja, generico (os ids de lib/onboarding/pacotes-de-funil.ts). Nulo vale generico. Escolhe os nomes do menu da Convexy (lib/convexy/menu/mapa.ts) e o vocabulário dos títulos (lib/convexy/vocabulario.ts). Escrito só pelo admin da plataforma, por app/api/v1/admin/tenants/[id]/nicho/route.ts.';

update public.organizations
   set nicho = null
 where nicho is not null
   and nicho not in ('clinica', 'servicos', 'imobiliaria', 'curso', 'loja', 'generico');

alter table public.organizations
  drop constraint if exists organizations_nicho_valido;
alter table public.organizations
  add constraint organizations_nicho_valido check (
    nicho is null
    or nicho in ('clinica', 'servicos', 'imobiliaria', 'curso', 'loja', 'generico')
  );

notify pgrst, 'reload schema';
```

- [ ] **Step 4: Bloco no apêndice do baseline**

Em `supabase/baseline.sql`, localizar a linha única:
```sql
-- ---- elegibilidade da IA por origem do lead (migration 0206) ----
```
e inserir **imediatamente antes** dela (a linha anterior é a última do `comment on column public.organizations.currency …` da 0208, seguida de uma linha em branco — manter essa linha em branco antes do bloco novo):
```sql
-- ---- nicho da organização (migration 9001) ----
--
-- Convexy (fork victorrabyfs/DeskcommCRM) — spec
-- docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, seção 6.1;
-- registro em CONVEXY.md, "Menu novo (v1.48.0-cvx.2)". O mesmo SQL está em
-- supabase/migrations/20260925180901_9001_nicho_da_organizacao.sql.
--
-- A organização ganha o tipo de negócio, que escolhe os nomes do menu da
-- Convexy e o vocabulário dos títulos. Coluna própria, e não chave em
-- `settings`: `settings` tem vários escritores que leem, alteram e regravam o
-- objeto inteiro, e uma escrita concorrente perderia o nicho. A RLS de
-- organizations já cobre (orgs_select lê; só orgs_write_platform_admin
-- escreve): sem policy, sem função.
--
-- POR QUE AQUI, e não no fim do arquivo: é a família da 0208 (coluna de
-- organizations com CHECK), e o fim é onde o original acrescenta os blocos
-- dele — o último comando é a conferência de módulos da 0340. Num conflito de
-- merge neste arquivo prevalece o lado do original, e este bloco é reaplicado
-- neste mesmo lugar.
--
-- Idempotente e auto-curativo: coluna, backfill do que estiver fora do
-- vocabulário e só então a regra (drop if exists + add) — o update.sh roda
-- SEM ON_ERROR_STOP.

alter table public.organizations
  add column if not exists nicho text;

comment on column public.organizations.nicho is
  'Convexy (migration 9001): o tipo de negócio da organização, um de clinica, servicos, imobiliaria, curso, loja, generico (os ids de lib/onboarding/pacotes-de-funil.ts). Nulo vale generico. Escolhe os nomes do menu da Convexy (lib/convexy/menu/mapa.ts) e o vocabulário dos títulos (lib/convexy/vocabulario.ts). Escrito só pelo admin da plataforma, por app/api/v1/admin/tenants/[id]/nicho/route.ts.';

update public.organizations
   set nicho = null
 where nicho is not null
   and nicho not in ('clinica', 'servicos', 'imobiliaria', 'curso', 'loja', 'generico');

alter table public.organizations
  drop constraint if exists organizations_nicho_valido;
alter table public.organizations
  add constraint organizations_nicho_valido check (
    nicho is null
    or nicho in ('clinica', 'servicos', 'imobiliaria', 'curso', 'loja', 'generico')
  );

notify pgrst, 'reload schema';

```
(A linha em branco final separa do rótulo da 0206.) Nenhum comentário do bloco pode conter a sequência quebra de linha + `-- ---- ` (o invariante recorta o bloco até o próximo rótulo).

- [ ] **Step 5: Linha no MANIFEST**

No **fim** de `supabase/migrations/MANIFEST.md` (depois da última linha da tabela; o arquivo é `merge=union`), acrescentar:
```markdown
| `20260925180901` | `9001_nicho_da_organizacao` | **Convexy (fork): a organização ganha o tipo de negócio.** `organizations.nicho text`, nulo = `generico`, CHECK `organizations_nicho_valido` com os ids dos pacotes de funil do onboarding (`clinica`, `servicos`, `imobiliaria`, `curso`, `loja`, `generico`), backfill antes da regra. Coluna e não chave de `settings` (vários escritores regravam o objeto inteiro). Escrito só pelo admin da plataforma; lido pelo layout do app para o menu da Convexy. Faixa 9001+ do fork. Bloco no apêndice logo depois do da 0208, não no fim. Registro: `CONVEXY.md`. Gate: `tests/invariants/convexy-nicho.test.ts` |
```

- [ ] **Step 6: Tipos à mão**

Em `lib/database.types.ts`, dentro de `      organizations: {` (`:7226`), acrescentar logo **depois** de `media_retention_days` e **antes** de `onboarded_at` nos três blocos (10 espaços de indentação, ordem alfabética do gerador):
- em `Row: {` (depois de `          media_retention_days: number`): `          nicho: string | null`
- em `Insert: {` (depois de `          media_retention_days?: number`): `          nicho?: string | null`
- em `Update: {` (depois de `          media_retention_days?: number`): `          nicho?: string | null`

(O arquivo já está atrás do schema em outras colunas — `interface_settings`, `crm_tasks` —; regenerá-lo reescreveria tudo e está fora do escopo. Decisão 13.)

- [ ] **Step 7: Invariante**

Criar `tests/invariants/convexy-nicho.test.ts`:
```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { NICHOS } from "@/lib/convexy/nicho";

import { GOV_ADMIN, GOV_ORG, seedGov, sql, writeCountAs } from "./gov-helpers";
import { motivoDoErro } from "./psql-transporte";

/**
 * Convexy — o nicho da organização (migration 9001), testemunhado pelo BANCO
 * (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.1 e 9;
 * molde: o invariante do logo escuro da v1.47.0-cvx.2). Registro: CONVEXY.md.
 *
 * O que só o banco prova: (1) a coluna existe depois do baseline, em install e
 * em update (o check `invariants` roda os dois); (2) a CHECK fala exatamente o
 * vocabulário de `NICHOS`; (3) o admin da organização não grava o nicho pela
 * REST — só o admin da plataforma escreve em organizations; (4) reaplicar o
 * bloco do baseline, que é o que o update.sh faz, limpa valor torto em vez de
 * quebrar.
 *
 * Cada caso de escrita roda numa transação desfeita. Da saída do psql só contam
 * as linhas marcadas com SONDA|.
 */

const RAIZ = process.cwd();
const BASELINE = readFileSync(join(RAIZ, "supabase", "baseline.sql"), "utf8");
const ROTULO = "-- ---- nicho da organização (migration 9001) ----";
const ROTULO_0208 = "-- ---- a moeda da organização deixa de ser presumida (migration 0208) ----";
const ROTULO_0206 = "-- ---- elegibilidade da IA por origem do lead (migration 0206) ----";
const PROXIMO_ROTULO = "\n-- ---- ";

const ARQUIVO_DA_MIGRATION = readdirSync(join(RAIZ, "supabase", "migrations")).find((f) =>
  /^\d{14}_9001_nicho_da_organizacao\.sql$/.test(f),
);

const MARCA = "SONDA|";

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

function nichoGravado(valorSql: string): string | undefined {
  const [gravado] = sondas(`
    begin;
    update public.organizations set nicho = ${valorSql} where id = '${GOV_ORG}';
    select '${MARCA}' || coalesce(nicho, 'NULO') from public.organizations where id = '${GOV_ORG}';
    rollback;`);
  return gravado;
}

beforeAll(() => {
  seedGov();
});

describe("a coluna nicho existe e fala o vocabulário do TypeScript", () => {
  it("`organizations.nicho` é text e anulável, depois do baseline", () => {
    const [coluna] = sondas(`
      select '${MARCA}' || data_type || '|' || is_nullable
        from information_schema.columns
       where table_schema = 'public' and table_name = 'organizations' and column_name = 'nicho';`);
    expect(coluna, "sem a coluna a leitura própria do layout cai no genérico e o menu perde o nicho").toBe("text|YES");
  });

  it("a CHECK aceita exatamente `NICHOS` (lib/convexy/nicho.ts)", () => {
    const [definicao] = sondas(`
      select '${MARCA}' || pg_get_constraintdef(oid)
        from pg_constraint
       where conname = 'organizations_nicho_valido'
         and conrelid = 'public.organizations'::regclass;`);
    expect(definicao, "a CHECK organizations_nicho_valido não existe").toBeDefined();
    const valores = [...definicao!.matchAll(/'([a-z]+)'::text/g)].map((m) => m[1]).sort();
    expect(valores).toEqual([...NICHOS].sort());
  });
});

describe("a forma vive no banco", () => {
  it("aceita todo nicho e o nulo (controle positivo)", () => {
    for (const nicho of NICHOS) expect(nichoGravado(`'${nicho}'`)).toBe(nicho);
    expect(nichoGravado("null")).toBe("NULO");
  });

  it("RECUSA valor fora do vocabulário, pelo nome da constraint", () => {
    for (const torto of ["dentista", "Clinica", "", "generico "]) {
      const erro = erroDo(`
        begin;
        update public.organizations set nicho = '${torto}' where id = '${GOV_ORG}';
        rollback;`);
      expect(erro, `o banco ACEITOU "${torto}"`).not.toBeNull();
      expect(erro).toContain("organizations_nicho_valido");
    }
  });

  it("o admin da ORGANIZAÇÃO não grava o nicho pela REST — só o admin da plataforma escreve", () => {
    expect(
      writeCountAs(GOV_ADMIN, `update public.organizations set nicho = 'clinica' where id = '${GOV_ORG}'`),
    ).toBe(0);
  });

  it("controle positivo: o admin da PLATAFORMA grava pela mesma REST (a recusa de cima não é acidente)", () => {
    const dono = "90010000-0000-4000-8000-0000000000aa";
    const [gravadas] = sondas(`
      begin;
      insert into auth.users (id, email) values ('${dono}', 'dono-9001@invariant.test');
      insert into public.platform_admins (user_id, granted_by, scope, mfa_required, reason)
        values ('${dono}', '${dono}', 'full', false, 'Convexy invariant fixture');
      set local role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${dono}","role":"authenticated"}', true);
      with w as (update public.organizations set nicho = 'clinica' where id = '${GOV_ORG}' returning 1)
      select '${MARCA}' || count(*)::text from w;
      rollback;`);
    expect(gravadas).toBe("1");
  });
});

describe("o bloco do baseline — reaplicável e igual à migration", () => {
  it("o bloco está logo depois do da 0208 e antes do da 0206", () => {
    const aqui = BASELINE.indexOf(ROTULO);
    expect(aqui, "rótulo da 9001 ausente").toBeGreaterThan(0);
    expect(aqui).toBeGreaterThan(BASELINE.indexOf(ROTULO_0208));
    expect(aqui).toBeLessThan(BASELINE.indexOf(ROTULO_0206));
  });

  it("o bloco é a migration, sem os comentários", () => {
    expect(ARQUIVO_DA_MIGRATION, "arquivo <timestamp>_9001_nicho_da_organizacao.sql ausente").toBeDefined();
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
      alter table public.organizations drop constraint organizations_nicho_valido;
      update public.organizations set nicho = 'lixo-de-antes' where id = '${GOV_ORG}';
      select '${MARCA}' || coalesce(nicho, 'NULO') from public.organizations where id = '${GOV_ORG}';
      select '${MARCA}' || count(*)::text from pg_constraint where conname = 'organizations_nicho_valido';
      rollback;`);
    expect(valor, "a simulação não gravou o valor torto — o caso de baixo mediria nada").toBe("lixo-de-antes");
    expect(regras).toBe("0");
  });

  it("COM o bloco, o valor torto vira NULL e a regra volta — o que o update.sh faz", () => {
    const [valor, regras] = sondas(`
      begin;
      alter table public.organizations drop constraint organizations_nicho_valido;
      update public.organizations set nicho = 'lixo-de-antes' where id = '${GOV_ORG}';
      ${blocoDa9001()}
      select '${MARCA}' || coalesce(nicho, 'NULO') from public.organizations where id = '${GOV_ORG}';
      select '${MARCA}' || count(*)::text from pg_constraint where conname = 'organizations_nicho_valido';
      rollback;`);
    expect(valor, "reaplicar o baseline deixou o valor fora do vocabulário").toBe("NULO");
    expect(regras, "reaplicar o baseline não recriou a regra").toBe("1");
  });
});
```

- [ ] **Step 8: Conferir o texto (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git grep -n "nicho da organização (migration 9001)" -- supabase/baseline.sql
git grep -c "add constraint organizations_nicho_valido" -- supabase/baseline.sql
grep -n "9001_nicho_da_organizacao" supabase/migrations/MANIFEST.md
git grep -n "nicho" -- lib/database.types.ts
ls supabase/migrations | grep -oE '_[0-9]{4}_' | tr -d _ | sort -n | uniq -d
git add supabase/migrations/20260925180901_9001_nicho_da_organizacao.sql supabase/baseline.sql supabase/migrations/MANIFEST.md lib/database.types.ts lib/convexy/nicho.ts tests/invariants/convexy-nicho.test.ts tests/unit/convexy-nicho.test.ts
git commit -m "feat(convexy): coluna organizations.nicho — migration 9001 (spec 6.1)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: o rótulo aparece uma vez; `add constraint organizations_nicho_valido` conta `1`; uma linha no MANIFEST; três linhas `nicho` em `database.types.ts`; a lista de `NNNN` duplicados sai **vazia**.

- [ ] **Step 9: PARAR e pedir ok ao Victor — empurrar a branch e abrir o PR em rascunho**

O CI do fork só roda em `pull_request`. Mostrar ao Victor o `git log --oneline origin/main..HEAD` e pedir o "sim". Depois:
```bash
gh workflow list --all -R victorrabyfs/DeskcommCRM --json path,state --jq '.[]|[.path,.state]|@tsv'
git push -u origin convexy/menu-novo
gh pr create -R victorrabyfs/DeskcommCRM --draft --base main --head convexy/menu-novo \
  --title "Convexy 1.48.0-cvx.2: menu novo" \
  --body "Menu novo da Convexy atrás do módulo opcional menu_convexy (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, revisão 4; plano docs/superpowers/plans/2026-09-25-convexy-menu-novo.md). Migration 9001 (organizations.nicho). Com o módulo desligado, o app é o do original. Destino (DoD 18): instalação do fork. Rascunho: as tasks entram uma a uma e o CI prova cada uma.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
Expected: `ci.yml`, `e2e.yml`, `perf.yml`, `publish-image.yml` em `active`; a URL do PR rascunho.

- [ ] **Step 10: Ler o resultado no CI (o PR já existe; o push acima já disparou o CI)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml"
ARQUIVOS="convexy-nicho|manifest-x-migrations|manifest-cita-caminho|baseline-reaplicavel|baseline-constraint-reconstruida|check-do-baseline-nao-diverge|apendice-do-baseline"
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
Expected: `ci.yml exit=0`; o rodapé do `verify` sem `failed` e sem linha `Errors`; `tests/unit/convexy-nicho.test.ts` e `tests/invariants/convexy-nicho.test.ts` (11 casos, nas passadas `test:db` e `test:db:update` de cada perna de `invariants-majors`) sem `×`; as cercas de baseline/MANIFEST sem `×`; o `checar:colisao-de-migration` sem colisão. Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.

---

### Task 2: Módulo `menu_convexy`, a constante do módulo e o Início no catálogo

**Files:**
- Create: `lib/convexy/modulo.ts`
- Modify: `lib/instalacao/modulos.ts:42` e `:46-52`
- Modify: `app/admin/(protected)/sistema/_form.tsx:185-200` (`MODULOS_NA_TELA`)
- Modify: `lib/navigation/catalogo.ts:915-916` (fim do `NAV_CATALOG`)
- Modify: `lib/i18n/dicionario.ts:858` (bloco "Navegação") e depois de `:2544` (bloco dos módulos opcionais)
- Modify: `lib/navigation/interface.ts:21-28` (`SIMPLIFICADA`), `:116-122` (`interfaceTemDestino`), `:123-130` (`homeDaInterface`)
- Modify: `tests/unit/interface-por-empresa.test.ts:47`
- Create: `tests/unit/convexy-menu-modulo.test.tsx`

**Interfaces:**
- Consumes: `NAV_CATALOG` (`lib/navigation/catalogo.ts`); `searchable`, `sidebarGroups` (`lib/navigation/registry.ts`); `destinosDaInterface`, `homeDaInterface`, `interfaceTemDestino`, `interfaceSettingsSchema` (`lib/navigation/interface.ts`); `FormularioDeModulos`.
- Produces: `lib/convexy/modulo.ts`: `export const MODULO_DO_MENU: "menu_convexy"`; `ModuloOpcional` inclui `"menu_convexy"`; `CHAVE_DO_MODULO.menu_convexy === "MODULO_MENU_CONVEXY"`; entrada `{ href: "/app", label: "Início", icon: "Gauge", group: "atendimento", modulo: "menu_convexy" }` no fim do `NAV_CATALOG` (`NavDestinationId` passa a incluir `"/app"`); `homeDaInterface` nunca devolve `"/app"`; `interfaceTemDestino` não conta o Início.

- [ ] **Step 1: Teste (vermelho até os Steps 3–9)**

Criar `tests/unit/convexy-menu-modulo.test.tsx`:
```tsx
import { readFileSync } from "node:fs";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/settings/updateModuloDaInstalacao", () => ({ updateModuloDaInstalacao: vi.fn() }));
vi.mock("@/app/actions/settings/updateComportamento", () => ({ updateComportamento: vi.fn() }));

import { FormularioDeModulos } from "@/app/admin/(protected)/sistema/_form";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
import { CHAVE_DO_MODULO, MODULOS_OPCIONAIS } from "@/lib/instalacao/modulos";
import { NAV_CATALOG } from "@/lib/navigation/catalogo";
import {
  destinosDaInterface,
  homeDaInterface,
  interfaceSettingsSchema,
  interfaceTemDestino,
} from "@/lib/navigation/interface";
import { searchable, sidebarGroups } from "@/lib/navigation/registry";

/**
 * Convexy — o menu novo é um MÓDULO OPCIONAL da instalação (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 5 e 3.6).
 * Registro: CONVEXY.md, "Menu novo".
 */
describe("o módulo menu_convexy", () => {
  it("é um módulo opcional com a chave no formato da platform_config", () => {
    expect(MODULOS_OPCIONAIS).toContain(MODULO_DO_MENU);
    expect(CHAVE_DO_MODULO.menu_convexy).toBe("MODULO_MENU_CONVEXY");
    expect(CHAVE_DO_MODULO.menu_convexy).toMatch(/^[A-Z][A-Z0-9_]{2,63}$/);
  });

  it("tem interruptor em /admin/sistema", () => {
    render(<FormularioDeModulos ligados={["menu_convexy"]} />);
    expect(screen.getByRole("switch", { name: "Menu da Convexy" })).toHaveAttribute("aria-checked", "true");
  });

  it("todo módulo opcional tem interruptor — a lista da tela não é derivada da lista de módulos", () => {
    const fonte = readFileSync("app/admin/(protected)/sistema/_form.tsx", "utf8");
    for (const modulo of MODULOS_OPCIONAIS) expect(fonte).toContain(`modulo: "${modulo}"`);
  });
});

describe("o Início no catálogo do original", () => {
  it("é uma entrada do módulo, fora do menu clássico, com um ícone que o registro já conhece", () => {
    const inicio = NAV_CATALOG.find((d) => d.href === "/app");
    expect(inicio).toMatchObject({ label: "Início", icon: "Gauge", group: "atendimento", modulo: "menu_convexy" });
    expect(inicio && "sidebar" in inicio).toBe(false);
  });

  it("some por completo com o módulo desligado — menu clássico e busca", () => {
    expect(searchable(false, "admin", undefined, []).map((d) => d.href)).not.toContain("/app");
    expect(searchable(false, "admin", undefined, ["menu_convexy"]).map((d) => d.href)).toContain("/app");
    const noClassico = sidebarGroups(false, "admin", { preset: "completa", destinos: ["/app", "/app/inbox"] }, [])
      .flatMap((g) => g.items.map((i) => i.href));
    expect(noClassico).not.toContain("/app");
  });

  it("entra no perfil Simplificada — a recepção não fica sem o Início", () => {
    const hrefs = destinosDaInterface({ preset: "simplificada" }, false, "agent", ["menu_convexy"]).map((d) => d.href);
    expect(hrefs).toContain("/app");
    expect(hrefs).toContain("/app/inbox");
  });

  it("o redirect de /app nunca volta para /app — nem com o Início como única área escolhida", () => {
    const soInicio = interfaceSettingsSchema.parse({ preset: "completa", destinos: ["/app"] });
    expect(homeDaInterface(soInicio, false, "agent")).toBe("/app/settings/profile");
    expect(homeDaInterface({ preset: "completa", destinos: ["/app", "/app/tasks"] }, false, "agent")).toBe("/app/tasks");
    expect(homeDaInterface(null, false, "agent")).toBe("/app/inbox");
  });

  it("o Início não é área de trabalho: sozinho ele não resume nada", () => {
    expect(interfaceTemDestino({ preset: "completa", destinos: ["/app"] }, "agent")).toBe(false);
    expect(interfaceTemDestino({ preset: "completa", destinos: ["/app", "/app/tasks"] }, "agent")).toBe(true);
  });
});
```

- [ ] **Step 2: Fase vermelha no CI (Review Focus 1)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
git add tests/unit/convexy-menu-modulo.test.tsx
git commit -m "test(convexy): módulo menu_convexy e o Início sem laço — vermelho antes (spec 3.6, 5)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow ci.yml --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "ci.yml run=$id exit=$?"
gh run view "$id" -R victorrabyfs/DeskcommCRM --log-failed > "$S/vermelho-rf1-$sha.log"
grep -aE "convexy-menu-modulo" "$S/vermelho-rf1-$sha.log" | head -10
```
Expected: `exit` diferente de 0 **por causa deste arquivo** (import de `@/lib/convexy/modulo` ausente e os casos do Início); anotar o id do run no relatório da task. Qualquer outro arquivo vermelho: parar e investigar.

- [ ] **Step 3: `lib/convexy/modulo.ts`**

```ts
import type { ModuloOpcional } from "@/lib/instalacao/modulos";

/**
 * O MÓDULO OPCIONAL da instalação que liga o menu da Convexy (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 5). Linha
 * `MODULO_MENU_CONVEXY` em `platform_config`; ligado e desligado em
 * `/admin/sistema`. Um lugar só para o nome: layout, página do tenant, editor de
 * interface, hubs e Início o leem daqui.
 */
export const MODULO_DO_MENU = "menu_convexy" as const satisfies ModuloOpcional;
```

- [ ] **Step 4: `lib/instalacao/modulos.ts`**

Trocar a linha `:42`:
```ts
export const MODULOS_OPCIONAIS = ["banco_externo", "fluxos_atendimento"] as const;
```
por:
```ts
// Convexy: `menu_convexy` é o menu novo da Convexy, desligado por padrão como os
// outros. CONVEXY.md, "Menu novo".
export const MODULOS_OPCIONAIS = ["banco_externo", "fluxos_atendimento", "menu_convexy"] as const;
```
E, em `CHAVE_DO_MODULO`, depois da linha `  fluxos_atendimento: "MODULO_FLUXOS_DE_ATENDIMENTO",`:
```ts
  // Convexy: o menu novo da Convexy. A chave cabe na CHECK de formato da 0341,
  // sem migration. CONVEXY.md, "Menu novo".
  menu_convexy: "MODULO_MENU_CONVEXY",
```

- [ ] **Step 5: Interruptor em `/admin/sistema`**

Em `app/admin/(protected)/sistema/_form.tsx`, dentro de `MODULOS_NA_TELA`, depois do objeto de `fluxos_atendimento` (a linha `  },` que precede `];`), acrescentar:
```tsx
  // Convexy: o menu novo da Convexy; rótulo e descrição com espanhol no
  // dicionário, como os módulos do original. CONVEXY.md, "Menu novo".
  {
    modulo: "menu_convexy",
    id: "modulo-menu-convexy",
    rotulo: "Menu da Convexy",
    descricao:
      "Ligado, o app mostra o menu da Convexy: poucas portas grandes, a lista de telas de cada porta ao lado, o Início com o resumo do dia e os nomes pelo tipo de negócio de cada empresa. Desligado, volta o menu original na hora, sem perder nenhuma escolha de interface.",
  },
```

- [ ] **Step 6: A entrada do Início no catálogo**

Em `lib/navigation/catalogo.ts`, trocar o fim do array:
```ts
    modulo: "banco_externo",
  },
] as const satisfies readonly NavMetadata[];
```
por:
```ts
    modulo: "banco_externo",
  },
  {
    // Convexy: o Início do menu da Convexy (spec
    // docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.6 e 7).
    // Existe só com o módulo `menu_convexy` ligado; no menu clássico some pelo
    // módulo. SEM `sidebar`: o menu da Convexy o posiciona explicitamente. `Gauge`
    // é um ícone que o registro já conhece (o menu novo desenha a casa). No FIM
    // do array para não mudar a ordem do que já existe. CONVEXY.md, "Menu novo".
    href: "/app",
    label: "Início",
    description: "O resumo do dia: conversas esperando, a agenda de hoje e as suas tarefas.",
    icon: "Gauge",
    group: "atendimento",
    modulo: "menu_convexy",
  },
] as const satisfies readonly NavMetadata[];
```

- [ ] **Step 7: As três linhas do dicionário**

Em `lib/i18n/dicionario.ts`, logo depois da linha `  Buscar: { es: "Buscar" },` (fim do bloco "Navegação"):
```ts
  // Convexy: a descrição do Início do catálogo — o rótulo "Início" já existe
  // mais abaixo. CONVEXY.md, "Menu novo".
  "O resumo do dia: conversas esperando, a agenda de hoje e as suas tarefas.": { es: "El resumen del día: conversaciones en espera, la agenda de hoy y tus tareas." },
```
E logo depois do fechamento `  },` da entrada que começa com `  "Ligado, cada empresa pode conectar o banco de outro sistema` (bloco dos módulos opcionais, `:2542-2544`):
```ts
  // Convexy: o módulo do menu novo em /admin/sistema. CONVEXY.md, "Menu novo".
  "Menu da Convexy": { es: "Menú de Convexy" },
  "Ligado, o app mostra o menu da Convexy: poucas portas grandes, a lista de telas de cada porta ao lado, o Início com o resumo do dia e os nomes pelo tipo de negócio de cada empresa. Desligado, volta o menu original na hora, sem perder nenhuma escolha de interface.": {
    es: "Si está activado, la app muestra el menú de Convexy: pocas puertas grandes, la lista de pantallas de cada puerta al lado, el Inicio con el resumen del día y los nombres según el tipo de negocio de cada empresa. Si está desactivado, vuelve el menú original al instante, sin perder ninguna elección de interfaz.",
  },
```

- [ ] **Step 8: `lib/navigation/interface.ts`**

Em `SIMPLIFICADA`, trocar:
```ts
  "/app/tasks",
  "/app/connections",
];
```
por:
```ts
  "/app/tasks",
  "/app/connections",
  // Convexy: o Início entra no perfil da recepção (spec 3.6). No menu clássico
  // ele some pelo módulo. CONVEXY.md, "Menu novo".
  "/app",
];
```
Em `interfaceTemDestino`, trocar:
```ts
  return destinosDaInterface(settings, platform, role).some((d) => !essencial(d, role, platform));
```
por:
```ts
  // Convexy: o Início só resume as outras telas — sozinho não é área de trabalho.
  // CONVEXY.md, "Menu novo".
  return destinosDaInterface(settings, platform, role).some(
    (d) => !essencial(d, role, platform) && d.href !== "/app",
  );
```
Em `homeDaInterface`, trocar:
```ts
    visible.find((d) => !essencial(d, role, platform))?.href ??
```
por:
```ts
    // Convexy: `/app` é o próprio Início — nunca o destino do redirect de `/app`
    // (seria laço com o módulo desligado). CONVEXY.md, "Menu novo".
    visible.find((d) => !essencial(d, role, platform) && d.href !== "/app")?.href ??
```

- [ ] **Step 9: `tests/unit/interface-por-empresa.test.ts:47`**

Trocar:
```ts
  sidebarGroups(false, role, settings as InterfaceSettings | undefined)
```
por:
```ts
  // Convexy: com os módulos da casca (`?? []`, como o Sidebar.tsx:48), a porta
  // de um módulo desligado não entra na conta. CONVEXY.md, "Menu novo".
  sidebarGroups(false, role, settings as InterfaceSettings | undefined, [])
```

- [ ] **Step 10: Conferir (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git grep -n "menu_convexy" -- lib/instalacao/modulos.ts lib/navigation/catalogo.ts lib/convexy/modulo.ts "app/admin/(protected)/sistema/_form.tsx"
git grep -c '^  Início:' -- lib/i18n/dicionario.ts
git diff --stat
git add lib/convexy/modulo.ts lib/instalacao/modulos.ts "app/admin/(protected)/sistema/_form.tsx" lib/navigation/catalogo.ts lib/i18n/dicionario.ts lib/navigation/interface.ts tests/unit/interface-por-empresa.test.ts
git commit -m "feat(convexy): módulo menu_convexy e o Início no catálogo (spec 3.6, 5)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: quatro arquivos citam `menu_convexy`; `dicionario.ts` continua com **uma** chave `Início`; o diff toca só os sete arquivos da task.

- [ ] **Step 11: Empurrar e ler o CI**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml"
ARQUIVOS="convexy-menu-modulo|navegacao-completude|navegacao-registry|interface-por-(empresa|vinculo)|i18n-catalogo-do-menu|i18n-espanhol-cobre-a-tela|sidebar-grupos|updateModuloDaInstalacao"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
Expected: `ci.yml exit=0`; rodapé sem `failed`/`Errors`; `convexy-menu-modulo` (8 casos) e os gates do original listados sem `×` — em especial `interface-por-empresa` (a contagem do menu lateral segue 15), `i18n-catalogo-do-menu` (descrição com espanhol) e `navegacao-completude` (arquivo intocado). Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.

---


### Task 3: Nicho no admin — `textos.ts`, rota `GET`/`PATCH …/nicho`, auditoria, campo "Tipo de negócio"

**Files:**
- Create: `lib/convexy/textos.ts`
- Create: `app/api/v1/admin/tenants/[id]/nicho/route.ts`
- Create: `components/convexy/CampoDoNicho.tsx`
- Modify: `lib/audit/actions.ts:880-893` (fim de `AUDIT_ACTIONS`)
- Modify: `app/admin/(protected)/tenants/[id]/page.tsx:1` (imports) e `:9` (o `return`)
- Modify: `supabase/migrations/MANIFEST.md` (a linha da 9001, que agora pode citar a rota)
- Create: `tests/unit/convexy-nicho-rota.test.ts`
- Create: `tests/unit/convexy-nicho-campo.test.tsx`

**Interfaces:**
- Consumes: `requirePlatformAdmin`, `requireSupportWrite`, `ok`/`fail`, `audit`, `createAdminClient`, `moduloLigado` (`lib/instalacao/modulos.ts`), `apiClient.get`/`patch`, `useIdioma`, `traduzir`, `PACOTES` (`lib/onboarding/pacotes-de-funil.ts`), `nichoSchema`/`lerNicho`/`Nicho` (Task 1), `MODULO_DO_MENU` (Task 2).
- Produces:
  - `lib/convexy/textos.ts`: `export interface TextoConvexy { readonly pt: string; readonly es: string }`; `export type Texto = string | TextoConvexy` (`string` = chave do dicionário do original); `export function texto(valor: Texto, idioma: Idioma): string`; `export type RotuloPorNicho = Texto | { readonly porNicho: { readonly generico: Texto } & Partial<Record<Exclude<Nicho, "generico">, Texto>> }`; `export function rotuloPorNicho(rotulo: RotuloPorNicho, nicho: Nicho, idioma: Idioma): string`; `export const TEXTOS`; `export const ROTULO_DE_CONTATOS`, `ROTULO_DO_FUNIL: RotuloPorNicho`.
  - `GET /api/v1/admin/tenants/[id]/nicho` → `200 { data: { id, nicho: Nicho } }` | `400` | `403` | `404`.
  - `PATCH /api/v1/admin/tenants/[id]/nicho` body `{ nicho: Nicho }` → `200 { data: { id, nicho } }` | `400 validation_failed` | `403 forbidden` | `404 not_found` | `409 state_conflict` | `500 internal_error`.
  - `AuditAction` inclui `"tenant.nicho_changed"`.
  - `export function CampoDoNicho({ organizationId }: { organizationId: string })`.

- [ ] **Step 1: Testes (vermelhos até os Steps 2–7)**

Criar `tests/unit/convexy-nicho-rota.test.ts`:
```ts
// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — GET e PATCH /api/v1/admin/tenants/[id]/nicho (spec 6.1). Na ordem da
 * spec: admin de plataforma (com MFA), guarda de suporte ANTES do efeito, Zod
 * (id e corpo). Grava só se o valor no banco ainda é o lido (409 senão) e audita
 * `tenant.nicho_changed` com o antes e o depois.
 */
const ORG = "22222222-2222-4222-8222-222222222222";

const deps = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  requireSupportWrite: vi.fn(),
  audit: vi.fn(),
  linha: null as { id: string; slug: string; nicho: string | null } | null,
  gravadas: [] as Array<{ id: string }>,
  cadeias: [] as Array<Array<[string, ...unknown[]]>>,
  ordem: [] as string[],
}));

vi.mock("@/lib/auth/requirePlatformAdmin", () => ({ requirePlatformAdmin: deps.requirePlatformAdmin }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: deps.requireSupportWrite }));
vi.mock("@/lib/audit", () => ({ audit: deps.audit }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const registro: Array<[string, ...unknown[]]> = [];
      deps.cadeias.push(registro);
      const cadeia: Record<string, unknown> = {};
      for (const metodo of ["select", "eq", "is", "update"]) {
        cadeia[metodo] = (...args: unknown[]) => {
          registro.push([metodo, ...args]);
          if (metodo === "update") deps.ordem.push("update");
          return cadeia;
        };
      }
      cadeia.maybeSingle = async () => ({ data: deps.linha, error: null });
      cadeia.then = (resolver: (valor: unknown) => unknown) =>
        Promise.resolve({ data: deps.gravadas, error: null }).then(resolver);
      return cadeia;
    },
  }),
}));

import { GET, PATCH } from "@/app/api/v1/admin/tenants/[id]/nicho/route";

function pedido(corpo: unknown, id = ORG): NextRequest {
  return new NextRequest(`http://localhost/api/v1/admin/tenants/${id}/nicho`, {
    method: "PATCH",
    body: JSON.stringify(corpo),
    headers: { "content-type": "application/json" },
  });
}
const contexto = (id = ORG) => ({ params: Promise.resolve({ id }) });
const atualizacao = () => deps.cadeias.find((c) => c.some(([m]) => m === "update")) ?? [];

beforeEach(() => {
  vi.clearAllMocks();
  deps.cadeias.length = 0;
  deps.ordem.length = 0;
  deps.linha = { id: ORG, slug: "org", nicho: null };
  deps.gravadas = [{ id: ORG }];
  deps.requirePlatformAdmin.mockImplementation(async () => {
    deps.ordem.push("admin");
    return { user: { id: "dono-1" } };
  });
  deps.requireSupportWrite.mockImplementation(async () => {
    deps.ordem.push("suporte");
    return null;
  });
});

describe("PATCH /api/v1/admin/tenants/[id]/nicho", () => {
  it("grava só se o nicho ainda é o lido, audita antes e depois, guardas antes do efeito", async () => {
    const res = await PATCH(pedido({ nicho: "clinica" }), contexto());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: ORG, nicho: "clinica" } });
    expect(deps.ordem).toEqual(["admin", "suporte", "update"]);
    expect(deps.requireSupportWrite).toHaveBeenCalledWith(ORG);
    expect(atualizacao()).toEqual([
      ["update", expect.objectContaining({ nicho: "clinica" })],
      ["eq", "id", ORG],
      ["is", "nicho", null],
      ["select", "id"],
    ]);
    expect(deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "tenant.nicho_changed",
        actorUserId: "dono-1",
        actingAsPlatformAdmin: true,
        organizationId: ORG,
        resourceType: "organization",
        resourceId: ORG,
        metadata: { tenant_slug: "org", de: null, para: "clinica" },
      }),
    );
  });

  it("com nicho anterior, a condição é o valor lido", async () => {
    deps.linha = { id: ORG, slug: "org", nicho: "servicos" };
    await PATCH(pedido({ nicho: "clinica" }), contexto());
    expect(atualizacao()).toContainEqual(["eq", "nicho", "servicos"]);
  });

  it("o valor mudou entre a leitura e a escrita: 409, sem auditoria", async () => {
    deps.gravadas = [];
    const res = await PATCH(pedido({ nicho: "clinica" }), contexto());
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("state_conflict");
    expect(deps.audit).not.toHaveBeenCalled();
  });

  it("quem não é admin de plataforma recebe 403 e nada é lido nem gravado", async () => {
    deps.requirePlatformAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const res = await PATCH(pedido({ nicho: "clinica" }), contexto());
    expect(res.status).toBe(403);
    expect(deps.cadeias).toEqual([]);
    expect(deps.requireSupportWrite).not.toHaveBeenCalled();
  });

  it("acompanhamento somente leitura barra antes do efeito", async () => {
    deps.requireSupportWrite.mockResolvedValue(
      Response.json({ error: { code: "forbidden", message: "somente leitura" } }, { status: 403 }),
    );
    const res = await PATCH(pedido({ nicho: "clinica" }), contexto());
    expect(res.status).toBe(403);
    expect(deps.cadeias).toEqual([]);
  });

  it("id que não é uuid é 400, antes de abrir o client admin", async () => {
    const res = await PATCH(pedido({ nicho: "clinica" }, "nao-e-uuid"), contexto("nao-e-uuid"));
    expect(res.status).toBe(400);
    expect(deps.cadeias).toEqual([]);
  });

  it("nicho fora do vocabulário, ausente ou com campo a mais é 400", async () => {
    for (const corpo of [{ nicho: "dentista" }, {}, { nicho: "clinica", outro: 1 }]) {
      expect((await PATCH(pedido(corpo), contexto())).status).toBe(400);
    }
    expect(deps.ordem).not.toContain("update");
  });

  it("organização que não existe é 404", async () => {
    deps.linha = null;
    expect((await PATCH(pedido({ nicho: "clinica" }), contexto())).status).toBe(404);
    expect(deps.ordem).not.toContain("update");
  });

  it("o mesmo valor não grava nem audita — não houve mudança", async () => {
    deps.linha = { id: ORG, slug: "org", nicho: "servicos" };
    expect((await PATCH(pedido({ nicho: "servicos" }), contexto())).status).toBe(200);
    expect(deps.ordem).not.toContain("update");
    expect(deps.audit).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/admin/tenants/[id]/nicho", () => {
  const leitura = (id = ORG) => GET(new NextRequest(`http://localhost/api/v1/admin/tenants/${id}/nicho`), contexto(id));

  it("devolve o nicho em vigor (nulo vale genérico)", async () => {
    const res = await leitura();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: ORG, nicho: "generico" } });
  });

  it("só admin de plataforma, e só com id válido", async () => {
    deps.requirePlatformAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    expect((await leitura()).status).toBe(403);
    expect((await leitura("nao-e-uuid")).status).toBe(400);
    deps.linha = null;
    expect((await leitura()).status).toBe(404);
  });
});
```

Criar `tests/unit/convexy-nicho-campo.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "33333333-3333-4333-8333-333333333333";

const deps = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(async () => ({ data: {} })),
  moduloLigado: vi.fn(async () => false),
}));

vi.mock("@/lib/api/client", () => ({ apiClient: { get: deps.get, patch: deps.patch } }));
vi.mock("@/lib/instalacao/modulos", () => ({ moduloLigado: deps.moduloLigado }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/app/admin/(protected)/tenants/[id]/_client", () => ({ TenantOverviewClient: () => null }));

import TenantDetailPage from "@/app/admin/(protected)/tenants/[id]/page";
import { CampoDoNicho } from "@/components/convexy/CampoDoNicho";

function comConsulta(arvore: ReactElement) {
  return render(<QueryClientProvider client={new QueryClient()}>{arvore}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.get.mockResolvedValue({ data: { id: ORG, nicho: "servicos" } });
});

describe("Tipo de negócio no admin", () => {
  it("lê o nicho pela rota própria e grava a escolha pela mesma rota", async () => {
    comConsulta(<CampoDoNicho organizationId={ORG} />);
    const campo = await screen.findByLabelText("Tipo de negócio");
    expect(deps.get).toHaveBeenCalledWith(`/api/v1/admin/tenants/${ORG}/nicho`);
    expect(campo).toHaveValue("servicos");
    expect(screen.getByRole("option", { name: "Clínica, consultório ou salão" })).toHaveValue("clinica");
    fireEvent.change(campo, { target: { value: "clinica" } });
    await waitFor(() =>
      expect(deps.patch).toHaveBeenCalledWith(`/api/v1/admin/tenants/${ORG}/nicho`, { nicho: "clinica" }),
    );
    await waitFor(() => expect(deps.get).toHaveBeenCalledTimes(2));
  });

  it("a gravação recusada mostra o aviso", async () => {
    deps.patch.mockRejectedValueOnce(new Error("409"));
    comConsulta(<CampoDoNicho organizationId={ORG} />);
    fireEvent.change(await screen.findByLabelText("Tipo de negócio"), { target: { value: "loja" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Não deu para salvar. Tente de novo em instantes.");
  });

  it("a página só o mostra com o menu da Convexy ligado", async () => {
    deps.moduloLigado.mockResolvedValueOnce(false);
    const { unmount } = comConsulta(await TenantDetailPage({ params: Promise.resolve({ id: ORG }) }));
    expect(screen.queryByLabelText("Tipo de negócio")).toBeNull();
    unmount();
    deps.moduloLigado.mockResolvedValueOnce(true);
    comConsulta(await TenantDetailPage({ params: Promise.resolve({ id: ORG }) }));
    expect(await screen.findByLabelText("Tipo de negócio")).toBeInTheDocument();
    expect(deps.moduloLigado).toHaveBeenLastCalledWith({}, "menu_convexy");
  });
});
```

- [ ] **Step 2: `lib/convexy/textos.ts`**

```ts
import type { Nicho } from "@/lib/convexy/nicho";
import { traduzir } from "@/lib/i18n/dicionario";
import type { Idioma } from "@/lib/i18n/idiomas";

/**
 * Os TEXTOS da Convexy (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 8).
 *
 * Duas formas de folha, e a escolha não é estética:
 *  - `string`: CHAVE do dicionário do original (`lib/i18n/dicionario.ts`) — o texto
 *    já existe lá, com espanhol, e repeti-lo aqui seria uma segunda cópia;
 *  - `{ pt, es }`: texto NOVO da Convexy (o dicionário do original não ganha linha).
 * A tela desenha por variável — `texto(TEXTOS.x, idioma)` —, nunca por literal.
 * `tests/unit/convexy-menu-textos.test.ts` cobra o espanhol das duas formas.
 */
export interface TextoConvexy {
  readonly pt: string;
  readonly es: string;
}

export type Texto = string | TextoConvexy;

/** O texto no idioma da interface. Idioma sem coluna própria cai no português, como `traduzir`. */
export function texto(valor: Texto, idioma: Idioma): string {
  if (typeof valor === "string") return traduzir(valor, idioma);
  return idioma === "es" ? valor.es : valor.pt;
}

/** Um rótulo igual em todo nicho, ou um por nicho (o genérico é obrigatório e vale para quem não tem rótulo próprio). */
export type RotuloPorNicho =
  | Texto
  | {
      readonly porNicho: { readonly generico: Texto } & Partial<Record<Exclude<Nicho, "generico">, Texto>>;
    };

export function rotuloPorNicho(rotulo: RotuloPorNicho, nicho: Nicho, idioma: Idioma): string {
  if (typeof rotulo === "object" && "porNicho" in rotulo) {
    return texto(rotulo.porNicho[nicho] ?? rotulo.porNicho.generico, idioma);
  }
  return texto(rotulo, idioma);
}

export const TEXTOS = {
  portas: {
    inicio: "Início",
    conversas: "Conversas",
    agenda: "Agenda",
    contatos: "Contatos",
    pacientes: { pt: "Pacientes", es: "Pacientes" },
    funil: "Funil",
    funilDePacientes: { pt: "Funil de pacientes", es: "Embudo de pacientes" },
    funilDeVendas: "Funil de vendas",
    tarefas: "Tarefas",
    ia: { pt: "Assistente de IA", es: "Asistente de IA" },
    resultados: { pt: "Resultados", es: "Resultados" },
    configuracoes: "Configurações",
  },
  grupos: {
    envios: { pt: "Envios", es: "Envíos" },
    orientacoes: "Orientações instaladas",
    acompanhar: "Acompanhar",
    avancado: { pt: "Avançado", es: "Avanzado" },
    mais: { pt: "Mais", es: "Más" },
    canais: { pt: "Canais e integrações", es: "Canales e integraciones" },
    organizacao: "Organização",
    conta: { pt: "Minha conta", es: "Mi cuenta" },
    sistema: "Sistema",
  },
  itens: {
    semResposta: "Sem resposta",
    pedidosDaIa: { pt: "Pedidos da IA", es: "Pedidos de la IA" },
    assistentes: { pt: "Assistentes", es: "Asistentes" },
    anuncios: { pt: "Anúncios", es: "Anuncios" },
    atualizacao: "Atualização do sistema",
    atualizacaoDescricao: {
      pt: "A versão instalada no servidor e a atualização para a próxima, pelo botão.",
      es: "La versión instalada en el servidor y la actualización a la siguiente, con el botón.",
    },
  },
  menu: {
    fechar: "Fechar",
    voltar: { pt: "‹ Voltar", es: "‹ Volver" },
  },
  interface: {
    todasDaPorta: { pt: "Todas as áreas de", es: "Todas las áreas de" },
  },
  inicio: {
    atualizadoAs: "Atualizado às",
    falhou: {
      pt: "Não deu para carregar agora. A página tenta de novo quando você voltar a ela.",
      es: "No se pudo cargar ahora. La página lo intenta de nuevo cuando vuelvas a ella.",
    },
    conversas: {
      titulo: { pt: "Conversas esperando", es: "Conversaciones en espera" },
      vazio: { pt: "Ninguém esperando agora.", es: "Nadie esperando ahora." },
      atalho: { pt: "Abrir as conversas", es: "Abrir las conversaciones" },
    },
    agenda: {
      titulo: { pt: "Agenda de hoje", es: "Agenda de hoy" },
      vazio: { pt: "Nada marcado para hoje.", es: "Nada agendado para hoy." },
      atalho: { pt: "Abrir a agenda", es: "Abrir la agenda" },
    },
    tarefas: {
      titulo: { pt: "Minhas tarefas", es: "Mis tareas" },
      vazio: { pt: "Nenhuma tarefa vencida ou para hoje.", es: "Ninguna tarea vencida o para hoy." },
      atalho: { pt: "Abrir as tarefas", es: "Abrir las tareas" },
      atrasada: { pt: "Atrasada", es: "Atrasada" },
      hoje: "Hoje",
    },
  },
  nicho: {
    tipoDeNegocio: { pt: "Tipo de negócio", es: "Tipo de negocio" },
    ajuda: {
      pt: "Escolhe os nomes do menu desta empresa: numa clínica, Contatos vira Pacientes.",
      es: "Elige los nombres del menú de esta empresa: en una clínica, Contactos pasa a ser Pacientes.",
    },
    erro: "Não deu para salvar. Tente de novo em instantes.",
  },
} as const;

/** Porta Contatos e o item `/app/contacts` (spec 6.2). */
export const ROTULO_DE_CONTATOS: RotuloPorNicho = {
  porNicho: { generico: TEXTOS.portas.contatos, clinica: TEXTOS.portas.pacientes },
};

/** Porta Funil, o item `/app/kanban` e o título "Funis" no vocabulário (spec 6.2 e 6.3). */
export const ROTULO_DO_FUNIL: RotuloPorNicho = {
  porNicho: {
    generico: TEXTOS.portas.funil,
    clinica: TEXTOS.portas.funilDePacientes,
    servicos: TEXTOS.portas.funilDeVendas,
  },
};
```

- [ ] **Step 3: `tenant.nicho_changed` no fim de `AUDIT_ACTIONS`**

Em `lib/audit/actions.ts`, trocar:
```ts
  "contact.unblocked",
] as const;
```
por:
```ts
  "contact.unblocked",
  // Convexy: o admin da plataforma troca o tipo de negócio da organização
  // (PATCH /api/v1/admin/tenants/[id]/nicho), com o antes e o depois no
  // metadata. CONVEXY.md, "Menu novo".
  "tenant.nicho_changed",
] as const;
```

- [ ] **Step 4: A rota**

Criar `app/api/v1/admin/tenants/[id]/nicho/route.ts`:
```ts
/**
 * GET e PATCH /api/v1/admin/tenants/[id]/nicho — Convexy (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.1).
 *
 * O tipo de negócio da organização, que escolhe os nomes do menu da Convexy. Só
 * o admin da plataforma (com MFA), no molde de `admin/tenants/[id]/suspend`. A
 * leitura é própria (e não um campo a mais no GET do tenant) para uma coluna
 * ausente nunca derrubar o painel do tenant.
 *
 * PATCH, na ordem: `requirePlatformAdmin()`, `requireSupportWrite(id)` antes do
 * efeito, Zod do id e do corpo. Grava SÓ se o valor no banco ainda é o que foi
 * lido (senão 409: duas abas não se sobrescrevem em silêncio) e audita
 * `tenant.nicho_changed` com o antes e o depois; o mesmo valor não grava.
 */
import { randomUUID } from "node:crypto";

import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { lerNicho, nichoSchema } from "@/lib/convexy/nicho";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();
const bodySchema = z.object({ nicho: nichoSchema }).strict();

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Contexto) {
  const requestId = randomUUID();
  const { id: tenantId } = await params;
  try {
    await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }
  if (!idSchema.safeParse(tenantId).success) {
    return fail("validation_failed", "Invalid tenant id", 400, { requestId });
  }
  const { data: org, error } = await createAdminClient()
    .from("organizations")
    .select("id, nicho")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) return fail("internal_error", "Failed to read tenant", 500, { requestId });
  if (!org) return fail("not_found", "Tenant not found", 404, { requestId });
  return ok({ id: tenantId, nicho: lerNicho(org.nicho) }, { requestId });
}

export async function PATCH(req: NextRequest, { params }: Contexto) {
  const requestId = randomUUID();
  const { id: tenantId } = await params;

  let adminCtx: Awaited<ReturnType<typeof requirePlatformAdmin>>;
  try {
    adminCtx = await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }

  const supportDenied = await requireSupportWrite(tenantId);
  if (supportDenied) return supportDenied;

  if (!idSchema.safeParse(tenantId).success) {
    return fail("validation_failed", "Invalid tenant id", 400, { requestId });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return fail("validation_failed", "Invalid request body", 400, { requestId });
  }

  const admin = createAdminClient();
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, slug, nicho")
    .eq("id", tenantId)
    .maybeSingle();
  if (orgError || !org) {
    return fail("not_found", "Tenant not found", 404, { requestId });
  }

  const antes = (org.nicho as string | null) ?? null;
  if (antes === body.nicho) {
    return ok({ id: tenantId, nicho: body.nicho }, { requestId });
  }

  let condicional = admin
    .from("organizations")
    .update({ nicho: body.nicho, updated_at: new Date().toISOString() })
    .eq("id", tenantId);
  condicional = antes === null ? condicional.is("nicho", null) : condicional.eq("nicho", antes);
  const { data: gravadas, error: updateError } = await condicional.select("id");
  if (updateError) {
    return fail("internal_error", "Failed to update tenant", 500, { requestId });
  }
  if (!gravadas || gravadas.length === 0) {
    return fail("state_conflict", "Tenant nicho changed meanwhile", 409, { requestId });
  }

  void audit({
    action: "tenant.nicho_changed",
    actorUserId: adminCtx.user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    organizationId: tenantId,
    resourceType: "organization",
    resourceId: tenantId,
    requestId,
    metadata: { tenant_slug: org.slug, de: antes, para: body.nicho },
  });

  return ok({ id: tenantId, nicho: body.nicho }, { requestId });
}
```

- [ ] **Step 5: O campo**

Criar `components/convexy/CampoDoNicho.tsx`:
```tsx
"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState, useTransition } from "react";

import { apiClient } from "@/lib/api/client";
import { lerNicho, type Nicho } from "@/lib/convexy/nicho";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { PACOTES } from "@/lib/onboarding/pacotes-de-funil";

/**
 * "Tipo de negócio" da organização — Convexy (spec 6.1). Só o admin da
 * plataforma chega aqui (`/admin`), e a página só o desenha com o menu da
 * Convexy ligado. Lê e grava pela rota própria `…/nicho`. As opções são os
 * pacotes de funil do onboarding — os mesmos ids da CHECK e o mesmo jeito de
 * o dono reconhecer o próprio negócio.
 */
export function CampoDoNicho({ organizationId }: { organizationId: string }) {
  const id = useId();
  const idioma = useIdioma();
  const consultas = useQueryClient();
  const caminho = `/api/v1/admin/tenants/${organizationId}/nicho`;
  const chave = ["admin", "tenant", organizationId, "nicho"] as const;
  const { data } = useQuery({
    queryKey: chave,
    queryFn: async () => (await apiClient.get<{ data: { id: string; nicho: Nicho } }>(caminho)).data,
    staleTime: 60_000,
  });
  const [falhou, setFalhou] = useState(false);
  const [salvando, startTransition] = useTransition();
  if (!data) return null;

  function escolher(nicho: Nicho) {
    setFalhou(false);
    startTransition(async () => {
      try {
        await apiClient.patch(caminho, { nicho });
      } catch {
        setFalhou(true);
      }
      await consultas.invalidateQueries({ queryKey: chave });
    });
  }

  return (
    <section className="mt-6 space-y-2 rounded-lg border bg-card p-5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {texto(TEXTOS.nicho.tipoDeNegocio, idioma)}
      </label>
      <p className="text-xs text-muted-foreground">{texto(TEXTOS.nicho.ajuda, idioma)}</p>
      <select
        id={id}
        value={data.nicho}
        disabled={salvando}
        onChange={(e) => escolher(lerNicho(e.target.value))}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        {PACOTES.map((pacote) => (
          <option key={pacote.id} value={pacote.id}>
            {texto(pacote.comoSeApresenta, idioma)}
          </option>
        ))}
      </select>
      {falhou ? (
        <p role="alert" className="text-sm text-destructive">
          {texto(TEXTOS.nicho.erro, idioma)}
        </p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 6: A página do tenant (inserção)**

Em `app/admin/(protected)/tenants/[id]/page.tsx`, trocar:
```tsx
import { TenantOverviewClient } from "./_client";
```
por:
```tsx
import { TenantOverviewClient } from "./_client";
// Convexy: "Tipo de negócio" com o menu da Convexy ligado. CONVEXY.md, "Menu novo".
import { CampoDoNicho } from "@/components/convexy/CampoDoNicho";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
import { moduloLigado } from "@/lib/instalacao/modulos";
import { createAdminClient } from "@/lib/supabase/admin";
```
e trocar:
```tsx
  return <TenantOverviewClient id={id} />;
```
por:
```tsx
  // Convexy: a decisão do módulo é do servidor; o cartão vem depois do painel do
  // original, sem prop nova nele. CONVEXY.md, "Menu novo".
  const menuConvexy = await moduloLigado(createAdminClient(), MODULO_DO_MENU);
  return (
    <>
      <TenantOverviewClient id={id} />
      {menuConvexy ? <CampoDoNicho organizationId={id} /> : null}
    </>
  );
```

- [ ] **Step 7: O MANIFEST passa a citar a rota**

Em `supabase/migrations/MANIFEST.md`, na linha `9001_nicho_da_organizacao`, trocar:
```markdown
Escrito só pelo admin da plataforma; lido pelo layout do app para o menu da Convexy.
```
por:
```markdown
Escrito só pelo admin da plataforma (`app/api/v1/admin/tenants/[id]/nicho/route.ts`, auditado como `tenant.nicho_changed`); lido pelo layout do app para o menu da Convexy.
```

- [ ] **Step 8: Conferir (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git grep -n "tenant.nicho_changed" -- lib app supabase/migrations/MANIFEST.md
git grep -n "requireSupportWrite(" -- "app/api/v1/admin/tenants/[id]/nicho/route.ts"
git add lib/convexy/textos.ts "app/api/v1/admin/tenants/[id]/nicho/route.ts" components/convexy/CampoDoNicho.tsx lib/audit/actions.ts "app/admin/(protected)/tenants/[id]/page.tsx" supabase/migrations/MANIFEST.md tests/unit/convexy-nicho-rota.test.ts tests/unit/convexy-nicho-campo.test.tsx
git commit -m "feat(convexy): nicho pelo admin da plataforma, gravação condicional e auditada (spec 6.1)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: o código de auditoria em `actions.ts`, na rota e no MANIFEST; a rota chama `requireSupportWrite(`.

- [ ] **Step 9: Empurrar e ler o CI (`ci.yml` e `perf.yml`: a página do tenant é Server Component)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml perf.yml"
ARQUIVOS="convexy-nicho-(rota|campo)|suporte-cobertura-de-efeitos|audit-lista-do-painel|manifest-cita-caminho|TenantOverview|tenants/\[id\]/route"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
Expected: `ci.yml exit=0` e `perf.yml exit=0` (o `build-and-size` compila a página do tenant e a rota nova); rodapé sem `failed`/`Errors`; `convexy-nicho-rota` (11 casos) e `convexy-nicho-campo` (3) sem `×`; `suporte-cobertura-de-efeitos` (a rota nova declara a guarda), `audit-lista-do-painel-e-derivada` e `manifest-cita-caminho-que-existe` (o caminho citado agora existe) sem `×`. Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.

---


### Task 4: O modelo puro do menu — `mapa.ts`, `dono.ts`, `montar.ts` (e os dois ícones no barril)

**Files:**
- Modify: `lib/ui/icons.ts:25` (depois de `House,`)
- Create: `lib/convexy/menu/mapa.ts`
- Create: `lib/convexy/menu/dono.ts`
- Create: `lib/convexy/menu/montar.ts`
- Create: `tests/unit/convexy-menu-mapa.test.ts`
- Create: `tests/unit/convexy-menu-dono.test.ts`
- Create: `tests/unit/convexy-menu-montar.test.ts`
- Create: `tests/unit/convexy-menu-textos.test.ts`

**Interfaces:**
- Consumes: `NAV_CATALOG`, `NAV_GROUPS`, `NavGroupId`, `NavMetadata` (`lib/navigation/catalogo.ts`); `searchable`, `NavDestination` (`lib/navigation/registry.ts`); `InterfaceSettings` (`lib/navigation/interface.ts`); `traduzir` (`lib/i18n/dicionario.ts`); `Idioma` (`lib/i18n/idiomas.ts`); `Role` (`lib/auth/types.ts`); `ModuloOpcional`; `TEXTOS`, `texto`, `rotuloPorNicho`, `RotuloPorNicho`, `Texto`, `ROTULO_DE_CONTATOS`, `ROTULO_DO_FUNIL` (Task 3); `Nicho` (Task 1); `MODULO_DO_MENU` (Task 2); `DICIONARIO` (teste).
- Produces (nomes que as Tasks 5–10 usam):
  - `mapa.ts`: `HREF_DO_INICIO`, `HREF_DA_ATUALIZACAO`, `type PortaId`, `type GrupoId`, `interface DefinicaoDeGrupo`, `interface DefinicaoDePorta`, `PORTAS`, `PADRAO_POR_GRUPO`, `PORTA_DO_HUB`, `PORTA_DAS_ORIENTACOES`, `DONOS_EXTRAS`, `ROTULOS_DOS_ITENS`, `posicoesPorPadrao(entradas): Array<{ href: string; porta: PortaId; grupo: GrupoId }>`, `organizarPorPortas<T>(entradas: readonly T[])` (T com `href`, `group`, `sidebar?`; devolve a estrutura inteira, com vazios). `posicaoPadrao` é privada.
  - `dono.ts`: `donoDoCaminho(caminho: string, hrefs: readonly string[]): string | null`; `ativoNoCaminho(caminho, portas, orientacoes?): { porta: PortaId; href: string } | null`.
  - `montar.ts`: `interface ItemDoMenu { href; rotulo; descricao; healthDot }` (item da sub-sidebar é só texto), `interface PortaDoMenu { id; rotulo; Icone; rodape; grupos; itens; direta; healthDot }`, `interface EntradaDoMenu { visiveis; atualizacao; nicho; idioma }`, `rotuloDoItem(href, rotuloDoCatalogo, nicho, idioma): string`, `montarMenu(entrada: EntradaDoMenu): PortaDoMenu[]`, `destinoDoHub(grupo: NavGroupId, contexto: { isPlatformAdmin; role; interfaceSettings?; modulosLigados }): string | null`.

- [ ] **Step 1: Testes (vermelhos até os Steps 2–5)**

Criar `tests/unit/convexy-menu-mapa.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import {
  HREF_DA_ATUALIZACAO,
  PADRAO_POR_GRUPO,
  PORTAS,
  PORTA_DO_HUB,
  organizarPorPortas,
  posicoesPorPadrao,
} from "@/lib/convexy/menu/mapa";
import { NAV_CATALOG, NAV_GROUPS, type NavGroupId, type NavMetadata } from "@/lib/navigation/catalogo";

/**
 * Convexy — o mapa do menu (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md,
 * 3.1 e 3.2). O menu é uma PROJEÇÃO do `NAV_CATALOG` do original: tela nova do
 * original entra sozinha pela porta do `group` dela, e o CI só reprova o que não
 * dá para decidir sozinho — um `group` novo.
 */
const CATALOGO = NAV_CATALOG as readonly NavMetadata[];
const ORGANIZADO = organizarPorPortas(CATALOGO);
const EXPLICITOS = PORTAS.flatMap((p) => p.grupos.flatMap((g) => g.hrefs));
const PADRAO = posicoesPorPadrao(CATALOGO);

function posicaoDe(href: string) {
  for (const { porta, grupos } of ORGANIZADO) {
    for (const { grupo, itens } of grupos) {
      if (itens.some((i) => i.href === href)) return { porta, grupo };
    }
  }
  return null;
}

describe("cobertura", () => {
  it("todo href do catálogo cai numa porta, exatamente uma vez", () => {
    const vistos = ORGANIZADO.flatMap((p) => p.grupos.flatMap((g) => g.itens.map((i) => i.href)));
    expect([...vistos].sort()).toEqual(CATALOGO.map((d) => d.href).sort());
  });

  it("todo href explícito existe no catálogo — a tela de atualização é a única de fora", () => {
    const catalogo = new Set(CATALOGO.map((d) => d.href));
    expect(EXPLICITOS.filter((h) => h !== HREF_DA_ATUALIZACAO && !catalogo.has(h))).toEqual([]);
  });

  it("nenhum endereço aparece em duas posições (nenhum botão divide endereço)", () => {
    expect(new Set(EXPLICITOS).size).toBe(EXPLICITOS.length);
  });

  it("as portas são as da spec, nesta ordem, e só Configurações mora no rodapé", () => {
    expect(PORTAS.map((p) => p.id)).toEqual([
      "inicio", "conversas", "agenda", "contatos", "funil", "tarefas", "ia", "resultados", "configuracoes",
    ]);
    expect(PORTAS.filter((p) => p.rodape).map((p) => p.id)).toEqual(["configuracoes"]);
  });
});

describe("posição padrão pelo group do original", () => {
  it("todo group do original tem porta padrão", () => {
    for (const grupo of NAV_GROUPS) expect(PADRAO_POR_GRUPO[grupo.id], grupo.id).toBeDefined();
  });

  it("um group NOVO no original reprova, dizendo o que decidir", () => {
    expect(() =>
      organizarPorPortas([{ href: "/app/tela-nova", group: "grupo_novo" as NavGroupId }]),
    ).toThrow(/PADRAO_POR_GRUPO/);
  });

  it("tela nova de uso diário entra no grupo principal da porta do group dela", () => {
    const [ia] = organizarPorPortas([{ href: "/app/ai/nova", group: "ia", sidebar: true }]).filter(
      (p) => p.grupos.some((g) => g.itens.length > 0),
    );
    expect(ia?.porta.id).toBe("ia");
    expect(ia?.grupos.find((g) => g.itens.length > 0)?.grupo.id).toBe("principal");
  });

  it("tela nova sem uso diário entra no grupo secundário da tabela", () => {
    const [ia] = organizarPorPortas([{ href: "/app/ai/nova", group: "ia" }]).filter((p) =>
      p.grupos.some((g) => g.itens.length > 0),
    );
    expect(ia?.grupos.find((g) => g.itens.length > 0)?.grupo.id).toBe("avancado");
  });

  it("lista as posições por padrão, sem reprovar — o relatório de quem revisa o merge do original", () => {
    // `info` e não `log`: é relatório de propósito, lido no log do CI pela linha marcada.
    console.info(
      `[convexy-menu] posições por padrão (${PADRAO.length}): ${
        PADRAO.map((p) => `${p.href} → ${p.porta}/${p.grupo}`).join(", ") || "nenhuma"
      }`,
    );
    for (const p of PADRAO) expect(CATALOGO.some((d) => d.href === p.href)).toBe(true);
  });

  it("todo hub do original tem porta — hub novo sem porta reprova", () => {
    for (const grupo of NAV_GROUPS) {
      if (grupo.hub) expect(PORTA_DO_HUB[grupo.id], grupo.hub.href).toBeDefined();
    }
  });
});

describe("o uso diário do original fica no primeiro grupo da porta", () => {
  it("nenhuma entrada com sidebar: true cai em grupo secundário", () => {
    const erradas = CATALOGO.filter((d) => d.sidebar && posicaoDe(d.href)?.grupo.secundario).map(
      (d) => d.href,
    );
    expect(erradas).toEqual([]);
  });

  it("Roteadores, Provedores e Tipos de agendamento estão no grupo principal", () => {
    for (const href of ["/app/ai/routers", "/app/ai/providers", "/app/settings/tenant/agenda"]) {
      expect(posicaoDe(href)?.grupo.id, href).toBe("principal");
    }
  });

  it("Canais e integrações, com Conexões, abre Configurações", () => {
    const configuracoes = PORTAS.find((p) => p.id === "configuracoes");
    expect(configuracoes?.grupos[0]?.id).toBe("canais");
    expect(configuracoes?.grupos[0]?.hrefs[0]).toBe("/app/connections");
  });
});
```

Criar `tests/unit/convexy-menu-dono.test.ts`:
```ts
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ativoNoCaminho, donoDoCaminho } from "@/lib/convexy/menu/dono";
import { PORTAS, posicoesPorPadrao } from "@/lib/convexy/menu/mapa";
import { NAV_CATALOG, NAV_GROUPS, type NavMetadata } from "@/lib/navigation/catalogo";

/**
 * Convexy — uma tela, um dono (spec 3.3). Cada item é dono do seu endereço e do
 * que fica abaixo, exceto o que estiver abaixo de um item mais específico. As
 * páginas de detalhe fora da árvore são declaradas em `DONOS_EXTRAS`.
 */
/**
 * As páginas de `app/app`, como endereços. `_pasta` não é rota; `(grupo)` é
 * transparente (não entra no endereço); `@slot` é rota paralela, não página do
 * menu; `[id]` vira um exemplo concreto.
 */
function paginas(dir: string, prefixo = "/app"): string[] {
  const rotas: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.isFile() && entrada.name === "page.tsx") rotas.push(prefixo);
    if (!entrada.isDirectory() || entrada.name.startsWith("_") || entrada.name.startsWith("@")) continue;
    const transparente = entrada.name.startsWith("(") && entrada.name.endsWith(")");
    const segmento = entrada.name.startsWith("[") ? "exemplo" : entrada.name;
    rotas.push(...paginas(path.join(dir, entrada.name), transparente ? prefixo : `${prefixo}/${segmento}`));
  }
  return rotas;
}

const PAGINAS = paginas(path.join(process.cwd(), "app", "app")).sort();
const HREFS = [
  ...PORTAS.flatMap((p) => p.grupos.flatMap((g) => g.hrefs)),
  ...posicoesPorPadrao(NAV_CATALOG as readonly NavMetadata[]).map((p) => p.href),
];
const HUBS = new Set(NAV_GROUPS.flatMap((g) => (g.hub ? [g.hub.href] : [])));

describe("cada page.tsx de app/app tem um dono", () => {
  it("varreu as páginas de verdade (guarda de vacuidade)", () => {
    expect(PAGINAS.length).toBeGreaterThan(60);
    expect(PAGINAS).toContain("/app/ai/agents/exemplo");
  });

  it("toda página tem dono — só os quatro hubs não, e eles vão à porta deles", () => {
    const semDono = PAGINAS.filter((rota) => !HUBS.has(rota) && donoDoCaminho(rota, HREFS) === null);
    expect(semDono, `Página sem dono no menu da Convexy — dê uma posição em lib/convexy/menu/mapa.ts:\n  ${semDono.join("\n  ")}`).toEqual([]);
    for (const hub of HUBS) expect(donoDoCaminho(hub, HREFS), hub).toBeNull();
  });

  it("o Início é dono só de /app, nunca do que está abaixo", () => {
    expect(donoDoCaminho("/app", HREFS)).toBe("/app");
    expect(donoDoCaminho("/app/crm", HREFS)).toBeNull();
  });
});

describe("os pares que a spec nomeia resolvem certo", () => {
  it.each([
    ["/app/ai/agents/new", "/app/ai/agents"],
    ["/app/ai/agents/exemplo", "/app/ai/agents"],
    ["/app/settings/tenant/agenda", "/app/settings/tenant/agenda"],
    ["/app/settings/tenant", "/app/settings/tenant"],
    ["/app/settings/tenant/pipelines", "/app/settings/tenant/pipelines"],
    ["/app/ai/cases/avisos", "/app/ai/cases/avisos"],
    ["/app/ai/cases/exemplo", "/app/ai/cases"],
    ["/app/leads/exemplo", "/app/kanban"],
    ["/app/pipelines/exemplo", "/app/kanban"],
    ["/app/settings/canal-oficial", "/app/connections"],
    ["/app/settings/templates", "/app/connections"],
    ["/app/settings/tenant/whatsapp", "/app/connections"],
    ["/app/team/invite", "/app/team"],
    ["/app/ai/followups/enrollments/exemplo", "/app/ai/followups"],
    ["/app/settings/atualizacao", "/app/settings/atualizacao"],
  ])("%s é de %s", (caminho, dono) => {
    expect(donoDoCaminho(caminho, HREFS)).toBe(dono);
  });

  it("dono extra só vale com o dono visível — escondido, a tela não acende nada", () => {
    expect(donoDoCaminho("/app/leads/exemplo", ["/app/inbox"])).toBeNull();
  });
});

describe("ativoNoCaminho", () => {
  const portas = [
    { id: "contatos" as const, itens: [{ href: "/app/contacts" }] },
    { id: "configuracoes" as const, itens: [{ href: "/app/extensions" }] },
  ];

  it("devolve a porta que contém o dono", () => {
    expect(ativoNoCaminho("/app/contacts/exemplo", portas)).toEqual({ porta: "contatos", href: "/app/contacts" });
  });

  it("uma orientação carregada é o item mais específico, e é de Contatos", () => {
    expect(ativoNoCaminho("/app/extensions/abc", portas)).toEqual({ porta: "configuracoes", href: "/app/extensions" });
    expect(ativoNoCaminho("/app/extensions/abc", portas, ["/app/extensions/abc"])).toEqual({
      porta: "contatos",
      href: "/app/extensions/abc",
    });
  });

  it("sem dono visível, nada fica ativo", () => {
    expect(ativoNoCaminho("/app/crm", portas)).toBeNull();
  });
});
```

Criar `tests/unit/convexy-menu-montar.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { HREF_DA_ATUALIZACAO } from "@/lib/convexy/menu/mapa";
import { montarMenu, type EntradaDoMenu, type PortaDoMenu } from "@/lib/convexy/menu/montar";
import { searchable } from "@/lib/navigation/registry";

/**
 * Convexy — `montarMenu` (spec 3.5): a visibilidade NÃO é decidida aqui. O menu
 * recebe `searchable()` — papel, interface por vínculo, módulos e admin de
 * plataforma — e só agrupa, rotula e poda.
 */
const LIGADO = ["menu_convexy"] as const;

function montar(visiveis: EntradaDoMenu["visiveis"], extra: Partial<EntradaDoMenu> = {}): PortaDoMenu[] {
  return montarMenu({ visiveis, atualizacao: false, nicho: "generico", idioma: "pt-BR", ...extra });
}
const porta = (portas: PortaDoMenu[], id: PortaDoMenu["id"]) => portas.find((p) => p.id === id);
const hrefs = (p: PortaDoMenu | undefined) => p?.itens.map((i) => i.href) ?? [];

describe("filtra por searchable()", () => {
  it("perfil Simplificada da recepção: Início, portas diretas e Configurações", () => {
    const portas = montar(searchable(false, "agent", { preset: "simplificada" }, LIGADO));
    expect(portas.map((p) => p.id)).toEqual([
      "inicio", "conversas", "agenda", "contatos", "funil", "tarefas", "configuracoes",
    ]);
    expect(portas.filter((p) => p.direta).map((p) => p.id)).toEqual([
      "inicio", "conversas", "agenda", "contatos", "funil", "tarefas",
    ]);
  });

  it("destinos escolhidos: porta com dois itens tem sub; porta vazia some", () => {
    const portas = montar(
      searchable(false, "manager", { preset: "completa", destinos: ["/app/inbox", "/app/radar"] }, LIGADO),
    );
    expect(portas.map((p) => p.id)).toEqual(["conversas", "configuracoes"]);
    expect(porta(portas, "conversas")?.direta).toBe(false);
    expect(hrefs(porta(portas, "conversas"))).toEqual(["/app/inbox", "/app/radar"]);
  });

  it("viewer não vê o que o papel não alcança", () => {
    const portas = montar(searchable(false, "viewer", undefined, LIGADO));
    expect(hrefs(porta(portas, "ia"))).toEqual(["/app/ai/inbox", "/app/ai/proposals"]);
    expect(hrefs(porta(portas, "conversas"))).not.toContain("/app/calls");
  });

  it("módulo desligado: sem o Início (a entrada é do módulo)", () => {
    expect(porta(montar(searchable(false, "admin", undefined, [])), "inicio")).toBeUndefined();
  });

  it("porta com um item só vira direta", () => {
    const portas = montar(searchable(false, "agent", { preset: "completa", destinos: ["/app/tasks"] }, LIGADO));
    expect(porta(portas, "tarefas")).toMatchObject({ direta: true, itens: [{ href: "/app/tasks" }] });
  });
});

describe("atualização do sistema: só admin de plataforma fora do suporte", () => {
  it("aparece em Configurações › Sistema quando quem chama diz que pode", () => {
    const portas = montar(searchable(true, "admin", undefined, LIGADO), { atualizacao: true });
    const configuracoes = porta(portas, "configuracoes");
    expect(configuracoes?.grupos.at(-1)).toMatchObject({ id: "sistema", itens: [{ href: HREF_DA_ATUALIZACAO }] });
  });

  it("admin da organização, ou admin de plataforma em suporte, não vê", () => {
    // Quem chama passa `user.is_platform_admin && !user.support` nos dois lugares.
    const portas = montar(searchable(false, "admin", undefined, LIGADO), { atualizacao: false });
    expect(hrefs(porta(portas, "configuracoes"))).not.toContain(HREF_DA_ATUALIZACAO);
  });
});

describe("saúde da conexão", () => {
  it("sobe do item Conexões para a porta Configurações", () => {
    const configuracoes = porta(montar(searchable(false, "admin", undefined, LIGADO)), "configuracoes");
    expect(configuracoes?.healthDot).toBe(true);
    expect(configuracoes?.itens.find((i) => i.href === "/app/connections")?.healthDot).toBe(true);
  });

  it("quem não vê Conexões não vê o ponto", () => {
    expect(porta(montar(searchable(false, "agent", undefined, LIGADO)), "configuracoes")?.healthDot).toBe(false);
  });
});

describe("nomes", () => {
  it.each([
    ["clinica", "Pacientes", "Funil de pacientes"],
    ["servicos", "Contatos", "Funil de vendas"],
    ["generico", "Contatos", "Funil"],
    ["loja", "Contatos", "Funil"],
  ] as const)("nicho %s: %s e %s", (nicho, contatos, funil) => {
    const portas = montar(searchable(false, "admin", undefined, LIGADO), { nicho });
    expect(porta(portas, "contatos")?.rotulo).toBe(contatos);
    expect(porta(portas, "contatos")?.itens[0]).toMatchObject({ href: "/app/contacts", rotulo: contatos });
    expect(porta(portas, "funil")?.rotulo).toBe(funil);
  });

  it("os dois Meta Ads ficam distintos: Anúncios em Resultados, Meta Ads nas integrações", () => {
    const portas = montar(searchable(false, "admin", undefined, LIGADO));
    expect(porta(portas, "resultados")?.itens.find((i) => i.href === "/app/ads/meta")?.rotulo).toBe("Anúncios");
    expect(porta(portas, "configuracoes")?.itens.find((i) => i.href === "/app/settings/meta-ads")?.rotulo).toBe("Meta Ads");
  });

  it("item sem rótulo próprio usa o do catálogo, traduzido; a descrição também", () => {
    const portas = montar(searchable(false, "admin", undefined, LIGADO), { idioma: "es" });
    const templates = porta(portas, "conversas")?.itens.find((i) => i.href === "/app/templates");
    expect(templates?.rotulo).toBe("Respuestas rápidas");
    expect(porta(portas, "contatos")?.rotulo).toBe("Contactos");
    expect(porta(portas, "funil")?.rotulo).toBe("Embudo");
    expect(templates?.descricao.length).toBeGreaterThan(0);
  });
});
```

Criar `tests/unit/convexy-menu-textos.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { PORTAS, ROTULOS_DOS_ITENS } from "@/lib/convexy/menu/mapa";
import { TEXTOS } from "@/lib/convexy/textos";
import { DICIONARIO } from "@/lib/i18n/dicionario";

/**
 * Convexy — todo texto tem espanhol (spec 8). Folha `{ pt, es }` é texto novo da
 * Convexy e traz as duas colunas; folha `string` é chave do dicionário do original
 * e precisa de `es` lá. Textos em `lib/convexy/textos.ts`, rótulos por nicho no
 * `mapa.ts`; aqui os dois são lidos como dado, folha por folha.
 */
function folhas(valor: unknown, caminho: string, achadas: Array<{ caminho: string; pt: string; es: string }> = []) {
  if (typeof valor === "string") {
    achadas.push({ caminho, pt: valor, es: DICIONARIO[valor]?.es ?? "" });
  } else if (valor && typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    if (typeof objeto.pt === "string" && typeof objeto.es === "string") {
      achadas.push({ caminho, pt: objeto.pt, es: objeto.es });
      return achadas;
    }
    for (const [chave, filho] of Object.entries(objeto)) folhas(filho, `${caminho}.${chave}`, achadas);
  }
  return achadas;
}

const DOS_TEXTOS = folhas(TEXTOS, "TEXTOS");
const DO_MAPA = [
  ...PORTAS.flatMap((p) => [
    ...folhas(p.rotulo, `porta:${p.id}`),
    ...p.grupos.flatMap((g) => (g.rotulo ? folhas(g.rotulo, `grupo:${p.id}/${g.id}`) : [])),
  ]),
  ...[...ROTULOS_DOS_ITENS.entries()].flatMap(([href, rotulo]) => folhas(rotulo, `item:${href}`)),
];

describe("espanhol nos textos da Convexy", () => {
  it("leu os textos de verdade (guarda de vacuidade)", () => {
    expect(DOS_TEXTOS.length).toBeGreaterThan(40);
    expect(DO_MAPA.length).toBeGreaterThan(20);
  });

  it("todo texto de textos.ts tem pt e es não vazios", () => {
    const buracos = DOS_TEXTOS.filter((f) => !f.pt.trim() || !f.es.trim()).map((f) => f.caminho);
    expect(buracos).toEqual([]);
  });

  it("todo rótulo do mapa — portas, grupos e rótulos por nicho — tem pt e es", () => {
    const buracos = DO_MAPA.filter((f) => !f.pt.trim() || !f.es.trim()).map((f) => f.caminho);
    expect(buracos).toEqual([]);
  });
});
```

- [ ] **Step 2: `CheckSquare` e `GearSix` no barril**

Em `lib/ui/icons.ts`, trocar:
```ts
  Gear,
  House,
```
por:
```ts
  Gear,
  House,
  // Convexy: portas Tarefas e Configurações do menu novo (a engrenagem é a
  // GearSix, que não lembra o sol/lua do tema). CONVEXY.md, "Menu novo".
  CheckSquare,
  GearSix,
```

- [ ] **Step 3: `lib/convexy/menu/mapa.ts`**

```ts
import type { NavGroupId } from "@/lib/navigation/catalogo";
import type { NavDestination } from "@/lib/navigation/registry";
import {
  CalendarBlank,
  ChartBar,
  ChatCircle,
  CheckSquare,
  Funnel,
  GearSix,
  House,
  Robot,
  Users,
} from "@/lib/ui/icons";
import {
  ROTULO_DE_CONTATOS,
  ROTULO_DO_FUNIL,
  TEXTOS,
  type RotuloPorNicho,
  type Texto,
} from "@/lib/convexy/textos";

/**
 * O MAPA DO MENU DA CONVEXY (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3).
 *
 * O menu é uma PROJEÇÃO do `NAV_CATALOG` do original: nada aqui decide o que
 * existe nem quem vê — só ONDE cada tela fica. Duas partes:
 *   1. posições explícitas, por href, na ordem da tabela da spec (`PORTAS`);
 *   2. posição padrão pelo `group` que o próprio original deu à tela
 *      (`PADRAO_POR_GRUPO`), para tela nova do original entrar sozinha.
 * `Record<NavGroupId, …>` faz o compilador reprovar um group novo; o teste
 * `convexy-menu-mapa` diz o que decidir.
 */

export const HREF_DO_INICIO = "/app";

/** Não está no catálogo: aparece com a regra do `VersionFooter` (admin de plataforma fora do suporte). */
export const HREF_DA_ATUALIZACAO = "/app/settings/atualizacao";

export type PortaId =
  | "inicio"
  | "conversas"
  | "agenda"
  | "contatos"
  | "funil"
  | "tarefas"
  | "ia"
  | "resultados"
  | "configuracoes";

export type GrupoId =
  | "principal"
  | "envios"
  | "acompanhar"
  | "avancado"
  | "mais"
  | "canais"
  | "organizacao"
  | "conta"
  | "sistema";

type Icone = NavDestination["icon"];

export interface DefinicaoDeGrupo {
  readonly id: GrupoId;
  /** `null` no grupo principal de uma porta: ele não tem título. */
  readonly rotulo: Texto | null;
  /** "Acompanhar", "Avançado", "Mais", "Envios": uso diário nunca cai aqui. */
  readonly secundario: boolean;
  readonly hrefs: readonly string[];
}

export interface DefinicaoDePorta {
  readonly id: PortaId;
  readonly rotulo: RotuloPorNicho;
  readonly Icone: Icone;
  /** Configurações vive no rodapé do trilho, fora da área que rola. */
  readonly rodape: boolean;
  readonly grupos: readonly DefinicaoDeGrupo[];
}

function principal(hrefs: readonly string[]): DefinicaoDeGrupo {
  return { id: "principal", rotulo: null, secundario: false, hrefs };
}

export const PORTAS: readonly DefinicaoDePorta[] = [
  { id: "inicio", rotulo: TEXTOS.portas.inicio, Icone: House, rodape: false, grupos: [principal([HREF_DO_INICIO])] },
  {
    id: "conversas",
    rotulo: TEXTOS.portas.conversas,
    Icone: ChatCircle,
    rodape: false,
    grupos: [
      principal(["/app/inbox", "/app/radar", "/app/templates"]),
      { id: "envios", rotulo: TEXTOS.grupos.envios, secundario: true, hrefs: ["/app/campaigns", "/app/calls"] },
    ],
  },
  {
    id: "agenda",
    rotulo: TEXTOS.portas.agenda,
    Icone: CalendarBlank,
    rodape: false,
    grupos: [principal(["/app/agenda", "/app/comandas", "/app/settings/tenant/agenda"])],
  },
  {
    id: "contatos",
    rotulo: ROTULO_DE_CONTATOS,
    Icone: Users,
    rodape: false,
    grupos: [principal(["/app/contacts", "/app/prospecting", "/app/products"])],
  },
  { id: "funil", rotulo: ROTULO_DO_FUNIL, Icone: Funnel, rodape: false, grupos: [principal(["/app/kanban"])] },
  { id: "tarefas", rotulo: TEXTOS.portas.tarefas, Icone: CheckSquare, rodape: false, grupos: [principal(["/app/tasks"])] },
  {
    id: "ia",
    rotulo: TEXTOS.portas.ia,
    Icone: Robot,
    rodape: false,
    grupos: [
      principal([
        "/app/ai/agents",
        "/app/ai/followups",
        "/app/ai/routers",
        "/app/ai/providers",
        "/app/ai/knowledge/sources",
        "/app/ai/atendimento",
        "/app/ai/inbox",
      ]),
      {
        id: "acompanhar",
        rotulo: TEXTOS.grupos.acompanhar,
        secundario: true,
        hrefs: ["/app/ai/cases", "/app/ai/proposals", "/app/ai/runs", "/app/ai/usage", "/app/ai/cases/avisos"],
      },
      {
        id: "avancado",
        rotulo: TEXTOS.grupos.avancado,
        secundario: true,
        hrefs: ["/app/ai/credentials", "/app/ai/memory", "/app/ai/skills"],
      },
    ],
  },
  {
    id: "resultados",
    rotulo: TEXTOS.portas.resultados,
    Icone: ChartBar,
    rodape: false,
    grupos: [
      principal(["/app/metrics", "/app/ads/meta", "/app/activities", "/app/faturamento"]),
      { id: "mais", rotulo: TEXTOS.grupos.mais, secundario: true, hrefs: ["/app/ai/evolution", "/app/audit"] },
    ],
  },
  {
    id: "configuracoes",
    rotulo: TEXTOS.portas.configuracoes,
    Icone: GearSix,
    rodape: true,
    grupos: [
      {
        id: "canais",
        rotulo: TEXTOS.grupos.canais,
        secundario: false,
        hrefs: [
          "/app/connections",
          "/app/integrations/nuvemshop",
          "/app/webhooks",
          "/app/settings/meta-ads",
          "/app/settings/api-tokens",
          "/app/settings/voip-trunk",
          "/app/extensions",
          "/app/integracao-dados",
        ],
      },
      {
        id: "organizacao",
        rotulo: TEXTOS.grupos.organizacao,
        secundario: false,
        hrefs: [
          "/app/settings/tenant",
          "/app/team",
          "/app/settings/tenant/financeiro",
          "/app/settings/marca",
          "/app/settings/tags",
          "/app/settings/tenant/pipelines",
          "/app/settings/atendimento",
          "/app/settings/conversoes",
        ],
      },
      {
        id: "conta",
        rotulo: TEXTOS.grupos.conta,
        secundario: false,
        hrefs: [
          "/app/settings/profile",
          "/app/settings/security",
          "/app/settings/notifications",
          "/app/lgpd/requests",
          "/app/settings/billing",
        ],
      },
      { id: "sistema", rotulo: TEXTOS.grupos.sistema, secundario: false, hrefs: [HREF_DA_ATUALIZACAO] },
    ],
  },
];

interface PosicaoPadrao {
  readonly porta: PortaId;
  readonly principal: GrupoId;
  readonly secundario: GrupoId;
}

/** Tela sem posição explícita vai para a porta do `group` dela (spec 3.2). */
export const PADRAO_POR_GRUPO: Readonly<Record<NavGroupId, PosicaoPadrao>> = {
  atendimento: { porta: "conversas", principal: "principal", secundario: "envios" },
  crm: { porta: "contatos", principal: "principal", secundario: "principal" },
  ia: { porta: "ia", principal: "principal", secundario: "avancado" },
  canais: { porta: "configuracoes", principal: "canais", secundario: "canais" },
  analise: { porta: "resultados", principal: "principal", secundario: "mais" },
  organizacao: { porta: "configuracoes", principal: "organizacao", secundario: "organizacao" },
};

/** Com o módulo ligado, cada página-hub do original vai à primeira tela visível desta porta (spec 3.4). */
export const PORTA_DO_HUB: Readonly<Partial<Record<NavGroupId, PortaId>>> = {
  crm: "contatos",
  ia: "ia",
  analise: "resultados",
  organizacao: "configuracoes",
};

/** As orientações das extensões (antes no hub `/app/crm`) viram um grupo desta porta. */
export const PORTA_DAS_ORIENTACOES: PortaId = "contatos";

/** Páginas de detalhe fora da árvore do seu item, por prefixo (spec 3.3). */
export const DONOS_EXTRAS: ReadonlyArray<{ readonly prefixo: string; readonly dono: string }> = [
  { prefixo: "/app/leads", dono: "/app/kanban" },
  { prefixo: "/app/pipelines", dono: "/app/kanban" },
  // Redirecionamentos do original para Conexões.
  { prefixo: "/app/settings/canal-oficial", dono: "/app/connections" },
  { prefixo: "/app/settings/templates", dono: "/app/connections" },
  { prefixo: "/app/settings/tenant/whatsapp", dono: "/app/connections" },
];

/** Rótulos próprios da Convexy, por href; os demais usam o rótulo do catálogo, traduzido (spec 6.2). */
export const ROTULOS_DOS_ITENS: ReadonlyMap<string, RotuloPorNicho> = new Map<string, RotuloPorNicho>([
  [HREF_DO_INICIO, TEXTOS.portas.inicio],
  ["/app/inbox", TEXTOS.portas.conversas],
  ["/app/radar", TEXTOS.itens.semResposta],
  ["/app/contacts", ROTULO_DE_CONTATOS],
  ["/app/kanban", ROTULO_DO_FUNIL],
  ["/app/ai/agents", TEXTOS.itens.assistentes],
  ["/app/ai/inbox", TEXTOS.itens.pedidosDaIa],
  ["/app/ads/meta", TEXTOS.itens.anuncios],
]);

const HREFS_EXPLICITOS: ReadonlySet<string> = new Set(PORTAS.flatMap((p) => p.grupos.flatMap((g) => g.hrefs)));

/** O mínimo que o mapa precisa de uma entrada do catálogo (serve a `NavMetadata` e a `NavDestination`). */
interface EntradaOrganizavel {
  readonly href: string;
  readonly group: NavGroupId;
  readonly sidebar?: boolean;
}

interface GrupoOrganizado<T> {
  readonly grupo: DefinicaoDeGrupo;
  readonly itens: T[];
}

interface PortaOrganizada<T> {
  readonly porta: DefinicaoDePorta;
  readonly grupos: readonly GrupoOrganizado<T>[];
}

function posicaoPadrao(entrada: EntradaOrganizavel): { porta: PortaId; grupo: GrupoId } {
  const padrao = PADRAO_POR_GRUPO[entrada.group] as PosicaoPadrao | undefined;
  if (!padrao) {
    throw new Error(
      `O group "${entrada.group}" (de ${entrada.href}) é novo no original e não tem porta no menu da Convexy. ` +
        "Decida a porta e os grupos principal e secundário dele em PADRAO_POR_GRUPO, em lib/convexy/menu/mapa.ts.",
    );
  }
  return { porta: padrao.porta, grupo: entrada.sidebar ? padrao.principal : padrao.secundario };
}

/** As entradas que entraram pela posição padrão — o teste as lista para quem revisa o merge. */
export function posicoesPorPadrao(
  entradas: readonly EntradaOrganizavel[],
): Array<{ href: string; porta: PortaId; grupo: GrupoId }> {
  return entradas.filter((e) => !HREFS_EXPLICITOS.has(e.href)).map((e) => ({ href: e.href, ...posicaoPadrao(e) }));
}

/**
 * As entradas nas portas e grupos, na ordem do mapa. Devolve a estrutura INTEIRA,
 * com grupos e portas vazios: quem desenha (menu, tela de interface) poda.
 */
export function organizarPorPortas<T extends EntradaOrganizavel>(entradas: readonly T[]): PortaOrganizada<T>[] {
  const porHref = new Map(entradas.map((e) => [e.href, e]));
  const estrutura = PORTAS.map((porta) => ({
    porta,
    grupos: porta.grupos.map((grupo) => ({
      grupo,
      itens: grupo.hrefs.flatMap((href) => {
        const entrada = porHref.get(href);
        return entrada ? [entrada] : [];
      }),
    })),
  }));
  for (const entrada of entradas) {
    if (HREFS_EXPLICITOS.has(entrada.href)) continue;
    const { porta, grupo } = posicaoPadrao(entrada);
    const destino = estrutura.find((p) => p.porta.id === porta)?.grupos.find((g) => g.grupo.id === grupo);
    if (!destino) throw new Error(`mapa inconsistente: a porta ${porta} não tem o grupo ${grupo}`);
    destino.itens.push(entrada);
  }
  return estrutura;
}
```

- [ ] **Step 4: `lib/convexy/menu/dono.ts`**

```ts
import { DONOS_EXTRAS, HREF_DO_INICIO, PORTA_DAS_ORIENTACOES, type PortaId } from "./mapa";

/**
 * UMA TELA, UM DONO (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.3).
 *
 * Cada item é dono do seu endereço e de tudo que fica abaixo dele; o que estiver
 * abaixo de um item mais específico é desse outro (regra de segmento: vence o
 * prefixo mais longo). `/app` (o Início) é dono só de si. `DONOS_EXTRAS` só vale
 * quando o dono está entre os itens visíveis.
 */
function casa(caminho: string, prefixo: string): boolean {
  return caminho === prefixo || (prefixo !== HREF_DO_INICIO && caminho.startsWith(`${prefixo}/`));
}

export function donoDoCaminho(caminho: string, hrefs: readonly string[]): string | null {
  const visiveis = new Set(hrefs);
  const candidatos: ReadonlyArray<readonly [prefixo: string, dono: string]> = [
    ...hrefs.map((href) => [href, href] as const),
    ...DONOS_EXTRAS.filter((extra) => visiveis.has(extra.dono)).map((extra) => [extra.prefixo, extra.dono] as const),
  ];
  let melhor: readonly [string, string] | null = null;
  for (const candidato of candidatos) {
    if (casa(caminho, candidato[0]) && (!melhor || candidato[0].length > melhor[0].length)) melhor = candidato;
  }
  return melhor ? melhor[1] : null;
}

interface Ativo {
  readonly porta: PortaId;
  readonly href: string;
}

/**
 * A porta e o item acesos neste caminho. `orientacoes` são os hrefs das
 * orientações já carregadas: são itens de Contatos, mais específicos que
 * Extensões (Decisão 5 do plano).
 */
export function ativoNoCaminho(
  caminho: string,
  portas: ReadonlyArray<{ readonly id: PortaId; readonly itens: ReadonlyArray<{ readonly href: string }> }>,
  orientacoes: readonly string[] = [],
): Ativo | null {
  const dono = donoDoCaminho(caminho, [...portas.flatMap((p) => p.itens.map((i) => i.href)), ...orientacoes]);
  if (!dono) return null;
  if (orientacoes.includes(dono)) return { porta: PORTA_DAS_ORIENTACOES, href: dono };
  const porta = portas.find((p) => p.itens.some((i) => i.href === dono));
  return porta ? { porta: porta.id, href: dono } : null;
}
```

- [ ] **Step 5: `lib/convexy/menu/montar.ts`**

```ts
import type { Role } from "@/lib/auth/types";
import type { Nicho } from "@/lib/convexy/nicho";
import { TEXTOS, rotuloPorNicho, texto } from "@/lib/convexy/textos";
import { traduzir } from "@/lib/i18n/dicionario";
import type { Idioma } from "@/lib/i18n/idiomas";
import type { ModuloOpcional } from "@/lib/instalacao/modulos";
import type { NavGroupId } from "@/lib/navigation/catalogo";
import type { InterfaceSettings } from "@/lib/navigation/interface";
import { searchable, type NavDestination } from "@/lib/navigation/registry";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";

import {
  HREF_DA_ATUALIZACAO,
  PORTA_DO_HUB,
  ROTULOS_DOS_ITENS,
  organizarPorPortas,
  type GrupoId,
  type PortaId,
} from "./mapa";

/**
 * MONTAR O MENU (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.5).
 *
 * A visibilidade NÃO é decidida aqui: a entrada é `searchable()` — a mesma lista
 * da busca ⌘K (papel, interface por vínculo, módulos, admin de plataforma). Aqui
 * só se agrupa pelo mapa, rotula por nicho e idioma, e poda: grupo sem item some,
 * porta sem item some, porta com um item vira direta, a saúde da conexão sobe.
 */
/** Um item da sub-sidebar: só texto (o protótipo aprovado não põe ícone nos itens). */
export interface ItemDoMenu {
  readonly href: string;
  readonly rotulo: string;
  /** A descrição do catálogo: dica na sub-sidebar (spec 3.1). */
  readonly descricao: string;
  readonly healthDot: boolean;
}

interface GrupoDoMenu {
  readonly id: GrupoId;
  readonly rotulo: string | null;
  readonly secundario: boolean;
  readonly itens: readonly ItemDoMenu[];
}

export interface PortaDoMenu {
  readonly id: PortaId;
  readonly rotulo: string;
  readonly Icone: NavDestination["icon"];
  readonly rodape: boolean;
  readonly grupos: readonly GrupoDoMenu[];
  /** Todos os itens, na ordem dos grupos. O primeiro é para onde a porta leva. */
  readonly itens: readonly ItemDoMenu[];
  /** Um item só: a porta é um Link, sem sub-sidebar. */
  readonly direta: boolean;
  readonly healthDot: boolean;
}

export interface EntradaDoMenu {
  readonly visiveis: readonly NavDestination[];
  /** `user.is_platform_admin && !user.support` — a mesma regra do `VersionFooter`. */
  readonly atualizacao: boolean;
  readonly nicho: Nicho;
  readonly idioma: Idioma;
}

/** Rótulo próprio do mapa (por nicho), ou o do catálogo traduzido como hoje. */
export function rotuloDoItem(href: string, rotuloDoCatalogo: string, nicho: Nicho, idioma: Idioma): string {
  const proprio = ROTULOS_DOS_ITENS.get(href);
  return proprio ? rotuloPorNicho(proprio, nicho, idioma) : traduzir(rotuloDoCatalogo, idioma);
}

export function montarMenu({ visiveis, atualizacao, nicho, idioma }: EntradaDoMenu): PortaDoMenu[] {
  const item = (d: NavDestination): ItemDoMenu => ({
    href: d.href,
    rotulo: rotuloDoItem(d.href, d.label, nicho, idioma),
    descricao: traduzir(d.description, idioma),
    healthDot: d.healthDot === true,
  });
  const itemDaAtualizacao: ItemDoMenu = {
    href: HREF_DA_ATUALIZACAO,
    rotulo: texto(TEXTOS.itens.atualizacao, idioma),
    descricao: texto(TEXTOS.itens.atualizacaoDescricao, idioma),
    healthDot: false,
  };

  return organizarPorPortas(visiveis).flatMap(({ porta, grupos }) => {
    const gruposDoMenu: GrupoDoMenu[] = grupos
      .map(({ grupo, itens }) => ({
        id: grupo.id,
        rotulo: grupo.rotulo ? texto(grupo.rotulo, idioma) : null,
        secundario: grupo.secundario,
        itens: [
          ...itens.map(item),
          ...(atualizacao && grupo.hrefs.includes(HREF_DA_ATUALIZACAO) ? [itemDaAtualizacao] : []),
        ],
      }))
      .filter((g) => g.itens.length > 0);
    const itens = gruposDoMenu.flatMap((g) => g.itens);
    if (itens.length === 0) return [];
    return [
      {
        id: porta.id,
        rotulo: rotuloPorNicho(porta.rotulo, nicho, idioma),
        Icone: porta.Icone,
        rodape: porta.rodape,
        grupos: gruposDoMenu,
        itens,
        direta: itens.length === 1,
        healthDot: itens.some((i) => i.healthDot),
      },
    ];
  });
}

interface ContextoDoHub {
  readonly isPlatformAdmin: boolean;
  readonly role: Role | null;
  readonly interfaceSettings?: InterfaceSettings;
  readonly modulosLigados: readonly ModuloOpcional[];
}

/**
 * Para onde vai uma página-hub com o módulo ligado: a primeira tela VISÍVEL da
 * porta do hub (spec 3.4). `null` = o módulo está desligado, o grupo não tem
 * hub, ou a porta não tem tela visível — e o hub do original é desenhado.
 */
export function destinoDoHub(grupo: NavGroupId, contexto: ContextoDoHub): string | null {
  if (!contexto.modulosLigados.includes(MODULO_DO_MENU)) return null;
  const portaId = PORTA_DO_HUB[grupo];
  if (!portaId) return null;
  const visiveis = searchable(
    contexto.isPlatformAdmin,
    contexto.role,
    contexto.interfaceSettings,
    contexto.modulosLigados,
  );
  const porta = organizarPorPortas(visiveis).find((p) => p.porta.id === portaId);
  return porta?.grupos.flatMap((g) => g.itens)[0]?.href ?? null;
}
```

- [ ] **Step 6: Conferir (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git grep -n "CheckSquare\|GearSix" -- lib/ui/icons.ts lib/convexy
git add lib/ui/icons.ts lib/convexy/menu/mapa.ts lib/convexy/menu/dono.ts lib/convexy/menu/montar.ts tests/unit/convexy-menu-mapa.test.ts tests/unit/convexy-menu-dono.test.ts tests/unit/convexy-menu-montar.test.ts tests/unit/convexy-menu-textos.test.ts
git commit -m "feat(convexy): modelo puro do menu — mapa, dono e montar (spec 3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 7: Empurrar e ler o CI**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml"
ARQUIVOS="convexy-menu-(mapa|dono|montar|textos)"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
E o relatório das posições por padrão (o que quem revisa um merge do original lê):
```bash
grep -a "\[convexy-menu\] posições por padrão" "$S/ci.yml-$sha.log" | head -3
```
Expected: `ci.yml exit=0`; rodapé sem `failed`/`Errors`; os quatro arquivos sem `×`; a linha `[convexy-menu] posições por padrão (0): nenhuma` no log. Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.

---

### Task 5: O contexto da Convexy, o layout e o `useT` da Convexy

**Files:**
- Create: `lib/convexy/contexto.tsx`
- Create: `lib/convexy/vocabulario.ts`
- Modify: `hooks/i18n/useT.ts` (linhas 1-9: o comentário ganha um parágrafo e a reexportação troca de origem)
- Modify: `app/app/layout.tsx:26` (imports), `:61-63` (uma variável), `:91-107` (uma consulta no `Promise.all`), `:112` (atribuição), `:219` e `:265` (provider)
- Create: `tests/unit/convexy-menu-vocabulario.test.tsx`

**Interfaces:**
- Consumes: `useT`, `useIdioma`, `IdiomaProvider` (`lib/i18n/IdiomaProvider.tsx`); `MODULO_DO_MENU` (Task 2); `lerNicho`, `NICHO_PADRAO`, `Nicho` (Task 1); `TEXTOS`, `ROTULO_DO_FUNIL`, `rotuloPorNicho`, `RotuloPorNicho` (Task 3).
- Produces:
  - `lib/convexy/contexto.tsx`: `export interface ValorDaConvexy { readonly menuLigado: boolean; readonly nicho: Nicho }`; `export function ConvexyProvider(props: ValorDaConvexy & { children: ReactNode })`; `export function useConvexy(): ValorDaConvexy | null`.
  - `lib/convexy/vocabulario.ts`: `export function useT(): (texto: string) => string` (a tabela e a função de troca são privadas).
  - `@/hooks/i18n/useT` passa a exportar o `useT` da Convexy (mesma assinatura).

- [ ] **Step 1: Teste (vermelho até os Steps 3–6)**

Criar `tests/unit/convexy-menu-vocabulario.test.tsx`:
```tsx
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { useT } from "@/hooks/i18n/useT";
import { ConvexyProvider } from "@/lib/convexy/contexto";
import type { Nicho } from "@/lib/convexy/nicho";
import { traduzir } from "@/lib/i18n/dicionario";
import { IdiomaProvider, useT as useTDoIdioma } from "@/lib/i18n/IdiomaProvider";
import type { Idioma } from "@/lib/i18n/idiomas";

/**
 * Convexy — o `useT` da Convexy (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.3).
 * Troca SÓ quatro títulos exatos, só com o módulo ligado e o provider presente; em
 * qualquer outro caso devolve o mesmo que o `t` do provider de idioma.
 */
function arvore(idioma: Idioma, convexy?: { menuLigado: boolean; nicho: Nicho }) {
  return function Envoltorio({ children }: { children: ReactNode }) {
    return (
      <IdiomaProvider locale={idioma}>
        {convexy ? <ConvexyProvider {...convexy}>{children}</ConvexyProvider> : children}
      </IdiomaProvider>
    );
  };
}

function tDe(idioma: Idioma, convexy?: { menuLigado: boolean; nicho: Nicho }) {
  return renderHook(() => ({ convexy: useT(), original: useTDoIdioma() }), { wrapper: arvore(idioma, convexy) })
    .result.current;
}

/** Os quatro títulos da lista e textos comuns. */
const AMOSTRA = ["Inbox", "Radar de risco", "Funis", "Central de avisos", "Contatos", "Salvar", "Assumir"];

describe("fora do app ou com o módulo desligado, é o t do original", () => {
  it("sem ConvexyProvider (admin, telas públicas, onboarding): o mesmo resultado, texto a texto", () => {
    const { convexy, original } = tDe("es");
    for (const texto of AMOSTRA) expect(convexy(texto)).toBe(original(texto));
    // Controle de que o espanhol está mesmo em jogo (e o de cima não é tautologia em pt).
    expect(convexy("Contatos")).toBe("Contactos");
    expect(convexy("Funis")).toBe("Embudos");
  });

  it("com o provider e o módulo desligado: o mesmo resultado, qualquer nicho", () => {
    const { convexy, original } = tDe("es", { menuLigado: false, nicho: "clinica" });
    for (const texto of AMOSTRA) expect(convexy(texto)).toBe(original(texto));
    expect(convexy("Inbox")).toBe(traduzir("Inbox", "es"));
  });
});

describe("com o módulo ligado", () => {
  it.each([
    ["clinica", "Funil de pacientes"],
    ["servicos", "Funil de vendas"],
    ["generico", "Funil"],
    ["imobiliaria", "Funil"],
  ] as const)("nicho %s: Funis vira %s", (nicho, esperado) => {
    expect(tDe("pt-BR", { menuLigado: true, nicho }).convexy("Funis")).toBe(esperado);
  });

  it("os outros três títulos da lista", () => {
    const t = tDe("pt-BR", { menuLigado: true, nicho: "servicos" }).convexy;
    expect(t("Inbox")).toBe("Conversas");
    expect(t("Radar de risco")).toBe("Sem resposta");
    expect(t("Central de avisos")).toBe("Pedidos da IA");
  });

  it("só textos exatos: variação, prefixo e as palavras de fora da lista não mudam", () => {
    const { convexy, original } = tDe("es", { menuLigado: true, nicho: "clinica" });
    for (const texto of ["Inbox de hoje", "inbox", "Contatos", "Agentes", "Meta Ads", "Audit Log", "Salvar"]) {
      expect(convexy(texto)).toBe(original(texto));
    }
    expect(convexy("Contatos")).toBe("Contactos");
  });

  it("tem espanhol, e não é o português de volta", () => {
    const t = tDe("es", { menuLigado: true, nicho: "clinica" }).convexy;
    expect(t("Funis")).toBe("Embudo de pacientes");
    expect(t("Inbox")).toBe("Conversaciones");
    expect(t("Radar de risco")).toBe("Sin respuesta");
    expect(t("Central de avisos")).toBe("Pedidos de la IA");
  });

  it("o nicho é da árvore, nunca global: duas organizações lado a lado", () => {
    const clinica = tDe("pt-BR", { menuLigado: true, nicho: "clinica" }).convexy;
    const servicos = tDe("pt-BR", { menuLigado: true, nicho: "servicos" }).convexy;
    expect(clinica("Funis")).toBe("Funil de pacientes");
    expect(servicos("Funis")).toBe("Funil de vendas");
    expect(clinica("Funis")).toBe("Funil de pacientes");
  });

  it("a identidade é estável entre renders (quem põe t em dependência de efeito não entra em laço)", () => {
    const { result, rerender } = renderHook(() => useT(), {
      wrapper: arvore("pt-BR", { menuLigado: true, nicho: "clinica" }),
    });
    const primeira = result.current;
    rerender();
    expect(result.current).toBe(primeira);
  });
});
```

- [ ] **Step 2: Fase vermelha no CI (Review Focus 5)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
git add tests/unit/convexy-menu-vocabulario.test.tsx
git commit -m "test(convexy): vocabulário por nicho, por árvore — vermelho antes (spec 6.3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow ci.yml --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "ci.yml run=$id exit=$?"
gh run view "$id" -R victorrabyfs/DeskcommCRM --log-failed > "$S/vermelho-rf5-$sha.log"
grep -aE "convexy-menu-vocabulario" "$S/vermelho-rf5-$sha.log" | head -10
```
Expected: `exit` diferente de 0 **por causa deste arquivo** (`@/lib/convexy/contexto` ainda não existe); anotar o id do run. Outro arquivo vermelho: parar e investigar.

- [ ] **Step 3: `lib/convexy/contexto.tsx`**

```tsx
"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Nicho } from "@/lib/convexy/nicho";

/**
 * O CONTEXTO DA CONVEXY — por pedido, nunca global (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.3 e 12).
 *
 * O `app/app/layout.tsx` o alimenta com o que já lê: o módulo `menu_convexy`
 * (`modulos_ligados`) e o nicho da organização ativa. Separado do `AuthProvider`
 * de propósito: dezenas de testes fazem `vi.mock` daquele módulo, e o `useT`
 * (que lê este contexto) é usado em ~440 arquivos. Fora do app (admin, telas
 * públicas, onboarding) não há provider e `useConvexy()` devolve `null`: menu
 * clássico, vocabulário do original. Mora em `lib/` para `lib/` nunca importar
 * `components/`.
 */
export interface ValorDaConvexy {
  readonly menuLigado: boolean;
  readonly nicho: Nicho;
}

const Contexto = createContext<ValorDaConvexy | null>(null);

export function ConvexyProvider({ menuLigado, nicho, children }: ValorDaConvexy & { children: ReactNode }) {
  const valor = useMemo(() => ({ menuLigado, nicho }), [menuLigado, nicho]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useConvexy(): ValorDaConvexy | null {
  return useContext(Contexto);
}
```

- [ ] **Step 4: `lib/convexy/vocabulario.ts`**

```ts
"use client";
import { useMemo } from "react";

import { useConvexy } from "@/lib/convexy/contexto";
import type { Nicho } from "@/lib/convexy/nicho";
import { ROTULO_DO_FUNIL, TEXTOS, rotuloPorNicho, type RotuloPorNicho } from "@/lib/convexy/textos";
import { useIdioma, useT as useTDoIdioma } from "@/lib/i18n/IdiomaProvider";
import type { Idioma } from "@/lib/i18n/idiomas";

/**
 * O VOCABULÁRIO POR NICHO dos títulos (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.3).
 *
 * Só TEXTOS EXATOS, e só estes quatro: "Contatos", "Agentes", "Meta Ads" e
 * "Audit Log" ficam de fora porque aparecem como cabeçalho de coluna, em outros
 * sentidos ou no /admin. Títulos desenhados no servidor com `traduzir()` direto
 * não passam por aqui (desvio aceito, 6.4 — medido no CONVEXY.md). Nunca aplicar
 * em `lib/agent-engine`, `lib/notifications` ou `workers`.
 */
const TITULOS: ReadonlyMap<string, RotuloPorNicho> = new Map<string, RotuloPorNicho>([
  ["Inbox", TEXTOS.portas.conversas],
  ["Radar de risco", TEXTOS.itens.semResposta],
  ["Funis", ROTULO_DO_FUNIL],
  ["Central de avisos", TEXTOS.itens.pedidosDaIa],
]);

function tituloDoNicho(texto: string, nicho: Nicho, idioma: Idioma): string | null {
  const rotulo = TITULOS.get(texto);
  return rotulo ? rotuloPorNicho(rotulo, nicho, idioma) : null;
}

/**
 * O `useT` que `@/hooks/i18n/useT` exporta. Sem provider, ou com o módulo
 * desligado, devolve a própria função do provider de idioma; ligado, troca os
 * títulos da lista e delega o resto a ela.
 */
export function useT(): (texto: string) => string {
  const t = useTDoIdioma();
  const idioma = useIdioma();
  const convexy = useConvexy();
  const menuLigado = convexy?.menuLigado === true;
  const nicho = convexy?.nicho;
  return useMemo(() => {
    if (!menuLigado || !nicho) return t;
    return (texto: string) => tituloDoNicho(texto, nicho, idioma) ?? t(texto);
  }, [menuLigado, nicho, idioma, t]);
}
```

- [ ] **Step 5: `hooks/i18n/useT.ts`**

Trocar:
```ts
 * seu contexto faria os dois divergirem no dia em que alguém mudasse um.
 */
export { useT } from "@/lib/i18n/IdiomaProvider";
```
por:
```ts
 * seu contexto faria os dois divergirem no dia em que alguém mudasse um.
 *
 * Convexy: reexporta o `useT` da Convexy (`lib/convexy/vocabulario.ts`), que é o
 * do provider de idioma fora do app ou com o menu da Convexy desligado, e troca
 * só quatro títulos exatos com ele ligado. CONVEXY.md, "Menu novo".
 */
export { useT } from "@/lib/convexy/vocabulario";
```

- [ ] **Step 6: `app/app/layout.tsx`**

(a) Depois de `import { acessoFoiRevogado } from "@/lib/auth/vinculo-revogado";` acrescentar:
```tsx
// Convexy: menu novo e nicho — CONVEXY.md, "Menu novo".
import { ConvexyProvider } from "@/lib/convexy/contexto";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
import { NICHO_PADRAO, lerNicho, type Nicho } from "@/lib/convexy/nicho";
```
(b) Depois de `  let needsMfaGate = false;` acrescentar:
```tsx
  // Convexy: o nicho da organização (o menu e o vocabulário). CONVEXY.md, "Menu novo".
  let nicho: Nicho = NICHO_PADRAO;
```
(c) Trocar:
```tsx
    const [orgRes, conexoes, isEnrolled, mfaRequired, modulos] = await Promise.all([
```
por:
```tsx
    const [orgRes, conexoes, isEnrolled, mfaRequired, modulos, nichoRes] = await Promise.all([
```
e trocar:
```tsx
      // Da INSTALAÇÃO: decide se a porta de um módulo opcional entra no menu.
      modulosLigados(admin),
    ]);
```
por:
```tsx
      // Da INSTALAÇÃO: decide se a porta de um módulo opcional entra no menu.
      modulosLigados(admin),
      // Convexy: o nicho numa consulta PRÓPRIA — coluna ausente ou leitura recusada
      // viram o nicho genérico e nunca alcançam os gates de onboarding e
      // suspensão, que leem a consulta de cima. CONVEXY.md, "Menu novo".
      admin.from("organizations").select("nicho").eq("id", activeOrg.orgId).maybeSingle(),
    ]);
```
(d) Dentro do `if (activeOrg) {` — a PRIMEIRA das duas linhas `    needsMfaGate = mfaRequired;`, a que vem logo antes de `    if (orgRow && !orgRow.onboarded_at && !user.support) redirect("/onboarding");` (a segunda é do `else`) —, acrescentar depois dela:
```tsx
    nicho = lerNicho(nichoRes.data?.nicho);
```
(e) Trocar:
```tsx
    <IdiomaProvider locale={user.idioma}>
    <AuthProvider user={user} activeOrg={activeOrg}>
```
por:
```tsx
    <IdiomaProvider locale={user.idioma}>
    {/* Convexy: o contexto do menu da Convexy, por pedido. CONVEXY.md, "Menu novo". */}
    <ConvexyProvider menuLigado={activeOrg?.modulos_ligados?.includes(MODULO_DO_MENU) === true} nicho={nicho}>
    <AuthProvider user={user} activeOrg={activeOrg}>
```
e:
```tsx
    </AuthProvider>
    </IdiomaProvider>
```
por:
```tsx
    </AuthProvider>
    </ConvexyProvider>
    </IdiomaProvider>
```

- [ ] **Step 7: Conferir (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
grep -n "IdiomaProvider locale={user.idioma}\|ConvexyProvider\|nicho" app/app/layout.tsx
grep -n 'select("onboarded_at, status, settings")' app/app/layout.tsx
grep -rn "^import .*auth" lib/i18n/IdiomaProvider.tsx || echo "IdiomaProvider continua sem importar auth"
git grep -n "components/" -- lib/convexy || echo "lib/convexy não importa components/"
git add lib/convexy/contexto.tsx lib/convexy/vocabulario.ts hooks/i18n/useT.ts app/app/layout.tsx
git commit -m "feat(convexy): contexto por pedido e useT com vocabulário por nicho (spec 6.3)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: `<IdiomaProvider locale={user.idioma}>` intacto (cobrado por `idioma-da-interface`); o `select("onboarded_at, status, settings")` do original intacto; "IdiomaProvider continua sem importar auth"; "lib/convexy não importa components/".

- [ ] **Step 8: Empurrar e ler o CI (`ci.yml` e `perf.yml`: o layout é Server Component)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml perf.yml"
ARQUIVOS="convexy-menu-vocabulario|idioma-da-interface|i18n-espanhol-cobre-a-tela|faixa-de-conexao-caida-vem-do-seam|onboarding-tem-saida|voz-so-sonda-quem-pode-atender|rodape-ocupado-contrato"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
Expected: `ci.yml exit=0` e `perf.yml exit=0`; rodapé sem `failed`/`Errors`; `convexy-menu-vocabulario` (11 casos) e os gates listados sem `×` (o de faixa executa o layout com a consulta nova no `Promise.all` e o provider no meio da árvore). Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.

---


### Task 6: O menu no desktop — trilho, portas, sub-sidebar, alça, e a troca no `AppShell`

**Files:**
- Modify: `components/shell/Sidebar.tsx:85-124` e `:127-189` (recorte para `MarcaDaBarra`, sem mudar o desenho)
- Modify: `app/app/_components/AppShell.tsx:1-10` (imports), `:710` e `:714-716` (hook e ternário)
- Create: `components/convexy/menu/menu.css`
- Create: `lib/convexy/orientacoes.ts`
- Create: `components/convexy/menu/useMenuConvexy.ts`
- Create: `components/convexy/menu/useLarguraLarga.ts`
- Create: `components/convexy/menu/useOrientacoes.ts`
- Create: `components/convexy/menu/BotaoDaPorta.tsx`
- Create: `components/convexy/menu/ListaDaPorta.tsx`
- Create: `components/convexy/menu/SubSidebar.tsx`
- Create: `components/convexy/menu/MenuConvexy.tsx`
- Create: `tests/unit/convexy-menu-desktop.test.tsx`
- Create: `tests/unit/convexy-menu-estrutura.test.ts`

**Interfaces:**
- Consumes: `useAuth` (`hooks/auth/AuthProvider.tsx`), `useConvexy` (Task 5), `useIdioma`, `useT` (`@/hooks/i18n/useT`), `searchable`, `montarMenu`/`PortaDoMenu`/`ItemDoMenu`, `ativoNoCaminho`, `PORTA_DAS_ORIENTACOES`/`PortaId` (Task 4), `TEXTOS`/`texto` (Task 3), `toggleSidebar`, `VersionFooter`, `ConnectionHealthDot`, `Tooltip*` (`components/ui/tooltip.tsx`), `apiClient.get`.
- Produces:
  - `components/shell/Sidebar.tsx`: `export function MarcaDaBarra({ collapsed }: { collapsed: boolean })` (o cabeçalho `h-14` da marca, idêntico).
  - `lib/convexy/orientacoes.ts`: `export interface RespostaDasOrientacoes { orientacoes: ReadonlyArray<{ installation_id: string; titulo: string }>; indisponivel: boolean }`; `export function hrefDaOrientacao(installationId: string): string`.
  - `useMenuConvexy(): readonly PortaDoMenu[]`; `useLarguraLarga(): boolean`; `useOrientacoes(consultar: boolean): EstadoDasOrientacoes` com `export interface EstadoDasOrientacoes { itens: ReadonlyArray<{ href: string; rotulo: string }>; indisponivel: boolean }`.
  - `BotaoDaPorta(props: BotaoDaPortaProps)` (atributo `data-porta` = id da porta; é por ele que o foco volta), `ListaDaPorta({ porta, ativoHref, orientacoes, aoEscolher })`, `SubSidebar({ id, porta, ativoHref, animar, orientacoes, aoEsc, aoFechar, aoEscolher })`, `MenuConvexy({ recolhido }: { recolhido: boolean })`.

- [ ] **Step 1: Testes (vermelhos até os Steps 3–13)**

Criar `tests/unit/convexy-menu-desktop.test.tsx`:
```tsx
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import type { Nicho } from "@/lib/convexy/nicho";

/**
 * Convexy — o menu no desktop (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.5 e 4).
 * Padrão "Disclosure Navigation" do WAI-ARIA APG: porta com sub é
 * `<button aria-expanded aria-controls>`, porta direta é `<Link>`, a sub-sidebar
 * é `<nav aria-label="{porta}">` e o item ativo tem `aria-current="page"`.
 * "Nada é recriado ao navegar" é provado pelo e2e (mesmo nó do DOM no navegador).
 */
const estado = vi.hoisted(() => ({
  pathname: "/app/contacts",
  larga: true,
  push: vi.fn(),
  toggleSidebar: vi.fn(),
  auth: {
    user: { is_platform_admin: false, support: null },
    activeOrg: { orgId: "org-1", name: "Org", role: "admin", modulos_ligados: ["menu_convexy"] },
  } as { user: Pick<AuthUser, "is_platform_admin" | "support">; activeOrg: ActiveOrg | null },
  orientacoes: { itens: [] as Array<{ href: string; rotulo: string }>, indisponivel: false },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => estado.pathname,
  useRouter: () => ({ push: estado.push, refresh: vi.fn() }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => estado.auth }));
vi.mock("@/app/actions/shell/toggleSidebar", () => ({ toggleSidebar: estado.toggleSidebar }));
// Busca a versão via react-query; o rodapé de versão não é o que estes testes examinam.
vi.mock("@/components/shell/VersionFooter", () => ({ VersionFooter: () => null }));
vi.mock("@/components/connections/ConnectionHealthDot", () => ({
  ConnectionHealthDot: () => <span data-testid="saude" />,
}));
vi.mock("@/components/convexy/menu/useOrientacoes", () => ({ useOrientacoes: () => estado.orientacoes }));
vi.mock("@/components/convexy/menu/useLarguraLarga", () => ({ useLarguraLarga: () => estado.larga }));

import { MenuConvexy } from "@/components/convexy/menu/MenuConvexy";
import { ConvexyProvider } from "@/lib/convexy/contexto";

function arvore(recolhido = false, nicho: Nicho = "clinica") {
  return (
    <ConvexyProvider menuLigado nicho={nicho}>
      <MenuConvexy recolhido={recolhido} />
    </ConvexyProvider>
  );
}
const menu = () => document.querySelector("[data-menu-convexy]") as HTMLElement;
const sub = (nome: string) => screen.getByRole("navigation", { name: nome });
const involucro = (nome: string) => sub(nome).parentElement as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  estado.pathname = "/app/contacts";
  estado.larga = true;
  estado.auth = {
    user: { is_platform_admin: false, support: null },
    activeOrg: { orgId: "org-1", name: "Org", role: "admin", modulos_ligados: ["menu_convexy"] },
  };
  estado.orientacoes = { itens: [], indisponivel: false };
});

describe("disclosure navigation", () => {
  it("porta com sub é botão com aria-expanded e aria-controls apontando para a sub-sidebar", () => {
    render(arvore());
    const porta = within(menu()).getByRole("button", { name: "Pacientes" });
    expect(porta).toHaveAttribute("aria-expanded", "true");
    expect(porta).toHaveAttribute("aria-controls", sub("Pacientes").id);
    expect(within(sub("Pacientes")).getByRole("link", { name: "Pacientes" })).toHaveAttribute("aria-current", "page");
    expect(within(menu()).getAllByRole("link", { current: "page" })).toHaveLength(1);
  });

  it("porta direta é Link; item da sub-sidebar é só texto", () => {
    render(arvore());
    expect(within(menu()).getByRole("link", { name: "Funil de pacientes" })).toHaveAttribute("href", "/app/kanban");
    expect(within(sub("Pacientes")).getByRole("link", { name: "Prospecção" }).querySelector("svg")).toBeNull();
  });

  it("porta com um item visível navega direto, sem sub-sidebar", () => {
    estado.auth = {
      user: { is_platform_admin: false, support: null },
      activeOrg: {
        orgId: "org-1",
        name: "Org",
        role: "agent",
        modulos_ligados: ["menu_convexy"],
        interface_settings: { preset: "completa", destinos: ["/app/inbox"] },
      },
    };
    estado.pathname = "/app/inbox";
    render(arvore());
    expect(within(menu()).getByRole("link", { name: "Conversas" })).toHaveAttribute("href", "/app/inbox");
    expect(screen.queryByRole("navigation", { name: "Conversas" })).toBeNull();
  });

  it("o item ativo acompanha o caminho", () => {
    const { rerender } = render(arvore());
    estado.pathname = "/app/prospecting";
    rerender(arvore());
    expect(within(sub("Pacientes")).getByRole("link", { name: "Prospecção" })).toHaveAttribute("aria-current", "page");
  });
});

describe("abrir, fechar e foco (tela larga)", () => {
  it("clicar numa porta vai à primeira tela visível — e nunca chama toggleSidebar", () => {
    render(arvore());
    const ia = within(menu()).getByRole("button", { name: "Assistente de IA" });
    fireEvent.click(ia);
    expect(estado.push).toHaveBeenCalledWith("/app/ai/agents");
    expect(ia).toHaveAttribute("aria-expanded", "true");
    expect(estado.toggleSidebar).not.toHaveBeenCalled();
  });

  it("o × fecha (a sub-sidebar recolhe a largura e sai da árvore acessível) e devolve o foco à porta", () => {
    render(arvore());
    const invólucroAntes = involucro("Pacientes");
    expect(invólucroAntes).toHaveClass("lg:w-60");
    fireEvent.click(screen.getByRole("button", { name: "Fechar Pacientes" }));
    expect(screen.queryByRole("navigation", { name: "Pacientes" })).toBeNull();
    expect(invólucroAntes).toHaveClass("lg:w-0");
    const porta = within(menu()).getByRole("button", { name: "Pacientes" });
    expect(porta).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(porta);
  });

  it("Esc dentro da sub-sidebar faz o mesmo", () => {
    render(arvore());
    fireEvent.keyDown(sub("Pacientes"), { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Pacientes" })).toBeNull();
    expect(document.activeElement).toBe(within(menu()).getByRole("button", { name: "Pacientes" }));
  });

  it("clicar de novo na porta ativa reabre, sem navegar", () => {
    render(arvore());
    fireEvent.click(screen.getByRole("button", { name: "Fechar Pacientes" }));
    fireEvent.click(within(menu()).getByRole("button", { name: "Pacientes" }));
    expect(sub("Pacientes")).toBeInTheDocument();
    expect(estado.push).not.toHaveBeenCalled();
  });

  it("sem animação na primeira pintura; anima quando a pessoa abre", () => {
    render(arvore());
    expect(sub("Pacientes").querySelector("[data-animar]")).toHaveAttribute("data-animar", "false");
    fireEvent.click(within(menu()).getByRole("button", { name: "Assistente de IA" }));
    expect(sub("Assistente de IA").querySelector("[data-animar]")).toHaveAttribute("data-animar", "true");
  });

  it("a alça some com a sub-sidebar aberta em tela larga", () => {
    render(arvore());
    expect(screen.getByRole("button", { name: "Recolher sidebar" })).toHaveClass("lg:hidden");
  });
});

describe("largura intermediária (md–lg)", () => {
  beforeEach(() => {
    estado.larga = false;
  });

  it("aberta sozinha fica fora da tela abaixo de lg, e a porta diz que não está expandida", () => {
    render(arvore());
    expect(involucro("Pacientes")).toHaveClass("hidden", "lg:block");
    expect(within(menu()).getByRole("button", { name: "Pacientes" })).toHaveAttribute("aria-expanded", "false");
  });

  it("aberta por clique cobre a página, o foco entra nela, e Esc no documento fecha só a sobreposição", () => {
    render(arvore());
    const porta = within(menu()).getByRole("button", { name: "Pacientes" });
    fireEvent.click(porta);
    expect(involucro("Pacientes")).toHaveClass("absolute", "lg:static");
    expect(porta).toHaveAttribute("aria-expanded", "true");
    expect(document.activeElement).toBe(within(sub("Pacientes")).getAllByRole("link")[0]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(involucro("Pacientes")).toHaveClass("hidden", "lg:block");
    expect(document.activeElement).toBe(porta);
    // Só a sobreposição fechou: em tela larga a porta ativa continua aberta.
    expect(involucro("Pacientes")).toHaveClass("lg:w-60");
  });

  it("clicar no fundo fecha a sobreposição; o fundo tem a largura do resto da tela", () => {
    render(arvore());
    fireEvent.click(within(menu()).getByRole("button", { name: "Pacientes" }));
    const fundo = menu().querySelector(".bg-overlay") as HTMLElement;
    expect(fundo).toHaveClass("w-[calc(100vw-100%)]", "lg:hidden");
    fireEvent.click(fundo);
    expect(involucro("Pacientes")).toHaveClass("hidden", "lg:block");
  });

  it("escolher um item fecha a sobreposição", () => {
    render(arvore());
    fireEvent.click(within(menu()).getByRole("button", { name: "Pacientes" }));
    fireEvent.click(within(sub("Pacientes")).getByRole("link", { name: "Produtos" }));
    expect(involucro("Pacientes")).toHaveClass("hidden", "lg:block");
  });
});

describe("orientações instaladas na porta Contatos", () => {
  it("cada orientação é item com ícone (o único item de sub-sidebar com ícone)", () => {
    estado.orientacoes = { itens: [{ href: "/app/extensions/i-1", rotulo: "Roteiro da clínica" }], indisponivel: false };
    render(arvore());
    const guia = within(sub("Pacientes")).getByRole("link", { name: "Roteiro da clínica" });
    expect(guia).toHaveAttribute("href", "/app/extensions/i-1");
    expect(guia.querySelector("svg")).not.toBeNull();
  });

  it("sem conseguir ler, o aviso leva a Extensões", () => {
    estado.orientacoes = { itens: [], indisponivel: true };
    render(arvore());
    expect(
      within(sub("Pacientes")).getByRole("link", { name: "Não foi possível conferir as orientações instaladas" }),
    ).toHaveAttribute("href", "/app/extensions");
  });
});

describe("saúde, atualização e alça", () => {
  it("o ponto de saúde de Conexões sobe para a porta Configurações", () => {
    render(arvore());
    expect(within(within(menu()).getByRole("button", { name: "Configurações" })).getByTestId("saude")).toBeInTheDocument();
  });

  it("Atualização do sistema só para o admin de plataforma fora do suporte", () => {
    estado.pathname = "/app/settings/profile";
    estado.auth = { ...estado.auth, user: { is_platform_admin: true, support: null } };
    const { unmount } = render(arvore());
    expect(within(sub("Configurações")).getByRole("link", { name: "Atualização do sistema" })).toHaveAttribute(
      "href",
      "/app/settings/atualizacao",
    );
    unmount();
    estado.auth = {
      ...estado.auth,
      user: { is_platform_admin: true, support: { status: "active" } as unknown as NonNullable<AuthUser["support"]> },
    };
    render(arvore());
    expect(within(sub("Configurações")).queryByRole("link", { name: "Atualização do sistema" })).toBeNull();
  });

  it("a alça usa o cookie e a ação de sempre", () => {
    estado.pathname = "/app/kanban";
    render(arvore());
    fireEvent.click(screen.getByRole("button", { name: "Recolher sidebar" }));
    expect(estado.toggleSidebar).toHaveBeenCalledWith(false);
  });

  it("recolhido: a alça fica à vista, e o nome continua sendo o nome acessível da porta", () => {
    estado.pathname = "/app/kanban";
    render(arvore(true));
    expect(screen.getByRole("button", { name: "Expandir sidebar" })).toHaveClass("opacity-100");
    expect(within(menu()).getByRole("link", { name: "Funil de pacientes" })).toBeInTheDocument();
  });
});

describe("hidratação", () => {
  it("o HTML do servidor hidrata sem erro recuperável", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(arvore());
    document.body.appendChild(container);
    const recuperaveis: unknown[] = [];
    let raiz: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      raiz = hydrateRoot(container, arvore(), { onRecoverableError: (erro) => recuperaveis.push(erro) });
    });
    expect(recuperaveis).toEqual([]);
    act(() => raiz?.unmount());
    container.remove();
  });
});
```

Criar `tests/unit/convexy-menu-estrutura.test.ts`:
```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Convexy — cercas de texto do menu novo. `barra-lateral-nao-flutua` lê só o
 * `Sidebar.tsx` e o `AppShell.tsx` do original; o trilho da Convexy mora em outro
 * arquivo e precisa da mesma cerca, mais as medidas, os tokens e o movimento da
 * spec (docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 4) e do
 * protótipo aprovado (rodada 2).
 */
const RAIZ = process.cwd();
const leia = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (fonte: string) => fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function arquivos(dir: string): string[] {
  return readdirSync(join(RAIZ, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? arquivos(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  );
}

const DA_CONVEXY = arquivos("components/convexy").filter((f) => /\.(tsx?|css)$/.test(f));
const TUDO = DA_CONVEXY.map((f) => semComentarios(leia(f))).join("\n");
const MENU = semComentarios(leia("components/convexy/menu/MenuConvexy.tsx"));
const CSS = semComentarios(leia("components/convexy/menu/menu.css"));

describe("o trilho ocupa lugar, como o Sidebar do original", () => {
  it("é sticky, da altura da tela, não encolhe e não flutua", () => {
    expect(MENU).toMatch(/sticky top-0/);
    expect(MENU).toMatch(/h-screen/);
    expect(MENU).toMatch(/shrink-0/);
    expect(MENU).not.toMatch(/\bfixed\b/);
  });

  it("a casca troca só o menu e mantém o contrato do rodapé", () => {
    const casca = leia("app/app/_components/AppShell.tsx");
    expect(casca).toMatch(/useOcupacaoDoRodape\(\)/);
    expect(casca).toMatch(/estiloDaReserva\(/);
    expect(casca).toContain("<MenuConvexy recolhido={sidebarCollapsed} />");
    expect(casca).toContain("<Sidebar collapsed={sidebarCollapsed} />");
    expect(casca).not.toMatch(/\bml-(?:16|60)\b/);
  });
});

describe("as medidas da spec e do protótipo estão no código", () => {
  it.each([
    ["menu largo de 236px", "w-[236px]"],
    ["trilho compacto de 64px", "w-16"],
    ["sub-sidebar de 240px", "w-60"],
    ["porta de 38px", "h-[38px]"],
    ["porta compacta de 40px", "h-10"],
    ["texto da porta de 14,5px", "text-[14.5px]"],
    ["ícone da porta de 19px", "size-[19px]"],
    ["ícone compacto de 20px", "size-5"],
    ["item de 32px", "min-h-8"],
    ["texto do item de 13,5px", "text-[13.5px]"],
    ["título da sub-sidebar de 15,5px", "text-[15.5px]"],
    ["recuo do item no hover", "hover:pl-[13px]"],
    ["alça a 44px do topo", "top-11"],
    ["largura em 300ms", "duration-300"],
    ["realces em 200ms", "duration-200"],
    ["curva da spec", "cubic-bezier(.2,.8,.2,1)"],
    ["afundar no clique", "active:scale-[.97]"],
    ["sem afundar com movimento reduzido", "motion-reduce:active:scale-100"],
    ["fundo da sobreposição sem rolagem horizontal", "w-[calc(100vw-100%)]"],
    ["rolagem contida no trilho e na lista", "overscroll-contain"],
    ["dica da descrição depois de 500ms", "delayDuration={500}"],
  ])("%s", (_medida, classe) => {
    expect(TUDO).toContain(classe);
  });
});

describe("tema, foco e movimento", () => {
  it("nenhuma cor literal em components/convexy — só tokens", () => {
    expect(TUDO).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
  });

  it("foco visível com `outline-hidden`, nunca `outline-none`", () => {
    expect(TUDO).not.toMatch(/(?<=[\s"'`:])outline-none(?=[\s"'`!]|$)/);
    expect(TUDO).toContain("focus-visible:outline-hidden");
  });

  it("rótulo de grupo em text-muted (contraste AA no escuro)", () => {
    expect(semComentarios(leia("components/convexy/menu/ListaDaPorta.tsx"))).toMatch(/uppercase[^"]*text-text-muted|text-text-muted[^"]*uppercase/);
  });

  it("toda animação mora dentro de prefers-reduced-motion: no-preference", () => {
    const bloco = "@media (prefers-reduced-motion: no-preference)";
    expect(CSS).toContain(bloco);
    expect(CSS.slice(0, CSS.indexOf(bloco))).not.toMatch(/animation:/);
    expect(CSS.slice(CSS.indexOf(bloco))).toMatch(/animation:/);
  });

  it("a barra do ativo só cresce (scale), sem translate nos keyframes", () => {
    const barra = CSS.slice(CSS.indexOf("@keyframes convexy-barra-cresce"));
    const corpo = barra.slice(0, barra.indexOf("}\n}") + 3);
    expect(corpo).toMatch(/scale:\s*1 0/);
    expect(corpo).not.toMatch(/translate|transform/);
  });

  it("toda transição dos componentes do menu desliga com movimento reduzido", () => {
    for (const arquivo of DA_CONVEXY.filter((f) => f.endsWith(".tsx"))) {
      const fonte = semComentarios(leia(arquivo));
      if (/\btransition(?:-|\s|")/.test(fonte)) expect(fonte, arquivo).toContain("motion-reduce:transition-none");
    }
  });
});
```

- [ ] **Step 2: Fase vermelha no CI (Review Focus 3)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
git add tests/unit/convexy-menu-desktop.test.tsx tests/unit/convexy-menu-estrutura.test.ts
git commit -m "test(convexy): menu no desktop, a compactação nunca chama toggleSidebar — vermelho antes (spec 4)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow ci.yml --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "ci.yml run=$id exit=$?"
gh run view "$id" -R victorrabyfs/DeskcommCRM --log-failed > "$S/vermelho-rf3-$sha.log"
grep -aE "convexy-menu-(desktop|estrutura)" "$S/vermelho-rf3-$sha.log" | head -10
```
Expected: `exit` diferente de 0 **por causa destes dois arquivos** (componentes ainda inexistentes); anotar o id do run. Outro arquivo vermelho: parar e investigar.

- [ ] **Step 3: `MarcaDaBarra` extraída do `Sidebar.tsx` (recorte, sem mudar uma classe)**

Em `components/shell/Sidebar.tsx`:
1. **Recortar** o bloco que começa em `  const brand = useMarcaDaInstalacao();` (`:85`) e termina na linha anterior a `  return (` (`:124`, a de `const marcaDoProduto = …`), com os comentários dele.
2. **Recortar** o primeiro filho do fragmento do `return` — o `<div className={cn("flex h-14 items-center border-b px-4", …)}>` inteiro, de `:127` até o `</div>` de `:189` (a linha seguinte é `      {/*` que abre "A DENSIDADE É MEDIDA").
3. No lugar do item 2 (logo depois de `    <>`), escrever:
```tsx
      <MarcaDaBarra collapsed={collapsed} />
```
4. Depois do fim de `SidebarContent` (o `}` de `:371`) e antes de `export function Sidebar(`, acrescentar a função, com o bloco do item 1 como corpo e o `<div>` do item 2 como retorno, **byte a byte**:
```tsx
/**
 * O cabeçalho da barra, com a marca (logo claro, logo escuro, moldura, símbolo
 * ou inicial recolhidos).
 *
 * Convexy: extraído do `SidebarContent` SEM mudar uma classe, para o menu da
 * Convexy desenhar o mesmo logo sem copiar esta lógica. Reaplicar ao atualizar
 * o upstream: CONVEXY.md, "Menu novo" (inclui o caso "Logo maior").
 */
export function MarcaDaBarra({ collapsed }: { collapsed: boolean }) {
  const { activeOrg } = useAuth();
  // ⇣ aqui entra, sem mudança, o bloco recortado no item 1 (`const brand = …` até `const marcaDoProduto = …`)
  return (
    // ⇣ aqui entra, sem mudança, o <div className={cn("flex h-14 …")}> … </div> recortado no item 2
  );
}
```
(As duas linhas `// ⇣` são instrução deste plano: no arquivo ficam só o bloco e o `<div>` recortados.) Os imports continuam os mesmos (`useMarcaDaInstalacao`, `marcaEhADoProduto`, `LogotipoDoProduto`, `SimboloDoProduto`, `useAuth`, `cn` seguem usados). Conferência (só leitura):
```bash
git diff -U0 components/shell/Sidebar.tsx | grep -E '^[-+]' | grep -vE '^(\+\+\+|---)' | sed 's/^[-+]//' | sort | uniq -u
```
Expected: só as linhas novas (o comentário, `export function MarcaDaBarra…`, `const { activeOrg } = useAuth();`, `return (`, `);`, `}`, `<MarcaDaBarra collapsed={collapsed} />`) — nenhuma linha do logo aparece como só removida ou só acrescentada.


- [ ] **Step 4: `components/convexy/menu/menu.css`**

```css
/* ─────────────────────────────────────────────────────────────────────────
   Convexy — o movimento do menu novo (spec
   docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, seção 4, e
   o protótipo aprovado, rodada 2). Registro: CONVEXY.md, "Menu novo".

   CSS à mão, como `.card-pulse` do app/globals.css: o `tailwindcss-animate`
   não está instalado. Só anima com movimento permitido — fora deste media
   query nada se mexe. `data-animar` só vira "true" depois de a pessoa abrir
   uma porta: a primeira pintura (link direto, recarregar, voltar) nunca anima.
   As propriedades individuais (`scale`, `translate`) não disputam o
   `transform` dos utilitários.
   ───────────────────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: no-preference) {
  .convexy-sub-conteudo[data-animar="true"] {
    animation: convexy-sub-entra 300ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  /* Os grupos entram em cascata: a ordem vem de `--convexy-ordem`. */
  .convexy-sub-conteudo[data-animar="true"] .convexy-grupo {
    animation: convexy-grupo-entra 350ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: calc(var(--convexy-ordem, 0) * 60ms);
  }

  /* A barra do ativo cresce a partir do centro. */
  .convexy-barra[data-animar="true"] {
    animation: convexy-barra-cresce 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
}

@keyframes convexy-sub-entra {
  from {
    opacity: 0;
    translate: -10px 0;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

@keyframes convexy-grupo-entra {
  from {
    opacity: 0;
    translate: 0 6px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

@keyframes convexy-barra-cresce {
  from {
    scale: 1 0;
  }
  to {
    scale: 1 1;
  }
}
```

- [ ] **Step 5: `lib/convexy/orientacoes.ts`**

```ts
/**
 * As ORIENTAÇÕES INSTALADAS no menu da Convexy (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.4): o único
 * conteúdo exclusivo do hub `/app/crm`, que vira um grupo da porta Contatos.
 * A rota `GET /api/v1/convexy/orientacoes` devolve esta forma; o menu a lê por
 * `components/convexy/menu/useOrientacoes.ts`.
 */
export interface RespostaDasOrientacoes {
  /** O título do guia vem no idioma de quem pediu. */
  readonly orientacoes: ReadonlyArray<{ readonly installation_id: string; readonly titulo: string }>;
  /** Não deu para ler: o menu mostra o aviso e leva a Extensões, como o hub fazia. */
  readonly indisponivel: boolean;
}

/** Cada orientação leva à tela da extensão. */
export function hrefDaOrientacao(installationId: string): string {
  return `/app/extensions/${encodeURIComponent(installationId)}`;
}
```

- [ ] **Step 6: `components/convexy/menu/useMenuConvexy.ts`**

```ts
"use client";
import { useMemo } from "react";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { useConvexy } from "@/lib/convexy/contexto";
import { montarMenu, type PortaDoMenu } from "@/lib/convexy/menu/montar";
import { NICHO_PADRAO } from "@/lib/convexy/nicho";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { searchable } from "@/lib/navigation/registry";

/**
 * As portas de quem está logado (spec 3.5): `searchable()` com os mesmos quatro
 * argumentos da busca ⌘K e do `Sidebar` do original. O primeiro é
 * `user.is_platform_admin && !user.support`, que também decide a tela de
 * atualização — a regra do `VersionFooter`.
 */
export function useMenuConvexy(): readonly PortaDoMenu[] {
  const { user, activeOrg } = useAuth();
  const convexy = useConvexy();
  const idioma = useIdioma();
  const plataforma = user.is_platform_admin && !user.support;
  const nicho = convexy?.nicho ?? NICHO_PADRAO;
  const role = activeOrg?.role ?? null;
  const interfaceSettings = activeOrg?.interface_settings;
  const modulos = activeOrg?.modulos_ligados;
  return useMemo(
    () =>
      montarMenu({
        visiveis: searchable(plataforma, role, interfaceSettings, modulos ?? []),
        atualizacao: plataforma,
        nicho,
        idioma,
      }),
    [plataforma, role, interfaceSettings, modulos, nicho, idioma],
  );
}
```

- [ ] **Step 7: `components/convexy/menu/useLarguraLarga.ts`**

```ts
"use client";
import { useSyncExternalStore } from "react";

/**
 * A tela está em `lg` (≥ 1024px)? Só para o `aria-expanded` da porta e para o
 * foco da sobreposição: o que se VÊ entre `md` e `lg` é decidido por CSS, para
 * o SSR acertar em qualquer largura. O servidor — e o jsdom, sem `matchMedia` —
 * respondem "larga"; o navegador corrige depois da hidratação, sem divergência.
 */
const CONSULTA = "(min-width: 1024px)";

function assinar(avisar: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const lista = window.matchMedia(CONSULTA);
  lista.addEventListener("change", avisar);
  return () => lista.removeEventListener("change", avisar);
}

function agora(): boolean {
  return typeof window.matchMedia !== "function" || window.matchMedia(CONSULTA).matches;
}

export function useLarguraLarga(): boolean {
  return useSyncExternalStore(assinar, agora, () => true);
}
```

- [ ] **Step 8: `components/convexy/menu/useOrientacoes.ts`**

```ts
"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { hrefDaOrientacao, type RespostaDasOrientacoes } from "@/lib/convexy/orientacoes";

export interface EstadoDasOrientacoes {
  readonly itens: ReadonlyArray<{ readonly href: string; readonly rotulo: string }>;
  readonly indisponivel: boolean;
}

/**
 * As orientações instaladas, carregadas quando a porta Contatos abre (spec 3.4).
 * Uma chave só no react-query: desktop e gaveta dividem o cache, e depois da
 * primeira leitura os itens seguem disponíveis com a consulta desligada.
 * Falha de rede vale como "não deu para ler" — o aviso aparece, como no hub.
 */
export function useOrientacoes(consultar: boolean): EstadoDasOrientacoes {
  const { data, isError } = useQuery({
    queryKey: ["convexy", "orientacoes"],
    queryFn: async () =>
      (await apiClient.get<{ data: RespostaDasOrientacoes }>("/api/v1/convexy/orientacoes")).data,
    enabled: consultar,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return {
    itens: (data?.orientacoes ?? []).map((o) => ({ href: hrefDaOrientacao(o.installation_id), rotulo: o.titulo })),
    indisponivel: isError || data?.indisponivel === true,
  };
}
```

- [ ] **Step 9: `components/convexy/menu/BotaoDaPorta.tsx`**

```tsx
"use client";
import Link from "next/link";
import { useState } from "react";

import { ConnectionHealthDot } from "@/components/connections/ConnectionHealthDot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PortaDoMenu } from "@/lib/convexy/menu/montar";
import { CaretRight } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

export interface BotaoDaPortaProps {
  readonly porta: PortaDoMenu;
  readonly ativa: boolean;
  /** `undefined` na gaveta do celular: lá a porta troca o conteúdo, não expande nada. */
  readonly expandida?: boolean;
  /** Recolhido pela alça (cookie `sidebar_collapsed`): só ícones em qualquer largura. */
  readonly recolhido: boolean;
  /** Compactado pela sub-sidebar aberta: só ícones em tela larga, por CSS (`lg:`). */
  readonly compactaEmTelaLarga: boolean;
  /** O nome aparece como dica (hover e foco) — o trilho está só com ícones. */
  readonly mostrarNome: boolean;
  readonly animar: boolean;
  readonly controla?: string;
  readonly aoAbrir: () => void;
  readonly aoNavegar?: () => void;
}

/**
 * Uma porta do menu (spec 4; protótipo, rodada 2). Com sub-sidebar é
 * `<button aria-expanded aria-controls>`; com um item só é `<Link>`. Ativa:
 * fundo `accent-soft`, texto na cor do acento, seminegrito e a barra encostada
 * na borda do trilho. O Tooltip envolve SEMPRE, e é controlado: a árvore não
 * muda quando o trilho compacta, então o botão não é recriado e o foco não se
 * perde. `data-porta` é por onde o menu devolve o foco (Esc, ×, ‹ Voltar).
 */
export function BotaoDaPorta({
  porta,
  ativa,
  expandida,
  recolhido,
  compactaEmTelaLarga,
  mostrarNome,
  animar,
  controla,
  aoAbrir,
  aoNavegar,
}: BotaoDaPortaProps) {
  const [dica, setDica] = useState(false);
  const Icone = porta.Icone;
  const classe = cn(
    "group relative flex h-[38px] w-full items-center gap-3 rounded-md px-3 text-[14.5px] transition-[background-color,color,scale] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-[.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none motion-reduce:active:scale-100",
    ativa ? "bg-accent-soft font-semibold text-accent" : "text-text-muted hover:bg-surface-elevated hover:text-text",
    recolhido && "h-10 justify-center px-0",
    compactaEmTelaLarga && "lg:h-10 lg:justify-center lg:px-0",
  );
  const conteudo = (
    <>
      <span
        aria-hidden
        data-animar={animar}
        className={cn(
          "convexy-barra absolute top-[9px] bottom-[9px] -left-2 w-[3px] origin-center rounded-r-full bg-accent",
          !ativa && "hidden",
        )}
      />
      <Icone
        aria-hidden
        weight={ativa ? "fill" : "regular"}
        className={cn("size-[19px] shrink-0", recolhido && "size-5", compactaEmTelaLarga && "lg:size-5")}
      />
      <span className={cn("min-w-0 flex-1 truncate text-left", recolhido && "sr-only", compactaEmTelaLarga && "lg:sr-only")}>
        {porta.rotulo}
      </span>
      {porta.healthDot ? (
        <ConnectionHealthDot
          className={cn(
            recolhido ? "absolute top-1.5 right-1.5" : "ml-auto",
            compactaEmTelaLarga && "lg:absolute lg:top-1.5 lg:right-1.5 lg:ml-0",
          )}
        />
      ) : null}
      {porta.direta ? null : (
        <CaretRight
          aria-hidden
          className={cn(
            "size-4 shrink-0 opacity-50 transition-[opacity,translate] duration-[250ms] group-hover:translate-x-0.5 group-hover:opacity-90 motion-reduce:transition-none",
            recolhido && "hidden",
            compactaEmTelaLarga && "lg:hidden",
          )}
        />
      )}
    </>
  );
  const elemento = porta.direta ? (
    <Link
      data-porta={porta.id}
      href={porta.itens[0]!.href}
      aria-current={ativa ? "page" : undefined}
      onClick={aoNavegar}
      className={classe}
    >
      {conteudo}
    </Link>
  ) : (
    <button
      data-porta={porta.id}
      type="button"
      aria-expanded={expandida}
      aria-controls={controla}
      onClick={aoAbrir}
      className={classe}
    >
      {conteudo}
    </button>
  );
  return (
    <Tooltip open={mostrarNome && dica} onOpenChange={setDica} delayDuration={150}>
      <TooltipTrigger asChild>{elemento}</TooltipTrigger>
      <TooltipContent side="right">{porta.rotulo}</TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 10: `components/convexy/menu/ListaDaPorta.tsx`**

```tsx
"use client";
import Link from "next/link";
import type { CSSProperties } from "react";

import { ConnectionHealthDot } from "@/components/connections/ConnectionHealthDot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { PORTA_DAS_ORIENTACOES } from "@/lib/convexy/menu/mapa";
import type { ItemDoMenu, PortaDoMenu } from "@/lib/convexy/menu/montar";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { PuzzlePiece, Warning } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import type { EstadoDasOrientacoes } from "./useOrientacoes";

function classeDoItem(ativo: boolean): string {
  return cn(
    "flex min-h-8 items-center gap-2 rounded-md px-2.5 py-[5px] text-[13.5px] leading-snug transition-[background-color,color,padding] duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none",
    ativo ? "bg-accent-soft font-semibold text-accent" : "text-text-muted hover:bg-surface-elevated hover:pl-[13px] hover:text-text",
  );
}

const ordem = (n: number) => ({ "--convexy-ordem": n }) as CSSProperties;
const CLASSE_DO_ROTULO = "px-2.5 pt-0.5 pb-[3px] text-[11px] font-semibold tracking-wider text-text-muted uppercase";

/**
 * Os grupos e itens de uma porta — o conteúdo da sub-sidebar (desktop) e da
 * gaveta (celular). Itens só com texto (ícone só nas orientações, que não têm
 * outro sinal de origem); nome longo quebra a linha; a descrição do catálogo é
 * a dica do item (500ms, e no foco). Na porta Contatos, o grupo "Orientações
 * instaladas" (spec 3.4).
 */
export function ListaDaPorta({
  porta,
  ativoHref,
  orientacoes,
  aoEscolher,
}: {
  porta: PortaDoMenu;
  ativoHref: string | null;
  orientacoes: EstadoDasOrientacoes;
  aoEscolher: () => void;
}) {
  const t = useT();
  const idioma = useIdioma();
  const comOrientacoes =
    porta.id === PORTA_DAS_ORIENTACOES && (orientacoes.itens.length > 0 || orientacoes.indisponivel);
  return (
    <>
      {porta.grupos.map((grupo, n) => (
        <section key={grupo.id} aria-label={grupo.rotulo ?? undefined} className="convexy-grupo mt-3.5 first:mt-0" style={ordem(n)}>
          {grupo.rotulo ? <h3 className={CLASSE_DO_ROTULO}>{grupo.rotulo}</h3> : null}
          <ul className="space-y-0.5">
            {grupo.itens.map((item) => (
              <li key={item.href}>
                <ItemDaLista item={item} ativo={item.href === ativoHref} aoEscolher={aoEscolher} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {comOrientacoes ? (
        <section
          aria-label={texto(TEXTOS.grupos.orientacoes, idioma)}
          className="convexy-grupo mt-3.5"
          style={ordem(porta.grupos.length)}
        >
          <h3 className={CLASSE_DO_ROTULO}>{texto(TEXTOS.grupos.orientacoes, idioma)}</h3>
          <ul className="space-y-0.5">
            {orientacoes.indisponivel ? (
              <li>
                <Link href="/app/extensions" onClick={aoEscolher} className={classeDoItem(false)}>
                  <Warning aria-hidden className="size-4 shrink-0 text-warning-fg" />
                  <span className="min-w-0 flex-1 break-words">
                    {t("Não foi possível conferir as orientações instaladas")}
                  </span>
                </Link>
              </li>
            ) : (
              orientacoes.itens.map((o) => (
                <li key={o.href}>
                  <Link
                    href={o.href}
                    aria-current={o.href === ativoHref ? "page" : undefined}
                    onClick={aoEscolher}
                    className={classeDoItem(o.href === ativoHref)}
                  >
                    <PuzzlePiece aria-hidden className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 break-words">{o.rotulo}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function ItemDaLista({ item, ativo, aoEscolher }: { item: ItemDoMenu; ativo: boolean; aoEscolher: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={item.href} aria-current={ativo ? "page" : undefined} onClick={aoEscolher} className={classeDoItem(ativo)}>
          <span className="min-w-0 flex-1 break-words">{item.rotulo}</span>
          {item.healthDot ? <ConnectionHealthDot className="ml-auto" /> : null}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{item.descricao}</TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 11: `components/convexy/menu/SubSidebar.tsx`**

```tsx
"use client";
import type { PortaDoMenu } from "@/lib/convexy/menu/montar";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { X } from "@/lib/ui/icons";

import { ListaDaPorta } from "./ListaDaPorta";
import type { EstadoDasOrientacoes } from "./useOrientacoes";

/**
 * A sub-sidebar de uma porta (spec 4): caixa fixa de 240px (quem anima a
 * largura é o invólucro, no `MenuConvexy`, para o conteúdo não pular), título de
 * 15,5px com × afastado da borda, lista que rola por dentro sem arrastar a
 * página. Esc chama `aoEsc` (fechar em tela larga; só a sobreposição entre `md`
 * e `lg`), e o foco volta à porta por quem fecha.
 */
export function SubSidebar({
  id,
  porta,
  ativoHref,
  animar,
  orientacoes,
  aoEsc,
  aoFechar,
  aoEscolher,
}: {
  id: string;
  porta: PortaDoMenu;
  ativoHref: string | null;
  animar: boolean;
  orientacoes: EstadoDasOrientacoes;
  aoEsc: () => void;
  aoFechar: () => void;
  aoEscolher: () => void;
}) {
  const idioma = useIdioma();
  return (
    <nav
      id={id}
      aria-label={porta.rotulo}
      onKeyDown={(evento) => {
        if (evento.key !== "Escape") return;
        evento.stopPropagation();
        aoEsc();
      }}
      className="flex h-full w-60 flex-col border-r border-border bg-surface"
    >
      <div data-animar={animar} className="convexy-sub-conteudo flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 pt-3.5 pr-3 pb-2 pl-5">
          <h2 className="min-w-0 truncate text-[15.5px] font-semibold text-text">{porta.rotulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label={`${texto(TEXTOS.menu.fechar, idioma)} ${porta.rotulo}`}
            className="grid size-7 shrink-0 place-items-center rounded-md text-text-subtle transition-[background-color,color] duration-200 hover:bg-surface-elevated hover:text-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-5">
          <ListaDaPorta porta={porta} ativoHref={ativoHref} orientacoes={orientacoes} aoEscolher={aoEscolher} />
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 12: `components/convexy/menu/MenuConvexy.tsx`**

```tsx
"use client";
import "./menu.css";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { toggleSidebar } from "@/app/actions/shell/toggleSidebar";
import { MarcaDaBarra } from "@/components/shell/Sidebar";
import { VersionFooter } from "@/components/shell/VersionFooter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { ativoNoCaminho } from "@/lib/convexy/menu/dono";
import { PORTA_DAS_ORIENTACOES, type PortaId } from "@/lib/convexy/menu/mapa";
import type { PortaDoMenu } from "@/lib/convexy/menu/montar";
import { CaretLeft } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { BotaoDaPorta } from "./BotaoDaPorta";
import { SubSidebar } from "./SubSidebar";
import { useLarguraLarga } from "./useLarguraLarga";
import { useMenuConvexy } from "./useMenuConvexy";
import { useOrientacoes } from "./useOrientacoes";

/** A sub-sidebar é uma só; toda porta com sub a controla. */
const ID_DA_SUB_SIDEBAR = "menu-convexy-sub";

function focarPorta(id: PortaId) {
  document.querySelector<HTMLElement>(`[data-menu-convexy] [data-porta="${id}"]`)?.focus();
}

/**
 * O MENU DA CONVEXY no desktop (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3 e 4).
 *
 * Vive no layout do app, que persiste entre as telas: navegar não recria nada.
 * A porta ativa vem de `usePathname()` — que o SSR já tem —, então link direto,
 * recarregar, voltar e avançar abrem certo, sem animação na primeira pintura.
 *
 * Estado, todo de tela:
 *  - `fechadas`: portas fechadas no × nesta aba (Decisão 9 do plano);
 *  - `escolha`: a porta clicada, até a navegação chegar;
 *  - `sobreposicao`: aberta por clique; entre `md` e `lg` cobre a página. Vale
 *    enquanto o caminho é o de quando abriu (ou o destino do clique): navegar por
 *    outro caminho a desfaz, sem efeito que grave estado.
 * A compactação automática (sub aberta) é CSS em `lg:` e nunca chama
 * `toggleSidebar`; só a alça chama, e o servidor desenha certo pelo cookie.
 */
export function MenuConvexy({ recolhido }: { recolhido: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const portas = useMenuConvexy();
  const larga = useLarguraLarga();
  const [fechadas, setFechadas] = useState<ReadonlySet<PortaId>>(() => new Set());
  const [escolha, setEscolha] = useState<{ porta: PortaId; noCaminho: string } | null>(null);
  const [sobreposicao, setSobreposicao] = useState<{ noCaminho: string; destino: string | null } | null>(null);
  const [animar, setAnimar] = useState(false);
  const [trocando, startTransition] = useTransition();

  const escolhida = escolha && escolha.noCaminho === pathname ? escolha.porta : null;
  const prevista = escolhida ?? ativoNoCaminho(pathname, portas)?.porta ?? null;
  const orientacoes = useOrientacoes(prevista === PORTA_DAS_ORIENTACOES);
  const ativo = ativoNoCaminho(pathname, portas, orientacoes.itens.map((o) => o.href));
  const idExibida = escolhida ?? ativo?.porta ?? null;
  const exibida = portas.find((p) => p.id === idExibida && !p.direta) ?? null;
  const aberta = exibida !== null && !fechadas.has(exibida.id);
  const sobrepondo =
    aberta && sobreposicao !== null && (pathname === sobreposicao.noCaminho || pathname === sobreposicao.destino);
  const compactaEmTelaLarga = aberta && !recolhido;
  const mostrarNome = recolhido || (compactaEmTelaLarga && larga);
  const idParaFoco = exibida?.id ?? null;

  // Entre `md` e `lg`, a sobreposição recebe o foco e fecha com Esc em qualquer
  // lugar do documento. O efeito só assina e desassina; quem muda estado é o evento.
  useEffect(() => {
    if (!sobrepondo || larga) return;
    document.querySelector<HTMLElement>(`#${ID_DA_SUB_SIDEBAR} a`)?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setSobreposicao(null);
      if (idParaFoco) focarPorta(idParaFoco);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [sobrepondo, larga, idParaFoco]);

  function abrir(porta: PortaDoMenu) {
    const vaiNavegar = ativo?.porta !== porta.id;
    const destino = porta.itens[0]!.href;
    setAnimar(true);
    setSobreposicao({ noCaminho: pathname, destino: vaiNavegar ? destino : null });
    setFechadas((antes) => {
      if (!antes.has(porta.id)) return antes;
      const proximas = new Set(antes);
      proximas.delete(porta.id);
      return proximas;
    });
    if (vaiNavegar) {
      setEscolha({ porta: porta.id, noCaminho: pathname });
      router.push(destino);
    }
  }

  function fechar() {
    if (!exibida) return;
    setFechadas((antes) => new Set(antes).add(exibida.id));
    setSobreposicao(null);
    focarPorta(exibida.id);
  }

  function fecharSobreposicao() {
    setSobreposicao(null);
    if (exibida) focarPorta(exibida.id);
  }

  function botao(porta: PortaDoMenu) {
    return (
      <BotaoDaPorta
        porta={porta}
        ativa={idExibida === porta.id}
        expandida={aberta && exibida?.id === porta.id && (larga || sobrepondo)}
        recolhido={recolhido}
        compactaEmTelaLarga={compactaEmTelaLarga}
        mostrarNome={mostrarNome}
        animar={animar}
        controla={exibida ? ID_DA_SUB_SIDEBAR : undefined}
        aoAbrir={() => abrir(porta)}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={500}>
      <aside data-menu-convexy="" className="sticky top-0 z-30 flex h-screen shrink-0">
        <div
          className={cn(
            "group/trilho relative flex h-full flex-col border-r border-border bg-surface transition-[width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
            recolhido ? "w-16" : "w-[236px]",
            compactaEmTelaLarga && "lg:w-16",
          )}
        >
          <div className={cn(compactaEmTelaLarga && "lg:hidden")}>
            <MarcaDaBarra collapsed={recolhido} />
          </div>
          {compactaEmTelaLarga ? (
            <div className="hidden lg:block">
              <MarcaDaBarra collapsed />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => startTransition(() => toggleSidebar(recolhido))}
            disabled={trocando}
            aria-label={recolhido ? t("Expandir sidebar") : t("Recolher sidebar")}
            className={cn(
              "absolute top-11 -right-3 z-10 grid size-6 place-items-center rounded-full border border-border-strong bg-surface text-text-muted shadow-sm transition-[opacity,scale,background-color,color,border-color] duration-200 hover:border-accent hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none [@media(pointer:coarse)]:hidden",
              recolhido
                ? "opacity-100"
                : "scale-90 opacity-0 group-hover/trilho:scale-100 group-hover/trilho:opacity-100 focus-visible:scale-100 focus-visible:opacity-100",
              compactaEmTelaLarga && "lg:hidden",
              sobrepondo && "hidden",
            )}
          >
            <CaretLeft
              aria-hidden
              className={cn(
                "size-3.5 transition-[rotate] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
                recolhido && "rotate-180",
              )}
            />
          </button>
          <nav aria-label={t("Navegação principal")} className="flex min-h-0 flex-1 flex-col">
            <ul className="flex-1 space-y-[3px] overflow-y-auto overscroll-contain p-2">
              {portas
                .filter((p) => !p.rodape)
                .map((p) => (
                  <li key={p.id}>{botao(p)}</li>
                ))}
            </ul>
            <div className="border-t border-border p-2">
              <ul className="mb-1 space-y-[3px]">
                {portas
                  .filter((p) => p.rodape)
                  .map((p) => (
                    <li key={p.id}>{botao(p)}</li>
                  ))}
              </ul>
              <div className={cn(compactaEmTelaLarga && "lg:hidden")}>
                <VersionFooter collapsed={recolhido} />
              </div>
              {compactaEmTelaLarga ? (
                <div className="hidden lg:block">
                  <VersionFooter collapsed />
                </div>
              ) : null}
            </div>
          </nav>
        </div>
        {sobrepondo ? (
          <div
            aria-hidden
            onClick={fecharSobreposicao}
            className="absolute inset-y-0 left-full z-30 w-[calc(100vw-100%)] bg-overlay lg:hidden"
          />
        ) : null}
        {exibida ? (
          <div
            aria-hidden={aberta ? undefined : true}
            inert={aberta ? undefined : true}
            className={cn(
              "h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
              aberta ? "lg:w-60" : "lg:w-0",
              sobrepondo ? "absolute top-0 left-full z-40 w-60 lg:static" : "hidden lg:block",
            )}
          >
            <SubSidebar
              key={exibida.id}
              id={ID_DA_SUB_SIDEBAR}
              porta={exibida}
              ativoHref={ativo?.href ?? null}
              animar={animar}
              orientacoes={orientacoes}
              aoEsc={sobrepondo && !larga ? fecharSobreposicao : fechar}
              aoFechar={fechar}
              aoEscolher={() => setSobreposicao(null)}
            />
          </div>
        ) : null}
      </aside>
    </TooltipProvider>
  );
}
```

- [ ] **Step 13: `app/app/_components/AppShell.tsx`**

(a) Depois de `import { Sidebar } from "@/components/shell/Sidebar";` acrescentar:
```tsx
// Convexy: o menu novo com o módulo menu_convexy ligado — CONVEXY.md, "Menu novo".
import { MenuConvexy } from "@/components/convexy/menu/MenuConvexy";
import { useConvexy } from "@/lib/convexy/contexto";
```
(b) Depois de `  const ocupacaoDoRodape = useOcupacaoDoRodape();` acrescentar:
```tsx
  const convexy = useConvexy();
```
(c) Trocar:
```tsx
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>
```
por:
```tsx
      <div className="hidden md:block">
        {/* Convexy: menu da Convexy ou o Sidebar do original, pelo módulo. CONVEXY.md, "Menu novo". */}
        {convexy?.menuLigado ? (
          <MenuConvexy recolhido={sidebarCollapsed} />
        ) : (
          <Sidebar collapsed={sidebarCollapsed} />
        )}
      </div>
```


- [ ] **Step 14: Conferir (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git grep -n "export function MarcaDaBarra\|<MarcaDaBarra" -- components
git grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|outline-none" -- components/convexy || echo "sem cor literal nem outline-none"
git add components/shell/Sidebar.tsx app/app/_components/AppShell.tsx components/convexy/menu lib/convexy/orientacoes.ts
git commit -m "feat(convexy): menu no desktop — trilho, sub-sidebar, alça e AppShell (spec 4)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 15: Empurrar e ler o CI (`ci.yml` e `perf.yml`)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml perf.yml"
ARQUIVOS="convexy-menu-(desktop|estrutura)|tailwind-tokens|barra-lateral-nao-flutua|barra-lateral-nao-perde-o-sticky|rodape-ocupado|logo-nao-some-no-tema-escuro|marca-sem-divergencia-de-hidratacao|sidebar-grupos|sidebar-nome-da-organizacao|marca-do-produto|i18n-espanhol-cobre-a-tela|branding.test"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
Expected: `ci.yml exit=0` e `perf.yml exit=0`; rodapé do `ci.yml` sem `failed` nem `Errors`; `convexy-menu-desktop` ✓ (21 casos), `convexy-menu-estrutura` ✓ (29 casos); `tailwind-tokens` ✓ (nenhum `outline-none`, `rounded`/`shadow` nus nem token sem ponte); os gates do `Sidebar.tsx`/`AppShell.tsx` do original ✓ (o recorte não mudou o desenho); `i18n-espanhol-cobre-a-tela` ✓; `branding` ✓. O `build-and-size` verde prova o `import "./menu.css"` num componente (precedente: `FlowCanvas.tsx`) e a página com o `MenuConvexy` no build de produção. Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.

---

### Task 7: A gaveta do celular

**Files:**
- Create: `components/convexy/menu/GavetaConvexy.tsx`
- Modify: `components/shell/MobileSidebar.tsx:12` (import), `:24` (hook), `:44-48` (conteúdo da gaveta)
- Create: `tests/unit/convexy-menu-gaveta.test.tsx`

**Interfaces:**
- Consumes: `useMenuConvexy`, `useOrientacoes`, `BotaoDaPorta`, `ListaDaPorta`, `MarcaDaBarra` (Task 6); `ativoNoCaminho`, `PORTA_DAS_ORIENTACOES`, `PortaId` (Task 4); `TEXTOS`/`texto` (Task 3); `useConvexy` de `@/lib/convexy/contexto` (Task 5).
- Produces: `export function GavetaConvexy({ aoNavegar }: { aoNavegar: () => void })`.

- [ ] **Step 1: Teste (vermelho até os Steps 2–3)**

Criar `tests/unit/convexy-menu-gaveta.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import type { Nicho } from "@/lib/convexy/nicho";

/**
 * Convexy — a gaveta do celular (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 4):
 * mostra o menu largo, com Configurações no rodapé como no desktop; uma porta
 * com sub troca o conteúdo pela lista dela, com "‹ Voltar" (alvo de 44px) que
 * devolve o foco à porta; escolher um item fecha a gaveta. Na gaveta a porta
 * troca o conteúdo, não expande nada: sem `aria-expanded`. Sem o módulo, é a do original.
 */
const estado = vi.hoisted(() => ({
  auth: {
    user: { is_platform_admin: false, support: null },
    activeOrg: { orgId: "org-1", name: "Org", role: "admin", modulos_ligados: ["menu_convexy"] },
  } as { user: Pick<AuthUser, "is_platform_admin" | "support">; activeOrg: ActiveOrg | null },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/inbox",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => estado.auth, usePermission: () => false }));
vi.mock("@/app/actions/shell/toggleSidebar", () => ({ toggleSidebar: vi.fn() }));
vi.mock("@/components/shell/VersionFooter", () => ({ VersionFooter: () => null }));
vi.mock("@/components/connections/ConnectionHealthDot", () => ({ ConnectionHealthDot: () => null }));
vi.mock("@/components/convexy/menu/useOrientacoes", () => ({
  useOrientacoes: () => ({ itens: [], indisponivel: false }),
}));

import { MobileSidebar } from "@/components/shell/MobileSidebar";
import { ConvexyProvider } from "@/lib/convexy/contexto";

const COM_O_MODULO = {
  user: { is_platform_admin: false, support: null },
  activeOrg: { orgId: "org-1", name: "Org", role: "admin", modulos_ligados: ["menu_convexy"] },
} as const satisfies typeof estado.auth;

function montar(nicho: Nicho = "generico", menuLigado = true) {
  render(
    <ConvexyProvider menuLigado={menuLigado} nicho={nicho}>
      <MobileSidebar />
    </ConvexyProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Abrir navegação" }));
  return screen.getByRole("dialog");
}

beforeEach(() => {
  vi.clearAllMocks();
  estado.auth = COM_O_MODULO;
});

describe("gaveta com o menu da Convexy", () => {
  it("porta com sub troca a gaveta pela lista dela, com ‹ Voltar; item escolhido fecha a gaveta", async () => {
    const gaveta = montar();
    fireEvent.click(within(gaveta).getByRole("button", { name: "Assistente de IA" }));
    expect(within(gaveta).getByRole("button", { name: "‹ Voltar" })).toBeInTheDocument();
    expect(within(gaveta).getByRole("navigation", { name: "Assistente de IA" })).toBeInTheDocument();
    fireEvent.click(within(gaveta).getByRole("link", { name: "Casos" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("‹ Voltar tem 44px de alvo, volta às portas e devolve o foco à porta de onde veio", () => {
    const gaveta = montar();
    fireEvent.click(within(gaveta).getByRole("button", { name: "Resultados" }));
    const voltar = within(gaveta).getByRole("button", { name: "‹ Voltar" });
    expect(voltar).toHaveClass("min-h-11");
    fireEvent.click(voltar);
    const porta = within(gaveta).getByRole("button", { name: "Resultados" });
    expect(document.activeElement).toBe(porta);
  });

  it("na gaveta a porta não declara aria-expanded, e Configurações fica no rodapé", () => {
    const gaveta = montar();
    const resultados = within(gaveta).getByRole("button", { name: "Resultados" });
    const configuracoes = within(gaveta).getByRole("button", { name: "Configurações" });
    expect(resultados).not.toHaveAttribute("aria-expanded");
    expect(configuracoes).not.toHaveAttribute("aria-expanded");
    const principal = within(gaveta).getByRole("navigation", { name: "Navegação principal" });
    expect(within(principal).queryByRole("button", { name: "Configurações" })).toBeNull();
    expect(configuracoes.closest(".border-t")).not.toBeNull();
  });

  it("porta direta navega e fecha a gaveta", async () => {
    const gaveta = montar("servicos");
    fireEvent.click(within(gaveta).getByRole("link", { name: "Funil de vendas" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("sem o módulo", () => {
  it("a gaveta é a do original", () => {
    // O módulo chega à casca pelos dois caminhos que o layout alimenta juntos.
    estado.auth = { ...COM_O_MODULO, activeOrg: { ...COM_O_MODULO.activeOrg, modulos_ligados: [] } };
    const gaveta = montar("generico", false);
    expect(within(gaveta).getByRole("link", { name: "Funis" })).toHaveAttribute("href", "/app/kanban");
    expect(within(gaveta).queryByRole("button", { name: "Assistente de IA" })).toBeNull();
  });
});
```

- [ ] **Step 2: `components/convexy/menu/GavetaConvexy.tsx`**

```tsx
"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { flushSync } from "react-dom";

import { MarcaDaBarra } from "@/components/shell/Sidebar";
import { VersionFooter } from "@/components/shell/VersionFooter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { ativoNoCaminho } from "@/lib/convexy/menu/dono";
import { PORTA_DAS_ORIENTACOES, type PortaId } from "@/lib/convexy/menu/mapa";
import type { PortaDoMenu } from "@/lib/convexy/menu/montar";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";

import { BotaoDaPorta } from "./BotaoDaPorta";
import { ListaDaPorta } from "./ListaDaPorta";
import { useMenuConvexy } from "./useMenuConvexy";
import { useOrientacoes } from "./useOrientacoes";

/**
 * O menu da Convexy na gaveta do celular (`< md`, spec 4). A gaveta mostra o
 * menu largo, com Configurações no rodapé como no desktop; uma porta com sub
 * troca o conteúdo pela lista dela, com "‹ Voltar", que devolve o foco à porta;
 * escolher um item (ou uma porta direta) fecha a gaveta. Abrir e fechar não
 * escreve o cookie do desktop, como a gaveta do original.
 */
export function GavetaConvexy({ aoNavegar }: { aoNavegar: () => void }) {
  const t = useT();
  const idioma = useIdioma();
  const pathname = usePathname();
  const portas = useMenuConvexy();
  const [aberta, setAberta] = useState<PortaId | null>(null);
  const orientacoes = useOrientacoes(aberta === PORTA_DAS_ORIENTACOES);
  const ativo = ativoNoCaminho(pathname, portas, orientacoes.itens.map((o) => o.href));
  const porta = portas.find((p) => p.id === aberta && !p.direta) ?? null;

  function voltar(de: PortaId) {
    // A lista de portas precisa existir no DOM antes de receber o foco.
    flushSync(() => setAberta(null));
    document.querySelector<HTMLElement>(`[data-gaveta-convexy] [data-porta="${de}"]`)?.focus();
  }

  function botao(p: PortaDoMenu) {
    return (
      <BotaoDaPorta
        porta={p}
        ativa={ativo?.porta === p.id}
        recolhido={false}
        compactaEmTelaLarga={false}
        mostrarNome={false}
        animar={false}
        aoAbrir={() => setAberta(p.id)}
        aoNavegar={aoNavegar}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={500}>
      <div data-gaveta-convexy="" className="flex min-h-0 flex-1 flex-col">
        {porta ? (
          <>
            <div className="flex h-14 items-center border-b border-border px-2">
              <button
                type="button"
                autoFocus
                onClick={() => voltar(porta.id)}
                className="flex min-h-11 items-center rounded-md px-3 text-sm text-text-muted transition-[background-color,color] duration-200 hover:bg-surface-elevated hover:text-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none"
              >
                {texto(TEXTOS.menu.voltar, idioma)}
              </button>
            </div>
            <nav aria-label={porta.rotulo} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
              <h2 className="px-2.5 pb-2 text-[15.5px] font-semibold text-text">{porta.rotulo}</h2>
              <ListaDaPorta porta={porta} ativoHref={ativo?.href ?? null} orientacoes={orientacoes} aoEscolher={aoNavegar} />
            </nav>
          </>
        ) : (
          <>
            <MarcaDaBarra collapsed={false} />
            <nav aria-label={t("Navegação principal")} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              <ul className="space-y-[3px]">
                {portas
                  .filter((p) => !p.rodape)
                  .map((p) => (
                    <li key={p.id}>{botao(p)}</li>
                  ))}
              </ul>
            </nav>
            <div className="border-t border-border p-2">
              <ul className="mb-1 space-y-[3px]">
                {portas
                  .filter((p) => p.rodape)
                  .map((p) => (
                    <li key={p.id}>{botao(p)}</li>
                  ))}
              </ul>
              <VersionFooter collapsed={false} onNavigate={aoNavegar} />
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
```

- [ ] **Step 3: `components/shell/MobileSidebar.tsx`**

(a) Depois de `import { SidebarContent } from "@/components/shell/Sidebar";` acrescentar:
```tsx
// Convexy: a gaveta do menu da Convexy com o módulo ligado — CONVEXY.md, "Menu novo".
import { GavetaConvexy } from "@/components/convexy/menu/GavetaConvexy";
import { useConvexy } from "@/lib/convexy/contexto";
```
(b) Depois de `  const [open, setOpen] = useState(false);` acrescentar:
```tsx
  const convexy = useConvexy();
```
(c) Trocar:
```tsx
        <SidebarContent
          collapsed={false}
          showCollapseControl={false}
          onNavigate={() => setOpen(false)}
        />
```
por:
```tsx
        {/* Convexy: a gaveta da Convexy ou a do original, pelo módulo. CONVEXY.md, "Menu novo". */}
        {convexy?.menuLigado ? (
          <GavetaConvexy aoNavegar={() => setOpen(false)} />
        ) : (
          <SidebarContent
            collapsed={false}
            showCollapseControl={false}
            onNavigate={() => setOpen(false)}
          />
        )}
```

- [ ] **Step 4: Conferir (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git grep -n "GavetaConvexy\|SidebarContent" -- components/shell/MobileSidebar.tsx
git grep -n "outline-none" -- components/convexy || echo "sem outline-none"
git add components/convexy/menu/GavetaConvexy.tsx components/shell/MobileSidebar.tsx tests/unit/convexy-menu-gaveta.test.tsx
git commit -m "feat(convexy): gaveta do celular com ‹ Voltar (spec 4)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Empurrar e ler o CI (`ci.yml`, `perf.yml` e `e2e.yml`: a casca do celular muda para todas as specs)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml perf.yml e2e.yml"
ARQUIVOS="convexy-menu-(gaveta|estrutura)|TenantSwitcher.celular|tailwind-tokens|i18n-espanhol-cobre-a-tela"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
Expected: os três `exit=0`; rodapé do `ci.yml` sem `failed` nem `Errors`; `convexy-menu-gaveta` ✓ (5 casos); `convexy-menu-estrutura` e `tailwind-tokens` seguem ✓ (a gaveta entra na varredura de tokens, foco e movimento); o `e2e` verde prova que a gaveta do original segue intacta com o módulo desligado (padrão). Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.
---

### Task 8: A tela de interface agrupada pelas portas

**Files:**
- Create: `components/convexy/InterfacePorPortas.tsx`
- Modify: `components/team/InterfaceEditor.tsx:5` (imports depois dele), `:31` (uma linha depois), `:55-56` (a abertura do `NAV_GROUPS.map` e a linha `items`; o resto do bloco do original fica byte a byte)
- Create: `tests/unit/convexy-menu-interface.test.tsx`

**Interfaces:**
- Consumes: `organizarPorPortas` (Task 4, `mapa.ts`); `rotuloDoItem` (Task 4, `montar.ts`); `MODULO_DO_MENU` (`lib/convexy/modulo.ts`, Task 2); `TEXTOS`, `texto`, `rotuloPorNicho` (Task 3); `useConvexy` (`lib/convexy/contexto.tsx`, Task 5); `NavMetadata`, `NavDestinationId` (`lib/navigation/catalogo.ts`); `InterfaceSettings`.
- Produces: `export function InterfacePorPortas({ opcoes, valor, selecionados, aoMudar, nicho }: { opcoes: readonly NavMetadata[]; valor: InterfaceSettings; selecionados: ReadonlySet<string>; aoMudar: (valor: InterfaceSettings) => void; nicho: Nicho })`. O `InterfaceEditor` mantém a assinatura pública e o handler do original.

- [ ] **Step 1: Teste (vermelho até os Steps 3–4)**

Criar `tests/unit/convexy-menu-interface.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InterfaceEditor } from "@/components/team/InterfaceEditor";
import { ConvexyProvider, type ValorDaConvexy } from "@/lib/convexy/contexto";
import {
  combinarInterfaces,
  destinosDaInterface,
  interfaceSettingsSchema,
  type InterfaceSettings,
} from "@/lib/navigation/interface";

/**
 * Convexy — a tela de interface que já existe, reaproveitada (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.6). Só o
 * AGRUPAMENTO muda: pelas portas e grupos do menu novo, com uma caixa por porta.
 * Com o módulo desligado — ou fora do app, como na criação de organização do
 * /admin, que não tem ConvexyProvider — é o editor do original, e o Início não
 * aparece. O valor gravado é o mesmo nos dois modos. O Início sozinho nunca é
 * "área de trabalho" (Decisão 3).
 */
const CONVERSAS = ["/app/inbox", "/app/radar", "/app/templates", "/app/campaigns", "/app/calls"];
const ALERTA = "Selecione ao menos uma área de trabalho permitida ao papel.";

function desenhar(value: InterfaceSettings, convexy?: ValorDaConvexy) {
  const onChange = vi.fn<(valor: InterfaceSettings) => void>();
  const editor = <InterfaceEditor value={value} onChange={onChange} role="admin" />;
  render(convexy ? <ConvexyProvider {...convexy}>{editor}</ConvexyProvider> : editor);
  fireEvent.click(screen.getByText(/Personalizar áreas visíveis/));
  return onChange;
}
const ultimo = (onChange: ReturnType<typeof desenhar>) => onChange.mock.calls.at(-1)![0];

describe("com o módulo desligado, é o editor do original", () => {
  it("sem ConvexyProvider (criação de organização no /admin): grupos do original, sem o Início", () => {
    desenhar({ preset: "completa" });
    expect(screen.getByRole("group", { name: "Atendimento" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Início" })).toBeNull();
  });

  it("com o provider e o módulo desligado: idem", () => {
    desenhar({ preset: "completa" }, { menuLigado: false, nicho: "clinica" });
    expect(screen.getByRole("group", { name: "CRM" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Pacientes" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Início" })).toBeNull();
  });

  it("editar no clássico não apaga o Início escolhido quando o módulo estava ligado", () => {
    const onChange = desenhar({ preset: "completa", destinos: ["/app", "/app/inbox", "/app/settings/tags"] });
    fireEvent.click(screen.getByRole("checkbox", { name: "Tags" }));
    expect(ultimo(onChange).destinos).toEqual(expect.arrayContaining(["/app", "/app/inbox"]));
    expect(ultimo(onChange).destinos).not.toContain("/app/settings/tags");
  });
});

describe("com o módulo ligado, agrupa pelas portas do mapa", () => {
  it("mostra as portas com os nomes do nicho, e o Início pode ser escondido", () => {
    desenhar({ preset: "completa" }, { menuLigado: true, nicho: "clinica" });
    for (const porta of ["Início", "Conversas", "Pacientes", "Funil de pacientes", "Configurações"]) {
      expect(screen.getByRole("group", { name: porta })).toBeInTheDocument();
    }
    expect(screen.queryByRole("group", { name: "Atendimento" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Início" })).toBeChecked();
  });

  it("a caixa da porta desmarca todas as áreas dela", () => {
    const onChange = desenhar({ preset: "completa" }, { menuLigado: true, nicho: "generico" });
    const caixa = screen.getByRole("checkbox", { name: "Todas as áreas de Conversas" });
    expect(caixa).toBeChecked();
    fireEvent.click(caixa);
    const destinos = ultimo(onChange).destinos ?? [];
    for (const href of CONVERSAS) expect(destinos).not.toContain(href);
    expect(destinos).toEqual(expect.arrayContaining(["/app", "/app/contacts"]));
  });

  it("e marca todas de novo", () => {
    const onChange = desenhar(
      { preset: "completa", destinos: ["/app/contacts"] },
      { menuLigado: true, nicho: "generico" },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Todas as áreas de Conversas" }));
    expect(ultimo(onChange).destinos).toEqual(expect.arrayContaining([...CONVERSAS, "/app/contacts"]));
  });
});

describe("o Início sozinho não é área de trabalho", () => {
  it("no clássico, só o Início escolhido (escondido) mostra o alerta", () => {
    desenhar({ preset: "completa", destinos: ["/app"] });
    expect(screen.getByRole("alert")).toHaveTextContent(ALERTA);
  });

  it("com o módulo ligado, só o Início escolhido também mostra o alerta", () => {
    desenhar({ preset: "completa", destinos: ["/app"] }, { menuLigado: true, nicho: "clinica" });
    expect(screen.getByRole("alert")).toHaveTextContent(ALERTA);
  });

  it("o Início com uma área de verdade não mostra alerta", () => {
    desenhar({ preset: "completa", destinos: ["/app", "/app/inbox"] }, { menuLigado: true, nicho: "clinica" });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("o dado gravado é o mesmo nos dois modos", () => {
  it("a mesma escolha grava o mesmo valor, depois do schema de escrita", () => {
    const inicial: InterfaceSettings = { preset: "completa", destinos: ["/app/inbox", "/app/settings/tags"] };
    const noClassico = desenhar(inicial);
    fireEvent.click(screen.getByRole("checkbox", { name: "Tags" }));
    const valorClassico = interfaceSettingsSchema.parse(ultimo(noClassico));
    cleanup();
    const nasPortas = desenhar(inicial, { menuLigado: true, nicho: "clinica" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Tags" }));
    expect(interfaceSettingsSchema.parse(ultimo(nasPortas))).toEqual(valorClassico);
    expect(valorClassico.destinos).toEqual(["/app/inbox"]);
  });

  it("combinarInterfaces continua valendo com o Início", () => {
    const combinada = combinarInterfaces(
      { preset: "completa", destinos: ["/app", "/app/inbox"] },
      { preset: "completa", destinos: ["/app"] },
    );
    expect(combinada.destinos).toEqual(["/app"]);
    const hrefs = destinosDaInterface(combinada, false, "agent", ["menu_convexy"]).map((d) => d.href);
    expect(hrefs).toEqual(expect.arrayContaining(["/app", "/app/settings/profile"]));
    expect(hrefs).not.toContain("/app/inbox");
  });
});
```

- [ ] **Step 2: Fase vermelha no CI (Review Focus 4)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
git add tests/unit/convexy-menu-interface.test.tsx
git commit -m "test(convexy): o Início não vaza no editor clássico nem conta como área — vermelho antes (spec 3.6)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow ci.yml --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "ci.yml run=$id exit=$?"
gh run view "$id" -R victorrabyfs/DeskcommCRM --log-failed > "$S/vermelho-rf4-$sha.log"
grep -aE "convexy-menu-interface" "$S/vermelho-rf4-$sha.log" | head -10
```
Expected: `exit` diferente de 0 **por causa deste(s) arquivo(s)** (`InterfacePorPortas` ainda não existe; com o módulo ligado os grupos do original aparecem e o Início aparece no clássico); anotar o id do run. Outro arquivo vermelho: parar e investigar.

- [ ] **Step 3: `components/convexy/InterfacePorPortas.tsx`**

```tsx
"use client";
import { organizarPorPortas } from "@/lib/convexy/menu/mapa";
import { rotuloDoItem } from "@/lib/convexy/menu/montar";
import type { Nicho } from "@/lib/convexy/nicho";
import { TEXTOS, rotuloPorNicho, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import type { NavDestinationId, NavMetadata } from "@/lib/navigation/catalogo";
import type { InterfaceSettings } from "@/lib/navigation/interface";

/**
 * A escolha de áreas agrupada pelas PORTAS do menu da Convexy (spec 3.6) — o
 * mesmo `mapa.ts` que monta o menu, na mesma ordem e com os mesmos nomes: tela
 * nova do original aparece aqui na porta em que aparece no menu. As opções vêm
 * do `InterfaceEditor` do original; marcar e desmarcar segue a MESMA regra do
 * handler dele (o próximo conjunto parte das opções marcadas e mantém o
 * perfil), para o valor gravado ser o mesmo nos dois modos — o teste
 * "o dado gravado é o mesmo nos dois modos" prende a equivalência.
 */
export function InterfacePorPortas({
  opcoes,
  valor,
  selecionados,
  aoMudar,
  nicho,
}: {
  opcoes: readonly NavMetadata[];
  valor: InterfaceSettings;
  selecionados: ReadonlySet<string>;
  aoMudar: (valor: InterfaceSettings) => void;
  nicho: Nicho;
}) {
  const idioma = useIdioma();
  const portas = organizarPorPortas(opcoes)
    .map(({ porta, grupos }) => ({ porta, grupos: grupos.filter((g) => g.itens.length > 0) }))
    .filter((p) => p.grupos.length > 0);

  function alternar(hrefs: readonly string[], marcar: boolean) {
    const proximo = new Set(opcoes.filter((o) => selecionados.has(o.href)).map((o) => o.href));
    for (const href of hrefs) {
      if (marcar) proximo.add(href);
      else proximo.delete(href);
    }
    aoMudar({ preset: valor.preset, destinos: [...proximo] as NavDestinationId[] });
  }

  return (
    <>
      {portas.map(({ porta, grupos }) => {
        const rotulo = rotuloPorNicho(porta.rotulo, nicho, idioma);
        const hrefs = grupos.flatMap((g) => g.itens.map((d) => d.href));
        const marcadas = hrefs.filter((href) => selecionados.has(href)).length;
        return (
          <fieldset key={porta.id} className="space-y-2">
            <legend className="mb-1 text-xs font-medium text-muted-foreground uppercase">{rotulo}</legend>
            <input
              type="checkbox"
              aria-label={`${texto(TEXTOS.interface.todasDaPorta, idioma)} ${rotulo}`}
              checked={marcadas === hrefs.length}
              ref={(caixa) => {
                if (caixa) caixa.indeterminate = marcadas > 0 && marcadas < hrefs.length;
              }}
              onChange={(e) => alternar(hrefs, e.target.checked)}
            />
            {grupos.map(({ grupo, itens }) => (
              <div key={grupo.id} className="space-y-1 pl-5">
                {grupo.rotulo ? (
                  <p className="text-[11px] text-muted-foreground">{texto(grupo.rotulo, idioma)}</p>
                ) : null}
                {itens.map((d) => (
                  <label key={d.href} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selecionados.has(d.href)}
                      onChange={(e) => alternar([d.href], e.target.checked)}
                      className="mt-1"
                    />
                    {rotuloDoItem(d.href, d.label, nicho, idioma)}
                  </label>
                ))}
              </div>
            ))}
          </fieldset>
        );
      })}
    </>
  );
}
```

- [ ] **Step 4: `components/team/InterfaceEditor.tsx` (inserções; o bloco do original fica)**

(a) Depois de `import { NAV_GROUPS, type NavDestinationId } from "@/lib/navigation/catalogo";` acrescentar:
```tsx
// Convexy: agrupamento pelas portas com o menu da Convexy ligado — CONVEXY.md, "Menu novo".
import { InterfacePorPortas } from "@/components/convexy/InterfacePorPortas";
import { useConvexy } from "@/lib/convexy/contexto";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
```
(b) Depois de `  const options = permitidos(false, role).filter((d) => !essencial(d, role));` acrescentar:
```tsx
  const convexy = useConvexy(); // Convexy: CONVEXY.md, "Menu novo".
```
(c) Trocar **só** estas duas linhas (`:55-56`):
```tsx
          {NAV_GROUPS.map((group) => {
            const items = options.filter((d) => d.group === group.id);
```
por:
```tsx
          {/* Convexy: com o módulo ligado, as mesmas opções agrupadas pelas portas; o
              agrupamento do original não mostra o Início, que continua entre as
              opções (editar aqui não apaga a escolha feita com o módulo ligado).
              CONVEXY.md, "Menu novo". */}
          {convexy?.menuLigado && (
            <InterfacePorPortas
              opcoes={options}
              valor={value}
              selecionados={selected}
              aoMudar={onChange}
              nicho={convexy.nicho}
            />
          )}
          {!convexy?.menuLigado && NAV_GROUPS.map((group) => {
            const items = options.filter((d) => d.group === group.id && d.modulo !== MODULO_DO_MENU);
```
Da linha `:57` (`if (!items.length) return null;`) até o `})}` de `:88`, nada muda — o handler `onChange` do original fica byte a byte.

- [ ] **Step 5: Conferir (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git diff -U0 components/team/InterfaceEditor.tsx | grep -E '^-[^-]'
git add components/convexy/InterfacePorPortas.tsx components/team/InterfaceEditor.tsx
git commit -m "feat(convexy): tela de interface agrupada pelas portas, caixa por porta (spec 3.6)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected do `grep`: exatamente as duas linhas removidas de `:55-56`.

- [ ] **Step 6: Empurrar e ler o CI**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml"
ARQUIVOS="convexy-menu-interface|interface-por-(empresa|vinculo)|MemberInterfaceDialog|InviteForm|tenants/new|tailwind-tokens"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
Expected: `ci.yml exit=0`; rodapé sem `failed` nem `Errors`; `convexy-menu-interface` ✓ (11 casos); `interface-por-empresa` e `interface-por-vinculo` ✓; `tailwind-tokens` ✓ (os `<label>` novos declaram `flex`). Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.
---

### Task 9: Hubs que redirecionam e as orientações instaladas

**Files:**
- Modify: `components/shell/NavHub.tsx:1-15` (imports), `:84` (início do corpo de `NavHub`)
- Create: `app/api/v1/convexy/orientacoes/route.ts`
- Create: `tests/unit/convexy-menu-hubs.test.ts`
- Create: `tests/unit/convexy-menu-orientacoes.test.ts`
- Create: `tests/unit/convexy-menu-orientacoes-hook.test.tsx`

**Interfaces:**
- Consumes: `destinoDoHub` (Task 4); `MODULO_DO_MENU` (`lib/convexy/modulo.ts`, Task 2); `requireRole` (`lib/auth/require-role.ts`); `loadCrmExtensions` (`lib/extensions/service.ts:570`, client de SESSÃO); `localize` (`lib/extensions/manifest.ts:467`); `logger`; `ok` (`lib/api/wrappers.ts`); `RespostaDasOrientacoes` (Task 6); `useOrientacoes` (Task 6).
- Produces: `GET /api/v1/convexy/orientacoes` → `200 { data: RespostaDasOrientacoes }` (inclusive `indisponivel: true` quando a leitura falha) | a resposta de `requireRole` (401/403). O `NavHub` redireciona com o módulo ligado.

- [ ] **Step 1: Testes (vermelhos até os Steps 2–3)**

Criar `tests/unit/convexy-menu-hubs.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
}));

import { NavHub } from "@/components/shell/NavHub";
import type { Role } from "@/lib/auth/types";
import { destinoDoHub } from "@/lib/convexy/menu/montar";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
import type { NavGroupId } from "@/lib/navigation/catalogo";

/**
 * Convexy — sem páginas-hub (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.4).
 * Com o módulo ligado, cada hub vai à PRIMEIRA TELA VISÍVEL da porta dele; link
 * antigo ou favorito continua funcionando. Desligado, é o hub do original.
 */
const BASE = { isPlatformAdmin: false, title: "Hub", subtitle: "", locale: "pt-BR" as const };

describe("com o módulo ligado, o hub vai à porta dele", () => {
  it.each([
    ["crm", "admin", "/app/contacts"],
    ["ia", "admin", "/app/ai/agents"],
    ["analise", "admin", "/app/metrics"],
    ["organizacao", "admin", "/app/connections"],
    ["ia", "agent", "/app/ai/inbox"],
    ["organizacao", "agent", "/app/extensions"],
  ] as Array<[NavGroupId, Role, string]>)("hub %s, como %s, vai a %s", (group, role, destino) => {
    expect(() => NavHub({ ...BASE, group, role, modulosLigados: [MODULO_DO_MENU] })).toThrow(
      `NEXT_REDIRECT:${destino}`,
    );
  });

  it("respeita a interface: a primeira tela VISÍVEL", () => {
    expect(
      destinoDoHub("crm", {
        isPlatformAdmin: false,
        role: "admin",
        interfaceSettings: { preset: "completa", destinos: ["/app/products"] },
        modulosLigados: [MODULO_DO_MENU],
      }),
    ).toBe("/app/products");
  });

  it("porta sem tela visível não redireciona — o hub do original é desenhado", () => {
    expect(
      destinoDoHub("ia", {
        isPlatformAdmin: false,
        role: "viewer",
        interfaceSettings: { preset: "completa", destinos: ["/app/inbox"] },
        modulosLigados: [MODULO_DO_MENU],
      }),
    ).toBeNull();
  });
});

describe("com o módulo desligado, é o hub do original", () => {
  it("desenha, sem redirecionar", () => {
    expect(() => NavHub({ ...BASE, group: "crm", role: "admin", modulosLigados: [] })).not.toThrow();
    expect(destinoDoHub("crm", { isPlatformAdmin: false, role: "admin", modulosLigados: [] })).toBeNull();
  });
});
```

Criar `tests/unit/convexy-menu-orientacoes.test.ts`:
```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — GET /api/v1/convexy/orientacoes (spec 3.4): o único conteúdo
 * exclusivo do hub `/app/crm`, agora um grupo da porta Contatos. Mesmo
 * `loadCrmExtensions`, organização da SESSÃO, mesmas regras: só as ativas, e
 * aviso quando não dá para ler (200 com `indisponivel`, como o hub).
 */
const deps = vi.hoisted(() => ({ requireRole: vi.fn(), loadCrmExtensions: vi.fn(), warn: vi.fn() }));

vi.mock("@/lib/auth/require-role", () => ({ requireRole: deps.requireRole }));
vi.mock("@/lib/extensions/service", () => ({ loadCrmExtensions: deps.loadCrmExtensions }));
vi.mock("@/lib/logger", () => ({ logger: { warn: deps.warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { GET } from "@/app/api/v1/convexy/orientacoes/route";

function guia(id: string, pt: string, es?: string) {
  return {
    organization_id: "org-1",
    installation_id: id,
    version: "1.0.0",
    manifest: { display: { title: { "pt-BR": pt, ...(es ? { es } : {}) } } },
    configuration: {},
    revision: 1,
  };
}
function sessao(idioma: "pt-BR" | "es") {
  deps.requireRole.mockResolvedValue({ ok: true, user: { id: "u-1", idioma }, org: { orgId: "org-1" } });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/convexy/orientacoes", () => {
  it("devolve as orientações ativas da organização da sessão, com o título no idioma", async () => {
    sessao("es");
    deps.loadCrmExtensions.mockResolvedValue([guia("i-1", "Roteiro da clínica", "Guion de la clínica"), guia("i-2", "Só em português")]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: {
        orientacoes: [
          { installation_id: "i-1", titulo: "Guion de la clínica" },
          { installation_id: "i-2", titulo: "Só em português" },
        ],
        indisponivel: false,
      },
    });
    expect(deps.requireRole).toHaveBeenCalledWith("viewer", expect.objectContaining({ resource: "extension_installations" }));
    expect(deps.loadCrmExtensions).toHaveBeenCalledWith("org-1");
  });

  it("não deu para ler: 200 com o aviso, e o log diz qual organização", async () => {
    sessao("pt-BR");
    deps.loadCrmExtensions.mockRejectedValue(Object.assign(new Error("db"), { code: "extension_unavailable" }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { orientacoes: [], indisponivel: true } });
    expect(deps.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ organization_id: "org-1", error_code: "extension_unavailable" }),
    );
  });

  it("sem sessão, a resposta é a do requireRole — e nada é lido", async () => {
    deps.requireRole.mockResolvedValue({ ok: false, response: Response.json({ error: { code: "unauthenticated" } }, { status: 401 }) });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(deps.loadCrmExtensions).not.toHaveBeenCalled();
  });
});
```

Criar `tests/unit/convexy-menu-orientacoes-hook.test.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: deps.get } }));

import { useOrientacoes } from "@/components/convexy/menu/useOrientacoes";

/** Convexy — as orientações são carregadas quando a porta Contatos abre (spec 3.4). */
function comConsulta() {
  const cliente = new QueryClient();
  return function Envoltorio({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => vi.clearAllMocks());

describe("useOrientacoes", () => {
  it("não consulta enquanto a porta Contatos não abre", () => {
    const { result } = renderHook(() => useOrientacoes(false), { wrapper: comConsulta() });
    expect(deps.get).not.toHaveBeenCalled();
    expect(result.current).toEqual({ itens: [], indisponivel: false });
  });

  it("consulta ao abrir, e cada orientação leva à tela da extensão", async () => {
    deps.get.mockResolvedValue({
      data: { orientacoes: [{ installation_id: "abc 1", titulo: "Roteiro" }], indisponivel: false },
    });
    const { result } = renderHook(() => useOrientacoes(true), { wrapper: comConsulta() });
    await waitFor(() => expect(result.current.itens).toEqual([{ href: "/app/extensions/abc%201", rotulo: "Roteiro" }]));
    expect(deps.get).toHaveBeenCalledWith("/api/v1/convexy/orientacoes");
    expect(result.current.indisponivel).toBe(false);
  });

  it("a rota diz que não deu para ler: o aviso aparece", async () => {
    deps.get.mockResolvedValue({ data: { orientacoes: [], indisponivel: true } });
    const { result } = renderHook(() => useOrientacoes(true), { wrapper: comConsulta() });
    await waitFor(() => expect(result.current.indisponivel).toBe(true));
  });

  it("falha de rede também vira aviso", async () => {
    deps.get.mockRejectedValue(new Error("rede"));
    const { result } = renderHook(() => useOrientacoes(true), { wrapper: comConsulta() });
    await waitFor(() => expect(result.current.indisponivel).toBe(true), { timeout: 5_000 });
  });
});
```

- [ ] **Step 2: A rota**

Criar `app/api/v1/convexy/orientacoes/route.ts`:
```ts
/**
 * GET /api/v1/convexy/orientacoes — Convexy (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.4).
 *
 * As orientações das extensões ativas, para o grupo "Orientações instaladas" da
 * porta Contatos (antes eram o conteúdo exclusivo do hub `/app/crm`). Chama o
 * MESMO `loadCrmExtensions`, que usa o client de sessão (RLS de
 * `organization_extensions`), com a organização resolvida da sessão por
 * `requireRole`. Mesmas regras do hub: só as ativas; se não der para ler, o
 * menu mostra o aviso (200 com `indisponivel`) e o log diz qual organização.
 * Só leitura: sem `requireSupportWrite` (a guarda é de efeito).
 */
import { ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import type { RespostaDasOrientacoes } from "@/lib/convexy/orientacoes";
import { localize } from "@/lib/extensions/manifest";
import { loadCrmExtensions } from "@/lib/extensions/service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SEM_CACHE = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  const authz = await requireRole("viewer", { resource: "extension_installations" });
  if (!authz.ok) return authz.response;
  try {
    const guias = await loadCrmExtensions(authz.org.orgId);
    const resposta: RespostaDasOrientacoes = {
      orientacoes: guias.map((guia) => ({
        installation_id: guia.installation_id,
        titulo: localize(guia.manifest.display.title, authz.user.idioma).text,
      })),
      indisponivel: false,
    };
    return ok(resposta, { headers: SEM_CACHE });
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    logger.warn("[convexy] menu aberto sem as orientações das extensões", {
      organization_id: authz.org.orgId,
      error_code: typeof code === "string" ? code : null,
    });
    const resposta: RespostaDasOrientacoes = { orientacoes: [], indisponivel: true };
    return ok(resposta, { headers: SEM_CACHE });
  }
}
```

- [ ] **Step 3: `components/shell/NavHub.tsx`**

(a) Depois de `import Link from "next/link";` acrescentar:
```tsx
// Convexy: com o menu da Convexy ligado, o hub vira a porta — CONVEXY.md, "Menu novo".
import { redirect } from "next/navigation";
import { destinoDoHub } from "@/lib/convexy/menu/montar";
```
(b) Trocar:
```tsx
  const secoes = hubSections(group, isPlatformAdmin, role, interfaceSettings, modulosLigados);
```
por:
```tsx
  // Convexy: com o módulo menu_convexy ligado o hub não é tela — vai à primeira
  // tela visível da porta dele (link antigo e favorito continuam valendo).
  // CONVEXY.md, "Menu novo".
  const destinoConvexy = destinoDoHub(group, { isPlatformAdmin, role, interfaceSettings, modulosLigados });
  if (destinoConvexy) redirect(destinoConvexy);
  const secoes = hubSections(group, isPlatformAdmin, role, interfaceSettings, modulosLigados);
```

- [ ] **Step 4: Conferir (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git grep -n "destinoDoHub" -- components lib
git add components/shell/NavHub.tsx app/api/v1/convexy/orientacoes/route.ts tests/unit/convexy-menu-hubs.test.ts tests/unit/convexy-menu-orientacoes.test.ts tests/unit/convexy-menu-orientacoes-hook.test.tsx
git commit -m "feat(convexy): hubs viram porta e orientações instaladas em Contatos (spec 3.4)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Empurrar e ler o CI (`ci.yml` e `perf.yml`: o `NavHub` é Server Component e a rota é nova)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml perf.yml"
ARQUIVOS="convexy-menu-(hubs|orientacoes)|nav-hub|suporte-cobertura-de-efeitos|i18n-espanhol-cobre-a-tela"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
Expected: os dois `exit=0`; rodapé do `ci.yml` sem `failed` nem `Errors`; `convexy-menu-hubs` ✓ (9 casos), `convexy-menu-orientacoes` ✓ (3), `convexy-menu-orientacoes-hook` ✓ (4); `nav-hub.test.tsx` ✓ (módulo desligado: o hub do original); `suporte-cobertura-de-efeitos` ✓ (a rota nova só lê). Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.

---

### Task 10: O Início em `/app`

**Files:**
- Create: `app/app/_convexy/inicio/dia.ts`
- Create: `app/app/_convexy/inicio/blocos.ts`
- Create: `app/app/_convexy/inicio/visibilidade.ts`
- Create: `app/app/_convexy/inicio/CartaoDoInicio.tsx`
- Create: `app/app/_convexy/inicio/RecarregarAoVoltar.tsx`
- Create: `app/app/_convexy/inicio/Inicio.tsx`
- Modify: `app/app/page.tsx` (arquivo inteiro, 14 linhas)
- Create: `tests/unit/convexy-inicio-dia.test.ts`
- Create: `tests/unit/convexy-inicio-blocos.test.ts`
- Create: `tests/unit/convexy-inicio-pagina.test.tsx`
- Create: `tests/unit/convexy-inicio-tela.test.tsx`
- Create: `tests/unit/convexy-inicio-fila-do-inbox.test.ts`

**Interfaces:**
- Consumes: `partesNoFuso`, `instanteDe` (`lib/agenda/fuso.ts`); `fusoUtilizavel` (`lib/tempo/fusos.ts`); `orgTemAutomatico` (`lib/ai/agents/org-tem-automatico.ts`); `comandosDaFila`, `esperaDaConversa` (`lib/inbox/comando-da-conversa.ts`); `listConversationsHandler` (`app/api/v1/conversations/_handler.ts`); `listConversationsQuerySchema` (`lib/schemas`); `ConversationWithContact` (tipo, `hooks/inbox/useConversationsRealtime.ts`); `rotuloDoContato` (`lib/contacts/rotulo-do-contato.ts`); `listaAgendamentos` (`lib/agenda/consulta.ts`); `SITUACOES_QUE_OCUPAM` (`lib/agenda/ocupados.ts`); `SITUACOES_DA_TAREFA`, `estaEncerrada`, `estaAtrasada`, `Tarefa` (`lib/tarefas/tipos.ts`); `tagDeIdioma` (`lib/i18n/datas.ts`); `createClient` (`lib/supabase/server.ts`, sessão); `modulosLigados`; `searchable`; `HREF_DO_INICIO` (Task 4); `MODULO_DO_MENU` (`lib/convexy/modulo.ts`, Task 2); `TEXTOS`, `texto` (Task 3).
- Produces:
  - `dia.ts`: `export interface LimitesDoDia { readonly de: Date; readonly ate: Date }`; `export function limitesDoDia(agora: Date, fuso: string): LimitesDoDia`; `export function momentoNoDia(instante: Date, dia: LimitesDoDia, fuso: string, idioma: Idioma): string` (hora de hoje, ou dia/mês se anterior ao dia).
  - `blocos.ts`: `LINHAS_POR_BLOCO = 5`; `LIMITE_DA_AGENDA = 200`; `type ResultadoDoBloco<T> = { ok: true; dados: T } | { ok: false }`; `carregarBloco<T>(bloco, organizationId, carregar): Promise<ResultadoDoBloco<T>>`; `conversasEsperando(supabase, organizationId, userId, idioma)`; `agendaDeHoje(supabase, organizationId, dia)`; `minhasTarefas(supabase, organizationId, userId, dia, agora)` — cada um `Promise<{ total: number; linhas: … }>`.
  - `visibilidade.ts`: `destinosDoInicio(user: AuthUser, org: ActiveOrg): Promise<readonly string[] | null>`.
  - `Inicio({ user, org, visiveis })` (Server Component), `CartaoDoInicio(props)`, `RecarregarAoVoltar()`.

- [ ] **Step 1: Testes (vermelhos até os Steps 3–9)**

Criar `tests/unit/convexy-inicio-dia.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { limitesDoDia, momentoNoDia } from "@/app/app/_convexy/inicio/dia";

/**
 * Convexy — o "hoje" do Início é o da ORGANIZAÇÃO (spec 7). A VPS roda em UTC:
 * às 23:30 de São Paulo o servidor já está no dia seguinte, e "hoje" pelo
 * relógio dele mostraria a agenda e as tarefas do dia errado.
 */
describe("limitesDoDia", () => {
  it("23:30 em São Paulo com o servidor já no dia seguinte: o dia é o da organização", () => {
    const { de, ate } = limitesDoDia(new Date("2026-09-26T02:30:00Z"), "America/Sao_Paulo");
    expect(de.toISOString()).toBe("2026-09-25T03:00:00.000Z");
    expect(ate.toISOString()).toBe("2026-09-26T03:00:00.000Z");
  });

  it("em UTC, o dia do calendário UTC", () => {
    const { de, ate } = limitesDoDia(new Date("2026-09-26T02:30:00Z"), "UTC");
    expect(de.toISOString()).toBe("2026-09-26T00:00:00.000Z");
    expect(ate.toISOString()).toBe("2026-09-27T00:00:00.000Z");
  });

  it("vira o mês e o ano", () => {
    const { de, ate } = limitesDoDia(new Date("2026-12-31T15:00:00Z"), "America/Sao_Paulo");
    expect(de.toISOString()).toBe("2026-12-31T03:00:00.000Z");
    expect(ate.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("dia com horário de verão sem meia-noite (Santiago, 2026-09-06): começa no primeiro instante que existe e tem 23h", () => {
    const { de, ate } = limitesDoDia(new Date("2026-09-06T15:00:00Z"), "America/Santiago");
    expect(de.toISOString()).toBe("2026-09-06T04:00:00.000Z");
    expect(ate.toISOString()).toBe("2026-09-07T03:00:00.000Z");
    expect(ate.getTime() - de.getTime()).toBe(23 * 3_600_000);
  });
});

describe("momentoNoDia", () => {
  const DIA = limitesDoDia(new Date("2026-09-25T15:00:00Z"), "America/Sao_Paulo");

  it("de hoje: a hora no fuso da organização", () => {
    expect(momentoNoDia(new Date("2026-09-25T14:05:00Z"), DIA, "America/Sao_Paulo", "pt-BR")).toBe("11:05");
  });

  it("anterior a hoje: dia/mês, para a espera de ontem não parecer de hoje", () => {
    expect(momentoNoDia(new Date("2026-09-24T15:00:00Z"), DIA, "America/Sao_Paulo", "pt-BR")).toBe("24/09");
  });
});
```

Criar `tests/unit/convexy-inicio-blocos.test.ts`:
```ts
// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — os três blocos do Início (spec 7). A Fila é a do Inbox: o mesmo fato
 * org-wide (`orgTemAutomatico`), o mesmo conjunto (`comandosDaFila`), a mesma
 * contagem do badge e as linhas do próprio handler da lista. Agenda e tarefas no
 * dia da organização. Cada bloco falha sozinho.
 */
const deps = vi.hoisted(() => ({
  orgTemAutomatico: vi.fn(),
  listConversationsHandler: vi.fn(),
  listaAgendamentos: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/lib/ai/agents/org-tem-automatico", () => ({ orgTemAutomatico: deps.orgTemAutomatico }));
vi.mock("@/app/api/v1/conversations/_handler", () => ({ listConversationsHandler: deps.listConversationsHandler }));
vi.mock("@/lib/agenda/consulta", () => ({ listaAgendamentos: deps.listaAgendamentos }));
vi.mock("@/lib/logger", () => ({ logger: { warn: deps.warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import {
  LIMITE_DA_AGENDA,
  agendaDeHoje,
  carregarBloco,
  conversasEsperando,
  minhasTarefas,
} from "@/app/app/_convexy/inicio/blocos";
import { limitesDoDia } from "@/app/app/_convexy/inicio/dia";

type Chamada = [metodo: string, ...args: unknown[]];

/** Um builder do supabase-js que registra a cadeia e resolve com `resposta`. */
function consulta(resposta: unknown) {
  const chamadas: Chamada[] = [];
  const tabelas: string[] = [];
  const builder: Record<string, unknown> = {};
  for (const metodo of ["select", "eq", "in", "lt", "order", "limit"]) {
    builder[metodo] = (...args: unknown[]) => {
      chamadas.push([metodo, ...args]);
      return builder;
    };
  }
  builder.then = (resolver: (valor: unknown) => unknown) => Promise.resolve(resposta).then(resolver);
  const supabase = {
    from: (tabela: string) => {
      tabelas.push(tabela);
      return builder;
    },
  } as unknown as SupabaseClient;
  return { supabase, chamadas, tabelas };
}

const AGORA = new Date("2026-09-26T02:30:00Z");
const DIA = limitesDoDia(AGORA, "America/Sao_Paulo");

beforeEach(() => vi.clearAllMocks());

describe("conversas esperando", () => {
  it("usa a régua da Fila: sem automático no ar, 'automatico' também espera gente", async () => {
    deps.orgTemAutomatico.mockResolvedValue(false);
    deps.listConversationsHandler.mockResolvedValue({
      conversations: [{ id: "c1", awaiting_since: "2026-09-25T12:00:00Z", contacts: { name: "Ana" } }],
      cursor: null,
      has_more: false,
    });
    const { supabase, chamadas, tabelas } = consulta({ count: 7, error: null });
    const resultado = await conversasEsperando(supabase, "org-1", "u-1", "pt-BR");
    expect(tabelas).toEqual(["conversations"]);
    expect(chamadas).toEqual([
      ["select", "id", { count: "exact", head: true }],
      ["eq", "organization_id", "org-1"],
      ["in", "comando_da_conversa", ["aguardando", "automatico"]],
    ]);
    const [, contexto, filtros] = deps.listConversationsHandler.mock.calls[0]!;
    expect(contexto).toMatchObject({ organization_id: "org-1", actor: { type: "user", id: "u-1" } });
    expect(filtros).toMatchObject({ comando: ["aguardando", "automatico"], limit: 5 });
    expect(resultado).toEqual({ total: 7, linhas: [{ id: "c1", nome: "Ana", desde: "2026-09-25T12:00:00Z" }] });
  });

  it("não deu para saber se há automático: assume que há, como a regra manda", async () => {
    deps.orgTemAutomatico.mockResolvedValue(undefined);
    deps.listConversationsHandler.mockResolvedValue({ conversations: [], cursor: null, has_more: false });
    const { supabase, chamadas } = consulta({ count: 0, error: null });
    await conversasEsperando(supabase, "org-1", "u-1", "pt-BR");
    expect(chamadas).toContainEqual(["in", "comando_da_conversa", ["aguardando"]]);
  });

  it("contagem recusada vira falha do bloco (lança)", async () => {
    deps.orgTemAutomatico.mockResolvedValue(true);
    deps.listConversationsHandler.mockResolvedValue({ conversations: [], cursor: null, has_more: false });
    const { supabase } = consulta({ count: null, error: { message: "rls" } });
    await expect(conversasEsperando(supabase, "org-1", "u-1", "pt-BR")).rejects.toThrow("rls");
  });
});

describe("agenda de hoje", () => {
  it("pede o dia da organização por de/ate e conta só o que ocupa o horário", async () => {
    deps.listaAgendamentos.mockResolvedValue({
      ok: true,
      agendamentos: [
        { id: "a1", titulo: "Avaliação", iniciaEm: "2026-09-25T13:00:00Z", situacao: "confirmed", contatoNome: "Ana" },
        { id: "a2", titulo: "Retorno", iniciaEm: "2026-09-25T14:00:00Z", situacao: "cancelled", contatoNome: null },
        { id: "a3", titulo: "Limpeza", iniciaEm: "2026-09-25T15:00:00Z", situacao: "pending", contatoNome: null },
      ],
    });
    const { supabase } = consulta(null);
    const resultado = await agendaDeHoje(supabase, "org-1", DIA);
    expect(deps.listaAgendamentos).toHaveBeenCalledWith(supabase, "org-1", {
      de: "2026-09-25T03:00:00.000Z",
      ate: "2026-09-26T03:00:00.000Z",
      limite: LIMITE_DA_AGENDA,
    });
    expect(resultado).toEqual({
      total: 2,
      linhas: [
        { id: "a1", titulo: "Avaliação · Ana", inicio: "2026-09-25T13:00:00Z" },
        { id: "a3", titulo: "Limpeza", inicio: "2026-09-25T15:00:00Z" },
      ],
    });
  });

  it("recusa da consulta vira falha do bloco", async () => {
    deps.listaAgendamentos.mockResolvedValue({ ok: false, codigo: "erro_interno", motivoParaOperador: "timeout", motivoParaCliente: "" });
    const { supabase } = consulta(null);
    await expect(agendaDeHoje(supabase, "org-1", DIA)).rejects.toThrow("timeout");
  });
});

describe("minhas tarefas", () => {
  it("vencidas e de hoje, da pessoa, abertas, até o fim do dia da organização; 'atrasada' é a regra do original", async () => {
    const { supabase, chamadas, tabelas } = consulta({
      data: [
        { id: "t1", title: "Ligar para a Ana", due_date: "2026-09-24T15:00:00Z", status: "pending" },
        { id: "t2", title: "Enviar orçamento", due_date: "2026-09-25T20:00:00Z", status: "in_progress" },
        { id: "t3", title: "Confirmar retorno", due_date: "2026-09-26T02:50:00Z", status: "pending" },
      ],
      count: 9,
      error: null,
    });
    // 23:30 em São Paulo: t2 venceu às 17:00 de hoje (atrasada, como na tela de
    // tarefas), t3 vence às 23:50 (ainda de hoje).
    const resultado = await minhasTarefas(supabase, "org-1", "u-1", DIA, AGORA);
    expect(tabelas).toEqual(["crm_tasks"]);
    expect(chamadas).toEqual([
      ["select", "id, title, due_date, status", { count: "exact" }],
      ["eq", "organization_id", "org-1"],
      ["eq", "assigned_to", "u-1"],
      ["in", "status", ["pending", "in_progress"]],
      ["lt", "due_date", "2026-09-26T03:00:00.000Z"],
      ["order", "due_date", { ascending: true }],
      ["limit", 5],
    ]);
    expect(resultado).toEqual({
      total: 9,
      linhas: [
        { id: "t1", titulo: "Ligar para a Ana", atrasada: true },
        { id: "t2", titulo: "Enviar orçamento", atrasada: true },
        { id: "t3", titulo: "Confirmar retorno", atrasada: false },
      ],
    });
  });
});

describe("falha isolada por bloco", () => {
  it("um bloco que lança vira 'não deu' e o log diz qual", async () => {
    const resultado = await carregarBloco("agenda", "org-1", async () => {
      throw new Error("caiu");
    });
    expect(resultado).toEqual({ ok: false });
    expect(deps.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ bloco: "agenda", organization_id: "org-1", detalhe: "caiu" }),
    );
  });

  it("um bloco que responde passa os dados como vieram", async () => {
    expect(await carregarBloco("tarefas", "org-1", async () => ({ total: 1 }))).toEqual({ ok: true, dados: { total: 1 } });
  });
});
```

Criar `tests/unit/convexy-inicio-pagina.test.tsx`:
```tsx
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveOrg, AuthUser } from "@/lib/auth/types";

/**
 * Convexy — `/app` (spec 7): com o módulo ligado e o Início visível, é o Início;
 * senão, o redirect de `homeDaInterface` do original — nunca de volta para `/app`.
 */
const deps = vi.hoisted(() => ({
  org: null as ActiveOrg | null,
  modulos: [] as string[],
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: async () => ({ id: "u-1", is_platform_admin: false, support: null, idioma: "pt-BR" }) as unknown as AuthUser,
  resolveActiveOrg: async () => deps.org,
}));
vi.mock("@/lib/instalacao/modulos", () => ({ modulosLigados: async () => deps.modulos }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/app/app/_convexy/inicio/Inicio", () => ({ Inicio: () => null }));

import AppHome from "@/app/app/page";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
import { Inicio } from "@/app/app/_convexy/inicio/Inicio";

const ADMIN: ActiveOrg = { orgId: "org-1", name: "Org", role: "admin", timezone: null };

beforeEach(() => {
  deps.org = ADMIN;
  deps.modulos = [];
});

describe("/app", () => {
  it("módulo desligado: o redirect do original", async () => {
    await expect(AppHome()).rejects.toThrow("NEXT_REDIRECT:/app/inbox");
  });

  it("módulo ligado e Início visível: o Início, com a lista do que a pessoa vê", async () => {
    deps.modulos = [MODULO_DO_MENU];
    const pagina = (await AppHome()) as ReactElement<{ visiveis: readonly string[] }>;
    expect(pagina.type).toBe(Inicio);
    expect(pagina.props.visiveis).toEqual(expect.arrayContaining(["/app", "/app/inbox", "/app/agenda", "/app/tasks"]));
  });

  it("módulo ligado e Início escondido: a primeira tela visível, pela regra do original", async () => {
    deps.modulos = [MODULO_DO_MENU];
    deps.org = { ...ADMIN, interface_settings: { preset: "completa", destinos: ["/app/tasks"] } };
    await expect(AppHome()).rejects.toThrow("NEXT_REDIRECT:/app/tasks");
  });

  it("módulo desligado e só o Início escolhido: sem laço", async () => {
    deps.org = { ...ADMIN, role: "agent", interface_settings: { preset: "completa", destinos: ["/app"] } };
    await expect(AppHome()).rejects.toThrow("NEXT_REDIRECT:/app/settings/profile");
  });

  it("sem organização ativa: o redirect do original", async () => {
    deps.org = null;
    deps.modulos = [MODULO_DO_MENU];
    await expect(AppHome()).rejects.toThrow("NEXT_REDIRECT:/app/settings/profile");
  });
});
```

Criar `tests/unit/convexy-inicio-tela.test.tsx`:
```tsx
import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveOrg, AuthUser } from "@/lib/auth/types";

/**
 * Convexy — a tela do Início (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 7):
 * cada bloco só com o destino dele visível; um bloco que falha não derruba os
 * outros; a espera anterior a hoje mostra o dia; os números se renovam quando a
 * aba volta a ficar visível (não a cada foco).
 */
const deps = vi.hoisted(() => ({
  conversas: vi.fn(),
  agenda: vi.fn(),
  tarefas: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: deps.refresh, push: vi.fn() }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock("@/app/api/v1/conversations/_handler", () => ({ listConversationsHandler: vi.fn() }));
vi.mock("@/lib/agenda/consulta", () => ({ listaAgendamentos: vi.fn() }));
vi.mock("@/lib/ai/agents/org-tem-automatico", () => ({ orgTemAutomatico: vi.fn() }));
vi.mock("@/app/app/_convexy/inicio/blocos", async (original) => ({
  ...(await original<typeof import("@/app/app/_convexy/inicio/blocos")>()),
  conversasEsperando: deps.conversas,
  agendaDeHoje: deps.agenda,
  minhasTarefas: deps.tarefas,
}));

import { Inicio } from "@/app/app/_convexy/inicio/Inicio";
import { RecarregarAoVoltar } from "@/app/app/_convexy/inicio/RecarregarAoVoltar";

const USER = { id: "u-1", idioma: "pt-BR", is_platform_admin: false, support: null } as unknown as AuthUser;
const ORG: ActiveOrg = { orgId: "org-1", name: "Org", role: "admin", timezone: "America/Sao_Paulo" };
const TUDO = ["/app", "/app/inbox", "/app/agenda", "/app/tasks"];
const FALHOU = "Não deu para carregar agora. A página tenta de novo quando você voltar a ela.";
const bloco = (nome: string) => screen.getByRole("region", { name: nome });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T15:00:00Z"));
  deps.conversas.mockResolvedValue({
    total: 3,
    linhas: [
      { id: "c1", nome: "Ana", desde: "2026-09-25T14:05:00Z" },
      { id: "c2", nome: "Bia", desde: "2026-09-24T15:00:00Z" },
    ],
  });
  deps.agenda.mockResolvedValue({ total: 1, linhas: [{ id: "a1", titulo: "Avaliação", inicio: "2026-09-25T17:00:00Z" }] });
  deps.tarefas.mockResolvedValue({ total: 1, linhas: [{ id: "t1", titulo: "Ligar para a Ana", atrasada: true }] });
});
afterEach(() => vi.useRealTimers());

describe("o Início", () => {
  it("cada bloco só aparece com o destino dele visível — e o escondido nem é consultado", async () => {
    render(await Inicio({ user: USER, org: ORG, visiveis: ["/app", "/app/agenda"] }));
    expect(bloco("Agenda de hoje")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Conversas esperando" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Minhas tarefas" })).toBeNull();
    expect(deps.conversas).not.toHaveBeenCalled();
    expect(deps.tarefas).not.toHaveBeenCalled();
  });

  it("um bloco que falha mostra o aviso só nele; os outros seguem com os números", async () => {
    deps.agenda.mockRejectedValue(new Error("caiu"));
    render(await Inicio({ user: USER, org: ORG, visiveis: TUDO }));
    expect(within(bloco("Agenda de hoje")).getByRole("status")).toHaveTextContent(FALHOU);
    expect(within(bloco("Conversas esperando")).getByText("3")).toBeInTheDocument();
    expect(within(bloco("Minhas tarefas")).getByText("Atrasada")).toBeInTheDocument();
    expect(deps.tarefas).toHaveBeenCalledWith({}, "org-1", "u-1", expect.anything(), new Date("2026-09-25T15:00:00Z"));
  });

  it("a espera de hoje mostra a hora; a de antes de hoje, o dia", async () => {
    render(await Inicio({ user: USER, org: ORG, visiveis: TUDO }));
    const conversas = bloco("Conversas esperando");
    expect(within(conversas).getByRole("link", { name: /Ana/ })).toHaveTextContent("11:05");
    expect(within(conversas).getByRole("link", { name: /Bia/ })).toHaveTextContent("24/09");
  });
});

describe("frescor", () => {
  function visibilidade(estado: "visible" | "hidden") {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => estado });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
  }

  it("a aba voltar a ficar visível pede os números de agora; foco sozinho e aba escondida, não", () => {
    render(<RecarregarAoVoltar />);
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(deps.refresh).not.toHaveBeenCalled();
    visibilidade("hidden");
    expect(deps.refresh).not.toHaveBeenCalled();
    visibilidade("visible");
    expect(deps.refresh).toHaveBeenCalledTimes(1);
  });
});
```

Criar `tests/unit/convexy-inicio-fila-do-inbox.test.ts`:
```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Convexy — guarda de fonte da Fila do Início (Decisão 15 do plano). O Início
 * COPIA o predicado da contagem da Fila de `app/api/v1/conversations/counts/route.ts`
 * (lá ele vive dentro do `GET`, sem função extraída). Se o original mudar a
 * régua, este teste reprova e a cópia é reaplicada à mão — a regra está no
 * CONVEXY.md, "Menu novo". Sem esta guarda, o número do Início e o badge do
 * Inbox divergiriam em silêncio.
 */
const leia = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const CONTAGEM = leia("app/api/v1/conversations/counts/route.ts");
const INICIO = leia("app/app/_convexy/inicio/blocos.ts");

describe("a Fila do Início é a Fila do Inbox", () => {
  it("o original ainda monta a contagem como o Início copiou", () => {
    const inicio = CONTAGEM.indexOf("  const countExact = () => {");
    expect(inicio).toBeGreaterThan(-1);
    const corpo = CONTAGEM.slice(inicio, CONTAGEM.indexOf("\n  };\n", inicio) + 5);
    expect(corpo).toContain('.select("id", { count: "exact", head: true })');
    expect(corpo).toContain('.eq("organization_id", org);');
    // `let q = …` e as três reatribuições condicionadas à URL (filtros auxiliares,
    // marcador, não lidas), que o Início não usa. Uma quinta é régua nova: reaplicar.
    expect(corpo.match(/\bq = /g)).toHaveLength(4);
  });

  it("o original ainda resolve o automático antes e pede o conjunto da Fila", () => {
    expect(CONTAGEM).toContain("const automaticoDaOrg = await orgTemAutomatico(supabase, org);");
    expect(CONTAGEM).toContain('countExact().in("comando_da_conversa", comandosDaFila(automaticoDaOrg)),');
  });

  it("o Início usa as mesmas peças, na mesma ordem", () => {
    const peças = [
      "await orgTemAutomatico(supabase, organizationId)",
      "comandosDaFila(automaticoDaOrg)",
      '.select("id", { count: "exact", head: true })',
      '.eq("organization_id", organizationId)',
      '.in("comando_da_conversa", comando)',
    ];
    const posicoes = peças.map((p) => INICIO.indexOf(p));
    expect(posicoes.every((p) => p > -1)).toBe(true);
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });
});
```

- [ ] **Step 2: Fase vermelha no CI (Review Focus 2)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
git add tests/unit/convexy-inicio-dia.test.ts tests/unit/convexy-inicio-blocos.test.ts tests/unit/convexy-inicio-pagina.test.tsx tests/unit/convexy-inicio-tela.test.tsx tests/unit/convexy-inicio-fila-do-inbox.test.ts
git commit -m "test(convexy): o hoje do Início é o da organização, e a Fila é a do Inbox — vermelho antes (spec 7)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow ci.yml --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "ci.yml run=$id exit=$?"
gh run view "$id" -R victorrabyfs/DeskcommCRM --log-failed > "$S/vermelho-rf2-$sha.log"
grep -aE "convexy-inicio-(dia|blocos|pagina|tela|fila-do-inbox)" "$S/vermelho-rf2-$sha.log" | head -10
```
Expected: `exit` diferente de 0 **por causa deste(s) arquivo(s)** (`app/app/_convexy/inicio/*` ainda não existe; `convexy-inicio-dia` é o guarda do Review Focus 2 e `convexy-inicio-pagina` o do "sem laço" do Review Focus 1); anotar o id do run. Outro arquivo vermelho: parar e investigar.

- [ ] **Step 3: `app/app/_convexy/inicio/dia.ts`**

```ts
import { instanteDe, partesNoFuso } from "@/lib/agenda/fuso";
import { tagDeIdioma } from "@/lib/i18n/datas";
import type { Idioma } from "@/lib/i18n/idiomas";

/**
 * O "HOJE" DA ORGANIZAÇÃO, em instantes (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 7).
 *
 * `faixaDePrazo`/`estaAtrasada` (lib/tarefas/tipos.ts) usam o relógio do
 * SERVIDOR, e a VPS roda em UTC; aqui o dia é lido no fuso da organização pelo
 * motor de fuso da Agenda (`partesNoFuso` → parede → `instanteDe`), que resolve
 * horário de verão (num dia sem meia-noite, `de` é o primeiro instante que
 * existiu). `ate` é exclusivo: o primeiro instante do dia seguinte. Serve só de
 * corte de consulta: "atrasada" é a regra do original (`estaAtrasada`).
 */
export interface LimitesDoDia {
  readonly de: Date;
  readonly ate: Date;
}

export function limitesDoDia(agora: Date, fuso: string): LimitesDoDia {
  const hoje = partesNoFuso(agora, fuso);
  const amanha = new Date(Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia + 1));
  return {
    de: instanteDe({ ano: hoje.ano, mes: hoje.mes, dia: hoje.dia }, fuso),
    ate: instanteDe(
      { ano: amanha.getUTCFullYear(), mes: amanha.getUTCMonth() + 1, dia: amanha.getUTCDate() },
      fuso,
    ),
  };
}

/**
 * Um instante como o Início o mostra: a hora, se é de hoje; o dia/mês, se é
 * anterior — a conversa esperando desde ontem não pode parecer de hoje (spec 7).
 */
export function momentoNoDia(instante: Date, dia: LimitesDoDia, fuso: string, idioma: Idioma): string {
  const formato: Intl.DateTimeFormatOptions =
    instante < dia.de ? { day: "2-digit", month: "2-digit" } : { hour: "2-digit", minute: "2-digit" };
  return new Intl.DateTimeFormat(tagDeIdioma(idioma), { ...formato, timeZone: fuso }).format(instante);
}
```

- [ ] **Step 4: `app/app/_convexy/inicio/blocos.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { listConversationsHandler } from "@/app/api/v1/conversations/_handler";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { listaAgendamentos } from "@/lib/agenda/consulta";
import { SITUACOES_QUE_OCUPAM } from "@/lib/agenda/ocupados";
import { orgTemAutomatico } from "@/lib/ai/agents/org-tem-automatico";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import { traduzir } from "@/lib/i18n/dicionario";
import type { Idioma } from "@/lib/i18n/idiomas";
import { comandosDaFila, esperaDaConversa } from "@/lib/inbox/comando-da-conversa";
import { logger } from "@/lib/logger";
import { listConversationsQuerySchema } from "@/lib/schemas";
import { SITUACOES_DA_TAREFA, estaAtrasada, estaEncerrada, type Tarefa } from "@/lib/tarefas/tipos";

import type { LimitesDoDia } from "./dia";

/**
 * Os TRÊS BLOCOS do Início (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 7).
 * Client de SESSÃO (RLS) e `organization_id` da sessão, nunca o admin client.
 * Cada bloco lança quando não consegue responder; `carregarBloco` isola a falha.
 */
export const LINHAS_POR_BLOCO = 5;

/** O padrão da rota da agenda (`GET /api/v1/agenda/agendamentos`). */
export const LIMITE_DA_AGENDA = 200;

export type ResultadoDoBloco<T> = { readonly ok: true; readonly dados: T } | { readonly ok: false };

export async function carregarBloco<T>(
  bloco: string,
  organizationId: string,
  carregar: () => Promise<T>,
): Promise<ResultadoDoBloco<T>> {
  try {
    return { ok: true, dados: await carregar() };
  } catch (erro) {
    logger.warn("[convexy] bloco do Início sem dados", {
      bloco,
      organization_id: organizationId,
      detalhe: erro instanceof Error ? erro.message : String(erro),
    });
    return { ok: false };
  }
}

export interface ConversaEsperando {
  readonly id: string;
  readonly nome: string;
  readonly desde: string | null;
}

/**
 * A Fila do Inbox, com a MESMA régua da aba e do badge
 * (`app/api/v1/conversations/counts/route.ts`): primeiro o fato org-wide
 * (`orgTemAutomatico`), depois o conjunto que a Fila pede (`comandosDaFila`),
 * a contagem `head` com o mesmo predicado, e as linhas pelo próprio handler da
 * lista (mesma ordem por espera). O número bate com o Inbox da pessoa.
 * O predicado é CÓPIA (lá não há função extraída): quem o prende é
 * `tests/unit/convexy-inicio-fila-do-inbox.test.ts`; reaplicar pelo CONVEXY.md.
 */
export async function conversasEsperando(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  idioma: Idioma,
): Promise<{ total: number; linhas: ConversaEsperando[] }> {
  const automaticoDaOrg = await orgTemAutomatico(supabase, organizationId);
  const comando = comandosDaFila(automaticoDaOrg);
  const [contagem, lista] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("comando_da_conversa", comando),
    listConversationsHandler(
      supabase,
      { organization_id: organizationId, actor: { type: "user", id: userId }, requestId: randomUUID(), idioma },
      listConversationsQuerySchema.parse({ comando: comando.join(","), limit: String(LINHAS_POR_BLOCO) }),
    ),
  ]);
  if (contagem.error) throw new Error(contagem.error.message);
  const t = (texto: string) => traduzir(texto, idioma);
  // O `SELECT_COLS` da lista embute `contacts`, como o Inbox lê.
  const conversas = lista.conversations as ConversationWithContact[];
  return {
    total: contagem.count ?? 0,
    linhas: conversas.map((c) => ({ id: c.id, nome: rotuloDoContato(c.contacts, t), desde: esperaDaConversa(c) })),
  };
}

export interface CompromissoDeHoje {
  readonly id: string;
  readonly titulo: string;
  readonly inicio: string;
}

/**
 * A agenda de hoje da organização: `listaAgendamentos` com `de`/`ate` do dia no
 * fuso dela (sem recorte ela recusa com `sem_alvo`; `dia` corta em UTC). Conta
 * só o que ocupa o horário — cancelado e não compareceu ficam fora.
 */
export async function agendaDeHoje(
  supabase: SupabaseClient,
  organizationId: string,
  dia: LimitesDoDia,
): Promise<{ total: number; linhas: CompromissoDeHoje[] }> {
  const resultado = await listaAgendamentos(supabase, organizationId, {
    de: dia.de.toISOString(),
    ate: dia.ate.toISOString(),
    limite: LIMITE_DA_AGENDA,
  });
  if (!resultado.ok) throw new Error(resultado.motivoParaOperador);
  const ocupam: readonly string[] = SITUACOES_QUE_OCUPAM;
  const doDia = resultado.agendamentos.filter((a) => ocupam.includes(a.situacao));
  return {
    total: doDia.length,
    linhas: doDia.slice(0, LINHAS_POR_BLOCO).map((a) => ({
      id: a.id,
      titulo: a.contatoNome ? `${a.titulo} · ${a.contatoNome}` : a.titulo,
      inicio: a.iniciaEm,
    })),
  };
}

export interface TarefaDeHoje {
  readonly id: string;
  readonly titulo: string;
  readonly atrasada: boolean;
}

/** As situações de tarefa em aberto, derivadas da regra do original (`estaEncerrada`). */
const ABERTAS = SITUACOES_DA_TAREFA.filter((situacao) => !estaEncerrada({ status: situacao }));

/**
 * As tarefas da pessoa (`assigned_to`), abertas, vencidas ou de hoje no fuso da
 * organização: o fim do dia dela só CORTA a consulta. "Atrasada" é a regra do
 * original (`estaAtrasada`: tem prazo, o prazo passou, não foi encerrada), a
 * mesma da tela de tarefas. `crm_tasks` não está em `lib/database.types.ts`: a
 * linha é tipada por `Tarefa`, como faz `GET /api/v1/tasks`.
 */
export async function minhasTarefas(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  dia: LimitesDoDia,
  agora: Date,
): Promise<{ total: number; linhas: TarefaDeHoje[] }> {
  const { data, count, error } = await supabase
    .from("crm_tasks")
    .select("id, title, due_date, status", { count: "exact" })
    .eq("organization_id", organizationId)
    .eq("assigned_to", userId)
    .in("status", ABERTAS)
    .lt("due_date", dia.ate.toISOString())
    .order("due_date", { ascending: true })
    .limit(LINHAS_POR_BLOCO);
  if (error) throw new Error(error.message);
  const tarefas = (data ?? []) as Array<Pick<Tarefa, "id" | "title" | "due_date" | "status">>;
  return {
    total: count ?? 0,
    linhas: tarefas.map((t) => ({ id: t.id, titulo: t.title, atrasada: estaAtrasada(t, agora) })),
  };
}
```

- [ ] **Step 5: `app/app/_convexy/inicio/visibilidade.ts`**

```ts
import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import { HREF_DO_INICIO } from "@/lib/convexy/menu/mapa";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
import { modulosLigados } from "@/lib/instalacao/modulos";
import { searchable } from "@/lib/navigation/registry";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * O Início aparece em `/app`? Só com o módulo ligado e o Início em
 * `searchable()` — ou seja, não escondido pela interface (spec 7). Devolve a
 * lista do que a pessoa vê (os blocos só aparecem se o destino deles está nela),
 * ou `null` para o `/app` seguir o redirect do original. `platform_config` só é
 * lida pelo service role, como nos hubs do original.
 */
export async function destinosDoInicio(user: AuthUser, org: ActiveOrg): Promise<readonly string[] | null> {
  const modulos = await modulosLigados(createAdminClient());
  if (!modulos.includes(MODULO_DO_MENU)) return null;
  const hrefs = searchable(user.is_platform_admin && !user.support, org.role, org.interface_settings, modulos).map(
    (d) => d.href,
  );
  return hrefs.includes(HREF_DO_INICIO) ? hrefs : null;
}
```

- [ ] **Step 6: `app/app/_convexy/inicio/CartaoDoInicio.tsx`**

```tsx
import Link from "next/link";

import type { ResultadoDoBloco } from "./blocos";

export interface LinhaDoCartao {
  readonly chave: string;
  readonly texto: string;
  readonly detalhe?: string;
  /** Tarefa atrasada: o detalhe sai em cor de erro. */
  readonly destaque?: boolean;
  readonly href: string;
}

/** Um bloco do Início: contador, até 5 linhas, estado vazio, falha isolada e atalho (spec 7). */
export function CartaoDoInicio({
  id,
  titulo,
  resultado,
  vazio,
  falhou,
  atalho,
}: {
  id: string;
  titulo: string;
  resultado: ResultadoDoBloco<{ total: number; linhas: readonly LinhaDoCartao[] }>;
  vazio: string;
  falhou: string;
  atalho: { href: string; rotulo: string };
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={id} className="text-sm font-semibold text-text">
          {titulo}
        </h2>
        {resultado.ok ? (
          <span className="text-2xl font-semibold text-text tabular-nums">{resultado.dados.total}</span>
        ) : null}
      </div>
      {!resultado.ok ? (
        <p role="status" className="text-sm text-text-muted">
          {falhou}
        </p>
      ) : resultado.dados.linhas.length === 0 ? (
        <p className="text-sm text-text-muted">{vazio}</p>
      ) : (
        <ul className="divide-y divide-border">
          {resultado.dados.linhas.map((linha) => (
            <li key={linha.chave}>
              <Link href={linha.href} className="flex items-center justify-between gap-3 py-2 text-sm text-text hover:text-accent">
                <span className="min-w-0 truncate">{linha.texto}</span>
                {linha.detalhe ? (
                  <span className={linha.destaque ? "shrink-0 text-xs font-medium text-error-fg" : "shrink-0 text-xs text-text-muted"}>
                    {linha.detalhe}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={atalho.href} className="mt-auto text-sm font-medium text-accent hover:underline">
        {atalho.rotulo}
      </Link>
    </section>
  );
}
```

- [ ] **Step 7: `app/app/_convexy/inicio/RecarregarAoVoltar.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Frescor do Início (spec 7): quando a aba volta a ficar VISÍVEL, a página pede
 * ao servidor os números de agora (`router.refresh()` re-renderiza o Server
 * Component e atualiza o "atualizado às"). `visibilitychange`, como o
 * `hooks/auth/InterfaceRefresh.tsx` do original — e não `focus`, que dispara a
 * cada clique de volta na janela e refaria as três consultas sem necessidade.
 */
export function RecarregarAoVoltar() {
  const router = useRouter();
  useEffect(() => {
    const aoMudar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", aoMudar);
    return () => document.removeEventListener("visibilitychange", aoMudar);
  }, [router]);
  return null;
}
```

- [ ] **Step 8: `app/app/_convexy/inicio/Inicio.tsx`**

```tsx
import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { tagDeIdioma } from "@/lib/i18n/datas";
import { createClient } from "@/lib/supabase/server";
import { fusoUtilizavel } from "@/lib/tempo/fusos";

import { agendaDeHoje, carregarBloco, conversasEsperando, minhasTarefas, type ResultadoDoBloco } from "./blocos";
import { CartaoDoInicio, type LinhaDoCartao } from "./CartaoDoInicio";
import { limitesDoDia, momentoNoDia } from "./dia";
import { RecarregarAoVoltar } from "./RecarregarAoVoltar";

type Bloco = ResultadoDoBloco<{ total: number; linhas: readonly LinhaDoCartao[] }>;

function comLinhas<T>(
  resultado: ResultadoDoBloco<{ total: number; linhas: readonly T[] }>,
  linha: (item: T) => LinhaDoCartao,
): Bloco {
  return resultado.ok ? { ok: true, dados: { total: resultado.dados.total, linhas: resultado.dados.linhas.map(linha) } } : resultado;
}

/**
 * O INÍCIO, versão simples desta entrega (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 7). Três
 * blocos, cada um só se o destino dele está no que a pessoa vê, carregados em
 * paralelo e com falha isolada. O "hoje" e as horas são os da organização
 * (`fusoUtilizavel` cai no padrão do produto quando o fuso é nulo ou inválido).
 */
export async function Inicio({ user, org, visiveis }: { user: AuthUser; org: ActiveOrg; visiveis: readonly string[] }) {
  const supabase = await createClient();
  const idioma = user.idioma;
  const fuso = fusoUtilizavel(org.timezone);
  const agora = new Date();
  const dia = limitesDoDia(agora, fuso);
  const hora = new Intl.DateTimeFormat(tagDeIdioma(idioma), { timeZone: fuso, hour: "2-digit", minute: "2-digit" });
  const [conversas, agenda, tarefas] = await Promise.all([
    visiveis.includes("/app/inbox")
      ? carregarBloco("conversas", org.orgId, () => conversasEsperando(supabase, org.orgId, user.id, idioma))
      : null,
    visiveis.includes("/app/agenda")
      ? carregarBloco("agenda", org.orgId, () => agendaDeHoje(supabase, org.orgId, dia))
      : null,
    visiveis.includes("/app/tasks")
      ? carregarBloco("tarefas", org.orgId, () => minhasTarefas(supabase, org.orgId, user.id, dia, agora))
      : null,
  ]);
  const falhou = texto(TEXTOS.inicio.falhou, idioma);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{texto(TEXTOS.portas.inicio, idioma)}</h1>
        <p className="text-xs text-text-muted">
          {texto(TEXTOS.inicio.atualizadoAs, idioma)} {hora.format(agora)}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {conversas ? (
          <CartaoDoInicio
            id="inicio-conversas"
            titulo={texto(TEXTOS.inicio.conversas.titulo, idioma)}
            resultado={comLinhas(conversas, (c) => ({
              chave: c.id,
              texto: c.nome,
              detalhe: c.desde ? momentoNoDia(new Date(c.desde), dia, fuso, idioma) : undefined,
              href: `/app/inbox/${c.id}`,
            }))}
            vazio={texto(TEXTOS.inicio.conversas.vazio, idioma)}
            falhou={falhou}
            atalho={{ href: "/app/inbox", rotulo: texto(TEXTOS.inicio.conversas.atalho, idioma) }}
          />
        ) : null}
        {agenda ? (
          <CartaoDoInicio
            id="inicio-agenda"
            titulo={texto(TEXTOS.inicio.agenda.titulo, idioma)}
            resultado={comLinhas(agenda, (a) => ({
              chave: a.id,
              texto: a.titulo,
              detalhe: momentoNoDia(new Date(a.inicio), dia, fuso, idioma),
              href: "/app/agenda",
            }))}
            vazio={texto(TEXTOS.inicio.agenda.vazio, idioma)}
            falhou={falhou}
            atalho={{ href: "/app/agenda", rotulo: texto(TEXTOS.inicio.agenda.atalho, idioma) }}
          />
        ) : null}
        {tarefas ? (
          <CartaoDoInicio
            id="inicio-tarefas"
            titulo={texto(TEXTOS.inicio.tarefas.titulo, idioma)}
            resultado={comLinhas(tarefas, (t) => ({
              chave: t.id,
              texto: t.titulo,
              detalhe: texto(t.atrasada ? TEXTOS.inicio.tarefas.atrasada : TEXTOS.inicio.tarefas.hoje, idioma),
              destaque: t.atrasada,
              href: "/app/tasks",
            }))}
            vazio={texto(TEXTOS.inicio.tarefas.vazio, idioma)}
            falhou={falhou}
            atalho={{ href: "/app/tasks", rotulo: texto(TEXTOS.inicio.tarefas.atalho, idioma) }}
          />
        ) : null}
      </div>
      <RecarregarAoVoltar />
    </div>
  );
}
```

- [ ] **Step 9: `app/app/page.tsx`**

Substituir o arquivo por:
```tsx
import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { homeDaInterface } from "@/lib/navigation/interface";
// Convexy: com o menu da Convexy ligado e o Início visível, `/app` é o Início.
// CONVEXY.md, "Menu novo".
import { Inicio } from "./_convexy/inicio/Inicio";
import { destinosDoInicio } from "./_convexy/inicio/visibilidade";

export default async function AppHome() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  // Convexy: o Início, ou o redirect do original. CONVEXY.md, "Menu novo".
  const visiveis = org ? await destinosDoInicio(user, org) : null;
  if (org && visiveis) return <Inicio user={user} org={org} visiveis={visiveis} />;
  redirect(
    homeDaInterface(
      org?.interface_settings,
      user.is_platform_admin && !user.support,
      org?.role ?? null,
    ),
  );
}
```

- [ ] **Step 10: Conferir (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git grep -n "createAdminClient" -- app/app/_convexy/inicio/blocos.ts app/app/_convexy/inicio/Inicio.tsx || echo "blocos só com o client de sessão"
git add app/app/_convexy app/app/page.tsx
git commit -m "feat(convexy): o Início em /app — fila, agenda e tarefas do dia (spec 7)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: "blocos só com o client de sessão".

- [ ] **Step 11: Empurrar e ler o CI (`ci.yml`, `perf.yml` e `e2e.yml`: `/app` muda de comportamento)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml perf.yml e2e.yml"
ARQUIVOS="convexy-inicio-(dia|blocos|pagina|tela|fila-do-inbox)|fila-tem-uma-definicao-so|badge-espelha-o-filtro|navegacao-completude|i18n-a-data-segue-o-idioma|i18n-espanhol-cobre-a-tela"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
Expected: os três `exit=0`; rodapé do `ci.yml` sem `failed` nem `Errors`; `convexy-inicio-dia` ✓ (6), `convexy-inicio-blocos` ✓ (8), `convexy-inicio-pagina` ✓ (5), `convexy-inicio-tela` ✓ (4), `convexy-inicio-fila-do-inbox` ✓ (3); `navegacao-completude` ✓ (`_convexy` não é segmento de rota); `i18n-a-data-segue-o-idioma` ✓ (datas por `tagDeIdioma`); o `e2e` verde prova que `/app` segue redirecionando com o módulo desligado (padrão). Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.

---

### Task 11: A prova em tela — `tests/e2e/convexy-menu.spec.ts`

**Files:**
- Create: `tests/e2e/convexy-menu.spec.ts`
- Modify: `.github/workflows/e2e.yml` (uma linha nova dentro da `SPECS_PARTE_N` escolhida no Step 1; padrão: `SPECS_PARTE_1`, logo depois de `convexy-identidade.spec.ts`)

**Interfaces:**
- Consumes: `lerCreds`, `loginComoAdmin`, `loginComoDono`, `CredsE2E` (`tests/e2e/helpers/login-admin.ts`); `credenciaisSupabaseDeTeste` (`scripts/lib/env-de-teste.ts`); `moduloLigado` (`lib/instalacao/modulos.ts`); `scripts/seed-e2e-system-update.ts` (promove o dono a `platform_admins`); `.e2e-creds.json` (`org_id`, `users.agent`).
- Produces: evidência visual em `.superpowers/evidence/convexy-menu/` (DoD 12; pasta ignorada pelo git).

- [ ] **Step 1: Escolher a parte do e2e pela sonda (a) do `e2e.yml` (só leitura)**

A sonda é a do comentário "QUANDO ABRIR A PRÓXIMA PARTE" do `e2e.yml`, com a folga separada por parte (a parte 4 fica fora, como lá):
```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
gh api --paginate "repos/victorrabyfs/DeskcommCRM/actions/runs?per_page=100" --jq \
  '.workflow_runs[]|select(.name=="e2e" and .conclusion=="success")|.id' \
| head -5 | while read r; do gh api "repos/victorrabyfs/DeskcommCRM/actions/runs/$r/jobs" \
    --jq '.jobs[]|select((.name|startswith("e2e-parte")) and .conclusion=="success" and (.name|test("\\(4\\)")|not))
          |"\(.name) \(1800-((.completed_at|fromdateiso8601)-(.started_at|fromdateiso8601)))"'; done \
| awk '{p=$1" "$2; if(!(p in m)||$3<m[p]) m[p]=$3} END{for(p in m) print p, m[p]}' | sort -k3 -n
```
Expected: uma linha por parte (`e2e-parte (N) <menor folga em segundos>`). Regra: se a parte 1 tem menor folga ≥ 360s (a spec nova mede ~4 min; sobram os 120s do gatilho (a)), fica a `SPECS_PARTE_1`; senão, a parte com a MAIOR menor folga, se ela for ≥ 360s. Nenhuma ≥ 360s, ou menos de 5 rodadas verdes no fork: **PARAR e pedir ok ao Victor** com a tabela (abrir parte nova é decisão de workflow). Anotar a parte escolhida `N`.

- [ ] **Step 2: A spec**

Criar `tests/e2e/convexy-menu.spec.ts`:
```ts
/**
 * Convexy — o menu novo, na tela (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 9).
 *
 * O banco do e2e nasce SEM o módulo: todas as specs do original rodam no menu
 * clássico e provam o caminho de volta. Esta spec liga o módulo no preparo —
 * pela tela, como o dono do servidor faz — e no fim devolve EXATAMENTE o que
 * encontrou: a linha do módulo em `platform_config`, o nicho e a interface da
 * organização do e2e. Ela mexe no banco, então só roda contra banco local ou no CI.
 *
 * As sessões são salvas ANTES de ligar o módulo: o helper de login espera
 * `/app/…` depois do MFA, e com o Início a entrada passa a ser `/app`.
 * Medidas por ferramenta (`boundingBox`, `getComputedStyle`), nunca a olho.
 */
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { moduloLigado } from "../../lib/instalacao/modulos";
import { credenciaisSupabaseDeTeste } from "../../scripts/lib/env-de-teste";
import { lerCreds, loginComoAdmin, loginComoDono, type CredsE2E } from "./helpers/login-admin";

const credenciais = credenciaisSupabaseDeTeste();
const BANCO_LOCAL = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/;
test.skip(
  !(process.env.CI === "true" || BANCO_LOCAL.test(credenciais.url)),
  "liga um módulo e grava na organização: só contra banco local ou no CI",
);

const db = createClient(credenciais.url, credenciais.serviceRole, { auth: { persistSession: false } });

const EVIDENCIA = path.join(process.cwd(), ".superpowers", "evidence", "convexy-menu");
const SESSOES = path.join(process.cwd(), ".superpowers", "e2e-sessoes", "convexy-menu");
const SESSAO_ADMIN = path.join(SESSOES, "admin.json");
const SESSAO_AGENTE = path.join(SESSOES, "agente.json");
const CHAVE_DO_MODULO = "MODULO_MENU_CONVEXY";

interface EstadoAntes {
  readonly modulo: Record<string, unknown> | null;
  readonly nicho: string | null;
  readonly interfaceSettings: unknown;
}

let orgId = "";
/** Só existe se o preparo capturou TUDO; o `afterAll` restaura a partir dele e de mais nada. */
let antes: EstadoAntes | null = null;

const evidencia = (nome: string) => path.join(EVIDENCIA, nome);
const menu = (page: Page) => page.locator("[data-menu-convexy]");
const trilho = (page: Page) => page.locator("[data-menu-convexy] > div").first();
const subSidebar = (page: Page, nome: string) => page.getByRole("navigation", { name: nome, exact: true });
const porta = (page: Page, nome: string) => menu(page).getByRole("button", { name: nome, exact: true });

async function largura(elemento: Locator): Promise<number> {
  return Math.round((await elemento.boundingBox())?.width ?? 0);
}

function falhou(contexto: string, error: { message: string } | null): void {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}

async function salvarSessao(browser: Browser, arquivo: string, entrar: (page: Page) => Promise<unknown>) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await entrar(page);
  await contexto.storageState({ path: arquivo });
  await contexto.close();
}

async function entrarComoAgente(page: Page, creds: CredsE2E) {
  await page.goto("/login");
  await page.locator("#email").fill(creds.users.agent!.email);
  await page.locator("#password").fill(creds.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/app\//);
}

async function gravarNicho(nicho: string | null) {
  const { error } = await db.from("organizations").update({ nicho }).eq("id", orgId);
  falhou("nicho do e2e", error);
}

/** A cor que o elemento TEM e a que o token dá no tema em vigor, lidas pelo navegador. */
async function corEToken(alvo: Locator, propriedade: "color" | "backgroundColor", token: string) {
  return alvo.evaluate(
    (el, [prop, tok]) => {
      const sonda = document.createElement("span");
      sonda.style.setProperty(prop === "color" ? "color" : "background-color", `var(${tok})`);
      el.appendChild(sonda);
      const esperado = getComputedStyle(sonda)[prop];
      sonda.remove();
      return { real: getComputedStyle(el)[prop], esperado };
    },
    [propriedade, token] as const,
  );
}

test.describe.configure({ timeout: 120_000 });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(EVIDENCIA, { recursive: true });
  fs.mkdirSync(SESSOES, { recursive: true });
  // O dono do servidor precisa ser admin de plataforma para abrir /admin.
  execFileSync("npx", ["tsx", "scripts/seed-e2e-system-update.ts"], { stdio: "inherit" });
  const creds = lerCreds() as CredsE2E & { org_id: string };
  orgId = creds.org_id;

  const modulo = await db.from("platform_config").select("*").eq("chave", CHAVE_DO_MODULO).maybeSingle();
  falhou("linha do módulo", modulo.error);
  const org = await db.from("organizations").select("nicho, interface_settings").eq("id", orgId).single();
  falhou("organização do e2e", org.error);
  antes = {
    modulo: (modulo.data as Record<string, unknown> | null) ?? null,
    nicho: (org.data as { nicho: string | null }).nicho,
    interfaceSettings: (org.data as { interface_settings: unknown }).interface_settings,
  };

  await salvarSessao(browser, SESSAO_ADMIN, (page) => loginComoAdmin(page, creds));
  await salvarSessao(browser, SESSAO_AGENTE, (page) => entrarComoAgente(page, creds));

  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await loginComoDono(page, lerCreds());
  await page.goto("/admin/sistema");
  const chave = page.getByRole("switch", { name: "Menu da Convexy" });
  await expect(chave).toBeVisible();
  if ((await chave.getAttribute("aria-checked")) !== "true") await chave.click();
  await expect(chave).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => moduloLigado(db, "menu_convexy"), { timeout: 15_000 }).toBe(true);
  await page.goto(`/admin/tenants/${orgId}`);
  const tipo = page.getByLabel("Tipo de negócio");
  await expect(tipo).toBeVisible({ timeout: 15_000 });
  await tipo.selectOption("clinica");
  await expect
    .poll(async () => (await db.from("organizations").select("nicho").eq("id", orgId).single()).data?.nicho, {
      timeout: 15_000,
    })
    .toBe("clinica");
  await page.screenshot({ path: evidencia("00-admin-tipo-de-negocio.png"), fullPage: true });
  await contexto.close();
});

test.afterAll(async () => {
  if (!antes) return;
  if (antes.modulo) {
    const { error } = await db.from("platform_config").upsert(antes.modulo, { onConflict: "chave" });
    falhou("restaurar a linha do módulo", error);
  } else {
    const { error } = await db.from("platform_config").delete().eq("chave", CHAVE_DO_MODULO);
    falhou("apagar a linha do módulo", error);
  }
  const { error } = await db
    .from("organizations")
    .update({ nicho: antes.nicho, interface_settings: antes.interfaceSettings })
    .eq("id", orgId);
  falhou("restaurar a organização do e2e", error);
});

test.describe("como admin da organização, em tela larga", () => {
  test.use({ storageState: SESSAO_ADMIN, viewport: { width: 1440, height: 900 } });

  test("o Início é a entrada de /app, com os três blocos", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { level: 1, name: "Início" })).toBeVisible();
    for (const bloco of ["Conversas esperando", "Agenda de hoje", "Minhas tarefas"]) {
      await expect(page.getByRole("heading", { level: 2, name: bloco })).toBeVisible();
    }
    await expect(page.getByText(/Atualizado às \d{2}:\d{2}/)).toBeVisible();
    await page.screenshot({ path: evidencia("01-inicio.png"), fullPage: true });
  });

  test("porta com sub-sidebar: abre, compacta o trilho e marca o ativo — sem erro de hidratação", async ({ page }) => {
    const erros: string[] = [];
    page.on("console", (mensagem) => {
      if (mensagem.type() === "error") erros.push(mensagem.text());
    });
    await page.goto("/app/contacts");
    const sub = subSidebar(page, "Pacientes");
    await expect(sub).toBeVisible();
    await expect.poll(() => largura(sub)).toBe(240);
    await expect.poll(() => largura(trilho(page))).toBe(64);
    await expect(porta(page, "Pacientes")).toHaveAttribute("aria-expanded", "true");
    await expect(sub.getByRole("link", { name: "Pacientes" })).toHaveAttribute("aria-current", "page");
    expect(erros.filter((e) => /hydrat|#418|#423|#425/i.test(e))).toEqual([]);
    await page.screenshot({ path: evidencia("02-porta-contatos-clinica.png"), fullPage: true });
  });

  test("medidas do protótipo: porta 38px/14,5px, compacta 40px, item 32px, barra centrada e encostada", async ({ page }) => {
    await page.goto("/app/kanban");
    await expect.poll(() => largura(trilho(page))).toBe(236);
    const conversas = porta(page, "Conversas");
    expect(await conversas.evaluate((el) => getComputedStyle(el).height)).toBe("38px");
    expect(await conversas.evaluate((el) => getComputedStyle(el).fontSize)).toBe("14.5px");

    await page.goto("/app/contacts");
    await expect.poll(() => largura(trilho(page))).toBe(64);
    const pacientes = porta(page, "Pacientes");
    expect(await pacientes.evaluate((el) => getComputedStyle(el).height)).toBe("40px");
    const item = subSidebar(page, "Pacientes").getByRole("link", { name: "Prospecção" });
    expect(await item.evaluate((el) => getComputedStyle(el).minHeight)).toBe("32px");

    const barra = await pacientes.locator(".convexy-barra").boundingBox();
    const caixa = await pacientes.boundingBox();
    const borda = await trilho(page).boundingBox();
    expect(barra && caixa && borda).toBeTruthy();
    expect(Math.abs(barra!.y + barra!.height / 2 - (caixa!.y + caixa!.height / 2))).toBeLessThanOrEqual(1);
    expect(Math.round(barra!.height)).toBe(Math.round(caixa!.height) - 18);
    expect(Math.abs(barra!.x - borda!.x)).toBeLessThanOrEqual(1);
  });

  test("abrir uma porta só estreita o conteúdo — a largura nunca volta a crescer no meio", async ({ page }) => {
    await page.goto("/app/kanban");
    await expect.poll(() => largura(trilho(page))).toBe(236);
    const larguras = await page.evaluate(
      () =>
        new Promise<number[]>((resolver) => {
          const conteudo = document.querySelector("main") as HTMLElement;
          const botao = document.querySelector<HTMLElement>('[data-menu-convexy] [data-porta="ia"]')!;
          const medidas: number[] = [];
          const inicio = performance.now();
          const medir = () => {
            medidas.push(conteudo.getBoundingClientRect().width);
            if (performance.now() - inicio < 500) requestAnimationFrame(medir);
            else resolver(medidas);
          };
          requestAnimationFrame(medir);
          botao.click();
        }),
    );
    expect(larguras.length).toBeGreaterThan(5);
    for (let i = 1; i < larguras.length; i++) expect(larguras[i]!).toBeLessThanOrEqual(larguras[i - 1]! + 1);
    expect(larguras.at(-1)!).toBeLessThan(larguras[0]!);
  });

  test("navegar dentro da porta não recria o menu", async ({ page }) => {
    await page.goto("/app/contacts");
    await menu(page).evaluate((el) => {
      (el as HTMLElement & { marcaDoTeste?: string }).marcaDoTeste = "mesmo-no";
    });
    await subSidebar(page, "Pacientes").getByRole("link", { name: "Prospecção" }).click();
    await page.waitForURL(/\/app\/prospecting$/);
    await expect(subSidebar(page, "Pacientes").getByRole("link", { name: "Prospecção" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await menu(page).evaluate((el) => (el as HTMLElement & { marcaDoTeste?: string }).marcaDoTeste)).toBe(
      "mesmo-no",
    );
  });

  test("link direto para tela interna abre a porta certa, com um dono só", async ({ page }) => {
    await page.goto("/app/settings/tenant/agenda");
    const agenda = subSidebar(page, "Agenda");
    await expect(agenda.getByRole("link", { name: "Tipos de agendamento" })).toHaveAttribute("aria-current", "page");
    await expect(menu(page).locator('[aria-current="page"]')).toHaveCount(1);
    await page.goto("/app/ai/cases/avisos");
    const ia = subSidebar(page, "Assistente de IA");
    await expect(ia.getByRole("link", { name: "Aviso no WhatsApp" })).toHaveAttribute("aria-current", "page");
    await expect(ia.getByRole("link", { name: "Casos" })).not.toHaveAttribute("aria-current", "page");
  });

  test("a alça recolhe o menu, e a escolha sobrevive ao recarregar", async ({ page }) => {
    await page.goto("/app/kanban");
    await expect.poll(() => largura(trilho(page))).toBe(236);
    await trilho(page).hover();
    await page.getByRole("button", { name: "Recolher sidebar" }).click();
    await expect.poll(() => largura(trilho(page))).toBe(64);
    await page.reload();
    await expect.poll(() => largura(trilho(page))).toBe(64);
    await page.screenshot({ path: evidencia("03-trilho-recolhido.png"), fullPage: true });
    await page.getByRole("button", { name: "Expandir sidebar" }).click();
    await expect.poll(() => largura(trilho(page))).toBe(236);
  });

  test("os hubs levam à primeira tela da porta deles", async ({ page }) => {
    await page.goto("/app/crm");
    await expect(page).toHaveURL(/\/app\/contacts$/);
    await page.goto("/app/ai");
    await expect(page).toHaveURL(/\/app\/ai\/agents$/);
    await page.goto("/app/analise");
    await expect(page).toHaveURL(/\/app\/metrics$/);
    await page.goto("/app/settings");
    await expect(page).toHaveURL(/\/app\/connections$/);
  });

  test("Esc fecha a sub-sidebar e devolve o foco à porta; clicar de novo reabre", async ({ page }) => {
    await page.goto("/app/contacts");
    const sub = subSidebar(page, "Pacientes");
    await sub.getByRole("link", { name: "Produtos" }).focus();
    await page.keyboard.press("Escape");
    await expect(sub).toHaveCount(0);
    await expect(porta(page, "Pacientes")).toBeFocused();
    await expect(porta(page, "Pacientes")).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => largura(trilho(page))).toBe(236);
    await porta(page, "Pacientes").click();
    await expect(subSidebar(page, "Pacientes")).toBeVisible();
  });

  test("área escondida na tela de interface some do menu", async ({ page }) => {
    await page.goto("/app/settings/tenant");
    await page.getByText("Personalizar áreas visíveis").first().click();
    await page.getByRole("checkbox", { name: "Tags", exact: true }).uncheck();
    await page.getByRole("button", { name: "Aplicar interface" }).click();
    await expect(page.getByText("Menu lateral da empresa salvo.")).toBeVisible();
    await page.goto("/app/settings/profile");
    const configuracoes = subSidebar(page, "Configurações");
    await expect(configuracoes).toBeVisible();
    await expect(configuracoes.getByRole("link", { name: "Tags", exact: true })).toHaveCount(0);
    await page.screenshot({ path: evidencia("04-interface-sem-tags.png"), fullPage: true });
  });

  test("o nicho troca os nomes: clínica × serviços", async ({ page }) => {
    await page.goto("/app/contacts");
    await expect(porta(page, "Pacientes")).toBeVisible();
    await expect(menu(page).getByRole("link", { name: "Funil de pacientes", exact: true })).toBeVisible();
    await gravarNicho("servicos");
    try {
      await page.reload();
      await expect(porta(page, "Contatos")).toBeVisible();
      await expect(menu(page).getByRole("link", { name: "Funil de vendas", exact: true })).toBeVisible();
      await page.screenshot({ path: evidencia("05-porta-contatos-servicos.png"), fullPage: true });
    } finally {
      await gravarNicho("clinica");
    }
  });
});

test.describe("como admin da organização, no tema escuro", () => {
  test.use({ storageState: SESSAO_ADMIN, viewport: { width: 1440, height: 900 }, colorScheme: "dark" });

  test("trilho, porta ativa e rótulo de grupo usam os tokens do escuro", async ({ page }) => {
    await page.goto("/app/contacts");
    await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("dark");
    const fundo = await corEToken(trilho(page), "backgroundColor", "--color-surface");
    expect(fundo.real).toBe(fundo.esperado);
    const ativa = await corEToken(porta(page, "Pacientes"), "color", "--color-accent");
    expect(ativa.real).toBe(ativa.esperado);
    const rotulo = subSidebar(page, "Pacientes").locator("h3").first();
    const cinza = await corEToken(rotulo, "color", "--color-text-muted");
    expect(cinza.real).toBe(cinza.esperado);
    await page.screenshot({ path: evidencia("06-tema-escuro.png"), fullPage: true });
  });
});

test.describe("como admin da organização, entre md e lg", () => {
  test.use({ storageState: SESSAO_ADMIN, viewport: { width: 900, height: 800 } });

  test("a sub-sidebar só aparece por clique, por cima, sem rolagem horizontal; Esc fecha e devolve o foco", async ({ page }) => {
    await page.goto("/app/contacts");
    await expect(subSidebar(page, "Pacientes")).toBeHidden();
    await expect(porta(page, "Pacientes")).toHaveAttribute("aria-expanded", "false");
    await porta(page, "Pacientes").click();
    const sub = subSidebar(page, "Pacientes");
    await expect(sub).toBeVisible();
    await expect(porta(page, "Pacientes")).toHaveAttribute("aria-expanded", "true");
    await expect(sub.getByRole("link").first()).toBeFocused();
    const rolagem = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(rolagem.scrollWidth).toBeLessThanOrEqual(rolagem.clientWidth);
    await page.screenshot({ path: evidencia("07-sobreposicao-900.png"), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(sub).toBeHidden();
    await expect(porta(page, "Pacientes")).toBeFocused();
  });
});

test.describe("como admin da organização, no celular", () => {
  test.use({ storageState: SESSAO_ADMIN, viewport: { width: 390, height: 844 } });

  test("a gaveta mostra as portas e troca pela lista da porta, com ‹ Voltar", async ({ page }) => {
    await page.goto("/app/inbox");
    // Abaixo de `md` o trilho fica na árvore, mas fora da tela (`hidden md:block` do AppShell).
    await expect(menu(page)).toBeHidden();
    await page.getByRole("button", { name: "Abrir navegação" }).click();
    const gaveta = page.getByRole("dialog");
    await gaveta.getByRole("button", { name: "Assistente de IA", exact: true }).click();
    const voltar = gaveta.getByRole("button", { name: "‹ Voltar" });
    await expect(voltar).toBeVisible();
    expect(Math.round((await voltar.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: evidencia("08-gaveta-celular.png"), fullPage: true });
    await gaveta.getByRole("link", { name: "Casos", exact: true }).click();
    await page.waitForURL(/\/app\/ai\/cases$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("como agente", () => {
  test.use({ storageState: SESSAO_AGENTE, viewport: { width: 1440, height: 900 } });

  test("o agente não vê os itens de gerente nem de admin", async ({ page }) => {
    await page.goto("/app/ai/cases");
    const ia = subSidebar(page, "Assistente de IA");
    await expect(ia.getByRole("link", { name: "Casos" })).toHaveAttribute("aria-current", "page");
    for (const nome of ["Assistentes", "Roteadores", "Execuções", "Credenciais"]) {
      await expect(ia.getByRole("link", { name: nome, exact: true })).toHaveCount(0);
    }
    await page.goto("/app/inbox");
    await expect(subSidebar(page, "Conversas").getByRole("link", { name: "Chamadas" })).toHaveCount(0);
    await page.screenshot({ path: evidencia("09-agente.png"), fullPage: true });
  });
});
```

- [ ] **Step 3: A linha no `e2e.yml`**

Em `.github/workflows/e2e.yml`, dentro da `SPECS_PARTE_N` escolhida no Step 1, acrescentar a linha `        convexy-menu.spec.ts` (oito espaços, como as vizinhas). Na `SPECS_PARTE_1` (padrão), trocar:
```yaml
        convexy-identidade.spec.ts
```
por:
```yaml
        convexy-identidade.spec.ts
        convexy-menu.spec.ts
```
Em outra parte, a linha nova vai no fim do bloco `>-` dela. (Sem comentário dentro do bloco `>-`.)

- [ ] **Step 4: Conferir (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
python3 - <<'PY'
import re
y = open(".github/workflows/e2e.yml", encoding="utf-8").read()
for nome, corpo in re.findall(r'(SPECS_PARTE_\d+):\s*>-\n((?:[ ]{8,}.*\n)+)', y):
    if "convexy-menu.spec.ts" in corpo:
        print("convexy-menu em", nome)
PY
grep -cE "login(ComoAdmin|ComoDono|ComoPapel)\s*\(" tests/e2e/convexy-menu.spec.ts
git add tests/e2e/convexy-menu.spec.ts .github/workflows/e2e.yml
git commit -m "test(convexy): menu novo provado em tela — e2e com restauração exata (spec 9)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: `convexy-menu em SPECS_PARTE_N` (exatamente uma linha, a parte do Step 1); `2` chamadas de login (por isso o `test.describe.configure({ timeout: 120_000 })`, que o gate `e2e-dois-logins-nao-cabem-no-teto-padrao` cobra).

- [ ] **Step 5: Empurrar e ler o CI (`ci.yml` e `e2e.yml`)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml e2e.yml"
ARQUIVOS="convexy-menu\\.spec\\.ts|e2e-cobertura-completa|e2e-dois-logins-nao-cabem-no-teto-padrao"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
Depois do laço, a duração de cada parte contra o teto de 1800s, e o sinal de parte que cresceu:
```bash
id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow e2e.yml --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId")
gh api "repos/victorrabyfs/DeskcommCRM/actions/runs/$id/jobs" --jq '.jobs[]|select(.name|startswith("e2e-parte"))
  |"\(.name) \(.conclusion) \((.completed_at|fromdateiso8601)-(.started_at|fromdateiso8601))s de 1800s"'
# A linha RENDERIZADA (`##[error]`), não o `echo` do script que o log também ecoa (ver o comentário da sonda (b) no e2e.yml).
grep -acE '##\[error\].*Nenhum caso vermelho até o corte' "$S/e2e.yml-$sha.log"
```
Expected: os dois `exit=0`; no `ci.yml`, rodapé sem `failed` nem `Errors`, `e2e-cobertura-completa` ✓ (a spec está numa `SPECS_PARTE_*`) e `e2e-dois-logins-nao-cabem-no-teto-padrao` ✓; no `e2e.yml`, as 15 provas de `convexy-menu.spec.ts` ✓ na parte `N`, as cinco `e2e-parte (N)` com `success` (nenhuma `skipped`: o PR toca `app/`), a parte `N` abaixo de 1800s com a folga que o Step 1 previu (±180s), e o `grep -ac` do corte em `0`. As specs do original (`navegacao.spec.ts`, `rbac-roles.spec.ts`, `convexy-identidade.spec.ts` …) passam no menu clássico porque o `afterAll` devolve a linha do módulo como a encontrou. Caso vermelho da spec: `gh run download "$id" -R victorrabyfs/DeskcommCRM` e ler o trace antes de qualquer edição. Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.

---

### Task 12: Registro — `CONVEXY.md`, mapa vivo, jornada e `CHANGELOG.md`

**Files:**
- Modify: `CONVEXY.md:45` (tabela "Base e versões"), `:136` (linha do `Sidebar.tsx` em "Logo maior"), depois de `:154` (seção nova, antes de `## Desvios aceitos`), `:162` (linha "DoD 16"), `:186-188` (linha da 9001) e fim de "Desvios aceitos"
- Create: `docs/architecture/convexy-menu.architecture.json`
- Modify: `docs/testing/user-journey-map.md` (seção nova no fim)
- Modify: `CHANGELOG.md:9-11`

**Interfaces:**
- Consumes: tudo das Tasks 1–11 (nomes de arquivo, trechos, comandos de medida).
- Produces: registro de toda alteração em arquivo do original (tabela Arquivo | Trecho | Reaplicar); desvios; mapa `convexy-menu` (DoD 13); jornada JCVX1 (DoD 12); seção `## [1.48.0-cvx.2]`.

- [ ] **Step 1: "Base e versões"**

Na tabela de `CONVEXY.md`, depois da linha `| Atualização para a base 1.48.0; logo escuro passa a ser o do original (0406) | \`v1.48.0-cvx.1\` |`, acrescentar:
```markdown
| Menu novo da Convexy: portas, sub-sidebar, Início, tipo de negócio por organização (módulo `menu_convexy`; migration 9001) | `v1.48.0-cvx.2` |
```

- [ ] **Step 2: A seção "Menu novo"**

Em `CONVEXY.md`, depois da tabela da seção `### Teste de colisão de migration (\`v1.48.0-cvx.1\`)` e antes de `## Desvios aceitos`, acrescentar:
````markdown
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
| `components/team/InterfaceEditor.tsx` | três imports; `useConvexy()`; `<InterfacePorPortas>` como irmão do bloco do original; a abertura `{!convexy?.menuLigado && NAV_GROUPS.map(` e `&& d.modulo !== MODULO_DO_MENU` na linha `items` | o bloco do original (handler inclusive) fica como vier; reaplicar só as duas linhas e o irmão |
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
````

- [ ] **Step 3: "Logo maior", DoD 16 e desvios aceitos**

Em "Logo maior", trocar a linha da tabela:
```markdown
| `components/shell/Sidebar.tsx` | `h-7` → `h-10` nos dois `<img>` do logo, com o comentário `Convexy` | reaplicar a troca de classe |
```
por:
```markdown
| `components/shell/Sidebar.tsx` | `h-7` → `h-10` nos dois `<img>` do logo, com o comentário `Convexy` — desde a `-cvx.2`, dentro de `MarcaDaBarra` | reaplicar a troca de classe dentro de `MarcaDaBarra` ("Menu novo") |
```
Em "Desvios aceitos", trocar:
```markdown
- **DoD 16** — docs do original não são editados; o que não vale no fork está listado abaixo.
```
por:
```markdown
- **DoD 16** — docs do original não são editados; o que não vale no fork está listado abaixo.
  Exceção desde a `-cvx.2`: `docs/testing/user-journey-map.md` ganha a seção `JCVX1` (menu
  novo), porque o DoD 12 manda registrar ali a jornada provada em tela; reaplicar mantendo a
  seção no fim do arquivo ("Menu novo").
```
Ainda em "Desvios aceitos", trocar:
```markdown
  original (ver "Logo escuro"). A faixa de migrations `9001+` continua reservada ao fork; hoje
  não há nenhuma.
```
por:
```markdown
  original (ver "Logo escuro"). A faixa de migrations `9001+` continua reservada ao fork; hoje
  há a `9001_nicho_da_organizacao` (menu novo, `v1.48.0-cvx.2`).
```
e acrescentar, no fim da lista:
```markdown
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
- **Testes da `-cvx.2`** — nenhuma suíte rodou na máquina local: unitários, cercas e
  typecheck/lint pelo `verify`; migration e RLS pelo `invariants` (install e update); a tela
  pelo `e2e` (`convexy-menu.spec.ts`, na parte escolhida pela sonda (a)) e pela conferência na
  VPS. A fase vermelha dos cinco guardas do "Review Focus" do plano foi vista no CI antes de cada
  implementação. Evidência visual em
  `.superpowers/evidence/convexy-menu/` (artefatos do e2e e capturas da VPS).
```

- [ ] **Step 4: O mapa vivo**

Criar `docs/architecture/convexy-menu.architecture.json`:
```json
{
  "schema_version": 1,
  "diagram_type": "architecture",
  "meta": {
    "title": "Menu novo da Convexy",
    "subtitle": "Projeção do catálogo do original, por módulo da instalação e nicho da organização",
    "output": "convexy-menu.html",
    "quality_profile": "standard"
  },
  "lanes": [
    { "id": "humano", "label": "Pessoa" },
    { "id": "app", "label": "Aplicativo" },
    { "id": "db", "label": "Banco" },
    { "id": "ci", "label": "CI" }
  ],
  "mainPath": ["modulo", "provider", "catalogo", "mapa", "menu", "inicio"],
  "nodes": [
    { "id": "admin", "lane": "humano", "col": 0, "type": "ui", "label": "/admin/sistema e /admin/tenants/[id]" },
    { "id": "modulo", "lane": "db", "col": 1, "type": "database", "label": "platform_config MODULO_MENU_CONVEXY" },
    { "id": "nicho", "lane": "db", "col": 1, "type": "database", "label": "organizations.nicho (migration 9001)" },
    { "id": "rotanicho", "lane": "app", "col": 1, "type": "service", "label": "GET/PATCH admin/tenants/[id]/nicho" },
    { "id": "auditoria", "lane": "db", "col": 2, "type": "database", "label": "api_audit_log tenant.nicho_changed · platform.modulo_updated" },
    { "id": "provider", "lane": "app", "col": 2, "type": "service", "label": "app/app/layout → ConvexyProvider" },
    { "id": "catalogo", "lane": "app", "col": 3, "type": "service", "label": "NAV_CATALOG → searchable()" },
    { "id": "mapa", "lane": "app", "col": 4, "type": "service", "label": "mapa.ts → dono.ts → montar.ts" },
    { "id": "menu", "lane": "humano", "col": 5, "type": "ui", "label": "Trilho, sub-sidebar e gaveta" },
    { "id": "vocabulario", "lane": "app", "col": 5, "type": "service", "label": "useT da Convexy (títulos por nicho)" },
    { "id": "interface", "lane": "humano", "col": 5, "type": "ui", "label": "InterfaceEditor agrupado por portas" },
    { "id": "hubs", "lane": "app", "col": 5, "type": "service", "label": "NavHub → primeira tela da porta" },
    { "id": "orientacoes", "lane": "app", "col": 6, "type": "service", "label": "GET convexy/orientacoes → loadCrmExtensions" },
    { "id": "inicio", "lane": "humano", "col": 6, "type": "ui", "label": "Início: fila, agenda e tarefas do dia" },
    { "id": "gate", "lane": "ci", "col": 4, "type": "service", "label": "convexy-menu-mapa: group novo reprova, telas novas listadas" }
  ],
  "edges": [
    { "id": "e1", "from": "admin", "to": "modulo", "label": "liga/desliga o menu" },
    { "id": "e2", "from": "admin", "to": "rotanicho", "label": "escolhe o tipo de negócio" },
    { "id": "e3", "from": "rotanicho", "to": "nicho", "label": "grava (valor inválido: CHECK recusa; nulo = generico)" },
    { "id": "e4", "from": "rotanicho", "to": "auditoria", "label": "antes e depois" },
    { "id": "e5", "from": "modulo", "to": "auditoria", "label": "quem ligou, de/para" },
    { "id": "e6", "from": "modulo", "to": "provider", "label": "modulos_ligados" },
    { "id": "e7", "from": "nicho", "to": "provider", "label": "lerNicho, consulta própria no Promise.all" },
    { "id": "e8", "from": "catalogo", "to": "mapa", "label": "tela nova entra pelo group" },
    { "id": "e9", "from": "provider", "to": "mapa", "label": "nicho e idioma" },
    { "id": "e10", "from": "mapa", "to": "menu", "label": "portas, grupos, um dono por tela" },
    { "id": "e11", "from": "provider", "to": "menu", "label": "menu novo ou Sidebar do original" },
    { "id": "e12", "from": "provider", "to": "vocabulario", "label": "só com o módulo ligado" },
    { "id": "e13", "from": "vocabulario", "to": "menu", "label": "mesmos rótulos por nicho" },
    { "id": "e14", "from": "mapa", "to": "interface", "label": "mesmo agrupamento" },
    { "id": "e15", "from": "interface", "to": "catalogo", "label": "interface_settings.destinos (mesmo dado)" },
    { "id": "e16", "from": "mapa", "to": "hubs", "label": "PORTA_DO_HUB" },
    { "id": "e17", "from": "hubs", "to": "menu", "label": "link antigo abre a porta" },
    { "id": "e18", "from": "orientacoes", "to": "menu", "label": "grupo Orientações instaladas" },
    { "id": "e19", "from": "catalogo", "to": "inicio", "label": "Início visível em searchable()" },
    { "id": "e20", "from": "mapa", "to": "inicio", "label": "porta Início" },
    { "id": "e21", "from": "gate", "to": "mapa", "label": "laço de retorno do merge do original" },
    { "id": "e22", "from": "catalogo", "to": "gate", "label": "cobertura do catálogo" }
  ]
}
```
(Grau das peças que o DoD 13 pede: `menu` 5, `mapa` 7, `nicho` 2, `vocabulario` 2, `interface` 2, `inicio` 2.)

- [ ] **Step 5: A jornada**

No fim de `docs/testing/user-journey-map.md`, acrescentar:
```markdown

## JCVX1 — Navegar pelo menu novo da Convexy `[P1]` (fork Convexy, `v1.48.0-cvx.2`)

Spec: `tests/e2e/convexy-menu.spec.ts` (job e2e, parte escolhida pela sonda (a) do `e2e.yml`).
Liga o módulo `menu_convexy` pela tela de `/admin/sistema` no preparo e devolve no fim a linha
do módulo, o nicho e a interface exatamente como os encontrou. Só roda contra banco local ou no CI.

| Caso | Esperado |
|---|---|
| JCVX1.1 | O dono do servidor liga "Menu da Convexy" e escolhe "Clínica" como tipo de negócio da empresa |
| JCVX1.2 | `/app` é o Início, com Conversas esperando, Agenda de hoje, Minhas tarefas e "Atualizado às" |
| JCVX1.3 | A porta Pacientes abre a sub-sidebar (240px), o trilho vai a 64px, o item ativo tem `aria-current`, e nenhum erro de hidratação |
| JCVX1.4 | Medidas por `getComputedStyle`: porta 38px/14,5px, compacta 40px, item 32px; a barra do ativo centrada na porta e encostada na borda do trilho |
| JCVX1.5 | Abrir uma porta só estreita o conteúdo (largura medida quadro a quadro, nunca volta a crescer) |
| JCVX1.6 | Navegar dentro da porta mantém o mesmo nó do menu |
| JCVX1.7 | Link direto para tela interna acende um dono só (Tipos de agendamento, Aviso no WhatsApp) |
| JCVX1.8 | A alça recolhe (64px) e a escolha sobrevive ao recarregar |
| JCVX1.9 | Os hubs levam à primeira tela da porta |
| JCVX1.10 | Esc fecha a sub-sidebar e devolve o foco à porta |
| JCVX1.11 | Área escondida em Organização › Menu lateral some do menu |
| JCVX1.12 | Clínica × Serviços: Pacientes/Funil de pacientes × Contatos/Funil de vendas |
| JCVX1.13 | Tema escuro: trilho, porta ativa e rótulo de grupo com as cores dos tokens do escuro |
| JCVX1.14 | Em 900px a sub-sidebar só aparece por clique, por cima, sem rolagem horizontal; Esc fecha e devolve o foco |
| JCVX1.15 | No celular, a gaveta troca pela lista da porta com "‹ Voltar" (≥ 44px) e fecha ao escolher |
| JCVX1.16 | O agente não vê itens de gerente/admin |

**NÃO coberto por esta spec:** os blocos do Início com dados reais de fila, agenda e tarefas (o
banco do e2e não tem conversa esperando) — cobertos pelos unitários `convexy-inicio-*` e
conferidos na VPS.
```

- [ ] **Step 6: A seção no CHANGELOG**

Em `CHANGELOG.md`, trocar:
```markdown
## [Não lançado]

## [1.48.0-cvx.1] — 2026-09-25
```
por (com a **data real do dia**, `date +%F`; `AAAA-MM-DD` é só marcador deste plano):
```markdown
## [Não lançado]

## [1.48.0-cvx.2] — AAAA-MM-DD

Menu novo da Convexy, desligado até o dono do servidor ligar em Configurações do sistema › Módulos opcionais ("Menu da Convexy"). Ligado: poucas portas grandes — Início, Conversas, Agenda, Contatos, Funil, Tarefas, Assistente de IA, Resultados e Configurações no rodapé —, a lista de telas de cada porta ao lado, o menu só com ícones enquanto a lista está aberta, a gaveta no celular e o Início com as conversas esperando, a agenda de hoje e as suas tarefas. Cada empresa ganha um "Tipo de negócio", escolhido pelo dono do servidor na tela da empresa, que troca os nomes do menu: numa clínica, Contatos vira Pacientes. A tela de interface (Organização › Menu lateral, e a de cada pessoa em Equipe) passa a mostrar as mesmas portas. Desligado, tudo como antes. O banco ganha a coluna do tipo de negócio, aplicada sozinha pela atualização.

## [1.48.0-cvx.1] — 2026-09-25
```
e substituir `AAAA-MM-DD` pela saída de `date +%F`.

- [ ] **Step 7: Conferir (só leitura) e commitar**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
python3 -c "import json;m=json.load(open('docs/architecture/convexy-menu.architecture.json'));ids={n['id'] for n in m['nodes']};print('arestas quebradas:',[e['id'] for e in m['edges'] if e['from'] not in ids or e['to'] not in ids]);g=lambda i:sum(1 for e in m['edges'] if i in (e['from'],e['to']));print({i:g(i) for i in ['menu','mapa','nicho','vocabulario','interface','inicio']})"
grep -nE "^## \[1\.48\.0-cvx\.2\] — [0-9]{4}-[0-9]{2}-[0-9]{2}$" CHANGELOG.md
grep -c "Menu novo" CONVEXY.md
git add CONVEXY.md docs/architecture/convexy-menu.architecture.json docs/testing/user-journey-map.md CHANGELOG.md
git commit -m "docs(convexy): registro do menu novo, mapa vivo, jornada e CHANGELOG da -cvx.2

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: `arestas quebradas: []`; os seis graus ≥ 2; a linha da seção com a data de hoje.

- [ ] **Step 8: Empurrar e ler o CI**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
S=.superpowers/sdd/convexy-menu; mkdir -p "$S"
WORKFLOWS="ci.yml"
ARQUIVOS="mapas-de-arquitetura|changelog-cabe-na-tela-da-vps|release-chega-na-lp|acervo-do-changelog-cobra-a-casa|convexy-cabecalho-cvx|evidencia-citada|documentacao-aponta-para-o-que-existe|manifest-cita-caminho"
git push origin convexy/menu-novo
sha=$(git rev-parse HEAD)
for wf in $WORKFLOWS; do
  until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow "$wf" --branch convexy/menu-novo --json databaseId,headSha --jq "[.[]|select(.headSha==\"$sha\")][0].databaseId // empty") && [ -n "$id" ]; do sleep 15; done
  gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status > /dev/null; echo "$wf run=$id exit=$?"
  gh run view "$id" -R victorrabyfs/DeskcommCRM --log > "$S/$wf-$sha.log"
  grep -aE " (Test Files|Tests|Errors) +[0-9]" "$S/$wf-$sha.log" | tail -6
  grep -aE "$ARQUIVOS" "$S/$wf-$sha.log" | grep -aE "✓|×|FAIL|✘" | head -30
done
```
Expected: `ci.yml exit=0`; rodapé sem `failed` nem `Errors`; `mapas-de-arquitetura` ✓ (o mapa novo é coerente e sem ilha); `changelog-cabe-na-tela-da-vps` ✓ (a seção `-cvx.2` cabe no que a VPS recebe), `release-chega-na-lp` e `acervo-do-changelog-cobra-a-casa` ✓; `convexy-cabecalho-cvx` ✓ (o botão "Atualizar" corta as notas no cabeçalho com sufixo); `evidencia-citada` ✓ (nenhum nome de imagem entre crases nos `.md`); `manifest-cita-caminho` ✓. A data da seção é conferida pelo `grep` do Step 7, não por gate. Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints.

---

### Task 13 [GitHub]: PR em revisão, CI, merge, tag, imagens e Release da `v1.48.0-cvx.2`

**Files:** nenhum.

**Modo:** sessão principal, modo padrão de permissão, Victor aprovando cada comando. Nunca em subagente.

**Interfaces:**
- Consumes: Tasks 0–12 em `convexy/menu-novo`; PR rascunho da Task 1.
- Produces: `main` do fork com a `-cvx.2`; tag `v1.48.0-cvx.2`; imagens `:1.48.0-cvx.2` e `stable`; Release `v1.48.0-cvx.2` marcada como a mais recente.

- [ ] **Step 1: Estado antes (só leitura)**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git status --short
git fetch -q origin
git diff --quiet HEAD origin/convexy/menu-novo && echo "branch local = remota"
git merge-base --is-ancestor origin/main HEAD && echo "main dentro da branch"
git log --oneline origin/main..HEAD
```
Expected: árvore limpa; "branch local = remota"; "main dentro da branch" (se a `main` andou: parar e pedir ao Victor o merge da `main` na branch, regra de higiene); o log com o plano e as Tasks 1–12.

- [ ] **Step 2: PARAR e pedir ok ao Victor — tirar o PR do rascunho**

Mostrar ao Victor o log do Step 1 e o link do PR. Com o "sim":
```bash
gh pr edit convexy/menu-novo -R victorrabyfs/DeskcommCRM --title "Convexy 1.48.0-cvx.2: menu novo" --body "Menu novo da Convexy atrás do módulo opcional menu_convexy (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, revisão 4; plano docs/superpowers/plans/2026-09-25-convexy-menu-novo.md). Migration 9001 (organizations.nicho, auditada). Desligado, o app é o do original — as specs do original rodam no clássico. Destino (DoD 18): instalação do fork. DoD 12: tests/e2e/convexy-menu.spec.ts (parte escolhida pela sonda (a) do e2e.yml) + conferência na VPS. DoD 13: docs/architecture/convexy-menu.architecture.json. DoD 17: CHANGELOG escrito à mão (release.yml desligado no fork). Registro: CONVEXY.md, \"Menu novo\".

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr ready convexy/menu-novo -R victorrabyfs/DeskcommCRM
```

- [ ] **Step 3: Esperar os cinco obrigatórios**

`gh pr checks --watch` sai antes de os cinco aparecerem; esperar por nome, com teto de ~90 min:
```bash
inicio=$(date +%s)
while :; do
  linhas=$(gh pr checks convexy/menu-novo -R victorrabyfs/DeskcommCRM --json name,bucket \
    --jq '.[] | select(.name=="verify" or .name=="invariants" or .name=="build-and-size" or .name=="e2e" or .name=="imagens-ok") | "\(.name) \(.bucket)"' 2>/dev/null)
  vistos=$(printf '%s\n' "$linhas" | awk 'NF{print $1}' | sort -u | wc -l | tr -d ' ')
  pendentes=$(printf '%s\n' "$linhas" | grep -c ' pending$')
  echo "$(date +%T) obrigatórios vistos=$vistos/5 pendentes=$pendentes"
  [ "$vistos" -eq 5 ] && [ "$pendentes" -eq 0 ] && break
  [ $(( $(date +%s) - inicio )) -gt 5400 ] && { echo "TETO DE 90 MIN — parar e investigar (fila? job preso?)"; break; }
  sleep 60
done
printf '%s\n' "$linhas" | sort -u
gh pr checks convexy/menu-novo -R victorrabyfs/DeskcommCRM --json name,bucket --jq '.[]|select(.name|startswith("e2e-parte"))|"\(.name) \(.bucket)"'
```
Expected: `build-and-size pass`, `e2e pass`, `imagens-ok pass`, `invariants pass`, `verify pass`; as cinco `e2e-parte (N)` em `pass`, nenhuma `skipping`. Vermelho: o procedimento "CI vermelho: diagnóstico antes de editar" das Global Constraints — `--log-failed` guardado em `.superpowers/sdd/convexy-menu/`; em `build-and-size`, `e2e` ou `imagens-ok`, primeiro o `grep -iE "fonts\.(googleapis|gstatic)\.com|@vercel/turbopack-next/internal/font/google|Failed to fetch"`, e só se casar **um** `gh run rerun <id> -R victorrabyfs/DeskcommCRM --failed`; segunda falha ou outra causa: parar, investigar (superpowers:systematic-debugging) e mostrar ao Victor; só com a causa nomeada, commit novo na branch e voltar ao laço. Nunca desligar check.

- [ ] **Step 4: Data da seção e PARAR — pedir ok ao Victor para o merge**

```bash
grep -n "^## \[1.48.0-cvx.2\] — $(date +%F)$" CHANGELOG.md || echo "DATA DA SEÇÃO DIFERENTE DE HOJE — trocar a data da seção, commitar, empurrar e voltar ao Step 3"
```
Mostrar ao Victor os cinco obrigatórios e as cinco `e2e-parte` em `pass`. Só com o "sim" dele:
```bash
gh pr merge convexy/menu-novo -R victorrabyfs/DeskcommCRM --merge
gh pr view convexy/menu-novo -R victorrabyfs/DeskcommCRM --json state,mergeCommit --jq '.state, .mergeCommit.oid'
```
Expected: `MERGED` e o sha do merge (anotar).

- [ ] **Step 5: Tag — PARAR e pedir ok ao Victor antes de empurrar**

```bash
git fetch origin main
test "$(gh pr view convexy/menu-novo -R victorrabyfs/DeskcommCRM --json state --jq .state)" = MERGED || { echo "PR não está MERGED — não criar tag"; exit 1; }
merge=$(gh pr view convexy/menu-novo -R victorrabyfs/DeskcommCRM --json mergeCommit --jq .mergeCommit.oid)
test "$(git rev-parse origin/main)" = "$merge" || { echo "origin/main não é o merge do PR — não criar tag"; exit 1; }
git tag -a v1.48.0-cvx.2 -m "Convexy 1.48.0-cvx.2 — menu novo" origin/main
git show --no-patch --format='%H %s' v1.48.0-cvx.2^{commit}
```
Com o "sim" do Victor (a tag publica as imagens e move a `stable`):
```bash
git push origin v1.48.0-cvx.2
until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow publish-image.yml --event push --limit 20 --json databaseId,headBranch --jq '[.[]|select(.headBranch=="v1.48.0-cvx.2")][0].databaseId // empty') && [ -n "$id" ]; do sleep 5; done
gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status; echo "exit=$?"
```
Expected: o `pre-push` aceita (`vX.Y.Z-cvx.N`); o run termina verde (inclui `a-tag-veio-da-main` e `promover-stable`). Falha: o procedimento "CI vermelho: diagnóstico antes de editar" — guardar o `--log-failed`, procurar a queda do Google Fonts; se casar, **um** `gh run rerun "$id" -R victorrabyfs/DeskcommCRM --failed`; segunda falha ou outra causa: parar e investigar com o Victor. Nunca apagar nem refazer a tag.

- [ ] **Step 6: Imagens publicadas**

```bash
digest_de() { local i=$1 ref=$2 t; t=$(curl -s "https://ghcr.io/token?scope=repository:victorrabyfs/$i:pull&service=ghcr.io" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  curl -sI -H "Authorization: Bearer $t" -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.docker.distribution.manifest.v2+json" \
    "https://ghcr.io/v2/victorrabyfs/$i/manifests/$ref" | awk 'tolower($1)=="docker-content-digest:"{print $2} /^HTTP/{print $2}' | tr -d '\r' | paste -sd' ' -; }
for i in deskcommcrm deskcomm-worker deskcomm-scheduler deskcomm-voice-agent; do
  echo "$i cvx2=$(digest_de $i 1.48.0-cvx.2) stable=$(digest_de $i stable)"
done
```
Expected: em cada imagem, `200` e o mesmo digest em `cvx2` e `stable`.

- [ ] **Step 7: PARAR e pedir ok ao Victor — a Release no GitHub (obrigatória)**

Desde a `1.48.0` o botão "Atualizar" e o `update.sh` escolhem a versão por `/releases/latest` (`CONVEXY.md`, "Base e versões"): sem Release, a VPS não vê a `-cvx.2`. Com o "sim":
```bash
notas=$(awk '/^## \[1\.48\.0-cvx\.2\]/{f=1;next} /^## \[/{f=0} f' CHANGELOG.md)
gh release create v1.48.0-cvx.2 -R victorrabyfs/DeskcommCRM --verify-tag --latest --title v1.48.0-cvx.2 --notes "$notas"
gh release view -R victorrabyfs/DeskcommCRM --json tagName,isLatest --jq '"\(.tagName) latest=\(.isLatest)"'
```
Expected: `v1.48.0-cvx.2 latest=true`.

---

### Task 14 [VPS]: Aplicar a `-cvx.2`, ligar o módulo, escolher os nichos e conferir na tela

**Files:** nenhum no repositório; evidência em `.superpowers/evidence/convexy-menu/` (ignorada pelo git).

**Modo:** sessão principal, modo padrão de permissão, Victor aprovando cada comando. Clicar em "Atualizar", ligar o módulo e escolher os nichos são **ações do Victor pela tela**; a conferência por ferramenta é do Claude (Claude in Chrome), com a aprovação dele.

**Interfaces:**
- Consumes: Task 13 (Release `latest`); VPS em `v1.48.0-cvx.1`.
- Produces: produção em `1.48.0-cvx.2`, coluna `organizations.nicho` com a CHECK, módulo `menu_convexy` ligado, Convexy = `servicos`, organização de teste = `clinica`, conferência medida.

- [ ] **Step 1: PARAR e pedir ok ao Victor — estado de partida (só leitura)**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300'
ssh <host-ssh> 'bash -s' <<'EOF'
set -euo pipefail
cd /opt/deskcommcrm
source hostgator-setup-kit/_common.sh
enter_project
psql_run -tA -c "select 'COLUNA|' || count(*) from information_schema.columns where table_schema = 'public' and table_name = 'organizations' and column_name = 'nicho';" </dev/null
psql_run -tA -c "select 'MODULO|' || coalesce((select valor from public.platform_config where chave = 'MODULO_MENU_CONVEXY'), 'ausente');" </dev/null
EOF
```
Expected: `v1.48.0-cvx.1`; health com `"version":"1.48.0-cvx.1"`; `COLUNA|0`; `MODULO|ausente`. (O `</dev/null` é obrigatório: o `psql_run` roda `docker run -i`. **Nunca** `set -x`/`bash -x` num bloco com `psql_run` — o rastreio imprimiria a connection string.)

- [ ] **Step 2: Atualizar pelo botão (Victor)**

Em até 5 min, `https://<dominio-de-producao>/app/settings/atualizacao` mostra `1.48.0-cvx.2` com as notas do menu novo. **Victor clica em "Atualizar".** Acompanhar (teto de 20 min):
```bash
ssh <host-ssh> 'for i in $(seq 1 60); do v=$(curl -s https://<dominio-de-producao>/api/v1/health | grep -o "\"version\":\"[^\"]*\""); echo "$(date +%T) $v"; case "$v" in *1.48.0-cvx.2*) break;; esac; sleep 20; done'
```
Se não chegar: não clicar de novo; diagnosticar só lendo (`git describe`, `grep -E "^(APP|WORKER|SCHEDULER|VOICE_AGENT)_IMAGE=" .env`, `tail -n 40 .deskcomm-banco.log`, `docker ps`), mostrar ao Victor e, com o "sim", retomar dentro de `tmux`:
```bash
ssh -t <host-ssh> 'cd /opt/deskcommcrm && if tmux has-session -t update-menu-novo 2>/dev/null; then echo "JÁ EXISTE: tmux attach -t update-menu-novo"; else tmux new -s update-menu-novo "bash hostgator-setup-kit/update.sh --to v1.48.0-cvx.2 --force 2>&1 | tee /root/update-$(date +%Y%m%d-%H%M)-menu-novo.log; echo FIM; read"; fi'
```

- [ ] **Step 3: Versão, saúde, 307 e o banco**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; curl -s -o /dev/null -w "%{http_code}\n" https://<dominio-de-producao>/; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300; echo; grep -nE "organizations_nicho_valido|ERROR" .deskcomm-banco.log | tail'
ssh <host-ssh> 'bash -s' <<'EOF'
set -euo pipefail
cd /opt/deskcommcrm
source hostgator-setup-kit/_common.sh
enter_project
psql_run -tA -c "select 'COLUNA|' || data_type || '|' || is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'organizations' and column_name = 'nicho';" </dev/null
psql_run -tA -c "select 'REGRA|' || count(*) from pg_constraint where conname = 'organizations_nicho_valido';" </dev/null
psql_run -tA -c "select 'NICHOS|' || count(*) filter (where nicho is not null) from public.organizations;" </dev/null
EOF
```
Expected: `v1.48.0-cvx.2`; `307`; health `1.48.0-cvx.2`; nenhum `ERROR` novo desta aplicação no log do banco; `COLUNA|text|YES`; `REGRA|1`; `NICHOS|0`. Menu ainda o clássico (módulo desligado) — conferir no navegador que nada mudou na tela.

- [ ] **Step 4: PARAR e pedir ok ao Victor — ligar o módulo (pela tela)**

Victor abre `https://<dominio-de-producao>/admin/sistema` › Módulos opcionais e liga **"Menu da Convexy"**. Conferir:
```bash
ssh <host-ssh> 'bash -s' <<'EOF'
set -euo pipefail
cd /opt/deskcommcrm
source hostgator-setup-kit/_common.sh
enter_project
psql_run -tA -c "select 'MODULO|' || valor from public.platform_config where chave = 'MODULO_MENU_CONVEXY';" </dev/null
psql_run -tA -c "select 'AUDIT|' || count(*) from public.api_audit_log where action = 'platform.modulo_updated' and metadata->>'modulo' = 'menu_convexy';" </dev/null
EOF
```
Expected: `MODULO|ligado`; `AUDIT|` ≥ 1.

- [ ] **Step 5: PARAR e pedir ok ao Victor — os nichos (pela tela)**

Victor abre `/admin/tenants/<id-da-convexy>` e escolhe **"Serviços, agência ou obra"** no "Tipo de negócio"; depois `/admin/tenants/<id-da-organizacao-de-teste>` (a que ele indicar) e escolhe **"Clínica, consultório ou salão"**. Conferir:
```bash
ssh <host-ssh> 'bash -s' <<'EOF'
set -euo pipefail
cd /opt/deskcommcrm
source hostgator-setup-kit/_common.sh
enter_project
psql_run -tA -c "select 'NICHO|' || slug || '|' || nicho from public.organizations where nicho is not null order by slug;" </dev/null
psql_run -tA -c "select 'AUDIT|' || count(*) from public.api_audit_log where action = 'tenant.nicho_changed';" </dev/null
EOF
```
Expected: duas linhas `NICHO|<slug>|servicos` e `NICHO|<slug>|clinica` (os slugs reais ficam na tela, nunca no repositório); `AUDIT|2`.

- [ ] **Step 6: Conferência em tela, por ferramenta (DoD 12)**

Com a aprovação do Victor, pelo navegador dele (Claude in Chrome), logado como admin da organização de teste, medir com `getBoundingClientRect`/`getComputedStyle` e salvar as capturas em `.superpowers/evidence/convexy-menu/vps-*`:
1. `/app` é o Início com os três blocos e "Atualizado às HH:MM" no fuso da organização.
2. `/app/contacts` em 1440px: trilho `64`, sub-sidebar `240`, porta "Pacientes" com `aria-expanded="true"`; botão de porta `38px` de altura; texto da porta `14.5px`; item `≥ 32px` e `13.5px`.
3. `/app/kanban` em 1440px: trilho `236`; a alça aparece no hover, recolhe para `64` e sobrevive ao recarregar (e volta).
4. Em 900px: a sub-sidebar só aparece ao clicar numa porta, por cima da página, com fundo escurecido; Esc e clique fora fecham.
5. Em 390px: a gaveta, "‹ Voltar", e nenhum `scrollWidth > clientWidth` no `body`.
6. Tema claro e escuro: nenhuma cor fora de token (fundo do trilho = `--color-surface`).
7. Na organização da Convexy: "Contatos" e "Funil de vendas".
Mostrar as medidas ao Victor; o olhar dele é complemento.

- [ ] **Step 7: Se algo estiver errado — regra de decisão**

- **Qualquer defeito do menu novo** (visual, navegação, nome): **desligar o módulo em `/admin/sistema`** — volta o menu do original na hora, sem publicar versão e sem perder escolha de interface (spec 5). Corrigir para a frente, na `-cvx.3`.
- **Só um rollback de versão** se o app falhar **com o módulo desligado** (não dá para entrar, atender, mover lead, agendar): `CONVEXY.md`, "Rollback de uma versão da etapa 3", com alvo `v1.48.0-cvx.1` e sessão `tmux` `rollback-menu-novo`. A coluna `organizations.nicho` fica no banco e é inofensiva para a `-cvx.1` (nenhum código a lê).

---

## Cobertura da spec

| Spec | Onde |
|---|---|
| 1. Projeção do `NAV_CATALOG`; tela nova entra sozinha; volta pelo módulo | Tasks 4 (`mapa.ts`, `convexy-menu-mapa`), 2 (módulo), 14 Step 7 |
| 2. Opção B: 8 portas + Configurações no rodapé; sub-sidebar abre e leva à 1ª tela; trilho 64 automático/alça; hover; `GearSix`; Início | Tasks 4 (`PORTAS`), 6 (`MenuConvexy`, `BotaoDaPorta`), 10 |
| 3.1 Portas, conteúdo, 55 entradas + Início uma vez; uso diário no grupo principal; saúde sobe; descrição como dica | Task 4 (`convexy-menu-mapa`: cobertura, uso diário; `montar`: saúde), Task 6 (`ListaDaPorta` com dica 500ms) |
| 3.2 Posição padrão por `group`; CI reprova `group` novo; lista posições por padrão | Task 4 (`PADRAO_POR_GRUPO`, `posicoesPorPadrao`, casos do mapa) |
| 3.3 Um dono por tela; `donosExtras`; toda `page.tsx` com dono | Task 4 (`dono.ts`, `convexy-menu-dono`) |
| 3.4 Sem hubs; `NavHub` redireciona por porta; orientações em Contatos, rota de leitura, aviso | Tasks 9 (`destinoDoHub`, `NavHub`, rota, hook), 6 (`ListaDaPorta`) |
| 3.5 `searchable()`; grupo/porta vazios somem; porta de um item direta; atualização só admin de plataforma fora do suporte; `VersionFooter`; topo igual | Tasks 4 (`montar`), 6 (desktop), 7 (gaveta) |
| 3.6 Tela de interface reaproveitada, agrupada por portas, caixa por porta; clássico igual; mesmo dado; Início escondível, `Gauge`, `SIMPLIFICADA` | Tasks 8, 2 |
| 4. Medidas, dicas, compactação sem `toggleSidebar`, alça com cookie, ×, porta ativa por `usePathname`, reabrir, `md`–`lg` por cima, celular, movimento 300ms, reduced motion, APG, tokens, sticky | Tasks 6 (desktop + estrutura), 7 (gaveta), 11 (e2e), 14 Step 6 |
| 5. Módulo `menu_convexy`/`MODULO_MENU_CONVEXY`; `/admin/sistema`; `modulos_ligados`; e2e liga e devolve o estado encontrado | Tasks 2 (`lib/convexy/modulo.ts`, interruptor), 5 (layout), 11 (captura e restauração exatas) |
| 6.1 `organizations.nicho` + CHECK; 9001 + baseline + MANIFEST; rota PATCH com guardas e audit; campo no admin; leitura no layout; nichos da implantação | Tasks 1, 3, 5, 14 Step 5 |
| 6.2 Rótulos por href e nicho; Meta Ads distintos; item sem rótulo usa o do catálogo | Task 4 (`ROTULOS_DOS_ITENS`, `montar`) |
| 6.3 `useT` da Convexy: quatro títulos, provider por pedido, original fora; o vocabulário alcança ⌘K e o sino (Decisão 13, **aceita** pela coordenação — a spec vai à revisão 5) | Task 5; Task 12 Step 3 (desvio registrado) |
| 6.4 Onde o nome antigo continua, medido | Task 12 Step 3 (comandos no `CONVEXY.md`) |
| 7. Início: quando aparece; três blocos com contador/5 linhas/atalho/vazio/falha; permissões por bloco; frescor (`visibilitychange`); sessão; "hoje" da organização (horário de verão); "atrasada" do original; espera antiga com o dia; a Fila é a do Inbox; entradas que vão ao Inbox; o Início nunca é área de trabalho | Tasks 10 (`convexy-inicio-*`), 2 e 8 (Decisão 3), 12 Step 3 |
| 8. Textos em `textos.ts` com `es`; exceção do Início no dicionário | Tasks 3, 2, 4 (`convexy-menu-textos`) |
| 9. Unitários, invariantes, e2e, gates existentes | Tasks 1–11 (cada Step de CI lê os arquivos) |
| 10. Arquivos novos e alterados | File Structure; Task 12 Step 2 (tabela do `CONVEXY.md`) |
| 11. DoD 12, 13, 14, 17, 18; desvio do `i18n-espanhol` | Tasks 11, 12, 13, 14 |
| 12. Riscos (hidratação, vazamento de nicho, merge) | Review Focus (fase vermelha no CI, Decisão 25); Tasks 5, 6 (`hydrateRoot` sem erro recuperável), 10 (guarda de fonte da Fila), 12 |

## Pronto quando

- As Tasks 1–12 estão na `main` do fork por merge commit, com os cinco checks obrigatórios e as cinco `e2e-parte` em `pass`.
- A fase vermelha dos cinco guardas do Review Focus foi vista no CI antes de cada implementação, com o id de cada run anotado.
- A tag `v1.48.0-cvx.2` existe, as quatro imagens `:1.48.0-cvx.2` e `stable` têm o mesmo digest, e a Release `v1.48.0-cvx.2` é a `latest`.
- A VPS responde `1.48.0-cvx.2`, `307` na raiz, `organizations.nicho` com a CHECK, `MODULO_MENU_CONVEXY = ligado`, Convexy = `servicos`, organização de teste = `clinica`, e a conferência medida da Task 14 Step 6 foi mostrada ao Victor.
- O `CONVEXY.md` registra toda alteração em arquivo do original e os desvios; o mapa `convexy-menu` e a jornada JCVX1 estão no repositório.
