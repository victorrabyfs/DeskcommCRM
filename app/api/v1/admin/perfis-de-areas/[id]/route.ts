/**
 * PATCH e DELETE /api/v1/admin/perfis-de-areas/[id] — Convexy, perfis de áreas
 * (spec rev. 5, seções 0.1, 4.1 e 6). Só o admin da plataforma.
 *
 * PATCH: grava só se o `updated_at` ainda é o que a tela leu (senão 409). A
 * Completa só troca nome e descrição — a lista dela é "tudo". Vale para todas
 * as organizações do perfil no próximo carregamento (memo invalidado aqui; nos
 * outros processos, em até 30 s).
 * DELETE (fase 1): só perfil sem organizações e nunca a Completa. Mover
 * organizações para outro perfil ao excluir é da fase 2.
 * CONVEXY.md, "Perfis de áreas".
 */
import { randomUUID } from "node:crypto";

import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { editarPerfilSchema } from "@/lib/convexy/areas/esquema";
import { COLUNAS_DO_PERFIL, invalidarPerfisDeAreas } from "@/lib/convexy/areas/perfis";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();
type Contexto = { params: Promise<{ id: string }> };

interface LinhaDoPerfil {
  id: string;
  nome: string;
  descricao: string;
  libera_tudo: boolean;
  areas: string[];
  updated_at: string;
}

export async function PATCH(req: NextRequest, { params }: Contexto) {
  const requestId = randomUUID();
  const { id: perfilId } = await params;
  let adminCtx: Awaited<ReturnType<typeof requirePlatformAdmin>>;
  try {
    adminCtx = await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  if (!idSchema.safeParse(perfilId).success) {
    return fail("validation_failed", "Invalid profile id", 400, { requestId });
  }
  let body: z.infer<typeof editarPerfilSchema>;
  try {
    body = editarPerfilSchema.parse(await req.json());
  } catch {
    return fail("validation_failed", "Invalid request body", 400, { requestId });
  }

  const admin = createAdminClient();
  const { data: atual, error: leitura } = await admin
    .from("perfis_de_areas")
    .select(`${COLUNAS_DO_PERFIL}, updated_at`)
    .eq("id", perfilId)
    .maybeSingle();
  if (leitura) return fail("internal_error", "Failed to read profile", 500, { requestId });
  if (!atual) return fail("not_found", "Profile not found", 404, { requestId });
  const antes = atual as LinhaDoPerfil;
  if (antes.libera_tudo && body.areas !== undefined) {
    return fail("validation_failed", "O perfil que libera tudo não tem lista de áreas.", 422, { requestId });
  }

  const mudancas: Record<string, unknown> = { updated_by: adminCtx.user.id };
  if (body.nome !== undefined) mudancas.nome = body.nome;
  if (body.descricao !== undefined) mudancas.descricao = body.descricao;
  if (body.areas !== undefined) mudancas.areas = body.areas;

  const { data: gravadas, error } = await admin
    .from("perfis_de_areas")
    .update(mudancas)
    .eq("id", perfilId)
    .eq("updated_at", body.versao)
    .select(`${COLUNAS_DO_PERFIL}, updated_at`);
  if (error?.code === "23505") return fail("conflict", "Já existe um perfil com este nome.", 409, { requestId });
  if (error) return fail("internal_error", "Failed to update profile", 500, { requestId });
  if (!gravadas || gravadas.length === 0) {
    return fail("state_conflict", "O perfil mudou desde que você abriu. Recarregue antes de salvar.", 409, { requestId });
  }
  invalidarPerfisDeAreas();

  const depois = gravadas[0] as LinhaDoPerfil;
  void audit({
    action: "platform.perfil_de_areas_updated",
    actorUserId: adminCtx.user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    resourceType: "perfil_de_areas",
    resourceId: perfilId,
    requestId,
    metadata: {
      de: { nome: antes.nome, areas: antes.areas.length },
      para: { nome: depois.nome, areas: depois.areas.length },
      entraram: depois.areas.filter((a) => !antes.areas.includes(a)),
      sairam: antes.areas.filter((a) => !depois.areas.includes(a)),
    },
  });
  return ok(depois, { requestId });
}

export async function DELETE(_req: NextRequest, { params }: Contexto) {
  const requestId = randomUUID();
  const { id: perfilId } = await params;
  let adminCtx: Awaited<ReturnType<typeof requirePlatformAdmin>>;
  try {
    adminCtx = await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  if (!idSchema.safeParse(perfilId).success) {
    return fail("validation_failed", "Invalid profile id", 400, { requestId });
  }

  const admin = createAdminClient();
  const [{ data: atual, error: leitura }, { count, error: contagem }] = await Promise.all([
    admin.from("perfis_de_areas").select("id, nome, libera_tudo").eq("id", perfilId).maybeSingle(),
    admin.from("organizations").select("id", { count: "exact", head: true }).eq("perfil_de_areas_id", perfilId),
  ]);
  if (leitura || contagem) return fail("internal_error", "Failed to read profile", 500, { requestId });
  if (!atual) return fail("not_found", "Profile not found", 404, { requestId });
  const perfil = atual as { nome: string; libera_tudo: boolean };
  if (perfil.libera_tudo) {
    return fail("validation_failed", "O perfil que libera tudo não pode ser excluído.", 422, { requestId });
  }
  if ((count ?? 0) > 0) {
    return fail("conflict", `${count} empresa(s) usam este perfil. Mude o perfil delas antes de excluir.`, 409, {
      requestId,
    });
  }
  const { error } = await admin.from("perfis_de_areas").delete().eq("id", perfilId);
  // 23503: uma empresa passou a usar o perfil entre a contagem e o delete.
  if (error?.code === "23503") {
    return fail("conflict", "Uma empresa passou a usar este perfil. Mude o perfil dela antes de excluir.", 409, {
      requestId,
    });
  }
  if (error) return fail("internal_error", "Failed to delete profile", 500, { requestId });
  invalidarPerfisDeAreas();

  void audit({
    action: "platform.perfil_de_areas_deleted",
    actorUserId: adminCtx.user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    resourceType: "perfil_de_areas",
    resourceId: perfilId,
    requestId,
    metadata: { nome: perfil.nome },
  });
  return ok({ id: perfilId }, { requestId });
}
