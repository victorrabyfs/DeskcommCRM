"use client";
import { useMemo } from "react";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { useConvexy } from "@/lib/convexy/contexto";
import { montarMenu, type PortaDoMenu } from "@/lib/convexy/menu/montar";
import { NICHO_PADRAO } from "@/lib/convexy/nicho";
import { useIdioma } from "@/lib/i18n/IdiomaProvider";
import { searchable } from "@/lib/navigation/registry";

/**
 * As portas de quem está logado (spec 3.5): `searchable()` com os mesmos quatro
 * argumentos da busca ⌘K e do `Sidebar` do original. O primeiro é
 * `user.is_platform_admin && !user.support`, que também decide a tela de
 * atualização — a regra do `VersionFooter`.
 */
export function useMenuConvexy(): readonly PortaDoMenu[] {
  const { user, activeOrg } = useAuth();
  const convexy = useConvexy();
  const idioma = useIdioma();
  const plataforma = user.is_platform_admin && !user.support;
  const nicho = convexy?.nicho ?? NICHO_PADRAO;
  const role = activeOrg?.role ?? null;
  const interfaceSettings = activeOrg?.interface_settings;
  const modulos = activeOrg?.modulos_ligados;
  return useMemo(
    () =>
      montarMenu({
        visiveis: searchable(plataforma, role, interfaceSettings, modulos ?? []),
        atualizacao: plataforma,
        nicho,
        idioma,
      }),
    [plataforma, role, interfaceSettings, modulos, nicho, idioma],
  );
}
