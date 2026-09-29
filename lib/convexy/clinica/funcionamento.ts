import type { Fechamento, Funcionamento } from "./schema";

/**
 * Convexy — o HORÁRIO DE FUNCIONAMENTO da clínica limita a agenda de cada
 * especialista (spec Minha clínica, §3). Função pura: recebe o horário e diz se
 * cabe. Quem aplica é a busca da IA (`agenda-da-ia.ts`), DEPOIS do motor da agenda
 * — o motor (`lib/agenda/horarios-livres.ts`) não muda.
 *
 * Sem janela cadastrada, o funcionamento não restringe nada (mesma regra da
 * jornada: `windows` vazio = sem restrição). Fechamentos (feriados, recesso)
 * valem sempre.
 */

const DIA_DA_SEMANA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export interface MomentoLocal {
  /** 0 = domingo … 6 = sábado. */
  dow: number;
  /** Minutos desde a meia-noite local. */
  minuto: number;
  /** AAAA-MM-DD no fuso. */
  dia: string;
}

export function momentoLocal(instante: Date, fuso: string): MomentoLocal {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instante);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return {
    dow: DIA_DA_SEMANA[valor("weekday")] ?? 0,
    minuto: Number(valor("hour")) * 60 + Number(valor("minute")),
    dia: `${valor("year")}-${valor("month")}-${valor("day")}`,
  };
}

function minutos(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

export function funcionamentoRestringe(funcionamento: Funcionamento | null | undefined): boolean {
  return Boolean(funcionamento && funcionamento.windows.length > 0);
}

/** O horário inteiro [inicio, fim) cabe numa faixa de funcionamento do MESMO dia? */
export function cabeNoFuncionamento(slot: { inicio: Date; fim: Date }, funcionamento: Funcionamento): boolean {
  if (!funcionamentoRestringe(funcionamento)) return true;
  const inicio = momentoLocal(slot.inicio, funcionamento.timezone);
  const fim = momentoLocal(slot.fim, funcionamento.timezone);
  // Termina à meia-noite do dia seguinte: vale como 24:00 do dia do início.
  const fimMinuto = fim.dia !== inicio.dia ? (fim.minuto === 0 ? 1440 : Number.POSITIVE_INFINITY) : fim.minuto;
  return funcionamento.windows.some(
    (w) => w.dow === inicio.dow && minutos(w.start) <= inicio.minuto && fimMinuto <= minutos(w.end),
  );
}

export function fechadoNoDia(
  slot: { inicio: Date },
  fechamentos: readonly Fechamento[],
  fuso: string,
): Fechamento | null {
  if (fechamentos.length === 0) return null;
  const dia = momentoLocal(slot.inicio, fuso).dia;
  return fechamentos.find((f) => f.data === dia) ?? null;
}

/** Tira da lista o que cai fora do funcionamento ou num dia de fechamento. */
export function filtrarPeloFuncionamento<T extends { inicio: Date; fim: Date }>(
  slots: readonly T[],
  funcionamento: Funcionamento | null | undefined,
  fechamentos: readonly Fechamento[],
): T[] {
  if (!funcionamento) return [...slots];
  return slots.filter(
    (s) => cabeNoFuncionamento(s, funcionamento) && !fechadoNoDia(s, fechamentos, funcionamento.timezone),
  );
}

const NOMES_DOS_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;

/** O funcionamento em texto para o agente repetir ("segunda: 08:00–12:00, 14:00–18:00"). Dia sem faixa = fechado. */
export function funcionamentoEmTexto(funcionamento: Funcionamento): Array<{ dia: string; horario: string }> {
  if (!funcionamentoRestringe(funcionamento)) return [];
  return NOMES_DOS_DIAS.map((nome, dow) => {
    const faixas = funcionamento.windows
      .filter((w) => w.dow === dow)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((w) => `${w.start}–${w.end}`);
    return { dia: nome, horario: faixas.length > 0 ? faixas.join(", ") : "fechado" };
  });
}
