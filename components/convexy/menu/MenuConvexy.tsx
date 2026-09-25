"use client";
import "./menu.css";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { toggleSidebar } from "@/app/actions/shell/toggleSidebar";
import { MarcaDaBarra } from "@/components/shell/Sidebar";
import { VersionFooter } from "@/components/shell/VersionFooter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { ativoNoCaminho } from "@/lib/convexy/menu/dono";
import { PORTA_DAS_ORIENTACOES, type PortaId } from "@/lib/convexy/menu/mapa";
import type { PortaDoMenu } from "@/lib/convexy/menu/montar";
import { CaretLeft } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { BotaoDaPorta } from "./BotaoDaPorta";
import { SubSidebar } from "./SubSidebar";
import { useLarguraLarga } from "./useLarguraLarga";
import { useMenuConvexy } from "./useMenuConvexy";
import { useOrientacoes } from "./useOrientacoes";

/** A sub-sidebar é uma só; toda porta com sub a controla. */
const ID_DA_SUB_SIDEBAR = "menu-convexy-sub";

function focarPorta(id: PortaId) {
  document.querySelector<HTMLElement>(`[data-menu-convexy] [data-porta="${id}"]`)?.focus();
}

/**
 * O MENU DA CONVEXY no desktop (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3 e 4).
 *
 * Vive no layout do app, que persiste entre as telas: navegar não recria nada.
 * A porta ativa vem de `usePathname()` — que o SSR já tem —, então link direto,
 * recarregar, voltar e avançar abrem certo, sem animação na primeira pintura.
 *
 * Estado, todo de tela:
 *  - `fechadas`: portas fechadas no × nesta aba (Decisão 9 do plano);
 *  - `escolha`: a porta clicada, até a navegação chegar;
 *  - `sobreposicao`: aberta por clique; entre `md` e `lg` cobre a página. Vale
 *    enquanto o caminho é o de quando abriu (ou o destino do clique): navegar por
 *    outro caminho a desfaz, sem efeito que grave estado.
 * A compactação automática (sub aberta) é CSS em `lg:` e nunca chama
 * `toggleSidebar`; só a alça chama, e o servidor desenha certo pelo cookie.
 */
export function MenuConvexy({ recolhido }: { recolhido: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const portas = useMenuConvexy();
  const larga = useLarguraLarga();
  const [fechadas, setFechadas] = useState<ReadonlySet<PortaId>>(() => new Set());
  const [escolha, setEscolha] = useState<{ porta: PortaId; noCaminho: string } | null>(null);
  const [sobreposicao, setSobreposicao] = useState<{ noCaminho: string; destino: string | null } | null>(null);
  const [animar, setAnimar] = useState(false);
  const [trocando, startTransition] = useTransition();

  const escolhida = escolha && escolha.noCaminho === pathname ? escolha.porta : null;
  const prevista = escolhida ?? ativoNoCaminho(pathname, portas)?.porta ?? null;
  const orientacoes = useOrientacoes(prevista === PORTA_DAS_ORIENTACOES);
  const ativo = ativoNoCaminho(pathname, portas, orientacoes.itens.map((o) => o.href));
  const idExibida = escolhida ?? ativo?.porta ?? null;
  const exibida = portas.find((p) => p.id === idExibida && !p.direta) ?? null;
  const aberta = exibida !== null && !fechadas.has(exibida.id);
  const sobrepondo =
    aberta && sobreposicao !== null && (pathname === sobreposicao.noCaminho || pathname === sobreposicao.destino);
  const compactaEmTelaLarga = aberta && !recolhido;
  const mostrarNome = recolhido || (compactaEmTelaLarga && larga);
  const idParaFoco = exibida?.id ?? null;

  // Entre `md` e `lg`, a sobreposição recebe o foco e fecha com Esc em qualquer
  // lugar do documento. O efeito só assina e desassina; quem muda estado é o evento.
  useEffect(() => {
    if (!sobrepondo || larga) return;
    document.querySelector<HTMLElement>(`#${ID_DA_SUB_SIDEBAR} a`)?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setSobreposicao(null);
      if (idParaFoco) focarPorta(idParaFoco);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [sobrepondo, larga, idParaFoco]);

  function abrir(porta: PortaDoMenu) {
    const vaiNavegar = ativo?.porta !== porta.id;
    const destino = porta.itens[0]!.href;
    setAnimar(true);
    setSobreposicao({ noCaminho: pathname, destino: vaiNavegar ? destino : null });
    setFechadas((antes) => {
      if (!antes.has(porta.id)) return antes;
      const proximas = new Set(antes);
      proximas.delete(porta.id);
      return proximas;
    });
    if (vaiNavegar) {
      setEscolha({ porta: porta.id, noCaminho: pathname });
      router.push(destino);
    }
  }

  function fechar() {
    if (!exibida) return;
    setFechadas((antes) => new Set(antes).add(exibida.id));
    setSobreposicao(null);
    focarPorta(exibida.id);
  }

  function fecharSobreposicao() {
    setSobreposicao(null);
    if (exibida) focarPorta(exibida.id);
  }

  function botao(porta: PortaDoMenu) {
    return (
      <BotaoDaPorta
        porta={porta}
        ativa={idExibida === porta.id}
        expandida={aberta && exibida?.id === porta.id && (larga || sobrepondo)}
        recolhido={recolhido}
        compactaEmTelaLarga={compactaEmTelaLarga}
        mostrarNome={mostrarNome}
        animar={animar}
        controla={exibida ? ID_DA_SUB_SIDEBAR : undefined}
        aoAbrir={() => abrir(porta)}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={500}>
      <aside data-menu-convexy="" className="sticky top-0 z-30 flex h-screen shrink-0">
        <div
          className={cn(
            "group/trilho relative flex h-full flex-col border-r border-border bg-surface transition-[width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
            recolhido ? "w-16" : "w-[236px]",
            compactaEmTelaLarga && "lg:w-16",
          )}
        >
          <div className={cn(compactaEmTelaLarga && "lg:hidden")}>
            <MarcaDaBarra collapsed={recolhido} />
          </div>
          {compactaEmTelaLarga ? (
            <div className="hidden lg:block">
              <MarcaDaBarra collapsed />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => startTransition(() => toggleSidebar(recolhido))}
            disabled={trocando}
            aria-label={recolhido ? t("Expandir sidebar") : t("Recolher sidebar")}
            className={cn(
              "absolute top-11 -right-3 z-10 grid size-6 place-items-center rounded-full border border-border-strong bg-surface text-text-muted shadow-sm transition-[opacity,scale,background-color,color,border-color] duration-200 hover:border-accent hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden motion-reduce:transition-none [@media(pointer:coarse)]:hidden",
              recolhido
                ? "opacity-100"
                : "scale-90 opacity-0 group-hover/trilho:scale-100 group-hover/trilho:opacity-100 focus-visible:scale-100 focus-visible:opacity-100",
              compactaEmTelaLarga && "lg:hidden",
              sobrepondo && "hidden",
            )}
          >
            <CaretLeft
              aria-hidden
              className={cn(
                "size-3.5 transition-[rotate] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
                recolhido && "rotate-180",
              )}
            />
          </button>
          <nav aria-label={t("Navegação principal")} className="flex min-h-0 flex-1 flex-col">
            <ul className="flex-1 space-y-[3px] overflow-y-auto overscroll-contain p-2">
              {portas
                .filter((p) => !p.rodape)
                .map((p) => (
                  <li key={p.id}>{botao(p)}</li>
                ))}
            </ul>
            <div className="border-t border-border p-2">
              <ul className="mb-1 space-y-[3px]">
                {portas
                  .filter((p) => p.rodape)
                  .map((p) => (
                    <li key={p.id}>{botao(p)}</li>
                  ))}
              </ul>
              <div className={cn(compactaEmTelaLarga && "lg:hidden")}>
                <VersionFooter collapsed={recolhido} />
              </div>
              {compactaEmTelaLarga ? (
                <div className="hidden lg:block">
                  <VersionFooter collapsed />
                </div>
              ) : null}
            </div>
          </nav>
        </div>
        {sobrepondo ? (
          <div
            aria-hidden
            onClick={fecharSobreposicao}
            className="absolute inset-y-0 left-full z-30 w-[calc(100vw-100%)] bg-overlay lg:hidden"
          />
        ) : null}
        {exibida ? (
          <div
            aria-hidden={aberta ? undefined : true}
            inert={aberta ? undefined : true}
            className={cn(
              "h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
              aberta ? "lg:w-60" : "lg:w-0",
              sobrepondo ? "absolute top-0 left-full z-40 w-60 lg:static" : "hidden lg:block",
            )}
          >
            <SubSidebar
              key={exibida.id}
              id={ID_DA_SUB_SIDEBAR}
              porta={exibida}
              ativoHref={ativo?.href ?? null}
              animar={animar}
              orientacoes={orientacoes}
              aoEsc={sobrepondo && !larga ? fecharSobreposicao : fechar}
              aoFechar={fechar}
              aoEscolher={() => setSobreposicao(null)}
            />
          </div>
        ) : null}
      </aside>
    </TooltipProvider>
  );
}
