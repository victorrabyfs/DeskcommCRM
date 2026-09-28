// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — GET /api/v1/convexy/prospeccao/[id]/planilha (CONVEXY.md, "Prospecção:
 * etiqueta, origem e planilha"): só admin, a organização da sessão filtra as duas
 * consultas, e baixar a planilha fica na auditoria.
 */
const ORG = "22222222-2222-4222-8222-222222222222";
const CAMPANHA = "33333333-3333-4333-8333-333333333333";
const mocks = vi.hoisted(() => ({
  papel: { ok: true } as { ok: boolean; response?: Response },
  query: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: async () =>
    mocks.papel.ok
      ? { ok: true, user: { id: "11111111-1111-4111-8111-111111111111" }, org: { orgId: ORG } }
      : { ok: false, response: mocks.papel.response },
}));
vi.mock("@/lib/agent-engine/db/request-pool", () => ({ getRequestPool: () => ({ query: mocks.query }) }));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));

import { GET } from "@/app/api/v1/convexy/prospeccao/[id]/planilha/route";

const pedir = (id: string) =>
  GET(new NextRequest(`http://localhost/api/v1/convexy/prospeccao/${id}/planilha`), {
    params: Promise.resolve({ id }),
  });

const EMPRESA = {
  key: "p1",
  name: "Clínica Sorriso",
  phone: "+5511999998888",
  website: null,
  category: "Dentista",
  address: "Rua A, 10",
  maps_url: null,
  rating: 4.8,
  reviews: 10,
  emails: [],
  socials: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papel = { ok: true };
  mocks.query.mockImplementation(async (sql: string) =>
    sql.includes("from prospecting_campaigns")
      ? { rows: [{ name: "Clínicas SP" }] }
      : { rows: [{ data: EMPRESA, contact_id: "c1" }] },
  );
});

describe("planilha da campanha", () => {
  it("admin baixa o CSV da campanha, com as consultas filtradas pela organização da sessão", async () => {
    const resposta = await pedir(CAMPANHA);
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(resposta.headers.get("content-disposition")).toMatch(
      /^attachment; filename="prospeccao-clinicas-sp-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(resposta.headers.get("cache-control")).toBe("no-store");
    const texto = await resposta.text();
    expect(texto).toContain("Clínica Sorriso;Dentista;(11) 99999-8888");
    for (const [, params] of mocks.query.mock.calls) expect(params).toEqual([ORG, CAMPANHA]);
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "prospecting.exported",
        organizationId: ORG,
        resourceId: CAMPANHA,
        metadata: { empresas: 1 },
      }),
    );
  });

  it("sem o papel, devolve a recusa do requireRole e não consulta nada", async () => {
    mocks.papel = { ok: false, response: new Response(null, { status: 403 }) };
    expect((await pedir(CAMPANHA)).status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("id que não é uuid: 422 sem consulta", async () => {
    expect((await pedir("nao-e-uuid")).status).toBe(422);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("campanha de outra organização (ou inexistente): 404 sem auditoria", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    expect((await pedir(CAMPANHA)).status).toBe(404);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
