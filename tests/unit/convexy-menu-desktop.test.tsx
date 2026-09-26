import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import type { Nicho } from "@/lib/convexy/nicho";

/**
 * Convexy — o menu no desktop (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.5 e 4).
 * Padrão "Disclosure Navigation" do WAI-ARIA APG: porta com sub é
 * `<button aria-expanded aria-controls>`, porta direta é `<Link>`, a sub-sidebar
 * é `<nav aria-label="{porta}">` e o item ativo tem `aria-current="page"`.
 * "Nada é recriado ao navegar" é provado pelo e2e (mesmo nó do DOM no navegador).
 */
const estado = vi.hoisted(() => ({
  pathname: "/app/contacts",
  larga: true,
  push: vi.fn(),
  toggleSidebar: vi.fn(),
  auth: {
    user: { is_platform_admin: false, support: null },
    activeOrg: { orgId: "org-1", name: "Org", role: "admin", modulos_ligados: ["menu_convexy"] },
  } as { user: Pick<AuthUser, "is_platform_admin" | "support">; activeOrg: ActiveOrg | null },
  orientacoes: { itens: [] as Array<{ href: string; rotulo: string }>, indisponivel: false },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => estado.pathname,
  useRouter: () => ({ push: estado.push, refresh: vi.fn() }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => estado.auth }));
vi.mock("@/app/actions/shell/toggleSidebar", () => ({ toggleSidebar: estado.toggleSidebar }));
// Busca a versão via react-query; o rodapé de versão não é o que estes testes examinam.
vi.mock("@/components/shell/VersionFooter", () => ({ VersionFooter: () => null }));
vi.mock("@/components/connections/ConnectionHealthDot", () => ({
  ConnectionHealthDot: () => <span data-testid="saude" />,
}));
vi.mock("@/components/convexy/menu/useOrientacoes", () => ({ useOrientacoes: () => estado.orientacoes }));
vi.mock("@/components/convexy/menu/useLarguraLarga", () => ({ useLarguraLarga: () => estado.larga }));

import { MenuConvexy } from "@/components/convexy/menu/MenuConvexy";
import { ConvexyProvider } from "@/lib/convexy/contexto";

function arvore(recolhido = false, nicho: Nicho = "clinica") {
  return (
    <ConvexyProvider menuLigado nicho={nicho}>
      <MenuConvexy recolhido={recolhido} />
    </ConvexyProvider>
  );
}
const menu = () => document.querySelector("[data-menu-convexy]") as HTMLElement;
const sub = (nome: string) => screen.getByRole("navigation", { name: nome });
const involucro = (nome: string) => sub(nome).parentElement as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  estado.pathname = "/app/contacts";
  estado.larga = true;
  estado.auth = {
    user: { is_platform_admin: false, support: null },
    activeOrg: { orgId: "org-1", name: "Org", role: "admin", modulos_ligados: ["menu_convexy"] },
  };
  estado.orientacoes = { itens: [], indisponivel: false };
});

describe("disclosure navigation", () => {
  it("porta com sub é botão com aria-expanded e aria-controls apontando para a sub-sidebar", () => {
    render(arvore());
    const porta = within(menu()).getByRole("button", { name: "Pacientes" });
    expect(porta).toHaveAttribute("aria-expanded", "true");
    expect(porta).toHaveAttribute("aria-controls", sub("Pacientes").id);
    expect(within(sub("Pacientes")).getByRole("link", { name: "Pacientes" })).toHaveAttribute("aria-current", "page");
    expect(within(menu()).getAllByRole("link", { current: "page" })).toHaveLength(1);
  });

  it("porta direta é Link; item da sub-sidebar é só texto", () => {
    render(arvore());
    expect(within(menu()).getByRole("link", { name: "Funil de pacientes" })).toHaveAttribute("href", "/app/kanban");
    expect(within(sub("Pacientes")).getByRole("link", { name: "Prospecção" }).querySelector("svg")).toBeNull();
  });

  it("porta com um item visível navega direto, sem sub-sidebar", () => {
    estado.auth = {
      user: { is_platform_admin: false, support: null },
      activeOrg: {
        orgId: "org-1",
        name: "Org",
        role: "agent",
        modulos_ligados: ["menu_convexy"],
        interface_settings: { preset: "completa", destinos: ["/app/inbox"] },
      },
    };
    estado.pathname = "/app/inbox";
    render(arvore());
    expect(within(menu()).getByRole("link", { name: "Conversas" })).toHaveAttribute("href", "/app/inbox");
    expect(screen.queryByRole("navigation", { name: "Conversas" })).toBeNull();
  });

  it("o item ativo acompanha o caminho", () => {
    const { rerender } = render(arvore());
    estado.pathname = "/app/prospecting";
    rerender(arvore());
    expect(within(sub("Pacientes")).getByRole("link", { name: "Prospecção" })).toHaveAttribute("aria-current", "page");
  });
});

describe("abrir, fechar e foco (tela larga)", () => {
  it("clicar numa porta vai à primeira tela visível — e nunca chama toggleSidebar", () => {
    render(arvore());
    const ia = within(menu()).getByRole("button", { name: "Assistente de IA" });
    fireEvent.click(ia);
    expect(estado.push).toHaveBeenCalledWith("/app/ai/agents");
    expect(ia).toHaveAttribute("aria-expanded", "true");
    expect(estado.toggleSidebar).not.toHaveBeenCalled();
  });

  it("o × fecha (a sub-sidebar recolhe a largura e sai da árvore acessível) e devolve o foco à porta", () => {
    render(arvore());
    const invólucroAntes = involucro("Pacientes");
    expect(invólucroAntes).toHaveClass("lg:w-60");
    fireEvent.click(screen.getByRole("button", { name: "Fechar Pacientes" }));
    expect(screen.queryByRole("navigation", { name: "Pacientes" })).toBeNull();
    expect(invólucroAntes).toHaveClass("lg:w-0");
    const porta = within(menu()).getByRole("button", { name: "Pacientes" });
    expect(porta).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(porta);
  });

  it("Esc dentro da sub-sidebar faz o mesmo", () => {
    render(arvore());
    fireEvent.keyDown(sub("Pacientes"), { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Pacientes" })).toBeNull();
    expect(document.activeElement).toBe(within(menu()).getByRole("button", { name: "Pacientes" }));
  });

  it("clicar de novo na porta ativa reabre, sem navegar", () => {
    render(arvore());
    fireEvent.click(screen.getByRole("button", { name: "Fechar Pacientes" }));
    fireEvent.click(within(menu()).getByRole("button", { name: "Pacientes" }));
    expect(sub("Pacientes")).toBeInTheDocument();
    expect(estado.push).not.toHaveBeenCalled();
  });

  it("sem animação na primeira pintura; anima quando a pessoa abre", () => {
    render(arvore());
    expect(sub("Pacientes").querySelector("[data-animar]")).toHaveAttribute("data-animar", "false");
    fireEvent.click(within(menu()).getByRole("button", { name: "Assistente de IA" }));
    expect(sub("Assistente de IA").querySelector("[data-animar]")).toHaveAttribute("data-animar", "true");
  });

  it("a alça some com a sub-sidebar aberta em tela larga", () => {
    render(arvore());
    expect(screen.getByRole("button", { name: "Recolher sidebar" })).toHaveClass("lg:hidden");
  });
});

describe("largura intermediária (md–lg)", () => {
  beforeEach(() => {
    estado.larga = false;
  });

  it("aberta sozinha fica fora da tela abaixo de lg, e a porta diz que não está expandida", () => {
    render(arvore());
    expect(involucro("Pacientes")).toHaveClass("hidden", "lg:block");
    expect(within(menu()).getByRole("button", { name: "Pacientes" })).toHaveAttribute("aria-expanded", "false");
  });

  it("aberta por clique cobre a página, o foco entra nela, e Esc no documento fecha só a sobreposição", () => {
    render(arvore());
    const porta = within(menu()).getByRole("button", { name: "Pacientes" });
    fireEvent.click(porta);
    expect(involucro("Pacientes")).toHaveClass("absolute", "lg:static");
    expect(porta).toHaveAttribute("aria-expanded", "true");
    expect(document.activeElement).toBe(within(sub("Pacientes")).getAllByRole("link")[0]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(involucro("Pacientes")).toHaveClass("hidden", "lg:block");
    expect(document.activeElement).toBe(porta);
    // Só a sobreposição fechou: em tela larga a porta ativa continua aberta.
    expect(involucro("Pacientes")).toHaveClass("lg:w-60");
  });

  it("clicar no fundo fecha a sobreposição; o fundo tem a largura do resto da tela", () => {
    render(arvore());
    fireEvent.click(within(menu()).getByRole("button", { name: "Pacientes" }));
    const fundo = menu().querySelector(".bg-overlay") as HTMLElement;
    expect(fundo).toHaveClass("w-[calc(100vw-100%)]", "lg:hidden");
    fireEvent.click(fundo);
    expect(involucro("Pacientes")).toHaveClass("hidden", "lg:block");
  });

  it("escolher um item fecha a sobreposição", () => {
    render(arvore());
    fireEvent.click(within(menu()).getByRole("button", { name: "Pacientes" }));
    fireEvent.click(within(sub("Pacientes")).getByRole("link", { name: "Produtos" }));
    expect(involucro("Pacientes")).toHaveClass("hidden", "lg:block");
  });
});

describe("orientações instaladas na porta Contatos", () => {
  it("cada orientação é item com ícone (o único item de sub-sidebar com ícone)", () => {
    estado.orientacoes = { itens: [{ href: "/app/extensions/i-1", rotulo: "Roteiro da clínica" }], indisponivel: false };
    render(arvore());
    const guia = within(sub("Pacientes")).getByRole("link", { name: "Roteiro da clínica" });
    expect(guia).toHaveAttribute("href", "/app/extensions/i-1");
    expect(guia.querySelector("svg")).not.toBeNull();
  });

  it("sem conseguir ler, o aviso leva a Extensões", () => {
    estado.orientacoes = { itens: [], indisponivel: true };
    render(arvore());
    expect(
      within(sub("Pacientes")).getByRole("link", { name: "Não foi possível conferir as orientações instaladas" }),
    ).toHaveAttribute("href", "/app/extensions");
  });
});

describe("saúde, atualização e alça", () => {
  it("o ponto de saúde de Conexões sobe para a porta Configurações", () => {
    render(arvore());
    expect(within(within(menu()).getByRole("button", { name: "Configurações" })).getByTestId("saude")).toBeInTheDocument();
  });

  it("Atualização do sistema só para o admin de plataforma fora do suporte", () => {
    estado.pathname = "/app/settings/profile";
    estado.auth = { ...estado.auth, user: { is_platform_admin: true, support: null } };
    const { unmount } = render(arvore());
    expect(within(sub("Configurações")).getByRole("link", { name: "Atualização do sistema" })).toHaveAttribute(
      "href",
      "/app/settings/atualizacao",
    );
    unmount();
    estado.auth = {
      ...estado.auth,
      user: { is_platform_admin: true, support: { status: "active" } as unknown as NonNullable<AuthUser["support"]> },
    };
    render(arvore());
    expect(within(sub("Configurações")).queryByRole("link", { name: "Atualização do sistema" })).toBeNull();
  });

  it("a alça usa o cookie e a ação de sempre", () => {
    estado.pathname = "/app/kanban";
    render(arvore());
    fireEvent.click(screen.getByRole("button", { name: "Recolher sidebar" }));
    expect(estado.toggleSidebar).toHaveBeenCalledWith(false);
  });

  it("recolhido: a alça fica à vista, e o nome continua sendo o nome acessível da porta", () => {
    estado.pathname = "/app/kanban";
    render(arvore(true));
    expect(screen.getByRole("button", { name: "Expandir sidebar" })).toHaveClass("opacity-100");
    expect(within(menu()).getByRole("link", { name: "Funil de pacientes" })).toBeInTheDocument();
  });
});

describe("voltar, avançar e trocar de porta", () => {
  it("voltar depois de abrir outra porta não revive a escolha antiga", () => {
    const { rerender } = render(arvore());
    fireEvent.click(within(menu()).getByRole("button", { name: "Assistente de IA" }));
    expect(estado.push).toHaveBeenCalledWith("/app/ai/agents");
    estado.pathname = "/app/ai/agents";
    rerender(arvore());
    expect(sub("Assistente de IA")).toBeInTheDocument();
    estado.pathname = "/app/contacts";
    rerender(arvore());
    expect(within(menu()).getByRole("button", { name: "Pacientes" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("navigation", { name: "Assistente de IA" })).toBeNull();
  });

  it("entre md e lg, voltar ao caminho onde a sobreposição abriu não a reabre", () => {
    estado.larga = false;
    const { rerender } = render(arvore());
    fireEvent.click(within(menu()).getByRole("button", { name: "Pacientes" }));
    expect(involucro("Pacientes")).toHaveClass("absolute");
    estado.pathname = "/app/kanban";
    rerender(arvore());
    estado.pathname = "/app/contacts";
    rerender(arvore());
    expect(involucro("Pacientes")).toHaveClass("hidden", "lg:block");
    expect(menu().querySelector(".bg-overlay")).toBeNull();
  });

  it("a sobreposição sobrevive à navegação que ela mesma pediu", () => {
    estado.larga = false;
    const { rerender } = render(arvore());
    fireEvent.click(within(menu()).getByRole("button", { name: "Assistente de IA" }));
    estado.pathname = "/app/ai/agents";
    rerender(arvore());
    expect(involucro("Assistente de IA")).toHaveClass("absolute", "lg:static");
  });

  it("ir a uma porta direta recolhe a sub-sidebar pela largura, sem desmontá-la", () => {
    const { rerender } = render(arvore());
    const antes = involucro("Pacientes");
    estado.pathname = "/app/kanban";
    rerender(arvore());
    const caixa = document.getElementById("menu-convexy-sub");
    expect(caixa?.parentElement).toBe(antes);
    expect(antes).toHaveClass("lg:w-0");
    expect(antes).toHaveAttribute("inert");
    expect(screen.queryByRole("navigation", { name: "Pacientes" })).toBeNull();
    estado.pathname = "/app/contacts";
    rerender(arvore());
    expect(involucro("Pacientes")).toBe(antes);
    expect(antes).toHaveClass("lg:w-60");
  });
});

describe("a alça no recolhido e no toque", () => {
  it("recolhido com sub-sidebar aberta, a alça some em tela larga", () => {
    render(arvore(true));
    expect(screen.getByRole("button", { name: "Expandir sidebar" })).toHaveClass("lg:hidden");
  });

  it("em toque, a alça some no menu largo e fica disponível recolhido (para voltar ao largo)", () => {
    estado.pathname = "/app/kanban";
    const { unmount } = render(arvore());
    expect(screen.getByRole("button", { name: "Recolher sidebar" })).toHaveClass("[@media(pointer:coarse)]:hidden");
    unmount();
    render(arvore(true));
    expect(screen.getByRole("button", { name: "Expandir sidebar" })).not.toHaveClass("[@media(pointer:coarse)]:hidden");
  });
});

describe("a dica com o nome da porta", () => {
  // O Radix abre a dica depois do atraso do `delayDuration` (150ms na porta).
  const passarOMouse = (alvo: HTMLElement) => {
    fireEvent.pointerMove(alvo);
    act(() => vi.advanceTimersByTime(600));
  };
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("só com ícones, passar o mouse numa porta mostra o nome dela", () => {
    render(arvore());
    passarOMouse(within(menu()).getByRole("button", { name: "Assistente de IA" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Assistente de IA");
  });

  it("hover com o trilho largo não fica guardado para quando ele compactar", () => {
    estado.pathname = "/app/kanban";
    render(arvore());
    for (const nome of ["Assistente de IA", "Pacientes"]) {
      const porta = within(menu()).getByRole("button", { name: nome });
      passarOMouse(porta);
      fireEvent.pointerLeave(porta);
    }
    fireEvent.click(within(menu()).getByRole("button", { name: "Pacientes" }));
    act(() => vi.advanceTimersByTime(600));
    expect(sub("Pacientes")).toBeInTheDocument();
    expect(screen.queryAllByRole("tooltip")).toHaveLength(0);
  });

  it("os itens da sub-sidebar não têm dica", () => {
    render(arvore());
    passarOMouse(within(sub("Pacientes")).getAllByRole("link")[0]!);
    expect(screen.queryAllByRole("tooltip")).toHaveLength(0);
  });
});

describe("hidratação", () => {
  it("o HTML do servidor hidrata sem erro recuperável", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(arvore());
    document.body.appendChild(container);
    const recuperaveis: unknown[] = [];
    let raiz: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      raiz = hydrateRoot(container, arvore(), { onRecoverableError: (erro) => recuperaveis.push(erro) });
    });
    expect(recuperaveis).toEqual([]);
    act(() => raiz?.unmount());
    container.remove();
  });
});
