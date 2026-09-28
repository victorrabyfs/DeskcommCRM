import { describe, expect, it } from "vitest";

import {
  CABECALHO,
  celula,
  etiquetaDaCampanha,
  nomeDoArquivo,
  planilhaDaCampanha,
  telefoneParaPlanilha,
} from "@/lib/convexy/prospeccao/planilha";
import { TAG_MAX } from "@/lib/schemas/tags";
import type { Prospect } from "@/lib/prospecting/schema";

/** Convexy — a planilha dos resultados da prospecção e a etiqueta da campanha (CONVEXY.md). */
const EMPRESA: Prospect = {
  key: "place-1",
  name: "Clínica Sorriso; Centro",
  phone: "+5511999998888",
  website: "https://sorriso.example",
  category: "Dentista",
  address: 'Rua "A", 10',
  maps_url: "https://maps.example/1",
  rating: 4.8,
  reviews: 120,
  emails: ["a@sorriso.example", "b@sorriso.example"],
  socials: [],
};

describe("célula", () => {
  it.each(["=HYPERLINK(\"x\")", "+cmd|' /C calc'!A0", "-2+3", "@SUM(A1)", "\tx"])(
    "neutraliza fórmula: %s",
    (perigoso) => {
      expect(celula(perigoso).replace(/^"|"$/g, "").startsWith("'")).toBe(true);
    },
  );

  it("aspas, separador e quebra de linha ficam dentro de aspas", () => {
    expect(celula('a;b"c')).toBe('"a;b""c"');
    expect(celula("linha\nnova")).toBe('"linha\nnova"');
  });

  it("vazio e número", () => {
    expect(celula(null)).toBe("");
    expect(celula(4.8)).toBe("4.8");
  });
});

describe("telefone", () => {
  it("celular e fixo brasileiros no formato de leitura, sem começar por +", () => {
    expect(telefoneParaPlanilha("+5511999998888")).toBe("(11) 99999-8888");
    expect(telefoneParaPlanilha("+551133334444")).toBe("(11) 3333-4444");
    expect(telefoneParaPlanilha(null)).toBe("");
  });
});

describe("planilha da campanha", () => {
  const texto = planilhaDaCampanha([
    { data: EMPRESA, noCrm: true },
    { data: { ...EMPRESA, key: "place-2", name: "=Lab", phone: null, emails: [] }, noCrm: false },
  ]);
  const linhas = texto.replace(/^﻿/, "").trimEnd().split("\r\n");

  it("começa com BOM e cabeçalho, uma linha por empresa", () => {
    expect(texto.startsWith("﻿")).toBe(true);
    expect(linhas[0]).toBe(CABECALHO.join(";"));
    expect(linhas).toHaveLength(3);
  });

  it("a primeira empresa sai inteira e escapada", () => {
    expect(linhas[1]).toBe(
      '"Clínica Sorriso; Centro";Dentista;(11) 99999-8888;https://sorriso.example;a@sorriso.example, b@sorriso.example;;"Rua ""A"", 10";4.8;120;https://maps.example/1;sim',
    );
  });

  it("nome vindo do Maps que começa com = não vira fórmula", () => {
    expect(linhas[2]!.startsWith("'=Lab;")).toBe(true);
    expect(linhas[2]!.endsWith(";não")).toBe(true);
  });
});

describe("nome do arquivo e etiqueta", () => {
  it("nome do arquivo sem acento nem símbolo", () => {
    expect(nomeDoArquivo("Clínicas de Estética — SP", new Date("2026-09-28T12:00:00Z"))).toBe(
      "prospeccao-clinicas-de-estetica-sp-2026-09-28.csv",
    );
    expect(nomeDoArquivo("***", new Date("2026-09-28T12:00:00Z"))).toBe("prospeccao-campanha-2026-09-28.csv");
  });

  it("a etiqueta cabe no teto do vocabulário de etiquetas", () => {
    expect(etiquetaDaCampanha(" Clínicas SP ")).toBe("Prospecção: Clínicas SP");
    expect(etiquetaDaCampanha("x".repeat(120)).length).toBeLessThanOrEqual(TAG_MAX);
  });
});
