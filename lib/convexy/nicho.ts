import { z } from "zod";

/**
 * O TIPO DE NEGÓCIO de uma organização — Convexy (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.1).
 *
 * Os valores são os ids dos pacotes de funil do onboarding
 * (`lib/onboarding/pacotes-de-funil.ts`), e a CHECK `organizations_nicho_valido`
 * (migration 9001) aceita exatamente estes. Os dois lados são conferidos:
 * tests/unit/convexy-nicho.test.ts (TypeScript × pacotes) e
 * tests/invariants/convexy-nicho.test.ts (banco × TypeScript).
 *
 * Quem lê: o layout do app (`lerNicho`, para o menu e o vocabulário). Quem grava:
 * só o admin da plataforma (`app/api/v1/admin/tenants/[id]/nicho/route.ts`).
 */
export const NICHOS = ["clinica", "servicos", "imobiliaria", "curso", "loja", "generico"] as const;

export type Nicho = (typeof NICHOS)[number];

/** Coluna nula vale este. É o mesmo último recurso do onboarding. */
export const NICHO_PADRAO: Nicho = "generico";

export const nichoSchema = z.enum(NICHOS);

/**
 * O nicho em vigor. Nunca lança: roda no layout de toda tela do app, e um valor
 * que o banco não deveria ter (ou coluna ainda ausente) vira o genérico.
 */
export function lerNicho(valor: unknown): Nicho {
  const lido = nichoSchema.safeParse(valor);
  return lido.success ? lido.data : NICHO_PADRAO;
}
