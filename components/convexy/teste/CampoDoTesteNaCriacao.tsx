"use client";
import { useId } from "react";

import { DURACOES_DO_TESTE } from "@/lib/convexy/teste-calculo";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";

/**
 * "Período de teste" na criação da empresa: sem teste, 7, 14 ou 30 dias (14 por
 * padrão, escolhido pelo formulário). CONVEXY.md, "Trial".
 */
export function CampoDoTesteNaCriacao({
  valor,
  aoMudar,
}: {
  valor: 7 | 14 | 30 | null;
  aoMudar: (dias: 7 | 14 | 30 | null) => void;
}) {
  const id = useId();
  const idioma = useIdioma();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {texto(TEXTOS.teste.titulo, idioma)}
      </label>
      <select
        id={id}
        value={valor === null ? "" : String(valor)}
        onChange={(e) => aoMudar(e.target.value ? (Number(e.target.value) as 7 | 14 | 30) : null)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        <option value="">{texto(TEXTOS.teste.semTeste, idioma)}</option>
        {DURACOES_DO_TESTE.map((dias) => (
          <option key={dias} value={String(dias)}>
            {texto(TEXTOS.teste.nDias, idioma).replace("{n}", String(dias))}
          </option>
        ))}
      </select>
    </div>
  );
}
