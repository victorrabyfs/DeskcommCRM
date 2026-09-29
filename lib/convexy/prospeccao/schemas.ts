import { z } from "zod";

import { TAG_MAX } from "@/lib/schemas/tags";

/**
 * Convexy — os corpos das rotas da prospecção v2 (CONVEXY.md, "Prospecção v2").
 * Todos `.strict()`: campo desconhecido é recusado, nunca ignorado.
 */

/** Prefixo da etiqueta que o "Disparo em massa" põe nos contatos da lista. */
export const PREFIXO_DA_ETIQUETA = "Lista: ";

/** O nome cabe na etiqueta "Lista: <nome>" dentro do TAG_MAX e não tem vírgula (o filtro de Campanhas separa por vírgula). */
export const NOME_MAX = Math.min(50, TAG_MAX - PREFIXO_DA_ETIQUETA.length);

export const nomeDaListaSchema = z
  .string()
  .trim()
  .min(1)
  .max(NOME_MAX)
  .refine((n) => !n.includes(","), "sem_virgula");

export const criarListaSchema = z
  .object({
    nome: nomeDaListaSchema,
    descricao: z.string().trim().max(300).default(""),
    candidate_ids: z.array(z.string().uuid()).max(5000).default([]),
  })
  .strict();

export const editarListaSchema = z
  .object({
    nome: nomeDaListaSchema.optional(),
    descricao: z.string().trim().max(300).optional(),
  })
  .strict()
  .refine((v) => v.nome !== undefined || v.descricao !== undefined, "nada_para_mudar");

export const itensSchema = z
  .object({ candidate_ids: z.array(z.string().uuid()).min(1).max(5000) })
  .strict();

export const abordarSchema = z.object({ request_id: z.string().uuid() }).strict();

export const disparoSchema = z
  .object({ base_legal_ref: z.string().trim().min(3).max(500) })
  .strict();

export const enriquecerSchema = z
  .object({
    request_id: z.string().uuid(),
    candidate_ids: z.array(z.string().uuid()).min(1).max(100),
    contatos: z.boolean(),
    resumo: z.boolean(),
    decisores: z.number().int().min(0).max(5),
  })
  .strict()
  .refine((v) => v.contatos || v.resumo || v.decisores > 0, "escolha_algo");

export function etiquetaDaLista(nome: string): string {
  return `${PREFIXO_DA_ETIQUETA}${nome.trim()}`.slice(0, TAG_MAX).trim();
}
