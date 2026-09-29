/**
 * Os perfis que a migration 9005 semeia, na MESMA ordem e com os mesmos ids.
 * `tests/invariants/convexy-perfis-de-areas.test.ts` compara com o banco, e
 * `tests/unit/convexy-areas.test.ts` confere que toda área existe no catálogo e
 * que Essencial é a lista `SIMPLIFICADA` do sistema. Spec
 * docs/superpowers/specs/2026-09-25-convexy-perfis-de-areas-design.md (rev. 5, 0.2).
 */
export interface PerfilSemente {
  readonly id: string;
  readonly nome: string;
  readonly liberaTudo: boolean;
  readonly areas: readonly string[];
}

export const ID_DA_COMPLETA = "c0a1e7a0-9005-4000-8000-000000000001";

export const PERFIS_SEMENTE: readonly PerfilSemente[] = [
  { id: ID_DA_COMPLETA, nome: "Completa", liberaTudo: true, areas: [] },
  {
    id: "c0a1e7a0-9005-4000-8000-000000000002",
    nome: "Essencial",
    liberaTudo: false,
    areas: ["/app", "/app/inbox", "/app/agenda", "/app/kanban", "/app/contacts", "/app/tasks", "/app/connections"],
  },
  {
    id: "c0a1e7a0-9005-4000-8000-000000000003",
    nome: "Clínicas",
    liberaTudo: false,
    areas: [
      "/app",
      "/app/inbox", "/app/radar", "/app/templates", "/app/campaigns",
      "/app/kanban", "/app/tasks",
      "/app/agenda",
      "/app/contacts",
      "/app/ai/agents", "/app/ai/knowledge/sources", "/app/ai/inbox", "/app/ai/cases", "/app/ai/proposals",
      "/app/ai/runs", "/app/ai/usage", "/app/ai/cases/avisos", "/app/ai/providers", "/app/ai/credentials",
      "/app/ai/memory", "/app/ai/skills",
      "/app/ai/followups", "/app/ai/routers", "/app/ai/atendimento",
      "/app/settings/tenant/agenda", "/app/settings/tenant",
      "/app/metrics", "/app/ads/meta", "/app/activities",
      "/app/connections", "/app/team", "/app/settings/tags", "/app/settings/tenant/pipelines",
      "/app/settings/atendimento", "/app/settings/marca",
      "/app/settings/profile", "/app/settings/security", "/app/settings/notifications", "/app/lgpd/requests",
    ],
  },
];
