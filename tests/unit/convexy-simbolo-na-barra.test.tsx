import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/shell/Sidebar";
import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import type { Branding } from "@/lib/branding";
import { MarcaDaInstalacaoProvider } from "@/lib/branding/contexto";

/**
 * Convexy — o símbolo da marca na barra recolhida (CONVEXY.md, "Símbolo da
 * marca"; migration 9002). Com a barra recolhida, o símbolo da instalação toma o
 * lugar da inicial do nome; aberta, nada muda; organização com logo próprio
 * continua com a inicial dela (o símbolo é da instalação).
 */

vi.mock("next/navigation", () => ({ usePathname: () => "/app/inbox" }));
vi.mock("@/app/actions/shell/toggleSidebar", () => ({ toggleSidebar: vi.fn() }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (chave: string) => chave }));
vi.mock("@/components/connections/ConnectionHealthDot", () => ({ ConnectionHealthDot: () => null }));
vi.mock("@/components/shell/VersionFooter", () => ({ VersionFooter: () => null }));

const SIMBOLO = "https://storage.exemplo.test/brand-logos/platform/simbolo.png";
const LOGO = "https://storage.exemplo.test/brand-logos/platform/logo.png";

const org = { orgId: "00000000-0000-4000-8000-0000000000aa", name: "Clínica", role: "admin" } as ActiveOrg;
let contexto: { user: AuthUser; activeOrg: ActiveOrg | null } = {
  user: { id: "u", is_platform_admin: false, organizations: [] } as unknown as AuthUser,
  activeOrg: org,
};
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => contexto }));

function barra(marca: Branding, collapsed: boolean) {
  return render(
    <MarcaDaInstalacaoProvider marca={marca}>
      <Sidebar collapsed={collapsed} />
    </MarcaDaInstalacaoProvider>,
  );
}

const imagens = () => [...document.querySelectorAll("img")].map((img) => img.getAttribute("src"));

describe("o símbolo da instalação na barra recolhida", () => {
  const convexy: Branding = { name: "Convexy", logoUrl: LOGO, simboloUrl: SIMBOLO, initial: "C" };

  it("recolhida, mostra o símbolo no lugar da inicial — e o nome segue acessível", () => {
    contexto = { ...contexto, activeOrg: org };
    barra(convexy, true);
    expect(imagens()).toEqual([SIMBOLO]);
    expect(screen.queryByText("C")).toBeNull();
    expect(screen.getByText("Convexy")).toHaveClass("sr-only");
  });

  it("aberta, mostra o logo e não o símbolo", () => {
    contexto = { ...contexto, activeOrg: org };
    barra(convexy, false);
    expect(imagens()).toEqual([LOGO]);
  });

  it("sem símbolo gravado, recolhida continua com a inicial (controle)", () => {
    contexto = { ...contexto, activeOrg: org };
    barra({ ...convexy, simboloUrl: null }, true);
    expect(imagens()).toEqual([]);
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("organização com logo próprio fica com a inicial dela, não com o símbolo da instalação", () => {
    contexto = { ...contexto, activeOrg: { ...org, marca: { nome: "Sorriso", logoUrl: "/org.png" } } };
    barra(convexy, true);
    expect(imagens()).toEqual([]);
    expect(screen.getByText("S")).toBeInTheDocument();
  });
});
