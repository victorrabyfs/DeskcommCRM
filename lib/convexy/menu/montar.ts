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
