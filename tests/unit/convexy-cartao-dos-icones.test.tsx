import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — o cartão "Ícones da marca" de /admin/marca (CONVEXY.md, "Símbolo e
 * ícone da aba"): o ícone da aba do original, o ícone escuro e o símbolo, juntos.
 * Cada campo da Convexy envia pela rota de logo com a peça certa, mostra a
 * prévia do que gravou e remove pelo mesmo caminho.
 */
const deps = vi.hoisted(() => ({ refresh: vi.fn(), sucesso: vi.fn(), erro: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: deps.refresh }) }));
vi.mock("sonner", () => ({ toast: { success: deps.sucesso, error: deps.erro } }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (chave: string) => chave }));

import { CartaoDosIcones } from "@/components/convexy/marca/CartaoDosIcones";

const URL_GRAVADA = "https://storage.exemplo.test/brand-logos/platform/peca.png";
const fetchFalso = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchFalso);
});
afterEach(() => vi.unstubAllGlobals());

const resposta = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

const cartao = (props: Partial<Parameters<typeof CartaoDosIcones>[0]> = {}) =>
  render(<CartaoDosIcones iconeDaAba={null} iconeEscuro={null} simbolo={null} {...props} />);

describe("cartão Ícones da marca", () => {
  it("junta o ícone da aba do original, o ícone escuro e o símbolo", () => {
    cartao();
    const noCartao = within(document.querySelector("[data-cartao-dos-icones]") as HTMLElement);
    expect(noCartao.getByRole("heading", { name: "Ícones da marca" })).toBeInTheDocument();
    expect(noCartao.getByLabelText("Ícone da aba (favicon)")).toBeInTheDocument();
    expect(noCartao.getByLabelText("Ícone da aba no modo escuro (opcional)")).toBeInTheDocument();
    expect(noCartao.getByLabelText("Símbolo (menu recolhido)")).toBeInTheDocument();
  });

  it.each([
    { rotulo: "Ícone da aba no modo escuro (opcional)", peca: "icone", tema: "escuro", ok: "Ícone escuro atualizado." },
    { rotulo: "Símbolo (menu recolhido)", peca: "simbolo", tema: null, ok: "Símbolo atualizado." },
  ])("$rotulo: envia a peça da instalação e mostra a prévia", async ({ rotulo, peca, tema, ok }) => {
    fetchFalso.mockResolvedValue(resposta(200, { data: { logo_path: "platform/x.png", logo_url: URL_GRAVADA } }));
    cartao();
    const arquivo = new File(["x"], "peca.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(rotulo), { target: { files: [arquivo] } });

    await waitFor(() => expect(deps.sucesso).toHaveBeenCalledWith(ok));
    const [url, opcoes] = fetchFalso.mock.calls[0]!;
    expect(url).toBe("/api/v1/marca/logo");
    const corpo = (opcoes as RequestInit).body as FormData;
    expect(corpo.get("escopo")).toBe("instalacao");
    expect(corpo.get("peca")).toBe(peca);
    expect(corpo.get("tema")).toBe(tema);
    expect(corpo.get("file")).toBe(arquivo);
    expect(document.querySelector('[data-previa-do-icone-da-marca="arquivo"] img')).toHaveAttribute("src", URL_GRAVADA);
    expect(deps.refresh).toHaveBeenCalled();
  });

  it("remover o ícone escuro pede o DELETE da peça e tira a prévia", async () => {
    fetchFalso.mockResolvedValue(resposta(200, { data: { logo_path: null, logo_url: null } }));
    cartao({ iconeEscuro: URL_GRAVADA });
    fireEvent.click(screen.getByRole("button", { name: "Remover ícone escuro" }));
    await waitFor(() => expect(deps.sucesso).toHaveBeenCalledWith("Ícone escuro removido."));
    expect(fetchFalso).toHaveBeenCalledWith("/api/v1/marca/logo?escopo=instalacao&peca=icone&tema=escuro", {
      method: "DELETE",
    });
    expect(document.querySelector('[data-previa-do-icone-da-marca="arquivo"]')).toBeNull();
  });

  it("recusa da rota aparece com a mensagem dela, e a prévia não muda", async () => {
    fetchFalso.mockResolvedValue(resposta(413, { error: { code: "payload_too_large", message: "O logo precisa ter até 512 KB." } }));
    cartao();
    fireEvent.change(screen.getByLabelText("Símbolo (menu recolhido)"), {
      target: { files: [new File(["x"], "grande.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(deps.erro).toHaveBeenCalledWith("O logo precisa ter até 512 KB."));
    expect(document.querySelector('[data-previa-do-icone-da-marca="arquivo"]')).toBeNull();
    expect(deps.refresh).not.toHaveBeenCalled();
  });
});
