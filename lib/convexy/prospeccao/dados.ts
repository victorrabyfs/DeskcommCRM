import { z } from "zod";

import { normalizeProspect, type Prospect } from "@/lib/prospecting/schema";

/**
 * Convexy — o que a prospecção v2 acrescenta ao `data` de um candidato
 * (CONVEXY.md, "Prospecção v2").
 *
 * Fica DENTRO de `prospecting_candidates.data`, na chave `convexy`, e não numa
 * coluna: a anonimização (`fn_lgpd_cascade_redact_contact`) regrava o `data`
 * inteiro, então o que o enriquecimento achou (decisores, resumo do site) some
 * junto com o resto — nenhuma cópia fica para trás. O `prospectEnrichmentSchema`
 * do original (Inbox) lê o mesmo `data` e descarta a chave desconhecida.
 *
 * Os e-mails e redes achados no site entram nas listas de sempre (`emails`,
 * `socials`), no teto que o schema do original aceita (5 e 15).
 */
export const MAX_EMAILS = 5;
export const MAX_REDES = 15;
export const MAX_DECISORES = 5;

const decisorSchema = z.object({
  nome: z.string().max(200),
  cargo: z.string().max(200).nullable(),
  email: z.string().max(320).nullable(),
  linkedin: z.string().max(500).nullable(),
});
export type Decisor = z.infer<typeof decisorSchema>;

export const extraSchema = z.object({
  enriquecido_em: z.string().optional(),
  resumo: z.object({ texto: z.string().max(3000), gerado_em: z.string(), site: z.string().max(500) }).optional(),
  resumo_falhou: z.string().max(300).optional(),
  decisores: z.array(decisorSchema).max(MAX_DECISORES).optional(),
});
export type ExtraConvexy = z.infer<typeof extraSchema>;

/** O extra da Convexy num `data`, ou vazio quando falta ou está torto (nunca lança). */
export function extraDe(data: unknown): ExtraConvexy {
  const bruto = (data as { convexy?: unknown } | null)?.convexy;
  const lido = extraSchema.safeParse(bruto ?? {});
  return lido.success ? lido.data : {};
}

function texto(valor: unknown, limite: number): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim().slice(0, limite) : null;
}

/** Os decisores que a Apify devolve em `leadsEnrichment` (campos lidos com tolerância). */
export function decisoresDoItem(item: Record<string, unknown>): Decisor[] {
  const lista = Array.isArray(item.leadsEnrichment) ? item.leadsEnrichment : [];
  const saida: Decisor[] = [];
  for (const bruto of lista) {
    if (!bruto || typeof bruto !== "object") continue;
    const l = bruto as Record<string, unknown>;
    const nome =
      texto(l.fullName, 200) ??
      texto([l.firstName, l.lastName].filter((p) => typeof p === "string").join(" "), 200);
    if (!nome) continue;
    saida.push({
      nome,
      cargo: texto(l.jobTitle ?? l.title ?? l.headline, 200),
      email: texto(l.email, 320),
      linkedin: texto(l.linkedinProfile ?? l.linkedinUrl ?? l.linkedin, 500),
    });
    if (saida.length >= MAX_DECISORES) break;
  }
  return saida;
}

function unir(atual: readonly string[], novos: readonly string[], teto: number): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const v of [...atual, ...novos]) {
    const chave = v.trim().toLowerCase();
    if (!chave || vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(v.trim());
    if (saida.length >= teto) break;
  }
  return saida;
}

/**
 * O `data` novo de um candidato depois de uma execução de enriquecimento.
 * Nunca troca nome, telefone nem chave (o telefone é único por organização e a
 * abordagem depende dele); só soma contatos do site e grava os decisores.
 */
export function mesclarEnriquecimento(
  atual: Prospect & { convexy?: unknown },
  item: Record<string, unknown>,
  agora: Date,
): Prospect & { convexy: ExtraConvexy } {
  const novo = normalizeProspect(item);
  const extra = extraDe(atual);
  const decisores = decisoresDoItem(item);
  return {
    ...atual,
    website: atual.website ?? novo?.website ?? null,
    emails: unir(atual.emails ?? [], [...(novo?.emails ?? []), ...decisores.flatMap((d) => (d.email ? [d.email] : []))], MAX_EMAILS),
    socials: unir(atual.socials ?? [], novo?.socials ?? [], MAX_REDES),
    convexy: {
      ...extra,
      enriquecido_em: agora.toISOString(),
      ...(decisores.length ? { decisores } : {}),
    },
  };
}

/**
 * Estimativa de custo mostrada ANTES de confirmar. Os preços são os de tabela
 * da Apify para o ator `compass~crawler-google-places` (por 1.000): detalhe do
 * lugar ~US$ 4, contatos do site ~US$ 2, decisor ~US$ 10 por pessoa. É
 * estimativa: o teto de verdade é o `maxTotalChargeUsd` da execução, que é o
 * que a pessoa confirma.
 */
export const PRECO_USD = { lugar: 0.004, contatos: 0.002, decisor: 0.01 } as const;

export function estimarCusto(p: { empresas: number; contatos: boolean; decisores: number }): number {
  const porEmpresa =
    PRECO_USD.lugar + (p.contatos ? PRECO_USD.contatos : 0) + p.decisores * PRECO_USD.decisor;
  return Math.round(p.empresas * porEmpresa * 100) / 100;
}

/** O teto da execução: a estimativa com folga de 50%, no mínimo US$ 0,50. Acima de US$ 10 não vale. */
export function tetoDaExecucao(estimativa: number): number {
  return Math.max(0.5, Math.ceil(estimativa * 1.5 * 100) / 100);
}
export const TETO_MAXIMO_USD = 10;
