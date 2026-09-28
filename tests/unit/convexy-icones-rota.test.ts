// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — as peças que o fork acrescenta à rota de logo do original (CONVEXY.md,
 * "Símbolo e ícone da aba"): `peca=simbolo` (migration 9002) e `peca=icone` com
 * `tema=escuro` (migration 9003). Só a instalação tem as duas: a organização é
 * recusada antes de qualquer upload, banco ou remoção. Molde:
 * app/api/v1/marca/logo/route.test.ts.
 */
const mocks = vi.hoisted(() => ({
  user: { id: "11111111-1111-4111-8111-111111111111", is_platform_admin: true },
  rpc: vi.fn(),
  upsert: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  audit: vi.fn(),
  select: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({
  loadAuthUser: async () => mocks.user,
  resolveActiveOrg: async () => ({ orgId: "22222222-2222-4222-8222-222222222222", role: "admin" }),
  mfaEmDivida: async () => false,
}));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: async () => null }));
vi.mock("@/lib/ai/dispatcher/rate-limit", () => ({ checkRateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/branding/instalacao", () => ({ invalidarMarcaDaInstalacao: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: mocks.rpc,
    from: () => ({
      select: (colunas: string) => {
        mocks.select(colunas);
        return { eq: () => ({ maybeSingle: async () => ({ data: null }) }) };
      },
      upsert: mocks.upsert,
    }),
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
  }),
}));

import { DELETE, POST } from "@/app/api/v1/marca/logo/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.audit.mockResolvedValue(undefined);
});

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);

function post(campos: Record<string, string>) {
  const form = new FormData();
  for (const [chave, valor] of Object.entries(campos)) form.set(chave, valor);
  form.set("file", new File([PNG], "peca.png", { type: "image/png" }));
  return POST(new NextRequest("http://localhost/api/v1/marca/logo", { method: "POST", body: form }));
}
const apagar = (busca: string) => DELETE(new NextRequest(`http://localhost/api/v1/marca/logo?${busca}`));

const PECAS = [
  { nome: "símbolo", campos: { peca: "simbolo" }, coluna: "simbolo_path" },
  { nome: "ícone escuro", campos: { peca: "icone", tema: "escuro" }, coluna: "favicon_dark_path" },
] as const;

describe.each(PECAS)("$nome da instalação", ({ campos, coluna }) => {
  it("grava só a coluna dela, lendo o anterior da mesma coluna, e audita o campo", async () => {
    expect((await post({ escopo: "instalacao", ...campos })).status).toBe(200);
    expect(mocks.select).toHaveBeenCalledWith(coluna);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, [coluna]: expect.stringMatching(/^platform\//) }),
      { onConflict: "id" },
    );
    const gravado = mocks.upsert.mock.calls[0]![0] as Record<string, unknown>;
    for (const outra of ["logo_path", "logo_dark_path", "favicon_path", "simbolo_path", "favicon_dark_path"]) {
      if (outra !== coluna) expect(gravado).not.toHaveProperty(outra);
    }
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform_branding.updated",
        metadata: expect.objectContaining({ fields_changed: [coluna], peca: campos.peca }),
      }),
    );
  });

  it("remover apaga só o ponteiro dela", async () => {
    const busca = new URLSearchParams({ escopo: "instalacao", ...campos });
    expect((await apagar(busca.toString())).status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith({ id: 1, [coluna]: null, seeded_from_env: false }, { onConflict: "id" });
  });

  it("organização não tem: 422 antes de upload, banco ou remoção", async () => {
    expect((await post({ escopo: "organizacao", ...campos })).status).toBe(422);
    expect((await apagar(new URLSearchParams({ escopo: "organizacao", ...campos }).toString())).status).toBe(422);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("admin de organização não troca a peça da instalação", async () => {
    mocks.user.is_platform_admin = false;
    try {
      expect((await post({ escopo: "instalacao", ...campos })).status).toBe(403);
      expect(mocks.upload).not.toHaveBeenCalled();
    } finally {
      mocks.user.is_platform_admin = true;
    }
  });
});

describe("combinações recusadas", () => {
  it("símbolo não tem versão por tema: 422 sem efeito", async () => {
    expect((await post({ escopo: "instalacao", peca: "simbolo", tema: "escuro" })).status).toBe(422);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("o ícone claro continua sendo o do original (controle)", async () => {
    expect((await post({ escopo: "instalacao", peca: "icone" })).status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, favicon_path: expect.stringMatching(/^platform\//) }),
      { onConflict: "id" },
    );
  });
});
