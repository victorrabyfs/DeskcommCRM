import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { ProspectingError } from "@/lib/prospecting/provider";

import { ListaError } from "./listas";

/**
 * Convexy — o comum das rotas da prospecção v2 (CONVEXY.md, "Prospecção v2"):
 * a resposta de erro e a leitura do id do caminho.
 */
export const SEM_CACHE = { "Cache-Control": "no-store" } as const;

export function falhaDaProspeccao(err: unknown, requestId: string) {
  if (err instanceof ListaError || err instanceof ProspectingError) {
    const codigo = err.status === 404 ? "not_found" : err.status === 409 ? "conflict" : "prospecting_unavailable";
    return fail(codigo, err.message, err.status, { requestId, headers: SEM_CACHE });
  }
  return fail("internal_error", "Não foi possível concluir a operação. Tente novamente.", 500, {
    requestId,
    headers: SEM_CACHE,
  });
}

const idSchema = z.string().uuid();

export async function idDoCaminho(params: Promise<{ id: string }>): Promise<string | null> {
  const lido = idSchema.safeParse((await params).id);
  return lido.success ? lido.data : null;
}

export async function corpoJson(req: Request): Promise<unknown> {
  return req.json().catch(() => null);
}
