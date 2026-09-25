"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Nicho } from "@/lib/convexy/nicho";

/**
 * O CONTEXTO DA CONVEXY — por pedido, nunca global (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.3 e 12).
 *
 * O `app/app/layout.tsx` o alimenta com o que já lê: o módulo `menu_convexy`
 * (`modulos_ligados`) e o nicho da organização ativa. Separado do `AuthProvider`
 * de propósito: dezenas de testes fazem `vi.mock` daquele módulo, e o `useT`
 * (que lê este contexto) é usado em ~440 arquivos. Fora do app (admin, telas
 * públicas, onboarding) não há provider e `useConvexy()` devolve `null`: menu
 * clássico, vocabulário do original. Mora em `lib/` para `lib/` nunca importar
 * `components/`.
 */
export interface ValorDaConvexy {
  readonly menuLigado: boolean;
  readonly nicho: Nicho;
}

const Contexto = createContext<ValorDaConvexy | null>(null);

export function ConvexyProvider({ menuLigado, nicho, children }: ValorDaConvexy & { children: ReactNode }) {
  const valor = useMemo(() => ({ menuLigado, nicho }), [menuLigado, nicho]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useConvexy(): ValorDaConvexy | null {
  return useContext(Contexto);
}
