import { partesNoFuso } from "@/lib/agenda/fuso";
import { fusoUtilizavel } from "@/lib/tempo/fusos";

/**
 * O período de teste — a parte PURA (sem banco, sem auditoria), que componentes
 * de cliente também importam. O cron e as gravações ficam em `lib/convexy/teste.ts`.
 * CONVEXY.md, "Trial".
 */

export const MOTIVO_DO_TESTE_ENCERRADO = "Período de teste encerrado.";

/** As durações que o /admin oferece. */
export const DURACOES_DO_TESTE = [7, 14, 30] as const;
export const DURACAO_PADRAO_DO_TESTE = 14;

const DIA_MS = 86_400_000;

/**
 * Quantos dias de CALENDÁRIO faltam, no fuso da organização: o dia do fim é 0
 * ("acaba hoje"), a véspera é 1. Contar por horas faria um teste de 7 dias
 * recém-criado aparecer como "faltam 6" (os milissegundos entre gravar e mostrar).
 * Negativo = o dia do fim já passou.
 */
export function diasRestantes(fim: Date, agora: Date, fuso?: string | null): number {
  const zona = fusoUtilizavel(fuso);
  const f = partesNoFuso(fim, zona);
  const h = partesNoFuso(agora, zona);
  return Math.round((Date.UTC(f.ano, f.mes - 1, f.dia) - Date.UTC(h.ano, h.mes - 1, h.dia)) / DIA_MS);
}

/** Os dias em que a etiqueta vira aviso (pedido do Victor em 29/09). */
export const DIAS_DE_AVISO = [7, 4, 3, 2, 1, 0] as const;

export function fimDoTeste(dias: number, agora: Date): string {
  return new Date(agora.getTime() + dias * DIA_MS).toISOString();
}
