import { DONOS_EXTRAS, HREF_DO_INICIO, PORTA_DAS_ORIENTACOES, type PortaId } from "./mapa";

/**
 * UMA TELA, UM DONO (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.3).
 *
 * Cada item é dono do seu endereço e de tudo que fica abaixo dele; o que estiver
 * abaixo de um item mais específico é desse outro (regra de segmento: vence o
 * prefixo mais longo). `/app` (o Início) é dono só de si. `DONOS_EXTRAS` só vale
 * quando o dono está entre os itens visíveis.
 */
function casa(caminho: string, prefixo: string): boolean {
  return caminho === prefixo || (prefixo !== HREF_DO_INICIO && caminho.startsWith(`${prefixo}/`));
}

export function donoDoCaminho(caminho: string, hrefs: readonly string[]): string | null {
  const visiveis = new Set(hrefs);
  const candidatos: ReadonlyArray<readonly [prefixo: string, dono: string]> = [
    ...hrefs.map((href) => [href, href] as const),
    ...DONOS_EXTRAS.filter((extra) => visiveis.has(extra.dono)).map((extra) => [extra.prefixo, extra.dono] as const),
  ];
  let melhor: readonly [string, string] | null = null;
  for (const candidato of candidatos) {
    if (casa(caminho, candidato[0]) && (!melhor || candidato[0].length > melhor[0].length)) melhor = candidato;
  }
  return melhor ? melhor[1] : null;
}

interface Ativo {
  readonly porta: PortaId;
  readonly href: string;
}

/**
 * A porta e o item acesos neste caminho. `orientacoes` são os hrefs das
 * orientações já carregadas: são itens de Contatos, mais específicos que
 * Extensões (Decisão 5 do plano).
 */
export function ativoNoCaminho(
  caminho: string,
  portas: ReadonlyArray<{ readonly id: PortaId; readonly itens: ReadonlyArray<{ readonly href: string }> }>,
  orientacoes: readonly string[] = [],
): Ativo | null {
  const dono = donoDoCaminho(caminho, [...portas.flatMap((p) => p.itens.map((i) => i.href)), ...orientacoes]);
  if (!dono) return null;
  if (orientacoes.includes(dono)) return { porta: PORTA_DAS_ORIENTACOES, href: dono };
  const porta = portas.find((p) => p.itens.some((i) => i.href === dono));
  return porta ? { porta: porta.id, href: dono } : null;
}
