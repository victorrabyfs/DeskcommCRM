# Menu novo da Convexy — desenho

**Status:** revisão 2, para aprovação · **Data:** 2026-09-25 · **Fork:** `victorrabyfs/DeskcommCRM`
**Base:** `v1.48.0` do original (`main` do fork depois do PR #7).
**Entrega 1 de 2.** A entrega 2 (painel Início por nicho) terá spec própria.
**Protótipo aprovado:** artefato "Menu da Convexy", rodada 2, versão 6.

A revisão 2 incorpora três revisões independentes: exatidão contra o código, compatibilidade com
o original/CI, e experiência/segurança. O que mudou está na seção 13.

## 1. Objetivo

Trocar o menu lateral do app (`/app/**`) por um menu mais amigável para quem opera o dia a
dia (recepção, gestores e a própria Convexy):
- poucas portas grandes;
- uma **sub-sidebar** ao lado quando a porta tem submenus;
- nomes que acompanham o **nicho** da organização;
- microinterações suaves.

O menu clássico do original continua no código e volta com uma constante.

Critérios de sucesso:
1. Toda tela que hoje tem porta, **inclusive os hubs de grupo**, continua alcançável pelo menu
   novo, respeitando papel, módulos e interface por vínculo exatamente como hoje.
2. Uma atualização do original que crie tela ou hub sem lugar no menu novo reprova o CI.
3. As mudanças em arquivos do original cabem numa lista curta (seção 10), registrada no
   `CONVEXY.md`, **sem tocar em `lib/i18n/dicionario.ts`**.
4. Voltar ao menu clássico é mudar uma constante e publicar uma versão.

Fora do escopo:
- o painel Início por nicho (entrega 2);
- mudar o que cada papel pode ver;
- renomear textos desenhados no servidor (seção 6.4).

## 2. Decisões tomadas com o Victor

| Tema | Decisão |
|---|---|
| Estrutura | Opção B: 8 portas + Configurações no rodapé |
| Sub-sidebar | Abre ao clicar e fica aberta; já leva à primeira tela da porta |
| Trilho compacto | Só ícones (64px). Automático com sub-sidebar aberta; ou manual pela alça |
| Recolher | Alça redonda na borda do menu, abaixo do logo, visível no hover; some com sub-sidebar aberta |
| Hover | Realce suave, seta que desliza, leve "afundar" no clique, barra azul do ativo. Sem aumento de ícone |
| Menu antigo | Fica no código; o novo é o padrão. Voltar = trocar a constante |
| Implementação | Arquivos novos da Convexy "por cima" do catálogo do original |
| Início | Entra agora, em versão simples; números por nicho na entrega 2 |
| Nicho | Por organização; a Convexy é `servicos` |
| Nomes | Camada de vocabulário por nicho |

## 3. Estrutura do menu

Portas, na ordem. "Direto" = navega sem sub-sidebar. "Visão geral" = a página-hub do grupo no
original (`NAV_GROUPS[].hub`), que continua existindo e é a única porta das contribuições de
extensões em `/app/crm`.

| Porta | Ícone | Comportamento | Conteúdo |
|---|---|---|---|
| Início | casa | direto | `/app` (seção 7) |
| Conversas | balão | sub | `/app/inbox`, `/app/radar`, `/app/templates` · *Envios:* `/app/campaigns`, `/app/calls` |
| Agenda | calendário | sub | `/app/agenda`, `/app/comandas` · *Ajustes:* `/app/settings/tenant/agenda` |
| Contatos | pessoas | sub | `/app/contacts`, `/app/prospecting`, `/app/products` · *Visão geral:* `/app/crm` |
| Funil | funil | direto | `/app/kanban` |
| Tarefas | check | direto | `/app/tasks` |
| Assistente de IA | robô | sub | `/app/ai/agents`, `/app/ai/followups`, `/app/ai/atendimento`, `/app/ai/knowledge/sources`, `/app/ai/inbox` · *Acompanhar:* `/app/ai/cases`, `/app/ai/proposals`, `/app/ai/runs`, `/app/ai/usage`, `/app/ai/cases/avisos` · *Avançado:* `/app/ai/routers`, `/app/ai/providers`, `/app/ai/credentials`, `/app/ai/memory`, `/app/ai/skills` · *Visão geral:* `/app/ai` |
| Resultados | gráfico | sub | `/app/metrics`, `/app/faturamento`, `/app/ads/meta`, `/app/activities` · *Mais:* `/app/ai/evolution`, `/app/audit` · *Visão geral:* `/app/analise` |
| Configurações (rodapé) | engrenagem | sub | *Organização:* `/app/settings/tenant`, `/app/team`, `/app/settings/tenant/financeiro`, `/app/settings/marca`, `/app/settings/tags`, `/app/settings/tenant/pipelines`, `/app/settings/atendimento`, `/app/settings/conversoes` · *Integrações:* `/app/connections`, `/app/settings/meta-ads`, `/app/webhooks`, `/app/integrations/nuvemshop`, `/app/settings/api-tokens`, `/app/settings/voip-trunk`, `/app/extensions`, `/app/integracao-dados` · *Minha conta:* `/app/settings/profile`, `/app/settings/security`, `/app/settings/notifications`, `/app/lgpd/requests`, `/app/settings/billing` · *Visão geral:* `/app/settings` |

Cobertura: as 55 entradas do `NAV_CATALOG` da `1.48.0` aparecem exatamente uma vez, e os 4 hubs
também. Nuvemshop volta a ter porta (em Integrações). O original a tinha tirado do menu lateral
por falta de espaço, e aqui ela só aparece para `admin`. Os nomes são os do nicho `generico`; a
seção 6 diz o que muda por nicho.

### 3.1 Rotas-filhas (qual porta acende)

`lib/convexy/menu/mapa.ts` declara `rotasFilhas`: prefixos que não são destino do catálogo, mas
pertencem a uma porta.
- `/app/leads/` → Funil
- `/app/pipelines/` → Funil
- `/app/settings/canal-oficial`, `/app/settings/templates` → Configurações (Integrações)
- `/app/settings/atualizacao` → Configurações

Cada `page.tsx` em `app/app/**` resolve para uma porta ou para `nenhuma`, e `nenhuma` é explícito
no mapa e tem motivo.

### 3.2 Regras

- **Visibilidade não é decidida aqui.** O menu recebe `searchable(isPlatformAdmin, role,
  interface_settings, modulos_ligados)` (`lib/navigation/registry.ts`). É a mesma lista da busca
  ⌘K: o catálogo inteiro filtrado por papel, interface por vínculo (incluindo o preset
  "simplificada"), módulos e admin de plataforma. O primeiro argumento é
  `user.is_platform_admin && !user.support`, como no `Sidebar.tsx`.
  - **Não** `sidebarGroups()`: essa função devolve só as entradas do menu clássico.
  - Um hub aparece se ao menos um destino do seu grupo está visível, a mesma regra do original.
- Item fora da lista não aparece. Grupo sem itens some. Porta sem itens some.
- Porta com **um** item visível vira "direto" para ele e mostra o nome da porta.
- Clicar numa porta com sub-sidebar navega para o primeiro item visível dela.
- **Ativo = o prefixo mais longo que casa, entre todos os hrefs e rotas-filhas.** Uma porta
  ativa, um item ativo.
  - `/app/settings/tenant/agenda` acende Agenda, não Configurações.
  - `/app/ai/cases/avisos` acende "Aviso no WhatsApp", não "Casos".
- `healthDot` (só `/app/connections` tem) aparece no item e sobe para a porta Configurações,
  inclusive no trilho compacto.
- O rodapé mantém o `VersionFooter`.
- A barra do topo não muda.

## 4. Comportamento e aparência

**Menu largo:** 236px; botões de 38px de altura, texto de 14,5px e ícones de 19px.

**Trilho compacto:** 64px, só ícones de 20px.
- **Dica com o nome** no hover e no foco. Em toque (`pointer: coarse`) não há hover: aí o menu
  largo é a forma padrão, e o compacto só aparece com a sub-sidebar aberta, cujo título diz onde
  se está.
- **Contador ou ponto** vira uma bolinha no canto do ícone.
- **Compactação automática** (sub-sidebar aberta) é estado de tela. Não chama `toggleSidebar`,
  que faz `revalidatePath`.
- **Recolher manual** pela alça grava o cookie `sidebar_collapsed`, que já existe, e o servidor
  desenha certo.
- **Sub-sidebar fechada por "×":** volta ao estado manual (largo ou recolhido).

**Sub-sidebar:** 240px.
- Título da porta com "×" afastado da borda.
- Grupos com rótulo pequeno; itens de 32px e 13,5px.
- Nome longo quebra a linha; lista longa rola dentro dela.
- "Visão geral" é o último item, separado.

**Aberta ou fechada:**
- **Quando abre:** a sub-sidebar está aberta quando a porta ativa (seção 3.2) tem sub, a não ser
  que a pessoa a tenha fechado no "×" para aquela porta nesta aba.
- **De onde vem a porta ativa:** é derivada de `usePathname()` no componente cliente, que já tem
  o caminho no SSR. Link direto, recarregar, voltar e avançar abrem certo e sem animação na
  primeira pintura.
- **Reabrir:** clicar de novo na porta ativa reabre.
- **Trocar de organização:** a porta volta à regra acima para a organização nova.

**Largura intermediária (entre `md` e `lg`):** a sub-sidebar abre **por cima** da página, com
fundo escurecido. Fecha com Esc, com clique fora ou ao escolher um item. Em tela larga ela
empurra o conteúdo.

**Celular (`< md`):** a gaveta do `MobileSidebar` mostra o menu largo. Uma porta com sub troca o
conteúdo da gaveta pela lista dela, com "‹ Voltar". Escolher um item fecha a gaveta.

**Movimento:**
- abrir a sub-sidebar: cerca de 300ms, `cubic-bezier(.2,.8,.2,1)`;
- os grupos entram em cascata;
- a barra do item ativo cresce;
- nada é recriado ao navegar dentro da mesma porta;
- `prefers-reduced-motion` desliga transições e animações.

**Acessibilidade:**
- Porta com sub é `<button aria-expanded aria-controls>`; porta direta é `<Link>`.
- `aria-current="page"` no item ativo; a sub-sidebar é `<nav aria-label="{porta}">`.
- Esc e "×" devolvem o foco à porta. Ao abrir, o foco fica na porta.
- Dica também no foco. Foco sempre visível.

**Temas:** claro e escuro pelos tokens de `app/globals.css` e `app/convexy/tema.css`, sem cor
literal.

**Estrutura:** o trilho é `sticky top-0 h-screen shrink-0`, como o `Sidebar` (há gate contra
barra `fixed` e contra `ml-16`/`ml-60`). O `AppShell` mantém `useOcupacaoDoRodape` e
`estiloDaReserva`.

## 5. Chave do menu (voltar ao clássico) e testes do original

- `lib/convexy/menu/chave.ts`: `MENU_CONVEXY = true`. Com `false`, o menu novo, o Início e a
  camada de vocabulário são desligados, e tudo volta ao comportamento do original.
- **Modo por pedido:** o layout do app (`app/app/layout.tsx`, servidor) decide o modo e o entrega
  a um `ConvexyProvider`, que o `AppShell`, o `MobileSidebar` e o `useT` da Convexy leem.
  - Com `MENU_CONVEXY = false`, o modo é clássico.
  - O modo também é clássico com a variável de servidor `CONVEXY_MENU_PADRAO=classico` e sem o
    cookie `convexy_menu=novo`.
  - Nos demais casos, o modo é novo.
  - O cookie é apresentação, não permissão.
- **E2E:**
  - O servidor de e2e roda com `CONVEXY_MENU_PADRAO=classico`, então todas as specs do original
    continuam no clássico sem mudança nenhuma. Isso vale também para as que limpam cookies, usam
    `storageState` próprio ou esperam `/app/inbox`.
  - Só as specs da Convexy põem o cookie `convexy_menu=novo`.
  - As specs do original provam o caminho de volta, e as da Convexy provam o menu novo.
- A variável entra em `lib/env.ts` (opcional, só `classico` ou ausente) e em `.env.example`,
  conforme a DoD 9.

## 6. Nicho e vocabulário

### 6.1 Onde fica o nicho

- **Coluna nova** `organizations.nicho text`, com CHECK nos valores `clinica`, `servicos`,
  `imobiliaria`, `curso`, `loja` e `generico` (os ids de `lib/onboarding/pacotes-de-funil.ts`).
  - Nula vale `generico`, e o leitor nunca lança.
  - Coluna, e não chave em `settings`, porque `settings` tem vários escritores que leem, alteram
    e regravam o objeto inteiro (roteamento, campanhas, atrito, provedores, MFA). Uma escrita
    concorrente perderia o nicho ou apagaria o que outro gravou.
  - Migration `9001_nicho_da_organizacao` (faixa do fork), com bloco idempotente no apêndice do
    `baseline.sql` e linha no MANIFEST. A RLS existente de `organizations` cobre a leitura.
- **Quem grava:** só o admin da plataforma.
  - Rota nova `app/api/v1/admin/tenants/[id]/nicho/route.ts` (PATCH).
  - Na ordem: `requirePlatformAdmin()` (com MFA), `requireSupportWrite(id)` e validação Zod.
  - Audit `tenant.nicho_changed` com o antes e o depois, e o código entra em `AUDIT_ACTIONS`.
- **Onde se escolhe:** o campo "Tipo de negócio" fica em `components/admin/tenants/TenantOverview`.
  Com `MENU_CONVEXY = false`, o campo mostra que o nicho não tem efeito no menu clássico.
- **Leitura:** o layout do app já busca a organização. Passa a selecionar `nicho` e o entrega ao
  `ConvexyProvider`, sem consulta nova. `ActiveOrg` não muda.
- **Implantação:** a Convexy recebe `servicos`, e a organização de teste indicada pelo Victor
  recebe `clinica`.

### 6.2 Nomes do menu: por href

- Os rótulos do menu (portas, grupos, itens) vêm do `mapa.ts`, por **href e nicho**, com `{pt, es}`.
- Não passam pelo dicionário do original, o que resolve os dois "Meta Ads": o de Resultados
  vira "Anúncios", e o de Integrações continua "Meta Ads".
- A busca ⌘K não muda: continua com os nomes do original, que servem de sinônimo.

### 6.3 Títulos das telas: `useT` da Convexy

- `hooks/i18n/useT.ts` hoje é uma linha que reexporta o `useT` do `IdiomaProvider`, usada por 439
  arquivos cliente. Passa a exportar o `useT` da Convexy (`lib/convexy/vocabulario.ts`), que:
  - aplica o vocabulário do nicho só em modo novo, a partir do `ConvexyProvider` (não de um
    global);
  - troca **só textos exatos** de uma lista curta de títulos;
  - em qualquer outro caso, devolve exatamente o `traduzir(texto, idioma)` do original.
- A lista do vocabulário (títulos, não palavras soltas):

| Texto original | `clinica` | `servicos` | `generico` |
|---|---|---|---|
| Inbox | Conversas | Conversas | Conversas |
| Radar de risco | Sem resposta | Sem resposta | Sem resposta |
| Funis | Funil de pacientes | Funil de vendas | Funil |
| Central de avisos | Pedidos da IA | Pedidos da IA | Pedidos da IA |

  "Contatos", "Agentes", "Meta Ads" e "Audit Log" **não** entram: aparecem como cabeçalho de
  coluna, em outros sentidos ou no `/admin`. Cada entrada tem `{pt, es}` no arquivo da Convexy.
- `lib/i18n/dicionario.ts`, `IdiomaProvider` e o `traduzir` do servidor **não mudam**.

### 6.4 Onde o nome antigo continua (desvios aceitos)

O plano mede a lista exata e a registra no `CONVEXY.md`:
- títulos desenhados no servidor, com `traduzir(texto, idioma)` direto (59 arquivos em
  `app/app`, ex.: `<h1>` de `/app/kanban`);
- títulos fixos sem `t()` (ex.: `Follow-ups`);
- `metadata.title` da aba;
- e-mails, notificações e mensagens do agente.

Nunca aplicar o vocabulário em `lib/agent-engine`, `lib/notifications` ou `workers`. Mudar um
desses títulos é editar a página do original, caso a caso, depois.

## 7. Início (versão simples desta entrega)

- **Quando aparece:** em modo novo, `/app` mostra o Início se ao menos um de `/app/inbox`,
  `/app/agenda` ou `/app/tasks` está em `searchable()`. Senão, mantém o redirect de
  `homeDaInterface` do original. Continua sendo a tela de entrada depois do login.
- **Três blocos**, cada um com um contador e até 5 linhas, atalho para a tela completa, estado
  vazio e falha isolada:
  1. **Conversas esperando:** a mesma regra da fila do Inbox, `comandosDaFila(automaticoDaOrg)`
     por `awaiting_since`, com o client da sessão (RLS e `visibility_mode`). O número bate com o
     que a pessoa vê no Inbox.
  2. **Agenda de hoje:** `listaAgendamentos` chamado direto, com `de`/`ate` do dia no fuso da
     organização (`ActiveOrg.timezone`).
  3. **Minhas tarefas:** vencidas e de hoje de `crm_tasks` com `assigned_to` = a pessoa,
     calculadas no mesmo fuso.
- **Permissões:** um bloco só aparece se o destino dele está em `searchable()`.
- **Frescor:** mostra "atualizado às HH:MM" e recarrega ao voltar o foco para a aba.
- **Dados:** consultas com o client de servidor da sessão, nunca o admin client, e
  `organization_id` resolvido da sessão.
- **Entradas que continuam indo para o Inbox (desvio aceito):** trocar de organização
  (`TenantSwitcher`), entrar e sair do suporte e terminar o onboarding levam direto a
  `/app/inbox`. É o comportamento do original, e o Início segue a um clique.
- **Porta:** `/app` já está na allowlist de `navegacao-completude.test.ts`. O motivo escrito ali
  ("redirect para /app/inbox") fica desatualizado, e isso é registrado como desvio.

## 8. Textos novos e espanhol

- Os textos novos da Convexy (portas, grupos, "Visão geral", "‹ Voltar", blocos do Início,
  "Tipo de negócio") ficam em `lib/convexy/textos.ts` como `{pt, es}` e são desenhados por
  variável, nunca como literal dentro de `t()`.
- Assim o `i18n-espanhol-cobre-a-tela.test.ts` continua verde sem editar o dicionário.
- Um teste da Convexy cobra `es` em todo rótulo do `mapa.ts` e do `textos.ts`.

## 9. Testes (todos rodam no CI do fork, nunca na máquina local)

**Unitários (Convexy):**
- **Cobertura:** todo href do `NAV_CATALOG` e todo `NAV_GROUPS[].hub.href` está em exatamente um
  lugar do mapa. Todo `page.tsx` de `app/app/**` resolve para uma porta ou para `nenhuma`
  declarada. Nenhum href do mapa deixa de existir.
- **`montar`:**
  - filtra por `searchable()`, com `simplificada`, `destinos` escolhidos, `viewer` e admin em
    suporte;
  - porta com um item vira direta;
  - porta vazia some;
  - hub só com grupo visível;
  - `healthDot` sobe.
- **Ativo:** o prefixo mais longo vence nos pares `settings/tenant` × `settings/tenant/agenda` e
  `ai/cases` × `ai/cases/avisos`.
- **Modo:** constante `false`, variável `classico` sem cookie, e cookie `novo`.
- **Vocabulário:**
  - desligado no clássico;
  - troca só textos exatos da lista;
  - sem nicho, o resultado é igual ao `traduzir` do original;
  - tem espanhol.
- **Nicho:** valor inválido ou nulo vira `generico`.
- **Gates existentes:** continuam verdes, entre eles `barra-lateral-nao-flutua`,
  `rodape-ocupado-contrato`, `idioma-da-interface` (`IdiomaProvider` intocado),
  `i18n-espanhol-cobre-a-tela`, `navegacao-completude` e `suporte-cobertura-de-efeitos`.

**Invariantes (Postgres):**
- coluna e CHECK de `nicho`, tanto na instalação quanto na atualização do baseline;
- a rota do nicho recusa quem não é admin de plataforma e grava a auditoria.

**E2E:** um arquivo só, `tests/e2e/convexy-menu.spec.ts`, na linha seguinte a
`convexy-identidade.spec.ts` em `SPECS_PARTE_1`. Usa um usuário real com o cookie `novo` e espera
o próprio login, não `waitForURL(/\/app\//)`. Cobre:
- porta com sub: vai à primeira tela, compacta o trilho e marca o ativo;
- navegar na mesma porta sem recriar o menu (o mesmo nó DOM continua);
- link direto para uma tela interna abre a porta certa;
- a alça recolhe, e o estado sobrevive a recarregar;
- nicho `clinica` mostra "Funil de pacientes"; `servicos` mostra "Funil de vendas";
- `agent` não vê as portas que exigem `manager`;
- Esc fecha e o foco volta;
- celular com "‹ Voltar";
- Início com três blocos e estado vazio.

## 10. Arquivos

**Novos (Convexy):**
- `lib/convexy/menu/{chave,mapa,montar,ativo}.ts`
- `lib/convexy/{nicho,vocabulario,textos}.ts`
- `components/convexy/menu/*`, `components/convexy/ConvexyProvider.tsx`
- `app/app/_convexy/inicio/*`
- `app/api/v1/admin/tenants/[id]/nicho/route.ts`
- `supabase/migrations/<ts>_9001_nicho_da_organizacao.sql`
- `tests/unit/convexy-menu-*.test.ts*`, `tests/invariants/convexy-nicho.test.ts`,
  `tests/e2e/convexy-menu.spec.ts`
- `docs/architecture/convexy-menu.architecture.json`

**Alterações em arquivos do original**, cada uma registrada no `CONVEXY.md` com o trecho e o
jeito de reaplicar. As mudanças do original nos últimos 30 dias ajudam a medir o risco de
conflito:

| Arquivo | Mudança | Mudanças/30 dias |
|---|---|---|
| `app/app/layout.tsx` | lê `nicho` e o modo, e monta o `ConvexyProvider` | 13 |
| `app/app/_components/AppShell.tsx` | `MenuConvexy` ou `Sidebar`, pelo modo | 6 |
| `components/shell/MobileSidebar.tsx` | idem para a gaveta | 1 |
| `hooks/i18n/useT.ts` | reexporta o `useT` da Convexy | 1 no histórico todo |
| `app/app/page.tsx` | Início ou redirect, pela regra da seção 7 | 1 |
| `components/admin/tenants/TenantOverview.tsx` | campo "Tipo de negócio" | — |
| `lib/audit/actions.ts` | `tenant.nicho_changed` | — |
| `lib/env.ts`, `.env.example` | `CONVEXY_MENU_PADRAO` | — |
| `.github/workflows/e2e.yml` | `CONVEXY_MENU_PADRAO=classico` no servidor + 1 linha em `SPECS_PARTE_1` | 256 |
| `supabase/baseline.sql`, `MANIFEST.md`, `lib/database.types.ts` | bloco e linha da 9001, `nicho` no tipo | — |

`lib/i18n/dicionario.ts`, `IdiomaProvider.tsx`, `playwright.config.ts` e o catálogo de navegação
**não** são tocados.

## 11. Doutrina (DoD)

- **12:** a prova de tela é a spec e2e no CI, mais evidência visual em
  `.superpowers/evidence/convexy-menu/`, com capturas feitas no CI ou na VPS e nunca na máquina
  local. Mesmo desvio da `-cvx.3`.
- **13:** o mapa `docs/architecture/convexy-menu.architecture.json` tem as peças menu, mapa,
  nicho, vocabulário e Início, com pelo menos 2 arestas cada.
  - O laço de retorno: tela nova do original sem lugar reprova o CI; nicho inválido cai em
    `generico`; mudança de nicho fica no audit.
  - `docs/testing/user-journey-map.md` ganha a jornada "navegar pelo menu novo".
- **14:** o Início ocupa `/app`, que já está na allowlist, e o motivo novo vai para o
  `CONVEXY.md`. O campo do admin fica dentro de uma tela que já existe.
- **17:** o CHANGELOG é escrito à mão, com o `release.yml` desligado no fork, que é um desvio já
  registrado.
- **18:** destino = **instalação do fork** (camada de apresentação da Convexy). Não é núcleo do
  original nem extensão.
- **Desvio registrado:** o cabeçalho do `i18n-espanhol-cobre-a-tela` diz que "o português não muda
  um byte". Em modo novo, o `useT` da Convexy muda de propósito os quatro títulos da seção 6.3.

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Tela ou hub novo do original sem lugar | teste de cobertura reprova o CI |
| Conflito de merge | lista da seção 10, comentário `Convexy` em cada trecho e dicionário intocado |
| Nicho de uma organização vazar para outra | o nicho vem por provider do layout de cada pedido; nunca por global de módulo |
| Hidratação divergente | modo e nicho vêm do servidor por prop, como a marca; teste de hidratação |
| Vocabulário trocar texto errado | lista só de títulos exatos; e2e confere |
| Menu novo pior em uso real | `MENU_CONVEXY = false` e publicar |

## 13. O que mudou na revisão 2

- **Portas e ativo:** hubs de grupo ganharam lugar ("Visão geral"), com rotas-filhas e cobertura
  de todo `page.tsx`. O ativo passou a ser o prefixo mais longo.
- **Vocabulário fora de `traduzir`:**
  - motivos: global compartilhado entre organizações no servidor; retorno antecipado em pt-BR;
    efeito em notificações e handoff; o arquivo que o original mais muda;
  - agora: rótulos do menu por href, e títulos pelo `useT` da Convexy, numa lista menor.
- **Nicho em coluna própria**, com migration, porque `settings` tem escritores concorrentes. A
  rota exige `requirePlatformAdmin` e registra o antes e o depois.
- **Modo clássico no e2e** por variável de servidor, e não por cookie no `playwright.config.ts`
  (que quebrava com `clearCookies`/`storageState`).
- **Início:**
  - respeita a interface por vínculo, com fallback para `homeDaInterface`;
  - fila do Inbox por `comandosDaFila`, com client da sessão;
  - agenda direta;
  - fuso da organização.
- **Tela e acessibilidade:** sub-sidebar por cima entre `md` e `lg`; `aria-expanded`/foco/Esc;
  toque sem dica.
- **Espanhol** em arquivo próprio, sem tocar no dicionário.
- **Outros:** DoD 12/13/14/17/18 respondidos; base = `v1.48.0`.
