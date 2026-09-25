import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: deps.get } }));

import { useOrientacoes } from "@/components/convexy/menu/useOrientacoes";

/** Convexy — as orientações são carregadas quando a porta Contatos abre (spec 3.4). */
function comConsulta() {
  const cliente = new QueryClient();
  return function Envoltorio({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => vi.clearAllMocks());

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
});
