"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Frescor do Início (spec 7): quando a aba volta a ficar VISÍVEL, a página pede
 * ao servidor os números de agora (`router.refresh()` re-renderiza o Server
 * Component e atualiza o "atualizado às"). `visibilitychange`, como o
 * `hooks/auth/InterfaceRefresh.tsx` do original — e não `focus`, que dispara a
 * cada clique de volta na janela e refaria as três consultas sem necessidade.
 */
export function RecarregarAoVoltar() {
  const router = useRouter();
  useEffect(() => {
    const aoMudar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", aoMudar);
    return () => document.removeEventListener("visibilitychange", aoMudar);
  }, [router]);
  return null;
}
