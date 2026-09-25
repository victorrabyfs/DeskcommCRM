// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Convexy — GET /api/v1/convexy/orientacoes (spec 3.4): o único conteúdo
 * exclusivo do hub `/app/crm`, agora um grupo da porta Contatos. Mesmo
 * `loadCrmExtensions`, organização da SESSÃO, mesmas regras: só as ativas, e
 * aviso quando não dá para ler (200 com `indisponivel`, como o hub).
 */
const deps = vi.hoisted(() => ({ requireRole: vi.fn(), loadCrmExtensions: vi.fn(), warn: vi.fn() }));

vi.mock("@/lib/auth/require-role", () => ({ requireRole: deps.requireRole }));
vi.mock("@/lib/extensions/service", () => ({ loadCrmExtensions: deps.loadCrmExtensions }));
vi.mock("@/lib/logger", () => ({ logger: { warn: deps.warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { GET } from "@/app/api/v1/convexy/orientacoes/route";

function guia(id: string, pt: string, es?: string) {
  return {
    organization_id: "org-1",
    installation_id: id,
    version: "1.0.0",
    manifest: { display: { title: { "pt-BR": pt, ...(es ? { es } : {}) } } },
    configuration: {},
    revision: 1,
  };
}
function sessao(idioma: "pt-BR" | "es") {
  deps.requireRole.mockResolvedValue({ ok: true, user: { id: "u-1", idioma }, org: { orgId: "org-1" } });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/convexy/orientacoes", () => {
  it("devolve as orientações ativas da organização da sessão, com o título no idioma", async () => {
    sessao("es");
    deps.loadCrmExtensions.mockResolvedValue([guia("i-1", "Roteiro da clínica", "Guion de la clínica"), guia("i-2", "Só em português")]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: {
        orientacoes: [
          { installation_id: "i-1", titulo: "Guion de la clínica" },
          { installation_id: "i-2", titulo: "Só em português" },
        ],
        indisponivel: false,
      },
    });
    expect(deps.requireRole).toHaveBeenCalledWith("viewer", expect.objectContaining({ resource: "extension_installations" }));
    expect(deps.loadCrmExtensions).toHaveBeenCalledWith("org-1");
  });

  it("não deu para ler: 200 com o aviso, e o log diz qual organização", async () => {
    sessao("pt-BR");
    deps.loadCrmExtensions.mockRejectedValue(Object.assign(new Error("db"), { code: "extension_unavailable" }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { orientacoes: [], indisponivel: true } });
    expect(deps.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ organization_id: "org-1", error_code: "extension_unavailable" }),
    );
  });

  it("sem sessão, a resposta é a do requireRole — e nada é lido", async () => {
    deps.requireRole.mockResolvedValue({ ok: false, response: Response.json({ error: { code: "unauthenticated" } }, { status: 401 }) });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(deps.loadCrmExtensions).not.toHaveBeenCalled();
  });
});
