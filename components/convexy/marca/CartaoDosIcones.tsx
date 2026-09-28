"use client";
import { CampoDoIconeDaAba } from "@/components/branding/CampoDoIconeDaAba";
import { Card } from "@/components/ui/card";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";

import { CampoDeIconeDaMarca } from "./CampoDeIconeDaMarca";

/**
 * Convexy — o cartão "Ícones da marca" de `/admin/marca` (CONVEXY.md, "Símbolo e
 * ícone da aba"): as versões quadradas da marca juntas, num cartão próprio depois
 * do logo. O ícone da aba é o campo do original (`CampoDoIconeDaAba`, migration
 * 0443), trazido do cartão do logo para cá; o ícone escuro (9003) e o símbolo do
 * menu recolhido (9002) são da Convexy.
 *
 * `iconeDaAba` é repassado como literal novo a cada render do servidor — é o que
 * o `CampoDoIconeDaAba` usa como sinal de render novo (ver o cabeçalho dele).
 */
export function CartaoDosIcones({
  iconeDaAba,
  iconeEscuro,
  simbolo,
}: {
  iconeDaAba: string | null;
  iconeEscuro: string | null;
  simbolo: string | null;
}) {
  const idioma = useIdioma();
  return (
    <Card className="space-y-5 p-6" data-cartao-dos-icones="">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-text">{texto(TEXTOS.icones.titulo, idioma)}</h2>
        <p className="text-sm text-text-muted">{texto(TEXTOS.icones.descricao, idioma)}</p>
      </div>
      <CampoDoIconeDaAba iconeDaCamada={{ url: iconeDaAba }} />
      <CampoDeIconeDaMarca
        icone={{ peca: "icone", tema: "escuro" }}
        id="icone-da-aba-escuro"
        rotulo={TEXTOS.iconeEscuro.rotulo}
        ajuda={TEXTOS.iconeEscuro.ajuda}
        url={iconeEscuro}
        fundo="dark"
        textos={TEXTOS.iconeEscuro}
      />
      <CampoDeIconeDaMarca
        icone={{ peca: "simbolo" }}
        id="simbolo-da-marca"
        rotulo={TEXTOS.simbolo.rotulo}
        ajuda={TEXTOS.simbolo.ajuda}
        url={simbolo}
        fundo="light"
        textos={TEXTOS.simbolo}
      />
    </Card>
  );
}
