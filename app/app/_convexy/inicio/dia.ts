import { instanteDe, partesNoFuso } from "@/lib/agenda/fuso";
import { tagDeIdioma } from "@/lib/i18n/datas";
import type { Idioma } from "@/lib/i18n/idiomas";

/**
 * O "HOJE" DA ORGANIZAÇÃO, em instantes (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 7).
 *
 * `faixaDePrazo`/`estaAtrasada` (lib/tarefas/tipos.ts) usam o relógio do
 * SERVIDOR, e a VPS roda em UTC; aqui o dia é lido no fuso da organização pelo
 * motor de fuso da Agenda (`partesNoFuso` → parede → `instanteDe`), que resolve
 * horário de verão (num dia sem meia-noite, `de` é o primeiro instante que
 * existiu). `ate` é exclusivo: o primeiro instante do dia seguinte. Serve só de
 * corte de consulta: "atrasada" é a regra do original (`estaAtrasada`).
 */
export interface LimitesDoDia {
  readonly de: Date;
  readonly ate: Date;
}

export function limitesDoDia(agora: Date, fuso: string): LimitesDoDia {
  const hoje = partesNoFuso(agora, fuso);
  const amanha = new Date(Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia + 1));
  return {
    de: instanteDe({ ano: hoje.ano, mes: hoje.mes, dia: hoje.dia }, fuso),
    ate: instanteDe(
      { ano: amanha.getUTCFullYear(), mes: amanha.getUTCMonth() + 1, dia: amanha.getUTCDate() },
      fuso,
    ),
  };
}

/**
 * Um instante como o Início o mostra: a hora, se é de hoje; o dia/mês, se é
 * anterior — a conversa esperando desde ontem não pode parecer de hoje (spec 7).
 */
export function momentoNoDia(instante: Date, dia: LimitesDoDia, fuso: string, idioma: Idioma): string {
  const formato: Intl.DateTimeFormatOptions =
    instante < dia.de ? { day: "2-digit", month: "2-digit" } : { hour: "2-digit", minute: "2-digit" };
  return new Intl.DateTimeFormat(tagDeIdioma(idioma), { ...formato, timeZone: fuso }).format(instante);
}
