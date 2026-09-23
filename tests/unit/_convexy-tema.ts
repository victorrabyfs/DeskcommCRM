import fs from "node:fs";
import path from "node:path";

/**
 * Convexy -cvx.3: leitura do `app/convexy/tema.css` e dos blocos de tema do
 * `app/globals.css`, e a tabela da spec 7.2.1 — compartilhados por
 * `convexy-tema-cobre-os-tokens.test.ts`, `convexy-tema-contraste.test.ts` e
 * `tests/e2e/convexy-identidade.spec.ts`. Sem `.test`: o Vitest não coleta.
 * Registro: CONVEXY.md, "Paleta, fontes e barra do navegador".
 */

export const RAIZ = process.cwd();
export const CAMINHO_DO_TEMA = "app/convexy/tema.css";

export type Tema = "claro" | "escuro";

/**
 * Cores da tabela da spec 7.2.1 (docs/superpowers/specs/2026-09-22-identidade-convexy-design.md).
 * As sombras do claro não estão aqui: o teste as deriva do original (troca da tinta).
 */
export const PALETA_DA_SPEC: Readonly<Record<Tema, Readonly<Record<string, string>>>> = {
  claro: {
    "--color-bg": "#F8FAFC",
    "--color-surface": "#FFFFFF",
    "--color-surface-elevated": "#F1F5F9",
    "--color-overlay": "rgba(11, 13, 16, 0.42)",
    "--color-text": "#0B0D10",
    "--color-text-muted": "#475569",
    "--color-text-subtle": "#64748B",
    "--color-border": "#E2E8F0",
    "--color-border-strong": "#CBD5E1",
    "--color-neutral-50": "#F8FAFC",
    "--color-neutral-100": "#F1F5F9",
    "--color-neutral-200": "#E2E8F0",
    "--color-neutral-300": "#CBD5E1",
    "--color-neutral-400": "#94A3B8",
    "--color-neutral-500": "#64748B",
    "--color-neutral-600": "#475569",
    "--color-neutral-700": "#334155",
    "--color-neutral-800": "#1E293B",
    "--color-neutral-900": "#0F172A",
    "--color-neutral-950": "#0B0D10",
  },
  escuro: {
    "--color-bg": "#0B0D10",
    "--color-surface": "#131923",
    "--color-surface-elevated": "#171E2A",
    "--color-overlay": "rgba(0, 0, 0, 0.60)",
    "--color-text": "#F8FAFC",
    "--color-text-muted": "#94A3B8",
    "--color-text-subtle": "#64748B",
    "--color-border": "#1E293B",
    "--color-border-strong": "#334155",
    "--color-neutral-50": "#F8FAFC",
    "--color-neutral-100": "#E2E8F0",
    "--color-neutral-200": "#CBD5E1",
    "--color-neutral-300": "#94A3B8",
    "--color-neutral-400": "#64748B",
    "--color-neutral-500": "#334155",
    "--color-neutral-600": "#1E293B",
    "--color-neutral-700": "#171E2A",
    "--color-neutral-800": "#131923",
    "--color-neutral-900": "#0B0D10",
    "--color-neutral-950": "#06080A",
  },
};

const SELETOR_DO_TEMA: Readonly<Record<Tema, string>> = {
  claro: '[data-theme="light"][data-theme="light"]',
  escuro: '[data-theme="dark"][data-theme="dark"]',
};

const SELETOR_DO_ORIGINAL: Readonly<Record<Tema, string>> = {
  claro: '[data-theme="light"]',
  escuro: '[data-theme="dark"]',
};

export function semComentarios(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Declarações `--x: valor;` do bloco cujo seletor abre a linha na COLUNA 0.
 * A âncora de coluna é o que separa os blocos de token do `globals.css` dos
 * `[data-theme="dark"] {` indentados dentro do `@layer base` (`color-scheme`).
 * Valor com espaços normalizados.
 */
export function declaracoesDoBloco(css: string, seletor: string): Map<string, string> {
  const limpo = semComentarios(css);
  const abre = new RegExp(`^${escapar(seletor)}\\s*\\{`, "m").exec(limpo);
  if (!abre) throw new Error(`bloco \`${seletor}\` não achado`);
  const inicio = abre.index + abre[0].length;
  const fim = limpo.indexOf("}", inicio);
  if (fim < 0) throw new Error(`bloco \`${seletor}\` sem fechamento`);
  const saida = new Map<string, string>();
  for (const m of limpo.slice(inicio, fim).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    saida.set(m[1] ?? "", (m[2] ?? "").replace(/\s+/g, " ").trim());
  }
  return saida;
}

/** Fim do bloco que começa logo depois de uma `{` em `inicio` (conta chaves). */
function fechamento(css: string, inicio: number): number {
  let profundidade = 1;
  let j = inicio;
  while (j < css.length && profundidade > 0) {
    const c = css.charAt(j);
    if (c === "{") profundidade++;
    else if (c === "}") profundidade--;
    j++;
  }
  return j;
}

/** O CSS sem os blocos `@layer … { … }` (a declaração `@layer a, b;` fica). */
export function foraDeCamada(css: string): string {
  const limpo = semComentarios(css);
  let saida = "";
  let i = 0;
  while (i < limpo.length) {
    const abre = /@layer[^;{]*\{/y;
    abre.lastIndex = i;
    if (abre.test(limpo)) {
      i = fechamento(limpo, abre.lastIndex);
    } else {
      saida += limpo.charAt(i);
      i++;
    }
  }
  return saida;
}

/** O corpo do bloco `@layer <nome> { … }`, ou `null` se não houver. */
export function dentroDaCamada(css: string, nome: string): string | null {
  const limpo = semComentarios(css);
  const abre = new RegExp(`@layer\\s+${escapar(nome)}\\s*\\{`).exec(limpo);
  if (!abre) return null;
  const inicio = abre.index + abre[0].length;
  return limpo.slice(inicio, fechamento(limpo, inicio) - 1);
}

export function lerTemaConvexy(): Record<Tema, Map<string, string>> {
  const css = fs.readFileSync(path.join(RAIZ, CAMINHO_DO_TEMA), "utf8");
  return {
    claro: declaracoesDoBloco(css, SELETOR_DO_TEMA.claro),
    escuro: declaracoesDoBloco(css, SELETOR_DO_TEMA.escuro),
  };
}

export function lerBlocosDoGlobals(): Record<Tema, Map<string, string>> {
  const css = fs.readFileSync(path.join(RAIZ, "app/globals.css"), "utf8");
  return {
    claro: declaracoesDoBloco(css, SELETOR_DO_ORIGINAL.claro),
    escuro: declaracoesDoBloco(css, SELETOR_DO_ORIGINAL.escuro),
  };
}
