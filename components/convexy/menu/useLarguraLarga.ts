"use client";
import { useSyncExternalStore } from "react";

/**
 * A tela está em `lg` (≥ 1024px)? Só para o `aria-expanded` da porta e para o
 * foco da sobreposição: o que se VÊ entre `md` e `lg` é decidido por CSS, para
 * o SSR acertar em qualquer largura. O servidor — e o jsdom, sem `matchMedia` —
 * respondem "larga"; o navegador corrige depois da hidratação, sem divergência.
 */
const CONSULTA = "(min-width: 1024px)";

function assinar(avisar: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const lista = window.matchMedia(CONSULTA);
  lista.addEventListener("change", avisar);
  return () => lista.removeEventListener("change", avisar);
}

function agora(): boolean {
  return typeof window.matchMedia !== "function" || window.matchMedia(CONSULTA).matches;
}

export function useLarguraLarga(): boolean {
  return useSyncExternalStore(assinar, agora, () => true);
}
