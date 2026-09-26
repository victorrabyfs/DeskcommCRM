// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — o tema `simbolo` da rota de logo do original (CONVEXY.md, "Símbolo
 * da marca"; migration 9002). Só a instalação tem símbolo: a organização é
 * recusada antes de qualquer upload, banco ou remoção. Molde:
 * tests/unit/logo-por-tema-rota.test.ts.
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

function post(escopo: string) {
  const form = new FormData();
  form.set("escopo", escopo);
  form.set("tema", "simbolo");
  form.set("file", new File([PNG], "simbolo.png", { type: "image/png" }));
  return POST(new NextRequest("http://localhost/api/v1/marca/logo", { method: "POST", body: form }));
}

describe("símbolo da instalação", () => {
  it("grava só `simbolo_path`, lendo o anterior da mesma coluna, e audita o campo", async () => {
    expect((await post("instalacao")).status).toBe(200);
    expect(mocks.select).toHaveBeenCalledWith("simbolo_path");
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, simbolo_path: expect.stringMatching(/^platform\//) }),
      { onConflict: "id" },
    );
    const gravado = mocks.upsert.mock.calls[0]![0] as Record<string, unknown>;
    expect(gravado).not.toHaveProperty("logo_path");
    expect(gravado).not.toHaveProperty("logo_dark_path");
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform_branding.updated",
        metadata: expect.objectContaining({ fields_changed: ["simbolo_path"], tema: "simbolo" }),
      }),
    );
  });

  it("remover apaga só o ponteiro do símbolo", async () => {
    const resposta = await DELETE(new NextRequest("http://localhost/api/v1/marca/logo?escopo=instalacao&tema=simbolo"));
    expect(resposta.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith({ id: 1, simbolo_path: null, seeded_from_env: false }, { onConflict: "id" });
  });

  it("organização não tem símbolo: 422 antes de upload, banco ou remoção", async () => {
    expect((await post("organizacao")).status).toBe(422);
    const remocao = await DELETE(
      new NextRequest("http://localhost/api/v1/marca/logo?escopo=organizacao&tema=simbolo"),
    );
    expect(remocao.status).toBe(422);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("admin de organização não troca o símbolo da instalação", async () => {
    mocks.user.is_platform_admin = false;
    try {
      expect((await post("instalacao")).status).toBe(403);
      expect(mocks.upload).not.toHaveBeenCalled();
    } finally {
      mocks.user.is_platform_admin = true;
    }
  });
});
