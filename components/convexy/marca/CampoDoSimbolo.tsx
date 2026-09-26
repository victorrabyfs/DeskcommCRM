"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";

/**
 * Convexy — o símbolo da marca da instalação (CONVEXY.md, "Símbolo da marca"):
 * a arte quadrada que o menu recolhido mostra no lugar da inicial do nome.
 *
 * Mesma rota do logo do original (`/api/v1/marca/logo`, `tema=simbolo`, escopo da
 * instalação) e o mesmo contrato de envio imediato do `CampoDeLogo`: o arquivo
 * não espera o "Salvar" do formulário. A prévia usa o tamanho do menu (32px) nas
 * duas superfícies, clara e escura.
 */
export function CampoDoSimbolo({ simboloUrl }: { simboloUrl: string | null }) {
  const idioma = useIdioma();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [enviando, setEnviando] = useState(false);
  const [simbolo, setSimbolo] = useState(simboloUrl);

  async function pedir(requisicao: Promise<Response>, sucesso: string) {
    setEnviando(true);
    try {
      const resposta = await requisicao;
      const corpo = (await resposta.json().catch(() => null)) as {
        data?: { logo_url?: string | null };
        error?: { message?: string };
      } | null;
      if (!resposta.ok) {
        toast.error(corpo?.error?.message ?? texto(TEXTOS.simbolo.falhou, idioma));
        return;
      }
      toast.success(sucesso);
      setSimbolo(corpo?.data?.logo_url ?? null);
      startTransition(() => router.refresh());
    } finally {
      setEnviando(false);
    }
  }

  function enviar(arquivo: File) {
    const corpo = new FormData();
    corpo.set("escopo", "instalacao");
    corpo.set("tema", "simbolo");
    corpo.set("file", arquivo);
    void pedir(fetch("/api/v1/marca/logo", { method: "POST", body: corpo }), texto(TEXTOS.simbolo.enviado, idioma));
  }

  function remover() {
    void pedir(
      fetch("/api/v1/marca/logo?escopo=instalacao&tema=simbolo", { method: "DELETE" }),
      texto(TEXTOS.simbolo.removido, idioma),
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="simbolo-instalacao">{texto(TEXTOS.simbolo.rotulo, idioma)}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="simbolo-instalacao"
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
        {simbolo ? (
          <Button type="button" variant="outline" onClick={remover} disabled={enviando}>
            {texto(TEXTOS.simbolo.remover, idioma)}
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-text-muted">{texto(TEXTOS.simbolo.ajuda, idioma)}</p>
      {simbolo ? (
        <div className="space-y-2 pt-1">
          <p className="text-sm text-text-muted">{texto(TEXTOS.simbolo.previa, idioma)}</p>
          <div className="flex gap-3">
            {["light", "dark"].map((tema) => (
              <div
                key={tema}
                data-theme={tema}
                data-previa-do-simbolo={tema}
                className="grid size-14 place-items-center rounded-md border border-border bg-surface"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={simbolo} alt="" className="size-8 object-contain" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
