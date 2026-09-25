/**
 * Convexy — o menu novo, na tela (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 9).
 *
 * O banco do e2e nasce SEM o módulo: todas as specs do original rodam no menu
 * clássico e provam o caminho de volta. Esta spec liga o módulo no preparo —
 * pela tela, como o dono do servidor faz — e no fim devolve EXATAMENTE o que
 * encontrou: a linha do módulo em `platform_config`, o nicho e a interface da
 * organização do e2e. Ela mexe no banco, então só roda contra banco local ou no CI.
 *
 * As sessões são salvas ANTES de ligar o módulo: o helper de login espera
 * `/app/…` depois do MFA, e com o Início a entrada passa a ser `/app`.
 * Medidas por ferramenta (`boundingBox`, `getComputedStyle`), nunca a olho.
 */
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { moduloLigado } from "../../lib/instalacao/modulos";
import { credenciaisSupabaseDeTeste } from "../../scripts/lib/env-de-teste";
import { lerCreds, loginComoAdmin, loginComoDono, type CredsE2E } from "./helpers/login-admin";

const credenciais = credenciaisSupabaseDeTeste();
const BANCO_LOCAL = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/;
test.skip(
  !(process.env.CI === "true" || BANCO_LOCAL.test(credenciais.url)),
  "liga um módulo e grava na organização: só contra banco local ou no CI",
);

const db = createClient(credenciais.url, credenciais.serviceRole, { auth: { persistSession: false } });

const EVIDENCIA = path.join(process.cwd(), ".superpowers", "evidence", "convexy-menu");
const SESSOES = path.join(process.cwd(), ".superpowers", "e2e-sessoes", "convexy-menu");
const SESSAO_ADMIN = path.join(SESSOES, "admin.json");
const SESSAO_AGENTE = path.join(SESSOES, "agente.json");
const CHAVE_DO_MODULO = "MODULO_MENU_CONVEXY";

interface EstadoAntes {
  readonly modulo: Record<string, unknown> | null;
  readonly nicho: string | null;
  readonly interfaceSettings: unknown;
}

let orgId = "";
/** Só existe se o preparo capturou TUDO; o `afterAll` restaura a partir dele e de mais nada. */
let antes: EstadoAntes | null = null;

const evidencia = (nome: string) => path.join(EVIDENCIA, nome);
const menu = (page: Page) => page.locator("[data-menu-convexy]");
const trilho = (page: Page) => page.locator("[data-menu-convexy] > div").first();
const subSidebar = (page: Page, nome: string) => page.getByRole("navigation", { name: nome, exact: true });
const porta = (page: Page, nome: string) => menu(page).getByRole("button", { name: nome, exact: true });

async function largura(elemento: Locator): Promise<number> {
  return Math.round((await elemento.boundingBox())?.width ?? 0);
}

function falhou(contexto: string, error: { message: string } | null): void {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}

/**
 * Contexto SEM sessão para o preparo. O Playwright aplica a `browser.newContext()`
 * chamado num hook as opções `use` do teste que o disparou — inclusive o
 * `storageState: SESSAO_ADMIN` —, e o arquivo ainda não existe no `beforeAll`
 * (ENOENT no e2e 36193635843). O estado vazio explícito vence essa herança.
 */
function contextoSemSessao(browser: Browser) {
  return browser.newContext({ storageState: { cookies: [], origins: [] } });
}

async function salvarSessao(browser: Browser, arquivo: string, entrar: (page: Page) => Promise<unknown>) {
  const contexto = await contextoSemSessao(browser);
  const page = await contexto.newPage();
  await entrar(page);
  await contexto.storageState({ path: arquivo });
  await contexto.close();
}

async function entrarComoAgente(page: Page, creds: CredsE2E) {
  await page.goto("/login");
  await page.locator("#email").fill(creds.users.agent!.email);
  await page.locator("#password").fill(creds.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/app\//);
}

async function gravarNicho(nicho: string | null) {
  const { error } = await db.from("organizations").update({ nicho }).eq("id", orgId);
  falhou("nicho do e2e", error);
}

/** A cor que o elemento TEM e a que o token dá no tema em vigor, lidas pelo navegador. */
async function corEToken(alvo: Locator, propriedade: "color" | "backgroundColor", token: string) {
  return alvo.evaluate(
    (el, [prop, tok]) => {
      const sonda = document.createElement("span");
      sonda.style.setProperty(prop === "color" ? "color" : "background-color", `var(${tok})`);
      el.appendChild(sonda);
      const esperado = getComputedStyle(sonda)[prop];
      sonda.remove();
      return { real: getComputedStyle(el)[prop], esperado };
    },
    [propriedade, token] as const,
  );
}

test.describe.configure({ timeout: 120_000 });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  fs.mkdirSync(EVIDENCIA, { recursive: true });
  fs.mkdirSync(SESSOES, { recursive: true });
  // O dono do servidor precisa ser admin de plataforma para abrir /admin.
  execFileSync("npx", ["tsx", "scripts/seed-e2e-system-update.ts"], { stdio: "inherit" });
  const creds = lerCreds() as CredsE2E & { org_id: string };
  orgId = creds.org_id;

  const modulo = await db.from("platform_config").select("*").eq("chave", CHAVE_DO_MODULO).maybeSingle();
  falhou("linha do módulo", modulo.error);
  const org = await db.from("organizations").select("nicho, interface_settings").eq("id", orgId).single();
  falhou("organização do e2e", org.error);
  antes = {
    modulo: (modulo.data as Record<string, unknown> | null) ?? null,
    nicho: (org.data as { nicho: string | null }).nicho,
    interfaceSettings: (org.data as { interface_settings: unknown }).interface_settings,
  };

  await salvarSessao(browser, SESSAO_ADMIN, (page) => loginComoAdmin(page, creds));
  await salvarSessao(browser, SESSAO_AGENTE, (page) => entrarComoAgente(page, creds));

  const contexto = await contextoSemSessao(browser);
  const page = await contexto.newPage();
  await loginComoDono(page, lerCreds());
  await page.goto("/admin/sistema");
  const chave = page.getByRole("switch", { name: "Menu da Convexy" });
  await expect(chave).toBeVisible();
  if ((await chave.getAttribute("aria-checked")) !== "true") await chave.click();
  await expect(chave).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => moduloLigado(db, "menu_convexy"), { timeout: 15_000 }).toBe(true);
  await page.goto(`/admin/tenants/${orgId}`);
  const tipo = page.getByLabel("Tipo de negócio");
  await expect(tipo).toBeVisible({ timeout: 15_000 });
  await tipo.selectOption("clinica");
  await expect
    .poll(async () => (await db.from("organizations").select("nicho").eq("id", orgId).single()).data?.nicho, {
      timeout: 15_000,
    })
    .toBe("clinica");
  await page.screenshot({ path: evidencia("00-admin-tipo-de-negocio.png"), fullPage: true });
  await contexto.close();
});

test.afterAll(async () => {
  if (!antes) return;
  if (antes.modulo) {
    const { error } = await db.from("platform_config").upsert(antes.modulo, { onConflict: "chave" });
    falhou("restaurar a linha do módulo", error);
  } else {
    const { error } = await db.from("platform_config").delete().eq("chave", CHAVE_DO_MODULO);
    falhou("apagar a linha do módulo", error);
  }
  const { error } = await db
    .from("organizations")
    .update({ nicho: antes.nicho, interface_settings: antes.interfaceSettings })
    .eq("id", orgId);
  falhou("restaurar a organização do e2e", error);
});

test.describe("como admin da organização, em tela larga", () => {
  test.use({ storageState: SESSAO_ADMIN, viewport: { width: 1440, height: 900 } });

  test("o Início é a entrada de /app, com os três blocos", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { level: 1, name: "Início" })).toBeVisible();
    for (const bloco of ["Conversas esperando", "Agenda de hoje", "Minhas tarefas"]) {
      await expect(page.getByRole("heading", { level: 2, name: bloco })).toBeVisible();
    }
    await expect(page.getByText(/Atualizado às \d{2}:\d{2}/)).toBeVisible();
    await page.screenshot({ path: evidencia("01-inicio.png"), fullPage: true });
  });

  test("porta com sub-sidebar: abre, compacta o trilho e marca o ativo — sem erro de hidratação", async ({ page }) => {
    const erros: string[] = [];
    page.on("console", (mensagem) => {
      if (mensagem.type() === "error") erros.push(mensagem.text());
    });
    await page.goto("/app/contacts");
    const sub = subSidebar(page, "Pacientes");
    await expect(sub).toBeVisible();
    await expect.poll(() => largura(sub)).toBe(240);
    await expect.poll(() => largura(trilho(page))).toBe(64);
    await expect(porta(page, "Pacientes")).toHaveAttribute("aria-expanded", "true");
    await expect(sub.getByRole("link", { name: "Pacientes" })).toHaveAttribute("aria-current", "page");
    expect(erros.filter((e) => /hydrat|#418|#423|#425/i.test(e))).toEqual([]);
    await page.screenshot({ path: evidencia("02-porta-contatos-clinica.png"), fullPage: true });
  });

  test("medidas do protótipo: porta 38px/14,5px, compacta 40px, item 32px, barra centrada e encostada", async ({ page }) => {
    await page.goto("/app/kanban");
    await expect.poll(() => largura(trilho(page))).toBe(236);
    const conversas = porta(page, "Conversas");
    expect(await conversas.evaluate((el) => getComputedStyle(el).height)).toBe("38px");
    expect(await conversas.evaluate((el) => getComputedStyle(el).fontSize)).toBe("14.5px");

    await page.goto("/app/contacts");
    await expect.poll(() => largura(trilho(page))).toBe(64);
    const pacientes = porta(page, "Pacientes");
    expect(await pacientes.evaluate((el) => getComputedStyle(el).height)).toBe("40px");
    const item = subSidebar(page, "Pacientes").getByRole("link", { name: "Prospecção" });
    expect(await item.evaluate((el) => getComputedStyle(el).minHeight)).toBe("32px");

    const barra = await pacientes.locator(".convexy-barra").boundingBox();
    const caixa = await pacientes.boundingBox();
    const borda = await trilho(page).boundingBox();
    expect(barra && caixa && borda).toBeTruthy();
    expect(Math.abs(barra!.y + barra!.height / 2 - (caixa!.y + caixa!.height / 2))).toBeLessThanOrEqual(1);
    expect(Math.round(barra!.height)).toBe(Math.round(caixa!.height) - 18);
    expect(Math.abs(barra!.x - borda!.x)).toBeLessThanOrEqual(1);
  });

  test("abrir uma porta só estreita o conteúdo — a largura nunca volta a crescer no meio", async ({ page }) => {
    await page.goto("/app/kanban");
    await expect.poll(() => largura(trilho(page))).toBe(236);
    const larguras = await page.evaluate(
      () =>
        new Promise<number[]>((resolver) => {
          const conteudo = document.querySelector("main") as HTMLElement;
          const botao = document.querySelector<HTMLElement>('[data-menu-convexy] [data-porta="ia"]')!;
          const medidas: number[] = [];
          const inicio = performance.now();
          const medir = () => {
            medidas.push(conteudo.getBoundingClientRect().width);
            if (performance.now() - inicio < 500) requestAnimationFrame(medir);
            else resolver(medidas);
          };
          requestAnimationFrame(medir);
          botao.click();
        }),
    );
    expect(larguras.length).toBeGreaterThan(5);
    for (let i = 1; i < larguras.length; i++) expect(larguras[i]!).toBeLessThanOrEqual(larguras[i - 1]! + 1);
    expect(larguras.at(-1)!).toBeLessThan(larguras[0]!);
  });

  test("navegar dentro da porta não recria o menu", async ({ page }) => {
    await page.goto("/app/contacts");
    await menu(page).evaluate((el) => {
      (el as HTMLElement & { marcaDoTeste?: string }).marcaDoTeste = "mesmo-no";
    });
    await subSidebar(page, "Pacientes").getByRole("link", { name: "Prospecção" }).click();
    await page.waitForURL(/\/app\/prospecting$/);
    await expect(subSidebar(page, "Pacientes").getByRole("link", { name: "Prospecção" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await menu(page).evaluate((el) => (el as HTMLElement & { marcaDoTeste?: string }).marcaDoTeste)).toBe(
      "mesmo-no",
    );
  });

  test("link direto para tela interna abre a porta certa, com um dono só", async ({ page }) => {
    await page.goto("/app/settings/tenant/agenda");
    const agenda = subSidebar(page, "Agenda");
    await expect(agenda.getByRole("link", { name: "Tipos de agendamento" })).toHaveAttribute("aria-current", "page");
    await expect(menu(page).locator('[aria-current="page"]')).toHaveCount(1);
    await page.goto("/app/ai/cases/avisos");
    const ia = subSidebar(page, "Assistente de IA");
    await expect(ia.getByRole("link", { name: "Aviso no WhatsApp" })).toHaveAttribute("aria-current", "page");
    await expect(ia.getByRole("link", { name: "Casos" })).not.toHaveAttribute("aria-current", "page");
  });

  test("a alça recolhe o menu, e a escolha sobrevive ao recarregar", async ({ page }) => {
    await page.goto("/app/kanban");
    await expect.poll(() => largura(trilho(page))).toBe(236);
    await trilho(page).hover();
    await page.getByRole("button", { name: "Recolher sidebar" }).click();
    await expect.poll(() => largura(trilho(page))).toBe(64);
    await page.reload();
    await expect.poll(() => largura(trilho(page))).toBe(64);
    await page.screenshot({ path: evidencia("03-trilho-recolhido.png"), fullPage: true });
    await page.getByRole("button", { name: "Expandir sidebar" }).click();
    await expect.poll(() => largura(trilho(page))).toBe(236);
  });

  test("os hubs levam à primeira tela da porta deles", async ({ page }) => {
    await page.goto("/app/crm");
    await expect(page).toHaveURL(/\/app\/contacts$/);
    await page.goto("/app/ai");
    await expect(page).toHaveURL(/\/app\/ai\/agents$/);
    await page.goto("/app/analise");
    await expect(page).toHaveURL(/\/app\/metrics$/);
    await page.goto("/app/settings");
    await expect(page).toHaveURL(/\/app\/connections$/);
  });

  test("Esc fecha a sub-sidebar e devolve o foco à porta; clicar de novo reabre", async ({ page }) => {
    await page.goto("/app/contacts");
    const sub = subSidebar(page, "Pacientes");
    await sub.getByRole("link", { name: "Produtos" }).focus();
    await page.keyboard.press("Escape");
    await expect(sub).toHaveCount(0);
    await expect(porta(page, "Pacientes")).toBeFocused();
    await expect(porta(page, "Pacientes")).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => largura(trilho(page))).toBe(236);
    await porta(page, "Pacientes").click();
    await expect(subSidebar(page, "Pacientes")).toBeVisible();
  });

  test("área escondida na tela de interface some do menu", async ({ page }) => {
    await page.goto("/app/settings/tenant");
    await page.getByText("Personalizar áreas visíveis").first().click();
    await page.getByRole("checkbox", { name: "Tags", exact: true }).uncheck();
    await page.getByRole("button", { name: "Aplicar interface" }).click();
    await expect(page.getByText("Menu lateral da empresa salvo.")).toBeVisible();
    await page.goto("/app/settings/profile");
    const configuracoes = subSidebar(page, "Configurações");
    await expect(configuracoes).toBeVisible();
    await expect(configuracoes.getByRole("link", { name: "Tags", exact: true })).toHaveCount(0);
    await page.screenshot({ path: evidencia("04-interface-sem-tags.png"), fullPage: true });
  });

  test("o nicho troca os nomes: clínica × serviços", async ({ page }) => {
    await page.goto("/app/contacts");
    await expect(porta(page, "Pacientes")).toBeVisible();
    await expect(menu(page).getByRole("link", { name: "Funil de pacientes", exact: true })).toBeVisible();
    await gravarNicho("servicos");
    try {
      await page.reload();
      await expect(porta(page, "Contatos")).toBeVisible();
      await expect(menu(page).getByRole("link", { name: "Funil de vendas", exact: true })).toBeVisible();
      await page.screenshot({ path: evidencia("05-porta-contatos-servicos.png"), fullPage: true });
    } finally {
      await gravarNicho("clinica");
    }
  });

  // Ruling C11: o vocabulário do nicho não fica só no mapa do menu — ele
  // alcança o que o `useT` do cliente desenha (o nome acessível do sino, fora do
  // menu) e a busca ⌘K (desvio aceito "o vocabulário alcança a busca ⌘K e o
  // sino", CONVEXY.md). O <h1> de /app/kanban NÃO serve de prova: é desenhado
  // no servidor com `traduzir()` e fica "Funis" (desvio "títulos desenhados no
  // servidor").
  test("o vocabulário do nicho aparece no sino (useT cliente) e na busca ⌘K", async ({ page }) => {
    await page.goto("/app/kanban");
    await expect(page.getByTestId("alerts-bell")).toHaveAttribute("aria-label", /^Pedidos da IA(?: — \d+ em aberto)?$/);
    await page.getByRole("button", { name: /Buscar/ }).click();
    const paleta = page.getByRole("dialog");
    await expect(paleta.getByText("Funil de pacientes", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
  });
});

test.describe("como admin da organização, no tema escuro", () => {
  test.use({ storageState: SESSAO_ADMIN, viewport: { width: 1440, height: 900 }, colorScheme: "dark" });

  test("trilho, porta ativa e rótulo de grupo usam os tokens do escuro", async ({ page }) => {
    await page.goto("/app/contacts");
    await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("dark");
    const fundo = await corEToken(trilho(page), "backgroundColor", "--color-surface");
    expect(fundo.real).toBe(fundo.esperado);
    const ativa = await corEToken(porta(page, "Pacientes"), "color", "--color-accent");
    expect(ativa.real).toBe(ativa.esperado);
    const rotulo = subSidebar(page, "Pacientes").locator("h3").first();
    const cinza = await corEToken(rotulo, "color", "--color-text-muted");
    expect(cinza.real).toBe(cinza.esperado);
    await page.screenshot({ path: evidencia("06-tema-escuro.png"), fullPage: true });
  });
});

test.describe("como admin da organização, entre md e lg", () => {
  test.use({ storageState: SESSAO_ADMIN, viewport: { width: 900, height: 800 } });

  test("a sub-sidebar só aparece por clique, por cima, sem rolagem horizontal; Esc fecha e devolve o foco", async ({ page }) => {
    await page.goto("/app/contacts");
    await expect(subSidebar(page, "Pacientes")).toBeHidden();
    await expect(porta(page, "Pacientes")).toHaveAttribute("aria-expanded", "false");
    await porta(page, "Pacientes").click();
    const sub = subSidebar(page, "Pacientes");
    await expect(sub).toBeVisible();
    await expect(porta(page, "Pacientes")).toHaveAttribute("aria-expanded", "true");
    await expect(sub.getByRole("link").first()).toBeFocused();
    const rolagem = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(rolagem.scrollWidth).toBeLessThanOrEqual(rolagem.clientWidth);
    await page.screenshot({ path: evidencia("07-sobreposicao-900.png"), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(sub).toBeHidden();
    await expect(porta(page, "Pacientes")).toBeFocused();
  });
});

test.describe("como admin da organização, no celular", () => {
  test.use({ storageState: SESSAO_ADMIN, viewport: { width: 390, height: 844 } });

  test("a gaveta mostra as portas e troca pela lista da porta, com ‹ Voltar", async ({ page }) => {
    await page.goto("/app/inbox");
    // Abaixo de `md` o trilho fica na árvore, mas fora da tela (`hidden md:block` do AppShell).
    await expect(menu(page)).toBeHidden();
    await page.getByRole("button", { name: "Abrir navegação" }).click();
    const gaveta = page.getByRole("dialog");
    await gaveta.getByRole("button", { name: "Assistente de IA", exact: true }).click();
    const voltar = gaveta.getByRole("button", { name: "‹ Voltar" });
    await expect(voltar).toBeVisible();
    expect(Math.round((await voltar.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: evidencia("08-gaveta-celular.png"), fullPage: true });
    await gaveta.getByRole("link", { name: "Casos", exact: true }).click();
    await page.waitForURL(/\/app\/ai\/cases$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("como agente", () => {
  test.use({ storageState: SESSAO_AGENTE, viewport: { width: 1440, height: 900 } });

  test("o agente não vê os itens de gerente nem de admin", async ({ page }) => {
    await page.goto("/app/ai/cases");
    const ia = subSidebar(page, "Assistente de IA");
    await expect(ia.getByRole("link", { name: "Casos" })).toHaveAttribute("aria-current", "page");
    for (const nome of ["Assistentes", "Roteadores", "Execuções", "Credenciais"]) {
      await expect(ia.getByRole("link", { name: nome, exact: true })).toHaveCount(0);
    }
    await page.goto("/app/inbox");
    await expect(subSidebar(page, "Conversas").getByRole("link", { name: "Chamadas" })).toHaveCount(0);
    await page.screenshot({ path: evidencia("09-agente.png"), fullPage: true });
  });
});
