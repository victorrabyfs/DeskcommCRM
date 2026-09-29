/**
 * Convexy — as ferramentas da IA de "Minha clínica" (migration 9008; spec
 * docs/superpowers/specs/2026-09-29-convexy-minha-clinica-design.md, §4;
 * CONVEXY.md, "Minha clínica").
 *
 * `crm_get_clinic_info` responde "onde fica?", "abre sábado?", "aceita
 * convênio?", "parcela?" com o que a clínica cadastrou. `crm_list_specialists`
 * responde "quem faz?" e dá o `id` que as ferramentas de agenda recebem como
 * `especialista_id`.
 *
 * As duas SEM INPUT, pelo mesmo motivo de `crm_list_event_types`: um filtro só
 * criaria como errar (o paciente diz "dentista de canal", o cadastro diz
 * "Endodontia"). A organização vem do contexto do agente, nunca de argumento.
 * Recusa de leitura volta como RESPOSTA, nunca exceção (`repo-mcp.md` §7.5).
 */
import { lerDadosDaClinicaDaOrg, moedaDaOrg, precoEmTexto } from "@/lib/convexy/clinica/dados";
import { listarEspecialistas } from "@/lib/convexy/clinica/especialistas";
import { funcionamentoEmTexto } from "@/lib/convexy/clinica/funcionamento";
import type { McpToolDefinition } from "@/lib/mcp/types";

const NAO_INVENTE =
  "Não consegui ler os dados da clínica agora. Não invente endereço, horário nem preço — avise que alguém da equipe confirma.";

const semInput = {};

export const crmGetClinicInfo: McpToolDefinition<typeof semInput> = {
  name: "crm_get_clinic_info",
  description:
    "Devolve os dados que a clínica cadastrou: contato, unidades (endereço, referência, estacionamento), " +
    "horário de funcionamento por dia da semana, fechamentos próximos (feriados, recesso), convênios, " +
    "formas de pagamento, parcelamento, valor da avaliação e as políticas de cancelamento e atraso. " +
    "CHAME quando a pessoa perguntar onde fica, que horas abre, se aceita convênio ou como pode pagar. " +
    "Campo null ou lista vazia = a clínica não informou: NÃO invente, diga que alguém da equipe confirma. " +
    "`observacoes_para_voce` são orientações da clínica para você, não texto para repetir ao paciente.",
  inputSchema: semInput,
  category: "read",
  requiresRole: "agent",
  requiresScope: "mcp:read",
  handler: async (_input, ctx) => {
    const leitura = await lerDadosDaClinicaDaOrg(ctx.supabase, ctx.organizationId).catch(() => null);
    if (!leitura || !leitura.ok) return { cadastrado: false, mensagem: NAO_INVENTE };
    if (!leitura.cadastrado) {
      return {
        cadastrado: false,
        mensagem:
          "A clínica ainda não cadastrou estes dados. Não invente — avise que alguém da equipe confirma.",
      };
    }
    const d = leitura.dados;
    const moeda = await moedaDaOrg(ctx.supabase, ctx.organizationId).catch(() => "BRL");
    const hoje = new Date().toISOString().slice(0, 10);
    return {
      cadastrado: true,
      contato: { telefone: d.telefone, whatsapp: d.whatsapp, email: d.email, site: d.site, instagram: d.instagram },
      responsavel_tecnico: d.responsavel_tecnico_nome
        ? {
            nome: d.responsavel_tecnico_nome,
            registro: [d.responsavel_tecnico_conselho, d.responsavel_tecnico_numero].filter(Boolean).join(" ") || null,
          }
        : null,
      especialidades: d.especialidades,
      unidades: d.unidades,
      funcionamento: funcionamentoEmTexto(d.funcionamento),
      fuso: d.funcionamento.timezone,
      fechamentos_proximos: d.fechamentos.filter((f) => f.data >= hoje).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 10),
      convenios: d.so_particular ? [] : d.convenios,
      so_particular: d.so_particular,
      formas_de_pagamento: d.formas_pagamento,
      parcelas_ate: d.parcelas_max,
      avaliacao:
        d.preco_avaliacao_cents === null
          ? null
          : d.preco_avaliacao_cents === 0
            ? { gratuita: true, texto: "gratuita" }
            : { gratuita: false, texto: precoEmTexto(d.preco_avaliacao_cents, moeda) },
      cancelamento: {
        antecedencia_horas: d.cancelamento_antecedencia_horas,
        politica: d.cancelamento_politica,
      },
      tolerancia_de_atraso_minutos: d.tolerancia_atraso_minutos,
      observacoes_para_voce: d.observacoes_agente,
    };
  },
};

export const crmListSpecialists: McpToolDefinition<typeof semInput> = {
  name: "crm_list_specialists",
  description:
    "Lista os profissionais da clínica que atendem pacientes: nome, especialidade, registro (CRO/CRM), " +
    "uma bio curta e os tratamentos que cada um faz (`slug` de `crm_list_event_types`). " +
    "Use o `id` como `especialista_id` em `crm_find_free_slots`, `crm_book_appointment` e " +
    "`crm_find_and_book_appointment` quando a pessoa escolher com quem quer ser atendida. " +
    "Esses profissionais NÃO respondem conversa — não prometa que eles vão escrever para a pessoa. " +
    "Lista vazia = a clínica não cadastrou profissionais: não invente nomes.",
  inputSchema: semInput,
  category: "read",
  requiresRole: "agent",
  requiresScope: "mcp:read",
  handler: async (_input, ctx) => {
    const leitura = await listarEspecialistas(ctx.supabase, ctx.organizationId).catch(() => null);
    if (!leitura || !leitura.ok) {
      return {
        especialistas: [],
        mensagem: "Não consegui ler a lista de profissionais agora. Não invente nomes — avise que alguém da equipe confirma.",
      };
    }
    return {
      especialistas: leitura.especialistas.map((e) => ({
        id: e.userId,
        nome: e.nome,
        especialidade: e.especialidade,
        registro: e.registro,
        bio: e.bio,
        tratamentos: e.tratamentos.filter((t) => t.ativo).map((t) => ({ slug: t.slug, nome: t.nome })),
      })),
    };
  },
};
