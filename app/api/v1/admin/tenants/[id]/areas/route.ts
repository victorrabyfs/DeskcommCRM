/**
 * GET e PATCH /api/v1/admin/tenants/[id]/areas — Convexy, o pacote de áreas de
 * uma organização (spec docs/superpowers/specs/2026-09-25-convexy-perfis-de-areas-design.md,
 * rev. 5, seções 3.2, 4.3 e 6). Só o admin da plataforma, no molde de
 * `admin/tenants/[id]/nicho`.
 *
 * PATCH: grava perfil + ajustes só se `areas_atualizadas_em` ainda é o que a tela
 * leu (senão 409), e audita `tenant.areas_changed` com o antes e o depois. Fase 1:
 * o que já estiver ativo nas áreas retiradas continua ativo (a tela avisa).
 * CONVEXY.md, "Perfis de áreas".
 */
import { randomUUID } from "node:crypto";

import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { areasDaEmpresaSchema } from "@/lib/convexy/areas/esquema";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();
type Contexto = { params: Promise<{ id: string }> };

const COLUNAS = "id, slug, perfil_de_areas_id, areas_a_mais, areas_a_menos, areas_atualizadas_em";

interface LinhaDaEmpresa {
  id: string;
  slug: string;
  perfil_de_areas_id: string | null;
  areas_a_mais: string[] | null;
  areas_a_menos: string[] | null;
  areas_atualizadas_em: string | null;
}

function resposta(org: LinhaDaEmpresa) {
  return {
    id: org.id,
    perfil_de_areas_id: org.perfil_de_areas_id,
    areas_a_mais: org.areas_a_mais ?? [],
    areas_a_menos: org.areas_a_menos ?? [],
    versao: org.areas_atualizadas_em,
  };
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
  const { data, error } = await createAdminClient().from("organizations").select(COLUNAS).eq("id", tenantId).maybeSingle();
  if (error) return fail("internal_error", "Failed to read tenant", 500, { requestId });
  if (!data) return fail("not_found", "Tenant not found", 404, { requestId });
  return ok(resposta(data as LinhaDaEmpresa), { requestId });
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
  let body: z.infer<typeof areasDaEmpresaSchema>;
  try {
    body = areasDaEmpresaSchema.parse(await req.json());
  } catch {
    return fail("validation_failed", "Invalid request body", 400, { requestId });
  }

  const admin = createAdminClient();
  const { data: atual, error: leitura } = await admin.from("organizations").select(COLUNAS).eq("id", tenantId).maybeSingle();
  if (leitura) return fail("internal_error", "Failed to read tenant", 500, { requestId });
  if (!atual) return fail("not_found", "Tenant not found", 404, { requestId });
  const antes = atual as LinhaDaEmpresa;

  if (body.perfil_de_areas_id) {
    const { data: perfil, error } = await admin
      .from("perfis_de_areas")
      .select("id")
      .eq("id", body.perfil_de_areas_id)
      .maybeSingle();
    if (error) return fail("internal_error", "Failed to read profile", 500, { requestId });
    if (!perfil) return fail("validation_failed", "Perfil de áreas não encontrado.", 422, { requestId });
  }

  let condicional = admin
    .from("organizations")
    .update({
      perfil_de_areas_id: body.perfil_de_areas_id,
      // Área nos dois ajustes ao mesmo tempo não faz sentido: "a menos" vence.
      areas_a_mais: body.areas_a_mais.filter((a) => !body.areas_a_menos.includes(a)),
      areas_a_menos: body.areas_a_menos,
      areas_atualizadas_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);
  condicional = body.versao === null ? condicional.is("areas_atualizadas_em", null) : condicional.eq("areas_atualizadas_em", body.versao);
  const { data: gravadas, error } = await condicional.select(COLUNAS);
  if (error) return fail("internal_error", "Failed to update tenant", 500, { requestId });
  if (!gravadas || gravadas.length === 0) {
    return fail("state_conflict", "As áreas desta empresa mudaram desde que você abriu. Recarregue antes de salvar.", 409, {
      requestId,
    });
  }

  const depois = gravadas[0] as LinhaDaEmpresa;
  void audit({
    action: "tenant.areas_changed",
    actorUserId: adminCtx.user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    organizationId: tenantId,
    resourceType: "organization",
    resourceId: tenantId,
    requestId,
    metadata: {
      tenant_slug: antes.slug,
      origem: "empresa",
      de: { perfil: antes.perfil_de_areas_id, a_mais: antes.areas_a_mais ?? [], a_menos: antes.areas_a_menos ?? [] },
      para: { perfil: depois.perfil_de_areas_id, a_mais: depois.areas_a_mais ?? [], a_menos: depois.areas_a_menos ?? [] },
    },
  });
  return ok(resposta(depois), { requestId });
}
