"use client";
import { useId } from "react";

import { DEPENDENCIAS, OBRIGATORIAS, dependenciasFaltando } from "@/lib/convexy/areas/calculo";
import { AREAS_DO_SELETOR } from "@/lib/convexy/areas/esquema";
import { FORA_DO_MENU, organizarPorPortas } from "@/lib/convexy/menu/mapa";
import { rotuloDoItem } from "@/lib/convexy/menu/montar";
import { TEXTOS, rotuloPorNicho, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { NAV_CATALOG } from "@/lib/navigation/catalogo";

/**
 * O SELETOR DE ÁREAS — componente único do /admin (spec rev. 5, 4.5). Agrupado
 * pelas portas do menu da Convexy (nomes neutros, sem nicho), mais o grupo "Fora
 * do menu". Obrigatórias vêm marcadas e travadas; área que perdeu uma dependência
 * mostra "precisa de X" (o cálculo do servidor a tira do pacote de qualquer
 * jeito). Só apresenta: quem chama guarda o conjunto. CONVEXY.md, "Perfis de áreas".
 */
const ENTRADAS = NAV_CATALOG.filter((d) => AREAS_DO_SELETOR.includes(d.href));
const PORTAS = organizarPorPortas(ENTRADAS)
  .map(({ porta, grupos }) => ({ porta, itens: grupos.flatMap((g) => g.itens) }))
  .filter((p) => p.itens.length > 0);
const FORA = ENTRADAS.filter((d) => FORA_DO_MENU.includes(d.href));

export function SeletorDeAreas({
  marcadas,
  aoMudar,
  desabilitado = false,
}: {
  marcadas: ReadonlySet<string>;
  aoMudar: (proximas: ReadonlySet<string>) => void;
  desabilitado?: boolean;
}) {
  const idioma = useIdioma();
  const id = useId();
  const rotulo = (href: string, label: string) => rotuloDoItem(href, label, "generico", idioma);
  const nomeDe = (href: string) => {
    const d = NAV_CATALOG.find((e) => e.href === href);
    return d ? rotulo(d.href, d.label) : href;
  };
  const total = AREAS_DO_SELETOR.length;
  const contagem = AREAS_DO_SELETOR.filter((href) => marcadas.has(href) || OBRIGATORIAS.includes(href)).length;

  function alternar(href: string, marcar: boolean) {
    const proximas = new Set(marcadas);
    if (marcar) proximas.add(href);
    else proximas.delete(href);
    aoMudar(proximas);
  }

  const grupos = [
    ...PORTAS.map(({ porta, itens }) => ({ chave: porta.id, titulo: rotuloPorNicho(porta.rotulo, "generico", idioma), itens })),
    ...(FORA.length > 0 ? [{ chave: "fora", titulo: texto(TEXTOS.areas.foraDoMenu, idioma), itens: FORA }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {texto(TEXTOS.areas.contador, idioma).replace("{n}", String(contagem)).replace("{m}", String(total))}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={desabilitado}
            onClick={() => aoMudar(new Set(AREAS_DO_SELETOR))}
            className="rounded-md border px-3 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            {texto(TEXTOS.areas.marcarTudo, idioma)}
          </button>
          <button
            type="button"
            disabled={desabilitado}
            onClick={() => aoMudar(new Set(OBRIGATORIAS))}
            className="rounded-md border px-3 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            {texto(TEXTOS.areas.soObrigatorias, idioma)}
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {grupos.map((grupo) => (
          <fieldset key={grupo.chave} className="space-y-1.5 rounded-md border p-3">
            <legend className="px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {grupo.titulo}
            </legend>
            {grupo.itens.map((d) => {
              const obrigatoria = OBRIGATORIAS.includes(d.href);
              const marcada = obrigatoria || marcadas.has(d.href);
              const faltam = marcada && DEPENDENCIAS[d.href] ? dependenciasFaltando(d.href, new Set([...marcadas, ...OBRIGATORIAS])) : [];
              const campo = `${id}-${d.href}`;
              return (
                <div key={d.href} className="flex items-start gap-2 text-sm">
                  <input
                    id={campo}
                    type="checkbox"
                    className="mt-1"
                    checked={marcada}
                    disabled={desabilitado || obrigatoria}
                    onChange={(e) => alternar(d.href, e.target.checked)}
                  />
                  <label htmlFor={campo} className="min-w-0 flex-1 break-words">
                    {rotulo(d.href, d.label)}
                    {obrigatoria ? (
                      <span className="ml-2 text-xs text-muted-foreground">{texto(TEXTOS.areas.obrigatoria, idioma)}</span>
                    ) : null}
                    {faltam.length > 0 ? (
                      <span className="ml-2 text-xs text-warning-fg">
                        {texto(TEXTOS.areas.precisaDe, idioma).replace("{x}", faltam.map(nomeDe).join(", "))}
                      </span>
                    ) : null}
                  </label>
                </div>
              );
            })}
          </fieldset>
        ))}
      </div>
    </div>
  );
}
