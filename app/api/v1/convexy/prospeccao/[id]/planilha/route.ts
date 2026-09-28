import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { nomeDoArquivo, planilhaDaCampanha } from "@/lib/convexy/prospeccao/planilha";
import type { Prospect } from "@/lib/prospecting/schema";

/**
 * Convexy — GET /api/v1/convexy/prospeccao/[id]/planilha: as empresas que uma
 * campanha de prospecção encontrou, em CSV (CONVEXY.md, "Prospecção: etiqueta,
 * origem e planilha").
 *
 * Mesma porta da tela de prospecção (`requireRole("admin")`, recurso
 * `prospecting`), a organização vem da sessão e filtra as duas consultas, e a
 * saída é auditada: são dados de terceiros deixando o sistema.
 */
export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const auth = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!auth.ok) return auth.response;

  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return fail("validation_failed", "Campanha inválida.", 422, { requestId });
  const org = auth.org.orgId;

  const db = getRequestPool();
  const campanha = await db.query<{ name: string }>(
    "select name from prospecting_campaigns where organization_id=$1 and id=$2",
    [org, id.data],
  );
  const nome = campanha.rows[0]?.name;
  if (!nome) return fail("not_found", "Campanha não encontrada.", 404, { requestId });

  const candidatos = await db.query<{ data: Prospect; contact_id: string | null }>(
    "select data, contact_id from prospecting_candidates where organization_id=$1 and campaign_id=$2 order by created_at, id",
    [org, id.data],
  );

  await audit({
    action: "prospecting.exported",
    actorUserId: auth.user.id,
    organizationId: org,
    resourceType: "prospecting_campaign",
    resourceId: id.data,
    requestId,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
    metadata: { empresas: candidatos.rows.length },
  });

  const csv = planilhaDaCampanha(candidatos.rows.map((c) => ({ data: c.data, noCrm: c.contact_id !== null })));
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeDoArquivo(nome, new Date())}"`,
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
    },
  });
}
