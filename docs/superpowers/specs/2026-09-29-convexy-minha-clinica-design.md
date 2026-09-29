# Minha clínica: dados da clínica, tratamentos e especialistas — desenho

**Status:** revisão 1 · **Data:** 2026-09-29 · **Versão:** `v1.59.0-cvx.9` · **Migration:** 9008

## 1. Objetivo
A clínica cadastra, num lugar só (porta **Minha clínica** do menu da Convexy, `lib/convexy/menu/mapa.ts`, porta `clinica`), tudo o que o agente de IA precisa para responder e agendar sem inventar:
- **Dados da clínica:** identificação, contato, unidades, horário de funcionamento, atendimento.
- **Tratamentos:** os tipos de agendamento que já existem (`calendar_event_types`: duração, `default_price_cents`, preparo/descrição), com os especialistas que fazem cada um.
- **Especialistas:** profissionais que **não usam a plataforma**. Cada um tem a própria agenda — a da plataforma, sincronizada com o Google Agenda dele (depois Clinicorp e outros). O agente escolhe o especialista livre para o tratamento e marca direto na agenda dele.

Critérios: (1) especialista cadastrado sem e-mail de acesso, nunca entra na plataforma, nunca recebe conversa para atender; (2) o agente, perguntado "quanto custa uma limpeza e quem faz?", responde com preço e nomes cadastrados; perguntado "tem horário quinta?", oferece horários de quem faz aquele tratamento; (3) o compromisso marcado pelo agente aparece na agenda da plataforma e no Google do especialista; (4) nada muda para quem não cadastrar especialista.

## 2. Modelo: especialista é um membro SEM ACESSO
Hoje toda a agenda gira em torno de um `user_id` com login: disponibilidade (`attendant_availability` por user, `calendar_availability_exceptions` por user), ocupação (`calendar_appointments.owner_user_id`, `fn_agenda_ocupacao_google_do_dono` por p_owner), marcar (`app/api/v1/agenda/agendamentos/_handler.ts:317` resolve `input.owner_user_id ?? tipo.default_owner_user_id`), Google (`calendar_connections.user_id NOT NULL`; push para o calendário `is_destination` da conexão do dono via `fn_google_appointment`; `tokenForConnection` e `apenasDeMembrosAtivos` exigem membro ativo; `fn_google_selection` só aceita o próprio ator). Função central de horários: `horariosLivresDaOrg(supabase, organizationId, params)` em `lib/agenda/consulta.ts:182` (aceita `ownerUserId`). Ferramentas da IA em `lib/mcp/tools/agendamento.ts` (`crm_list_event_types` :104 não devolve preço nem dono; `crm_find_free_slots` :284, `crm_book_appointment` :595, `crm_find_and_book_appointment` :764 aceitam `owner_user_id?`; `crm_list_team_members` em `operacao.ts:489`).

Escolhido: **o especialista é um membro da organização sem acesso** — usuário do Auth criado pelo servidor (`auth.admin.createUser`), **banido** (`ban_duration` longo), sem senha, e-mail interno inalcançável `especialista+<uuid>@especialistas.invalid` (RFC 2606), `user_metadata.especialista=true`, `full_name`; vínculo em `user_organizations` com papel `viewer` e coluna nova `user_organizations.especialista jsonb` (nula = pessoa comum): `{ especialidade, registro (CRO/CRM), bio, foto_path, ativo }`. Assim jornada, exceções, ocupação, marcar, remarcar, lembretes e Google (inclusive escrever o evento na agenda dele) funcionam SEM mudar o motor da agenda.

2.1 Onde ele NÃO aparece (filtro `especialista is null`, cada ponto com teste): elegíveis da distribuição de conversas (`lib/routing/eligibles.ts`) e responsável de conversa; tela Equipe (lista, contagem, convites, papéis); seletores de pessoa fora da agenda (responsável de tarefa, dono de card, menções, filtros por atendente); `crm_list_team_members`; e-mails/notificações a membros (filtro explícito de `.invalid`). Onde aparece: agenda (filtro por especialista), "Quem faz" dos tratamentos, ferramentas de agenda da IA, página Minha clínica › Especialistas. Excluir = desativar (`ativo=false`); histórico preservado. Cinto: `requireAuth`/login recusam vínculo de especialista além do ban.

2.2 Google do especialista sem ele entrar: em Minha clínica › Especialistas › [nome] › "Conectar Google Agenda", o gerente escolhe **conectar agora** (a conta Google aberta no navegador dele) ou **enviar link ao especialista** (válido 72 h, uso único). O link abre uma página pública curta que leva ao consentimento do Google; o `state` assinado carrega o `user_id` do especialista — o callback atual já grava a conexão pelo `user_id` do state; só a EMISSÃO do state muda (rota nova, manager+, alvo = especialista da própria organização). Calendário de destino e "conta como ocupado": o principal, automaticamente; editável pelo gerente (variante da seleção que aceita manager+ sobre especialista).

2.3 Tratamentos × especialistas: tabela `calendar_event_type_especialistas (organization_id, event_type_id, user_id, ordem)`, N:N, RLS por organização, único `(event_type_id, user_id)`. `default_owner_user_id` continua; quando o tipo tem especialistas, a lista manda e o dono padrão vira o primeiro dela. Busca de horários para o tratamento: para cada especialista do tipo, `horariosLivresDaOrg` com `ownerUserId` = especialista; junta e diz de quem é cada horário. Sem especialista escolhido pelo paciente, oferece os mais próximos de qualquer um e marca com quem estiver livre.

## 3. Dados da clínica
Tabela `clinica_dados` (1 por organização, `organization_id` PK/FK cascade, RLS por organização, escrita manager+): identificação (responsável técnico nome/conselho/número; especialidades text[]; nome fantasia/razão social/CNPJ já existem em organizations), contato (telefone, WhatsApp, e-mail, site, Instagram), unidades (reaproveita `calendar_locations` + colunas novas: nome da unidade, complemento, ponto de referência, link do mapa, estacionamento, acessibilidade), funcionamento (horário por dia da semana com várias faixas; fechamentos/feriados com data e motivo), atendimento (convênios aceitos ou só particular, formas de pagamento, parcelamento até N×, preço da avaliação, política de cancelamento/remarcação com antecedência em horas + texto, tolerância de atraso em minutos), observações para o agente. O horário de funcionamento LIMITA a jornada de cada especialista e é o que o agente diz quando perguntam "vocês abrem sábado?".

## 4. Ferramentas do agente
Nova `crm_get_clinic_info` (dados, unidades, funcionamento, fechamentos próximos, convênios, pagamento, políticas); nova `crm_list_specialists` (nome, especialidade, registro, bio curta, tratamentos); `crm_list_event_types` passa a devolver `preco` (moeda da organização) e `especialistas`; `crm_find_free_slots` / `crm_find_and_book_appointment` / `crm_book_appointment` ganham `especialista_id?` (alias de `owner_user_id`, validado como especialista ativo que faz o tratamento); sem ele, buscam entre os especialistas do tratamento e devolvem `especialista` em cada horário. Extensão da Convexy registrando as ferramentas novas + ajuste pontual nas três de agenda; cada ferramenta nova precisa entrar em TODOS os catálogos/listas que o repo cobra (procure os testes que varrem `VALID_TOOL_IDS` / catálogo MCP e siga-os).

## 5. Telas (porta Minha clínica)
Dados da clínica (a tela `/app/settings/tenant` ganha seções da §3, ou uma tela Convexy nova ligada à porta — escolha a de menor atrito com o original); Tratamentos (`/app/settings/tenant/agenda`: "Quem faz" vira multi-seleção de especialistas, preço à vista); **Especialistas** (nova; entra no catálogo `lib/navigation/catalogo.ts`/mapa da porta `clinica`, com porta de navegação — DoD 14): lista com foto, especialidade, tratamentos, estado da agenda (Google conectado / só plataforma / conexão caída); página do especialista com dados, jornada semanal (limitada pelo funcionamento), exceções (férias), tratamentos e Google. Agenda: filtro por especialista.

## 6. Fora do escopo
Clinicorp e outros sistemas; especialista ver a própria agenda por link; comissão; salas como recurso.

## 7. Riscos
Especialista vazar para distribuição/equipe/e-mail → filtro por ponto com teste; conta banida entrar → ban + recusa no requireAuth; merge do original mexer na agenda → motor intocado, só bordas com `Convexy:`; link do Google vazado → uso único, 72 h, escopo daquele especialista.

## 8. Desvios durante a construção

(Preenchida durante a construção.)
