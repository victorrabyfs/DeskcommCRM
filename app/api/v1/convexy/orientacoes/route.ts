/**
 * GET /api/v1/convexy/orientacoes — Convexy (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.4).
 *
 * As orientações das extensões ativas, para o grupo "Orientações instaladas" da
 * porta Contatos (antes eram o conteúdo exclusivo do hub `/app/crm`). Chama o
 * MESMO `loadCrmExtensions`, que usa o client de sessão (RLS de
 * `organization_extensions`), com a organização resolvida da sessão por
 * `requireRole`. Mesmas regras do hub: só as ativas; se não der para ler, o
 * menu mostra o aviso (200 com `indisponivel`) e o log diz qual organização.
 * Só leitura: sem `requireSupportWrite` (a guarda é de efeito).
 */
import { ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import type { RespostaDasOrientacoes } from "@/lib/convexy/orientacoes";
import { localize } from "@/lib/extensions/manifest";
import { loadCrmExtensions } from "@/lib/extensions/service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SEM_CACHE = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  const authz = await requireRole("viewer", { resource: "extension_installations" });
  if (!authz.ok) return authz.response;
  try {
    const guias = await loadCrmExtensions(authz.org.orgId);
    const resposta: RespostaDasOrientacoes = {
      orientacoes: guias.map((guia) => ({
        installation_id: guia.installation_id,
        titulo: localize(guia.manifest.display.title, authz.user.idioma).text,
      })),
      indisponivel: false,
    };
    return ok(resposta, { headers: SEM_CACHE });
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    logger.warn("[convexy] menu aberto sem as orientações das extensões", {
      organization_id: authz.org.orgId,
      error_code: typeof code === "string" ? code : null,
    });
    const resposta: RespostaDasOrientacoes = { orientacoes: [], indisponivel: true };
    return ok(resposta, { headers: SEM_CACHE });
  }
}
