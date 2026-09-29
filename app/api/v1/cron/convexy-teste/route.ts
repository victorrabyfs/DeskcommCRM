/**
 * GET/POST /api/v1/cron/convexy-teste — Convexy: suspende as organizações cujo
 * período de teste passou (CONVEXY.md, "Trial"). A lógica mora em
 * `lib/convexy/teste.ts`; esta rota autentica, chama e audita SÓ quando
 * suspendeu alguém (`tests/unit/cron-audita-so-quando-ha-efeito.test.ts`).
 * Agendada de hora em hora no `docker/scheduler/entrypoint.sh`.
 */
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { autorizaCron } from "@/lib/auth/cron-auth";
import { encerrarTestesVencidos } from "@/lib/convexy/teste";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function handle(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  if (!autorizaCron(req)) {
    return fail("forbidden", "Cron secret missing or invalid.", 403, { requestId });
  }
  let suspensas: Awaited<ReturnType<typeof encerrarTestesVencidos>>;
  try {
    suspensas = await encerrarTestesVencidos(createAdminClient(), new Date());
  } catch {
    return fail("internal_error", "Não foi possível conferir os testes vencidos.", 500, { requestId });
  }
  if (suspensas.length > 0) {
    void audit({
      action: "cron.convexy_teste",
      requestId,
      bypassedRls: true,
      metadata: { suspensas: suspensas.length, organizacoes: suspensas.map((o) => o.slug) },
    });
  }
  return ok({ suspensas: suspensas.length }, { requestId });
}

export async function GET(req: NextRequest): Promise<Response> {
  return handle(req);
}

export async function POST(req: NextRequest): Promise<Response> {
  return handle(req);
}
