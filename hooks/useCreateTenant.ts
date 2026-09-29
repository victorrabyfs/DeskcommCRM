"use client";
import type { InterfaceSettings } from "@/lib/navigation/interface";
import { useRef } from "react";
import { createTenantSchema } from "@/lib/schemas/tenant-creation";
import { randomId } from "@/lib/random-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateTenantPayload {
  /** Convexy: perfil de áreas escolhido na criação. CONVEXY.md, "Perfis de áreas". */
  perfil_de_areas_id?: string | null;
  /** Convexy: dias de teste (7, 14 ou 30; nulo = sem teste). CONVEXY.md, "Trial". */
  teste_dias?: 7 | 14 | 30 | null;
  display_name: string;
  slug: string;
  legal_name?: string;
  cnpj?: string;
  plan?: "standard" | "pro" | "enterprise";
  owner_email: string;
  owner_interface_settings?: InterfaceSettings;
}

export interface CreateTenantResponse {
  data: {
    id: string;
    slug: string;
    display_name: string;
    owner_invitation: {
      accept_url: string;
      expires_at: string;
      email_dispatched: boolean;
      email: string;
    } | null;
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCreateTenant() {
  const queryClient = useQueryClient();
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);

  return useMutation({
    mutationFn: (payload: CreateTenantPayload) => {
      // Convexy: o perfil viaja fora do schema do original (que descarta campo
      // desconhecido) e entra na impressão digital da intenção. CONVEXY.md, "Perfis de áreas".
      const normalized = {
        ...createTenantSchema.parse(payload),
        ...(payload.perfil_de_areas_id ? { perfil_de_areas_id: payload.perfil_de_areas_id } : {}),
        ...(payload.teste_dias ? { teste_dias: payload.teste_dias } : {}),
      };
      normalized.owner_email = normalized.owner_email.toLowerCase();
      const fingerprint = JSON.stringify(normalized);
      if (!intent.current || intent.current.fingerprint !== fingerprint) {
        intent.current = { fingerprint, key: randomId() };
      }
      // A chave sobrevive ao erro de transporte e ao próximo clique humano.
      return apiClient.post<CreateTenantResponse>("/api/v1/admin/tenants", normalized, {
        idempotencyKey: intent.current.key,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });
    },
  });
}
