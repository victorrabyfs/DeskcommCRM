"use client";
import { useMemo } from "react";

import { useConvexy } from "@/lib/convexy/contexto";
import type { Nicho } from "@/lib/convexy/nicho";
import { ROTULO_DO_FUNIL, TEXTOS, rotuloPorNicho, type RotuloPorNicho } from "@/lib/convexy/textos";
import { useIdioma, useT as useTDoIdioma } from "@/lib/i18n/IdiomaProvider";
import type { Idioma } from "@/lib/i18n/idiomas";

/**
 * O VOCABULÁRIO POR NICHO dos títulos (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.3).
 *
 * Só TEXTOS EXATOS, e só estes quatro: "Contatos", "Agentes", "Meta Ads" e
 * "Audit Log" ficam de fora porque aparecem como cabeçalho de coluna, em outros
 * sentidos ou no /admin. Títulos desenhados no servidor com `traduzir()` direto
 * não passam por aqui (desvio aceito, 6.4 — medido no CONVEXY.md). Nunca aplicar
 * em `lib/agent-engine`, `lib/notifications` ou `workers`.
 */
const TITULOS: ReadonlyMap<string, RotuloPorNicho> = new Map<string, RotuloPorNicho>([
  ["Inbox", TEXTOS.portas.conversas],
  ["Radar de risco", TEXTOS.itens.semResposta],
  ["Funis", ROTULO_DO_FUNIL],
  ["Central de avisos", TEXTOS.itens.pedidosDaIa],
]);

function tituloDoNicho(texto: string, nicho: Nicho, idioma: Idioma): string | null {
  const rotulo = TITULOS.get(texto);
  return rotulo ? rotuloPorNicho(rotulo, nicho, idioma) : null;
}

/**
 * O `useT` que `@/hooks/i18n/useT` exporta. Sem provider, ou com o módulo
 * desligado, devolve a própria função do provider de idioma; ligado, troca os
 * títulos da lista e delega o resto a ela.
 */
export function useT(): (texto: string) => string {
  const t = useTDoIdioma();
  const idioma = useIdioma();
  const convexy = useConvexy();
  const menuLigado = convexy?.menuLigado === true;
  const nicho = convexy?.nicho;
  return useMemo(() => {
    if (!menuLigado || !nicho) return t;
    return (texto: string) => tituloDoNicho(texto, nicho, idioma) ?? t(texto);
  }, [menuLigado, nicho, idioma, t]);
}
