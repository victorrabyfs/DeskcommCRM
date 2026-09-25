import type { ModuloOpcional } from "@/lib/instalacao/modulos";

/**
 * O MÓDULO OPCIONAL da instalação que liga o menu da Convexy (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 5). Linha
 * `MODULO_MENU_CONVEXY` em `platform_config`; ligado e desligado em
 * `/admin/sistema`. Um lugar só para o nome: layout, página do tenant, editor de
 * interface, hubs e Início o leem daqui.
 */
export const MODULO_DO_MENU = "menu_convexy" as const satisfies ModuloOpcional;
