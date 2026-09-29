import { z } from "zod";

import { availabilityScheduleSchema } from "@/lib/schemas/routing";

/**
 * Convexy — o SCHEMA CENTRAL de "Minha clínica" (migration 9008; spec
 * docs/superpowers/specs/2026-09-29-convexy-minha-clinica-design.md). CONVEXY.md,
 * "Minha clínica".
 *
 * `clinica_dados` guarda três listas em jsonb (unidades, funcionamento,
 * fechamentos) e `user_organizations.especialista` é um jsonb. Quem lê e quem
 * grava passa por AQUI — rota, tela e ferramenta da IA —, para nenhuma leitura
 * depender de um caminho de jsonb escrito à mão (anti-pattern 6 do CLAUDE.md).
 */

const textoCurto = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export const unidadeSchema = z
  .object({
    nome: z.string().trim().min(1).max(80),
    endereco: textoCurto(200).default(null),
    complemento: textoCurto(120).default(null),
    referencia: textoCurto(200).default(null),
    mapa_url: z
      .string()
      .trim()
      .max(500)
      .url()
      .refine((u) => /^https:\/\//i.test(u), "o link do mapa precisa começar com https://")
      .nullable()
      .or(z.literal("").transform(() => null))
      .default(null),
    estacionamento: textoCurto(200).default(null),
    acessibilidade: textoCurto(200).default(null),
  })
  .strict();
export type Unidade = z.infer<typeof unidadeSchema>;

/** O horário de funcionamento tem a MESMA forma da jornada de quem atende (`attendant_availability.schedule`). */
export const funcionamentoSchema = availabilityScheduleSchema;
export type Funcionamento = z.infer<typeof funcionamentoSchema>;

export const fechamentoSchema = z
  .object({
    data: z.string().regex(DATA, "data no formato AAAA-MM-DD"),
    motivo: textoCurto(120).default(null),
  })
  .strict();
export type Fechamento = z.infer<typeof fechamentoSchema>;

const listaDeTextos = (maxItens: number, maxTexto: number) =>
  z
    .array(z.string().trim().min(1).max(maxTexto))
    .max(maxItens)
    .transform((l) => [...new Set(l)]);

/** O corpo que a tela grava (PUT /api/v1/convexy/clinica/dados). */
export const dadosDaClinicaSchema = z
  .object({
    responsavel_tecnico_nome: textoCurto(120).default(null),
    responsavel_tecnico_conselho: textoCurto(20).default(null),
    responsavel_tecnico_numero: textoCurto(30).default(null),
    especialidades: listaDeTextos(30, 60).default([]),
    telefone: textoCurto(30).default(null),
    whatsapp: textoCurto(30).default(null),
    email: z.string().trim().max(200).email().nullable().or(z.literal("").transform(() => null)).default(null),
    site: textoCurto(200).default(null),
    instagram: textoCurto(60).default(null),
    unidades: z.array(unidadeSchema).max(20).default([]),
    funcionamento: funcionamentoSchema.default({ timezone: "America/Sao_Paulo", windows: [] }),
    fechamentos: z.array(fechamentoSchema).max(120).default([]),
    convenios: listaDeTextos(60, 80).default([]),
    so_particular: z.boolean().default(false),
    formas_pagamento: listaDeTextos(20, 60).default([]),
    parcelas_max: z.number().int().min(1).max(48).nullable().default(null),
    preco_avaliacao_cents: z.number().int().min(0).max(100_000_000).nullable().default(null),
    cancelamento_antecedencia_horas: z.number().int().min(0).max(720).nullable().default(null),
    cancelamento_politica: textoCurto(2000).default(null),
    tolerancia_atraso_minutos: z.number().int().min(0).max(240).nullable().default(null),
    observacoes_agente: textoCurto(4000).default(null),
  })
  .strict();
export type DadosDaClinica = z.infer<typeof dadosDaClinicaSchema>;

/** Lê a linha do banco sem confiar no jsonb: o que não casa com o schema vira o vazio, nunca exceção. */
export function lerDadosDaClinica(linha: Record<string, unknown> | null | undefined): DadosDaClinica {
  const vazio = dadosDaClinicaSchema.parse({});
  if (!linha) return vazio;
  const campos: Record<string, unknown> = {};
  for (const chave of Object.keys(vazio) as Array<keyof DadosDaClinica>) {
    if (linha[chave] !== undefined && linha[chave] !== null) campos[chave] = linha[chave];
  }
  const inteiro = dadosDaClinicaSchema.safeParse(campos);
  if (inteiro.success) return inteiro.data;
  // Campo a campo: um jsonb torto não apaga o resto.
  const saida: Record<string, unknown> = { ...vazio };
  const forma = dadosDaClinicaSchema.shape;
  for (const [chave, valor] of Object.entries(campos)) {
    const r = (forma as Record<string, z.ZodTypeAny>)[chave]?.safeParse(valor);
    if (r?.success) saida[chave] = r.data;
  }
  return saida as DadosDaClinica;
}

/** `user_organizations.especialista` — o que torna um membro um especialista sem acesso. */
export const especialistaSchema = z
  .object({
    especialidade: textoCurto(80).default(null),
    registro: textoCurto(40).default(null),
    bio: textoCurto(600).default(null),
    foto_path: textoCurto(300).default(null),
    ativo: z.boolean().default(true),
  })
  .strict();
export type DadosDoEspecialista = z.infer<typeof especialistaSchema>;

export function lerEspecialista(valor: unknown): DadosDoEspecialista | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  // Chave desconhecida ou valor torto não desfaz o especialista: fica com o que se lê.
  const v = valor as Record<string, unknown>;
  const texto = (x: unknown) => (typeof x === "string" && x.trim() !== "" ? x : null);
  return {
    especialidade: texto(v.especialidade),
    registro: texto(v.registro),
    bio: texto(v.bio),
    foto_path: texto(v.foto_path),
    ativo: typeof v.ativo === "boolean" ? v.ativo : true,
  };
}

export const novoEspecialistaSchema = z
  .object({
    nome: z.string().trim().min(2).max(120),
    especialidade: textoCurto(80).default(null),
    registro: textoCurto(40).default(null),
    bio: textoCurto(600).default(null),
  })
  .strict();

export const edicaoDoEspecialistaSchema = z
  .object({
    nome: z.string().trim().min(2).max(120).optional(),
    especialidade: textoCurto(80).optional(),
    registro: textoCurto(40).optional(),
    bio: textoCurto(600).optional(),
    ativo: z.boolean().optional(),
    tratamentos: z.array(z.string().uuid()).max(200).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "Informe ao menos um campo." });

export const quemFazSchema = z
  .object({
    user_ids: z.array(z.string().uuid()).max(50).transform((l) => [...new Set(l)]),
  })
  .strict();
