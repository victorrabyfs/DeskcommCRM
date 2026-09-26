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
interface TextoConvexy {
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
