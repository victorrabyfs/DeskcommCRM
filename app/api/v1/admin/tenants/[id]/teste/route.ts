/**
 * GET e PATCH /api/v1/admin/tenants/[id]/teste — Convexy: o período de teste da
 * organização (CONVEXY.md, "Trial"). Só o admin da plataforma, no molde de
 * `admin/tenants/[id]/nicho`.
 *
 * PATCH define o fim (`termina_em`, ISO) ou encerra o teste (`null` = sem teste).
 * Grava só se o valor no banco ainda é o que a tela leu (senão 409) e audita
 * `tenant.teste_alterado` com o antes e o depois. Estender o teste de uma empresa
 * que o cron já suspendeu NÃO a reativa: reativar é o botão do original.
 */
import { randomUUID } from "node:crypto";

import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();
const bodySchema = z
  .object({
    termina_em: z.string().datetime({ offset: true }).nullable(),
    versao: z.string().nullable(),
  })
  .strict();

type Contexto = { params: Promise<{ id: string }> };

interface Linha {
  id: string;
  slug: string;
  status: string;
  teste_termina_em: string | null;
}

export async function GET(_req: NextRequest, { params }: Contexto) {
  const requestId = randomUUID();
  const { id: tenantId } = await params;
  try {
    await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }
  if (!idSchema.safeParse(tenantId).success) {
    return fail("validation_failed", "Invalid tenant id", 400, { requestId });
  }
  const { data, error } = await createAdminClient()
    .from("organizations")
    .select("id, slug, status, teste_termina_em")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) return fail("internal_error", "Failed to read tenant", 500, { requestId });
  if (!data) return fail("not_found", "Tenant not found", 404, { requestId });
  const org = data as Linha;
  return ok({ id: tenantId, status: org.status, termina_em: org.teste_termina_em }, { requestId });
}

export async function PATCH(req: NextRequest, { params }: Contexto) {
  const requestId = randomUUID();
  const { id: tenantId } = await params;
  let adminCtx: Awaited<ReturnType<typeof requirePlatformAdmin>>;
  try {
    adminCtx = await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }
  const supportDenied = await requireSupportWrite(tenantId);
  if (supportDenied) return supportDenied;
  if (!idSchema.safeParse(tenantId).success) {
    return fail("validation_failed", "Invalid tenant id", 400, { requestId });
  }
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return fail("validation_failed", "Invalid request body", 400, { requestId });
  }

  const admin = createAdminClient();
  const { data: atual, error: leitura } = await admin
    .from("organizations")
    .select("id, slug, status, teste_termina_em")
    .eq("id", tenantId)
    .maybeSingle();
  if (leitura) return fail("internal_error", "Failed to read tenant", 500, { requestId });
  if (!atual) return fail("not_found", "Tenant not found", 404, { requestId });
  const antes = atual as Linha;

  let condicional = admin
    .from("organizations")
    .update({ teste_termina_em: body.termina_em, updated_at: new Date().toISOString() })
    .eq("id", tenantId);
  condicional = body.versao === null ? condicional.is("teste_termina_em", null) : condicional.eq("teste_termina_em", body.versao);
  const { data: gravadas, error } = await condicional.select("id, slug, status, teste_termina_em");
  if (error) return fail("internal_error", "Failed to update tenant", 500, { requestId });
  if (!gravadas || gravadas.length === 0) {
    return fail("state_conflict", "O teste desta empresa mudou desde que você abriu. Recarregue antes de salvar.", 409, {
      requestId,
    });
  }
  const depois = gravadas[0] as Linha;

  void audit({
    action: "tenant.teste_alterado",
    actorUserId: adminCtx.user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    organizationId: tenantId,
    resourceType: "organization",
    resourceId: tenantId,
    requestId,
    metadata: { tenant_slug: antes.slug, de: antes.teste_termina_em, para: depois.teste_termina_em },
  });
  return ok({ id: tenantId, status: depois.status, termina_em: depois.teste_termina_em }, { requestId });
}
