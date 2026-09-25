"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState, useTransition } from "react";

import { apiClient } from "@/lib/api/client";
import { lerNicho, type Nicho } from "@/lib/convexy/nicho";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { PACOTES } from "@/lib/onboarding/pacotes-de-funil";

/**
 * "Tipo de negócio" da organização — Convexy (spec 6.1). Só o admin da
 * plataforma chega aqui (`/admin`), e a página só o desenha com o menu da
 * Convexy ligado. Lê e grava pela rota própria `…/nicho`. As opções são os
 * pacotes de funil do onboarding — os mesmos ids da CHECK e o mesmo jeito de
 * o dono reconhecer o próprio negócio.
 */
export function CampoDoNicho({ organizationId }: { organizationId: string }) {
  const id = useId();
  const idioma = useIdioma();
  const consultas = useQueryClient();
  const caminho = `/api/v1/admin/tenants/${organizationId}/nicho`;
  const chave = ["admin", "tenant", organizationId, "nicho"] as const;
  const { data } = useQuery({
    queryKey: chave,
    queryFn: async () => (await apiClient.get<{ data: { id: string; nicho: Nicho } }>(caminho)).data,
    staleTime: 60_000,
  });
  const [falhou, setFalhou] = useState(false);
  const [salvando, startTransition] = useTransition();
  if (!data) return null;

  function escolher(nicho: Nicho) {
    setFalhou(false);
    startTransition(async () => {
      try {
        await apiClient.patch(caminho, { nicho });
      } catch {
        setFalhou(true);
      }
      await consultas.invalidateQueries({ queryKey: chave });
    });
  }

  return (
    <section className="mt-6 space-y-2 rounded-lg border bg-card p-5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {texto(TEXTOS.nicho.tipoDeNegocio, idioma)}
      </label>
      <p className="text-xs text-muted-foreground">{texto(TEXTOS.nicho.ajuda, idioma)}</p>
      <select
        id={id}
        value={data.nicho}
        disabled={salvando}
        onChange={(e) => escolher(lerNicho(e.target.value))}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        {PACOTES.map((pacote) => (
          <option key={pacote.id} value={pacote.id}>
            {texto(pacote.comoSeApresenta, idioma)}
          </option>
        ))}
      </select>
      {falhou ? (
        <p role="alert" className="text-sm text-destructive">
          {texto(TEXTOS.nicho.erro, idioma)}
        </p>
      ) : null}
    </section>
  );
}
