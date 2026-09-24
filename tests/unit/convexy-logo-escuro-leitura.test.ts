// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { marcaDaInstalacao, type LinhaDaMarca } from "@/lib/branding/instalacao";
import { baseDoStorage, urlPublicaDoLogo } from "@/lib/branding/logo";
import { REGUA_DO_PRODUTO } from "@/lib/branding/regua-do-produto";
import {
  camadaDaInstalacao,
  camadaDaOrganizacao,
  camadaDoAmbiente,
  resolverMarca,
} from "@/lib/branding/resolve";
import { marcaDaSaida } from "@/lib/branding/saida";

/**
 * Convexy — o logo escuro atravessa a leitura só quando o logo exibido é o da
 * instalação (spec docs/superpowers/specs/2026-09-22-identidade-convexy-design.md,
 * 7.3.4). Registro: CONVEXY.md, "Logo escuro".
 */

vi.mock("@/lib/branding/instalacao", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/branding/instalacao")>()),
  marcaDaInstalacao: vi.fn(),
}));

const CLARO = "platform/33333333-3333-4333-8333-333333333333.png";
const ESCURO = "platform/55555555-5555-4555-8555-555555555555.png";
const ORG = "22222222-2222-4222-8222-222222222222";
const DA_ORG = `${ORG}/44444444-4444-4444-8444-444444444444.png`;
const DO_AMBIENTE = "https://cdn.exemplo.test/revenda.png";

const url = (caminho: string): string => urlPublicaDoLogo(caminho, baseDoStorage());

function linha(parcial: Partial<LinhaDaMarca>): LinhaDaMarca {
  return {
    app_name: "Convexy",
    logo_url: null,
    logo_path: null,
    logo_dark_path: null,
    accent_hex: null,
    show_powered_by: true,
    seeded_from_env: false,
    fallback_at: null,
    fallback_reason: null,
    ...parcial,
  };
}

beforeEach(() => {
  vi.mocked(marcaDaInstalacao).mockReset();
});

describe("a camada do banco da instalação", () => {
  it("controle: há base do Storage — sem ela todo caminho viraria null e os casos mediriam nada", () => {
    expect(baseDoStorage().length).toBeGreaterThan(0);
  });

  it("com o arquivo escuro gravado, a camada traz `logoDarkUrl`", () => {
    const camada = camadaDaInstalacao(linha({ logo_path: CLARO, logo_dark_path: ESCURO }));
    expect(camada.logoUrl).toBe(url(CLARO));
    expect(camada.logoDarkUrl).toBe(url(ESCURO));
  });

  it("sem o arquivo escuro (ou vazio), a chave nem aparece", () => {
    expect("logoDarkUrl" in camadaDaInstalacao(linha({ logo_path: CLARO }))).toBe(false);
    expect("logoDarkUrl" in camadaDaInstalacao(linha({ logo_path: CLARO, logo_dark_path: "  " }))).toBe(
      false,
    );
  });
});

describe("resolverMarca — o escuro acompanha o logo exibido", () => {
  it("logo da instalação com escuro → a marca resolvida traz os dois", () => {
    const marca = resolverMarca(
      [camadaDaInstalacao(linha({ logo_path: CLARO, logo_dark_path: ESCURO })), camadaDoAmbiente({})],
      REGUA_DO_PRODUTO,
    );
    expect(marca.logoUrl).toBe(url(CLARO));
    expect(marca.logoDarkUrl).toBe(url(ESCURO));
    expect(marca.origens.logoUrl).toBe("banco");
  });

  it("logo da ORGANIZAÇÃO por cima → nunca é trocado pelo escuro da instalação", () => {
    const marca = resolverMarca(
      [
        camadaDaOrganizacao({ logo_path: DA_ORG }),
        camadaDaInstalacao(linha({ logo_path: CLARO, logo_dark_path: ESCURO })),
        camadaDoAmbiente({}),
      ],
      REGUA_DO_PRODUTO,
    );
    expect(marca.logoUrl).toBe(url(DA_ORG));
    expect("logoDarkUrl" in marca, "o logo da organização ganhou o escuro da instalação").toBe(false);
  });

  it("organização SEM logo próprio → vale o logo da instalação, e o escuro junto", () => {
    const marca = resolverMarca(
      [
        camadaDaOrganizacao({ app_name: "Clínica Sorriso" }),
        camadaDaInstalacao(linha({ logo_path: CLARO, logo_dark_path: ESCURO })),
        camadaDoAmbiente({}),
      ],
      REGUA_DO_PRODUTO,
    );
    expect(marca.logoUrl).toBe(url(CLARO));
    expect(marca.logoDarkUrl).toBe(url(ESCURO));
  });

  it("logo do `.env` (instalação só com o escuro) → sem logo escuro", () => {
    const marca = resolverMarca(
      [camadaDaInstalacao(linha({ logo_dark_path: ESCURO })), camadaDoAmbiente({ APP_LOGO_URL: DO_AMBIENTE })],
      REGUA_DO_PRODUTO,
    );
    expect(marca.logoUrl).toBe(DO_AMBIENTE);
    expect("logoDarkUrl" in marca).toBe(false);
  });
});

describe("marcaDaSaida(null) — a tela de entrada recebe o escuro", () => {
  it("com o escuro gravado, a saída o traz ao lado do claro", async () => {
    vi.mocked(marcaDaInstalacao).mockResolvedValue(linha({ logo_path: CLARO, logo_dark_path: ESCURO }));
    const saida = await marcaDaSaida(null);
    expect(saida.logoUrl).toBe(url(CLARO));
    expect(saida.logoDarkUrl).toBe(url(ESCURO));
  });

  it("sem o escuro, a saída é a de antes (a chave nem aparece)", async () => {
    vi.mocked(marcaDaInstalacao).mockResolvedValue(linha({ logo_path: CLARO }));
    const saida = await marcaDaSaida(null);
    expect(saida.logoUrl).toBe(url(CLARO));
    expect("logoDarkUrl" in saida).toBe(false);
  });
});
