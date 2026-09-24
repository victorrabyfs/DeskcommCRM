import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/shell/Sidebar";
import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import type { Branding } from "@/lib/branding";
import { MarcaDaInstalacaoProvider } from "@/lib/branding/contexto";
import type { MarcaDeSaida } from "@/lib/branding/saida";

/**
 * Convexy — o logo do tema escuro na barra lateral e na tela de entrada (spec
 * docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, 7.3.5 e 7.3.6).
 *
 * No jsdom o Tailwind não se aplica: o que se mede é o DOM e as CLASSES — a
 * moldura inteira (pai do logo claro) com `dark:hidden`, e o logo escuro como
 * IRMÃO dela, com `hidden dark:block`. Que as classes pintam de verdade é a
 * spec e2e tests/e2e/convexy-logo-escuro.spec.ts. Registro: CONVEXY.md.
 */

vi.mock("next/navigation", () => ({ usePathname: () => "/app/inbox" }));
vi.mock("@/app/actions/shell/toggleSidebar", () => ({ toggleSidebar: vi.fn() }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (chave: string) => chave }));
vi.mock("@/components/connections/ConnectionHealthDot", () => ({
  ConnectionHealthDot: () => null,
}));
vi.mock("@/components/shell/VersionFooter", () => ({ VersionFooter: () => null }));

const marcaDaSaida = vi.hoisted(() => vi.fn());
vi.mock("@/lib/branding/saida", () => ({ marcaDaSaida }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
  })),
}));

const CLARO = "https://cdn.exemplo.test/convexy-claro.png";
const ESCURO = "https://cdn.exemplo.test/convexy-escuro.png";
const DA_ORG = "https://cdn.exemplo.test/clinica.png";

const usuario = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@exemplo.test",
  is_platform_admin: false,
  organizations: [],
} as unknown as AuthUser;

const org = {
  orgId: "00000000-0000-4000-8000-0000000000aa",
  name: "Clínica Sorriso",
  role: "admin",
} as ActiveOrg;

let contexto: { user: AuthUser; activeOrg: ActiveOrg | null } = { user: usuario, activeOrg: org };
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => contexto }));

function renderSidebar(marca: Branding, collapsed = false) {
  return render(
    <MarcaDaInstalacaoProvider marca={marca}>
      <Sidebar collapsed={collapsed} />
    </MarcaDaInstalacaoProvider>,
  );
}

const COM_ESCURO: Branding = { name: "Convexy", logoUrl: CLARO, initial: "C", logoDarkUrl: ESCURO };
const SEM_ESCURO: Branding = { name: "Convexy", logoUrl: CLARO, initial: "C" };

function classes(el: Element | null | undefined): string[] {
  return (el?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  contexto = { user: usuario, activeOrg: org };
});

describe("barra lateral", () => {
  it("instalação com os dois logos: o claro na moldura que some no escuro, o escuro fora dela", () => {
    renderSidebar(COM_ESCURO);
    const imagens = screen.getAllByRole("img");
    expect(imagens.map((i) => i.getAttribute("src"))).toEqual([CLARO, ESCURO]);
    const [claro, escuro] = imagens;

    const moldura = claro!.parentElement;
    expect(classes(moldura)).toEqual(expect.arrayContaining(["dark:bg-white", "dark:hidden"]));
    expect(classes(escuro)).toEqual(expect.arrayContaining(["hidden", "dark:block"]));
    expect(escuro!.parentElement, "o logo escuro ficou DENTRO da moldura").not.toBe(moldura);
    expect(classes(escuro!.parentElement)).not.toContain("dark:bg-white");
    expect(escuro!.getAttribute("alt")).toBe("Convexy");
  });

  it("com logo da ORGANIZAÇÃO: um logo só, e a moldura não some — o escuro da instalação não entra", () => {
    contexto = { user: usuario, activeOrg: { ...org, marca: { nome: "Clínica Sorriso", logoUrl: DA_ORG } } };
    renderSidebar(COM_ESCURO);
    const imagens = screen.getAllByRole("img");
    expect(imagens.map((i) => i.getAttribute("src"))).toEqual([DA_ORG]);
    expect(classes(imagens[0]!.parentElement)).not.toContain("dark:hidden");
  });

  it("sem logo escuro, nada muda: um logo, moldura sem `dark:hidden`", () => {
    renderSidebar(SEM_ESCURO);
    const imagens = screen.getAllByRole("img");
    expect(imagens.map((i) => i.getAttribute("src"))).toEqual([CLARO]);
    expect(classes(imagens[0]!.parentElement)).toEqual(expect.arrayContaining(["dark:bg-white"]));
    expect(classes(imagens[0]!.parentElement)).not.toContain("dark:hidden");
  });

  it("recolhida: nenhum logo, nem o escuro", () => {
    renderSidebar(COM_ESCURO, true);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });
});

const SAIDA: MarcaDeSaida = {
  nome: "Convexy",
  logoUrl: CLARO,
  accent: "#1756c4",
  accentFg: "#ffffff",
  origens: { nome: "banco", cor: "banco" },
};

async function fachada(marca: MarcaDeSaida): Promise<HTMLElement> {
  marcaDaSaida.mockResolvedValue(marca);
  const { default: PublicLayout } = await import("@/app/(public)/layout");
  const html = renderToStaticMarkup(await PublicLayout({ children: <p>formulário</p> }));
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

describe("tela de entrada", () => {
  it("com os dois logos: o claro na moldura que some no escuro, o escuro fora dela", async () => {
    const host = await fachada({ ...SAIDA, logoDarkUrl: ESCURO });
    const imagens = within(host).getAllByRole("img");
    expect(imagens.map((i) => i.getAttribute("src"))).toEqual([CLARO, ESCURO]);
    const [claro, escuro] = imagens;

    expect(claro!.getAttribute("data-testid")).toBe("logo-da-fachada");
    expect(escuro!.getAttribute("data-testid")).toBe("logo-da-fachada-escuro");
    const moldura = claro!.parentElement;
    expect(classes(moldura)).toEqual(expect.arrayContaining(["dark:bg-white", "dark:hidden"]));
    expect(classes(escuro)).toEqual(expect.arrayContaining(["hidden", "dark:block"]));
    expect(escuro!.parentElement).not.toBe(moldura);
    expect(classes(escuro!.parentElement)).not.toContain("dark:bg-white");
    expect(host.textContent).toContain("formulário");
  });

  it("sem logo escuro, a fachada é a de antes", async () => {
    const host = await fachada(SAIDA);
    const imagens = within(host).getAllByRole("img");
    expect(imagens.map((i) => i.getAttribute("src"))).toEqual([CLARO]);
    expect(classes(imagens[0]!.parentElement)).not.toContain("dark:hidden");
    expect(host.querySelector("[data-testid='logo-da-fachada-escuro']")).toBeNull();
  });
});
