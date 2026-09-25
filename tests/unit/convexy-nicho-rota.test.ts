// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — GET e PATCH /api/v1/admin/tenants/[id]/nicho (spec 6.1). Na ordem da
 * spec: admin de plataforma (com MFA), guarda de suporte ANTES do efeito, Zod
 * (id e corpo). Grava só se o valor no banco ainda é o lido (409 senão) e audita
 * `tenant.nicho_changed` com o antes e o depois.
 */
const ORG = "22222222-2222-4222-8222-222222222222";

const deps = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  requireSupportWrite: vi.fn(),
  audit: vi.fn(),
  linha: null as { id: string; slug: string; nicho: string | null } | null,
  erroDeLeitura: null as { message: string } | null,
  gravadas: [] as Array<{ id: string }>,
  cadeias: [] as Array<Array<[string, ...unknown[]]>>,
  ordem: [] as string[],
}));

vi.mock("@/lib/auth/requirePlatformAdmin", () => ({ requirePlatformAdmin: deps.requirePlatformAdmin }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: deps.requireSupportWrite }));
vi.mock("@/lib/audit", () => ({ audit: deps.audit }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const registro: Array<[string, ...unknown[]]> = [];
      deps.cadeias.push(registro);
      const cadeia: Record<string, unknown> = {};
      for (const metodo of ["select", "eq", "is", "update"]) {
        cadeia[metodo] = (...args: unknown[]) => {
          registro.push([metodo, ...args]);
          if (metodo === "update") deps.ordem.push("update");
          return cadeia;
        };
      }
      cadeia.maybeSingle = async () =>
        deps.erroDeLeitura ? { data: null, error: deps.erroDeLeitura } : { data: deps.linha, error: null };
      cadeia.then = (resolver: (valor: unknown) => unknown) =>
        Promise.resolve({ data: deps.gravadas, error: null }).then(resolver);
      return cadeia;
    },
  }),
}));

import { GET, PATCH } from "@/app/api/v1/admin/tenants/[id]/nicho/route";

function pedido(corpo: unknown, id = ORG): NextRequest {
  return new NextRequest(`http://localhost/api/v1/admin/tenants/${id}/nicho`, {
    method: "PATCH",
    body: JSON.stringify(corpo),
    headers: { "content-type": "application/json" },
  });
}
const contexto = (id = ORG) => ({ params: Promise.resolve({ id }) });
const atualizacao = () => deps.cadeias.find((c) => c.some(([m]) => m === "update")) ?? [];

beforeEach(() => {
  vi.clearAllMocks();
  deps.cadeias.length = 0;
  deps.ordem.length = 0;
  deps.linha = { id: ORG, slug: "org", nicho: null };
  deps.erroDeLeitura = null;
  deps.gravadas = [{ id: ORG }];
  deps.requirePlatformAdmin.mockImplementation(async () => {
    deps.ordem.push("admin");
    return { user: { id: "dono-1" } };
  });
  deps.requireSupportWrite.mockImplementation(async () => {
    deps.ordem.push("suporte");
    return null;
  });
});

describe("PATCH /api/v1/admin/tenants/[id]/nicho", () => {
  it("grava só se o nicho ainda é o lido, audita antes e depois, guardas antes do efeito", async () => {
    const res = await PATCH(pedido({ nicho: "clinica" }), contexto());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: ORG, nicho: "clinica" } });
    expect(deps.ordem).toEqual(["admin", "suporte", "update"]);
    expect(deps.requireSupportWrite).toHaveBeenCalledWith(ORG);
    expect(atualizacao()).toEqual([
      ["update", expect.objectContaining({ nicho: "clinica" })],
      ["eq", "id", ORG],
      ["is", "nicho", null],
      ["select", "id"],
    ]);
    expect(deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "tenant.nicho_changed",
        actorUserId: "dono-1",
        actingAsPlatformAdmin: true,
        organizationId: ORG,
        resourceType: "organization",
        resourceId: ORG,
        metadata: { tenant_slug: "org", de: null, para: "clinica" },
      }),
    );
  });

  it("com nicho anterior, a condição é o valor lido", async () => {
    deps.linha = { id: ORG, slug: "org", nicho: "servicos" };
    await PATCH(pedido({ nicho: "clinica" }), contexto());
    expect(atualizacao()).toContainEqual(["eq", "nicho", "servicos"]);
  });

  it("o valor mudou entre a leitura e a escrita: 409, sem auditoria", async () => {
    deps.gravadas = [];
    const res = await PATCH(pedido({ nicho: "clinica" }), contexto());
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("state_conflict");
    expect(deps.audit).not.toHaveBeenCalled();
  });

  it("quem não é admin de plataforma recebe 403 e nada é lido nem gravado", async () => {
    deps.requirePlatformAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const res = await PATCH(pedido({ nicho: "clinica" }), contexto());
    expect(res.status).toBe(403);
    expect(deps.cadeias).toEqual([]);
    expect(deps.requireSupportWrite).not.toHaveBeenCalled();
  });

  it("acompanhamento somente leitura barra antes do efeito", async () => {
    deps.requireSupportWrite.mockResolvedValue(
      Response.json({ error: { code: "forbidden", message: "somente leitura" } }, { status: 403 }),
    );
    const res = await PATCH(pedido({ nicho: "clinica" }), contexto());
    expect(res.status).toBe(403);
    expect(deps.cadeias).toEqual([]);
  });

  it("id que não é uuid é 400, antes de abrir o client admin", async () => {
    const res = await PATCH(pedido({ nicho: "clinica" }, "nao-e-uuid"), contexto("nao-e-uuid"));
    expect(res.status).toBe(400);
    expect(deps.cadeias).toEqual([]);
  });

  it("nicho fora do vocabulário, ausente ou com campo a mais é 400", async () => {
    for (const corpo of [{ nicho: "dentista" }, {}, { nicho: "clinica", outro: 1 }]) {
      expect((await PATCH(pedido(corpo), contexto())).status).toBe(400);
    }
    expect(deps.ordem).not.toContain("update");
  });

  it("organização que não existe é 404", async () => {
    deps.linha = null;
    expect((await PATCH(pedido({ nicho: "clinica" }), contexto())).status).toBe(404);
    expect(deps.ordem).not.toContain("update");
  });

  it("erro ao ler a organização é 500 (como no GET), não 404, e nada é gravado", async () => {
    deps.erroDeLeitura = { message: "column does not exist" };
    const res = await PATCH(pedido({ nicho: "clinica" }), contexto());
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("internal_error");
    expect(deps.ordem).not.toContain("update");
    expect(deps.audit).not.toHaveBeenCalled();
  });

  it("o mesmo valor não grava nem audita — não houve mudança", async () => {
    deps.linha = { id: ORG, slug: "org", nicho: "servicos" };
    expect((await PATCH(pedido({ nicho: "servicos" }), contexto())).status).toBe(200);
    expect(deps.ordem).not.toContain("update");
    expect(deps.audit).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/admin/tenants/[id]/nicho", () => {
  const leitura = (id = ORG) => GET(new NextRequest(`http://localhost/api/v1/admin/tenants/${id}/nicho`), contexto(id));

  it("devolve o nicho em vigor (nulo vale genérico)", async () => {
    const res = await leitura();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: ORG, nicho: "generico" } });
  });

  it("só admin de plataforma, e só com id válido", async () => {
    deps.requirePlatformAdmin.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    expect((await leitura()).status).toBe(403);
    expect((await leitura("nao-e-uuid")).status).toBe(400);
    deps.linha = null;
    expect((await leitura()).status).toBe(404);
  });
});
