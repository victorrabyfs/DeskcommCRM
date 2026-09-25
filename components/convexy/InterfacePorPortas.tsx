"use client";
import { organizarPorPortas } from "@/lib/convexy/menu/mapa";
import { rotuloDoItem } from "@/lib/convexy/menu/montar";
import type { Nicho } from "@/lib/convexy/nicho";
import { TEXTOS, rotuloPorNicho, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import type { NavDestinationId, NavMetadata } from "@/lib/navigation/catalogo";
import type { InterfaceSettings } from "@/lib/navigation/interface";

/**
 * A escolha de áreas agrupada pelas PORTAS do menu da Convexy (spec 3.6) — o
 * mesmo `mapa.ts` que monta o menu, na mesma ordem e com os mesmos nomes: tela
 * nova do original aparece aqui na porta em que aparece no menu. As opções vêm
 * do `InterfaceEditor` do original; marcar e desmarcar segue a MESMA regra do
 * handler dele (o próximo conjunto parte das opções marcadas e mantém o
 * perfil), para o valor gravado ser o mesmo nos dois modos — o teste
 * "o dado gravado é o mesmo nos dois modos" prende a equivalência.
 */
export function InterfacePorPortas({
  opcoes,
  valor,
  selecionados,
  aoMudar,
  nicho,
}: {
  opcoes: readonly NavMetadata[];
  valor: InterfaceSettings;
  selecionados: ReadonlySet<string>;
  aoMudar: (valor: InterfaceSettings) => void;
  nicho: Nicho;
}) {
  const idioma = useIdioma();
  const portas = organizarPorPortas(opcoes)
    .map(({ porta, grupos }) => ({ porta, grupos: grupos.filter((g) => g.itens.length > 0) }))
    .filter((p) => p.grupos.length > 0);

  function alternar(hrefs: readonly string[], marcar: boolean) {
    const proximo = new Set(opcoes.filter((o) => selecionados.has(o.href)).map((o) => o.href));
    for (const href of hrefs) {
      if (marcar) proximo.add(href);
      else proximo.delete(href);
    }
    aoMudar({ preset: valor.preset, destinos: [...proximo] as NavDestinationId[] });
  }

  return (
    <>
      {portas.map(({ porta, grupos }) => {
        const rotulo = rotuloPorNicho(porta.rotulo, nicho, idioma);
        const hrefs = grupos.flatMap((g) => g.itens.map((d) => d.href));
        const marcadas = hrefs.filter((href) => selecionados.has(href)).length;
        return (
          <fieldset key={porta.id} className="space-y-2">
            <legend className="mb-1 text-xs font-medium text-muted-foreground uppercase">{rotulo}</legend>
            <input
              type="checkbox"
              aria-label={`${texto(TEXTOS.interface.todasDaPorta, idioma)} ${rotulo}`}
              checked={marcadas === hrefs.length}
              ref={(caixa) => {
                if (caixa) caixa.indeterminate = marcadas > 0 && marcadas < hrefs.length;
              }}
              onChange={(e) => alternar(hrefs, e.target.checked)}
            />
            {grupos.map(({ grupo, itens }) => (
              <div key={grupo.id} className="space-y-1 pl-5">
                {grupo.rotulo ? (
                  <p className="text-[11px] text-muted-foreground">{texto(grupo.rotulo, idioma)}</p>
                ) : null}
                {itens.map((d) => (
                  <label key={d.href} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selecionados.has(d.href)}
                      onChange={(e) => alternar([d.href], e.target.checked)}
                      className="mt-1"
                    />
                    {rotuloDoItem(d.href, d.label, nicho, idioma)}
                  </label>
                ))}
              </div>
            ))}
          </fieldset>
        );
      })}
    </>
  );
}
