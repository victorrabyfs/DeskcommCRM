/**
 * GET/POST /api/v1/cron/convexy-prospeccao — Convexy: acompanha os pedidos de
 * enriquecimento da prospecção (CONVEXY.md, "Prospecção v2"). A lógica mora em
 * `lib/convexy/prospeccao/enriquecimento.ts`; esta rota autentica, chama e
 * audita SÓ quando a rodada teve efeito
 * (`tests/unit/cron-audita-so-quando-ha-efeito.test.ts`). Agendada a cada
 * minuto no `docker/scheduler/entrypoint.sh`.
 */
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { autorizaCron } from "@/lib/auth/cron-auth";
import { avancarEnriquecimentos, dependenciasPadrao } from "@/lib/convexy/prospeccao/enriquecimento";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handle(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  if (!autorizaCron(req)) {
    return fail("forbidden", "Cron secret missing or invalid.", 403, { requestId });
  }
  let rodada: Awaited<ReturnType<typeof avancarEnriquecimentos>>;
  try {
    const pool = getRequestPool();
    rodada = await avancarEnriquecimentos(pool, dependenciasPadrao(pool, createAdminClient()));
  } catch (err) {
    const detalhe = err instanceof Error ? err.message : String(err);
    logger.error("[convexy.prospeccao.cron] rodada lançou", { error: detalhe, requestId });
    return fail("internal_error", "Não foi possível acompanhar os enriquecimentos.", 500, { requestId });
  }
  if (rodada.empresas_enriquecidas + rodada.resumos + rodada.concluidos + rodada.falhas > 0) {
    void audit({
      action: "cron.convexy_prospeccao",
      requestId,
      bypassedRls: true,
      metadata: { ...rodada },
    });
  }
  return ok(rodada, { requestId });
}

export async function GET(req: NextRequest): Promise<Response> {
  return handle(req);
}

export async function POST(req: NextRequest): Promise<Response> {
  return handle(req);
}
