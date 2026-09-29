/**
 * GET e POST /api/v1/convexy/clinica/especialistas — Convexy: os profissionais
 * que NÃO usam a plataforma. Spec
 * docs/superpowers/specs/2026-09-29-convexy-minha-clinica-design.md, §2;
 * CONVEXY.md, "Minha clínica".
 *
 * GET lista os especialistas da organização da sessão, com os tratamentos de
 * cada um (viewer+: a Agenda e a tela Minha clínica leem). `?inativos=1` inclui
 * os desativados.
 *
 * POST (manager+) cria o especialista SEM ACESSO: um usuário do Auth criado pelo
 * servidor — banido, sem senha, e-mail `.invalid` que ninguém recebe — e o
 * vínculo `viewer` com `especialista` preenchido. Se o vínculo falhar, o usuário
 * do Auth é apagado (não fica conta órfã).
 */
import { randomUUID } from "node:crypto";

import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { BAN_DO_ESPECIALISTA, emailDoEspecialista, listarEspecialistas } from "@/lib/convexy/clinica/especialistas";
import { novoEspecialistaSchema, type DadosDoEspecialista } from "@/lib/convexy/clinica/schema";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const autorizado = await requireRole("viewer", { requestId, resource: "especialistas" });
  if (!autorizado.ok) return autorizado.response;

  const incluirInativos = req.nextUrl.searchParams.get("inativos") === "1";
  const leitura = await listarEspecialistas(createAdminClient(), autorizado.org.orgId, { incluirInativos });
  if (!leitura.ok) return fail("internal_error", leitura.erro, 500, { requestId });
  return ok(
    leitura.especialistas.map((e) => ({
      id: e.userId,
      nome: e.nome,
      especialidade: e.especialidade,
      registro: e.registro,
      bio: e.bio,
      ativo: e.ativo,
      tratamentos: e.tratamentos,
    })),
    { requestId },
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  const autorizado = await requireRole("manager", { requestId, resource: "especialistas" });
  if (!autorizado.ok) return autorizado.response;
  const organizationId = autorizado.org.orgId;

  const lido = novoEspecialistaSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", lido.error.issues[0]?.message ?? "corpo inválido", 422, { requestId });
  }

  const admin = createAdminClient();
  const { data: criado, error: erroDoAuth } = await admin.auth.admin.createUser({
    email: emailDoEspecialista(randomUUID()),
    email_confirm: true,
    ban_duration: BAN_DO_ESPECIALISTA,
    user_metadata: { full_name: lido.data.nome, especialista: true },
  });
  const userId = criado?.user?.id;
  if (erroDoAuth || !userId) {
    return fail("internal_error", erroDoAuth?.message ?? "Não foi possível criar o especialista.", 500, { requestId });
  }

  const especialista: DadosDoEspecialista = {
    especialidade: lido.data.especialidade,
    registro: lido.data.registro,
    bio: lido.data.bio,
    foto_path: null,
    ativo: true,
  };
  const { error: erroDoVinculo } = await admin.from("user_organizations").insert({
    user_id: userId,
    organization_id: organizationId,
    role: "viewer",
    accepted_at: new Date().toISOString(),
    especialista,
  });
  if (erroDoVinculo) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    return fail("internal_error", erroDoVinculo.message, 500, { requestId });
  }

  await audit({
    actorUserId: autorizado.user.id,
    action: "clinica.especialista_criado",
    organizationId,
    resourceType: "especialista",
    resourceId: userId,
    requestId,
    metadata: { nome: lido.data.nome, especialidade: lido.data.especialidade },
  });
  return ok(
    { id: userId, nome: lido.data.nome, ...especialista, tratamentos: [] },
    { requestId, status: 201 },
  );
}
