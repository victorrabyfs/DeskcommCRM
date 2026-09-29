"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { useMarcaDaInstalacao } from "@/lib/branding/contexto";
import { OBRIGATORIAS } from "@/lib/convexy/areas/calculo";
import { donoDoCaminho } from "@/lib/convexy/menu/dono";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { NAV_CATALOG } from "@/lib/navigation/catalogo";

const CATALOGO: readonly string[] = NAV_CATALOG.map((d) => d.href);

/**
 * A tela de uma área fora do pacote (perfis de áreas, fase 1 — spec rev. 5,
 * 3.3.4). O menu, a busca e o Início já não mostram a área; isto cobre quem
 * chega pelo endereço ou por um link interno. A área dona do caminho sai de
 * `donoDoCaminho` sobre o catálogo inteiro (com os `DONOS_EXTRAS`). Nunca
 * bloqueia obrigatórias nem páginas sem dono (os hubs), e sem limite no
 * `activeOrg` não faz nada. É apresentação: o servidor da tela ainda roda.
 * CONVEXY.md, "Perfis de áreas".
 */
export function GuardaDoPacote({ children }: { children: ReactNode }) {
  const { activeOrg } = useAuth();
  const caminho = usePathname();
  const liberadas = activeOrg?.areas_liberadas;
  if (!liberadas || !caminho) return children;
  const dono = donoDoCaminho(caminho, CATALOGO);
  if (!dono || OBRIGATORIAS.includes(dono) || liberadas.includes(dono)) return children;
  return <ForaDoPacote admin={activeOrg?.role === "admin"} />;
}

function ForaDoPacote({ admin }: { admin: boolean }) {
  const idioma = useIdioma();
  const marca = useMarcaDaInstalacao();
  const aviso = admin
    ? texto(TEXTOS.pacote.paraAdmin, idioma).replace("{marca}", marca.name)
    : texto(TEXTOS.pacote.paraMembro, idioma);
  return (
    <section role="status" className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-lg font-semibold text-text">{texto(TEXTOS.pacote.titulo, idioma)}</h1>
      <p className="text-sm text-text-muted">{aviso}</p>
      <Link
        href="/app"
        className="text-sm font-medium text-accent hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
      >
        {texto(TEXTOS.pacote.voltar, idioma)}
      </Link>
    </section>
  );
}
