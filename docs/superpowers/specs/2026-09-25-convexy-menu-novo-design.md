# Menu novo da Convexy — desenho

**Status:** rascunho para revisão · **Data:** 2026-09-25 · **Fork:** `victorrabyfs/DeskcommCRM`
**Entrega 1 de 2.** A entrega 2 (painel Início por nicho) terá spec própria.
**Protótipo aprovado:** artefato "Menu da Convexy", rodada 2, versão 6.

## 1. Objetivo

Trocar o menu lateral do app (`/app/**`) por um menu mais amigável para quem opera o dia a
dia — recepção, gestores e a própria Convexy:

- poucas portas grandes no menu principal;
- uma **sub-sidebar** ao lado quando a porta tem submenus;
- nomes que acompanham o **nicho** da organização (clínica, serviços/agência, …);
- microinterações suaves.

O menu clássico do original continua no código, pronto para voltar com uma linha.

Critérios de sucesso:
1. Toda tela que hoje tem porta continua alcançável pelo menu novo, respeitando papel, módulos
   e interface por vínculo exatamente como hoje.
2. Uma atualização do original nunca deixa uma tela sem porta sem que o CI reprove.
3. As mudanças em arquivos do original cabem numa lista curta, registrada no `CONVEXY.md`.
4. Trocar para o menu clássico é mudar uma constante e publicar uma versão.

Fora do escopo: o painel Início por nicho (entrega 2); mudar o que cada papel pode ver;
renomear telas por dentro além do que a camada de vocabulário alcança (seção 6.3).

## 2. Decisões tomadas com o Victor

| Tema | Decisão |
|---|---|
| Estrutura | Opção B: 8 portas + Configurações no rodapé |
| Sub-sidebar | Abre ao clicar e fica aberta; já leva à primeira tela da porta |
| Trilho compacto | Só ícones (64px). Automático com sub-sidebar aberta; ou manual pela alça |
| Recolher | Alça redonda na borda do menu, abaixo do logo, visível no hover |
| Hover | Realce suave, seta que desliza, leve "afundar" no clique, barra azul do ativo. Sem aumento de ícone |
| Menu antigo | Fica no código; o novo é o padrão. Voltar = trocar a constante |
| Implementação | Abordagem 1: arquivos novos da Convexy "por cima" do catálogo do original |
| Início | Entra no menu agora, em versão simples; números por nicho na entrega 2 |
| Nicho | Chave `nicho` por organização; a Convexy é `servicos` |
| Nomes | Camada de vocabulário por nicho no tradutor do original |

## 3. Estrutura do menu

Portas, na ordem. "Direto" = navega sem sub-sidebar.

| Porta | Ícone | Comportamento | Conteúdo (hrefs do catálogo) |
|---|---|---|---|
| Início | casa | direto | `/app` (seção 7) |
| Conversas | balão | sub-sidebar | `/app/inbox`, `/app/radar`, `/app/templates` · *Envios:* `/app/campaigns`, `/app/calls` |
| Agenda | calendário | sub-sidebar | `/app/agenda`, `/app/comandas` · *Ajustes:* `/app/settings/tenant/agenda` |
| Contatos/Pacientes | pessoas | sub-sidebar | `/app/contacts`, `/app/prospecting`, `/app/products` |
| Funil | funil | direto | `/app/kanban` |
| Tarefas | check | direto | `/app/tasks` |
| Assistente de IA | robô | sub-sidebar | `/app/ai/agents`, `/app/ai/followups`, `/app/ai/atendimento`, `/app/ai/knowledge/sources`, `/app/ai/inbox` · *Acompanhar:* `/app/ai/cases`, `/app/ai/proposals`, `/app/ai/runs`, `/app/ai/usage`, `/app/ai/cases/avisos` · *Avançado:* `/app/ai/routers`, `/app/ai/providers`, `/app/ai/credentials`, `/app/ai/memory`, `/app/ai/skills` |
| Resultados | gráfico | sub-sidebar | `/app/metrics`, `/app/faturamento`, `/app/ads/meta`, `/app/activities` · *Mais:* `/app/ai/evolution`, `/app/audit` |
| Configurações (rodapé) | engrenagem | sub-sidebar | *Organização:* `/app/settings/tenant`, `/app/team`, `/app/settings/tenant/financeiro`, `/app/settings/marca`, `/app/settings/tags`, `/app/settings/tenant/pipelines`, `/app/settings/atendimento`, `/app/settings/conversoes` · *Integrações:* `/app/connections`, `/app/settings/meta-ads`, `/app/webhooks`, `/app/integrations/nuvemshop`, `/app/settings/api-tokens`, `/app/settings/voip-trunk`, `/app/extensions`, `/app/integracao-dados` · *Minha conta:* `/app/settings/profile`, `/app/settings/security`, `/app/settings/notifications`, `/app/lgpd/requests`, `/app/settings/billing` |

Todas as 55 entradas do `NAV_CATALOG` da `1.48.0` têm lugar. Os nomes da tabela são os do
nicho `generico`; a seção 6 diz o que muda por nicho.

Regras:
- **Visibilidade não é decidida aqui.** O menu recebe a lista que `searchable()`
  (`lib/navigation/registry.ts`) já devolve para a busca ⌘K — o catálogo inteiro filtrado por
  papel, `interface_settings` (inclusive o preset "simplificada"), módulos ligados e admin de
  plataforma — e só a redistribui. **Não** `sidebarGroups()`: essa devolve só as entradas com
  `sidebar: true` do menu clássico.
- Item fora dessa lista não aparece. Grupo sem itens some. Porta sem itens some.
- Porta com **um** item visível vira "direto" para esse item.
- Clicar numa porta com sub-sidebar navega para o primeiro item visível dela.
- A porta fica ativa quando o caminho atual é um dos seus itens (mesma regra de prefixo do
  `Sidebar.tsx`: igual ou `href + "/"`).
- `healthDot` (saúde da conexão de WhatsApp) aparece no item e **sobe para a porta** que o
  contém (Configurações), inclusive no trilho compacto.
- O rodapé mantém o `VersionFooter` (aviso de versão nova para o admin da plataforma).
- A barra do topo não muda (troca de organização, busca, alertas, menu do usuário).

## 4. Comportamento e aparência

Menu largo (sem sub-sidebar aberta): 236px; botões de 38px de altura, texto de 14,5px e ícones
de 19px.

Trilho compacto: 64px, só ícones de 20px. A dica com o nome aparece no hover e no foco. O
contador ou ponto da porta vira uma bolinha no canto do ícone. Entra sozinho quando uma
sub-sidebar abre. Também entra pela alça, e aí fica lembrado no cookie `sidebar_collapsed`,
que já existe (`app/actions/shell/toggleSidebar.ts`), então o servidor desenha certo e não
há piscada.

Sub-sidebar: 240px, título da porta com botão "×" afastado da borda, grupos com rótulo
pequeno, itens de 32px e 13,5px. Nome longo quebra a linha. Lista longa rola dentro da
própria sub-sidebar. Fechar no "×" devolve o menu largo, a não ser que a pessoa o tenha
recolhido.

Movimento:
- abrir a sub-sidebar: largura mais deslocamento/opacidade, cerca de 300ms, `cubic-bezier(.2,.8,.2,1)`;
- grupos da sub-sidebar entram em cascata;
- barra azul do item ativo cresce;
- nada é recriado ao navegar entre telas da mesma porta, só a marcação do ativo muda;
- `prefers-reduced-motion` desliga transições e animações.

Celular (`< md`): o `MobileSidebar` abre a gaveta com o menu largo. Uma porta com sub-sidebar
troca o conteúdo da gaveta pela lista dela, com "‹ Voltar". Clicar num item fecha a gaveta.

Acessibilidade: portas são `<Link>`/`<button>` com `aria-current`, sub-sidebar com
`aria-label`, foco visível, tudo alcançável pelo teclado, dica também no foco.

Temas claro e escuro pelos tokens de `app/globals.css` e `app/convexy/tema.css`, sem cor
literal.

## 5. Chave do menu (voltar ao clássico)

- `lib/convexy/menu/chave.ts`: `export const MENU_CONVEXY = true`.
- Com `true`, `AppShell` e `MobileSidebar` usam os componentes da Convexy e `/app` mostra o
  Início. Com `false`, tudo volta ao original: `Sidebar`, `SidebarContent` e o redirect de
  `/app`.
- **Os testes e2e do original continuam no menu clássico.** Oito specs dependem dele
  (`navegacao`, `menu-por-empresa-e-a-porta-de-volta`, `interface-por-vinculo`,
  `central-avisos-destino`, `extensoes-declarativas`, `funil-arquivado-volta-pela-tela`,
  `relatorio-de-atividades`, `marca-logo`), e outras esperam `/app` → `/app/inbox`.
  - O servidor aceita o cookie `convexy_menu=classico`, que força o clássico só para aquele
    navegador. É apresentação, não permissão.
  - O `playwright.config.ts` põe esse cookie em todas as specs, e as specs da Convexy o tiram.
  - Assim os testes do original provam que o caminho de volta funciona, e as specs da Convexy
    provam o menu novo.

## 6. Nicho e vocabulário

### 6.1 Onde fica o nicho

- `organizations.settings.nicho`, texto, um de `clinica`, `servicos`, `imobiliaria`, `curso`,
  `loja`, `generico` (os mesmos ids de `lib/onboarding/pacotes-de-funil.ts`). Sem migration.
- Ausente ou inválido vale `generico`. O leitor nunca lança.
- Quem grava: só o admin da plataforma, no campo "Tipo de negócio" da página da organização em
  `/admin/tenants/[id]`. A escrita é por rota/ação com Zod, `requireSupportWrite` antes do
  efeito, e uma linha em `api_audit_log` (`organization.nicho_changed`).
- Na implantação: a organização da Convexy recebe `servicos`, e a de teste que o Victor indicar
  recebe `clinica`.

### 6.2 A camada de vocabulário

- `lib/convexy/vocabulario.ts`: mapa `nicho → { textoOriginal: textoNovo }` para o português.
  Para o espanhol, o texto novo carrega a sua tradução no mesmo mapa.
- Entra num ponto só do original: `traduzir(texto, idioma)` (`lib/i18n/dicionario.ts`) consulta
  antes o vocabulário do nicho em vigor. O nicho em vigor vem do layout do app (servidor) e do
  provider (cliente), pelo mesmo caminho do idioma, para o servidor e o cliente desenharem o
  mesmo texto. O mecanismo exato é provado na primeira tarefa do plano.
- **A camada segue a mesma chave do menu (seção 5).** Com `MENU_CONVEXY = false` ou o cookie
  `convexy_menu=classico`, nenhum texto é trocado. Sem isso, as specs do original que procuram
  "Inbox" ou "Contatos" na tela quebrariam. Sem nicho em vigor (testes unitários, e-mail,
  rotas sem sessão), `traduzir` devolve exatamente o que devolve hoje.
- Alcance: tudo que já passa por `t()`/`traduzir()`, que é o menu, a busca ⌘K e a maior parte
  dos títulos das telas.
- O mapa é curto e explícito. Primeira versão:

| Original | `clinica` | `servicos` | `generico` |
|---|---|---|---|
| Inbox | Conversas | Conversas | Conversas |
| Radar de risco / Radar | Sem resposta | Sem resposta | Sem resposta |
| Contatos | Pacientes | Contatos | Contatos |
| Funis | Funil de pacientes | Funil de vendas | Funil |
| Agentes | Assistentes | Assistentes | Assistentes |
| Follow-ups | Retornos automáticos | Retornos automáticos | Retornos automáticos |
| Central de avisos / Alertas | Pedidos da IA | Pedidos da IA | Pedidos da IA |
| Meta Ads (em Resultados) | Anúncios | Anúncios | Anúncios |
| Audit Log | Registro de ações | Registro de ações | Registro de ações |

### 6.3 Onde o nome antigo continua

O plano mede e lista estes casos, e eles entram em "Desvios aceitos" do `CONVEXY.md`:
- título escrito fixo, sem `t()` (ex.: `<h1>Follow-ups</h1>` em `/app/ai/followups`);
- `metadata.title` da aba do navegador;
- e-mails e mensagens do servidor.

Corrigir cada um é editar um arquivo do original. Fica para depois, caso a caso, se incomodar.

## 7. Início (versão simples desta entrega)

- `/app` passa a mostrar o Início quando `MENU_CONVEXY` está ligado. Continua sendo a tela de
  entrada depois do login.
- Três blocos, para qualquer nicho, cada um com atalho para a tela completa:
  1. **Conversas esperando:** quantas e as 5 mais antigas, usando o que a fila do Inbox já usa
     (`comando_da_conversa = aguardando`, por `awaiting_since`).
  2. **Agenda de hoje:** consultas do dia no fuso da organização (`organizations.timezone`,
     não UTC), pela API `/api/v1/agenda/agendamentos` com `de`/`ate`.
  3. **Minhas tarefas:** vencidas e de hoje da pessoa logada.
- Sem API nova se as existentes bastarem, com filtragem no servidor da página. Se faltar
  filtro (ex.: `assigned_to` em `/api/v1/tasks`), a consulta é feita na página com o client de
  servidor e filtro de `organization_id` resolvido da sessão, nunca do corpo.
- Bloco que a pessoa não pode ver (papel ou interface) não aparece.
- Estado vazio amigável em cada bloco. Falha de um bloco não derruba os outros.
- `/app` já está na allowlist de `navegacao-completude.test.ts`, então não há porta nova no
  catálogo.

## 8. Arquivos

Novos (Convexy):
- `lib/convexy/menu/chave.ts`, `lib/convexy/menu/mapa.ts` (portas, grupos e hrefs),
  `lib/convexy/menu/montar.ts` (função pura: destinos visíveis → portas)
- `lib/convexy/nicho.ts` (ler/validar), `lib/convexy/vocabulario.ts`
- `components/convexy/menu/` (trilho, sub-sidebar, alça, versão do celular)
- `app/app/_convexy/inicio/` (blocos do Início)
- a ação ou rota do nicho e o campo no admin
- testes (seção 9)

Alterações em arquivos do original (cada uma registrada no `CONVEXY.md` com o trecho e como
reaplicar):

| Arquivo | Mudança |
|---|---|
| `app/app/_components/AppShell.tsx` | escolhe `MenuConvexy` ou `Sidebar` pela chave e pelo cookie |
| `components/shell/MobileSidebar.tsx` | idem para a gaveta |
| `app/app/page.tsx` | Início em vez do redirect quando a chave está ligada |
| `lib/i18n/dicionario.ts` | `traduzir` consulta o vocabulário do nicho |
| `app/app/layout.tsx` (ou o provider de idioma) | passa o nicho em vigor |
| `app/admin/(protected)/tenants/[id]/…` | inclui o campo "Tipo de negócio" |
| `playwright.config.ts` | cookie `convexy_menu=classico` por padrão |
| `.github/workflows/e2e.yml` | specs novas da Convexy em `SPECS_PARTE_*` |

## 9. Testes (todos rodam no CI do fork, nunca na máquina local)

Unitários:
- **Cobertura do mapa:** todo href do `NAV_CATALOG` está em exatamente uma porta. Reprova tela
  nova do original sem lugar, e href do mapa que não exista mais.
- **`montar`:** filtra pelo que `searchable()` devolve (incluindo preset "simplificada" e
  `destinos` escolhidos); porta com um item vira "direto"; porta
  vazia some; `healthDot` sobe para a porta.
- **Nicho:** valor inválido ou ausente vira `generico`; o leitor não lança.
- **Vocabulário:** com a chave desligada ou o cookie `classico`, nada é trocado;
- **Vocabulário:** cada nicho troca os textos da tabela; o espanhol tem tradução; sem nicho, o
  texto do original fica igual. Rodar a suíte de i18n existente sem regressão.
- **Chave:** com `false` e com o cookie `classico`, o `AppShell` desenha o `Sidebar` original.

Invariante: a escrita do nicho grava audit e recusa quem não é admin de plataforma.

E2E (novas, em `SPECS_PARTE_*`), com um usuário real:
- abrir porta com sub-sidebar: vai à primeira tela, o trilho compacta, o ativo fica marcado;
- navegar entre itens da mesma porta sem recriar o menu (o mesmo nó DOM continua);
- recolher pela alça e recarregar: continua recolhido;
- nicho `clinica` mostra "Pacientes"; `servicos` mostra "Contatos";
- papel `agent` não vê as portas de IA e Resultados que exigem `manager`;
- celular: gaveta, "‹ Voltar";
- Início: três blocos, estado vazio.

Specs do original: continuam verdes no clássico (seção 5).

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Tela nova do original sem porta no menu novo | teste de cobertura do mapa reprova o CI |
| Conflito de merge nos arquivos do original | lista curta (seção 8), trechos com comentário `Convexy` e instruções no `CONVEXY.md` |
| Servidor e cliente com textos diferentes (hidratação) | o nicho vem do servidor por prop, como a marca; teste de hidratação |
| Vocabulário trocar texto errado (ex.: "Contatos" num botão) | mapa só com textos exatos de título e menu; e2e de sanidade |
| Menu novo pior que o antigo em uso real | `MENU_CONVEXY = false` e publicar |

## 11. Versão e registro

Sai como `v1.48.0-cvx.N` (a primeira `-cvx` depois da `v1.48.0-cvx.1`), com seção no
`CHANGELOG.md` e em "Alterações em arquivos do original" do `CONVEXY.md`. A Release do GitHub
é criada depois do `publish-image` verde.
