import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "33333333-3333-4333-8333-333333333333";

const deps = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(async () => ({ data: {} })),
  moduloLigado: vi.fn(async () => false),
}));

vi.mock("@/lib/api/client", () => ({ apiClient: { get: deps.get, patch: deps.patch } }));
vi.mock("@/lib/instalacao/modulos", () => ({ moduloLigado: deps.moduloLigado }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/app/admin/(protected)/tenants/[id]/_client", () => ({ TenantOverviewClient: () => null }));

import TenantDetailPage from "@/app/admin/(protected)/tenants/[id]/page";
import { CampoDoNicho } from "@/components/convexy/CampoDoNicho";

function comConsulta(arvore: ReactElement) {
  return render(<QueryClientProvider client={new QueryClient()}>{arvore}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.get.mockResolvedValue({ data: { id: ORG, nicho: "servicos" } });
});

describe("Tipo de negócio no admin", () => {
  it("lê o nicho pela rota própria e grava a escolha pela mesma rota", async () => {
    comConsulta(<CampoDoNicho organizationId={ORG} />);
    const campo = await screen.findByLabelText("Tipo de negócio");
    expect(deps.get).toHaveBeenCalledWith(`/api/v1/admin/tenants/${ORG}/nicho`);
    expect(campo).toHaveValue("servicos");
    expect(screen.getByRole("option", { name: "Clínica, consultório ou salão" })).toHaveValue("clinica");
    fireEvent.change(campo, { target: { value: "clinica" } });
    await waitFor(() =>
      expect(deps.patch).toHaveBeenCalledWith(`/api/v1/admin/tenants/${ORG}/nicho`, { nicho: "clinica" }),
    );
    await waitFor(() => expect(deps.get).toHaveBeenCalledTimes(2));
  });

  it("a gravação recusada mostra o aviso", async () => {
    deps.patch.mockRejectedValueOnce(new Error("409"));
    comConsulta(<CampoDoNicho organizationId={ORG} />);
    fireEvent.change(await screen.findByLabelText("Tipo de negócio"), { target: { value: "loja" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Não deu para salvar. Tente de novo em instantes.");
  });

  it("a página só o mostra com o menu da Convexy ligado", async () => {
    deps.moduloLigado.mockResolvedValueOnce(false);
    const { unmount } = comConsulta(await TenantDetailPage({ params: Promise.resolve({ id: ORG }) }));
    expect(screen.queryByLabelText("Tipo de negócio")).toBeNull();
    unmount();
    deps.moduloLigado.mockResolvedValueOnce(true);
    comConsulta(await TenantDetailPage({ params: Promise.resolve({ id: ORG }) }));
    expect(await screen.findByLabelText("Tipo de negócio")).toBeInTheDocument();
    expect(deps.moduloLigado).toHaveBeenLastCalledWith({}, "menu_convexy");
  });
});
