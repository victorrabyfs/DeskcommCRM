import { PerfisDeAreas } from "@/components/convexy/areas/PerfisDeAreas";

export const metadata = { title: "Perfis de áreas" };
export const dynamic = "force-dynamic";

/**
 * Convexy — perfis de áreas da instalação (spec
 * docs/superpowers/specs/2026-09-25-convexy-perfis-de-areas-design.md, rev. 5,
 * 4.1). O `(protected)/layout.tsx` já exige o admin da plataforma; as rotas
 * `/api/v1/admin/perfis-de-areas` exigem de novo. CONVEXY.md, "Perfis de áreas".
 */
export default function PerfisDeAreasPage() {
  return <PerfisDeAreas />;
}
