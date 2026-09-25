import { describe, expect, it } from "vitest";

import { limitesDoDia, momentoNoDia } from "@/app/app/_convexy/inicio/dia";

/**
 * Convexy — o "hoje" do Início é o da ORGANIZAÇÃO (spec 7). A VPS roda em UTC:
 * às 23:30 de São Paulo o servidor já está no dia seguinte, e "hoje" pelo
 * relógio dele mostraria a agenda e as tarefas do dia errado.
 */
describe("limitesDoDia", () => {
  it("23:30 em São Paulo com o servidor já no dia seguinte: o dia é o da organização", () => {
    const { de, ate } = limitesDoDia(new Date("2026-09-26T02:30:00Z"), "America/Sao_Paulo");
    expect(de.toISOString()).toBe("2026-09-25T03:00:00.000Z");
    expect(ate.toISOString()).toBe("2026-09-26T03:00:00.000Z");
  });

  it("em UTC, o dia do calendário UTC", () => {
    const { de, ate } = limitesDoDia(new Date("2026-09-26T02:30:00Z"), "UTC");
    expect(de.toISOString()).toBe("2026-09-26T00:00:00.000Z");
    expect(ate.toISOString()).toBe("2026-09-27T00:00:00.000Z");
  });

  it("vira o mês e o ano", () => {
    const { de, ate } = limitesDoDia(new Date("2026-12-31T15:00:00Z"), "America/Sao_Paulo");
    expect(de.toISOString()).toBe("2026-12-31T03:00:00.000Z");
    expect(ate.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("dia com horário de verão sem meia-noite (Santiago, 2026-09-06): começa no primeiro instante que existe e tem 23h", () => {
    const { de, ate } = limitesDoDia(new Date("2026-09-06T15:00:00Z"), "America/Santiago");
    expect(de.toISOString()).toBe("2026-09-06T04:00:00.000Z");
    expect(ate.toISOString()).toBe("2026-09-07T03:00:00.000Z");
    expect(ate.getTime() - de.getTime()).toBe(23 * 3_600_000);
  });
});

describe("momentoNoDia", () => {
  const DIA = limitesDoDia(new Date("2026-09-25T15:00:00Z"), "America/Sao_Paulo");

  it("de hoje: a hora no fuso da organização", () => {
    expect(momentoNoDia(new Date("2026-09-25T14:05:00Z"), DIA, "America/Sao_Paulo", "pt-BR")).toBe("11:05");
  });

  it("anterior a hoje: dia/mês, para a espera de ontem não parecer de hoje", () => {
    expect(momentoNoDia(new Date("2026-09-24T15:00:00Z"), DIA, "America/Sao_Paulo", "pt-BR")).toBe("24/09");
  });
});
