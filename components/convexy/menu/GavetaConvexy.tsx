"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { flushSync } from "react-dom";

import { MarcaDaBarra } from "@/components/shell/Sidebar";
import { VersionFooter } from "@/components/shell/VersionFooter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { ativoNoCaminho } from "@/lib/convexy/menu/dono";
import { PORTA_DAS_ORIENTACOES, type PortaId } from "@/lib/convexy/menu/mapa";
import type { PortaDoMenu } from "@/lib/convexy/menu/montar";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";

import { BotaoDaPorta } from "./BotaoDaPorta";
import { ListaDaPorta } from "./ListaDaPorta";
import { useMenuConvexy } from "./useMenuConvexy";
import { useOrientacoes } from "./useOrientacoes";

/**
 * O menu da Convexy na gaveta do celular (`< md`, spec 4). A gaveta mostra o
 * menu largo, com Configurações no rodapé como no desktop; uma porta com sub
 * troca o conteúdo pela lista dela, com "‹ Voltar", que devolve o foco à porta;
 * escolher um item (ou uma porta direta) fecha a gaveta. Abrir e fechar não
 * escreve o cookie do desktop, como a gaveta do original.
 */
export function GavetaConvexy({ aoNavegar }: { aoNavegar: () => void }) {
  const t = useT();
  const idioma = useIdioma();
  const pathname = usePathname();
  const portas = useMenuConvexy();
  // Sem reset por pathname de propósito: o Sheet (Radix Dialog, sem forceMount) desmonta a gaveta ao fechar e toda navegação por ela a fecha (`aoNavegar`), então `aberta` sempre renasce nula.
  const [aberta, setAberta] = useState<PortaId | null>(null);
  const orientacoes = useOrientacoes(aberta === PORTA_DAS_ORIENTACOES);
  const ativo = ativoNoCaminho(pathname, portas, orientacoes.itens.map((o) => o.href));
  const porta = portas.find((p) => p.id === aberta && !p.direta) ?? null;

  function voltar(de: PortaId) {
    // A lista de portas precisa existir no DOM antes de receber o foco.
    flushSync(() => setAberta(null));
    document.querySelector<HTMLElement>(`[data-gaveta-convexy] [data-porta="${de}"]`)?.focus();
  }

  function botao(p: PortaDoMenu) {
    return (
      <BotaoDaPorta
        porta={p}
        ativa={ativo?.porta === p.id}
        recolhido={false}
        compactaEmTelaLarga={false}
        mostrarNome={false}
        animar={false}
        aoAbrir={() => setAberta(p.id)}
        aoNavegar={aoNavegar}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={500}>
      <div data-gaveta-convexy="" className="flex min-h-0 flex-1 flex-col">
        {porta ? (
          <>
            <div className="flex h-14 items-center border-b border-border px-2">
              <button
                type="button"
                autoFocus
                onClick={() => voltar(porta.id)}
                className="flex min-h-11 items-center rounded-md px-3 text-sm text-text-muted transition-[background-color,color] duration-200 hover:bg-surface-elevated hover:text-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none"
              >
                {texto(TEXTOS.menu.voltar, idioma)}
              </button>
            </div>
            <nav aria-label={porta.rotulo} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
              <h2 className="px-2.5 pb-2 text-[15.5px] font-semibold text-text">{porta.rotulo}</h2>
              <ListaDaPorta porta={porta} ativoHref={ativo?.href ?? null} orientacoes={orientacoes} aoEscolher={aoNavegar} />
            </nav>
          </>
        ) : (
          <>
            <MarcaDaBarra collapsed={false} />
            <nav aria-label={t("Navegação principal")} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              <ul className="space-y-[3px]">
                {portas
                  .filter((p) => !p.rodape)
                  .map((p) => (
                    <li key={p.id}>{botao(p)}</li>
                  ))}
              </ul>
            </nav>
            <div className="border-t border-border p-2">
              <ul className="mb-1 space-y-[3px]">
                {portas
                  .filter((p) => p.rodape)
                  .map((p) => (
                    <li key={p.id}>{botao(p)}</li>
                  ))}
              </ul>
              <VersionFooter collapsed={false} onNavigate={aoNavegar} />
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
