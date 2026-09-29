import type { NavGroupId } from "@/lib/navigation/catalogo";
import type { NavDestination } from "@/lib/navigation/registry";
import {
  Buildings,
  CalendarBlank,
  ChatCircle,
  FlowArrow,
  Funnel,
  GearSix,
  House,
  Robot,
  Users,
} from "@/lib/ui/icons";
import {
  ROTULO_DA_MINHA_EMPRESA,
  ROTULO_DE_CONTATOS,
  ROTULO_DO_FUNIL,
  ROTULO_DOS_DADOS_DA_EMPRESA,
  ROTULO_DOS_TRATAMENTOS,
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

// Menu da clínica (29/09): Funil, Tarefas e Resultados deram lugar a CRM, Fluxos e
// Minha clínica. CONVEXY.md, "Menu da clínica".
export type PortaId =
  | "inicio"
  | "conversas"
  | "crm"
  | "agenda"
  | "contatos"
  | "ia"
  | "fluxos"
  | "clinica"
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

interface DefinicaoDeGrupo {
  readonly id: GrupoId;
  /** `null` no grupo principal de uma porta: ele não tem título. */
  readonly rotulo: Texto | null;
  /** "Acompanhar", "Avançado", "Mais", "Envios": uso diário nunca cai aqui. */
  readonly secundario: boolean;
  readonly hrefs: readonly string[];
}

interface DefinicaoDePorta {
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
    id: "crm",
    rotulo: TEXTOS.portas.crm,
    Icone: Funnel,
    rodape: false,
    grupos: [principal(["/app/kanban", "/app/tasks", "/app/prospecting", "/app/products"])],
  },
  {
    id: "agenda",
    rotulo: TEXTOS.portas.agenda,
    Icone: CalendarBlank,
    rodape: false,
    grupos: [principal(["/app/agenda", "/app/comandas"])],
  },
  {
    id: "contatos",
    rotulo: ROTULO_DE_CONTATOS,
    Icone: Users,
    rodape: false,
    grupos: [principal(["/app/contacts"])],
  },
  {
    id: "ia",
    rotulo: TEXTOS.portas.agentes,
    Icone: Robot,
    rodape: false,
    grupos: [
      principal(["/app/ai/agents", "/app/ai/knowledge/sources"]),
      {
        id: "acompanhar",
        rotulo: TEXTOS.grupos.acompanhar,
        secundario: true,
        hrefs: ["/app/ai/inbox", "/app/ai/cases", "/app/ai/proposals", "/app/ai/runs", "/app/ai/usage", "/app/ai/cases/avisos"],
      },
      {
        id: "avancado",
        rotulo: TEXTOS.grupos.avancado,
        secundario: true,
        hrefs: ["/app/ai/providers", "/app/ai/credentials", "/app/ai/memory", "/app/ai/skills"],
      },
    ],
  },
  {
    id: "fluxos",
    rotulo: TEXTOS.portas.fluxos,
    Icone: FlowArrow,
    rodape: false,
    grupos: [principal(["/app/ai/followups", "/app/ai/routers", "/app/ai/atendimento"])],
  },
  {
    // Tratamentos, especialistas e dados da clínica, num lugar próprio (29/09).
    id: "clinica",
    rotulo: ROTULO_DA_MINHA_EMPRESA,
    Icone: Buildings,
    rodape: false,
    grupos: [principal(["/app/settings/tenant/agenda", "/app/settings/tenant"])],
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
  /** `null`: fora do menu (a tela segue na busca ⌘K e no painel do Início). */
  readonly porta: PortaId | null;
  readonly principal: GrupoId;
  readonly secundario: GrupoId;
}

/** Tela sem posição explícita vai para a porta do `group` dela (spec 3.2). */
export const PADRAO_POR_GRUPO: Readonly<Record<NavGroupId, PosicaoPadrao>> = {
  atendimento: { porta: "conversas", principal: "principal", secundario: "envios" },
  crm: { porta: "crm", principal: "principal", secundario: "principal" },
  ia: { porta: "ia", principal: "principal", secundario: "avancado" },
  canais: { porta: "configuracoes", principal: "canais", secundario: "canais" },
  // O painel é o Início: telas de análise novas do original ficam fora do menu.
  analise: { porta: null, principal: "principal", secundario: "principal" },
  organizacao: { porta: "configuracoes", principal: "organizacao", secundario: "organizacao" },
};

/** Com o módulo ligado, cada página-hub do original vai à primeira tela visível desta porta (spec 3.4). */
export const PORTA_DO_HUB: Readonly<Partial<Record<NavGroupId, PortaId>>> = {
  crm: "crm",
  ia: "ia",
  analise: "inicio",
  organizacao: "configuracoes",
};

/** As orientações das extensões (antes no hub `/app/crm`) viram um grupo desta porta. */
export const PORTA_DAS_ORIENTACOES: PortaId = "crm";

/**
 * Telas de análise que saíram do menu (29/09): o Início é o painel e leva a elas;
 * a busca ⌘K e os links continuam abrindo. Quem acende é o Início (`DONOS_EXTRAS`).
 */
export const FORA_DO_MENU: readonly string[] = [
  "/app/metrics",
  "/app/ads/meta",
  "/app/activities",
  "/app/faturamento",
  "/app/ai/evolution",
  "/app/audit",
];

/** Páginas de detalhe fora da árvore do seu item, por prefixo (spec 3.3). */
export const DONOS_EXTRAS: ReadonlyArray<{ readonly prefixo: string; readonly dono: string }> = [
  { prefixo: "/app/leads", dono: "/app/kanban" },
  { prefixo: "/app/pipelines", dono: "/app/kanban" },
  // Redirecionamentos do original para Conexões.
  { prefixo: "/app/settings/canal-oficial", dono: "/app/connections" },
  { prefixo: "/app/settings/templates", dono: "/app/connections" },
  { prefixo: "/app/settings/tenant/whatsapp", dono: "/app/connections" },
  // O painel (Início) é dono das telas de análise fora do menu.
  ...FORA_DO_MENU.map((prefixo) => ({ prefixo, dono: HREF_DO_INICIO })),
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
  ["/app/settings/tenant/agenda", ROTULO_DOS_TRATAMENTOS],
  ["/app/settings/tenant", ROTULO_DOS_DADOS_DA_EMPRESA],
]);

const HREFS_EXPLICITOS: ReadonlySet<string> = new Set([
  ...PORTAS.flatMap((p) => p.grupos.flatMap((g) => g.hrefs)),
  ...FORA_DO_MENU,
]);

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

function posicaoPadrao(entrada: EntradaOrganizavel): { porta: PortaId | null; grupo: GrupoId } {
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
): Array<{ href: string; porta: PortaId | null; grupo: GrupoId }> {
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
    if (porta === null) continue;
    const destino = estrutura.find((p) => p.porta.id === porta)?.grupos.find((g) => g.grupo.id === grupo);
    if (!destino) throw new Error(`mapa inconsistente: a porta ${porta} não tem o grupo ${grupo}`);
    destino.itens.push(entrada);
  }
  return estrutura;
}
