// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — as rotas dos perfis de áreas (fase 1, spec rev. 5, 6): admin da
 * plataforma, guarda de suporte ANTES do efeito, Zod, gravação condicional pela
 * versão lida (409) e auditoria. CONVEXY.md, "Perfis de áreas".
 */
const ORG = "22222222-2222-4222-8222-222222222222";
const PERFIL = "c0a1e7a0-9005-4000-8000-000000000003";
const COMPLETA = "c0a1e7a0-9005-4000-8000-000000000001";

type Resposta = { data?: unknown; error?: { code?: string; message: string } | null; count?: number | null };

const deps = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  requireSupportWrite: vi.fn(),
  audit: vi.fn(),
  invalidar: vi.fn(),
  ordem: [] as string[],
  cadeias: [] as Array<{ tabela: string; passos: Array<[string, ...unknown[]]> }>,
  responder: (_tabela: string, _passos: Array<[string, ...unknown[]]>): Resposta => ({ data: null, error: null }),
}));

vi.mock("@/lib/auth/requirePlatformAdmin", () => ({ requirePlatformAdmin: deps.requirePlatformAdmin }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: deps.requireSupportWrite }));
vi.mock("@/lib/audit", () => ({ audit: deps.audit }));
vi.mock("@/lib/convexy/areas/perfis", async (original) => ({
  ...(await original<typeof import("@/lib/convexy/areas/perfis")>()),
  invalidarPerfisDeAreas: deps.invalidar,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tabela: string) => {
      const passos: Array<[string, ...unknown[]]> = [];
      deps.cadeias.push({ tabela, passos });
      const cadeia: Record<string, unknown> = {};
      for (const metodo of ["select", "eq", "is", "update", "insert", "delete", "order"]) {
        cadeia[metodo] = (...args: unknown[]) => {
          passos.push([metodo, ...args]);
          if (["update", "insert", "delete"].includes(metodo)) deps.ordem.push(metodo);
          return cadeia;
        };
      }
      const resolver = () => deps.responder(tabela, passos);
      cadeia.maybeSingle = async () => resolver();
      cadeia.single = async () => resolver();
      cadeia.then = (fim: (valor: unknown) => unknown) => Promise.resolve(resolver()).then(fim);
      return cadeia;
    },
  }),
}));

import { PATCH as patchAreas } from "@/app/api/v1/admin/tenants/[id]/areas/route";
import { POST as criarPerfil } from "@/app/api/v1/admin/perfis-de-areas/route";
import { DELETE as excluirPerfil, PATCH as editarPerfil } from "@/app/api/v1/admin/perfis-de-areas/[id]/route";

const pedido = (corpo: unknown, metodo = "PATCH") =>
  new NextRequest("http://localhost/api", {
    method: metodo,
    body: JSON.stringify(corpo),
    headers: { "content-type": "application/json" },
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const tem = (passos: Array<[string, ...unknown[]]>, ...chamada: unknown[]) =>
  passos.some((p) => JSON.stringify(p) === JSON.stringify(chamada));

beforeEach(() => {
  vi.clearAllMocks();
  deps.ordem.length = 0;
  deps.cadeias.length = 0;
  deps.requirePlatformAdmin.mockImplementation(async () => {
    deps.ordem.push("admin");
    return { user: { id: "dono-1" } };
  });
  deps.requireSupportWrite.mockImplementation(async () => {
    deps.ordem.push("suporte");
    return null;
  });
});

describe("PATCH /api/v1/admin/tenants/[id]/areas", () => {
  const corpo = { perfil_de_areas_id: PERFIL, areas_a_mais: ["/app/kanban"], areas_a_menos: ["/app/tasks"], versao: null };
  const linha = { id: ORG, slug: "org", perfil_de_areas_id: null, areas_a_mais: [], areas_a_menos: [], areas_atualizadas_em: null };

  beforeEach(() => {
    deps.responder = (tabela, passos) => {
      if (tabela === "perfis_de_areas") return { data: { id: PERFIL }, error: null };
      if (passos.some(([m]) => m === "update")) {
        return { data: [{ ...linha, perfil_de_areas_id: PERFIL, areas_a_mais: ["/app/kanban"], areas_a_menos: ["/app/tasks"], areas_atualizadas_em: "2026-09-29T20:00:00Z" }], error: null };
      }
      return { data: linha, error: null };
    };
  });

  it("guardas antes do efeito, grava só com a versão lida e audita antes e depois", async () => {
    const res = await patchAreas(pedido(corpo), ctx(ORG));
    expect(res.status).toBe(200);
    expect(deps.ordem).toEqual(["admin", "suporte", "update"]);
    expect(deps.requireSupportWrite).toHaveBeenCalledWith(ORG);
    const update = deps.cadeias.find((c) => c.passos.some(([m]) => m === "update"))!.passos;
    expect(tem(update, "is", "areas_atualizadas_em", null)).toBe(true);
    expect(tem(update, "eq", "id", ORG)).toBe(true);
    expect(deps.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "tenant.areas_changed", organizationId: ORG, resourceId: ORG }),
    );
  });

  it("outra aba salvou antes: 409, sem auditoria", async () => {
    deps.responder = (tabela, passos) => {
      if (tabela === "perfis_de_areas") return { data: { id: PERFIL }, error: null };
      if (passos.some(([m]) => m === "update")) return { data: [], error: null };
      return { data: linha, error: null };
    };
    const res = await patchAreas(pedido(corpo), ctx(ORG));
    expect(res.status).toBe(409);
    expect(deps.audit).not.toHaveBeenCalled();
  });

  it("área desconhecida ou sem versão: 400 antes de ler o banco", async () => {
    for (const ruim of [{ ...corpo, areas_a_mais: ["/app/inventada"] }, { ...corpo, versao: undefined }]) {
      const res = await patchAreas(pedido(ruim), ctx(ORG));
      expect(res.status).toBe(400);
    }
    expect(deps.ordem).not.toContain("update");
  });

  it("sem admin da plataforma: 403, sem tocar no banco", async () => {
    deps.requirePlatformAdmin.mockRejectedValue(new Error("não"));
    const res = await patchAreas(pedido(corpo), ctx(ORG));
    expect(res.status).toBe(403);
    expect(deps.cadeias).toEqual([]);
  });
});

describe("perfis de áreas", () => {
  it("criar: nome repetido vira 409; criado audita e invalida o memo", async () => {
    deps.responder = () => ({ data: null, error: { code: "23505", message: "dup" } });
    expect((await criarPerfil(pedido({ nome: "Clínicas", areas: [] }, "POST"))).status).toBe(409);
    deps.responder = () => ({ data: { id: PERFIL, nome: "Novo", descricao: "", libera_tudo: false, areas: [] }, error: null });
    const res = await criarPerfil(pedido({ nome: "Novo", areas: ["/app/inbox"] }, "POST"));
    expect(res.status).toBe(201);
    expect(deps.ordem).toEqual(["admin", "suporte", "insert", "admin", "suporte", "insert"]);
    expect(deps.invalidar).toHaveBeenCalledTimes(1);
    expect(deps.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "platform.perfil_de_areas_created", resourceId: PERFIL }));
  });

  it("editar: a lista da Completa não se edita", async () => {
    deps.responder = () => ({ data: { id: COMPLETA, nome: "Completa", descricao: "", libera_tudo: true, areas: [], updated_at: "v1" }, error: null });
    const res = await editarPerfil(pedido({ areas: ["/app/inbox"], versao: "v1" }), ctx(COMPLETA));
    expect(res.status).toBe(422);
    expect(deps.ordem).not.toContain("update");
  });

  it("editar: grava só na versão lida; mudou antes → 409", async () => {
    deps.responder = (_t, passos) =>
      passos.some(([m]) => m === "update")
        ? { data: [], error: null }
        : { data: { id: PERFIL, nome: "Clínicas", descricao: "", libera_tudo: false, areas: [], updated_at: "v1" }, error: null };
    const res = await editarPerfil(pedido({ areas: ["/app/inbox"], versao: "v1" }), ctx(PERFIL));
    expect(res.status).toBe(409);
    const update = deps.cadeias.find((c) => c.passos.some(([m]) => m === "update"))!.passos;
    expect(tem(update, "eq", "updated_at", "v1")).toBe(true);
    expect(deps.invalidar).not.toHaveBeenCalled();
  });

  it("excluir: nunca a Completa; perfil em uso → 409; livre → exclui, invalida e audita", async () => {
    deps.responder = (tabela) =>
      tabela === "organizations" ? { count: 0, error: null } : { data: { id: COMPLETA, nome: "Completa", libera_tudo: true }, error: null };
    expect((await excluirPerfil(pedido({}, "DELETE"), ctx(COMPLETA))).status).toBe(422);

    deps.responder = (tabela) =>
      tabela === "organizations" ? { count: 3, error: null } : { data: { id: PERFIL, nome: "Clínicas", libera_tudo: false }, error: null };
    expect((await excluirPerfil(pedido({}, "DELETE"), ctx(PERFIL))).status).toBe(409);
    expect(deps.ordem).not.toContain("delete");

    deps.responder = (tabela) =>
      tabela === "organizations" ? { count: 0, error: null } : { data: { id: PERFIL, nome: "Clínicas", libera_tudo: false }, error: null };
    expect((await excluirPerfil(pedido({}, "DELETE"), ctx(PERFIL))).status).toBe(200);
    expect(deps.invalidar).toHaveBeenCalledTimes(1);
    expect(deps.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "platform.perfil_de_areas_deleted" }));
  });
});
