import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Convexy — a conversa selecionada da Caixa de entrada no modo escuro (CONVEXY.md,
 * "Conversa selecionada"). O fundo usava `bg-accent-50`, e o bloco escuro do
 * `globals.css` mantém a escala do acento igual à do claro: o item ficava quase
 * branco sob o texto claro do tema escuro. A regra: o fundo do selecionado usa um
 * token que o tema escuro REDEFINE com valor diferente do claro.
 */
const RAIZ = process.cwd();
const ITEM = readFileSync(join(RAIZ, "components/inbox/ConversationListItem.tsx"), "utf8");
const CSS = readFileSync(join(RAIZ, "app/globals.css"), "utf8");

function bloco(seletor: string): string {
  const inicio = CSS.indexOf(`${seletor} {`);
  if (inicio === -1) throw new Error(`bloco ${seletor} não encontrado no globals.css`);
  return CSS.slice(inicio, CSS.indexOf("\n}", inicio));
}

function valor(blocoCss: string, token: string): string | null {
  const m = blocoCss.match(new RegExp(`--color-${token}:\\s*([^;]+);`));
  return m ? m[1]!.trim() : null;
}

describe("conversa selecionada no modo escuro", () => {
  const linha = ITEM.split("\n").find((l) => /isSelected && "bg-/.test(l));
  const token = linha?.match(/bg-([a-z0-9-]+)/)?.[1];

  it("o item tem um fundo próprio de selecionado (guarda de vacuidade)", () => {
    expect(token, "a linha `isSelected && \"bg-…\"` sumiu do ConversationListItem").toBeDefined();
  });

  it("o fundo usa um token que o tema escuro redefine com outro valor", () => {
    const claro = valor(bloco(":root"), token!);
    const escuro = valor(bloco('[data-theme="dark"]'), token!);
    expect(escuro, `--color-${token} não é redefinido no tema escuro`).not.toBeNull();
    expect(escuro, `--color-${token} tem o mesmo valor nos dois temas`).not.toBe(claro);
  });
});
