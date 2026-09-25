"use client";
/**
 * Reexporta o `useT` do provider de idioma.
 *
 * O caminho `@/hooks/i18n/useT` é o que as telas importam; a implementação mora
 * em `lib/i18n/IdiomaProvider`, junto do contexto que ela lê. Separar o hook do
 * seu contexto faria os dois divergirem no dia em que alguém mudasse um.
 *
 * Convexy: reexporta o `useT` da Convexy (`lib/convexy/vocabulario.ts`), que é o
 * do provider de idioma fora do app ou com o menu da Convexy desligado, e troca
 * só quatro títulos exatos com ele ligado. CONVEXY.md, "Menu novo".
 */
export { useT } from "@/lib/convexy/vocabulario";
