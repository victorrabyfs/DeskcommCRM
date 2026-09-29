import { z } from "zod";

import { ESCONDIDAS_PARA_TODOS } from "@/lib/convexy/telas-escondidas";
import { NAV_CATALOG } from "@/lib/navigation/catalogo";

/**
 * A forma das escritas de perfis de áreas (spec rev. 5, 6). Uma área só vale se
 * existir no catálogo de navegação e não estiver escondida para todos — o
 * seletor não a mostra, e gravá-la seria um pacote que promete o que não existe.
 * As listas saem sem repetição, na ordem do catálogo. CONVEXY.md, "Perfis de áreas".
 */
const ESCONDIDAS: readonly string[] = ESCONDIDAS_PARA_TODOS;

export const AREAS_DO_SELETOR: readonly string[] = NAV_CATALOG.map((d) => d.href).filter(
  (href) => !ESCONDIDAS.includes(href),
);

export const listaDeAreasSchema = z
  .array(z.string().refine((href) => AREAS_DO_SELETOR.includes(href), { message: "área desconhecida" }))
  .max(200)
  .transform((areas) => AREAS_DO_SELETOR.filter((href) => areas.includes(href)));

const nomeSchema = z.string().trim().min(1).max(60);
const descricaoSchema = z.string().trim().max(200);

export const criarPerfilSchema = z
  .object({ nome: nomeSchema, descricao: descricaoSchema.default(""), areas: listaDeAreasSchema })
  .strict();

/** `versao` é o `updated_at` que a tela leu: grava só se ninguém mudou antes (409). */
export const editarPerfilSchema = z
  .object({
    nome: nomeSchema.optional(),
    descricao: descricaoSchema.optional(),
    areas: listaDeAreasSchema.optional(),
    versao: z.string().min(1),
  })
  .strict();

/** `versao` é o `areas_atualizadas_em` que a tela leu (`null` = nunca gravado). */
export const areasDaEmpresaSchema = z
  .object({
    perfil_de_areas_id: z.string().uuid().nullable(),
    areas_a_mais: listaDeAreasSchema,
    areas_a_menos: listaDeAreasSchema,
    versao: z.string().min(1).nullable(),
  })
  .strict();
