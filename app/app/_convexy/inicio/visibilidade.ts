import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import { HREF_DO_INICIO } from "@/lib/convexy/menu/mapa";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
import { modulosLigados } from "@/lib/instalacao/modulos";
import { searchable } from "@/lib/navigation/registry";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * O Início aparece em `/app`? Só com o módulo ligado e o Início em
 * `searchable()` — ou seja, não escondido pela interface (spec 7). Devolve a
 * lista do que a pessoa vê (os blocos só aparecem se o destino deles está nela),
 * ou `null` para o `/app` seguir o redirect do original. `platform_config` só é
 * lida pelo service role, como nos hubs do original.
 */
export async function destinosDoInicio(user: AuthUser, org: ActiveOrg): Promise<readonly string[] | null> {
  const modulos = await modulosLigados(createAdminClient());
  if (!modulos.includes(MODULO_DO_MENU)) return null;
  const hrefs = searchable(user.is_platform_admin && !user.support, org.role, org.interface_settings, modulos).map(
    (d) => d.href,
  );
  return hrefs.includes(HREF_DO_INICIO) ? hrefs : null;
}
