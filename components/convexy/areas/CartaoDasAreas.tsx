"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState, useTransition } from "react";

import { apiClient } from "@/lib/api/client";
import { OBRIGATORIAS, areasLiberadas, type PerfilDeAreas } from "@/lib/convexy/areas/calculo";
import { AREAS_DO_SELETOR } from "@/lib/convexy/areas/esquema";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";

import { SeletorDeAreas } from "./SeletorDeAreas";

/**
 * "Áreas liberadas" na página da empresa do /admin (spec rev. 5, 4.3). O admin da
 * plataforma escolhe o perfil e, se quiser, personaliza a lista FINAL; o que for
 * gravado são os ajustes sobre o perfil (a mais / a menos), para uma edição do
 * perfil continuar valendo para esta empresa. CONVEXY.md, "Perfis de áreas".
 */
interface AreasDaEmpresaApi {
  id: string;
  perfil_de_areas_id: string | null;
  areas_a_mais: string[];
  areas_a_menos: string[];
  versao: string | null;
}

interface PerfilApi {
  id: string;
  nome: string;
  descricao: string;
  libera_tudo: boolean;
  areas: string[];
}

const doPerfil = (p: PerfilApi): PerfilDeAreas => ({
  id: p.id,
  nome: p.nome,
  descricao: p.descricao,
  liberaTudo: p.libera_tudo,
  areas: p.areas,
});

/** O que o perfil sozinho libera, no universo do seletor. */
function baseDo(perfil: PerfilApi | undefined): Set<string> {
  if (!perfil || perfil.libera_tudo) return new Set(AREAS_DO_SELETOR);
  return new Set([...perfil.areas, ...OBRIGATORIAS].filter((h) => AREAS_DO_SELETOR.includes(h)));
}

export function CartaoDasAreas({ organizationId }: { organizationId: string }) {
  const idioma = useIdioma();
  const idDoPerfil = useId();
  const consultas = useQueryClient();
  const caminho = `/api/v1/admin/tenants/${organizationId}/areas`;
  const chave = ["admin", "tenant", organizationId, "areas"] as const;
  const empresa = useQuery({
    queryKey: chave,
    queryFn: async () => (await apiClient.get<{ data: AreasDaEmpresaApi }>(caminho)).data,
  });
  const perfis = useQuery({
    queryKey: ["admin", "perfis-de-areas"],
    queryFn: async () => (await apiClient.get<{ data: PerfilApi[] }>("/api/v1/admin/perfis-de-areas")).data,
  });
  const [rascunho, setRascunho] = useState<{ perfilId: string; marcadas: ReadonlySet<string> } | null>(null);
  const [personalizando, setPersonalizando] = useState(false);
  const [estado, setEstado] = useState<"ok" | "erro" | null>(null);
  const [salvando, startTransition] = useTransition();

  // Resposta fora do formato conta como leitura que falhou — nunca derruba a página do admin.
  const formaInvalida =
    (perfis.data !== undefined && !Array.isArray(perfis.data)) ||
    (empresa.data !== undefined && !Array.isArray(empresa.data?.areas_a_mais));
  if (empresa.isError || perfis.isError || formaInvalida) {
    return (
      <section className="mt-6 rounded-lg border bg-card p-5">
        <p className="text-sm font-semibold">{texto(TEXTOS.areas.titulo, idioma)}</p>
        <p role="alert" className="text-sm text-destructive">
          {texto(TEXTOS.areas.erroLeitura, idioma)}
        </p>
      </section>
    );
  }
  if (!empresa.data || !perfis.data) return null;

  const lista = perfis.data;
  const completa = lista.find((p) => p.libera_tudo);
  const perfilSalvo = empresa.data.perfil_de_areas_id ?? completa?.id ?? "";
  const perfilId = rascunho?.perfilId ?? perfilSalvo;
  const perfil = lista.find((p) => p.id === perfilId);
  const salvas = areasLiberadas(perfil ? doPerfil(perfil) : null, {
    perfilId: empresa.data.perfil_de_areas_id,
    aMais: empresa.data.areas_a_mais,
    aMenos: empresa.data.areas_a_menos,
  });
  const marcadas: ReadonlySet<string> =
    rascunho?.marcadas ?? new Set(salvas ? [...salvas] : AREAS_DO_SELETOR);
  const ajustes = empresa.data.areas_a_mais.length + empresa.data.areas_a_menos.length;

  function trocarPerfil(novo: string) {
    setEstado(null);
    // Trocar de perfil recomeça pela lista do perfil novo (ajustes antigos saem).
    setRascunho({ perfilId: novo, marcadas: baseDo(lista.find((p) => p.id === novo)) });
  }

  function salvar() {
    setEstado(null);
    const base = baseDo(perfil);
    const final = new Set([...marcadas, ...OBRIGATORIAS]);
    const aMais = AREAS_DO_SELETOR.filter((h) => final.has(h) && !base.has(h));
    const aMenos = AREAS_DO_SELETOR.filter((h) => !final.has(h) && base.has(h) && !OBRIGATORIAS.includes(h));
    startTransition(async () => {
      try {
        await apiClient.patch(caminho, {
          perfil_de_areas_id: perfil?.libera_tudo && aMais.length === 0 && aMenos.length === 0 ? null : perfilId || null,
          areas_a_mais: aMais,
          areas_a_menos: aMenos,
          versao: empresa.data!.versao,
        });
        setEstado("ok");
        setRascunho(null);
      } catch {
        setEstado("erro");
      }
      await consultas.invalidateQueries({ queryKey: chave });
    });
  }

  return (
    <section className="mt-6 space-y-3 rounded-lg border bg-card p-5" aria-labelledby={`${idDoPerfil}-titulo`}>
      <h2 id={`${idDoPerfil}-titulo`} className="text-sm font-semibold">
        {texto(TEXTOS.areas.titulo, idioma)}
      </h2>
      <p className="text-xs text-muted-foreground">{texto(TEXTOS.areas.ajuda, idioma)}</p>
      <label htmlFor={idDoPerfil} className="block text-sm font-medium">
        {texto(TEXTOS.areas.perfil, idioma)}
      </label>
      <select
        id={idDoPerfil}
        value={perfilId}
        disabled={salvando}
        onChange={(e) => trocarPerfil(e.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        {lista.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      {ajustes > 0 && !rascunho ? (
        <p className="text-xs text-muted-foreground">{texto(TEXTOS.areas.ajustes, idioma).replace("{n}", String(ajustes))}</p>
      ) : null}
      <button
        type="button"
        aria-expanded={personalizando}
        onClick={() => setPersonalizando((v) => !v)}
        className="text-sm font-medium text-accent hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
      >
        {texto(TEXTOS.areas.personalizar, idioma)}
      </button>
      {personalizando ? (
        <SeletorDeAreas
          marcadas={marcadas}
          desabilitado={salvando}
          aoMudar={(proximas) => {
            setEstado(null);
            setRascunho({ perfilId, marcadas: proximas });
          }}
        />
      ) : null}
      {rascunho ? (
        <div className="space-y-2">
          <p className="text-xs text-warning-fg">{texto(TEXTOS.areas.avisoFase1, idioma)}</p>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            {texto(TEXTOS.areas.salvar, idioma)}
          </button>
        </div>
      ) : null}
      {estado === "ok" ? (
        <p role="status" className="text-sm text-muted-foreground">
          {texto(TEXTOS.areas.salvo, idioma)}
        </p>
      ) : null}
      {estado === "erro" ? (
        <p role="alert" className="text-sm text-destructive">
          {texto(TEXTOS.areas.erro, idioma)}
        </p>
      ) : null}
    </section>
  );
}
