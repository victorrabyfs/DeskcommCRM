"use client";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { cn } from "@/lib/utils";

/**
 * A etiqueta do período de teste no menu, como o "plano" dos SaaS — para todo
 * mundo da empresa (pedido do Victor em 29/09). Os dias vêm prontos do servidor
 * (`activeOrg.teste`, calculados no layout), para servidor e navegador desenharem
 * o mesmo texto. Com 7 dias ou menos vira aviso: "Faltam N dias", "Falta 1 dia",
 * "Seu teste acaba hoje!". Menu recolhido: não aparece. CONVEXY.md, "Trial".
 */
export function EtiquetaDoTeste({ collapsed }: { collapsed: boolean }) {
  const { activeOrg } = useAuth();
  const idioma = useIdioma();
  const teste = activeOrg?.teste;
  if (!teste || collapsed) return null;
  const dias = Math.max(0, teste.dias);
  const aviso = dias <= 7;
  const rotulo =
    dias === 0
      ? texto(TEXTOS.teste.acabaHoje, idioma)
      : dias === 1
        ? texto(TEXTOS.teste.faltaUmDia, idioma)
        : texto(aviso ? TEXTOS.teste.faltamDias : TEXTOS.teste.diasTranquilo, idioma).replace("{n}", String(dias));
  return (
    <div className="border-b border-border px-4 py-2">
      <span
        role={aviso ? "status" : undefined}
        title={texto(TEXTOS.teste.termina, idioma).replace("{data}", teste.terminaEmLegivel)}
        className={cn(
          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
          aviso ? "bg-warning-bg text-warning-fg" : "bg-accent-soft text-accent",
        )}
      >
        {rotulo}
      </span>
    </div>
  );
}
