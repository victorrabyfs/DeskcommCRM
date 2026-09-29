import type { Prospect } from "@/lib/prospecting/schema";

/**
 * Convexy — filtros sobre os resultados da prospecção, no navegador e sem custo
 * (CONVEXY.md, "Prospecção v2"). Função pura: a tela e o teste usam a mesma.
 */
export type Situacao = "novo" | "fila" | "enviado" | "respondeu" | "qualificado" | "nao_abordado";

export const SITUACOES: readonly Situacao[] = [
  "novo",
  "fila",
  "enviado",
  "respondeu",
  "qualificado",
  "nao_abordado",
];

/** `progress` do GET do original (`app/api/v1/prospecting/route.ts`) → situação da tela. */
export function situacaoDe(progress: string): Situacao {
  switch (progress) {
    case "new":
      return "novo";
    case "queued":
    case "sending":
      return "fila";
    case "sent":
      return "enviado";
    case "replied":
      return "respondeu";
    case "qualified":
      return "qualificado";
    default:
      return "nao_abordado";
  }
}

export type TemOuNao = "tanto_faz" | "com" | "sem";

export interface Filtros {
  busca: string;
  notaMinima: number | null;
  avaliacoesMinimas: number | null;
  site: TemOuNao;
  telefone: TemOuNao;
  email: TemOuNao;
  instagram: TemOuNao;
  categoria: string;
  situacao: Situacao | "";
}

export const FILTROS_VAZIOS: Filtros = {
  busca: "",
  notaMinima: null,
  avaliacoesMinimas: null,
  site: "tanto_faz",
  telefone: "tanto_faz",
  email: "tanto_faz",
  instagram: "tanto_faz",
  categoria: "",
  situacao: "",
};

export interface Filtravel {
  data: Prospect;
  progress: string;
}

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function confere(filtro: TemOuNao, tem: boolean): boolean {
  return filtro === "tanto_faz" || (filtro === "com") === tem;
}

export function temInstagram(data: Prospect): boolean {
  return (data.socials ?? []).some((s) => /instagram\.com/i.test(s));
}

export function passaNoFiltro(c: Filtravel, f: Filtros): boolean {
  const d = c.data;
  if (f.notaMinima !== null && (d.rating ?? 0) < f.notaMinima) return false;
  if (f.avaliacoesMinimas !== null && (d.reviews ?? 0) < f.avaliacoesMinimas) return false;
  if (!confere(f.site, !!d.website)) return false;
  if (!confere(f.telefone, !!d.phone)) return false;
  if (!confere(f.email, (d.emails ?? []).length > 0)) return false;
  if (!confere(f.instagram, temInstagram(d))) return false;
  if (f.categoria && d.category !== f.categoria) return false;
  if (f.situacao && situacaoDe(c.progress) !== f.situacao) return false;
  const busca = semAcento(f.busca.trim());
  if (busca && !semAcento(`${d.name} ${d.address ?? ""}`).includes(busca)) return false;
  return true;
}

export function filtrar<T extends Filtravel>(lista: readonly T[], f: Filtros): T[] {
  return lista.filter((c) => passaNoFiltro(c, f));
}

/** As categorias presentes, da mais comum para a menos, para o seletor. */
export function categoriasPresentes(lista: readonly Filtravel[]): string[] {
  const contagem = new Map<string, number>();
  for (const c of lista) {
    if (c.data.category) contagem.set(c.data.category, (contagem.get(c.data.category) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([categoria]) => categoria);
}

export function filtrosAtivos(f: Filtros): number {
  return (Object.keys(FILTROS_VAZIOS) as (keyof Filtros)[]).filter(
    (k) => f[k] !== FILTROS_VAZIOS[k],
  ).length;
}
