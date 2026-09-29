/**
 * PATCH /api/v1/convexy/clinica/especialistas/[id] — Convexy: edita um
 * especialista sem acesso (manager+). Spec
 * docs/superpowers/specs/2026-09-29-convexy-minha-clinica-design.md, §2;
 * CONVEXY.md, "Minha clínica".
 *
 * Nome vai para o `full_name` do usuário do Auth (é dele que a agenda lê o nome);
 * especialidade, registro, bio e `ativo` vão para `user_organizations.especialista`.
 * `tratamentos` SUBSTITUI a lista de "quem faz" deste especialista
 * (`calendar_event_type_especialistas`), na ordem enviada.
 *
 * Excluir é desativar (`ativo: false`): o histórico da agenda fica.
 * Só alcança quem é especialista DESTA organização — membro comum dá 404.
 */
import { randomUUID } from "node:crypto";

import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { edicaoDoEspecialistaSchema, lerEspecialista, type DadosDoEspecialista } from "@/lib/convexy/clinica/schema";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Contexto): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const autorizado = await requireRole("manager", { requestId, resource: "especialistas" });
  if (!autorizado.ok) return autorizado.response;
  const organizationId = autorizado.org.orgId;

  const { id: especialistaId } = await params;
  if (!z.string().uuid().safeParse(especialistaId).success) {
    return fail("validation_failed", "Especialista inválido.", 400, { requestId });
  }
  const lido = edicaoDoEspecialistaSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", lido.error.issues[0]?.message ?? "corpo inválido", 422, { requestId });
  }
  const pedido = lido.data;

  const admin = createAdminClient();
  const { data: vinculo, error: erroDaLeitura } = await admin
    .from("user_organizations")
    .select("id, especialista")
    .eq("organization_id", organizationId)
    .eq("user_id", especialistaId)
    .is("revoked_at", null)
    .maybeSingle();
  if (erroDaLeitura) return fail("internal_error", erroDaLeitura.message, 500, { requestId });
  const antes = lerEspecialista((vinculo as { especialista?: unknown } | null)?.especialista);
  if (!vinculo || !antes) return fail("not_found", "Especialista não encontrado.", 404, { requestId });
  const vinculoId = (vinculo as { id: string }).id;

  if (pedido.tratamentos && pedido.tratamentos.length > 0) {
    const { data: tipos, error: erroDosTipos } = await admin
      .from("calendar_event_types")
      .select("id")
      .eq("organization_id", organizationId)
      .in("id", pedido.tratamentos);
    if (erroDosTipos) return fail("internal_error", erroDosTipos.message, 500, { requestId });
    if ((tipos ?? []).length !== new Set(pedido.tratamentos).size) {
      return fail("validation_failed", "Um dos tratamentos não é desta clínica.", 422, { requestId });
    }
  }

  const depois: DadosDoEspecialista = {
    ...antes,
    ...(pedido.especialidade !== undefined ? { especialidade: pedido.especialidade } : {}),
    ...(pedido.registro !== undefined ? { registro: pedido.registro } : {}),
    ...(pedido.bio !== undefined ? { bio: pedido.bio } : {}),
    ...(pedido.ativo !== undefined ? { ativo: pedido.ativo } : {}),
  };
  const { error: erroDoVinculo } = await admin
    .from("user_organizations")
    .update({ especialista: depois, updated_at: new Date().toISOString() })
    .eq("id", vinculoId)
    .eq("organization_id", organizationId);
  if (erroDoVinculo) return fail("internal_error", erroDoVinculo.message, 500, { requestId });

  if (pedido.nome !== undefined) {
    const { error: erroDoNome } = await admin.auth.admin.updateUserById(especialistaId, {
      user_metadata: { full_name: pedido.nome, especialista: true },
    });
    if (erroDoNome) return fail("internal_error", erroDoNome.message, 500, { requestId });
  }

  if (pedido.tratamentos !== undefined) {
    const { error: erroDaLimpeza } = await admin
      .from("calendar_event_type_especialistas")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", especialistaId);
    if (erroDaLimpeza) return fail("internal_error", erroDaLimpeza.message, 500, { requestId });
    const unicos = [...new Set(pedido.tratamentos)];
    if (unicos.length > 0) {
      const { error: erroDaLista } = await admin.from("calendar_event_type_especialistas").insert(
        unicos.map((eventTypeId) => ({
          organization_id: organizationId,
          event_type_id: eventTypeId,
          user_id: especialistaId,
        })),
      );
      if (erroDaLista) return fail("internal_error", erroDaLista.message, 500, { requestId });
    }
  }

  await audit({
    actorUserId: autorizado.user.id,
    action: "clinica.especialista_atualizado",
    organizationId,
    resourceType: "especialista",
    resourceId: especialistaId,
    requestId,
    metadata: {
      campos: Object.keys(pedido),
      ...(pedido.ativo !== undefined && pedido.ativo !== antes.ativo ? { ativo: { de: antes.ativo, para: pedido.ativo } } : {}),
    },
  });
  return ok({ id: especialistaId, ...depois }, { requestId });
}
