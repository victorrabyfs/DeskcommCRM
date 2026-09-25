"use client";
import Link from "next/link";
import type { CSSProperties } from "react";

import { ConnectionHealthDot } from "@/components/connections/ConnectionHealthDot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { PORTA_DAS_ORIENTACOES } from "@/lib/convexy/menu/mapa";
import type { ItemDoMenu, PortaDoMenu } from "@/lib/convexy/menu/montar";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { PuzzlePiece, Warning } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import type { EstadoDasOrientacoes } from "./useOrientacoes";

function classeDoItem(ativo: boolean): string {
  return cn(
    "flex min-h-8 items-center gap-2 rounded-md px-2.5 py-[5px] text-[13.5px] leading-snug transition-[background-color,color,padding] duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none",
    ativo ? "bg-accent-soft font-semibold text-accent" : "text-text-muted hover:bg-surface-elevated hover:pl-[13px] hover:text-text",
  );
}

const ordem = (n: number) => ({ "--convexy-ordem": n }) as CSSProperties;
const CLASSE_DO_ROTULO = "px-2.5 pt-0.5 pb-[3px] text-[11px] font-semibold tracking-wider text-text-muted uppercase";

/**
 * Os grupos e itens de uma porta — o conteúdo da sub-sidebar (desktop) e da
 * gaveta (celular). Itens só com texto (ícone só nas orientações, que não têm
 * outro sinal de origem); nome longo quebra a linha; a descrição do catálogo é
 * a dica do item (500ms, e no foco). Na porta Contatos, o grupo "Orientações
 * instaladas" (spec 3.4).
 */
export function ListaDaPorta({
  porta,
  ativoHref,
  orientacoes,
  aoEscolher,
}: {
  porta: PortaDoMenu;
  ativoHref: string | null;
  orientacoes: EstadoDasOrientacoes;
  aoEscolher: () => void;
}) {
  const t = useT();
  const idioma = useIdioma();
  const comOrientacoes =
    porta.id === PORTA_DAS_ORIENTACOES && (orientacoes.itens.length > 0 || orientacoes.indisponivel);
  return (
    <>
      {porta.grupos.map((grupo, n) => (
        <section key={grupo.id} aria-label={grupo.rotulo ?? undefined} className="convexy-grupo mt-3.5 first:mt-0" style={ordem(n)}>
          {grupo.rotulo ? <h3 className={CLASSE_DO_ROTULO}>{grupo.rotulo}</h3> : null}
          <ul className="space-y-0.5">
            {grupo.itens.map((item) => (
              <li key={item.href}>
                <ItemDaLista item={item} ativo={item.href === ativoHref} aoEscolher={aoEscolher} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {comOrientacoes ? (
        <section
          aria-label={texto(TEXTOS.grupos.orientacoes, idioma)}
          className="convexy-grupo mt-3.5"
          style={ordem(porta.grupos.length)}
        >
          <h3 className={CLASSE_DO_ROTULO}>{texto(TEXTOS.grupos.orientacoes, idioma)}</h3>
          <ul className="space-y-0.5">
            {orientacoes.indisponivel ? (
              <li>
                <Link href="/app/extensions" onClick={aoEscolher} className={classeDoItem(false)}>
                  <Warning aria-hidden className="size-4 shrink-0 text-warning-fg" />
                  <span className="min-w-0 flex-1 break-words">
                    {t("Não foi possível conferir as orientações instaladas")}
                  </span>
                </Link>
              </li>
            ) : (
              orientacoes.itens.map((o) => (
                <li key={o.href}>
                  <Link
                    href={o.href}
                    aria-current={o.href === ativoHref ? "page" : undefined}
                    onClick={aoEscolher}
                    className={classeDoItem(o.href === ativoHref)}
                  >
                    <PuzzlePiece aria-hidden className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 break-words">{o.rotulo}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function ItemDaLista({ item, ativo, aoEscolher }: { item: ItemDoMenu; ativo: boolean; aoEscolher: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={item.href} aria-current={ativo ? "page" : undefined} onClick={aoEscolher} className={classeDoItem(ativo)}>
          <span className="min-w-0 flex-1 break-words">{item.rotulo}</span>
          {item.healthDot ? <ConnectionHealthDot className="ml-auto" /> : null}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{item.descricao}</TooltipContent>
    </Tooltip>
  );
}
