"use client";
import Link from "next/link";
import { useState } from "react";

import { ConnectionHealthDot } from "@/components/connections/ConnectionHealthDot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PortaDoMenu } from "@/lib/convexy/menu/montar";
import { CaretRight } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

interface BotaoDaPortaProps {
  readonly porta: PortaDoMenu;
  readonly ativa: boolean;
  /** `undefined` na gaveta do celular: lá a porta troca o conteúdo, não expande nada. */
  readonly expandida?: boolean;
  /** Recolhido pela alça (cookie `sidebar_collapsed`): só ícones em qualquer largura. */
  readonly recolhido: boolean;
  /** Compactado pela sub-sidebar aberta: só ícones em tela larga, por CSS (`lg:`). */
  readonly compactaEmTelaLarga: boolean;
  /** O nome aparece como dica (hover e foco) — o trilho está só com ícones. */
  readonly mostrarNome: boolean;
  readonly animar: boolean;
  readonly controla?: string;
  readonly aoAbrir: () => void;
  readonly aoNavegar?: () => void;
}

/**
 * Uma porta do menu (spec 4; protótipo, rodada 2). Com sub-sidebar é
 * `<button aria-expanded aria-controls>`; com um item só é `<Link>`. Ativa:
 * fundo `accent-soft`, texto na cor do acento, seminegrito e a barra encostada
 * na borda do trilho. O Tooltip envolve SEMPRE, e é controlado: a árvore não
 * muda quando o trilho compacta, então o botão não é recriado e o foco não se
 * perde. `data-porta` é por onde o menu devolve o foco (Esc, ×, ‹ Voltar).
 */
export function BotaoDaPorta({
  porta,
  ativa,
  expandida,
  recolhido,
  compactaEmTelaLarga,
  mostrarNome,
  animar,
  controla,
  aoAbrir,
  aoNavegar,
}: BotaoDaPortaProps) {
  const [dica, setDica] = useState(false);
  const Icone = porta.Icone;
  const classe = cn(
    "group relative flex h-[38px] w-full items-center gap-3 rounded-md px-3 text-[14.5px] transition-[background-color,color,scale] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-[.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none motion-reduce:active:scale-100",
    ativa ? "bg-accent-soft font-semibold text-accent" : "text-text-muted hover:bg-surface-elevated hover:text-text",
    recolhido && "h-10 justify-center px-0",
    compactaEmTelaLarga && "lg:h-10 lg:justify-center lg:px-0",
  );
  const conteudo = (
    <>
      <span
        aria-hidden
        data-animar={animar}
        className={cn(
          "convexy-barra absolute top-[9px] bottom-[9px] -left-2 w-[3px] origin-center rounded-r-full bg-accent",
          !ativa && "hidden",
        )}
      />
      <Icone
        aria-hidden
        weight={ativa ? "fill" : "regular"}
        className={cn("size-[19px] shrink-0", recolhido && "size-5", compactaEmTelaLarga && "lg:size-5")}
      />
      <span className={cn("min-w-0 flex-1 truncate text-left", recolhido && "sr-only", compactaEmTelaLarga && "lg:sr-only")}>
        {porta.rotulo}
      </span>
      {porta.healthDot ? (
        <ConnectionHealthDot
          className={cn(
            recolhido ? "absolute top-1.5 right-1.5" : "ml-auto",
            compactaEmTelaLarga && "lg:absolute lg:top-1.5 lg:right-1.5 lg:ml-0",
          )}
        />
      ) : null}
      {porta.direta ? null : (
        <CaretRight
          aria-hidden
          className={cn(
            "size-4 shrink-0 opacity-50 transition-[opacity,translate] duration-[250ms] group-hover:translate-x-0.5 group-hover:opacity-90 motion-reduce:transition-none",
            recolhido && "hidden",
            compactaEmTelaLarga && "lg:hidden",
          )}
        />
      )}
    </>
  );
  const elemento = porta.direta ? (
    <Link
      data-porta={porta.id}
      href={porta.itens[0]!.href}
      aria-current={ativa ? "page" : undefined}
      onClick={aoNavegar}
      className={classe}
    >
      {conteudo}
    </Link>
  ) : (
    <button
      data-porta={porta.id}
      type="button"
      aria-expanded={expandida}
      aria-controls={controla}
      onClick={aoAbrir}
      className={classe}
    >
      {conteudo}
    </button>
  );
  return (
    <Tooltip open={mostrarNome && dica} onOpenChange={setDica} delayDuration={150}>
      <TooltipTrigger asChild>{elemento}</TooltipTrigger>
      <TooltipContent side="right">{porta.rotulo}</TooltipContent>
    </Tooltip>
  );
}
