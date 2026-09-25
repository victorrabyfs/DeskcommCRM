import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { homeDaInterface } from "@/lib/navigation/interface";
// Convexy: com o menu da Convexy ligado e o Início visível, `/app` é o Início.
// CONVEXY.md, "Menu novo".
import { Inicio } from "./_convexy/inicio/Inicio";
import { destinosDoInicio } from "./_convexy/inicio/visibilidade";
export default async function AppHome() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  // Convexy: o Início, ou o redirect do original. CONVEXY.md, "Menu novo".
  const visiveis = org ? await destinosDoInicio(user, org) : null;
  if (org && visiveis) return <Inicio user={user} org={org} visiveis={visiveis} />;
  redirect(
    homeDaInterface(
      org?.interface_settings,
      user.is_platform_admin && !user.support,
      org?.role ?? null,
    ),
  );
}
