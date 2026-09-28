import type { Metadata } from "next";

import { iconeDaAba } from "@/lib/branding/icone";
import { baseDoStorage, urlPublicaDoLogo } from "@/lib/branding/logo";

type IconesDaAba = NonNullable<Metadata["icons"]>;

/**
 * Convexy — o ícone da aba nos dois modos do sistema (CONVEXY.md, "Símbolo e
 * ícone da aba"; migration 9003).
 *
 * Sem ícone escuro, é exatamente o do original: `iconeDaAba(favicon_path)` — o
 * arquivo subido ou o desenhado por `app/icon.tsx`. Com ele, o `<head>` ganha os
 * dois `<link rel="icon">` com `media="(prefers-color-scheme: …)"`, e o navegador
 * escolhe pelo modo do sistema. O claro continua sendo o do original (inclusive
 * o desenhado, quando só o escuro foi subido). Nenhuma requisição de saída do
 * servidor: quem baixa é o navegador, do storage, pelo caminho validado no banco.
 */
export function iconesDaAba(
  linha: { readonly favicon_path?: string | null; readonly favicon_dark_path?: string | null } | null,
  base: string = baseDoStorage(),
): IconesDaAba {
  const claro = iconeDaAba(linha?.favicon_path, base);
  const escuro = (linha?.favicon_dark_path ?? "").trim();
  if (escuro.length === 0 || base.length === 0) return { icon: claro };
  return {
    icon: [
      { url: claro, media: "(prefers-color-scheme: light)" },
      { url: urlPublicaDoLogo(escuro, base), media: "(prefers-color-scheme: dark)" },
    ],
  };
}
