/**
 * GET e POST /api/v1/admin/perfis-de-areas — Convexy, perfis de áreas (spec
 * docs/superpowers/specs/2026-09-25-convexy-perfis-de-areas-design.md, rev. 5,
 * seções 4.1 e 6). Só o admin da plataforma. A tabela é do service role.
 *
 * GET: os perfis, com quantas organizações usam cada um (sem perfil = Completa).
 * POST: cria um perfil (nome único sem diferenciar maiúsculas → 409), audita
 * `platform.perfil_de_areas_created` e invalida o memo dos perfis.
 * CONVEXY.md, "Perfis de áreas".
 */
import { randomUUID } from "node:crypto";

import { type NextRequest } from "next/server";
import type { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { criarPerfilSchema } from "@/lib/convexy/areas/esquema";
import { COLUNAS_DO_PERFIL, invalidarPerfisDeAreas } from "@/lib/convexy/areas/perfis";
import { ID_DA_COMPLETA } from "@/lib/convexy/areas/semente";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const requestId = randomUUID();
  try {
    await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }
  const admin = createAdminClient();
  const [perfis, empresas] = await Promise.all([
    admin.from("perfis_de_areas").select(`${COLUNAS_DO_PERFIL}, updated_at`).order("created_at", { ascending: true }),
    admin.from("organizations").select("perfil_de_areas_id"),
  ]);
  if (perfis.error || empresas.error) {
    return fail("internal_error", "Failed to read profiles", 500, { requestId });
  }
  const completa =
    ((perfis.data ?? []) as Array<{ id: string; libera_tudo: boolean }>).find((p) => p.libera_tudo)?.id ?? ID_DA_COMPLETA;
  const porPerfil = new Map<string, number>();
  for (const e of (empresas.data ?? []) as Array<{ perfil_de_areas_id: string | null }>) {
    const perfilId = e.perfil_de_areas_id ?? completa;
    porPerfil.set(perfilId, (porPerfil.get(perfilId) ?? 0) + 1);
  }
  return ok(
    ((perfis.data ?? []) as Array<Record<string, unknown> & { id: string }>).map((p) => ({
      ...p,
      empresas: porPerfil.get(p.id) ?? 0,
    })),
    { requestId },
  );
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  let adminCtx: Awaited<ReturnType<typeof requirePlatformAdmin>>;
  try {
    adminCtx = await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  let body: z.infer<typeof criarPerfilSchema>;
  try {
    body = criarPerfilSchema.parse(await req.json());
  } catch {
    return fail("validation_failed", "Invalid request body", 400, { requestId });
  }

  const { data, error } = await createAdminClient()
    .from("perfis_de_areas")
    .insert({ nome: body.nome, descricao: body.descricao, areas: body.areas, updated_by: adminCtx.user.id })
    .select(`${COLUNAS_DO_PERFIL}, updated_at`)
    .single();
  if (error?.code === "23505") return fail("conflict", "Já existe um perfil com este nome.", 409, { requestId });
  if (error || !data) return fail("internal_error", "Failed to create profile", 500, { requestId });
  invalidarPerfisDeAreas();

  const perfilId = (data as { id: string }).id;
  void audit({
    action: "platform.perfil_de_areas_created",
    actorUserId: adminCtx.user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    resourceType: "perfil_de_areas",
    resourceId: perfilId,
    requestId,
    metadata: { nome: body.nome, areas: body.areas.length },
  });
  return ok({ ...(data as object), empresas: 0 }, { requestId, status: 201 });
}
