import { TenantOverviewClient } from "./_client";
// Convexy: "Tipo de negócio" com o menu da Convexy ligado. CONVEXY.md, "Menu novo".
import { CampoDoNicho } from "@/components/convexy/CampoDoNicho";
import { MODULO_DO_MENU } from "@/lib/convexy/modulo";
import { moduloLigado } from "@/lib/instalacao/modulos";
import { createAdminClient } from "@/lib/supabase/admin";

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id } = await params;
  // Convexy: a decisão do módulo é do servidor; o cartão vem depois do painel do
  // original, sem prop nova nele. CONVEXY.md, "Menu novo".
  const menuConvexy = await moduloLigado(createAdminClient(), MODULO_DO_MENU);
  return (
    <>
      <TenantOverviewClient id={id} />
      {menuConvexy ? <CampoDoNicho organizationId={id} /> : null}
    </>
  );
}
