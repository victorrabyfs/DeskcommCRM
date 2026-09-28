"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { type Texto, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";

/** A peça quadrada da marca que a Convexy acrescenta, e a coluna em que ela mora. */
export type IconeDaMarca =
  | { readonly peca: "simbolo" } // símbolo do menu recolhido (migration 9002)
  | { readonly peca: "icone"; readonly tema: "escuro" }; // ícone da aba no modo escuro (9003)

interface Props {
  readonly icone: IconeDaMarca;
  readonly id: string;
  readonly rotulo: Texto;
  readonly ajuda: Texto;
  /** A peça gravada, já como URL pública; `null` = nenhuma. */
  readonly url: string | null;
  /** Fundo da prévia: o ícone escuro é visto sobre fundo escuro. */
  readonly fundo: "light" | "dark";
  readonly textos: {
    readonly remover: Texto;
    readonly enviado: Texto;
    readonly removido: Texto;
    readonly falhou: Texto;
  };
}

/**
 * Convexy — um campo de peça quadrada da marca da instalação (CONVEXY.md,
 * "Símbolo e ícone da aba"). Mesma rota e mesmo contrato do `CampoDoIconeDaAba`
 * do original (`/api/v1/marca/logo`, envio imediato, sem o "Salvar"), e pelo
 * mesmo motivo sem o `ajustarLogo`: aquele ajuste reduz pela largura, pensando
 * num logotipo horizontal, e a peça aqui é quadrada.
 */
export function CampoDeIconeDaMarca({ icone, id, rotulo, ajuda, url, fundo, textos }: Props) {
  const idioma = useIdioma();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [enviando, setEnviando] = useState(false);
  const [gravado, setGravado] = useState(url);
  const busca = new URLSearchParams({ escopo: "instalacao", peca: icone.peca });
  if (icone.peca === "icone") busca.set("tema", icone.tema);

  async function pedir(requisicao: Promise<Response>, sucesso: Texto) {
    setEnviando(true);
    try {
      const resposta = await requisicao;
      const corpo = (await resposta.json().catch(() => null)) as {
        data?: { logo_url?: string | null };
        error?: { message?: string };
      } | null;
      if (!resposta.ok) {
        toast.error(corpo?.error?.message ?? texto(textos.falhou, idioma));
        return;
      }
      toast.success(texto(sucesso, idioma));
      setGravado(corpo?.data?.logo_url ?? null);
      startTransition(() => router.refresh());
    } finally {
      setEnviando(false);
    }
  }

  function enviar(arquivo: File) {
    const corpo = new FormData();
    for (const [chave, valor] of busca) corpo.set(chave, valor);
    corpo.set("file", arquivo);
    void pedir(fetch("/api/v1/marca/logo", { method: "POST", body: corpo }), textos.enviado);
  }

  function remover() {
    void pedir(fetch(`/api/v1/marca/logo?${busca}`, { method: "DELETE" }), textos.removido);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{texto(rotulo, idioma)}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <div
          data-theme={fundo}
          data-previa-do-icone-da-marca={gravado ? "arquivo" : "vazio"}
          className="grid size-10 shrink-0 place-items-center rounded-sm border border-border bg-surface"
        >
          {gravado ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gravado} alt="" className="size-8 object-contain" />
          ) : null}
        </div>
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg"
          disabled={enviando}
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0];
            if (arquivo) enviar(arquivo);
            evento.target.value = "";
          }}
          className="max-w-xs text-sm file:mr-3 file:cursor-pointer file:rounded-sm file:border file:border-border file:bg-surface-elevated file:px-3 file:py-1.5 file:text-sm"
        />
        {gravado ? (
          <Button type="button" variant="outline" onClick={remover} disabled={enviando}>
            {texto(textos.remover, idioma)}
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-text-muted">{texto(ajuda, idioma)}</p>
    </div>
  );
}
