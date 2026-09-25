import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Convexy — cercas de texto do menu novo. `barra-lateral-nao-flutua` lê só o
 * `Sidebar.tsx` e o `AppShell.tsx` do original; o trilho da Convexy mora em outro
 * arquivo e precisa da mesma cerca, mais as medidas, os tokens e o movimento da
 * spec (docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 4) e do
 * protótipo aprovado (rodada 2).
 */
const RAIZ = process.cwd();
const leia = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (fonte: string) => fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function arquivos(dir: string): string[] {
  return readdirSync(join(RAIZ, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? arquivos(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  );
}

const DA_CONVEXY = arquivos("components/convexy").filter((f) => /\.(tsx?|css)$/.test(f));
const TUDO = DA_CONVEXY.map((f) => semComentarios(leia(f))).join("\n");
const MENU = semComentarios(leia("components/convexy/menu/MenuConvexy.tsx"));
const CSS = semComentarios(leia("components/convexy/menu/menu.css"));

describe("o trilho ocupa lugar, como o Sidebar do original", () => {
  it("é sticky, da altura da tela, não encolhe e não flutua", () => {
    expect(MENU).toMatch(/sticky top-0/);
    expect(MENU).toMatch(/h-screen/);
    expect(MENU).toMatch(/shrink-0/);
    expect(MENU).not.toMatch(/\bfixed\b/);
  });

  it("a casca troca só o menu e mantém o contrato do rodapé", () => {
    const casca = leia("app/app/_components/AppShell.tsx");
    expect(casca).toMatch(/useOcupacaoDoRodape\(\)/);
    expect(casca).toMatch(/estiloDaReserva\(/);
    expect(casca).toContain("<MenuConvexy recolhido={sidebarCollapsed} />");
    expect(casca).toContain("<Sidebar collapsed={sidebarCollapsed} />");
    expect(casca).not.toMatch(/\bml-(?:16|60)\b/);
  });
});

describe("as medidas da spec e do protótipo estão no código", () => {
  it.each([
    ["menu largo de 236px", "w-[236px]"],
    ["trilho compacto de 64px", "w-16"],
    ["sub-sidebar de 240px", "w-60"],
    ["porta de 38px", "h-[38px]"],
    ["porta compacta de 40px", "h-10"],
    ["texto da porta de 14,5px", "text-[14.5px]"],
    ["ícone da porta de 19px", "size-[19px]"],
    ["ícone compacto de 20px", "size-5"],
    ["item de 32px", "min-h-8"],
    ["texto do item de 13,5px", "text-[13.5px]"],
    ["título da sub-sidebar de 15,5px", "text-[15.5px]"],
    ["recuo do item no hover", "hover:pl-[13px]"],
    ["alça a 44px do topo", "top-11"],
    ["largura em 300ms", "duration-300"],
    ["realces em 200ms", "duration-200"],
    ["curva da spec", "cubic-bezier(.2,.8,.2,1)"],
    ["afundar no clique", "active:scale-[.97]"],
    ["sem afundar com movimento reduzido", "motion-reduce:active:scale-100"],
    ["fundo da sobreposição sem rolagem horizontal", "w-[calc(100vw-100%)]"],
    ["rolagem contida no trilho e na lista", "overscroll-contain"],
    ["dica da descrição depois de 500ms", "delayDuration={500}"],
  ])("%s", (_medida, classe) => {
    expect(TUDO).toContain(classe);
  });
});

describe("tema, foco e movimento", () => {
  it("nenhuma cor literal em components/convexy — só tokens", () => {
    expect(TUDO).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
  });

  it("foco visível com `outline-hidden`, nunca `outline-none`", () => {
    expect(TUDO).not.toMatch(/(?<=[\s"'`:])outline-none(?=[\s"'`!]|$)/);
    expect(TUDO).toContain("focus-visible:outline-hidden");
  });

  it("nome longo quebra a linha na sub-sidebar, nunca é cortado", () => {
    expect(semComentarios(leia("components/convexy/menu/SubSidebar.tsx"))).not.toMatch(/\btruncate\b/);
    expect(semComentarios(leia("components/convexy/menu/ListaDaPorta.tsx"))).not.toMatch(/\btruncate\b/);
  });

  it("rótulo de grupo em text-muted (contraste AA no escuro)", () => {
    expect(semComentarios(leia("components/convexy/menu/ListaDaPorta.tsx"))).toMatch(/uppercase[^"]*text-text-muted|text-text-muted[^"]*uppercase/);
  });

  it("toda animação mora dentro de prefers-reduced-motion: no-preference", () => {
    const bloco = "@media (prefers-reduced-motion: no-preference)";
    expect(CSS).toContain(bloco);
    expect(CSS.slice(0, CSS.indexOf(bloco))).not.toMatch(/animation:/);
    expect(CSS.slice(CSS.indexOf(bloco))).toMatch(/animation:/);
  });

  it("a barra do ativo só cresce (scale), sem translate nos keyframes", () => {
    const barra = CSS.slice(CSS.indexOf("@keyframes convexy-barra-cresce"));
    const corpo = barra.slice(0, barra.indexOf("}\n}") + 3);
    expect(corpo).toMatch(/scale:\s*1 0/);
    expect(corpo).not.toMatch(/translate|transform/);
  });

  it("toda transição dos componentes do menu desliga com movimento reduzido", () => {
    for (const arquivo of DA_CONVEXY.filter((f) => f.endsWith(".tsx"))) {
      const fonte = semComentarios(leia(arquivo));
      if (/\btransition(?:-|\s|")/.test(fonte)) expect(fonte, arquivo).toContain("motion-reduce:transition-none");
    }
  });
});
