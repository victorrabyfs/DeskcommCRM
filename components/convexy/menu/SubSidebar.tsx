"use client";
import type { PortaDoMenu } from "@/lib/convexy/menu/montar";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { X } from "@/lib/ui/icons";

import { ListaDaPorta } from "./ListaDaPorta";
import type { EstadoDasOrientacoes } from "./useOrientacoes";

/**
 * A sub-sidebar de uma porta (spec 4): caixa fixa de 240px (quem anima a
 * largura é o invólucro, no `MenuConvexy`, para o conteúdo não pular), título de
 * 15,5px com × afastado da borda, lista que rola por dentro sem arrastar a
 * página. Esc chama `aoEsc` (fechar em tela larga; só a sobreposição entre `md`
 * e `lg`), e o foco volta à porta por quem fecha.
 */
export function SubSidebar({
  id,
  porta,
  ativoHref,
  animar,
  orientacoes,
  aoEsc,
  aoFechar,
  aoEscolher,
}: {
  id: string;
  porta: PortaDoMenu;
  ativoHref: string | null;
  animar: boolean;
  orientacoes: EstadoDasOrientacoes;
  aoEsc: () => void;
  aoFechar: () => void;
  aoEscolher: () => void;
}) {
  const idioma = useIdioma();
  return (
    <nav
      id={id}
      aria-label={porta.rotulo}
      onKeyDown={(evento) => {
        if (evento.key !== "Escape") return;
        evento.stopPropagation();
        aoEsc();
      }}
      className="flex h-full w-60 flex-col border-r border-border bg-surface"
    >
      <div data-animar={animar} className="convexy-sub-conteudo flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 pt-3.5 pr-3 pb-2 pl-5">
          <h2 className="min-w-0 truncate text-[15.5px] font-semibold text-text">{porta.rotulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label={`${texto(TEXTOS.menu.fechar, idioma)} ${porta.rotulo}`}
            className="grid size-7 shrink-0 place-items-center rounded-md text-text-subtle transition-[background-color,color] duration-200 hover:bg-surface-elevated hover:text-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-5">
          <ListaDaPorta porta={porta} ativoHref={ativoHref} orientacoes={orientacoes} aoEscolher={aoEscolher} />
        </div>
      </div>
    </nav>
  );
}
