import * as fs from "node:fs";
import * as path from "node:path";

import { test, expect, type Page } from "./helpers/test";

import { PALETA_DA_SPEC, type Tema } from "../unit/_convexy-tema";
import { lerCreds, loginComoAdmin } from "./helpers/login-admin";

/**
 * Convexy -cvx.3 — paleta, fontes e barra do navegador medidas NA TELA
 * (spec docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, 7.2.5).
 *
 * Por ferramenta, nunca a olho:
 * - tokens: um elemento-sonda recebe `background-color: var(--color-…)` e o
 *   `getComputedStyle` (em rgb) é comparado com a tabela da spec. O TEXTO das
 *   custom properties não serve: o minificador reescreve `#FFFFFF` em `#fff`;
 * - o seletor dobrado do `app/convexy/tema.css` tem de chegar à folha PUBLICADA,
 *   em nível de topo (fora de camada) — a cor certa sozinha não prova isso,
 *   porque a ordem de carga também poderia dar a vitória;
 * - fontes pelo PRIMEIRO nome da pilha (o `next/font` pode gerar
 *   `__Inter_<hash>`, e o Chrome põe aspas em nome com espaço);
 * - `/login` no modo "sistema" (nada salvo): o tema vem de
 *   `prefers-color-scheme`, pelo script anti-flash do layout;
 * - `/app/settings` trocando o tema pelo controle da tela, como a pessoa faz.
 *   Rota fixa: `/app` redireciona para uma inicial variável.
 * Um login só no arquivo. Registro: CONVEXY.md.
 */

const EVIDENCIA = path.join(process.cwd(), ".superpowers", "evidence", "convexy-cvx3");

const TEMAS = [
  { tema: "claro", dataTheme: "light" },
  { tema: "escuro", dataTheme: "dark" },
] as const satisfies ReadonlyArray<{ tema: Tema; dataTheme: "light" | "dark" }>;

const SELETORES_DOBRADOS = ['[data-theme="dark"][data-theme="dark"]', '[data-theme="light"][data-theme="light"]'];

function evidencia(nome: string): string {
  fs.mkdirSync(EVIDENCIA, { recursive: true });
  return path.join(EVIDENCIA, nome);
}

type Canais = { r: number; g: number; b: number; a: number };

function canais(cor: string): Canais {
  const limpa = cor.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(limpa);
  if (hex) {
    const n = Number.parseInt(hex[1] ?? "", 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const fn = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(limpa);
  if (!fn) throw new Error(`cor fora de #rrggbb/rgb()/rgba(): ${cor}`);
  return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), a: fn[4] === undefined ? 1 : Number(fn[4]) };
}

/** Mesmos canais; alfa com folga de 0,01 (o navegador guarda o alfa em 8 bits). */
function mesmaCor(medida: string, esperada: string): boolean {
  try {
    const m = canais(medida);
    const e = canais(esperada);
    return m.r === e.r && m.g === e.g && m.b === e.b && Math.abs(m.a - e.a) <= 0.01;
  } catch {
    return false;
  }
}

async function conferirTokens(page: Page, tema: Tema): Promise<void> {
  const esperado = PALETA_DA_SPEC[tema];
  const medido = await page.evaluate((tokens) => {
    const sonda = document.createElement("div");
    document.body.appendChild(sonda);
    const saida: Record<string, string> = {};
    for (const token of tokens) {
      sonda.style.backgroundColor = `var(${token})`;
      saida[token] = getComputedStyle(sonda).backgroundColor;
    }
    // Aliases do original que acompanham (spec 7.2.1): popover = cartão; borda do campo = borda.
    sonda.style.backgroundColor = "";
    sonda.className = "bg-popover border border-input";
    saida["bg-popover"] = getComputedStyle(sonda).backgroundColor;
    saida["border-input"] = getComputedStyle(sonda).borderTopColor;
    sonda.remove();
    return saida;
  }, Object.keys(esperado));

  const alvo: Record<string, string> = {
    ...esperado,
    "bg-popover": esperado["--color-surface"] ?? "",
    "border-input": esperado["--color-border"] ?? "",
  };
  const divergentes: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(alvo)) {
    const m = medido[chave] ?? "(ausente)";
    if (!mesmaCor(m, valor)) divergentes[chave] = `medido ${m}, esperado ${valor}`;
  }
  expect(divergentes, `tokens do tema ${tema} na tela`).toEqual({});
}

async function seletoresDobradosPublicados(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const achados: string[] = [];
    for (const folha of Array.from(document.styleSheets)) {
      let regras: CSSRuleList;
      try {
        regras = folha.cssRules;
      } catch {
        continue;
      }
      // Só regras de NÍVEL DE TOPO: dentro de um @layer elas perderiam para o original.
      for (const regra of Array.from(regras)) {
        if (
          regra instanceof CSSStyleRule &&
          /^\[data-theme="(light|dark)"\]\[data-theme="\1"\]$/.test(regra.selectorText)
        ) {
          achados.push(regra.selectorText);
        }
      }
    }
    return [...new Set(achados)].sort();
  });
}

function primeiraFamilia(pilha: string): string {
  return (pilha.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
}

async function conferirFontes(page: Page): Promise<void> {
  const f = await page.evaluate(async () => {
    await document.fonts.ready;
    const ff = (el: Element | null) => (el ? getComputedStyle(el).fontFamily : "(sem elemento)");
    const h1DaPagina = ff(document.querySelector("h1"));
    const h1Mono = document.createElement("h1");
    h1Mono.className = "font-mono";
    h1Mono.textContent = "#a1b2c3";
    const h2 = document.createElement("h2");
    h2.textContent = "Título de diálogo";
    const div = document.createElement("div");
    div.className = "font-semibold";
    div.textContent = "Título de cartão";
    document.body.append(h1Mono, h2, div);
    const saida = {
      body: ff(document.body),
      h1: h1DaPagina,
      h1Mono: ff(h1Mono),
      h2: ff(h2),
      div: ff(div),
      recursosDoBody: getComputedStyle(document.body).fontFeatureSettings,
      carregadas: [] as string[],
    };
    h1Mono.remove();
    h2.remove();
    div.remove();
    document.fonts.forEach((face) => {
      if (face.status === "loaded") saida.carregadas.push(face.family.replace(/["']/g, ""));
    });
    return saida;
  });

  expect(primeiraFamilia(f.body), `body: ${f.body}`).toMatch(/Inter/i);
  expect(primeiraFamilia(f.h1), `h1 da página: ${f.h1}`).toMatch(/Lexend/i);
  expect(primeiraFamilia(f.h2), `h2: ${f.h2}`).toMatch(/Lexend/i);
  expect(primeiraFamilia(f.h1Mono), `h1.font-mono (utilitário vence a camada base): ${f.h1Mono}`).toMatch(
    /Plex.?Mono/i,
  );
  expect(primeiraFamilia(f.div), `div (o CardTitle é div): ${f.div}`).toMatch(/Inter/i);
  expect(f.recursosDoBody, "o ss01 do original tem de estar anulado no body").toBe("normal");
  expect(f.carregadas.some((n) => /Inter/i.test(n)), `Inter carregada: ${f.carregadas.join(" | ")}`).toBe(true);
  expect(f.carregadas.some((n) => /Lexend/i.test(n)), `Lexend carregada: ${f.carregadas.join(" | ")}`).toBe(true);
}

async function temaDaPagina(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

/** Troca o tema CLICANDO no controle (claro → escuro → sistema → claro), com teto. */
async function escolherTemaPelaTela(page: Page, alvo: "light" | "dark"): Promise<void> {
  const botao = page.getByRole("button", { name: /^Tema:/ });
  await expect(botao, "o controle de tema não está na tela").toBeVisible({ timeout: 15_000 });
  for (let i = 0; i < 4; i++) {
    const antes = await temaDaPagina(page);
    if (antes === alvo) return;
    await botao.click();
    // Espera o `data-theme` MUDAR (o ThemeProvider aplica num efeito) — sem pausa fixa.
    // "sistema" com a mídia emulada em claro pode resolver no mesmo valor: aí o
    // poll estoura e o laço segue para o próximo clique.
    await expect
      .poll(() => temaDaPagina(page), { timeout: 3_000 })
      .not.toBe(antes)
      .catch(() => undefined);
  }
  throw new Error(`o controle de tema não chegou em "${alvo}" em 4 cliques (data-theme=${await temaDaPagina(page)})`);
}

test.describe("identidade da Convexy na tela (spec 7.2)", () => {
  for (const { tema, dataTheme } of TEMAS) {
    test(`/login no tema ${tema}, no modo sistema: tokens, seletor publicado e fontes`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: dataTheme });
      await page.goto("/login");
      await expect(page.locator("html")).toHaveAttribute("data-theme", dataTheme);
      await conferirTokens(page, tema);
      expect(await seletoresDobradosPublicados(page), "regras dobradas do tema.css na folha publicada").toEqual(
        SELETORES_DOBRADOS,
      );
      await conferirFontes(page);
      await page.screenshot({ path: evidencia(`login-${tema}.png`) });
    });
  }

  test("/login declara theme-color com os fundos da Convexy (spec 7.2.3)", async ({ page }) => {
    await page.goto("/login");
    const metas = await page
      .locator('meta[name="theme-color"]')
      .evaluateAll((els) =>
        els.map((e) => ({ media: e.getAttribute("media"), cor: (e.getAttribute("content") ?? "").toUpperCase() })),
      );
    expect(metas).toEqual([
      { media: "(prefers-color-scheme: light)", cor: "#F8FAFC" },
      { media: "(prefers-color-scheme: dark)", cor: "#0B0D10" },
    ]);
  });

  test("/app/settings nos dois temas, trocando pelo controle da tela", async ({ page }) => {
    // Um login só, mas ele pode esperar a próxima janela TOTP se a spec anterior
    // do mesmo worker acabou de logar (tests/e2e/helpers/login-admin.ts).
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme: "light" });
    await loginComoAdmin(page, lerCreds());
    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    for (const { tema, dataTheme } of TEMAS) {
      await escolherTemaPelaTela(page, dataTheme);
      await conferirTokens(page, tema);
      await conferirFontes(page);
      await page.screenshot({ path: evidencia(`app-settings-${tema}.png`) });
    }
  });
});
