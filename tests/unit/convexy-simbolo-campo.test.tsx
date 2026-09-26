import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — o campo do símbolo em Admin › Marca (CONVEXY.md, "Símbolo da
 * marca"). Envia pela rota de logo do original com `tema=simbolo` e escopo da
 * instalação, mostra a prévia no tamanho do menu e remove pelo mesmo caminho.
 */
const deps = vi.hoisted(() => ({ refresh: vi.fn(), sucesso: vi.fn(), erro: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: deps.refresh }) }));
vi.mock("sonner", () => ({ toast: { success: deps.sucesso, error: deps.erro } }));

import { CampoDoSimbolo } from "@/components/convexy/marca/CampoDoSimbolo";

const URL_GRAVADA = "https://storage.exemplo.test/brand-logos/platform/simbolo.png";
const fetchFalso = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchFalso);
});
afterEach(() => vi.unstubAllGlobals());

const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

describe("símbolo da marca no admin", () => {
  it("envia o arquivo como símbolo da instalação e mostra a prévia nas duas superfícies", async () => {
    fetchFalso.mockResolvedValue(resposta(200, { data: { logo_path: "platform/x.png", logo_url: URL_GRAVADA } }));
    render(<CampoDoSimbolo simboloUrl={null} />);
    expect(document.querySelector("[data-previa-do-simbolo]")).toBeNull();

    const arquivo = new File(["x"], "simbolo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Símbolo (menu recolhido)"), { target: { files: [arquivo] } });

    await waitFor(() => expect(deps.sucesso).toHaveBeenCalledWith("Símbolo atualizado."));
    const [url, opcoes] = fetchFalso.mock.calls[0]!;
    expect(url).toBe("/api/v1/marca/logo");
    const corpo = (opcoes as RequestInit).body as FormData;
    expect(corpo.get("escopo")).toBe("instalacao");
    expect(corpo.get("tema")).toBe("simbolo");
    expect(corpo.get("file")).toBe(arquivo);
    const previas = [...document.querySelectorAll("[data-previa-do-simbolo] img")];
    expect(previas.map((img) => img.getAttribute("src"))).toEqual([URL_GRAVADA, URL_GRAVADA]);
    expect(deps.refresh).toHaveBeenCalled();
  });

  it("remover pede o DELETE do símbolo e tira a prévia", async () => {
    fetchFalso.mockResolvedValue(resposta(200, { data: { logo_path: null, logo_url: null } }));
    render(<CampoDoSimbolo simboloUrl={URL_GRAVADA} />);
    fireEvent.click(screen.getByRole("button", { name: "Remover símbolo" }));
    await waitFor(() => expect(deps.sucesso).toHaveBeenCalledWith("Símbolo removido."));
    expect(fetchFalso).toHaveBeenCalledWith("/api/v1/marca/logo?escopo=instalacao&tema=simbolo", { method: "DELETE" });
    expect(document.querySelector("[data-previa-do-simbolo]")).toBeNull();
  });

  it("recusa da rota aparece com a mensagem dela, e a prévia não muda", async () => {
    fetchFalso.mockResolvedValue(resposta(413, { error: { code: "payload_too_large", message: "O logo precisa ter até 512 KB." } }));
    render(<CampoDoSimbolo simboloUrl={null} />);
    fireEvent.change(screen.getByLabelText("Símbolo (menu recolhido)"), {
      target: { files: [new File(["x"], "grande.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(deps.erro).toHaveBeenCalledWith("O logo precisa ter até 512 KB."));
    expect(document.querySelector("[data-previa-do-simbolo]")).toBeNull();
    expect(deps.refresh).not.toHaveBeenCalled();
  });
});
