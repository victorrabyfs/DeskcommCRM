import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ get: vi.fn(), orgId: "org-1" }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: deps.get } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: deps.orgId } }) }));

import { useOrientacoes } from "@/components/convexy/menu/useOrientacoes";

/** Convexy — as orientações são carregadas quando a porta Contatos abre (spec 3.4). */
function comConsulta() {
  const cliente = new QueryClient();
  return function Envoltorio({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.orgId = "org-1";
});

describe("useOrientacoes", () => {
  it("não consulta enquanto a porta Contatos não abre", () => {
    const { result } = renderHook(() => useOrientacoes(false), { wrapper: comConsulta() });
    expect(deps.get).not.toHaveBeenCalled();
    expect(result.current).toEqual({ itens: [], indisponivel: false });
  });

  it("consulta ao abrir, e cada orientação leva à tela da extensão", async () => {
    deps.get.mockResolvedValue({
      data: { orientacoes: [{ installation_id: "abc 1", titulo: "Roteiro" }], indisponivel: false },
    });
    const { result } = renderHook(() => useOrientacoes(true), { wrapper: comConsulta() });
    await waitFor(() => expect(result.current.itens).toEqual([{ href: "/app/extensions/abc%201", rotulo: "Roteiro" }]));
    expect(deps.get).toHaveBeenCalledWith("/api/v1/convexy/orientacoes");
    expect(result.current.indisponivel).toBe(false);
  });

  it("a rota diz que não deu para ler: o aviso aparece", async () => {
    deps.get.mockResolvedValue({ data: { orientacoes: [], indisponivel: true } });
    const { result } = renderHook(() => useOrientacoes(true), { wrapper: comConsulta() });
    await waitFor(() => expect(result.current.indisponivel).toBe(true));
  });

  it("falha de rede também vira aviso", async () => {
    deps.get.mockRejectedValue(new Error("rede"));
    const { result } = renderHook(() => useOrientacoes(true), { wrapper: comConsulta() });
    await waitFor(() => expect(result.current.indisponivel).toBe(true), { timeout: 5_000 });
  });

  it("o cache é por organização: trocar de organização não mostra as orientações da anterior", async () => {
    deps.get.mockResolvedValueOnce({
      data: { orientacoes: [{ installation_id: "a", titulo: "Da org 1" }], indisponivel: false },
    });
    const { result, rerender } = renderHook(() => useOrientacoes(true), { wrapper: comConsulta() });
    await waitFor(() => expect(result.current.itens.map((i) => i.rotulo)).toEqual(["Da org 1"]));
    deps.get.mockResolvedValueOnce({
      data: { orientacoes: [{ installation_id: "b", titulo: "Da org 2" }], indisponivel: false },
    });
    deps.orgId = "org-2";
    rerender();
    expect(result.current.itens.map((i) => i.rotulo)).not.toContain("Da org 1");
    await waitFor(() => expect(result.current.itens.map((i) => i.rotulo)).toEqual(["Da org 2"]));
    expect(deps.get).toHaveBeenCalledTimes(2);
  });
});
