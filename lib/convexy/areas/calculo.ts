import { NAV_CATALOG } from "@/lib/navigation/catalogo";
import { PORTAS_ESSENCIAIS, destinosDaInterface, type InterfaceSettings } from "@/lib/navigation/interface";

/**
 * AS ÁREAS LIBERADAS de uma organização — perfis de áreas, fase 1 (spec
 * docs/superpowers/specs/2026-09-25-convexy-perfis-de-areas-design.md, rev. 5,
 * seções 0 e 3.2). Função pura: quem lê o banco entrega o perfil e os ajustes.
 *
 * Uma ÁREA é um href do catálogo de navegação. `null` = sem limite (o perfil
 * libera tudo e não há ajustes): o sistema fica exatamente como sem perfis.
 * CONVEXY.md, "Perfis de áreas".
 */

export interface PerfilDeAreas {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly liberaTudo: boolean;
  readonly areas: readonly string[];
}

export interface AreasDaEmpresa {
  readonly perfilId: string | null;
  readonly aMais: readonly string[];
  readonly aMenos: readonly string[];
}

const CATALOGO: readonly string[] = NAV_CATALOG.map((d) => d.href);

/** Sempre liberadas, em qualquer perfil (rev. 5, 0.2). */
export const OBRIGATORIAS: readonly string[] = [
  ...PORTAS_ESSENCIAIS,
  "/app",
  "/app/lgpd/requests",
  "/app/connections",
];

/**
 * Uma área só fica liberada com TODAS as de que depende. Sem Assistentes, um
 * roteador deixa conversa sem resposta e retornos, fluxos e prospecção acionam a
 * IA; Assistentes abre casos e pedidos.
 */
export const DEPENDENCIAS: Readonly<Record<string, readonly string[]>> = {
  "/app/ai/routers": ["/app/ai/agents"],
  "/app/ai/followups": ["/app/ai/agents"],
  "/app/ai/atendimento": ["/app/ai/agents"],
  "/app/prospecting": ["/app/ai/agents"],
  "/app/ai/agents": ["/app/ai/inbox", "/app/ai/cases"],
  "/app/ai/inbox": ["/app/ai/cases"],
};

export function semAjustes(empresa: AreasDaEmpresa): boolean {
  return empresa.aMais.length === 0 && empresa.aMenos.length === 0;
}

/**
 * Perfil `null` (sem perfil, ou perfil que o memo ainda não conhece) vale
 * Completa. Área que não existe no catálogo é ignorada (href morto de um perfil
 * antigo não abre nada).
 */
export function areasLiberadas(perfil: PerfilDeAreas | null, empresa: AreasDaEmpresa): ReadonlySet<string> | null {
  const liberaTudo = !perfil || perfil.liberaTudo;
  if (liberaTudo && semAjustes(empresa)) return null;
  const base = liberaTudo ? CATALOGO : perfil!.areas;
  const liberadas = new Set<string>(base);
  for (const href of empresa.aMais) liberadas.add(href);
  for (const href of empresa.aMenos) liberadas.delete(href);
  for (const href of OBRIGATORIAS) liberadas.add(href);
  // Fecho: tira quem perdeu uma dependência, até estabilizar (Casos → Pedidos → Assistentes → Roteadores).
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const [area, precisa] of Object.entries(DEPENDENCIAS)) {
      if (liberadas.has(area) && precisa.some((d) => !liberadas.has(d))) {
        liberadas.delete(area);
        mudou = true;
      }
    }
  }
  return new Set(CATALOGO.filter((href) => liberadas.has(href)));
}

/** A área de que uma liberada depende e que não está marcada — para o seletor dizer "precisa de X". */
export function dependenciasFaltando(area: string, marcadas: ReadonlySet<string>): string[] {
  return (DEPENDENCIAS[area] ?? []).filter((d) => !marcadas.has(d));
}

/**
 * A interface efetiva sob o limite: o que a pessoa escolheu (ou tudo, sem
 * escolha) ∩ as áreas liberadas. Nunca `destinos: []` — sem interseção, sobram as
 * obrigatórias (a mesma regra de `combinarInterfaces`). Sem limite, devolve a
 * interface como veio.
 */
export function limitarInterface(
  interfaceSettings: InterfaceSettings,
  liberadas: ReadonlySet<string> | null,
): InterfaceSettings {
  if (!liberadas) return interfaceSettings;
  const escolhidas = destinosDaInterface(interfaceSettings, true, "admin").map((d) => d.href);
  const comuns = escolhidas.filter((href) => liberadas.has(href));
  const destinos = comuns.length > 0 ? comuns : CATALOGO.filter((href) => OBRIGATORIAS.includes(href));
  return { preset: "completa", destinos: destinos as NonNullable<InterfaceSettings["destinos"]> };
}
