"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useTransition } from "react";

import { apiClient } from "@/lib/api/client";
import { DURACOES_DO_TESTE, diasRestantes, fimDoTeste } from "@/lib/convexy/teste-calculo";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { tagDeIdioma } from "@/lib/i18n/datas";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";

/**
 * "Período de teste" na página da empresa do /admin: mostra o fim, estende
 * (+7/+14/+30 dias a partir do fim atual, ou de agora se já passou), inicia um
 * teste ou encerra (contratou). Grava pela rota `…/teste` com a versão lida.
 * CONVEXY.md, "Trial".
 */
interface TesteApi {
  id: string;
  status: string;
  termina_em: string | null;
}

export function CartaoDoTeste({ organizationId }: { organizationId: string }) {
  const idioma = useIdioma();
  const consultas = useQueryClient();
  const caminho = `/api/v1/admin/tenants/${organizationId}/teste`;
  const chave = ["admin", "tenant", organizationId, "teste"] as const;
  const { data, isError } = useQuery({
    queryKey: chave,
    queryFn: async () => (await apiClient.get<{ data: TesteApi }>(caminho)).data,
  });
  const [estado, setEstado] = useState<"ok" | "erro" | null>(null);
  const [salvando, startTransition] = useTransition();

  if (isError || (data !== undefined && !("termina_em" in (data ?? {})))) {
    return (
      <section className="mt-6 rounded-lg border bg-card p-5">
        <p className="text-sm font-semibold">{texto(TEXTOS.teste.titulo, idioma)}</p>
        <p role="alert" className="text-sm text-destructive">
          {texto(TEXTOS.teste.erro, idioma)}
        </p>
      </section>
    );
  }
  if (!data) return null;
  const atual = data;

  function gravar(terminaEm: string | null) {
    setEstado(null);
    startTransition(async () => {
      try {
        await apiClient.patch(caminho, { termina_em: terminaEm, versao: atual.termina_em });
        setEstado("ok");
      } catch {
        setEstado("erro");
      }
      await consultas.invalidateQueries({ queryKey: chave });
    });
  }

  const agora = new Date();
  const fim = atual.termina_em ? new Date(atual.termina_em) : null;
  const base = fim && fim > agora ? fim : agora;
  const legivel = fim
    ? new Intl.DateTimeFormat(tagDeIdioma(idioma), { dateStyle: "short", timeStyle: "short" }).format(fim)
    : null;

  return (
    <section className="mt-6 space-y-3 rounded-lg border bg-card p-5">
      <h2 className="text-sm font-semibold">{texto(TEXTOS.teste.titulo, idioma)}</h2>
      <p className="text-xs text-muted-foreground">{texto(TEXTOS.teste.ajuda, idioma)}</p>
      <p className="text-sm">
        {fim && legivel
          ? texto(TEXTOS.teste.terminaEm, idioma)
              .replace("{data}", legivel)
              .replace("{n}", String(Math.max(0, diasRestantes(fim, agora))))
          : texto(TEXTOS.teste.semTesteAgora, idioma)}
      </p>
      {atual.status === "suspended" ? (
        <p className="text-xs text-warning-fg">{texto(TEXTOS.teste.suspensa, idioma)}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {DURACOES_DO_TESTE.map((dias) => (
          <button
            key={dias}
            type="button"
            disabled={salvando}
            onClick={() => gravar(fimDoTeste(dias, base))}
            className="rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            {fim
              ? texto(TEXTOS.teste.estender, idioma).replace("{n}", String(dias))
              : texto(TEXTOS.teste.iniciar, idioma).replace("{n}", String(dias))}
          </button>
        ))}
        {fim ? (
          <button
            type="button"
            disabled={salvando}
            onClick={() => gravar(null)}
            className="rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            {texto(TEXTOS.teste.encerrar, idioma)}
          </button>
        ) : null}
      </div>
      {estado === "ok" ? (
        <p role="status" className="text-sm text-muted-foreground">
          {texto(TEXTOS.teste.salvo, idioma)}
        </p>
      ) : null}
      {estado === "erro" ? (
        <p role="alert" className="text-sm text-destructive">
          {texto(TEXTOS.teste.erro, idioma)}
        </p>
      ) : null}
    </section>
  );
}
