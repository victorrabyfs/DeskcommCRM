import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InterfaceEditor } from "@/components/team/InterfaceEditor";
import { ConvexyProvider, type ValorDaConvexy } from "@/lib/convexy/contexto";
import {
  combinarInterfaces,
  destinosDaInterface,
  interfaceSettingsSchema,
  type InterfaceSettings,
} from "@/lib/navigation/interface";

/**
 * Convexy — a tela de interface que já existe, reaproveitada (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.6). Só o
 * AGRUPAMENTO muda: pelas portas e grupos do menu novo, com uma caixa por porta.
 * Com o módulo desligado — ou fora do app, como na criação de organização do
 * /admin, que não tem ConvexyProvider — é o editor do original, e o Início não
 * aparece. O valor gravado é o mesmo nos dois modos. O Início sozinho nunca é
 * "área de trabalho" (Decisão 3).
 */
const CONVERSAS = ["/app/inbox", "/app/radar", "/app/templates", "/app/campaigns", "/app/calls"];
const ALERTA = "Selecione ao menos uma área de trabalho permitida ao papel.";

function desenhar(value: InterfaceSettings, convexy?: ValorDaConvexy) {
  const onChange = vi.fn<(valor: InterfaceSettings) => void>();
  const editor = <InterfaceEditor value={value} onChange={onChange} role="admin" />;
  render(convexy ? <ConvexyProvider {...convexy}>{editor}</ConvexyProvider> : editor);
  fireEvent.click(screen.getByText(/Personalizar áreas visíveis/));
  return onChange;
}
const ultimo = (onChange: ReturnType<typeof desenhar>) => onChange.mock.calls.at(-1)![0];

describe("com o módulo desligado, é o editor do original", () => {
  it("sem ConvexyProvider (criação de organização no /admin): grupos do original, sem o Início", () => {
    desenhar({ preset: "completa" });
    expect(screen.getByRole("group", { name: "Atendimento" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Início" })).toBeNull();
  });

  it("com o provider e o módulo desligado: idem", () => {
    desenhar({ preset: "completa" }, { menuLigado: false, nicho: "clinica" });
    expect(screen.getByRole("group", { name: "CRM" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Pacientes" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Início" })).toBeNull();
  });

  it("preset completa, alternar uma área: o Início (fora da tela) não entra no que se grava", () => {
    const semProvider = desenhar({ preset: "completa" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Tags" }));
    expect(ultimo(semProvider).destinos).toEqual(expect.arrayContaining(["/app/inbox"]));
    expect(ultimo(semProvider).destinos).not.toContain("/app");
    expect(ultimo(semProvider).destinos).not.toContain("/app/settings/tags");
    cleanup();
    const desligado = desenhar({ preset: "completa" }, { menuLigado: false, nicho: "clinica" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Tags" }));
    expect(ultimo(desligado).destinos).not.toContain("/app");
  });

  it("preset simplificada (que traz o Início), alternar uma área: o Início não entra no que se grava", () => {
    const onChange = desenhar({ preset: "simplificada" }, { menuLigado: false, nicho: "clinica" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Tarefas" }));
    expect(ultimo(onChange).destinos).toEqual(expect.arrayContaining(["/app/inbox", "/app/contacts"]));
    expect(ultimo(onChange).destinos).not.toContain("/app");
    expect(ultimo(onChange).destinos).not.toContain("/app/tasks");
  });

  it("editar no clássico não apaga o Início escolhido quando o módulo estava ligado", () => {
    const onChange = desenhar({ preset: "completa", destinos: ["/app", "/app/inbox", "/app/settings/tags"] });
    fireEvent.click(screen.getByRole("checkbox", { name: "Tags" }));
    expect(ultimo(onChange).destinos).toEqual(expect.arrayContaining(["/app", "/app/inbox"]));
    expect(ultimo(onChange).destinos).not.toContain("/app/settings/tags");
  });
});

describe("com o módulo ligado, agrupa pelas portas do mapa", () => {
  it("mostra as portas com os nomes do nicho, e o Início pode ser escondido", () => {
    desenhar({ preset: "completa" }, { menuLigado: true, nicho: "clinica" });
    for (const porta of ["Início", "Conversas", "Pacientes", "Funil de pacientes", "Configurações"]) {
      expect(screen.getByRole("group", { name: porta })).toBeInTheDocument();
    }
    expect(screen.queryByRole("group", { name: "Atendimento" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Início" })).toBeChecked();
  });

  it("a caixa da porta desmarca todas as áreas dela", () => {
    const onChange = desenhar({ preset: "completa" }, { menuLigado: true, nicho: "generico" });
    const caixa = screen.getByRole("checkbox", { name: "Todas as áreas de Conversas" });
    expect(caixa).toBeChecked();
    fireEvent.click(caixa);
    const destinos = ultimo(onChange).destinos ?? [];
    for (const href of CONVERSAS) expect(destinos).not.toContain(href);
    expect(destinos).toEqual(expect.arrayContaining(["/app", "/app/contacts"]));
  });

  it("e marca todas de novo", () => {
    const onChange = desenhar(
      { preset: "completa", destinos: ["/app/contacts"] },
      { menuLigado: true, nicho: "generico" },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Todas as áreas de Conversas" }));
    expect(ultimo(onChange).destinos).toEqual(expect.arrayContaining([...CONVERSAS, "/app/contacts"]));
  });
});

describe("o Início sozinho não é área de trabalho", () => {
  it("no clássico, só o Início escolhido (escondido) mostra o alerta", () => {
    desenhar({ preset: "completa", destinos: ["/app"] });
    expect(screen.getByRole("alert")).toHaveTextContent(ALERTA);
  });

  it("com o módulo ligado, só o Início escolhido também mostra o alerta", () => {
    desenhar({ preset: "completa", destinos: ["/app"] }, { menuLigado: true, nicho: "clinica" });
    expect(screen.getByRole("alert")).toHaveTextContent(ALERTA);
  });

  it("o Início com uma área de verdade não mostra alerta", () => {
    desenhar({ preset: "completa", destinos: ["/app", "/app/inbox"] }, { menuLigado: true, nicho: "clinica" });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("o dado gravado é o mesmo nos dois modos", () => {
  it("a mesma escolha grava o mesmo valor, depois do schema de escrita", () => {
    const inicial: InterfaceSettings = { preset: "completa", destinos: ["/app/inbox", "/app/settings/tags"] };
    const noClassico = desenhar(inicial);
    fireEvent.click(screen.getByRole("checkbox", { name: "Tags" }));
    const valorClassico = interfaceSettingsSchema.parse(ultimo(noClassico));
    cleanup();
    const nasPortas = desenhar(inicial, { menuLigado: true, nicho: "clinica" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Tags" }));
    expect(interfaceSettingsSchema.parse(ultimo(nasPortas))).toEqual(valorClassico);
    expect(valorClassico.destinos).toEqual(["/app/inbox"]);
  });

  it("combinarInterfaces continua valendo com o Início", () => {
    const combinada = combinarInterfaces(
      { preset: "completa", destinos: ["/app", "/app/inbox"] },
      { preset: "completa", destinos: ["/app"] },
    );
    expect(combinada.destinos).toEqual(["/app"]);
    const hrefs = destinosDaInterface(combinada, false, "agent", ["menu_convexy"]).map((d) => d.href);
    expect(hrefs).toEqual(expect.arrayContaining(["/app", "/app/settings/profile"]));
    expect(hrefs).not.toContain("/app/inbox");
  });
});
