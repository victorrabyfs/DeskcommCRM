import { diasRestantes } from "@/lib/convexy/teste-calculo";
import { tagDeIdioma } from "@/lib/i18n/datas";
import type { Idioma } from "@/lib/i18n/idiomas";
import { fusoUtilizavel } from "@/lib/tempo/fusos";

/**
 * O período de teste como a etiqueta do menu o mostra, calculado no SERVIDOR
 * (layout de `/app`): dias restantes e a data legível no fuso da organização.
 * CONVEXY.md, "Trial".
 */
export function testeDaOrganizacao(
  terminaEm: string,
  fuso: string | null | undefined,
  idioma: Idioma,
  agora: Date = new Date(),
): { terminaEm: string; terminaEmLegivel: string; dias: number } {
  const fim = new Date(terminaEm);
  return {
    terminaEm,
    terminaEmLegivel: new Intl.DateTimeFormat(tagDeIdioma(idioma), {
      timeZone: fusoUtilizavel(fuso),
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(fim),
    dias: diasRestantes(fim, agora, fuso),
  };
}
