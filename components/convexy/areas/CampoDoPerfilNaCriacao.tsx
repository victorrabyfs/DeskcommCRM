"use client";
import { useQuery } from "@tanstack/react-query";
import { useId } from "react";

import { apiClient } from "@/lib/api/client";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";

/**
 * "Áreas liberadas" na criação da empresa (spec rev. 5, 4.2, fase 1): os perfis
 * da instalação, com o que libera tudo como padrão explícito. `null` = Completa
 * (a organização nasce sem perfil). Sem a leitura, o campo não aparece e a
 * empresa nasce em Completa — o admin ajusta depois na página dela.
 * CONVEXY.md, "Perfis de áreas".
 */
export function CampoDoPerfilNaCriacao({
  valor,
  aoMudar,
}: {
  valor: string | null;
  aoMudar: (perfilId: string | null) => void;
}) {
  const id = useId();
  const idioma = useIdioma();
  const { data } = useQuery({
    queryKey: ["admin", "perfis-de-areas"],
    queryFn: async () =>
      (await apiClient.get<{ data: Array<{ id: string; nome: string; libera_tudo: boolean }> }>(
        "/api/v1/admin/perfis-de-areas",
      )).data,
  });
  if (!data) return null;
  const completa = data.find((p) => p.libera_tudo);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {texto(TEXTOS.areas.titulo, idioma)}
      </label>
      <select
        id={id}
        value={valor ?? completa?.id ?? ""}
        onChange={(e) => {
          const escolhido = data.find((p) => p.id === e.target.value);
          aoMudar(!escolhido || escolhido.libera_tudo ? null : escolhido.id);
        }}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        {data.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
