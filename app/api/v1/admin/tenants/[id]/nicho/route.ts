/**
 * GET e PATCH /api/v1/admin/tenants/[id]/nicho — Convexy (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.1).
 *
 * O tipo de negócio da organização, que escolhe os nomes do menu da Convexy. Só
 * o admin da plataforma (com MFA), no molde de `admin/tenants/[id]/suspend`. A
 * leitura é própria (e não um campo a mais no GET do tenant) para uma coluna
 * ausente nunca derrubar o painel do tenant.
 *
 * PATCH, na ordem: `requirePlatformAdmin()`, `requireSupportWrite(id)` antes do
 * efeito, Zod do id e do corpo. Grava SÓ se o valor no banco ainda é o que foi
 * lido (senão 409: duas abas não se sobrescrevem em silêncio) e audita
 * `tenant.nicho_changed` com o antes e o depois; o mesmo valor não grava.
 */
import { randomUUID } from "node:crypto";

import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { lerNicho, nichoSchema } from "@/lib/convexy/nicho";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();
const bodySchema = z.object({ nicho: nichoSchema }).strict();

type Contexto = { params: Promise<{ id: string }> };

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
  const { data: org, error } = await createAdminClient()
    .from("organizations")
    .select("id, nicho")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) return fail("internal_error", "Failed to read tenant", 500, { requestId });
  if (!org) return fail("not_found", "Tenant not found", 404, { requestId });
  return ok({ id: tenantId, nicho: lerNicho(org.nicho) }, { requestId });
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
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, slug, nicho")
    .eq("id", tenantId)
    .maybeSingle();
  if (orgError) return fail("internal_error", "Failed to read tenant", 500, { requestId });
  if (!org) return fail("not_found", "Tenant not found", 404, { requestId });

  const antes = (org.nicho as string | null) ?? null;
  if (antes === body.nicho) {
    return ok({ id: tenantId, nicho: body.nicho }, { requestId });
  }

  let condicional = admin
    .from("organizations")
    .update({ nicho: body.nicho, updated_at: new Date().toISOString() })
    .eq("id", tenantId);
  condicional = antes === null ? condicional.is("nicho", null) : condicional.eq("nicho", antes);
  const { data: gravadas, error: updateError } = await condicional.select("id");
  if (updateError) {
    return fail("internal_error", "Failed to update tenant", 500, { requestId });
  }
  if (!gravadas || gravadas.length === 0) {
    return fail("state_conflict", "Tenant nicho changed meanwhile", 409, { requestId });
  }

  void audit({
    action: "tenant.nicho_changed",
    actorUserId: adminCtx.user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    organizationId: tenantId,
    resourceType: "organization",
    resourceId: tenantId,
    requestId,
    metadata: { tenant_slug: org.slug, de: antes, para: body.nicho },
  });

  return ok({ id: tenantId, nicho: body.nicho }, { requestId });
}
