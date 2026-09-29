import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — o cartão "Áreas liberadas" da página da empresa no /admin (perfis de
 * áreas, fase 1). O admin escolhe o perfil e personaliza a lista final; o que
 * vai para a rota são os AJUSTES sobre o perfil, com a versão lida.
 * CONVEXY.md, "Perfis de áreas".
 */
const ORG = "44444444-4444-4444-8444-444444444444";
const COMPLETA = "c0a1e7a0-9005-4000-8000-000000000001";
const ESSENCIAL = "c0a1e7a0-9005-4000-8000-000000000002";

const deps = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(async () => ({ data: {} })),
}));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: deps.get, patch: deps.patch } }));

import { CartaoDasAreas } from "@/components/convexy/areas/CartaoDasAreas";

const PERFIS = [
  { id: COMPLETA, nome: "Completa", descricao: "", libera_tudo: true, areas: [] },
  {
    id: ESSENCIAL,
    nome: "Essencial",
    descricao: "",
    libera_tudo: false,
    areas: ["/app", "/app/inbox", "/app/agenda", "/app/kanban", "/app/contacts", "/app/tasks", "/app/connections"],
  },
];

function desenhar() {
  const consultas = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={consultas}>
      <CartaoDasAreas organizationId={ORG} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.get.mockImplementation(async (caminho: string) =>
    caminho.endsWith("/perfis-de-areas")
      ? { data: PERFIS }
      : { data: { id: ORG, perfil_de_areas_id: null, areas_a_mais: [], areas_a_menos: [], versao: null } },
  );
});

describe("Áreas liberadas no admin", () => {
  it("sem perfil, mostra a Completa; trocar para Essencial e salvar grava o perfil sem ajustes", async () => {
    desenhar();
    const perfil = await screen.findByLabelText("Perfil");
    expect(perfil).toHaveValue(COMPLETA);
    fireEvent.change(perfil, { target: { value: ESSENCIAL } });
    expect(screen.getByText(/continua ativo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(deps.patch).toHaveBeenCalledWith(`/api/v1/admin/tenants/${ORG}/areas`, {
        perfil_de_areas_id: ESSENCIAL,
        areas_a_mais: [],
        areas_a_menos: [],
        versao: null,
      }),
    );
  });

  it("personalizar sobre o perfil vira ajuste a mais e a menos", async () => {
    desenhar();
    fireEvent.change(await screen.findByLabelText("Perfil"), { target: { value: ESSENCIAL } });
    fireEvent.click(screen.getByRole("button", { name: "Personalizar áreas" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Tarefas" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Campanhas/ }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(deps.patch).toHaveBeenCalled());
    const corpo = (deps.patch.mock.calls[0] as unknown[])[1] as { areas_a_mais: string[]; areas_a_menos: string[] };
    expect(corpo.areas_a_mais).toEqual(["/app/campaigns"]);
    expect(corpo.areas_a_menos).toEqual(["/app/tasks"]);
  });

  it("obrigatória vem marcada e travada", async () => {
    desenhar();
    fireEvent.click(await screen.findByRole("button", { name: "Personalizar áreas" }));
    const conexoes = screen.getByRole("checkbox", { name: /Conexões/ });
    expect(conexoes).toBeChecked();
    expect(conexoes).toBeDisabled();
  });

  it("resposta fora do formato vira aviso de leitura, sem derrubar a página", async () => {
    deps.get.mockResolvedValue({ data: { id: ORG, nicho: "servicos" } });
    desenhar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não deu para ler as áreas desta empresa.");
  });
});
