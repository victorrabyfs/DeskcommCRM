import type { Prospect } from "@/lib/prospecting/schema";
import { TAG_MAX } from "@/lib/schemas/tags";

/**
 * Convexy — os resultados de uma campanha de prospecção como planilha (CONVEXY.md,
 * "Prospecção: etiqueta, origem e planilha").
 *
 * `;` como separador e BOM UTF-8 no início: é o que o Excel em português abre em
 * colunas, com acento, sem passar pelo assistente de importação; o Google
 * Planilhas detecta os dois.
 *
 * Injeção de fórmula (CSV injection): o nome, o endereço e o site vêm do Google
 * Maps, escritos por terceiros. Célula que começa com `=`, `+`, `-`, `@`, tab ou
 * retorno vira fórmula ao abrir — recebe um apóstrofo na frente. O telefone sai
 * como "(11) 99999-9999", que não começa com nenhum desses.
 */
export const SEPARADOR = ";";
const BOM = "﻿";

export function celula(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  let texto = String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** "+5511999998888" → "(11) 99999-8888"; o que não for número brasileiro sai como veio. */
export function telefoneParaPlanilha(telefone: string | null): string {
  if (!telefone) return "";
  const m = telefone.replace(/\D/g, "").match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : telefone;
}

export interface LinhaDaPlanilha {
  readonly data: Prospect;
  readonly noCrm: boolean;
}

export const CABECALHO = [
  "Empresa",
  "Categoria",
  "Telefone",
  "Site",
  "E-mails",
  "Redes sociais",
  "Endereço",
  "Nota",
  "Avaliações",
  "Google Maps",
  "No CRM",
] as const;

export function planilhaDaCampanha(linhas: readonly LinhaDaPlanilha[]): string {
  const corpo = linhas.map(({ data, noCrm }) =>
    [
      data.name,
      data.category,
      telefoneParaPlanilha(data.phone),
      data.website,
      data.emails.join(", "),
      data.socials.join(", "),
      data.address,
      data.rating,
      data.reviews,
      data.maps_url,
      noCrm ? "sim" : "não",
    ]
      .map(celula)
      .join(SEPARADOR),
  );
  return `${BOM}${[CABECALHO.map(celula).join(SEPARADOR), ...corpo].join("\r\n")}\r\n`;
}

/** O nome do arquivo: só letras, números e hífen, a partir do nome da campanha. */
export function nomeDoArquivo(campanha: string, hoje: Date): string {
  const base = campanha
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `prospeccao-${base || "campanha"}-${hoje.toISOString().slice(0, 10)}.csv`;
}

/** A etiqueta que os contatos de uma campanha recebem: "Prospecção: <nome>", no teto do vocabulário. */
export function etiquetaDaCampanha(nome: string): string {
  return `Prospecção: ${nome.trim()}`.slice(0, TAG_MAX).trim();
}
