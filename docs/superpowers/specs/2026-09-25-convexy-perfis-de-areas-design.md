# Perfis de áreas por empresa — desenho

**Status:** revisão 5, aprovada para construção (fase 1) · **Data:** 2026-09-29 (rev. 4 de 2026-09-25) ·
**Fork:** `victorrabyfs/DeskcommCRM`
**Base:** `main` do fork em `v1.59.0-cvx.4` (menu da clínica mesclado).
**Protótipo:** artefato "Perfis de Áreas", v1 aprovado; atualizado para esta revisão antes do plano
(seção 4.6).
**Entrega única** (decisão do Victor), em camadas independentes (seção 11).

## 0. Revisão 5 — o que muda (29/09/2026)

Decisão do Victor em 29/09: fazer os perfis de áreas já, junto da organização dos menus, para migrar
a plataforma nesta semana. A revisão 4 continua valendo onde esta seção não diz o contrário.

### 0.1 Duas fases

- **Fase 1 (`v1.59.0-cvx.5`), esta semana:** seções 3.1, 3.2, 3.3 itens 1 a 4 (leitura, organização
  ativa, editor da clínica, bloqueio das telas — sem a faixa da Caixa de entrada), 4.1, 4.2, 4.3 sem o
  bloco "Pausado pelo pacote", 4.4 sem o filtro "com itens pausados" e sem "mover em lote", 4.5, 4.7
  sem a faixa, 6 (só as rotas de perfil e de áreas da empresa), 7, 8 e 9 no que couber na fase.
- **Fase 2, depois da migração:** 3.3 item 5 (ferramentas da IA e do MCP), 3.4 (pausas, reconciliação,
  `pausas_do_pacote`, cron `convexy-areas`), 3.5 (reativação), 3.6 (aviso de impacto), mover em lote,
  exclusão de perfil com destino (na fase 1, excluir só perfil sem empresas), 5 (suporte com "fora do
  pacote") e a faixa da Caixa de entrada.
- **Por que a fase 2 pode esperar:** pausa, impacto e reativação só importam ao TIRAR uma área de uma
  empresa que já a usa; hoje não há cliente em nenhuma plataforma, e a primeira clínica nasce no
  perfil certo. Enquanto a fase 2 não existir, a página da empresa diz ao salvar: "O que já estiver
  ativo nas áreas retiradas continua ativo — confira antes."

### 0.2 Ajustes ao que mudou desde a revisão 4

- **Migration `9005_perfis_de_areas`** (a 9002 foi usada pelo símbolo da marca; 9003 e 9004 também
  já existem). O trial usa a 9006.
- **Seletor agrupado pelas portas do menu da clínica** (`v1.59.0-cvx.4`): Início, Conversas, CRM,
  Agenda, Pacientes, Agentes, Fluxos, Minha clínica, Configurações, mais o grupo "Fora do menu"
  (`FORA_DO_MENU`: Métricas, Anúncios, Atividades, Faturamento, Evolução da IA, Audit Log).
- **Telas escondidas** (`lib/convexy/telas-escondidas.ts`, `v1.59.0-cvx.3`) continuam valendo por
  cima dos perfis: `ESCONDIDAS_PARA_TODOS` nunca aparece, qualquer que seja o perfil (o seletor não as
  lista), e `ESCONDIDAS_NA_CLINICA` segue pelo nicho. O perfil só estreita.
- **Obrigatórias:** as `PORTAS_ESSENCIAIS` + Início + LGPD + Conexões. Extensões sai da lista (está em
  `ESCONDIDAS_PARA_TODOS`).
- **Dependências:** Roteadores, Retornos automáticos, Fluxos de atendimento e Prospecção dependem de
  Assistentes; Assistentes depende de Pedidos da IA e Casos; Pedidos da IA depende de Casos.
- **Perfil semente "Clínicas"** (o Victor ajusta pela tela): Início; Inbox, Sem resposta, Modelos,
  Campanhas; Funil, Tarefas; Agenda; Contatos; Assistentes, Base de conhecimento, Pedidos da IA,
  Casos, Propostas, Execuções, Uso, Aviso no WhatsApp, Provedores, Credenciais, Memória, Skills;
  Retornos automáticos, Roteadores, Fluxos de atendimento; Tipos de agendamento, Dados da empresa;
  Métricas, Anúncios, Atividades; Conexões, Equipe, Etiquetas, Etapas do funil, Atendimento, Marca,
  Perfil, Segurança, Notificações, LGPD. Fora: Prospecção, Chamadas, Trunk SIP, Webhooks, API Tokens,
  Meta Ads (integração), Conversões, Planos, Evolução da IA, Audit Log e as escondidas para todos.
- **Trial** (`v1.59.0-cvx.6`) é independente: suspender por trial não mexe em perfil; reativar
  devolve o mesmo perfil.

## 1. Objetivo

Hoje o que cada empresa vê é decidido pela própria empresa, e esconder não bloqueia nada. A Convexy
quer decidir, por empresa, quais **áreas** ela tem liberadas — um pacote contratado — com telas
agradáveis de usar.

- O admin da plataforma mantém **perfis de áreas** (ex.: Completa, Clínicas, Essencial).
- Na **criação da empresa**, escolhe um perfil e, se quiser, ajusta área por área.
- Na **página da empresa** no admin, muda o perfil e os ajustes depois.
- Área não liberada: **some** da navegação, **a tela não abre** (nem por link interno), **o agente
  de IA e o MCP não usam as ferramentas dela**, e **o que estiver ativo nela é pausado** pelos
  interruptores que o próprio sistema já tem — com aviso antes de salvar.
- Dentro do liberado, a clínica continua escolhendo o que cada membro vê. A clínica **não é avisada**
  quando áreas entram ou saem.

Critérios de sucesso:
1. Editar um perfil vale para todas as empresas que o usam em até 30 s, preservando os ajustes de
   cada uma.
2. Nenhuma empresa existente muda ao atualizar: sem perfil, vale Completa, e Completa sem ajustes não
   altera nada (nem a interface, nem o menu clássico).
3. Área não liberada não aparece, não abre, não é usada pela IA e fica sem nada ativo em até 5
   minutos, qualquer que seja a origem (salvar no admin, onboarding, suporte, API).
4. Ninguém bloqueia uma área sem ver antes, com números, o que vai pausar.
5. Liberar de novo nunca reativa nada sozinho.
6. Nenhum motor do original é alterado.

Fora do escopo: bloquear rotas REST da API por área (as rotas servem às telas liberadas); cobrança e
limites numéricos; mudar o que cada papel pode ver.

## 2. Decisões tomadas com o Victor

| Tema | Decisão |
|---|---|
| Quem decide | O admin da plataforma, por empresa, com perfis reutilizáveis |
| Empresa × perfil | A empresa aponta para um perfil e guarda ajustes (a mais / a menos) |
| Bloqueio | Navegação, telas, ferramentas da IA e do MCP; API REST não |
| O que estiver ativo | Pausado pelos interruptores do sistema; liberar não reativa sozinho |
| Clínica | Escolhe a interface da equipe dentro do liberado; **não é avisada** de entradas/saídas |
| Suporte da Convexy | Vê tudo, com "fora do pacote" |
| Entregas | Uma só |

## 3. O modelo

### 3.1 Perfil de áreas

Tabela `perfis_de_areas` (dado da instalação):

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid | chave |
| `nome` | text | 1–60 caracteres; único por `lower(nome)` |
| `descricao` | text | até 200 caracteres |
| `libera_tudo` | boolean | só uma linha `true` (índice único parcial); `check (not libera_tudo or areas = '{}')` |
| `areas` | text[] | sem nulos, até 200, cada item no formato `^/app(/[a-z0-9-]+)*$` (função imutável `public.fn_hrefs_validos`) |
| `created_at`, `updated_at`, `updated_by` | — | `updated_by` com `on delete set null` |

- **Acesso:** `enable row level security` sem políticas e `revoke all` de `anon, authenticated`. Só o
  service role lê e grava.
- **Completa protegida no banco:** gatilho (`public.fn_protege_perfil_completo`) recusa excluir a
  linha `libera_tudo` ou tirar o `libera_tudo` dela. Nome e descrição continuam editáveis.
- **Perfis iniciais:** inseridos no mesmo bloco que cria a tabela, **só quando a tabela ainda não
  existia** (`to_regclass` nulo) — a atualização da VPS reaplica o baseline e nunca recria um perfil
  que o Victor renomeou ou excluiu. Ids fixos.
  - **Completa** — `libera_tudo`.
  - **Essencial** — a lista `SIMPLIFICADA` do sistema (teste compara a constante da semente com a
    lista do sistema).
  - **Clínicas** — a lista do protótipo, com Início, Assistentes, Pedidos da IA, Casos e as demais
    áreas do dia a dia da clínica; o Victor ajusta pela tela.
- "Duplicar" gera "Nome (cópia)"; de Completa, gera lista explícita.

### 3.2 Áreas da empresa

Colunas novas em `organizations`:

| Coluna | Tipo | Regra |
|---|---|---|
| `perfil_de_areas_id` | uuid, FK `on delete restrict`, índice | nulo = Completa |
| `areas_a_mais`, `areas_a_menos` | text[] | mesmas regras de `areas` |
| `areas_atualizadas_em` | timestamptz | versão para gravação condicional e "alterado em" |

- Só o admin da plataforma escreve (a única política de escrita em `organizations` já é dele). Os
  membros leem as colunas da própria empresa pela política existente.
- **Áreas liberadas** = fecho de dependências de: (tudo, se o perfil libera tudo; senão as `areas` do
  perfil) ∪ `areas_a_mais` − `areas_a_menos` ∪ **obrigatórias**.
- **Obrigatórias** (sempre liberadas, etiqueta "obrigatória"): perfil, segurança, equipe, organização
  (as `PORTAS_ESSENCIAIS` do original) + Início (`/app`) + LGPD (`/app/lgpd/requests`) + Extensões
  (`/app/extensions`) + Conexões (`/app/connections`).
- **Dependências** — uma área sem a área de que depende **não fica liberada** (o fecho tira as
  dependentes), e o seletor mostra "precisa de X" e oferece liberar junto:
  - Roteadores, Retornos automáticos e Prospecção dependem de **Assistentes** (sem assistente
    ativo, roteador deixa conversa sem resposta; retorno e prospecção acionam a IA);
  - Assistentes depende de **Pedidos da IA** e **Casos** (a IA abre casos ao escalar);
  - Pedidos da IA depende de Casos.
  Tirar Assistentes tira as dependentes, e o aviso de impacto lista todas.
- **Páginas-hub** (`/app/crm`, `/app/ai`, `/app/analise`, `/app/settings`) não são áreas: abrem se ao
  menos uma área do grupo estiver liberada.
- **Módulos opcionais** (Fluxos de atendimento, Dados externos): etiqueta "módulo desligado" quando o
  módulo estiver desligado; não contam no "N de M". O Início é obrigatório; com o menu novo desligado
  ele não aparece (e não conta).
- Ajustes são mantidos ao trocar de perfil; os que coincidem com o novo perfil aparecem como "já
  incluída no perfil". "Limpar ajustes" é explícito.
- **Completa sem ajustes é um não-caso:** `areasLiberadas` devolve "sem limite", e a interface efetiva
  fica exatamente como hoje.

### 3.3 Onde o limite vale

Função pura `areasLiberadas(perfil, empresa)` e leitura `areasDaOrg(admin, orgId)`.

1. **Leitura.**
   - **Pedido com sessão:** as colunas da empresa entram na consulta que `loadAuthUser` já faz da
     organização, sem ida extra ao banco; os tipos `OrgJoinEmpresa` e `UserOrgMembership` ganham as
     colunas.
   - **Perfis:** memo em `globalThis` com contador de geração e validade de 30 s (padrão de
     `lib/branding/instalacao.ts`), lido com o admin client; nunca memoriza erro; em falha, usa o
     último valor bom; o processo que grava um perfil limpa o memo. **Nunca** embutir
     `perfis_de_areas` na consulta do usuário (a tabela é ilegível para `authenticated`).
   - **Sem sessão de cookie** (worker do agente, MCP por token `dsk_`, ramo de suporte):
     `areasDaOrg(admin, orgId)`.
2. **Organização ativa.** Em `resolveActiveOrg`, a interface efetiva = `combinarInterfaces(empresa,
   membro)` limitada às áreas liberadas, e o `activeOrg` ganha `areas_liberadas` (nulo = sem limite).
   Menu clássico, menu novo, busca ⌘K, hubs, `homeDaInterface`, Início, `/api/v1/auth/interface` e a
   lista final do onboarding obedecem sozinhos. Sem área de trabalho dentro do limite: só as
   obrigatórias (nunca `destinos: []`).
   - **Suporte:** o ramo de suporte carrega `areas_liberadas` e não aplica o limite na navegação.
3. **Tela de interface da clínica** (`InterfaceEditor`): recebe `areas_liberadas` pelo contexto da
   Convexy (no admin, na criação, por prop com o perfil escolhido); mostra só o liberado e o grupo
   recolhido "Fora do seu pacote (N)", só leitura. O limite vale só na leitura: escolhas salvas fora
   dele são preservadas. Nenhuma rota de escrita da interface ganha validação nova.
4. **Bloqueio das telas** — componente cliente montado pelo `ConvexyProvider` (que o layout já tem),
   com `usePathname`: área dona por `donoDoCaminho` sobre o catálogo inteiro e todos os
   `DONOS_EXTRAS`; não liberada → no lugar da tela:
   > **Esta área não faz parte do pacote da sua empresa.** Para incluí-la, fale com <marca da
   > instalação>. [Voltar ao Início]
   Para quem não é admin da empresa: "Fale com o administrador da sua empresa." "Voltar ao Início"
   leva ao Início ou, com o menu novo desligado, a `homeDaInterface`. Nunca bloqueia Início,
   obrigatórias nem páginas sem dono. Com `areas_liberadas` ausente no contexto, não bloqueia
   (ausência = sem limite só neste componente; a navegação já vem limitada do servidor).
   - **Onboarding** (fora de `/app`): o passo de criar o agente de IA é pulado quando Assistentes não
     está liberado.
5. **Ferramentas da IA e do MCP** — mapa **da Convexy** (`lib/convexy/areas/ferramentas.ts`, sem
   editar o catálogo do original) liga cada ferramenta a uma área ou a `transversal`:
   - **nativas do agente** (`inbound-turn.ts`): `get_lead_context`, `send_message`,
     `update_lead_state`, `save_lead_note`, `get_lead_note`, `request_human_handoff`,
     `open_human_case`, `provide_case_update` → transversais; `schedule_followup` → Retornos;
     `search_knowledge`, `read_skill_reference` → Conhecimento/Skills; `send_template` → Conexões;
   - **catálogo MCP**: cada id de `VALID_TOOL_IDS` classificado.
   O filtro entra: após montar as nativas no turno (um ponto), em `pickToolsFromMcp` (parâmetro
   **obrigatório**, preenchido pelos dois chamadores), em `createMcpServer` (preenchido por
   `app/api/mcp/route.ts` e pelo agente), em `app/api/v1/mcp/tools/route.ts` e na prévia do agente
   (`preview.ts`). **Falha fechada:** ferramenta sem classificação fica de fora. Teste reprova id
   novo sem classificação.

### 3.4 Pausas: o que é pausado e como

Um único serviço da Convexy, **`reconciliarPausas(orgId)`**, idempotente, compara as áreas liberadas
com o que está ativo e pausa o que estiver ativo em área não liberada, usando as funções que o
próprio sistema usa nos botões "pausar". Ele roda:
- logo depois de toda gravação de áreas (empresa, perfil, mover, excluir perfil);
- a cada 5 minutos por um cron da Convexy (`/api/v1/cron/convexy-areas`, uma linha na lista do
  scheduler), para todas as empresas com perfil diferente de Completa ou com ajustes.

Assim o que for criado ou reativado depois (onboarding, suporte, API, um fluxo do original) volta a
ser pausado em até 5 minutos, e uma falha no meio de uma gravação se completa no ciclo seguinte.

| Área não liberada | O que é pausado | Como (função do sistema) |
|---|---|---|
| Campanhas | campanhas `scheduled` e `running` | `pausarAcao` (máquina de estados das campanhas) |
| Retornos automáticos | fluxos ativos e inscrições `active`, `waiting_reply`, `dormente` | ponteiros de fluxo → `disabled`; inscrições por `pausaEnrollment` (com o admin client; claim em andamento → nova tentativa no próximo ciclo) |
| Assistentes (e dependentes) | **todos** os agentes da empresa, inclusive os de prospecção | `paused_at` (a mesma pausa do botão "Pausar"; com todos pausados, o sistema já manda as conversas para a Fila humana) |
| Roteadores | roteadores ativos | `ai_routers.is_active = false` |
| Prospecção | campanhas de prospecção em execução | `prospecting_campaigns.status = 'paused'` |
| Webhooks | regras de automação ativas | `automation_rules.is_active = false` — as **fontes de entrada continuam ativas** (desligá-las perderia leads de formulário) |

- **Registro:** tabela `pausas_do_pacote` — `id`, `organization_id` (FK `on delete cascade`), `area`,
  `tipo` (check: `campanha`, `inscricao_followup`, `fluxo_followup`, `agente`, `roteador`,
  `prospeccao`, `automacao`), `recurso_id`, `estado_anterior` (só o valor do status), `origem`
  (`empresa`/`perfil`), `perfil_id`, `pausado_por` (FK `set null`), `pausado_em`; `unique
  (organization_id, tipo, recurso_id)`; índice `(organization_id, area)`; RLS ligada sem políticas e
  revoke de `anon, authenticated`; entra na prova própria do teste de completude de RLS.
- Cada pausa deixa rastro no próprio recurso quando o sistema tem onde (evento "pausado pelo pacote"
  na linha do tempo da inscrição; auditoria da pausa do agente como o botão já faz).
- **Áreas sem interruptor** (Agenda, Chamadas, Conhecimento, relatórios, configurações): só somem e
  bloqueiam a tela; o que roda nelas continua (os lembretes da Agenda seguem saindo) — o aviso diz.
- **Nunca pausado:** recebimento de mensagens, reprocessamento de mensagens recusadas, distribuição de
  atendimento humano, fontes de entrada de webhooks, webhooks obrigatórios de LGPD, retenção,
  auditoria, avisos de canal.
- A API REST não é bloqueada: quem tiver acesso à API pode reativar algo; a reconciliação pausa de
  novo no ciclo seguinte.

### 3.5 Ao liberar de novo

Nada volta sozinho. A página da empresa mostra "Pausado pelo pacote", **agrupado por tipo com
contagem** ("3 campanhas", "212 retornos", "2 assistentes"), com "Reativar todos" por grupo e lista
expansível; nada pré-marcado.
- Reativa só o que **ainda está como o pacote deixou**; o que foi alterado depois é retirado do
  registro e aparece como "alterado depois — confira".
- Campanhas com horário vencido não reativam: "vencida — reagende" (desabilitada).
- Retornos reativam com o tempo de espera que faltava (o sistema já guarda e recalcula), sem rajada.
- Agentes: `paused_at = null`. Roteadores: reativação que esbarre em "um roteador ativo por canal"
  (`uniq_ai_routers_active_session`) fica pausada com o motivo.
- Depois de salvar um perfil que devolve áreas, a tela avisa "N empresas têm itens pausados que podem
  voltar", com link para a lista de empresas filtrada por "com itens pausados".

### 3.6 O aviso antes de salvar

Rota única `POST /api/v1/admin/areas/impacto` com `{ empresa_id, areas }`, `{ perfil_id, areas }`,
`{ empresas, perfil_destino }` (mover em lote) ou `{ perfil_origem, perfil_destino }` (excluir):
calcula no servidor, por empresa, as áreas que sairiam (com fecho de dependências) e conta, em
consultas agrupadas por `organization_id`, o que seria pausado. A tela mostra:

> **Ao salvar, isto será pausado:** 3 campanhas agendadas, 12 retornos automáticos, 2 assistentes (a
> IA deixa de responder; as conversas vão para a Caixa de entrada). **Continua funcionando:**
> lembretes da Agenda. **Não afetadas:** 2 empresas que têm estas áreas como ajuste.

- Quando a IA deixa de responder em alguma empresa: digitar o nome da empresa (ou do perfil de
  origem, em perfil/mover/excluir) para confirmar.
- Ao salvar, o servidor recalcula o impacto; se ele **cresceu** desde o aviso, 409 "O impacto mudou
  desde que você viu o aviso. Revise antes de salvar." — o rascunho fica.
- Sem aviso carregado, "Salvar" fica bloqueado: "Não foi possível calcular o impacto — tentar de novo."

## 4. As telas

### 4.1 Perfis de áreas (nova página do admin)
- Entrada "Perfis de áreas" no menu do admin.
- Lista: nome, descrição, total de áreas, empresas que usam (link para a lista filtrada). Editor:
  nome, descrição, seletor. Completa: só nome e descrição, sem "Excluir".
- "Novo perfil" é rascunho até salvar; trocar de perfil ou sair com alterações pede confirmação.
- "Salvar e aplicar a N empresas" abre a confirmação com áreas que entram e saem, as empresas
  afetadas e o aviso.
- "Excluir" pede o destino, sem padrão, com o aviso para as empresas movidas.

### 4.2 Nova empresa — seção "Áreas liberadas"
Seção do formulário (página única): cartões dos perfis, padrão "Completa (tudo liberado)" explícito,
"Personalizar" opcional com o seletor (nomes neutros — o tipo de negócio é escolhido depois, na
página da empresa).

### 4.3 Página da empresa
- Cartão "Áreas liberadas" junto do "Tipo de negócio": perfil, total, ajustes, "pausado agora" (com
  contagens) e "última alteração: <quem>, <quando>, <origem>".
- "Editar áreas" abre `/admin/tenants/[id]/areas`: seletor com ajustes marcados (nomes do nicho da
  empresa), barra "Alterações não salvas" (`aria-live`), e o bloco "Pausado pelo pacote" da seção 3.5.

### 4.4 Lista de empresas do admin
Coluna "Perfil"; filtros "perfil" e "com itens pausados" (na URL, para os links funcionarem); seleção
das linhas carregadas → "Mover para o perfil…" com o aviso. Filtrar "Completa" inclui as empresas sem
perfil.

### 4.5 O seletor de áreas (componente único)
Agrupado pelas portas e grupos do menu novo; porta como `fieldset`/`legend`, interruptor com
`indeterminate` real e ação só nas áreas visíveis durante a busca; contador "N de M"; busca (nomes
neutros e do nicho); "Marcar tudo", "Só as obrigatórias"; etiquetas "obrigatória", "módulo
desligado", "a mais", "a menos", "já incluída no perfil", "precisa de X"; português e espanhol; tema
claro e escuro; a partir de 390 px; nomes longos quebram a linha.

### 4.6 Protótipo a atualizar (antes do plano)
Obrigatórias (Início, LGPD, Extensões, Conexões); "Essencial"; Clínicas com Assistentes, Pedidos da
IA e Casos; dependências no seletor; Completa só nome/descrição e sem excluir; exclusão sem destino
padrão; novo perfil como rascunho; "Só as obrigatórias"; confirmação com aviso e digitação do nome;
seção única na criação; cartão e página de áreas com "Pausado pelo pacote" agrupado; lista de
empresas com coluna, filtros e mover em lote; `aria-live`, `indeterminate`, `fieldset`; tela "Área
não liberada".

### 4.7 O que a clínica vê
- A tela bloqueada da seção 3.3.4; nenhum aviso de entrada/saída de áreas.
- Grupo "Fora do seu pacote (N)" no "Menu lateral".
- Com Assistentes não liberado: faixa na Caixa de entrada, desenhada pelo `ConvexyProvider` quando o
  caminho é o da Caixa de entrada: "As respostas automáticas da IA estão desativadas nesta empresa.
  Responda os <contatos/pacientes> pela Caixa de entrada." É um estado permanente da tela, não um
  aviso de mudança.
- Sem área de trabalho: "Sua interface não tem áreas disponíveis. Fale com o administrador da sua
  empresa." (causa interface) ou "…não faz parte do pacote da sua empresa." (causa pacote).

## 5. Suporte da Convexy

Em sessão de suporte, o admin da plataforma vê todas as áreas; o menu novo marca as não liberadas
com "fora do pacote" (menu clássico e busca mostram tudo sem etiqueta — registrado). Nas telas fora
do pacote: "A empresa não vê esta área. O que for ativado aqui será pausado em até 5 minutos."

## 6. Gravação e auditoria

Todas as escritas: `requirePlatformAdmin()`, `scope === "full"`, `mfaEmDivida()`,
`requireSupportWrite` (com o `tenantId` nas de empresa), Zod `.strict()`, `ok`/`fail`, gravação
condicional pela versão (409) e auditoria com antes/depois. Toda consulta com admin client em
`lib/convexy/areas/*` filtra `organization_id` (regra `admin-client-exige-filtro-de-tenant`).

| Rota | O que faz | Auditoria |
|---|---|---|
| `GET /api/v1/admin/perfis-de-areas` | lista com empresas por perfil | — |
| `POST /api/v1/admin/perfis-de-areas` | cria | `platform.perfil_de_areas_created` |
| `PATCH /api/v1/admin/perfis-de-areas/[id]` | edita, depois reconcilia as empresas | `platform.perfil_de_areas_updated` + `tenant.areas_changed` por empresa (`origem: perfil`) |
| `DELETE /api/v1/admin/perfis-de-areas/[id]` | move e exclui por `fn_excluir_perfil_de_areas`, depois reconcilia | `platform.perfil_de_areas_deleted` + `tenant.areas_changed` por empresa movida |
| `POST /api/v1/admin/perfis-de-areas/[id]/empresas` | move empresas em lote por `fn_mover_empresas_de_perfil`, depois reconcilia | `tenant.areas_changed` por empresa |
| `GET/PATCH /api/v1/admin/tenants/[id]/areas` | lê e grava perfil + ajustes, depois reconcilia | `tenant.areas_changed` |
| `POST /api/v1/admin/tenants/[id]/areas/reativar` | reativa o que o pacote pausou | `tenant.pausas_reativadas` |
| `POST /api/v1/admin/areas/impacto` | aviso da seção 3.6 | — |
| `GET /api/v1/cron/convexy-areas` | reconciliação periódica (autenticação de cron do sistema) | só quando pausou algo |

- **`fn_excluir_perfil_de_areas`** e **`fn_mover_empresas_de_perfil`** (security definer,
  `search_path` fixo, revoke de `public, anon, authenticated`): travam o perfil de origem (`for
  update`), o de destino (`for key share`) e as empresas; recusam origem = destino, destino
  inexistente e origem Completa (só na exclusão); gravam numa transação e devolvem as empresas com o
  estado anterior. FK e erros próprios viram 409. Mesmo código na migration e no apêndice do
  baseline.
- **Criação de empresa:** a função do original não muda. Depois dela e antes da auditoria e do
  convite, a rota grava as áreas **só se a empresa ainda estiver no padrão** (a repetição idempotente
  não sobrescreve edição posterior) e reconcilia; falha = 5xx. Empresas de cadastro, provisionamento
  e recuperação nascem em Completa. A interface do dono é conferida contra o perfil escolhido.

## 7. Compatibilidade e desvios

- Empresas existentes: perfil nulo = Completa, não-caso; nada muda ao atualizar.
- Nenhum motor do original é alterado; pausas pelas funções que os botões já usam.
- Tela nova do original: entra sozinha em Completa; nos outros perfis começa desligada. Ferramenta
  nova sem classificação reprova o CI.
- Limite dos perfis: até 30 s para chegar a outros processos (memo).
- **Desvios registrados no `CONVEXY.md`:** a interface do original "nunca é autorização"
  (`lib/navigation/interface.ts`, `combinarInterfaces`, `interface-por-vinculo.architecture.json`) —
  aqui as áreas bloqueiam telas e ferramentas e pausam recursos, por empresa; o original só bloqueia
  por instalação; o código de servidor da tela bloqueada ainda roda; a API REST não é bloqueada (a
  reconciliação corrige em até 5 min); ações de servidor de telas bloqueadas continuam chamáveis;
  menu clássico e busca sem "fora do pacote" no suporte; `tenant.areas_changed` aparece também no
  registro de ações da própria empresa.
- Migration `9002_perfis_de_areas`; bloco no apêndice do `baseline.sql` **depois** da criação de
  `platform_config` e **antes** dos blocos 0340/0325/0274 (proteções de tabelas de organização e
  travas de suporte), posição registrada no `CONVEXY.md`; linha no MANIFEST; tipos.

## 8. Testes (todos no CI do fork)

- **Unitários:** `areasLiberadas` (Completa não-caso, a mais/a menos, obrigatórias, fecho de
  dependências, href morto, troca de perfil); `resolveActiveOrg` (limite, obrigatórias, suporte);
  memo dos perfis (último valor bom, limpeza ao gravar); editor da clínica; bloqueio de tela por
  navegação cliente e cada `DONOS_EXTRAS`; hubs; onboarding pula o passo do agente; mapa de
  ferramentas (todas classificadas, falha fechada) nos pontos do turno, `pickToolsFromMcp`,
  `createMcpServer`, rota de ferramentas e prévia; `reconciliarPausas` por área (cada interruptor,
  idempotência, registro, claim em andamento, fontes de webhook intactas); reativação (condicional,
  vencidas, retornos sem rajada, roteador com conflito); impacto (formas de entrada, fecho, não
  afetadas, crescimento → 409); rotas (autorização, `scope`, MFA, suporte, Zod, versões, auditoria,
  excluir, mover, criação com repetição); cron (só empresas com limite; audita só quando pausou);
  seletor; Essencial = `SIMPLIFICADA`; lista do onboarding.
- **Existentes a atualizar:** testes que simulam `resolveActiveOrg`; o de criação de empresa que
  simula o admin client só com `rpc`; todos os que chamam `pickToolsFromMcp` ou `createMcpServer`
  (o parâmetro obrigatório faz a checagem de tipos listar cada um);
  `hooks/auth/InterfaceRefresh.test.tsx`; completude e isolamento de RLS e travas de suporte (novas
  tabelas).
- **Invariantes (Postgres):** tabelas, índices, checks, `fn_hrefs_validos`, gatilho da Completa, FK
  `restrict`, RLS e revoke, semente só na criação da tabela, funções de excluir e mover (travas,
  recusas, transação), código idêntico migration × baseline, idempotência do baseline.
- **E2E** (numa `SPECS_PARTE_1`–`3`): criar perfil; criar empresa com perfil + ajuste; a clínica não
  vê nem abre a área tirada, inclusive por link interno; bloquear Campanhas mostra o aviso e a
  campanha fica pausada; liberar e reativar; excluir perfil em uso; suporte com "fora do pacote".

## 9. Doutrina (DoD)

- **13:** `docs/architecture/convexy-areas.architecture.json` (perfis, áreas da empresa, limite,
  bloqueio, reconciliação, IA/MCP, admin; ≥ 2 arestas cada); jornada `JCVX2`; laço de retorno: aviso
  de impacto, "pausado agora" na empresa, reconciliação periódica, ferramenta sem classificação
  reprova o CI.
- **14:** páginas do admin com porta no menu do admin. **17:** CHANGELOG à mão. **18:** destino =
  instalação do fork.

## 10. Arquivos (o plano detalha)

- **Novos (Convexy):** `lib/convexy/areas/*` (cálculo, memo dos perfis, leitura sem sessão, mapa de
  ferramentas, reconciliação, reativação, impacto), rotas em `app/api/v1/admin/perfis-de-areas/*`,
  `app/api/v1/admin/tenants/[id]/areas/*`, `app/api/v1/admin/areas/impacto`,
  `app/api/v1/cron/convexy-areas`, páginas `app/admin/(protected)/perfis-de-areas/` e
  `app/admin/(protected)/tenants/[id]/areas/`, componentes em `components/convexy/areas/*`,
  migration 9002, testes.
- **Original, em pontos de extensão (comentário `Convexy:` e linha no `CONVEXY.md`, anexando ao fim
  das listas):** `lib/auth/server.ts` (colunas no embed, limite e `areas_liberadas` nos dois ramos),
  `components/team/InterfaceEditor.tsx`, `app/app/layout.tsx` (áreas para o `ConvexyProvider`),
  `lib/agent-engine/agent/inbound-turn.ts` (um filtro após montar as nativas),
  `lib/ai/runtime/tools.ts` e seus chamadores `lib/ai/runtime/agent.ts` e
  `lib/agent-engine/edge/crm/mcp-tools.ts`, `lib/mcp/server.ts`, `app/api/mcp/route.ts`,
  `app/api/v1/mcp/tools/route.ts`, `lib/agent-engine/agent/preview.ts`, o passo do agente no
  onboarding (`app/onboarding/…`), a criação de empresa (schema e rota), a página da empresa (junto
  do cartão do nicho), a lista de empresas do admin (rota GET, hook, tabela e filtros),
  `components/admin/AdminSidebar.tsx`, `lib/i18n/dicionario.ts` (rótulo da entrada do admin),
  `lib/audit/actions.ts`, `lib/onboarding/o-que-mais-existe.ts`, `docker/scheduler/entrypoint.sh`
  (o cron da Convexy), baseline, MANIFEST, tipos, `.github/workflows/e2e.yml`.

## 11. Ordem de construção (cada camada verde sozinha)

1. Banco (9002), baseline, MANIFEST, tipos, invariantes — inerte.
2. Lógica pura: `areasLiberadas` com dependências, mapa de ferramentas, memo dos perfis — inerte.
3. Reconciliação, reativação e impacto (serviços) + cron — sem efeito enquanto todas estão em
   Completa.
4. Rotas do admin e auditoria.
5. Telas do admin: seletor, perfis, criação, cartão e página da empresa, lista de empresas.
6. Limite na leitura: `resolveActiveOrg`, editor da clínica, lista do onboarding.
7. Bloqueio das telas, faixa da Caixa de entrada, passo do agente no onboarding.
8. Filtro de ferramentas (IA, MCP, prévia).
9. Suporte ("fora do pacote").
10. E2E, mapa, jornada, `CONVEXY.md`, CHANGELOG.

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Bloquear Assistentes cala a IA | aviso com números, digitar o nome, faixa na Caixa de entrada; a pausa usa o caminho que manda as conversas para a Fila humana |
| Algo ativo reaparece numa área bloqueada | reconciliação a cada 5 min, qualquer origem |
| Liberar dispara acumulado | nada volta sozinho; vencidas não voltam; retornos com a espera que faltava |
| Falha no meio de uma gravação | reconciliação completa no ciclo seguinte; "pausado agora" mostra o estado real |
| Ferramenta nova sem classificação | teste reprova; falha fechada |
| Semente recriar perfil apagado | semente só na criação da tabela |
| Aviso desatualizado | recálculo no salvar; 409 se o impacto cresceu |
| Arquivos do original tocados | pontos de extensão, sem mexer nos motores; instrução de reaplicação |

## 13. O que mudou na revisão 4

- Pausas pelas funções dos botões do sistema, com os estados corretos (agente por `paused_at` —
  `is_active` não cala a IA; campanhas só `scheduled`/`running` via `pausarAcao`; retornos também
  desligam os fluxos; prospecção por `prospecting_campaigns.status`; fontes de webhook nunca pausam).
- **Reconciliação periódica** (5 min) que cobre onboarding, suporte, API e falhas no meio — e torna
  verdadeiro o aviso do suporte.
- Dependências como fecho em `areasLiberadas` (Roteadores, Retornos e Prospecção dependem de
  Assistentes).
- Reativação condicional, agrupada por tipo, com aviso pós-perfil e filtro "com itens pausados".
- Impacto numa rota única para empresa, perfil, mover e excluir; recálculo no salvar.
- Ajustes mantidos na troca de perfil ("já incluída no perfil").
- Leitura: memo em `globalThis` com último valor bom; leitura sem sessão para worker, MCP e suporte;
  Completa sem ajustes é não-caso.
- Posição do bloco no baseline corrigida; semente só na criação da tabela; `pausas_do_pacote`
  definida; `fn_mover_empresas_de_perfil`.
- Telas: marca da instalação no texto bloqueado, mensagens para não-admin, sem campo de nicho na
  criação, lista de empresas com filtros na URL.
- **Cortes:** "Ver como a clínica vê", página de histórico (vira a linha "última alteração"),
  numeração "(cópia N)", filtro "com ajustes", hash de versão.
