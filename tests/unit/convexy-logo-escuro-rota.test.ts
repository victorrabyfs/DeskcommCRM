// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import type { AuthUser } from "@/lib/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Convexy — a rota do logo com `variante` (spec
 * docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, 7.3.2).
 * Mesmo desenho de app/api/v1/marca/logo/route.test.ts: espião no client do
 * Supabase, porque o que se prova é QUAL coluna a rota lê, grava e apaga —
 * decisão em TypeScript, não em SQL (a forma da coluna é o invariante da 9001).
 * Registro: CONVEXY.md, "Logo escuro".
 */

vi.mock("@/lib/auth/server", () => ({
  loadAuthUser: vi.fn(),
  resolveActiveOrg: vi.fn(),
  mfaEmDivida: vi.fn(async () => false),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/ai/dispatcher/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const ORG_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOGO_CLARO = "platform/33333333-3333-4333-8333-333333333333.png";
const LOGO_ESCURO_ANTIGO = "platform/55555555-5555-4555-8555-555555555555.png";

/** Os 8 bytes que `farejarTipo` exige para reconhecer PNG. */
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

function arquivoPng(): File {
  return new File([PNG_BYTES], "logo.png", { type: "image/png" });
}

/** Espião: registra tabela, colunas lidas, upserts, RPCs e remoções do Storage. */
function criarAdminEspiao(linha: Record<string, string | null>) {
  const fromChamadas: string[] = [];
  const colunasLidas: string[] = [];
  const gravacoes: Array<Record<string, unknown>> = [];
  const rpcChamadas: string[] = [];
  const removidos: string[] = [];

  const client = {
    from: (tabela: string) => {
      fromChamadas.push(tabela);
      const builder = {
        select: (colunas: string) => {
          colunasLidas.push(colunas);
          return builder;
        },
        eq: () => builder,
        maybeSingle: async () => ({
          data: tabela === "platform_branding" ? linha : null,
          error: null,
        }),
        upsert: async (valores: Record<string, unknown>) => {
          gravacoes.push(valores);
          return { error: null };
        },
      };
      return builder;
    },
    rpc: async (nome: string) => {
      rpcChamadas.push(nome);
      return { data: 1, error: null };
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        remove: async (caminhos: string[]) => {
          removidos.push(...caminhos);
          return { error: null };
        },
      }),
    },
  };

  return { client, fromChamadas, colunasLidas, gravacoes, rpcChamadas, removidos };
}

function donoDoServidor(): AuthUser {
  return {
    id: USER_ID,
    email: "dono@instalacao.test",
    full_name: null,
    avatar_url: null,
    is_platform_admin: true,
    idioma: "pt-BR",
    organizations: [],
  } as AuthUser;
}

function adminDeOrganizacao(): AuthUser {
  return {
    id: USER_ID,
    email: "admin@org.test",
    full_name: null,
    avatar_url: null,
    is_platform_admin: false,
    idioma: "pt-BR",
    organizations: [{ organization_id: ORG_ID, organization_name: "Org", role: "admin" }],
  } as AuthUser;
}

function formulario(campos: Record<string, string>): FormData {
  const form = new FormData();
  for (const [chave, valor] of Object.entries(campos)) form.set(chave, valor);
  form.set("file", arquivoPng());
  return form;
}

async function postar(form: FormData): Promise<Response> {
  const { POST } = await import("@/app/api/v1/marca/logo/route");
  return POST(new NextRequest("http://localhost/api/v1/marca/logo", { method: "POST", body: form }));
}

async function apagar(query: string): Promise<Response> {
  const { DELETE } = await import("@/app/api/v1/marca/logo/route");
  return DELETE(new NextRequest(`http://localhost/api/v1/marca/logo?${query}`, { method: "DELETE" }));
}

function metadadosDaAuditoria(): Record<string, unknown> | undefined {
  const chamada = vi.mocked(audit).mock.calls[0]?.[0] as { metadata?: Record<string, unknown> } | undefined;
  return chamada?.metadata;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveActiveOrg).mockResolvedValue({ orgId: ORG_ID, name: "Org", role: "admin" } as never);
});

describe("POST /api/v1/marca/logo com variante=escuro", () => {
  it("lê, grava e apaga SÓ a coluna do escuro — o logo claro não é tocado", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(donoDoServidor());
    const espiao = criarAdminEspiao({ logo_path: LOGO_CLARO, logo_dark_path: LOGO_ESCURO_ANTIGO });
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await postar(formulario({ escopo: "instalacao", variante: "escuro" }));

    expect(res.status, await res.clone().text()).toBe(200);
    expect(espiao.colunasLidas).toEqual(["logo_dark_path"]);
    expect(espiao.gravacoes).toHaveLength(1);
    const gravado = espiao.gravacoes[0]!;
    expect(gravado).toMatchObject({ id: 1, seeded_from_env: false });
    expect(String(gravado.logo_dark_path)).toMatch(/^platform\/[0-9a-f-]{36}\.png$/);
    expect(gravado, "o upload do escuro gravou na coluna do claro").not.toHaveProperty("logo_path");
    expect(espiao.removidos, "apagou outro arquivo que não o escuro anterior").toEqual([
      LOGO_ESCURO_ANTIGO,
    ]);
    expect(espiao.rpcChamadas).toEqual([]);
    expect(metadadosDaAuditoria()).toEqual({ fields_changed: ["logo_dark_path"], logo_definido: true });
    const corpo = (await res.json()) as { data: { logo_path: string; logo_url: string } };
    expect(corpo.data.logo_path).toBe(gravado.logo_dark_path);
    expect(corpo.data.logo_url).toContain("/storage/v1/object/public/brand-logos/platform/");
  });

  it("controle: SEM o campo, vale o claro — o pedido de sempre não muda", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(donoDoServidor());
    const espiao = criarAdminEspiao({ logo_path: LOGO_CLARO, logo_dark_path: LOGO_ESCURO_ANTIGO });
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await postar(formulario({ escopo: "instalacao" }));

    expect(res.status, await res.clone().text()).toBe(200);
    expect(espiao.colunasLidas).toEqual(["logo_path"]);
    expect(espiao.gravacoes[0]).toHaveProperty("logo_path");
    expect(espiao.gravacoes[0]).not.toHaveProperty("logo_dark_path");
    expect(espiao.removidos).toEqual([LOGO_CLARO]);
    expect(metadadosDaAuditoria()).toEqual({ fields_changed: ["logo_path"], logo_definido: true });
  });

  it("variante=escuro com escopo=organizacao é recusada com 422, antes de tocar banco ou Storage", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(adminDeOrganizacao());
    const espiao = criarAdminEspiao({});
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await postar(formulario({ escopo: "organizacao", variante: "escuro" }));

    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("validation_failed");
    expect(espiao.fromChamadas).toEqual([]);
    expect(espiao.rpcChamadas).toEqual([]);
    expect(espiao.removidos).toEqual([]);
  });

  it("variante fora da allowlist é recusada com 422", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(donoDoServidor());
    const espiao = criarAdminEspiao({});
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await postar(formulario({ escopo: "instalacao", variante: "roxo" }));

    expect(res.status).toBe(422);
    expect(espiao.gravacoes).toEqual([]);
  });
});

describe("DELETE /api/v1/marca/logo com variante=escuro", () => {
  it("zera só o escuro e apaga só o arquivo do escuro", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(donoDoServidor());
    const espiao = criarAdminEspiao({ logo_path: LOGO_CLARO, logo_dark_path: LOGO_ESCURO_ANTIGO });
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await apagar("escopo=instalacao&variante=escuro");

    expect(res.status, await res.clone().text()).toBe(200);
    expect(espiao.colunasLidas).toEqual(["logo_dark_path"]);
    expect(espiao.gravacoes).toEqual([{ id: 1, logo_dark_path: null, seeded_from_env: false }]);
    expect(espiao.removidos).toEqual([LOGO_ESCURO_ANTIGO]);
    expect(metadadosDaAuditoria()).toEqual({ fields_changed: ["logo_dark_path"], logo_definido: false });
  });

  it("variante=escuro com escopo=organizacao é recusada com 422", async () => {
    vi.mocked(loadAuthUser).mockResolvedValue(adminDeOrganizacao());
    const espiao = criarAdminEspiao({});
    vi.mocked(createAdminClient).mockReturnValue(espiao.client as never);

    const res = await apagar("escopo=organizacao&variante=escuro");

    expect(res.status).toBe(422);
    expect(espiao.fromChamadas).toEqual([]);
    expect(espiao.rpcChamadas).toEqual([]);
  });
});
