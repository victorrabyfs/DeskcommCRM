import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import type { Nicho } from "@/lib/convexy/nicho";

/**
 * Convexy — a gaveta do celular (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 4):
 * mostra o menu largo, com Configurações no rodapé como no desktop; uma porta
 * com sub troca o conteúdo pela lista dela, com "‹ Voltar" (alvo de 44px) que
 * devolve o foco à porta; escolher um item fecha a gaveta. Na gaveta a porta
 * troca o conteúdo, não expande nada: sem `aria-expanded`. Sem o módulo, é a do original.
 */
const estado = vi.hoisted(() => ({
  auth: {
    user: { is_platform_admin: false, support: null },
    activeOrg: { orgId: "org-1", name: "Org", role: "admin", modulos_ligados: ["menu_convexy"] },
  } as { user: Pick<AuthUser, "is_platform_admin" | "support">; activeOrg: ActiveOrg | null },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/inbox",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => estado.auth, usePermission: () => false }));
vi.mock("@/app/actions/shell/toggleSidebar", () => ({ toggleSidebar: vi.fn() }));
vi.mock("@/components/shell/VersionFooter", () => ({ VersionFooter: () => null }));
vi.mock("@/components/connections/ConnectionHealthDot", () => ({ ConnectionHealthDot: () => null }));
vi.mock("@/components/convexy/menu/useOrientacoes", () => ({
  useOrientacoes: () => ({ itens: [], indisponivel: false }),
}));

import { MobileSidebar } from "@/components/shell/MobileSidebar";
import { ConvexyProvider } from "@/lib/convexy/contexto";

const COM_O_MODULO = {
  user: { is_platform_admin: false, support: null },
  activeOrg: { orgId: "org-1", name: "Org", role: "admin", modulos_ligados: ["menu_convexy"] },
} as const satisfies typeof estado.auth;

function montar(nicho: Nicho = "generico", menuLigado = true) {
  render(
    <ConvexyProvider menuLigado={menuLigado} nicho={nicho}>
      <MobileSidebar />
    </ConvexyProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Abrir navegação" }));
  return screen.getByRole("dialog");
}

beforeEach(() => {
  vi.clearAllMocks();
  estado.auth = COM_O_MODULO;
});

describe("gaveta com o menu da Convexy", () => {
  it("porta com sub troca a gaveta pela lista dela, com ‹ Voltar; item escolhido fecha a gaveta", async () => {
    const gaveta = montar();
    fireEvent.click(within(gaveta).getByRole("button", { name: "Assistente de IA" }));
    expect(within(gaveta).getByRole("button", { name: "‹ Voltar" })).toBeInTheDocument();
    expect(within(gaveta).getByRole("navigation", { name: "Assistente de IA" })).toBeInTheDocument();
    fireEvent.click(within(gaveta).getByRole("link", { name: "Casos" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("‹ Voltar tem 44px de alvo, volta às portas e devolve o foco à porta de onde veio", () => {
    const gaveta = montar();
    fireEvent.click(within(gaveta).getByRole("button", { name: "Resultados" }));
    const voltar = within(gaveta).getByRole("button", { name: "‹ Voltar" });
    expect(voltar).toHaveClass("min-h-11");
    fireEvent.click(voltar);
    const porta = within(gaveta).getByRole("button", { name: "Resultados" });
    expect(document.activeElement).toBe(porta);
  });

  it("na gaveta a porta não declara aria-expanded, e Configurações fica no rodapé", () => {
    const gaveta = montar();
    const resultados = within(gaveta).getByRole("button", { name: "Resultados" });
    const configuracoes = within(gaveta).getByRole("button", { name: "Configurações" });
    expect(resultados).not.toHaveAttribute("aria-expanded");
    expect(configuracoes).not.toHaveAttribute("aria-expanded");
    const principal = within(gaveta).getByRole("navigation", { name: "Navegação principal" });
    expect(within(principal).queryByRole("button", { name: "Configurações" })).toBeNull();
    expect(configuracoes.closest(".border-t")).not.toBeNull();
  });

  it("porta direta navega e fecha a gaveta", async () => {
    const gaveta = montar("servicos");
    fireEvent.click(within(gaveta).getByRole("link", { name: "Funil de vendas" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("sem o módulo", () => {
  it("a gaveta é a do original", () => {
    // O módulo chega à casca pelos dois caminhos que o layout alimenta juntos.
    estado.auth = { ...COM_O_MODULO, activeOrg: { ...COM_O_MODULO.activeOrg, modulos_ligados: [] } };
    const gaveta = montar("generico", false);
    expect(within(gaveta).getByRole("link", { name: "Funis" })).toHaveAttribute("href", "/app/kanban");
    expect(within(gaveta).queryByRole("button", { name: "Assistente de IA" })).toBeNull();
  });
});
