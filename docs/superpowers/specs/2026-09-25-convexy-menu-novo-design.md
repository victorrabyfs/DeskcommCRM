# Menu novo da Convexy — desenho

**Status:** revisão 4, para aprovação · **Data:** 2026-09-25 · **Fork:** `victorrabyfs/DeskcommCRM`
**Base:** `v1.48.0` do original (`main` do fork depois do PR #7).
**Entrega 1 de 2.** A entrega 2 (painel Início por nicho) terá spec própria.
**Protótipo aprovado:** artefato "Menu da Convexy", rodada 2, versão 7.

## 1. Objetivo e princípios

Trocar o menu lateral do app (`/app/**`) por um menu mais amigável para quem opera o dia a
dia (recepção, gestores e a própria Convexy):
- poucas portas grandes;
- uma **sub-sidebar** com as telas de cada porta;
- nomes que acompanham o **nicho** da organização;
- microinterações suaves.

Princípios, que valem para cada decisão abaixo:
1. **O original é a fonte da verdade.** O menu novo é uma *projeção* do catálogo de navegação do
   original (`NAV_CATALOG`), com as mesmas regras de visibilidade. Tela nova do original entra no
   menu novo sozinha, na porta certa, sem ninguém editar nada (seção 3.2).
2. **Usar os mecanismos que o original já tem, em vez de criar paralelos.**
   - ligar e desligar pelo módulo opcional da instalação (`lib/instalacao/modulos.ts`);
   - visibilidade por `searchable()` e pela interface por vínculo;
   - escrita do admin pelo padrão das rotas `admin/tenants/[id]/*`.
3. **Sem código morto e sem remendo.** Cada arquivo novo tem consumidor. Cada alteração no
   original é a menor possível, num ponto de extensão natural (seção 10), e fica registrada no
   `CONVEXY.md`. Nenhuma lógica é duplicada do original.
4. **Uma tela, um dono.** Cada página do app pertence a exatamente um item do menu (seção 3.3).

Critérios de sucesso:
1. Toda página navegável do app está no menu ou na sub-sidebar, e pode ser escondida por
   organização e por pessoa, pela mesma tela de interface que já existe.
2. Uma atualização do original chega adaptada ao layout: telas novas entram sozinhas, e o CI só
   reprova o que não dá para decidir sozinho (um grupo novo de navegação no original).
3. Voltar ao menu clássico é desligar o módulo em `/admin/sistema`, sem publicar versão.

Fora do escopo:
- o painel Início por nicho (entrega 2);
- mudar o que cada papel pode ver;
- renomear textos desenhados no servidor (seção 6.4).

## 2. Decisões tomadas com o Victor

| Tema | Decisão |
|---|---|
| Estrutura | Opção B: 8 portas + Configurações no rodapé; todas as páginas no menu e na sub-sidebar |
| Páginas "Ver tudo em…" (hubs) | Não existem no menu novo (seção 3.4) |
| Sub-sidebar | Abre ao clicar e fica aberta; já leva à primeira tela da porta |
| Trilho compacto | Só ícones (64px). Automático com sub-sidebar aberta; ou manual pela alça |
| Recolher | Alça redonda na borda do menu, abaixo do logo, visível no hover; some com sub-sidebar aberta |
| Hover | Realce suave, seta que desliza, leve "afundar" no clique, barra azul do ativo. Sem aumento de ícone |
| Ícone de Configurações | Engrenagem (`GearSix` do Phosphor), nunca parecido com o sol/lua do tema |
| Menu antigo | Fica no código (é o do original); o novo é o padrão da instalação da Convexy |
| Visibilidade | A tela de interface (organização e pessoa) mostra a estrutura nova e esconde item ou porta |
| Nicho | Por organização; a Convexy é `servicos` |
| Nomes | Camada de vocabulário por nicho |

## 3. Estrutura do menu

### 3.1 Portas e conteúdo

| Porta | Ícone (Phosphor) | Conteúdo, por grupo da sub-sidebar |
|---|---|---|
| Início | `House` | direto: `/app` (seção 7) |
| Conversas | `ChatCircle` | `/app/inbox`, `/app/radar`, `/app/templates` · *Envios:* `/app/campaigns`, `/app/calls` |
| Agenda | `CalendarBlank` | `/app/agenda`, `/app/comandas`, `/app/settings/tenant/agenda` |
| Contatos | `Users` | `/app/contacts`, `/app/prospecting`, `/app/products` · *Orientações instaladas:* uma entrada por guia de extensão ativa (seção 3.4) |
| Funil | `Funnel` | direto: `/app/kanban` |
| Tarefas | `CheckSquare` | direto: `/app/tasks` |
| Assistente de IA | `Robot` | `/app/ai/agents`, `/app/ai/followups`, `/app/ai/routers`, `/app/ai/providers`, `/app/ai/knowledge/sources`, `/app/ai/atendimento`, `/app/ai/inbox` · *Acompanhar:* `/app/ai/cases`, `/app/ai/proposals`, `/app/ai/runs`, `/app/ai/usage`, `/app/ai/cases/avisos` · *Avançado:* `/app/ai/credentials`, `/app/ai/memory`, `/app/ai/skills` |
| Resultados | `ChartBar` | `/app/metrics`, `/app/ads/meta`, `/app/activities`, `/app/faturamento` · *Mais:* `/app/ai/evolution`, `/app/audit` |
| Configurações (rodapé) | `GearSix` | *Canais e integrações:* `/app/connections`, `/app/integrations/nuvemshop`, `/app/webhooks`, `/app/settings/meta-ads`, `/app/settings/api-tokens`, `/app/settings/voip-trunk`, `/app/extensions`, `/app/integracao-dados` · *Organização:* `/app/settings/tenant`, `/app/team`, `/app/settings/tenant/financeiro`, `/app/settings/marca`, `/app/settings/tags`, `/app/settings/tenant/pipelines`, `/app/settings/atendimento`, `/app/settings/conversoes` · *Minha conta:* `/app/settings/profile`, `/app/settings/security`, `/app/settings/notifications`, `/app/lgpd/requests`, `/app/settings/billing` · *Sistema (só admin de plataforma):* `/app/settings/atualizacao` |

As 55 entradas do `NAV_CATALOG` da `1.48.0`, mais o Início, aparecem cada uma uma vez. Os nomes
são os do nicho `generico`; a seção 6 diz o que muda por nicho.

**Nada importante fica de fora:**
- **O que o original marca como uso diário fica no primeiro grupo da sua porta.** Toda entrada com
  `sidebar: true` no catálogo (o "uso diário" que o original escolheu para o menu clássico) nunca
  vai para grupo secundário ("Acompanhar", "Avançado", "Mais"). O teste cobra isso. Por isso
  Roteadores, Provedores e Tipos de agendamento estão no grupo principal, e "Canais e
  integrações", com Conexões (o WhatsApp), abre Configurações.
- **A saúde da conexão aparece de fora.** O ponto de saúde de Conexões sobe para a porta
  Configurações, inclusive no trilho compacto.
- **A descrição de cada tela continua à vista.** A descrição que as páginas-hub mostravam
  (`description` do catálogo) aparece como dica do item na sub-sidebar, depois de meio segundo
  com o mouse em cima ou no foco do teclado, e continua pesquisável no ⌘K.

### 3.2 Como uma tela nova do original entra sozinha

O `mapa.ts` da Convexy tem duas partes:
1. **Posições explícitas:** a tabela acima, por href.
2. **Posição padrão por grupo do original:** uma entrada do catálogo que não está nas posições
   explícitas vai para a porta do `group` que o próprio original deu a ela. Vai para o grupo
   principal da porta se o original a marcou como uso diário (`sidebar: true`), e para o grupo
   secundário da tabela se não marcou.

| `group` do original | Porta | Principal | Secundário |
|---|---|---|---|
| `atendimento` | Conversas | (principal) | Envios |
| `crm` | Contatos | (principal) | (principal) |
| `ia` | Assistente de IA | (principal) | Avançado |
| `canais` | Configurações | Canais e integrações | Canais e integrações |
| `analise` | Resultados | (principal) | Mais |
| `organizacao` | Configurações | Organização | Organização |

- A tela nova já nasce com nome, ícone, papel mínimo, módulo e descrição, porque tudo vem do
  catálogo do original. A Convexy só decide onde ela fica.
- **O CI só reprova um caso:** um `group` novo no original, que não tem porta padrão. É a única
  decisão que não dá para tomar sozinho.
- O teste também lista, sem reprovar, as telas posicionadas pelo padrão. Assim quem revisa o merge
  vê o que chegou e pode dar a elas uma posição explícita.

### 3.3 Uma tela, um dono (qual item fica ativo)

- Cada item é **dono** do seu endereço e de tudo que fica abaixo dele. Exceção: o que estiver
  abaixo de outro item mais específico é desse outro. É a regra padrão de navegação por segmentos.
- Exemplos:
  - `/app/ai/agents/new` e `/app/ai/agents/123` são de "Assistentes";
  - `/app/settings/tenant/agenda` é de "Tipos de agendamento", não de "Organização";
  - `/app/ai/cases/avisos` é de "Aviso no WhatsApp", não de "Casos".
- Nenhum botão divide endereço com outro, e nenhuma tela acende dois botões.
- As páginas de detalhe fora da árvore do seu item são declaradas por prefixo no `mapa.ts`
  (`donosExtras`):
  - `/app/leads/*` e `/app/pipelines/*` → Funil;
  - `/app/settings/canal-oficial`, `/app/settings/templates` e `/app/settings/tenant/whatsapp`
    (redirecionamentos do original) → Conexões.
- **Garantia por teste:** cada `page.tsx` de `app/app/**` tem exatamente um dono. A única
  exceção é `/app`, que é o próprio Início.

### 3.4 Sem páginas-hub

- As quatro páginas "Ver tudo em…" (`/app/crm`, `/app/ai`, `/app/analise`, `/app/settings`)
  existem porque o menu clássico não tinha espaço. No menu novo, a sub-sidebar é a lista completa
  de cada porta, e os hubs não aparecem.
- Com o módulo ligado, o `NavHub` redireciona para o primeiro item visível da porta
  correspondente: `/app/crm` → Contatos, `/app/ai` → Assistente de IA, `/app/analise` →
  Resultados, `/app/settings` → Configurações. O `NavHub` é o componente único dos quatro hubs, então é uma alteração só no
  original. Link antigo ou favorito continua funcionando.
- O único conteúdo exclusivo de um hub são as **orientações de extensões** do `/app/crm`
  (`loadCrmExtensions`). Elas passam a ser itens do grupo "Orientações instaladas" da porta
  Contatos:
  - carregadas quando essa sub-sidebar abre, por uma rota de leitura da Convexy
    (`app/api/v1/convexy/orientacoes/route.ts`, GET) que chama o mesmo `loadCrmExtensions`, com a
    organização resolvida da sessão;
  - com as mesmas regras de hoje: só as ativas, e aviso quando não dá para ler;
  - cada uma leva a `/app/extensions/[id]`.

### 3.5 Regras de visibilidade

- **A visibilidade não é decidida aqui.** O menu recebe `searchable(isPlatformAdmin, role,
  interface_settings, modulos_ligados)` (`lib/navigation/registry.ts`). É a mesma lista da busca
  ⌘K: o catálogo inteiro filtrado por papel, interface por vínculo, módulos e admin de plataforma.
  O primeiro argumento é `user.is_platform_admin && !user.support`, como no `Sidebar.tsx`.
- Item fora da lista não aparece. Grupo sem itens some. Porta sem itens some.
- Porta com **um** item visível navega direto para ele, sem sub-sidebar.
- Clicar numa porta com sub-sidebar abre a sub-sidebar e vai ao primeiro item visível.
- `/app/settings/atualizacao` não está no catálogo, então não passa por `searchable()`. Aparece
  com a mesma condição do `VersionFooter` do original: `user.is_platform_admin && !user.support`.
- `healthDot` (hoje só `/app/connections`) aparece no item e sobe para a porta.
- O rodapé mantém o `VersionFooter`. A barra do topo não muda.

### 3.6 Esconder por organização e por pessoa: a tela que já existe

Isto **já existe no original** e é reaproveitado inteiro. O menu novo não cria tela, dado nem
regra de visibilidade.
- **Onde se configura:**
  - "Menu lateral" da organização (`app/app/settings/tenant/_interface.tsx`);
  - "Interface de [membro]" na tela Equipe (`components/team/MemberInterfaceDialog.tsx`);
  - o convite (`InviteForm`) e a criação de organização no admin.
  - Todas usam o mesmo componente, o `InterfaceEditor` (`components/team/InterfaceEditor.tsx`).
- **O que já vale hoje e continua igual:**
  - perfil "Completa" ou "Simplificada";
  - escolha área por área;
  - áreas essenciais que não se escondem (perfil, segurança, equipe e organização para quem
    administra);
  - aviso de áreas antigas;
  - validação de "ao menos uma área de trabalho";
  - gravação em `interface_settings.destinos`;
  - para cada pessoa vale a **combinação** da escolha da organização com a do membro
    (`combinarInterfaces`, `lib/navigation/interface.ts`).
- **A única mudança está no agrupamento.** Hoje o `InterfaceEditor` agrupa as áreas pelos grupos
  do menu clássico (`NAV_GROUPS`). Com o módulo ligado, agrupa pelas **portas e grupos do menu
  novo**, na mesma ordem e com os mesmos nomes do menu, e ganha uma caixa por porta que marca ou
  desmarca todas as áreas dela. O agrupamento vem do mesmo `mapa.ts` que monta o menu. Uma tela
  nova do original aparece na tela de interface na mesma porta em que aparece no menu.
- Com o módulo desligado, o `InterfaceEditor` é exatamente o do original. O dado gravado é o mesmo
  nos dois modos, então nada se perde ao ligar ou desligar o menu novo.
- **O Início também pode ser escondido:**
  - entra no catálogo do original como uma entrada com `modulo: "menu_convexy"` (seção 5), com
    ícone `Gauge`, que já existe no registro de ícones, para o `registry.ts` não mudar. O menu novo
    desenha a casa por conta própria.
  - Assim ele existe na interface, no ⌘K e no menu só com o módulo ligado, e some por completo no
    clássico.
  - Quem esconde o Início entra direto na primeira tela visível, pela regra `homeDaInterface` do
    original.
  - O Início entra na lista do perfil "Simplificada" (`SIMPLIFICADA`, em
    `lib/navigation/interface.ts`). Sem isso, a recepção, que é quem mais usa esse perfil, ficaria
    sem o Início. No clássico, a entrada some pelo módulo, então a lista não muda nada.
- `/app/settings/atualizacao` não está no catálogo e não aparece nessa tela: é só do admin de
  plataforma, como no original.

## 4. Comportamento e aparência

**Menu largo:** 236px; botões de 38px de altura, texto de 14,5px e ícones de 19px.

**Trilho compacto:** 64px, só ícones de 20px.
- **Dica com o nome** no hover e no foco. Em toque (`pointer: coarse`) não há hover: o menu largo
  é a forma padrão, e o compacto só aparece com a sub-sidebar aberta, cujo título diz onde se está.
- **Ponto de saúde** da conexão (seção 3.5) vira uma bolinha no canto do ícone.
- **Compactação automática** (sub-sidebar aberta) é estado de tela. Não chama `toggleSidebar`,
  que revalida o layout no servidor.
- **Recolher manual** pela alça usa o cookie e a ação que já existem (`sidebar_collapsed`,
  `toggleSidebar`), e o servidor desenha certo.
- **Sub-sidebar fechada no "×":** o menu volta ao estado manual (largo ou recolhido).

**Sub-sidebar:** 240px.
- Título da porta com "×" afastado da borda.
- Grupos com rótulo pequeno; itens de 32px e 13,5px.
- Nome longo quebra a linha; lista longa rola dentro dela.

**Aberta ou fechada:**
- **Quando abre:** a sub-sidebar está aberta quando a porta ativa tem sub, a não ser que a pessoa
  a tenha fechado no "×" para aquela porta nesta aba.
- **De onde vem a porta ativa:** vem de `usePathname()` no componente cliente, que já tem o
  caminho no SSR. Link direto, recarregar, voltar e avançar abrem certo, sem animação na primeira
  pintura.
- **Reabrir:** clicar de novo na porta ativa reabre.

**Largura intermediária (entre `md` e `lg`):** a sub-sidebar abre por cima da página, com fundo
escurecido, e fecha com Esc, clique fora ou escolha de item. Em tela larga ela empurra o conteúdo.

**Celular (`< md`):** a gaveta do `MobileSidebar` mostra o menu largo. Uma porta com sub troca o
conteúdo da gaveta pela lista dela, com "‹ Voltar". Escolher um item fecha a gaveta.

**Movimento:** abrir leva cerca de 300ms, `cubic-bezier(.2,.8,.2,1)`. Os grupos entram em
cascata e a barra do ativo cresce. Nada é recriado ao navegar, porque o menu vive no layout do
Next.js, que persiste entre as telas. `prefers-reduced-motion` desliga as animações.

**Acessibilidade:** segue o padrão "Disclosure Navigation" do WAI-ARIA APG, e **não** usa
`role="menu"`, que é para menus de aplicação.
- Porta com sub é `<button aria-expanded aria-controls>`; porta direta é `<Link>`.
- A sub-sidebar é `<nav aria-label="{porta}">`, e o item ativo tem `aria-current="page"`.
- Esc e "×" devolvem o foco à porta. Dica também no foco. Foco sempre visível.

**Temas:** claro e escuro pelos tokens de `app/globals.css` e `app/convexy/tema.css`, sem cor
literal.

**Estrutura:** o trilho é `sticky top-0 h-screen shrink-0`, como o `Sidebar`; há gates contra
barra `fixed` e `ml-*`. O `AppShell` mantém `useOcupacaoDoRodape` e `estiloDaReserva`.

## 5. Ligar e desligar: módulo da instalação `menu_convexy`

- O menu novo é um **módulo opcional da instalação**, o mesmo mecanismo que o original usa para
  "Fluxos de atendimento" e "Banco externo" (`lib/instalacao/modulos.ts`):
  - chave `MODULO_MENU_CONVEXY` em `platform_config`, sem migration;
  - ligado e desligado pelo admin da plataforma em `/admin/sistema`, com a ação
    `updateModuloDaInstalacao`, que já existe e já audita;
  - chega à tela por `activeOrg.modulos_ligados`, que o layout já carrega. Não há consulta nova.
- **Ligado:** menu novo, Início, tela de interface agrupada por portas, vocabulário, e hubs
  redirecionando.
- **Desligado:** tudo exatamente como o original.
- **Padrão:** o original trata módulo ausente como desligado. Na instalação da Convexy o módulo é
  ligado no passo de implantação desta versão e fica ligado. Instalação nova do fork liga em
  `/admin/sistema`, e isso fica no `CONVEXY.md`.
- **Testes do original:** o banco do e2e nasce sem o módulo, então todas as specs do original
  rodam no clássico sem mudança nenhuma e provam o caminho de volta. A spec da Convexy liga o
  módulo no próprio preparo e o desliga no fim.

## 6. Nicho e vocabulário

### 6.1 Onde fica o nicho

- **Coluna** `organizations.nicho text`, com CHECK nos valores `clinica`, `servicos`,
  `imobiliaria`, `curso`, `loja` e `generico` (os ids de `lib/onboarding/pacotes-de-funil.ts`).
  - Nula vale `generico`.
  - Coluna própria, e não chave em `settings`, porque `settings` tem vários escritores que leem,
    alteram e regravam o objeto inteiro. Uma escrita concorrente perderia o nicho.
  - Migration `9001_nicho_da_organizacao` (faixa do fork), bloco idempotente no apêndice do
    `baseline.sql` e linha no MANIFEST. A RLS existente de `organizations` cobre a leitura.
- **Quem grava:** só o admin da plataforma.
  - Rota nova `app/api/v1/admin/tenants/[id]/nicho/route.ts` (PATCH), no padrão de
    `admin/tenants/[id]/suspend`.
  - Na ordem: `requirePlatformAdmin()` (com MFA), `requireSupportWrite(id)` e validação Zod.
  - Audit `tenant.nicho_changed` com o antes e o depois, e o código entra em `AUDIT_ACTIONS`.
- **Onde se escolhe:** campo "Tipo de negócio" em `components/admin/tenants/TenantOverview`,
  visível só com o módulo ligado.
- **Leitura:** o layout do app já seleciona a organização. Passa a selecionar `nicho` e o entrega
  ao `ConvexyProvider`, sem consulta nova.
- **Implantação:** a Convexy recebe `servicos`, e a organização de teste indicada pelo Victor
  recebe `clinica`.

### 6.2 Nomes do menu

- Os rótulos de portas, grupos e itens vêm do `mapa.ts`, por **href e nicho**, com `{pt, es}`.
- Rótulos que mudam por nicho (o resto é igual em todos):

| Onde | `clinica` | `servicos` | `generico` |
|---|---|---|---|
| Porta Contatos e item `/app/contacts` | Pacientes | Contatos | Contatos |
| Porta Funil (item `/app/kanban`) | Funil de pacientes | Funil de vendas | Funil |

- Item sem rótulo próprio usa o rótulo do catálogo do original, traduzido como hoje. Isso vale
  também para as telas novas que chegam pelo padrão.
- Os dois "Meta Ads" ficam distintos: o de Resultados vira "Anúncios", e o de "Canais e
  integrações" continua "Meta Ads".
- A busca ⌘K continua com os nomes do original.

### 6.3 Títulos das telas: `useT` da Convexy

- `hooks/i18n/useT.ts` é hoje uma linha que reexporta o `useT` do `IdiomaProvider` e é usado por
  439 arquivos cliente. Passa a reexportar o `useT` da Convexy (`lib/convexy/vocabulario.ts`),
  que:
  - aplica o vocabulário só com o módulo ligado e nicho em vigor, lidos do `ConvexyProvider`,
    que é por pedido e nunca global;
  - troca **só textos exatos** de uma lista curta de títulos;
  - em qualquer outro caso, devolve exatamente o `traduzir(texto, idioma)` do original. Isso
    vale também fora do app (`/admin`, telas públicas, onboarding), onde não há `ConvexyProvider`.

| Texto original | `clinica` | `servicos` | `generico` |
|---|---|---|---|
| Inbox | Conversas | Conversas | Conversas |
| Radar de risco | Sem resposta | Sem resposta | Sem resposta |
| Funis | Funil de pacientes | Funil de vendas | Funil |
| Central de avisos | Pedidos da IA | Pedidos da IA | Pedidos da IA |

- "Contatos", "Agentes", "Meta Ads" e "Audit Log" **não** entram: aparecem como cabeçalho de
  coluna, em outros sentidos ou no `/admin`.
- `lib/i18n/dicionario.ts`, `IdiomaProvider` e o `traduzir` do servidor não mudam.

### 6.4 Onde o nome antigo continua (desvio aceito)

O plano mede a lista exata e a registra no `CONVEXY.md`:
- títulos desenhados no servidor com `traduzir(texto, idioma)` direto (59 arquivos em
  `app/app`, ex.: `<h1>` de `/app/kanban`);
- títulos fixos sem `t()`;
- `metadata.title` da aba;
- e-mails, notificações e mensagens do agente.

Nunca aplicar o vocabulário em `lib/agent-engine`, `lib/notifications` ou `workers`.

## 7. Início (versão simples desta entrega)

- **Quando aparece:** com o módulo ligado, `/app` mostra o Início se ele está em `searchable()`,
  ou seja, se não foi escondido. Senão, mantém o redirect de `homeDaInterface` do original.
  Continua sendo a tela de entrada depois do login.
- **Três blocos**, cada um com contador, até 5 linhas, atalho, estado vazio e falha isolada:
  1. **Conversas esperando:** a regra da fila do Inbox (`comandosDaFila(automaticoDaOrg)`,
     por `awaiting_since`), com o client da sessão. O número bate com o Inbox da pessoa.
  2. **Agenda de hoje:** `listaAgendamentos` chamado direto, com o dia no fuso da organização
     (`ActiveOrg.timezone`).
  3. **Minhas tarefas:** vencidas e de hoje de `crm_tasks` com `assigned_to` = a pessoa, no
     mesmo fuso.
- **Permissões:** cada bloco só aparece se o destino dele está em `searchable()`.
- **Frescor:** "atualizado às HH:MM", e recarrega ao voltar o foco para a aba.
- **Dados:** client de servidor da sessão, nunca o admin client, e `organization_id` resolvido
  da sessão.
- **Entradas que continuam indo para o Inbox (desvio aceito):** trocar de organização, entrar e
  sair do suporte e terminar o onboarding, como no original.

## 8. Textos novos e espanhol

- Os textos novos da Convexy (portas, grupos, "‹ Voltar", blocos do Início, "Tipo de negócio",
  módulo em `/admin/sistema`) ficam em `lib/convexy/textos.ts` como `{pt, es}` e são desenhados
  por variável.
- **Exceção:** o rótulo e a descrição da entrada "Início" do catálogo. O
  `i18n-catalogo-do-menu.test.ts` cobra a tradução de `label` e `description` no dicionário do
  original, então ele ganha duas linhas ali, junto do bloco do menu.
- Um teste da Convexy cobra `es` em todo rótulo do `mapa.ts` e do `textos.ts`.

## 9. Testes (todos rodam no CI do fork, nunca na máquina local)

**Unitários (Convexy):**
- **Cobertura e padrão:**
  - todo href do `NAV_CATALOG` cai numa porta (explícito ou pelo grupo);
  - `group` desconhecido reprova;
  - lista as posições por padrão;
  - todo href explícito existe no catálogo.
- **Um dono:** cada `page.tsx` de `app/app/**` tem exatamente um dono; os pares
  `settings/tenant` × `settings/tenant/agenda` e `ai/cases` × `ai/cases/avisos` resolvem certo.
- **`montar`:**
  - filtra por `searchable()`, com `simplificada`, `destinos` escolhidos, `viewer` e admin em
    suporte;
  - porta com um item fica direta;
  - porta vazia some;
  - `healthDot` sobe.
- **Tela de interface:**
  - com o módulo ligado, o `InterfaceEditor` agrupa por portas do `mapa.ts`, e a caixa da porta
    marca e desmarca todas;
  - o valor gravado é igual ao do original para a mesma escolha;
  - com o módulo desligado, o agrupamento é o `NAV_GROUPS` do original;
  - o `combinarInterfaces` continua valendo.
- **Uso diário:** nenhuma entrada com `sidebar: true` cai em grupo secundário.
- **Módulo:** desligado dá menu clássico, `/app` com redirect e vocabulário inativo.
- **Hubs:** cada hub redireciona para a primeira tela visível da sua porta.
- **Atualização do sistema:** o item aparece só para admin de plataforma fora do suporte.
- **Vocabulário:** troca só os textos exatos da lista; sem nicho, dá o mesmo resultado do
  `traduzir`; tem espanhol.
- **Gates existentes verdes:** `barra-lateral-nao-flutua`, `rodape-ocupado-contrato`,
  `idioma-da-interface`, `i18n-espanhol-cobre-a-tela`, `i18n-catalogo-do-menu`,
  `navegacao-completude`, `navegacao-registry`, `interface-por-*`,
  `suporte-cobertura-de-efeitos`.

**Invariantes (Postgres):** coluna e CHECK de `nicho` na instalação e na atualização do
baseline; a rota do nicho recusa quem não é admin de plataforma e grava a auditoria.

**E2E:** um arquivo só, `tests/e2e/convexy-menu.spec.ts`, logo depois de
`convexy-identidade.spec.ts` em `SPECS_PARTE_1`. Liga o módulo no preparo e o desliga no fim.
Cobre:
- porta com sub, trilho compacto e ativo;
- navegação na mesma porta sem recriar o menu;
- link direto para tela interna;
- a alça sobrevivendo ao recarregar;
- hub redirecionando;
- item escondido pela tela de interface sumindo do menu;
- nicho `clinica` × `servicos`;
- `agent` sem as portas de `manager`;
- Esc e foco;
- celular;
- Início.

## 10. Arquivos

**Novos (Convexy):**
- `lib/convexy/menu/{mapa,montar,dono}.ts`
- `lib/convexy/{nicho,vocabulario,textos}.ts`
- `components/convexy/menu/*` (trilho, sub-sidebar, alça, gaveta)
- `components/convexy/ConvexyProvider.tsx`
- `app/app/_convexy/inicio/*`
- `app/api/v1/admin/tenants/[id]/nicho/route.ts`
- `app/api/v1/convexy/orientacoes/route.ts`
- `supabase/migrations/<ts>_9001_nicho_da_organizacao.sql`
- testes: `tests/unit/convexy-menu-*`, `tests/invariants/convexy-nicho.test.ts`,
  `tests/e2e/convexy-menu.spec.ts`
- `docs/architecture/convexy-menu.architecture.json`

**Alterações em arquivos do original.** Cada uma leva comentário `Convexy` e fica registrada no
`CONVEXY.md` com o trecho e o jeito de reaplicar num conflito.

| Arquivo | Alteração | Ponto de extensão |
|---|---|---|
| `lib/instalacao/modulos.ts` | `menu_convexy` em `MODULOS_OPCIONAIS` e `CHAVE_DO_MODULO` | lista de módulos |
| `app/admin/(protected)/sistema/_form.tsx` | uma entrada na lista de módulos | lista de módulos |
| `lib/navigation/catalogo.ts` | entrada do Início com `modulo: "menu_convexy"` | lista do catálogo |
| `lib/i18n/dicionario.ts` | rótulo e descrição do Início em espanhol | exigido pelo teste do catálogo |
| `app/app/layout.tsx` | seleciona `nicho` e monta o `ConvexyProvider` | onde a organização já é lida |
| `app/app/_components/AppShell.tsx` | menu novo ou `Sidebar`, pelo módulo | onde o `Sidebar` é montado |
| `components/shell/MobileSidebar.tsx` | idem para a gaveta | onde o `SidebarContent` é montado |
| `components/shell/NavHub.tsx` | redireciona com o módulo ligado | componente único dos 4 hubs |
| `lib/navigation/interface.ts` | `"/app"` na lista `SIMPLIFICADA` | lista do perfil |
| `components/team/InterfaceEditor.tsx` | agrupa pelas portas do `mapa.ts` com o módulo ligado, e caixa por porta | o bloco que agrupa por `NAV_GROUPS` |
| `hooks/i18n/useT.ts` | reexporta o `useT` da Convexy | reexportação de uma linha |
| `app/app/page.tsx` | Início ou redirect (seção 7) | ponto de entrada |
| `components/admin/tenants/TenantOverview.tsx` | campo "Tipo de negócio" | tela do tenant |
| `lib/audit/actions.ts` | `tenant.nicho_changed` | lista de ações |
| `supabase/baseline.sql`, `MANIFEST.md`, `lib/database.types.ts` | 9001 e `nicho` no tipo | padrão de migration |
| `.github/workflows/e2e.yml` | uma linha em `SPECS_PARTE_1` | lista de specs |

O motivo escrito para `/app` na allowlist de `navegacao-completude.test.ts` passa a valer para
os dois modos, e a nova redação fica registrada no `CONVEXY.md`.

## 11. Doutrina (DoD)

- **12:** a prova de tela é a spec e2e no CI, mais evidência visual em
  `.superpowers/evidence/convexy-menu/`, capturada no CI ou na VPS e nunca na máquina local.
- **13:** o mapa `docs/architecture/convexy-menu.architecture.json` tem as peças menu, mapa,
  nicho, vocabulário, interface e Início, com pelo menos 2 arestas cada.
  - O laço de retorno: tela nova entra pelo padrão e aparece listada no CI; grupo novo reprova;
    nicho inválido cai em `generico`; mudança de nicho e de módulo fica no audit.
  - `docs/testing/user-journey-map.md` ganha a jornada "navegar pelo menu novo".
- **14:** o Início entra no catálogo, e o hub deixa de ser porta só com o módulo ligado.
- **17:** o CHANGELOG é escrito à mão, com o `release.yml` desligado no fork, que é um desvio já
  registrado.
- **18:** destino = **instalação do fork** (camada de apresentação da Convexy).
- **Desvio registrado:** o cabeçalho do `i18n-espanhol-cobre-a-tela` diz que o português não
  muda. Com o módulo ligado, o `useT` da Convexy muda de propósito os quatro títulos da seção 6.3.

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Tela nova do original fora do lugar ideal | entra pelo grupo e aparece listada no CI para revisão |
| Grupo novo no original | CI reprova com mensagem que diz o que decidir |
| Conflito de merge | alterações só em pontos de extensão (seção 10), comentadas e registradas |
| Nicho de uma organização vazar para outra | provider por pedido, nunca global de módulo |
| Hidratação divergente | módulo e nicho vêm do servidor por prop; teste de hidratação |
| Vocabulário trocar texto errado | lista só de títulos exatos; e2e confere |
| Menu novo pior em uso real | desligar o módulo em `/admin/sistema`, na hora |

## 13. Histórico

- **Revisão 2:** incorporou três revisões independentes (exatidão, compatibilidade/CI e
  experiência/segurança).
- **Revisão 3:**
  - todas as páginas no menu e na sub-sidebar, sem hubs; orientações de extensões em Contatos;
  - tela nova do original entra sozinha pelo grupo;
  - "uma tela, um dono" no lugar da explicação por prefixo;
  - a tela de interface mostra a estrutura nova e o Início pode ser escondido;
  - o módulo da instalação substitui a constante, a variável e o cookie;
  - ícone de Configurações definido (engrenagem);
  - padrão WAI-ARIA "Disclosure Navigation".
- **Revisão 4:**
  - a tela de interface é o `InterfaceEditor` do original reaproveitado, e só o agrupamento muda;
  - o uso diário do original fica sempre no grupo principal (Roteadores, Provedores, Tipos de
    agendamento, Conexões);
  - "Canais e integrações" abre Configurações;
  - a descrição de cada tela vira dica na sub-sidebar;
  - Início no perfil "Simplificada";
  - destino de cada hub;
  - rota de leitura das orientações;
  - rótulos por nicho;
  - regra da tela de atualização;
  - sem "contador" que não existe.
