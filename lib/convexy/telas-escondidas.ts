import type { Nicho } from "@/lib/convexy/nicho";

/**
 * Convexy — as telas que saem do menu (roteiro da plataforma nova, item 1, de
 * 28/09/2026). CONVEXY.md, "Telas escondidas do menu".
 *
 * É APRESENTAÇÃO, como o resto da navegação: a porta some da barra lateral, do
 * menu da Convexy, dos hubs, do ⌘K e do editor de interface. A rota, a página e
 * o código continuam intactos — quem digitar o endereço abre a tela. Nada é
 * apagado para o merge com o original seguir simples.
 *
 * Quem aplica é `permitidos()` (`lib/navigation/interface.ts`), a lista de que
 * todas as projeções do menu partem.
 */

/** Módulos que a Convexy não usa em nenhuma organização. */
export const ESCONDIDAS_PARA_TODOS = [
  "/app/comandas",
  "/app/settings/tenant/financeiro",
  "/app/faturamento",
  "/app/products",
  "/app/integrations/nuvemshop",
  "/app/integracao-dados",
  "/app/extensions",
] as const;

/**
 * Só da empresa Convexy: voz e prospecção. Decidido pelo NICHO, que só o admin
 * da plataforma altera — e não pela interface da organização, que o admin da
 * clínica edita e poderia religar.
 */
export const ESCONDIDAS_NA_CLINICA = ["/app/calls", "/app/settings/voip-trunk", "/app/prospecting"] as const;

/** `nicho` ausente = não filtra pelo nicho (só as de todos saem). */
export function escondidaPelaConvexy(href: string, nicho?: Nicho | null): boolean {
  if ((ESCONDIDAS_PARA_TODOS as readonly string[]).includes(href)) return true;
  return nicho === "clinica" && (ESCONDIDAS_NA_CLINICA as readonly string[]).includes(href);
}
