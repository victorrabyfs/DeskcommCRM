"use client";
import { Button } from "@/components/ui/button";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { DownloadSimple } from "@/lib/ui/icons";

/**
 * Convexy — baixar as empresas de uma campanha de prospecção em planilha
 * (CONVEXY.md, "Prospecção: etiqueta, origem e planilha"). Link comum para a
 * rota, que responde com `Content-Disposition: attachment`: o navegador baixa o
 * arquivo e a tela não muda.
 */
export function BotaoDaPlanilha({ campanhaId }: { campanhaId: string }) {
  const idioma = useIdioma();
  return (
    <Button asChild variant="outline" size="sm">
      <a href={`/api/v1/convexy/prospeccao/${campanhaId}/planilha`} download>
        <DownloadSimple aria-hidden className="size-4" />
        {texto(TEXTOS.prospeccao.baixarPlanilha, idioma)}
      </a>
    </Button>
  );
}
