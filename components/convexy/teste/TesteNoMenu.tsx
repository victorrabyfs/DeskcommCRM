"use client";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { ClockCountdown } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

/**
 * O período de teste no rodapé do menu, logo acima de Configurações — para todo
 * mundo da empresa (pedido do Victor em 29/09). Um cartão, não uma etiqueta:
 * "Teste grátis", os dias em destaque e a data do fim. Com 7 dias ou menos vira
 * aviso; no último dia, "Seu teste acaba hoje!". Menu recolhido: o relógio com o
 * número de dias. Os dias vêm prontos do servidor (`activeOrg.teste`), para os dois
 * lados desenharem o mesmo. CONVEXY.md, "Trial".
 */
export function TesteNoMenu({ collapsed }: { collapsed: boolean }) {
  const { activeOrg } = useAuth();
  const idioma = useIdioma();
  const teste = activeOrg?.teste;
  if (!teste) return null;
  const dias = Math.max(0, teste.dias);
  const nivel = dias === 0 ? "hoje" : dias <= 7 ? "aviso" : "tranquilo";
  const principal =
    dias === 0
      ? texto(TEXTOS.teste.acabaHoje, idioma)
      : dias === 1
        ? texto(TEXTOS.teste.umDiaRestante, idioma)
        : texto(TEXTOS.teste.diasRestantes, idioma).replace("{n}", String(dias));
  const termina = texto(TEXTOS.teste.termina, idioma).replace("{data}", teste.terminaEmLegivel);
  const tom = {
    tranquilo: "border-border bg-surface-elevated text-text",
    aviso: "border-warning/40 bg-warning-bg text-warning-fg",
    hoje: "border-error/40 bg-error-bg text-error-fg",
  }[nivel];

  if (collapsed) {
    return (
      <div className="mb-1 flex justify-center" title={`${principal} ${termina}`}>
        <span className={cn("relative flex size-9 items-center justify-center rounded-md border", tom)}>
          <ClockCountdown size={18} aria-hidden />
          <span className="sr-only">{principal}</span>
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-surface px-1 text-center text-[10px] leading-4 font-semibold tabular-nums shadow-sm"
          >
            {dias}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div role={nivel === "tranquilo" ? undefined : "status"} className={cn("mb-2 rounded-lg border px-3 py-2.5", tom)}>
      <p className="flex items-center gap-1.5 text-xs font-medium opacity-80">
        <ClockCountdown size={14} aria-hidden />
        {texto(TEXTOS.teste.rotulo, idioma)}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{principal}</p>
      <p className="text-xs opacity-80">{termina}</p>
    </div>
  );
}
