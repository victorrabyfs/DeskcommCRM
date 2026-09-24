import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { CampoDeLogo } from "@/components/branding/CampoDeLogo";

/**
 * Convexy — o campo do logo na variante ESCURA (spec
 * docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, 7.3.3).
 * Prova: ids e atributos próprios (os do claro seguem únicos para os e2e do
 * original), prévia própria sem chip claro, e a variante indo à rota no POST e no
 * DELETE. Registro: CONVEXY.md, "Logo escuro".
 */

const URL_ESCURO = "http://127.0.0.1:54321/storage/v1/object/public/brand-logos/platform/escuro.png";

const fetchMock = vi.fn();

function respostaOk(corpo: unknown): Response {
  return { ok: true, json: async () => corpo } as unknown as Response;
}

function pintar(props: Partial<Parameters<typeof CampoDeLogo>[0]> = {}) {
  return render(
    <CampoDeLogo
      escopo="instalacao"
      variante="escuro"
      logoDaCamada={{ url: null }}
      logoHerdado={null}
      origemDoHerdado="do arquivo de instalação do servidor"
      nomeEmVigor="Convexy"
      {...props}
    />,
  );
}

function escolherArquivo(seletor: string) {
  const entrada = document.querySelector<HTMLInputElement>(seletor)!;
  const arquivo = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "logo.png", {
    type: "image/png",
  });
  fireEvent.change(entrada, { target: { files: [arquivo] } });
}

beforeEach(() => {
  fetchMock.mockReset();
  refreshMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CampoDeLogo variante=escuro", () => {
  it("usa id e âncora próprios — os do logo claro ficam livres", () => {
    pintar();
    expect(document.querySelector("#logo-instalacao-escuro")).not.toBeNull();
    expect(document.querySelector("[data-campo-de-logo='instalacao-escuro'][data-hidratado]")).not.toBeNull();
    expect(document.querySelector("#logo-instalacao")).toBeNull();
    expect(document.querySelector("[data-campo-de-logo='instalacao']")).toBeNull();
    expect(screen.getByText("Logo para o tema escuro")).toBeTruthy();
  });

  it("controle: sem `variante`, o campo é o de sempre", () => {
    render(
      <CampoDeLogo
        escopo="instalacao"
        logoDaCamada={{ url: null }}
        logoHerdado={null}
        origemDoHerdado="do arquivo de instalação do servidor"
        nomeEmVigor="Convexy"
      />,
    );
    expect(document.querySelector("#logo-instalacao")).not.toBeNull();
    expect(document.querySelector("[data-campo-de-logo='instalacao']")).not.toBeNull();
    expect(document.querySelector("[data-previa-do-logo='escuro']")).not.toBeNull();
  });

  it("a prévia escura mostra o logo cru, sem chip claro, fora das caixas do logo claro", () => {
    pintar({ logoDaCamada: { url: URL_ESCURO } });
    expect(document.querySelectorAll("[data-previa-do-logo]")).toHaveLength(0);
    const img = document.querySelector<HTMLImageElement>("[data-previa-do-logo-escuro] img");
    expect(img?.getAttribute("src")).toBe(URL_ESCURO);
    expect(img?.parentElement?.hasAttribute("data-previa-do-logo-escuro")).toBe(true);
    expect(document.querySelector("[class*='bg-white']")).toBeNull();
    expect(screen.getByRole("button", { name: /^remover$/i })).toBeTruthy();
  });

  it("sem logo escuro, diz que o sistema segue com o claro na moldura — e não desenha imagem", () => {
    pintar();
    expect(
      screen.getByText("Sem logo para o tema escuro, o sistema mostra o logo claro sobre uma moldura branca."),
    ).toBeTruthy();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("o upload leva variante=escuro, e a prévia mostra o arquivo sem esperar o refresh", async () => {
    fetchMock.mockResolvedValue(respostaOk({ data: { logo_path: "platform/escuro.png", logo_url: URL_ESCURO } }));
    pintar();
    escolherArquivo("#logo-instalacao-escuro");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/marca/logo");
    const corpo = init.body as FormData;
    expect(corpo.get("escopo")).toBe("instalacao");
    expect(corpo.get("variante")).toBe("escuro");
    await waitFor(() =>
      expect(document.querySelector("[data-previa-do-logo-escuro] img")?.getAttribute("src")).toBe(URL_ESCURO),
    );
  });

  it("remover leva variante=escuro na query do DELETE", async () => {
    fetchMock.mockResolvedValue(respostaOk({ data: { logo_path: null, logo_url: null } }));
    pintar({ logoDaCamada: { url: URL_ESCURO } });
    fireEvent.click(screen.getByRole("button", { name: /^remover$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/marca/logo?escopo=instalacao&variante=escuro");
    expect(init.method).toBe("DELETE");
  });

  it("controle: o campo claro leva variante=claro", async () => {
    fetchMock.mockResolvedValue(respostaOk({ data: { logo_path: "platform/claro.png", logo_url: URL_ESCURO } }));
    render(
      <CampoDeLogo
        escopo="instalacao"
        logoDaCamada={{ url: null }}
        logoHerdado={null}
        origemDoHerdado="do arquivo de instalação do servidor"
        nomeEmVigor="Convexy"
      />,
    );
    escolherArquivo("#logo-instalacao");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.body as FormData).get("variante")).toBe("claro");
  });
});
