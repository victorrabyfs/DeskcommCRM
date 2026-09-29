"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState, useTransition } from "react";

import { apiClient } from "@/lib/api/client";
import { OBRIGATORIAS } from "@/lib/convexy/areas/calculo";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";

import { SeletorDeAreas } from "./SeletorDeAreas";

/**
 * A página de perfis de áreas do /admin (spec rev. 5, 4.1, fase 1): lista à
 * esquerda, editor à direita. A Completa só troca nome e descrição. Excluir só
 * perfil sem empresas (mover empresas ao excluir é da fase 2). Salvar manda a
 * versão lida; se outro admin salvou antes, a rota devolve 409 e a tela avisa.
 * CONVEXY.md, "Perfis de áreas".
 */
interface PerfilApi {
  id: string;
  nome: string;
  descricao: string;
  libera_tudo: boolean;
  areas: string[];
  updated_at: string;
  empresas: number;
}

type Rascunho = { id: string | null; nome: string; descricao: string; areas: ReadonlySet<string> };

const CHAVE = ["admin", "perfis-de-areas"] as const;

export function PerfisDeAreas() {
  const idioma = useIdioma();
  const id = useId();
  const consultas = useQueryClient();
  const { data, isError } = useQuery({
    queryKey: CHAVE,
    queryFn: async () => (await apiClient.get<{ data: PerfilApi[] }>("/api/v1/admin/perfis-de-areas")).data,
  });
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, startTransition] = useTransition();

  if (isError) {
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        {texto(TEXTOS.areas.erroLeitura, idioma)}
      </p>
    );
  }
  if (!data) return null;

  const perfil = data.find((p) => p.id === (escolhido ?? data[0]?.id)) ?? null;
  const emEdicao: Rascunho | null =
    rascunho ?? (perfil ? { id: perfil.id, nome: perfil.nome, descricao: perfil.descricao, areas: new Set(perfil.areas) } : null);

  function abrir(p: PerfilApi) {
    setErro(null);
    setConfirmando(false);
    setRascunho(null);
    setEscolhido(p.id);
  }

  function novo() {
    setErro(null);
    setRascunho({ id: null, nome: "", descricao: "", areas: new Set(OBRIGATORIAS) });
  }

  function executar(acao: () => Promise<unknown>, depois?: () => void) {
    setErro(null);
    startTransition(async () => {
      try {
        await acao();
        setRascunho(null);
        depois?.();
      } catch (e) {
        const mensagem = (e as { message?: string } | null)?.message;
        setErro(mensagem || texto(TEXTOS.areas.erro, idioma));
      }
      await consultas.invalidateQueries({ queryKey: CHAVE });
    });
  }

  function salvar() {
    if (!emEdicao) return;
    const areas = [...emEdicao.areas];
    if (emEdicao.id === null) {
      executar(() =>
        apiClient.post("/api/v1/admin/perfis-de-areas", { nome: emEdicao.nome, descricao: emEdicao.descricao, areas }),
      );
      return;
    }
    const atual = data!.find((p) => p.id === emEdicao.id)!;
    executar(() =>
      apiClient.patch(`/api/v1/admin/perfis-de-areas/${emEdicao.id}`, {
        nome: emEdicao.nome,
        descricao: emEdicao.descricao,
        ...(atual.libera_tudo ? {} : { areas }),
        versao: atual.updated_at,
      }),
    );
  }

  function excluir() {
    if (!emEdicao?.id) return;
    // Dois cliques, sem diálogo do navegador: o primeiro arma, o segundo exclui.
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setConfirmando(false);
    const alvo = emEdicao.id;
    executar(() => apiClient.delete(`/api/v1/admin/perfis-de-areas/${alvo}`), () => setEscolhido(null));
  }

  const liberaTudo = emEdicao?.id ? (data.find((p) => p.id === emEdicao.id)?.libera_tudo ?? false) : false;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{texto(TEXTOS.areas.paginaTitulo, idioma)}</h1>
        <p className="text-sm text-muted-foreground">{texto(TEXTOS.areas.paginaAjuda, idioma)}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <nav aria-label={texto(TEXTOS.areas.paginaTitulo, idioma)} className="space-y-2">
          <ul className="space-y-1">
            {data.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-current={emEdicao?.id === p.id ? "true" : undefined}
                  onClick={() => abrir(p)}
                  className="w-full rounded-md border px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden aria-[current=true]:border-primary"
                >
                  <span className="block font-medium">{p.nome}</span>
                  <span className="block text-xs text-muted-foreground">
                    {texto(TEXTOS.areas.empresas, idioma).replace("{n}", String(p.empresas))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={novo}
            className="w-full rounded-md border border-dashed px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            {texto(TEXTOS.areas.novo, idioma)}
          </button>
        </nav>
        {emEdicao ? (
          <section className="space-y-4 rounded-lg border bg-card p-5" aria-label={emEdicao.nome || texto(TEXTOS.areas.novo, idioma)}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">{texto(TEXTOS.areas.nome, idioma)}</span>
                <input
                  id={`${id}-nome`}
                  value={emEdicao.nome}
                  maxLength={60}
                  onChange={(e) => setRascunho({ ...emEdicao, nome: e.target.value })}
                  className="h-10 w-full rounded-md border bg-background px-3"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">{texto(TEXTOS.areas.descricao, idioma)}</span>
                <input
                  id={`${id}-descricao`}
                  value={emEdicao.descricao}
                  maxLength={200}
                  onChange={(e) => setRascunho({ ...emEdicao, descricao: e.target.value })}
                  className="h-10 w-full rounded-md border bg-background px-3"
                />
              </label>
            </div>
            {liberaTudo ? (
              <p className="text-sm text-muted-foreground">{texto(TEXTOS.areas.liberaTudo, idioma)}</p>
            ) : (
              <SeletorDeAreas
                marcadas={emEdicao.areas}
                desabilitado={salvando}
                aoMudar={(areas) => setRascunho({ ...emEdicao, areas })}
              />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || !emEdicao.nome.trim() || (!rascunho && emEdicao.id !== null)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
              >
                {emEdicao.id === null ? texto(TEXTOS.areas.criar, idioma) : texto(TEXTOS.areas.salvar, idioma)}
              </button>
              {emEdicao.id !== null && !liberaTudo ? (
                <button
                  type="button"
                  onClick={excluir}
                  disabled={salvando}
                  className="rounded-md border px-4 py-2 text-sm font-medium text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                >
                  {confirmando
                    ? texto(TEXTOS.areas.confirmarExclusao, idioma).replace("{nome}", emEdicao.nome)
                    : texto(TEXTOS.areas.excluir, idioma)}
                </button>
              ) : null}
            </div>
            {erro ? (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
