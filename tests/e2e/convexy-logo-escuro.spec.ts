import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

import { test, expect, type Locator, type Page } from "@playwright/test";

import { lerCreds, loginComoDono } from "./helpers/login-admin";

/**
 * Convexy — o logo da instalação para o TEMA ESCURO, medido NA TELA (spec
 * docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, 7.3.6).
 *
 * Com os dois logos enviados por `/admin/marca`, o claro aparece só no tema
 * claro e o escuro só no escuro, SEM moldura branca no escuro — na barra
 * lateral e na tela de entrada. Por ferramenta: `toBeVisible`/`toBeHidden` e
 * `getComputedStyle` da cadeia de ancestrais, nunca a olho.
 *
 * O banco do e2e é compartilhado pelas specs da mesma parte: o caso monta a
 * precondição (sem logo nenhum) e o `finally` remove os dois logos com a mesma
 * página já logada — é ele que limpa `logo_dark_path` mesmo quando uma asserção
 * estoura (a moldura do logo claro é medida por
 * tests/e2e/logo-moldura-no-tema-escuro.spec.ts). UM login só: um segundo login
 * no mesmo arquivo cairia na espera da janela TOTP. A fachada é medida em
 * contextos novos, sem sessão, dentro do mesmo caso. Registro: CONVEXY.md,
 * "Logo escuro".
 */

// Um caso longo (uploads, duas trocas de tema, dois contextos da fachada e a
// limpeza): o teto padrão não cabe.
test.describe.configure({ timeout: 180_000 });

const EVIDENCIA = path.join(process.cwd(), ".superpowers", "evidence", "convexy-logo-escuro");

// `/admin/marca` é do DONO DO SERVIDOR: o seed o promove (idempotente) — o mesmo
// passo de logo-moldura-no-tema-escuro.spec.ts.
let creds = lerCreds();
execFileSync("npx", ["tsx", "scripts/seed-e2e-system-update.ts"], { stdio: "inherit" });

type Chave = "instalacao" | "instalacao-escuro";

// ── PNG de verdade, montado byte a byte (mesma construção de marca-logo.spec.ts) ──

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(tipo: string, dados: Buffer): Buffer {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "latin1"), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

function pngSolido(lado: number, cor: [number, number, number]): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const linhas: Buffer[] = [];
  for (let y = 0; y < lado; y++) {
    const linha = Buffer.alloc(1 + lado * 3);
    for (let x = 0; x < lado; x++) {
      linha[1 + x * 3] = cor[0];
      linha[2 + x * 3] = cor[1];
      linha[3 + x * 3] = cor[2];
    }
    linhas.push(linha);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(linhas))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Azul-marinho: arte pensada para fundo claro. */
const PNG_CLARO = pngSolido(64, [16, 24, 64]);
/** Quase branco: arte pensada para fundo escuro. */
const PNG_ESCURO = pngSolido(64, [240, 244, 250]);

// ── Medição ─────────────────────────────────────────────────────────────────

function canais(cor: string): { r: number; g: number; b: number; a: number } | null {
  const m = cor.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/);
  if (!m) return null;
  return { r: +m[1]!, g: +m[2]!, b: +m[3]!, a: m[4] === undefined ? 1 : +m[4]! };
}

/** Fundo claro medido: opaco e com os três canais ≥ 200 (a moldura é `bg-white`). */
function fundoEClaro(cor: string): boolean {
  const c = canais(cor);
  if (!c || c.a < 0.9) return false;
  return c.r >= 200 && c.g >= 200 && c.b >= 200;
}

function fundoETransparente(cor: string): boolean {
  const c = canais(cor);
  return c !== null && c.a === 0;
}

/** O fundo de cada ancestral do logo, até (sem incluir) a tag de parada. */
async function fundosAte(logo: Locator, parada: "aside" | "body"): Promise<string[]> {
  return logo.evaluate((el, alvo) => {
    const fundos: string[] = [];
    let no = el.parentElement;
    while (no && no.tagName.toLowerCase() !== alvo) {
      fundos.push(getComputedStyle(no).backgroundColor);
      no = no.parentElement;
    }
    return fundos;
  }, parada);
}

function evidencia(nome: string): string {
  fs.mkdirSync(EVIDENCIA, { recursive: true });
  return path.join(EVIDENCIA, nome);
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
    await expect
      .poll(() => temaDaPagina(page), { timeout: 3_000 })
      .not.toBe(antes)
      .catch(() => undefined);
  }
  // O 4º clique pode ter chegado ao alvo: conferir antes de acusar.
  if ((await temaDaPagina(page)) === alvo) return;
  throw new Error(`o controle de tema não chegou em "${alvo}" em 4 cliques (data-theme=${await temaDaPagina(page)})`);
}

async function campoHidratado(page: Page, chave: Chave): Promise<Locator> {
  await expect(
    page.locator(`[data-campo-de-logo='${chave}'][data-hidratado]`),
    `o campo "${chave}" não hidratou`,
  ).toBeVisible({ timeout: 15_000 });
  return page.locator(`[data-campo-de-logo='${chave}']`);
}

/** Sobe um PNG pelo campo e devolve a `logo_url` que a rota gravou. */
async function subir(page: Page, chave: Chave, bytes: Buffer, nome: string): Promise<string> {
  const campo = await campoHidratado(page, chave);
  const resposta = page.waitForResponse(
    (r) => r.url().includes("/api/v1/marca/logo") && r.request().method() === "POST",
    { timeout: 20_000 },
  );
  await page.locator(`#logo-${chave}`).setInputFiles({ name: nome, mimeType: "image/png", buffer: bytes });
  const r = await resposta;
  expect(r.status(), await r.text()).toBe(200);
  const corpo = (await r.json()) as { data?: { logo_url?: string | null } };
  const url = corpo.data?.logo_url ?? "";
  expect(url, "a rota não devolveu logo_url do bucket").toMatch(/\/brand-logos\/platform\//);
  await expect(campo.getByRole("button", { name: /^remover$/i })).toBeVisible({ timeout: 15_000 });
  return url;
}

async function removerSeHouver(page: Page, chave: Chave): Promise<void> {
  await page.goto("/admin/marca");
  const campo = await campoHidratado(page, chave);
  const remover = campo.getByRole("button", { name: /^remover$/i });
  if ((await remover.count()) === 0) return;
  const resposta = page.waitForResponse(
    (r) => r.url().includes("/api/v1/marca/logo") && r.request().method() === "DELETE",
    { timeout: 20_000 },
  );
  await remover.click();
  expect((await resposta).status()).toBe(200);
  await expect(remover).toHaveCount(0, { timeout: 15_000 });
}

test.describe("o logo do tema escuro (spec 7.3)", () => {
  test("/admin/marca grava os dois logos; a barra lateral e a tela de entrada trocam o claro pelo escuro no tema escuro, sem moldura", async ({
    page,
    browser,
  }) => {
    creds = await loginComoDono(page, creds);
    try {
      await removerSeHouver(page, "instalacao-escuro");
      await removerSeHouver(page, "instalacao");

      // Um envio por carga da página: o `router.refresh()` do primeiro envio não
      // corre contra o segundo, e o que se confere depois é o que o SERVIDOR leu.
      await page.goto("/admin/marca");
      const urlClaro = await subir(page, "instalacao", PNG_CLARO, "logo-claro.png");
      await page.goto("/admin/marca");
      const urlEscuro = await subir(page, "instalacao-escuro", PNG_ESCURO, "logo-escuro.png");
      await page.goto("/admin/marca");
      expect(urlEscuro).not.toBe(urlClaro);
      // Colunas independentes, lidas do servidor: gravar o escuro não trocou o claro.
      await expect(page.locator("[data-previa-do-logo='claro'] img")).toHaveAttribute("src", urlClaro);
      await expect(page.locator("[data-previa-do-logo-escuro] img")).toHaveAttribute("src", urlEscuro);
      await page.screenshot({ path: evidencia("admin-marca.png"), fullPage: true });

      // ── Barra lateral ──────────────────────────────────────────────────────
      await page.goto("/app/inbox");
      const claro = page.locator(`aside img[src="${urlClaro}"]`).first();
      const escuro = page.locator(`aside img[src="${urlEscuro}"]`).first();

      await escolherTemaPelaTela(page, "light");
      await expect(claro, "tema claro sem o logo claro").toBeVisible({ timeout: 15_000 });
      await expect(escuro, "o logo escuro apareceu no tema claro").toBeHidden();
      const fundoDaMoldura = await claro.evaluate((el) => getComputedStyle(el.parentElement as HTMLElement).backgroundColor);
      expect(fundoETransparente(fundoDaMoldura), `no claro a moldura pintou fundo (${fundoDaMoldura})`).toBe(true);
      await page.screenshot({ path: evidencia("barra-claro.png") });

      await escolherTemaPelaTela(page, "dark");
      await expect(escuro, "tema escuro sem o logo escuro").toBeVisible({ timeout: 15_000 });
      await expect(claro, "o logo claro (e a moldura) continuou no tema escuro").toBeHidden();
      const fundos = await fundosAte(escuro, "aside");
      expect(fundos.filter(fundoEClaro), `moldura branca no escuro: ${JSON.stringify(fundos)}`).toEqual([]);
      await page.screenshot({ path: evidencia("barra-escuro.png") });

      // ── Tela de entrada, sem sessão (contexto novo, sem login) ───────────────
      for (const tema of ["light", "dark"] as const) {
        const contexto = await browser.newContext();
        try {
          const pagina = await contexto.newPage();
          // A fachada não tem controle de tema: o estado é semeado antes do primeiro
          // byte, como no navegador de quem escolheu o tema e saiu da conta.
          await pagina.addInitScript((t) => window.localStorage.setItem("deskcomm-theme", t), tema);
          await pagina.goto("/login");
          expect(await temaDaPagina(pagina), `a fachada não ficou em ${tema}`).toBe(tema);

          const claroNaEntrada = pagina.getByTestId("logo-da-fachada");
          const escuroNaEntrada = pagina.getByTestId("logo-da-fachada-escuro");
          await expect(claroNaEntrada).toHaveAttribute("src", urlClaro);
          await expect(escuroNaEntrada).toHaveAttribute("src", urlEscuro);

          if (tema === "light") {
            await expect(claroNaEntrada).toBeVisible({ timeout: 15_000 });
            await expect(escuroNaEntrada).toBeHidden();
          } else {
            await expect(escuroNaEntrada).toBeVisible({ timeout: 15_000 });
            await expect(claroNaEntrada).toBeHidden();
            const fundosDaEntrada = await fundosAte(escuroNaEntrada, "body");
            expect(
              fundosDaEntrada.filter(fundoEClaro),
              `moldura branca na entrada escura: ${JSON.stringify(fundosDaEntrada)}`,
            ).toEqual([]);
          }
          await pagina.screenshot({ path: evidencia(`login-${tema}.png`) });
        } finally {
          await contexto.close();
        }
      }
    } finally {
      // A restauração: roda mesmo quando uma asserção estoura, com a MESMA página
      // (já logada — nada de segundo login), e limpa as duas colunas.
      await removerSeHouver(page, "instalacao-escuro");
      await removerSeHouver(page, "instalacao");
    }
  });
});
