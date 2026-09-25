"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { hrefDaOrientacao, type RespostaDasOrientacoes } from "@/lib/convexy/orientacoes";

export interface EstadoDasOrientacoes {
  readonly itens: ReadonlyArray<{ readonly href: string; readonly rotulo: string }>;
  readonly indisponivel: boolean;
}

/**
 * As orientações instaladas, carregadas quando a porta Contatos abre (spec 3.4).
 * Uma chave só no react-query: desktop e gaveta dividem o cache, e depois da
 * primeira leitura os itens seguem disponíveis com a consulta desligada.
 * Falha de rede vale como "não deu para ler" — o aviso aparece, como no hub.
 */
export function useOrientacoes(consultar: boolean): EstadoDasOrientacoes {
  const { data, isError } = useQuery({
    queryKey: ["convexy", "orientacoes"],
    queryFn: async () =>
      (await apiClient.get<{ data: RespostaDasOrientacoes }>("/api/v1/convexy/orientacoes")).data,
    enabled: consultar,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  return {
    itens: (data?.orientacoes ?? []).map((o) => ({ href: hrefDaOrientacao(o.installation_id), rotulo: o.titulo })),
    indisponivel: isError || data?.indisponivel === true,
  };
}
