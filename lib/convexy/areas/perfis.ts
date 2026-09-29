import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";

import type { PerfilDeAreas } from "./calculo";

/**
 * OS PERFIS DE ÁREAS da instalação, com memo de PROCESSO (spec rev. 5, 3.3.1).
 *
 * A tabela é só do service role, então quem lê passa o admin client — nunca o
 * client da sessão. O memo segue o molde de `lib/branding/instalacao.ts`: mora em
 * `globalThis` (rota que grava e tela que lê são instâncias diferentes do
 * módulo), vale 30 s, sobe uma GERAÇÃO a cada escrita (leitura em voo não
 * reinstala o valor pré-escrita) e NUNCA memoriza erro. Em falha, devolve o
 * último valor bom; sem nenhum, `null` — e quem chama trata como sem limite.
 * CONVEXY.md, "Perfis de áreas".
 */

const TTL_MS = 30_000;

interface MemoriaDosPerfis {
  readonly perfis: ReadonlyMap<string, PerfilDeAreas>;
  readonly expiraEm: number;
}

declare global {
  var __memoDosPerfisDeAreas: MemoriaDosPerfis | null | undefined;
  var __ultimoBomDosPerfisDeAreas: ReadonlyMap<string, PerfilDeAreas> | undefined;
  var __geracaoDosPerfisDeAreas: number | undefined;
}

/** Chamada por toda rota que ESCREVE um perfil. */
export function invalidarPerfisDeAreas(): void {
  globalThis.__geracaoDosPerfisDeAreas = (globalThis.__geracaoDosPerfisDeAreas ?? 0) + 1;
  globalThis.__memoDosPerfisDeAreas = null;
}

interface LinhaDoPerfil {
  id: string;
  nome: string;
  descricao: string | null;
  libera_tudo: boolean;
  areas: string[] | null;
}

export function perfilDaLinha(linha: LinhaDoPerfil): PerfilDeAreas {
  return {
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao ?? "",
    liberaTudo: linha.libera_tudo,
    areas: linha.areas ?? [],
  };
}

export const COLUNAS_DO_PERFIL = "id, nome, descricao, libera_tudo, areas";

/** Nunca lança: roda no carregamento da sessão de toda tela. */
export async function perfisDeAreas(admin: SupabaseClient): Promise<ReadonlyMap<string, PerfilDeAreas> | null> {
  const memoria = globalThis.__memoDosPerfisDeAreas;
  if (memoria && memoria.expiraEm > Date.now()) return memoria.perfis;
  const geracao = globalThis.__geracaoDosPerfisDeAreas ?? 0;
  try {
    const { data, error } = await admin.from("perfis_de_areas").select(COLUNAS_DO_PERFIL);
    if (error) throw new Error(`${error.code ?? ""} ${error.message}`);
    const perfis = new Map(((data ?? []) as LinhaDoPerfil[]).map((l) => [l.id, perfilDaLinha(l)] as const));
    globalThis.__ultimoBomDosPerfisDeAreas = perfis;
    if ((globalThis.__geracaoDosPerfisDeAreas ?? 0) === geracao) {
      globalThis.__memoDosPerfisDeAreas = { perfis, expiraEm: Date.now() + TTL_MS };
    }
    return perfis;
  } catch (erro) {
    logger.warn("[convexy] perfis de áreas: leitura falhou — usando o último valor bom", {
      detalhe: erro instanceof Error ? erro.message : String(erro),
    });
    return globalThis.__ultimoBomDosPerfisDeAreas ?? null;
  }
}
