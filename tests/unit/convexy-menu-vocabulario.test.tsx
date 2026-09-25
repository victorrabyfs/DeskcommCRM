import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { useT } from "@/hooks/i18n/useT";
import { ConvexyProvider } from "@/lib/convexy/contexto";
import type { Nicho } from "@/lib/convexy/nicho";
import { traduzir } from "@/lib/i18n/dicionario";
import { IdiomaProvider, useT as useTDoIdioma } from "@/lib/i18n/IdiomaProvider";
import type { Idioma } from "@/lib/i18n/idiomas";

/**
 * Convexy — o `useT` da Convexy (spec docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 6.3).
 * Troca SÓ quatro títulos exatos, só com o módulo ligado e o provider presente; em
 * qualquer outro caso devolve o mesmo que o `t` do provider de idioma.
 */
function arvore(idioma: Idioma, convexy?: { menuLigado: boolean; nicho: Nicho }) {
  return function Envoltorio({ children }: { children: ReactNode }) {
    return (
      <IdiomaProvider locale={idioma}>
        {convexy ? <ConvexyProvider {...convexy}>{children}</ConvexyProvider> : children}
      </IdiomaProvider>
    );
  };
}

function tDe(idioma: Idioma, convexy?: { menuLigado: boolean; nicho: Nicho }) {
  return renderHook(() => ({ convexy: useT(), original: useTDoIdioma() }), { wrapper: arvore(idioma, convexy) })
    .result.current;
}

/** Os quatro títulos da lista e textos comuns. */
const AMOSTRA = ["Inbox", "Radar de risco", "Funis", "Central de avisos", "Contatos", "Salvar", "Assumir"];

describe("fora do app ou com o módulo desligado, é o t do original", () => {
  it("sem ConvexyProvider (admin, telas públicas, onboarding): o mesmo resultado, texto a texto", () => {
    const { convexy, original } = tDe("es");
    for (const texto of AMOSTRA) expect(convexy(texto)).toBe(original(texto));
    // Controle de que o espanhol está mesmo em jogo (e o de cima não é tautologia em pt).
    expect(convexy("Contatos")).toBe("Contactos");
    expect(convexy("Funis")).toBe("Embudos");
  });

  it("com o provider e o módulo desligado: o mesmo resultado, qualquer nicho", () => {
    const { convexy, original } = tDe("es", { menuLigado: false, nicho: "clinica" });
    for (const texto of AMOSTRA) expect(convexy(texto)).toBe(original(texto));
    expect(convexy("Inbox")).toBe(traduzir("Inbox", "es"));
  });
});

describe("com o módulo ligado", () => {
  it.each([
    ["clinica", "Funil de pacientes"],
    ["servicos", "Funil de vendas"],
    ["generico", "Funil"],
    ["imobiliaria", "Funil"],
  ] as const)("nicho %s: Funis vira %s", (nicho, esperado) => {
    expect(tDe("pt-BR", { menuLigado: true, nicho }).convexy("Funis")).toBe(esperado);
  });

  it("os outros três títulos da lista", () => {
    const t = tDe("pt-BR", { menuLigado: true, nicho: "servicos" }).convexy;
    expect(t("Inbox")).toBe("Conversas");
    expect(t("Radar de risco")).toBe("Sem resposta");
    expect(t("Central de avisos")).toBe("Pedidos da IA");
  });

  it("só textos exatos: variação, prefixo e as palavras de fora da lista não mudam", () => {
    const { convexy, original } = tDe("es", { menuLigado: true, nicho: "clinica" });
    for (const texto of ["Inbox de hoje", "inbox", "Contatos", "Agentes", "Meta Ads", "Audit Log", "Salvar"]) {
      expect(convexy(texto)).toBe(original(texto));
    }
    expect(convexy("Contatos")).toBe("Contactos");
  });

  it("tem espanhol, e não é o português de volta", () => {
    const t = tDe("es", { menuLigado: true, nicho: "clinica" }).convexy;
    expect(t("Funis")).toBe("Embudo de pacientes");
    expect(t("Inbox")).toBe("Conversaciones");
    expect(t("Radar de risco")).toBe("Sin respuesta");
    expect(t("Central de avisos")).toBe("Pedidos de la IA");
  });

  it("o nicho é da árvore, nunca global: duas organizações lado a lado", () => {
    const clinica = tDe("pt-BR", { menuLigado: true, nicho: "clinica" }).convexy;
    const servicos = tDe("pt-BR", { menuLigado: true, nicho: "servicos" }).convexy;
    expect(clinica("Funis")).toBe("Funil de pacientes");
    expect(servicos("Funis")).toBe("Funil de vendas");
    expect(clinica("Funis")).toBe("Funil de pacientes");
  });

  it("a identidade é estável entre renders (quem põe t em dependência de efeito não entra em laço)", () => {
    const { result, rerender } = renderHook(() => useT(), {
      wrapper: arvore("pt-BR", { menuLigado: true, nicho: "clinica" }),
    });
    const primeira = result.current;
    rerender();
    expect(result.current).toBe(primeira);
  });
});
