/**
 * GET e PUT /api/v1/convexy/clinica/dados — Convexy: os dados da clínica que o
 * agente de IA lê (`crm_get_clinic_info`). Spec
 * docs/superpowers/specs/2026-09-29-convexy-minha-clinica-design.md, §3;
 * CONVEXY.md, "Minha clínica".
 *
 * Lê qualquer membro (viewer+); grava o gerente (manager+). A organização vem da
 * sessão (`requireRole`), nunca do corpo, e filtra a escrita do client de
 * serviço. PUT substitui a linha inteira (upsert por `organization_id`) e audita
 * `clinica.dados_atualizados` com os campos que mudaram.
 */
import { randomUUID } from "node:crypto";

import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerDadosDaClinicaDaOrg } from "@/lib/convexy/clinica/dados";
import { dadosDaClinicaSchema } from "@/lib/convexy/clinica/schema";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const autorizado = await requireRole("viewer", { requestId, resource: "clinica_dados" });
  if (!autorizado.ok) return autorizado.response;

  const leitura = await lerDadosDaClinicaDaOrg(createAdminClient(), autorizado.org.orgId);
  if (!leitura.ok) return fail("internal_error", leitura.erro, 500, { requestId });
  return ok(
    { dados: leitura.dados, cadastrado: leitura.cadastrado, atualizado_em: leitura.atualizadoEm },
    { requestId },
  );
}

export async function PUT(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const autorizado = await requireRole("manager", { requestId, resource: "clinica_dados" });
  if (!autorizado.ok) return autorizado.response;
  const organizationId = autorizado.org.orgId;

  const lido = dadosDaClinicaSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    const problema = lido.error.issues[0];
    const campo = problema?.path.join(".") ?? "";
    return fail("validation_failed", `${campo ? `${campo}: ` : ""}${problema?.message ?? "corpo inválido"}`, 422, {
      requestId,
    });
  }

  const admin = createAdminClient();
  const antes = await lerDadosDaClinicaDaOrg(admin, organizationId);
  if (!antes.ok) return fail("internal_error", antes.erro, 500, { requestId });

  const agora = new Date().toISOString();
  const { error } = await admin
    .from("clinica_dados")
    .upsert(
      { ...lido.data, organization_id: organizationId, updated_at: agora, updated_by: autorizado.user.id },
      { onConflict: "organization_id" },
    );
  if (error) return fail("internal_error", error.message, 500, { requestId });

  const mudaram = (Object.keys(lido.data) as Array<keyof typeof lido.data>).filter(
    (campo) => JSON.stringify(antes.dados[campo]) !== JSON.stringify(lido.data[campo]),
  );
  if (mudaram.length > 0) {
    await audit({
      actorUserId: autorizado.user.id,
      action: "clinica.dados_atualizados",
      organizationId,
      resourceType: "clinica_dados",
      resourceId: organizationId,
      requestId,
      metadata: { campos: mudaram, primeiro_cadastro: !antes.cadastrado },
    });
  }
  return ok({ dados: lido.data, cadastrado: true, atualizado_em: agora }, { requestId });
}
