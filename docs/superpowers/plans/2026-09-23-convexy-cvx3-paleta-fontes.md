# Convexy — -cvx.3: paleta, fontes e barra do navegador — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar a `v1.44.0-cvx.3` — a plataforma passa a ter a paleta (fundos, textos, bordas, neutros, sombras), as fontes (Inter no texto, Lexend Deca em `h1–h3`) e a barra do navegador da Convexy, nos temas claro e escuro — e aplicá-la na VPS pelo botão "Atualizar", sem banco e sem `.env`.

**Architecture:** Nada do `app/globals.css` é editado. Um CSS novo, `app/convexy/tema.css`, importado pelo `app/layout.tsx` logo depois do `globals.css`, sobrepõe os tokens com seletor de atributo dobrado (`[data-theme="light"][data-theme="light"]`, 0,2,0) fora de qualquer `@layer`, e traz as regras de fonte (`h1–h3` dentro de `@layer base`; `font-feature-settings: normal` no `body`, fora de camada). O `layout.tsx` troca a Atkinson Hyperlegible pela Inter mantendo o nome de variável `--font-atkinson`, acrescenta a Lexend Deca em `--font-lexend` e passa o `viewport.themeColor` para `lib/convexy/barra-do-navegador.ts`. Guardas: dois testes unitários que leem o `tema.css` (cobertura dos tokens do original, forma do arquivo, pisos de contraste, barra = `--color-bg`) e uma spec e2e que mede na tela, por ferramenta.

**Tech Stack:** Next.js 16 (`next/font/google`), Tailwind 4 (CSS-first, `@theme inline`, `@layer` nativo), Vitest, Playwright (Chromium), Supabase CLI + Docker (stack local do e2e), `gh` CLI (fork `victorrabyfs/DeskcommCRM`), bash/tmux na VPS.

**Spec:** docs/superpowers/specs/2026-09-22-identidade-convexy-design.md — seção 7.2

## Global Constraints

- Clone de trabalho: `/Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM`. Branch: `convexy/cvx-3`, criada de `origin/main` (`925e60027`, merge da `-cvx.2`) e já contendo o commit deste plano. **Nunca tocar** nas branches locais de backup `convexy/identidade-v142` e `convexy/identidade-pre-scrub`, nem em `.git/hooks` (o `pre-push` da etapa 2 já está lá e continua valendo).
- Repositório: `victorrabyfs/DeskcommCRM`. Todo `gh` leva `-R victorrabyfs/DeskcommCRM`; `gh pr checks`/`merge`/`view` levam o nome da branch. PR só na `main` do fork; **merge só por merge commit**.
- Versão: `v1.44.0-cvx.3`, tag anotada, criada **só depois de o PR estar `MERGED`**, empurrada **pelo nome** (`git push origin v1.44.0-cvx.3`). Nunca `--tags`/`--follow-tags`. Tag publicada nunca é refeita (corrigir = `-cvx.4`).
- `CHANGELOG.md`: seção `## [1.44.0-cvx.3] — AAAA-MM-DD` (data do dia do corte, `date +%F`), logo abaixo de `## [Não lançado]` e **acima** de `## [1.44.0-cvx.2] — 2026-09-23`. Sem `### ⚠️ Requer atenção` (não há passo manual).
- Sem banco, sem `.env`, sem fragmento em `.changes/` (desvio DoD 17 já registrado no `CONVEXY.md`). Destino (DoD 18): **instalação do fork**.
- Placeholders de infraestrutura (o repositório é público): domínio `<dominio-de-producao>`, host `<host-ssh>`. Pasta da VPS: `/opt/deskcommcrm`. `update.sh` na VPS roda **sempre dentro de `tmux`**, com log `/root/update-<data>-<rótulo>.log`.
- Nenhum arquivo novo em `app/` ou `lib/` escreve a palavra do produto original (`tests/unit/branding.test.ts` varre `/deskcomm/i` em `.ts`/`.tsx` de `app|components|lib|workers|hooks`, allowlist que só encolhe; `app/layout.tsx` está nela só com `deskcomm-theme`).
- Commits terminam com a linha em branco e `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Ambiente local (macOS): `pnpm typecheck` com `NODE_OPTIONS=--max-old-space-size=8192`. `pnpm test:shell` já falha na base em três scripts no bash 3.2 do macOS (`hostgator-setup-kit/test-validators.sh`, `tests/shell/hooks-nao-acusam-a-main.test.sh`, `tests/shell/desinstalar-docker.test.sh`) e, por encadear com `&&`, para no primeiro: comparar **script a script** com a linha de base da Task 0.
- `pnpm test:unit` sem caminho; o **exit code** é a autoridade, e as linhas `Test Files`/`Tests`/`Errors` a explicação (CLAUDE.md, "Testes").

**Arquivos novos** (spec 7.2 + 7.1): `app/convexy/tema.css`, `lib/convexy/barra-do-navegador.ts`, `tests/unit/convexy-tema-cobre-os-tokens.test.ts`, `tests/unit/convexy-tema-contraste.test.ts`, `tests/e2e/convexy-identidade.spec.ts`. Mais um, fora da lista da spec: `tests/unit/_convexy-tema.ts` (parser do `tema.css`/`globals.css` e a tabela da spec, compartilhados pelos três testes; sem `.test`, o Vitest não coleta — mesmo padrão de `tests/unit/_convexy-cabecalho.ts`).

**Arquivos do original alterados** (spec 7.2, tabela): `app/layout.tsx`; `tests/e2e/aviso-de-caso-no-whatsapp.spec.ts:280`, `tests/e2e/conversa-do-caso.spec.ts:340`, `tests/e2e/passagem-com-contexto.spec.ts:261` (`/Atkinson/` → `/Inter/`); `.github/workflows/e2e.yml` (uma linha em `SPECS_PARTE_1`); `CHANGELOG.md`. E `CONVEXY.md` (do fork).

**Paleta** (spec 7.2.1, verbatim — `app/convexy/tema.css`):

| Token | Claro | Escuro |
|---|---|---|
| `--color-bg` | `#F8FAFC` | `#0B0D10` |
| `--color-surface` | `#FFFFFF` | `#131923` |
| `--color-surface-elevated` | `#F1F5F9` | `#171E2A` |
| `--color-overlay` | `rgba(11, 13, 16, 0.42)` | `rgba(0, 0, 0, 0.60)` |
| `--color-text` | `#0B0D10` | `#F8FAFC` |
| `--color-text-muted` | `#475569` | `#94A3B8` |
| `--color-text-subtle` | `#64748B` | `#64748B` |
| `--color-border` | `#E2E8F0` | `#1E293B` |
| `--color-border-strong` | `#CBD5E1` | `#334155` |
| `--color-neutral-50` | `#F8FAFC` | `#F8FAFC` |
| `--color-neutral-100` | `#F1F5F9` | `#E2E8F0` |
| `--color-neutral-200` | `#E2E8F0` | `#CBD5E1` |
| `--color-neutral-300` | `#CBD5E1` | `#94A3B8` |
| `--color-neutral-400` | `#94A3B8` | `#64748B` |
| `--color-neutral-500` | `#64748B` | `#334155` |
| `--color-neutral-600` | `#475569` | `#1E293B` |
| `--color-neutral-700` | `#334155` | `#171E2A` |
| `--color-neutral-800` | `#1E293B` | `#131923` |
| `--color-neutral-900` | `#0F172A` | `#0B0D10` |
| `--color-neutral-950` | `#0B0D10` | `#06080A` |
| `--shadow-xs … --shadow-xl` | valores do original com a tinta `rgba(11, 13, 16, α)` no lugar de `rgba(20, 18, 14, α)` | inalteradas |

Seletores `[data-theme="light"][data-theme="light"]` e `[data-theme="dark"][data-theme="dark"]` (0,2,0), **fora de qualquer `@layer`**, **sem `!important`**. Não toca em `--color-accent-*` nem nas semânticas (`success`, `warning`, `error`, `info`) nem na agenda. Desvios aceitos: popover igual ao cartão (`#131923`, aliases fixados em `globals.css:529-532`); campo no escuro igual ao fundo (`#0B0D10`).

**Fontes** (spec 7.2.2):
- `Inter({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-atkinson" })` no lugar de `Atkinson_Hyperlegible` — o nome da variável fica o do original de propósito (`globals.css:535` inlina `--font-sans`; `globals.css:701` usa `var(--font-atkinson)` no `body`; `tests/unit/tailwind-tokens.test.ts:89-93` exige o literal no layout).
- `Lexend_Deca({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-lexend" })`. Os dois `.variable` no `className` do `<html>` (`layout.tsx:281`). IBM Plex Mono continua.
- Os dois levam também `display: "swap"` — o que o original já declara (`layout.tsx:31`) e o padrão do `next/font`; a spec omite o campo, não o proíbe.
- `tema.css` começa com `@layer theme, base, components, utilities;`; dentro de `@layer base`: `h1, h2, h3 { font-family: var(--font-lexend), var(--font-atkinson), sans-serif; }`; **fora de camada**: `body { font-feature-settings: normal; }` (anula o `"ss01"` de `globals.css:703`).

**Barra do navegador** (spec 7.2.3): `viewport.themeColor` de `lib/convexy/barra-do-navegador.ts`, formato `[{ media, color }]`: `(prefers-color-scheme: light)` → `#F8FAFC`, `(prefers-color-scheme: dark)` → `#0B0D10`. `lib/branding/regua-do-produto.ts` **não muda**.

**Pisos de contraste** (spec 7.2.5, `razaoDeContraste` de `lib/branding/contraste.ts:58`), medidos contra o código nesta revisão:
- `--color-text` e `--color-text-muted` ≥ 4,5; `--color-text-subtle` ≥ 3 — sobre `--color-bg`, `--color-surface` e `--color-surface-elevated`, nos dois temas (pior caso medido: `text-subtle` escuro sobre `surface-elevated` = 3,51).
- `derivarMarca("#146BFF", REGUA_DO_PRODUTO)` (`contraste.ts:839`) dá `accent` `#1756c4`/`accentFg` `#ffffff` (claro) e `#6ea3ff`/`#000000` (escuro). `accent` ≥ 4,5 sobre os três fundos (medido 6,06–7,73); `accentFg` ≥ 4,5 sobre `accent` (6,64 claro, 8,35 escuro).

**Suítes antes da tag** (spec 7.1): `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:shell` (local); e2e: a spec nova e as duas de tema mais próximas, localmente (Task 5), e a suíte inteira pelo check `e2e` do PR (cinco partes). `pnpm test:db` não é exigido nesta versão (sem schema; a spec só o torna obrigatório na `-cvx.4`) — o check `invariants` o roda no PR. Depois: conferência em tela na VPS, claro e escuro.

## Modo de execução

- **Tasks 0–6 (código)** podem ir para subagente (superpowers:subagent-driven-development), uma por vez, na ordem. A Task 5 precisa do Docker Desktop aberto e leva tempo (imagens do Supabase na primeira vez e dois `next build`).
- **Task 7 [GitHub]** e **Task 8 [VPS]** rodam **na sessão principal, no modo padrão de permissão**, com o Victor aprovando cada comando — nunca em subagente nem no modo automático.
- Clicar em "Atualizar" (Task 8) é do Victor. A conferência em tela na VPS é dele, ou de Claude pelo navegador com aprovação.

## Review Focus

1. **Tema "sistema"** — sem escolha salva, o `data-theme` vem de `prefers-color-scheme` pelo script anti-flash (`app/layout.tsx:122`) e é reaplicado pelo `ThemeProvider` (`lib/theme.tsx:42`); o seletor dobrado tem de pegar nos dois caminhos. Fixado na Task 5: os casos de `/login` usam `page.emulateMedia({ colorScheme })` sem `localStorage`, e o de `/app/settings` troca o tema pelo controle da tela (tema escolhido).
2. **Ordem de carga do CSS diferente em dev e produção** (`lib/branding/css.ts:17-23`) — se o `tema.css` carregar antes do `globals.css`, só a especificidade o salva, e o `@layer base` dele não pode criar a camada `base` antes das do Tailwind. Fixado na Task 1 (teste de forma: arquivo começa com `@layer theme, base, components, utilities;`; blocos de token fora de camada) e na Task 5 (a folha **publicada** pelo `next build` contém as duas regras dobradas em nível de topo, fora de camada).
3. **Custom properties reescritas pelo minificador** (`#FFFFFF` → `#fff`, `rgba(…)` → hex de 8 dígitos, seletor reescrito) — Fixado na Task 5: comparação por `getComputedStyle` de um elemento-sonda (`rgb()`), canal a canal, alfa com folga de 0,01; e a regra dobrada procurada no `CSSStyleSheet`, não no texto. Na Task 1 a comparação com a tabela é sem distinção de caixa.
4. **`<h1>` com utilitário `font-mono`** (quatro: `app/app/lgpd/requests/[id]/_client.tsx:94`, `app/admin/(protected)/lgpd/requests/[id]/_client.tsx:275`, `app/admin/(protected)/audit/[entryId]/_client.tsx:114`, `app/admin/(protected)/incidents/[id]/_client.tsx:102`) — a regra de `h1–h3` tem de perder para utilitário. Fixado na Task 3 (a regra está **dentro** de `@layer base` e não há `h1` fora de camada) e na Task 5 (uma sonda `<h1 class="font-mono">` mede IBM Plex Mono; `<h2>` mede Lexend; `<div>` — o `CardTitle` — mede Inter).
5. **Contraste no escuro** — `text-subtle` escuro sobre `surface-elevated` fica em 3,51 (a folga é 0,51 sobre o piso 3), e o acento é derivado contra a régua do original, não contra os fundos novos. Fixado na Task 2: os 18 pares de texto e os 8 do acento com os pisos da spec, lendo o `tema.css` de verdade, com contraprova por sabotagem.

---

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `app/convexy/tema.css` | Criar (Task 1; fontes na Task 3) | Paleta por cima do `globals.css`; `h1–h3` em Lexend; `ss01` anulado |
| `tests/unit/_convexy-tema.ts` | Criar (Task 1) | Tabela da spec 7.2.1 (`PALETA_DA_SPEC`) e parser de blocos/camadas |
| `tests/unit/convexy-tema-cobre-os-tokens.test.ts` | Criar (Task 1; fontes na Task 3) | Cobertura dos tokens do original, valores, forma do `tema.css`, ligação no layout |
| `tests/unit/convexy-tema-contraste.test.ts` | Criar (Task 2; barra na Task 4) | Pisos WCAG do tema e do acento; barra = `--color-bg` |
| `lib/convexy/barra-do-navegador.ts` | Criar (Task 4) | `coresDaBarraConvexy()` |
| `tests/e2e/convexy-identidade.spec.ts` | Criar (Task 5) | Tokens, fontes, seletor publicado e `theme-color`, na tela |
| `app/layout.tsx` | Modificar (Tasks 1, 3, 4) | Import do `tema.css` (`:26`); fontes (`:2`, `:28-33`, `:281`); `viewport` (`:5`, `:111-118`) |
| `tests/e2e/aviso-de-caso-no-whatsapp.spec.ts:280`, `tests/e2e/conversa-do-caso.spec.ts:340`, `tests/e2e/passagem-com-contexto.spec.ts:261` | Modificar (Task 3) | `/Atkinson/i` → `/Inter/i` |
| `.github/workflows/e2e.yml` | Modificar (Task 5) | `convexy-identidade.spec.ts` em `SPECS_PARTE_1` (`:620-…`) |
| `CONVEXY.md` | Modificar (Task 6) | Registro da `-cvx.3`, desvios, docs que não valem, rollback |
| `CHANGELOG.md` | Modificar (Task 6) | `## [1.44.0-cvx.3]` acima de `## [1.44.0-cvx.2]` (`:11`) |

Onde este plano se afasta da letra da spec (conferido contra o código na `origin/main` `925e60027`):
- `tests/unit/e2e-cobertura-completa.test.ts`: a spec cita `:153,190-198`; o caso "toda spec do disco está em exatamente uma lista" está em `:188-198` (o `:153` confere).
- `e2e.yml` tem cinco partes (`SPECS_PARTE_1..5`); a `5` também dispensa WAHA. A spec pede `1..3`; o plano usa a `1` (maior folga medida).
- A spec diz que a medida em `rgb()` "prova que o seletor dobrado sobreviveu à minificação"; ela sozinha não prova (em produção o `tema.css` carrega depois, e a ordem também daria a vitória). O e2e acrescenta a busca da regra dobrada, em nível de topo, no `CSSStyleSheet` publicado.
- Um arquivo novo além dos da spec: `tests/unit/_convexy-tema.ts` (a tabela da spec e o parser, uma vez só para os três testes).
- `display: "swap"` nas duas fontes (Global Constraints, "Fontes").
- Demais referências `arquivo:linha` da seção 7.2 (≈ 30) conferem com o código.

Ordem das tasks, e por que é esta: a Task 5 (e2e) vem depois das Tasks 1–4 porque o "vermelho antes" dela é medido contra um build da `origin/main` (sem nada da `-cvx.3`) num worktree, e o verde contra o build da branch — construir o ambiente do e2e uma vez só serve às duas medidas.

---

### Task 0: Branch e linha de base

**Files:** nenhum.

**Interfaces:**
- Consumes: branch `convexy/cvx-3` = `origin/main` + commit deste plano.
- Produces: `node_modules`; `/tmp/cvx3-vt-base.log`, `/tmp/cvx3-shell-base.txt`.

- [ ] **Step 1: Estado da branch**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git status --short
git switch convexy/cvx-3
git fetch -q origin main && git merge --ff-only origin/main
git log --oneline origin/main..HEAD
git branch --list 'convexy/*'
```
Expected: `git status` vazio; `Already up to date.` (ou fast-forward, se a `main` andou — nunca merge com conflito); o `log` lista só `docs(convexy): plano da -cvx.3 (paleta, fontes, barra do navegador)`; as branches `convexy/cvx-3`, `convexy/identidade-pre-scrub`, `convexy/identidade-v142`, `convexy/main-local` (as de backup ficam como estão).

- [ ] **Step 2: Dependências**

```bash
node --version   # ≥ v22
corepack enable && pnpm install --frozen-lockfile
git status --short
```
Expected: instala; `git status` vazio.

- [ ] **Step 3: Linha de base**

```bash
pnpm test:unit > /tmp/cvx3-vt-base.log 2>&1; echo "exit=$?"; grep -aE "Test Files|Tests |Errors " /tmp/cvx3-vt-base.log | tail -3
node -e 'console.log(require("./package.json").scripts["test:shell"].split(" && ").map(s=>s.replace(/^bash /,"")).join("\n"))' \
  | while read -r s; do bash "$s" </dev/null >/dev/null 2>&1; echo "$? $s"; done | tee /tmp/cvx3-shell-base.txt
```
Expected: `exit=0`, sem linha `Errors` (se houver vermelho, anotar os arquivos antes de qualquer mudança; `lib/ai/dispatcher/rate-limit.test.ts` vermelho = `.env.local` com `UPSTASH_*` e Redis parado — não é deste trabalho). `/tmp/cvx3-shell-base.txt`: `0` em todos, exceto os três scripts conhecidos do macOS (Global Constraints).

---

### Task 1: Paleta — `app/convexy/tema.css` e `convexy-tema-cobre-os-tokens`

**Files:**
- Create: `tests/unit/_convexy-tema.ts`
- Create: `tests/unit/convexy-tema-cobre-os-tokens.test.ts`
- Create: `app/convexy/tema.css`
- Modify: `app/layout.tsx:26` (import do `tema.css` depois do `globals.css`)

**Interfaces:**
- Consumes: blocos `[data-theme="light"]` (`app/globals.css:252-327`) e `[data-theme="dark"]` (`:329-427`), ambos na coluna 0 e fora de camada.
- Produces: `tests/unit/_convexy-tema.ts` exporta `RAIZ: string`, `CAMINHO_DO_TEMA: string`, `type Tema = "claro" | "escuro"`, `PALETA_DA_SPEC: Readonly<Record<Tema, Readonly<Record<string, string>>>>`, `semComentarios(css): string`, `declaracoesDoBloco(css, seletor): Map<string, string>`, `foraDeCamada(css): string`, `dentroDaCamada(css, nome): string | null`, `lerTemaConvexy(): Record<Tema, Map<string, string>>`, `lerBlocosDoGlobals(): Record<Tema, Map<string, string>>`. `app/convexy/tema.css` com os dois blocos da tabela.

- [ ] **Step 1: Helper com a tabela e o parser**

`tests/unit/_convexy-tema.ts`:
```ts
import fs from "node:fs";
import path from "node:path";

/**
 * Convexy -cvx.3: leitura do `app/convexy/tema.css` e dos blocos de tema do
 * `app/globals.css`, e a tabela da spec 7.2.1 — compartilhados por
 * `convexy-tema-cobre-os-tokens.test.ts`, `convexy-tema-contraste.test.ts` e
 * `tests/e2e/convexy-identidade.spec.ts`. Sem `.test`: o Vitest não coleta.
 * Registro: CONVEXY.md, "Paleta, fontes e barra do navegador".
 */

export const RAIZ = process.cwd();
export const CAMINHO_DO_TEMA = "app/convexy/tema.css";

export type Tema = "claro" | "escuro";

/**
 * Cores da tabela da spec 7.2.1 (docs/superpowers/specs/2026-09-22-identidade-convexy-design.md).
 * As sombras do claro não estão aqui: o teste as deriva do original (troca da tinta).
 */
export const PALETA_DA_SPEC: Readonly<Record<Tema, Readonly<Record<string, string>>>> = {
  claro: {
    "--color-bg": "#F8FAFC",
    "--color-surface": "#FFFFFF",
    "--color-surface-elevated": "#F1F5F9",
    "--color-overlay": "rgba(11, 13, 16, 0.42)",
    "--color-text": "#0B0D10",
    "--color-text-muted": "#475569",
    "--color-text-subtle": "#64748B",
    "--color-border": "#E2E8F0",
    "--color-border-strong": "#CBD5E1",
    "--color-neutral-50": "#F8FAFC",
    "--color-neutral-100": "#F1F5F9",
    "--color-neutral-200": "#E2E8F0",
    "--color-neutral-300": "#CBD5E1",
    "--color-neutral-400": "#94A3B8",
    "--color-neutral-500": "#64748B",
    "--color-neutral-600": "#475569",
    "--color-neutral-700": "#334155",
    "--color-neutral-800": "#1E293B",
    "--color-neutral-900": "#0F172A",
    "--color-neutral-950": "#0B0D10",
  },
  escuro: {
    "--color-bg": "#0B0D10",
    "--color-surface": "#131923",
    "--color-surface-elevated": "#171E2A",
    "--color-overlay": "rgba(0, 0, 0, 0.60)",
    "--color-text": "#F8FAFC",
    "--color-text-muted": "#94A3B8",
    "--color-text-subtle": "#64748B",
    "--color-border": "#1E293B",
    "--color-border-strong": "#334155",
    "--color-neutral-50": "#F8FAFC",
    "--color-neutral-100": "#E2E8F0",
    "--color-neutral-200": "#CBD5E1",
    "--color-neutral-300": "#94A3B8",
    "--color-neutral-400": "#64748B",
    "--color-neutral-500": "#334155",
    "--color-neutral-600": "#1E293B",
    "--color-neutral-700": "#171E2A",
    "--color-neutral-800": "#131923",
    "--color-neutral-900": "#0B0D10",
    "--color-neutral-950": "#06080A",
  },
};

const SELETOR_DO_TEMA: Readonly<Record<Tema, string>> = {
  claro: '[data-theme="light"][data-theme="light"]',
  escuro: '[data-theme="dark"][data-theme="dark"]',
};

const SELETOR_DO_ORIGINAL: Readonly<Record<Tema, string>> = {
  claro: '[data-theme="light"]',
  escuro: '[data-theme="dark"]',
};

export function semComentarios(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Declarações `--x: valor;` do bloco cujo seletor abre a linha na COLUNA 0.
 * A âncora de coluna é o que separa os blocos de token do `globals.css` dos
 * `[data-theme="dark"] {` indentados dentro do `@layer base` (`color-scheme`).
 * Valor com espaços normalizados.
 */
export function declaracoesDoBloco(css: string, seletor: string): Map<string, string> {
  const limpo = semComentarios(css);
  const abre = new RegExp(`^${escapar(seletor)}\\s*\\{`, "m").exec(limpo);
  if (!abre) throw new Error(`bloco \`${seletor}\` não achado`);
  const inicio = abre.index + abre[0].length;
  const fim = limpo.indexOf("}", inicio);
  if (fim < 0) throw new Error(`bloco \`${seletor}\` sem fechamento`);
  const saida = new Map<string, string>();
  for (const m of limpo.slice(inicio, fim).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    saida.set(m[1] ?? "", (m[2] ?? "").replace(/\s+/g, " ").trim());
  }
  return saida;
}

/** Fim do bloco que começa logo depois de uma `{` em `inicio` (conta chaves). */
function fechamento(css: string, inicio: number): number {
  let profundidade = 1;
  let j = inicio;
  while (j < css.length && profundidade > 0) {
    const c = css.charAt(j);
    if (c === "{") profundidade++;
    else if (c === "}") profundidade--;
    j++;
  }
  return j;
}

/** O CSS sem os blocos `@layer … { … }` (a declaração `@layer a, b;` fica). */
export function foraDeCamada(css: string): string {
  const limpo = semComentarios(css);
  let saida = "";
  let i = 0;
  while (i < limpo.length) {
    const abre = /@layer[^;{]*\{/y;
    abre.lastIndex = i;
    if (abre.test(limpo)) {
      i = fechamento(limpo, abre.lastIndex);
    } else {
      saida += limpo.charAt(i);
      i++;
    }
  }
  return saida;
}

/** O corpo do bloco `@layer <nome> { … }`, ou `null` se não houver. */
export function dentroDaCamada(css: string, nome: string): string | null {
  const limpo = semComentarios(css);
  const abre = new RegExp(`@layer\\s+${escapar(nome)}\\s*\\{`).exec(limpo);
  if (!abre) return null;
  const inicio = abre.index + abre[0].length;
  return limpo.slice(inicio, fechamento(limpo, inicio) - 1);
}

export function lerTemaConvexy(): Record<Tema, Map<string, string>> {
  const css = fs.readFileSync(path.join(RAIZ, CAMINHO_DO_TEMA), "utf8");
  return {
    claro: declaracoesDoBloco(css, SELETOR_DO_TEMA.claro),
    escuro: declaracoesDoBloco(css, SELETOR_DO_TEMA.escuro),
  };
}

export function lerBlocosDoGlobals(): Record<Tema, Map<string, string>> {
  const css = fs.readFileSync(path.join(RAIZ, "app/globals.css"), "utf8");
  return {
    claro: declaracoesDoBloco(css, SELETOR_DO_ORIGINAL.claro),
    escuro: declaracoesDoBloco(css, SELETOR_DO_ORIGINAL.escuro),
  };
}
```

- [ ] **Step 2: Escrever o teste que falha**

`tests/unit/convexy-tema-cobre-os-tokens.test.ts`:
```ts
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CAMINHO_DO_TEMA,
  PALETA_DA_SPEC,
  RAIZ,
  foraDeCamada,
  lerBlocosDoGlobals,
  lerTemaConvexy,
  semComentarios,
  type Tema,
} from "./_convexy-tema";

/**
 * Convexy -cvx.3 (spec 7.2.5): o `app/convexy/tema.css` sobrepõe os tokens do
 * `app/globals.css` sem editá-lo. Este teste é o que pega o ORIGINAL renomeando
 * ou criando token num merge (spec seção 10): (a) nada no tema.css aponta para
 * token que sumiu; (b) todo `--color-*` literal dos blocos de tema do original —
 * menos acento e semânticas, que não são da paleta, e aliases em `var()`, que
 * acompanham sozinhos — está coberto. Registro: CONVEXY.md.
 */

const TEMAS: readonly Tema[] = ["claro", "escuro"];

/** Fora do alcance do tema.css (spec 7.2.1): acento e cores semânticas. */
const FORA_DO_TEMA = /^--color-(accent|success|warning|error|info)(-|$)/;

describe("tema da Convexy cobre os tokens do original", () => {
  const tema = lerTemaConvexy();
  const original = lerBlocosDoGlobals();

  it("o parser enxerga os dois lados (controle positivo)", () => {
    for (const t of TEMAS) {
      expect(original[t].size, `bloco ${t} do globals.css`).toBeGreaterThan(40);
      expect(tema[t].size, `bloco ${t} do tema.css`).toBeGreaterThanOrEqual(20);
    }
  });

  it.each(TEMAS)("(a) toda propriedade do tema.css existe no bloco %s do globals.css", (t) => {
    const orfas = [...tema[t].keys()].filter((k) => !original[t].has(k));
    expect(
      orfas,
      "o original renomeou ou removeu estes tokens — ajustar app/convexy/tema.css (CONVEXY.md)",
    ).toEqual([]);
  });

  it.each(TEMAS)("(b) todo --color-* literal do bloco %s do globals.css está no tema.css", (t) => {
    const exigidos = [...original[t]]
      .filter(([k, v]) => k.startsWith("--color-") && !FORA_DO_TEMA.test(k) && !v.startsWith("var("))
      .map(([k]) => k);
    expect(exigidos.length, "vacuidade: a tabela da spec tem 20 por tema").toBeGreaterThanOrEqual(20);
    const descobertos = exigidos.filter((k) => !tema[t].has(k));
    expect(
      descobertos,
      "o original criou tokens que a paleta da Convexy não cobre — decidir o valor e acrescentar ao tema.css",
    ).toEqual([]);
  });

  it.each(TEMAS)("as cores do tema %s são as da tabela da spec 7.2.1", (t) => {
    const cores = Object.fromEntries(
      [...tema[t]].filter(([k]) => k.startsWith("--color-")).map(([k, v]) => [k, v.toLowerCase()]),
    );
    const esperado = Object.fromEntries(
      Object.entries(PALETA_DA_SPEC[t]).map(([k, v]) => [k, v.toLowerCase()]),
    );
    expect(cores).toEqual(esperado);
  });

  it("sombras: as do claro trocam a tinta do original por #0B0D10; as do escuro ficam", () => {
    const sombrasDoOriginal = [...original.claro].filter(([k]) => k.startsWith("--shadow-"));
    expect(sombrasDoOriginal.length).toBe(5);
    for (const [k, v] of sombrasDoOriginal) {
      expect(tema.claro.get(k), k).toBe(v.replace(/rgba\(20, 18, 14,/g, "rgba(11, 13, 16,"));
    }
    expect([...tema.escuro.keys()].filter((k) => k.startsWith("--shadow-"))).toEqual([]);
  });

  describe("forma do tema.css", () => {
    const css = fs.readFileSync(path.join(RAIZ, CAMINHO_DO_TEMA), "utf8");

    it("começa fixando a ordem das camadas do Tailwind", () => {
      expect(semComentarios(css).trimStart().startsWith("@layer theme, base, components, utilities;")).toBe(
        true,
      );
    });

    it("os blocos de token têm seletor dobrado e estão fora de qualquer @layer", () => {
      const fora = foraDeCamada(css);
      expect(fora).toMatch(/^\[data-theme="light"\]\[data-theme="light"\]\s*\{/m);
      expect(fora).toMatch(/^\[data-theme="dark"\]\[data-theme="dark"\]\s*\{/m);
    });

    it("sem !important", () => {
      expect(semComentarios(css)).not.toMatch(/!important/);
    });
  });

  it("o layout carrega o tema.css depois do globals.css", () => {
    const layout = fs.readFileSync(path.join(RAIZ, "app/layout.tsx"), "utf8");
    const globais = layout.indexOf('import "./globals.css";');
    const convexy = layout.indexOf('import "./convexy/tema.css";');
    expect(globais).toBeGreaterThan(-1);
    expect(convexy, "app/layout.tsx não importa ./convexy/tema.css depois do globals.css").toBeGreaterThan(
      globais,
    );
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/convexy-tema-cobre-os-tokens.test.ts`
Expected: FAIL — `Test Files 1 failed`, com `Error: ENOENT: no such file or directory, open '…/app/convexy/tema.css'` (o arquivo ainda não existe; a leitura é no corpo do `describe`).

- [ ] **Step 4: Criar `app/convexy/tema.css`**

```css
/* ─────────────────────────────────────────────────────────────────────────
   Convexy — paleta (e, na parte de baixo, fontes) por cima do app/globals.css.
   Spec: docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, 7.2.
   Registro: CONVEXY.md, "Paleta, fontes e barra do navegador".

   O globals.css NÃO é editado. Este arquivo vence os blocos `:root`,
   `[data-theme="light"]` e `[data-theme="dark"]` do original (0,1,0, fora de
   camada) com o seletor de atributo DOBRADO (0,2,0), também fora de camada:
   vence em QUALQUER ordem de carga — que difere entre dev e produção
   (lib/branding/css.ts, "Por que dois blocos") — e sem !important.

   Só superfícies, textos, bordas, neutros e sombras. O acento
   (--color-accent-*) vem da cor da marca (/admin/marca) e as semânticas e a
   agenda ficam as do original. Os aliases (card, popover, muted, input,
   background, secondary, ring) apontam para estes tokens por var() e
   acompanham.

   Guardas: tests/unit/convexy-tema-cobre-os-tokens.test.ts (cobertura e
   forma), tests/unit/convexy-tema-contraste.test.ts (pisos WCAG) e
   tests/e2e/convexy-identidade.spec.ts (na tela).
   ───────────────────────────────────────────────────────────────────────── */

/* Fixa a ordem das camadas do Tailwind caso este arquivo carregue ANTES do
   globals.css: sem esta linha, o `@layer base` mais abaixo criaria a camada
   `base` antes de `theme` e a ordem mudaria. */
@layer theme, base, components, utilities;

[data-theme="light"][data-theme="light"] {
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-elevated: #F1F5F9;
  --color-overlay: rgba(11, 13, 16, 0.42);
  --color-text: #0B0D10;
  --color-text-muted: #475569;
  --color-text-subtle: #64748B;
  --color-border: #E2E8F0;
  --color-border-strong: #CBD5E1;
  --color-neutral-50: #F8FAFC;
  --color-neutral-100: #F1F5F9;
  --color-neutral-200: #E2E8F0;
  --color-neutral-300: #CBD5E1;
  --color-neutral-400: #94A3B8;
  --color-neutral-500: #64748B;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1E293B;
  --color-neutral-900: #0F172A;
  --color-neutral-950: #0B0D10;
  --shadow-xs: 0 1px 2px 0 rgba(11, 13, 16, 0.04);
  --shadow-sm: 0 1px 2px 0 rgba(11, 13, 16, 0.05), 0 1px 1px 0 rgba(11, 13, 16, 0.03);
  --shadow-md: 0 4px 12px -2px rgba(11, 13, 16, 0.06), 0 2px 4px -1px rgba(11, 13, 16, 0.04);
  --shadow-lg: 0 12px 32px -6px rgba(11, 13, 16, 0.10), 0 4px 12px -2px rgba(11, 13, 16, 0.06);
  --shadow-xl: 0 24px 48px -12px rgba(11, 13, 16, 0.16), 0 8px 16px -4px rgba(11, 13, 16, 0.08);
}

/* Escuro: sombras do original (pretas), inalteradas. */
[data-theme="dark"][data-theme="dark"] {
  --color-bg: #0B0D10;
  --color-surface: #131923;
  --color-surface-elevated: #171E2A;
  --color-overlay: rgba(0, 0, 0, 0.60);
  --color-text: #F8FAFC;
  --color-text-muted: #94A3B8;
  --color-text-subtle: #64748B;
  --color-border: #1E293B;
  --color-border-strong: #334155;
  --color-neutral-50: #F8FAFC;
  --color-neutral-100: #E2E8F0;
  --color-neutral-200: #CBD5E1;
  --color-neutral-300: #94A3B8;
  --color-neutral-400: #64748B;
  --color-neutral-500: #334155;
  --color-neutral-600: #1E293B;
  --color-neutral-700: #171E2A;
  --color-neutral-800: #131923;
  --color-neutral-900: #0B0D10;
  --color-neutral-950: #06080A;
}
```

- [ ] **Step 5: Importar no layout**

Em `app/layout.tsx`, trocar a linha 26
```ts
import "./globals.css";
```
por
```ts
import "./globals.css";
// Convexy: tema da Convexy (paleta e fontes) por cima do globals.css — depois
// dele, de propósito. CONVEXY.md, "Paleta, fontes e barra do navegador".
import "./convexy/tema.css";
```

- [ ] **Step 6: Rodar e ver passar, e as guardas vizinhas**

```bash
pnpm vitest run tests/unit/convexy-tema-cobre-os-tokens.test.ts
pnpm vitest run tests/unit/tailwind-tokens.test.ts tests/unit/branding-regua-do-produto.test.ts tests/unit/branding-tema-claro-escopavel.test.ts tests/unit/branding.test.ts
```
Expected: `Tests 12 passed (12)`; a segunda linha toda PASS (nenhuma delas lê o `tema.css`; conferem que o `globals.css` e a régua não mudaram).

- [ ] **Step 7: Commit**

```bash
git add tests/unit/_convexy-tema.ts tests/unit/convexy-tema-cobre-os-tokens.test.ts app/convexy/tema.css app/layout.tsx
git commit -m "feat(convexy): paleta da Convexy por cima do globals.css

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Contraste do tema e do acento — `convexy-tema-contraste`

**Files:**
- Create: `tests/unit/convexy-tema-contraste.test.ts`

**Interfaces:**
- Consumes: `lerTemaConvexy()` (Task 1); `razaoDeContraste(a: string, b: string): number` e `derivarMarca(semente: string, regua: Regua): Marca` de `lib/branding/contraste.ts` (`Marca.claro`/`Marca.escuro`: `TokensDoTema` com `accent`, `accentFg`); `REGUA_DO_PRODUTO` de `lib/branding/regua-do-produto.ts`.
- Produces: guarda de contraste que a Task 4 estende.

Este teste é uma **guarda** sobre a paleta que já existe (Task 1): ele nasce verde. O vermelho é provado por contraprova (Step 3).

- [ ] **Step 1: Escrever o teste**

`tests/unit/convexy-tema-contraste.test.ts`:
```ts
import { describe, expect, it } from "vitest";

import { derivarMarca, razaoDeContraste } from "@/lib/branding/contraste";
import { REGUA_DO_PRODUTO } from "@/lib/branding/regua-do-produto";

import { lerTemaConvexy, type Tema } from "./_convexy-tema";

/**
 * Convexy -cvx.3 (spec 7.2.5): pisos WCAG da paleta da Convexy, lendo o
 * `app/convexy/tema.css` de verdade — texto 4,5 (1.4.3), texto sutil 3 — e o
 * acento que a cor da Convexy gera pelo derivador do original, medido contra os
 * fundos NOVOS (o derivador mede contra a régua do original). Registro: CONVEXY.md.
 */

const TEMAS: readonly Tema[] = ["claro", "escuro"];
const FUNDOS = ["--color-bg", "--color-surface", "--color-surface-elevated"] as const;
const PISOS_DO_TEXTO = { "--color-text": 4.5, "--color-text-muted": 4.5, "--color-text-subtle": 3 } as const;
const COR_DA_CONVEXY = "#146BFF";

describe("contraste do tema da Convexy", () => {
  const tema = lerTemaConvexy();
  const marca = derivarMarca(COR_DA_CONVEXY, REGUA_DO_PRODUTO);

  function hex(t: Tema, token: string): string {
    const v = tema[t].get(token);
    if (!v || !/^#[0-9a-f]{6}$/i.test(v)) {
      throw new Error(`${token} (${t}) não é hex opaco no tema.css: ${String(v)}`);
    }
    return v;
  }

  const paresDeTexto = TEMAS.flatMap((t) =>
    FUNDOS.flatMap((fundo) =>
      Object.entries(PISOS_DO_TEXTO).map(([texto, piso]) => ({ t, fundo, texto, piso })),
    ),
  );

  it.each(paresDeTexto)("$texto sobre $fundo no tema $t ≥ $piso", ({ t, fundo, texto, piso }) => {
    const r = razaoDeContraste(hex(t, texto), hex(t, fundo));
    expect(r, `${texto} ${hex(t, texto)} sobre ${fundo} ${hex(t, fundo)} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(
      piso,
    );
  });

  it("o acento derivado da cor da Convexy é o medido na spec 7.2.4", () => {
    // Se isto mudar, o derivador do original mudou: reconferir 7.2.4 antes de atualizar.
    expect([marca.claro.accent, marca.claro.accentFg, marca.escuro.accent, marca.escuro.accentFg]).toEqual([
      "#1756c4",
      "#ffffff",
      "#6ea3ff",
      "#000000",
    ]);
  });

  const paresDoAcento = TEMAS.flatMap((t) => FUNDOS.map((fundo) => ({ t, fundo })));

  it.each(paresDoAcento)("acento sobre $fundo no tema $t ≥ 4,5", ({ t, fundo }) => {
    const r = razaoDeContraste(marca[t].accent, hex(t, fundo));
    expect(r, `${marca[t].accent} sobre ${hex(t, fundo)} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEMAS)("frente do acento sobre o acento no tema %s ≥ 4,5", (t) => {
    const r = razaoDeContraste(marca[t].accentFg, marca[t].accent);
    expect(r, `${marca[t].accentFg} sobre ${marca[t].accent} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Rodar**

Run: `pnpm vitest run tests/unit/convexy-tema-contraste.test.ts`
Expected: `Tests 27 passed (27)` (18 pares de texto, 1 derivação, 6 do acento, 2 da frente).

- [ ] **Step 3: Contraprova por sabotagem (o teste tem de ficar vermelho)**

```bash
sed -i '' 's/--color-text-muted: #94A3B8;/--color-text-muted: #475569;/' app/convexy/tema.css
grep -n -- "--color-text-muted" app/convexy/tema.css
pnpm vitest run tests/unit/convexy-tema-contraste.test.ts 2>&1 | grep -aE "Tests |✗|×|FAIL" | head -8
git checkout -- app/convexy/tema.css && git status --short
```
Expected: o `grep` mostra `#475569` nas duas linhas (a do claro já era; a do escuro foi sabotada); `Tests 3 failed | 24 passed (27)` — os três casos `--color-text-muted sobre … no tema escuro` (2,57, 2,33 e 2,21); depois do `checkout`, `git status` vazio.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/convexy-tema-contraste.test.ts
git commit -m "test(convexy): pisos de contraste da paleta e do acento

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Fontes — Inter, Lexend Deca, `h1–h3` em camada, `ss01` anulado

**Files:**
- Modify: `tests/unit/convexy-tema-cobre-os-tokens.test.ts` (novo `describe` no fim)
- Modify: `app/convexy/tema.css` (bloco de fontes no fim)
- Modify: `app/layout.tsx:2` (import), `:28-33` (`atkinson` → `inter` + `lexend`), `:281` (`className`)
- Modify: `tests/e2e/aviso-de-caso-no-whatsapp.spec.ts:280`, `tests/e2e/conversa-do-caso.spec.ts:340`, `tests/e2e/passagem-com-contexto.spec.ts:261`

**Interfaces:**
- Consumes: `dentroDaCamada`, `foraDeCamada` (Task 1).
- Produces: `--font-atkinson` = Inter; `--font-lexend` = Lexend Deca, no `<html>`.

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/unit/convexy-tema-cobre-os-tokens.test.ts`, acrescentar `dentroDaCamada` ao import de `./_convexy-tema` (a lista fica `CAMINHO_DO_TEMA, PALETA_DA_SPEC, RAIZ, dentroDaCamada, foraDeCamada, lerBlocosDoGlobals, lerTemaConvexy, semComentarios, type Tema`) e, no fim do arquivo:
```ts
describe("fontes da Convexy (spec 7.2.2)", () => {
  const css = fs.readFileSync(path.join(RAIZ, CAMINHO_DO_TEMA), "utf8");
  const layout = fs.readFileSync(path.join(RAIZ, "app/layout.tsx"), "utf8");

  it("h1–h3 em Lexend DENTRO de @layer base — utilitário (ex.: font-mono) continua vencendo", () => {
    const base = dentroDaCamada(css, "base");
    expect(base, "tema.css sem @layer base").not.toBeNull();
    expect((base ?? "").replace(/\s+/g, " ")).toContain(
      "h1, h2, h3 { font-family: var(--font-lexend), var(--font-atkinson), sans-serif; }",
    );
    expect(foraDeCamada(css), "regra de título fora de camada venceria o font-mono").not.toMatch(/\bh[1-3]\b/);
  });

  it("o ss01 do original é anulado FORA de camada (na Inter ele troca o desenho dos dígitos)", () => {
    expect(foraDeCamada(css).replace(/\s+/g, " ")).toContain("body { font-feature-settings: normal; }");
  });

  it("o layout usa Inter com a variável do original e Lexend Deca em --font-lexend", () => {
    expect(layout).not.toMatch(/Atkinson_Hyperlegible/);
    expect(layout).toMatch(/Inter\(\{[^}]*variable: "--font-atkinson"/);
    expect(layout).toMatch(/Lexend_Deca\(\{[^}]*variable: "--font-lexend"/);
    expect(layout).toContain("className={`${inter.variable} ${lexend.variable} ${plexMono.variable}`}");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/convexy-tema-cobre-os-tokens.test.ts`
Expected: `Tests 3 failed | 12 passed (15)` — os três casos novos (`tema.css sem @layer base`; `body { font-feature-settings: normal; }` ausente; `Atkinson_Hyperlegible` ainda no layout).

- [ ] **Step 3: Regras de fonte no `tema.css`**

Acrescentar ao fim de `app/convexy/tema.css`:
```css

/* ── Fontes (spec 7.2.2) ─────────────────────────────────────────────────
   Inter no texto chega pelo `--font-atkinson` (app/layout.tsx mantém o nome
   da variável do original: `--font-sans` e o `body` do globals.css o leem).
   Títulos h1–h3 em Lexend Deca. DENTRO de `@layer base`, de propósito: um
   utilitário como `font-mono` (os <h1> de auditoria, incidentes e LGPD)
   continua vencendo. `CardTitle` é <div> e fica na Inter (spec seção 3). */
@layer base {
  h1,
  h2,
  h3 {
    font-family: var(--font-lexend), var(--font-atkinson), sans-serif;
  }
}

/* O globals.css liga o "ss01" no body (em `@layer base`); na Inter ele troca
   o desenho dos dígitos. FORA de camada, para vencer aquela regra. */
body {
  font-feature-settings: normal;
}
```

- [ ] **Step 4: Fontes no `layout.tsx`**

Linha 2 — trocar
```ts
import { Atkinson_Hyperlegible, IBM_Plex_Mono } from "next/font/google";
```
por
```ts
import { IBM_Plex_Mono, Inter, Lexend_Deca } from "next/font/google";
```

Linhas 28-33 — trocar
```ts
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-atkinson",
});
```
por
```ts
// Convexy: Inter no lugar da Atkinson Hyperlegible, com o NOME de variável do
// original de propósito — `--font-sans` (@theme inline) e o `body` do
// globals.css leem `--font-atkinson`. Títulos h1–h3 em Lexend Deca pelo
// app/convexy/tema.css. CONVEXY.md, "Paleta, fontes e barra do navegador".
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-atkinson",
});

const lexend = Lexend_Deca({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-lexend",
});
```

Linha 281 — trocar
```tsx
      className={`${atkinson.variable} ${plexMono.variable}`}
```
por
```tsx
      className={`${inter.variable} ${lexend.variable} ${plexMono.variable}`}
```

- [ ] **Step 5: As três specs e2e que conferem a fonte do produto**

```bash
sed -i '' 's#toMatch(/Atkinson/i)#toMatch(/Inter/i)#' tests/e2e/aviso-de-caso-no-whatsapp.spec.ts tests/e2e/conversa-do-caso.spec.ts tests/e2e/passagem-com-contexto.spec.ts
git grep -n -i "atkinson" -- tests/e2e
git grep -n "toMatch(/Inter/i)" -- tests/e2e
```
Expected: o primeiro `grep` vazio; o segundo lista exatamente `aviso-de-caso-no-whatsapp.spec.ts:280`, `conversa-do-caso.spec.ts:340`, `passagem-com-contexto.spec.ts:261` (botões: o preflight do Tailwind faz `button { font: inherit }`, então herdam a Inter do `body`).

- [ ] **Step 6: Rodar e ver passar**

```bash
pnpm vitest run tests/unit/convexy-tema-cobre-os-tokens.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/branding.test.ts tests/unit/branding-barra-do-navegador.test.ts
pnpm exec eslint app/layout.tsx tests/unit/_convexy-tema.ts tests/unit/convexy-tema-cobre-os-tokens.test.ts tests/unit/convexy-tema-contraste.test.ts tests/e2e/aviso-de-caso-no-whatsapp.spec.ts tests/e2e/conversa-do-caso.spec.ts tests/e2e/passagem-com-contexto.spec.ts
```
Expected: `convexy-tema-cobre-os-tokens` com `Tests 15 passed (15)`; as outras três PASS (`tailwind-tokens` exige `"--font-atkinson"` e `"--font-mono"` no layout — os dois continuam); `eslint` sem erro.

- [ ] **Step 7: Commit**

```bash
git add tests/unit/convexy-tema-cobre-os-tokens.test.ts app/convexy/tema.css app/layout.tsx tests/e2e/aviso-de-caso-no-whatsapp.spec.ts tests/e2e/conversa-do-caso.spec.ts tests/e2e/passagem-com-contexto.spec.ts
git commit -m "feat(convexy): Inter no texto e Lexend Deca nos títulos

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Barra do navegador — `lib/convexy/barra-do-navegador.ts`

**Files:**
- Modify: `tests/unit/convexy-tema-contraste.test.ts` (imports e `describe` no fim)
- Create: `lib/convexy/barra-do-navegador.ts`
- Modify: `app/layout.tsx:5` (import) e `:111-118` (`viewport`)

**Interfaces:**
- Consumes: `type CorDaBarra = { readonly media: string; readonly color: string }` de `lib/branding/barra-do-navegador.ts:36`.
- Produces: `coresDaBarraConvexy(): CorDaBarra[]`.

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/unit/convexy-tema-contraste.test.ts`, trocar o bloco de imports do topo por:
```ts
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { derivarMarca, razaoDeContraste } from "@/lib/branding/contraste";
import { REGUA_DO_PRODUTO } from "@/lib/branding/regua-do-produto";
import { coresDaBarraConvexy } from "@/lib/convexy/barra-do-navegador";

import { RAIZ, lerTemaConvexy, type Tema } from "./_convexy-tema";
```
e acrescentar ao fim do arquivo:
```ts
describe("barra do navegador da Convexy (spec 7.2.3)", () => {
  it("as duas cores são o --color-bg de cada tema do tema.css — uma fonte só", () => {
    const tema = lerTemaConvexy();
    expect(coresDaBarraConvexy().map((c) => ({ media: c.media, color: c.color.toLowerCase() }))).toEqual([
      { media: "(prefers-color-scheme: light)", color: tema.claro.get("--color-bg")?.toLowerCase() },
      { media: "(prefers-color-scheme: dark)", color: tema.escuro.get("--color-bg")?.toLowerCase() },
    ]);
  });

  it("o layout usa a barra da Convexy, não a régua do original", () => {
    const layout = fs.readFileSync(path.join(RAIZ, "app/layout.tsx"), "utf8");
    expect(layout).toContain("themeColor: coresDaBarraConvexy(),");
    expect(layout).not.toContain("coresDaBarraDoNavegador(");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/convexy-tema-contraste.test.ts`
Expected: FAIL — `Test Files 1 failed`, `Failed to resolve import "@/lib/convexy/barra-do-navegador"`.

- [ ] **Step 3: Implementar o módulo**

`lib/convexy/barra-do-navegador.ts`:
```ts
/**
 * Convexy: a cor da barra do navegador (`<meta name="theme-color">`).
 *
 * É o `--color-bg` de cada tema do `app/convexy/tema.css`. No original a cor sai
 * da régua (`lib/branding/barra-do-navegador.ts`, gerada do `globals.css`), e a
 * régua não muda no fork: o tema da Convexy é uma camada por cima dela. Os dois
 * hexes daqui são conferidos contra o `tema.css` em
 * `tests/unit/convexy-tema-contraste.test.ts` — uma fonte só, com um teste que
 * reprova a divergência.
 *
 * Segue a preferência do sistema operacional, não o tema escolhido no app, como
 * no original. Constante de propósito: o porquê de não virar
 * `generateViewport()` lendo o banco está no cabeçalho do arquivo do original.
 * Registro: CONVEXY.md, "Paleta, fontes e barra do navegador".
 */

import type { CorDaBarra } from "@/lib/branding/barra-do-navegador";

/** As duas entradas de `theme-color`, na ordem claro → escuro (o formato do original). */
export function coresDaBarraConvexy(): CorDaBarra[] {
  return [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0D10" },
  ];
}
```

- [ ] **Step 4: Ligar no layout**

Em `app/layout.tsx`, apagar a linha 5
```ts
import { coresDaBarraDoNavegador } from "@/lib/branding/barra-do-navegador";
```
e, logo depois do bloco
```ts
import {
  camadaDaInstalacao,
  camadaDoAmbiente,
  resolverMarca,
  type MarcaResolvida,
} from "@/lib/branding/resolve";
```
acrescentar
```ts
import { coresDaBarraConvexy } from "@/lib/convexy/barra-do-navegador";
```
(`REGUA_DO_PRODUTO` continua importado: `marcaResolvida()` o usa.) Trocar
```ts
/**
 * A cor da barra do navegador sai da RÉGUA, não de dois hexes redigitados aqui.
 * O porquê — inclusive por que isto NÃO deve virar `generateViewport()` lendo o
 * banco — está no cabeçalho de `lib/branding/barra-do-navegador.ts`.
 */
export const viewport: Viewport = {
  themeColor: coresDaBarraDoNavegador(REGUA_DO_PRODUTO),
};
```
por
```ts
/**
 * Convexy: a cor da barra do navegador é o fundo do tema da Convexy
 * (`lib/convexy/barra-do-navegador.ts`, conferido contra `app/convexy/tema.css`),
 * não a régua do original. Continua constante — o porquê de NÃO virar
 * `generateViewport()` lendo o banco está no cabeçalho de
 * `lib/branding/barra-do-navegador.ts`. CONVEXY.md.
 */
export const viewport: Viewport = {
  themeColor: coresDaBarraConvexy(),
};
```

- [ ] **Step 5: Rodar e ver passar**

```bash
pnpm vitest run tests/unit/convexy-tema-contraste.test.ts tests/unit/branding-barra-do-navegador.test.ts tests/unit/branding.test.ts tests/unit/convexy-tema-cobre-os-tokens.test.ts
pnpm exec eslint app/layout.tsx lib/convexy/barra-do-navegador.ts tests/unit/convexy-tema-contraste.test.ts
```
Expected: `convexy-tema-contraste` com `Tests 29 passed (29)`; `branding-barra-do-navegador` PASS (a função do original segue testada, e o layout não escreve `#faf9f6`/`#161510`); `branding` PASS (nada de `deskcomm` em `lib/convexy/`); `convexy-tema-cobre-os-tokens` 15 PASS; `eslint` sem erro (sem import sobrando).

- [ ] **Step 6: Commit**

```bash
git add tests/unit/convexy-tema-contraste.test.ts lib/convexy/barra-do-navegador.ts app/layout.tsx
git commit -m "feat(convexy): barra do navegador no fundo da Convexy

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Na tela — `tests/e2e/convexy-identidade.spec.ts`

**Files:**
- Create: `tests/e2e/convexy-identidade.spec.ts`
- Modify: `.github/workflows/e2e.yml` (`SPECS_PARTE_1`, linha nova depois de `icone-da-marca.spec.ts`, `:623`)

**Interfaces:**
- Consumes: `PALETA_DA_SPEC`, `Tema` (Task 1); `lerCreds(): CredsE2E` e `loginComoAdmin(page, creds): Promise<CredsE2E>` de `tests/e2e/helpers/login-admin.ts`; controle de tema `getByRole("button", { name: /^Tema:/ })` (`components/theme/theme-toggle.tsx:26`, no `UserMenu`).
- Produces: 4 casos e2e na `SPECS_PARTE_1`; evidência em `.superpowers/evidence/convexy-cvx3/` (ignorada pelo git).

Ambiente: o e2e roda contra `next build` + `next start` (`playwright.config.ts`, `webServer`) e um Supabase **local** com o `baseline.sql`. O clone de trabalho não tem `.env.e2e` nem `.e2e-creds.json`, e montar o stack como o CI faz exige mover `supabase/migrations` e sobrescrever `.env.local` (que aponta para produção). Por isso tudo roda num **worktree descartável**, fora de `/tmp` e com `node_modules` real (receita do CLAUDE.md, "QA Visual"). Vermelho: build da `origin/main` com a spec nova copiada. Verde: build da branch.

- [ ] **Step 1: Escrever a spec**

`tests/e2e/convexy-identidade.spec.ts`:
```ts
import * as fs from "node:fs";
import * as path from "node:path";

import { test, expect, type Page } from "@playwright/test";

import { PALETA_DA_SPEC, type Tema } from "../unit/_convexy-tema";
import { lerCreds, loginComoAdmin } from "./helpers/login-admin";

/**
 * Convexy -cvx.3 — paleta, fontes e barra do navegador medidas NA TELA
 * (spec docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, 7.2.5).
 *
 * Por ferramenta, nunca a olho:
 * - tokens: um elemento-sonda recebe `background-color: var(--color-…)` e o
 *   `getComputedStyle` (em rgb) é comparado com a tabela da spec. O TEXTO das
 *   custom properties não serve: o minificador reescreve `#FFFFFF` em `#fff`;
 * - o seletor dobrado do `app/convexy/tema.css` tem de chegar à folha PUBLICADA,
 *   em nível de topo (fora de camada) — a cor certa sozinha não prova isso,
 *   porque a ordem de carga também poderia dar a vitória;
 * - fontes pelo PRIMEIRO nome da pilha (o `next/font` pode gerar
 *   `__Inter_<hash>`, e o Chrome põe aspas em nome com espaço);
 * - `/login` no modo "sistema" (nada salvo): o tema vem de
 *   `prefers-color-scheme`, pelo script anti-flash do layout;
 * - `/app/settings` trocando o tema pelo controle da tela, como a pessoa faz.
 *   Rota fixa: `/app` redireciona para uma inicial variável.
 * Um login só no arquivo. Registro: CONVEXY.md.
 */

const EVIDENCIA = path.join(process.cwd(), ".superpowers", "evidence", "convexy-cvx3");

const TEMAS = [
  { tema: "claro", dataTheme: "light" },
  { tema: "escuro", dataTheme: "dark" },
] as const satisfies ReadonlyArray<{ tema: Tema; dataTheme: "light" | "dark" }>;

const SELETORES_DOBRADOS = ['[data-theme="dark"][data-theme="dark"]', '[data-theme="light"][data-theme="light"]'];

function evidencia(nome: string): string {
  fs.mkdirSync(EVIDENCIA, { recursive: true });
  return path.join(EVIDENCIA, nome);
}

type Canais = { r: number; g: number; b: number; a: number };

function canais(cor: string): Canais {
  const limpa = cor.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(limpa);
  if (hex) {
    const n = Number.parseInt(hex[1] ?? "", 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const fn = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(limpa);
  if (!fn) throw new Error(`cor fora de #rrggbb/rgb()/rgba(): ${cor}`);
  return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), a: fn[4] === undefined ? 1 : Number(fn[4]) };
}

/** Mesmos canais; alfa com folga de 0,01 (o navegador guarda o alfa em 8 bits). */
function mesmaCor(medida: string, esperada: string): boolean {
  try {
    const m = canais(medida);
    const e = canais(esperada);
    return m.r === e.r && m.g === e.g && m.b === e.b && Math.abs(m.a - e.a) <= 0.01;
  } catch {
    return false;
  }
}

async function conferirTokens(page: Page, tema: Tema): Promise<void> {
  const esperado = PALETA_DA_SPEC[tema];
  const medido = await page.evaluate((tokens) => {
    const sonda = document.createElement("div");
    document.body.appendChild(sonda);
    const saida: Record<string, string> = {};
    for (const token of tokens) {
      sonda.style.backgroundColor = `var(${token})`;
      saida[token] = getComputedStyle(sonda).backgroundColor;
    }
    // Aliases do original que acompanham (spec 7.2.1): popover = cartão; borda do campo = borda.
    sonda.style.backgroundColor = "";
    sonda.className = "bg-popover border border-input";
    saida["bg-popover"] = getComputedStyle(sonda).backgroundColor;
    saida["border-input"] = getComputedStyle(sonda).borderTopColor;
    sonda.remove();
    return saida;
  }, Object.keys(esperado));

  const alvo: Record<string, string> = {
    ...esperado,
    "bg-popover": esperado["--color-surface"] ?? "",
    "border-input": esperado["--color-border"] ?? "",
  };
  const divergentes: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(alvo)) {
    const m = medido[chave] ?? "(ausente)";
    if (!mesmaCor(m, valor)) divergentes[chave] = `medido ${m}, esperado ${valor}`;
  }
  expect(divergentes, `tokens do tema ${tema} na tela`).toEqual({});
}

async function seletoresDobradosPublicados(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const achados: string[] = [];
    for (const folha of Array.from(document.styleSheets)) {
      let regras: CSSRuleList;
      try {
        regras = folha.cssRules;
      } catch {
        continue;
      }
      // Só regras de NÍVEL DE TOPO: dentro de um @layer elas perderiam para o original.
      for (const regra of Array.from(regras)) {
        if (
          regra instanceof CSSStyleRule &&
          /^\[data-theme="(light|dark)"\]\[data-theme="\1"\]$/.test(regra.selectorText)
        ) {
          achados.push(regra.selectorText);
        }
      }
    }
    return [...new Set(achados)].sort();
  });
}

function primeiraFamilia(pilha: string): string {
  return (pilha.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
}

async function conferirFontes(page: Page): Promise<void> {
  const f = await page.evaluate(async () => {
    await document.fonts.ready;
    const ff = (el: Element | null) => (el ? getComputedStyle(el).fontFamily : "(sem elemento)");
    const h1DaPagina = ff(document.querySelector("h1"));
    const h1Mono = document.createElement("h1");
    h1Mono.className = "font-mono";
    h1Mono.textContent = "#a1b2c3";
    const h2 = document.createElement("h2");
    h2.textContent = "Título de diálogo";
    const div = document.createElement("div");
    div.className = "font-semibold";
    div.textContent = "Título de cartão";
    document.body.append(h1Mono, h2, div);
    const saida = {
      body: ff(document.body),
      h1: h1DaPagina,
      h1Mono: ff(h1Mono),
      h2: ff(h2),
      div: ff(div),
      recursosDoBody: getComputedStyle(document.body).fontFeatureSettings,
      carregadas: [] as string[],
    };
    h1Mono.remove();
    h2.remove();
    div.remove();
    document.fonts.forEach((face) => {
      if (face.status === "loaded") saida.carregadas.push(face.family.replace(/["']/g, ""));
    });
    return saida;
  });

  expect(primeiraFamilia(f.body), `body: ${f.body}`).toMatch(/Inter/i);
  expect(primeiraFamilia(f.h1), `h1 da página: ${f.h1}`).toMatch(/Lexend/i);
  expect(primeiraFamilia(f.h2), `h2: ${f.h2}`).toMatch(/Lexend/i);
  expect(primeiraFamilia(f.h1Mono), `h1.font-mono (utilitário vence a camada base): ${f.h1Mono}`).toMatch(
    /Plex.?Mono/i,
  );
  expect(primeiraFamilia(f.div), `div (o CardTitle é div): ${f.div}`).toMatch(/Inter/i);
  expect(f.recursosDoBody, "o ss01 do original tem de estar anulado no body").toBe("normal");
  expect(f.carregadas.some((n) => /Inter/i.test(n)), `Inter carregada: ${f.carregadas.join(" | ")}`).toBe(true);
  expect(f.carregadas.some((n) => /Lexend/i.test(n)), `Lexend carregada: ${f.carregadas.join(" | ")}`).toBe(true);
}

async function temaDaPagina(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

/** Troca o tema CLICANDO no controle (claro → escuro → sistema → claro), com teto. */
async function escolherTemaPelaTela(page: Page, alvo: "light" | "dark"): Promise<void> {
  const botao = page.getByRole("button", { name: /^Tema:/ });
  await expect(botao, "o controle de tema não está na tela").toBeVisible({ timeout: 15_000 });
  for (let i = 0; i < 4; i++) {
    if ((await temaDaPagina(page)) === alvo) return;
    await botao.click();
    await page.waitForTimeout(150);
  }
  throw new Error(`o controle de tema não chegou em "${alvo}" em 4 cliques (data-theme=${await temaDaPagina(page)})`);
}

test.describe("identidade da Convexy na tela (spec 7.2)", () => {
  for (const { tema, dataTheme } of TEMAS) {
    test(`/login no tema ${tema}, no modo sistema: tokens, seletor publicado e fontes`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: dataTheme });
      await page.goto("/login");
      await expect(page.locator("html")).toHaveAttribute("data-theme", dataTheme);
      await conferirTokens(page, tema);
      expect(await seletoresDobradosPublicados(page), "regras dobradas do tema.css na folha publicada").toEqual(
        SELETORES_DOBRADOS,
      );
      await conferirFontes(page);
      await page.screenshot({ path: evidencia(`login-${tema}.png`) });
    });
  }

  test("/login declara theme-color com os fundos da Convexy (spec 7.2.3)", async ({ page }) => {
    await page.goto("/login");
    const metas = await page
      .locator('meta[name="theme-color"]')
      .evaluateAll((els) =>
        els.map((e) => ({ media: e.getAttribute("media"), cor: (e.getAttribute("content") ?? "").toUpperCase() })),
      );
    expect(metas).toEqual([
      { media: "(prefers-color-scheme: light)", cor: "#F8FAFC" },
      { media: "(prefers-color-scheme: dark)", cor: "#0B0D10" },
    ]);
  });

  test("/app/settings nos dois temas, trocando pelo controle da tela", async ({ page }) => {
    // Um login só, mas ele pode esperar a próxima janela TOTP se a spec anterior
    // do mesmo worker acabou de logar (tests/e2e/helpers/login-admin.ts).
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme: "light" });
    await loginComoAdmin(page, lerCreds());
    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    for (const { tema, dataTheme } of TEMAS) {
      await escolherTemaPelaTela(page, dataTheme);
      await conferirTokens(page, tema);
      await conferirFontes(page);
      await page.screenshot({ path: evidencia(`app-settings-${tema}.png`) });
    }
  });
});
```

- [ ] **Step 2: Registrar na `SPECS_PARTE_1`**

`PARTE_1` e não 2/3/5: é a de maior folga medida (`e2e.yml:440`, 412 s) e a spec não precisa de WAHA, Redis nem Resend. Em `.github/workflows/e2e.yml`, trocar
```yaml
        icone-da-marca.spec.ts
        password-recovery.spec.ts signup-journey.spec.ts
```
por
```yaml
        icone-da-marca.spec.ts
        convexy-identidade.spec.ts
        password-recovery.spec.ts signup-journey.spec.ts
```
(uma linha dentro do bloco `>-`, sem comentário: `e2e-cobertura-completa.test.ts:153` reprova palavra que não seja spec.)

```bash
pnpm vitest run tests/unit/e2e-cobertura-completa.test.ts tests/unit/e2e-dois-logins-nao-cabem-no-teto-padrao.test.ts
pnpm exec playwright test --list tests/e2e/convexy-identidade.spec.ts 2>&1 | tail -6
```
Expected: os dois testes PASS (`toda spec do disco está em exatamente uma lista`; a spec nova tem um login só e não entra na régua do teto). O `--list` falha só se faltar `.env.e2e` (`Falta o .env.e2e`) — esperado neste clone; a listagem de verdade é no Step 4.

- [ ] **Step 3: Ambiente e2e no worktree (uma vez)**

Docker Desktop aberto. Nenhum outro Supabase local de pé (o `project_id` é o mesmo, `deskcomm-crm`):
```bash
docker info >/dev/null 2>&1 && echo "docker ok"
docker ps --format '{{.Names}}' | grep -c '^supabase_' || true
```
Expected: `docker ok`; `0` (se não for `0`: **parar** e perguntar ao Victor — é um stack dele).

```bash
W=/Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM-e2e-cvx3
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
git fetch -q origin main && git worktree add --detach "$W" origin/main
cd "$W" && pnpm install --frozen-lockfile
mv supabase/migrations .migrations-off && mkdir -p supabase/migrations
supabase start
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -q <<'SQL'
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema public;
create extension if not exists citext with schema public;
create extension if not exists pg_trgm with schema public;
SQL
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -q -f supabase/baseline.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -q \
  -c "insert into private.app_secrets (name, value) values ('nuvemshop_oauth_key', '$(openssl rand -hex 32)') on conflict (name) do nothing;"
docker restart $(docker ps -q --filter name=supabase_realtime)
pnpm e2e:env
cp .env.e2e .env.local
pnpm exec tsx scripts/seed-e2e-credentials.ts
pnpm exec playwright install chromium
ls -l .env.e2e .e2e-creds.json
```
Expected: `supabase start` imprime as URLs locais (`API URL: http://127.0.0.1:54321`); o `baseline.sql` aplica sem erro (`ON_ERROR_STOP=1`); `pnpm e2e:env` grava o `.env.e2e`; o seed termina sem erro; os dois arquivos listados. (Mesma sequência dos passos do CI, `e2e.yml:1330-1452` e `:1643-1647`. O `mv` e o `cp` só existem neste worktree.)

- [ ] **Step 4: Vermelho — build da `origin/main` com a spec nova**

```bash
W=/Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM-e2e-cvx3
C=/Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
cp "$C/tests/e2e/convexy-identidade.spec.ts" "$W/tests/e2e/"
cp "$C/tests/unit/_convexy-tema.ts" "$W/tests/unit/"
cd "$W" && pnpm e2e:build > /tmp/cvx3-build-base.log 2>&1; echo "build exit=$?"
pnpm exec playwright test tests/e2e/convexy-identidade.spec.ts > /tmp/cvx3-e2e-vermelho.log 2>&1; echo "e2e exit=$?"
grep -aE "passed|failed" /tmp/cvx3-e2e-vermelho.log | tail -3
grep -aE "medido rgb\(250, 249, 246\)|#FAF9F6" /tmp/cvx3-e2e-vermelho.log | head -3
```
Expected: `build exit=0`; `e2e exit=1`; `4 failed`; o log mostra `--color-bg` `medido rgb(250, 249, 246), esperado #F8FAFC` (o fundo do original) e a `theme-color` com `#FAF9F6`.

- [ ] **Step 5: Verde — build da branch**

```bash
W=/Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM-e2e-cvx3
C=/Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
cd "$W" && rm tests/e2e/convexy-identidade.spec.ts tests/unit/_convexy-tema.ts
git checkout --detach convexy/cvx-3
cp "$C/tests/e2e/convexy-identidade.spec.ts" tests/e2e/
pnpm e2e:build > /tmp/cvx3-build-cvx3.log 2>&1; echo "build exit=$?"
pnpm exec playwright test tests/e2e/convexy-identidade.spec.ts tests/e2e/icone-da-marca.spec.ts tests/e2e/logo-moldura-no-tema-escuro.spec.ts > /tmp/cvx3-e2e-verde.log 2>&1; echo "e2e exit=$?"
grep -aE "passed|failed|skipped" /tmp/cvx3-e2e-verde.log | tail -3
ls .superpowers/evidence/convexy-cvx3/
```
Expected: `build exit=0` (o `next build` baixa Inter e Lexend Deca do Google Fonts — sem rede, falha aqui); `e2e exit=0`, nenhum `failed`; quatro PNGs (`login-claro.png`, `login-escuro.png`, `app-settings-claro.png`, `app-settings-escuro.png`). `logo-moldura-no-tema-escuro` mede o chip branco contra `#131923` (limiar 200/255, spec 9). Se `icone-da-marca` ou `logo-moldura-no-tema-escuro` falharem, rodar as duas no build da base (Step 4) antes de concluir que é regressão — falta de fixture reprova igual nas duas.

Olhar os quatro PNGs (Read): fundo claro azulado-frio e escuro quase preto, títulos em Lexend, texto em Inter, nada ilegível. Copiar a evidência para o clone (pasta ignorada pelo git):
```bash
mkdir -p "$C/.superpowers/evidence" && cp -R "$W/.superpowers/evidence/convexy-cvx3" "$C/.superpowers/evidence/"
```

- [ ] **Step 6: Desmontar o ambiente**

```bash
W=/Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM-e2e-cvx3
cd "$W" && supabase stop --no-backup
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM && git worktree remove --force "$W" && git worktree prune && git worktree list
```
Expected: o `worktree list` mostra só o clone de trabalho. (Se a Task 7 pedir correção de tela, refazer os Steps 3–5.)

- [ ] **Step 7: Commit**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
pnpm exec eslint tests/e2e/convexy-identidade.spec.ts
git add tests/e2e/convexy-identidade.spec.ts .github/workflows/e2e.yml
git commit -m "test(convexy): identidade da Convexy medida na tela (e2e)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: `eslint` sem erro; `git status --short` vazio depois do commit.

---

### Task 6: `CONVEXY.md` e `CHANGELOG.md`

**Files:**
- Modify: `CONVEXY.md` (seção nova depois de "Cabeçalho do CHANGELOG"; bullets em "Desvios aceitos" e "Afirmações de docs…"; seção de rollback no fim)
- Modify: `CHANGELOG.md` (seção acima de `## [1.44.0-cvx.2] — 2026-09-23`, `:11`)

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: registro que a Task 8 cita no rollback; notas que o botão "Atualizar" mostra.

- [ ] **Step 1: Seção de alterações da `-cvx.3`**

Em `CONVEXY.md`, logo antes de `## Desvios aceitos`, inserir:
```markdown
### Paleta, fontes e barra do navegador (etapa 3, `-cvx.3`)

Arquivos novos (código da Convexy — não conflitam num merge): `app/convexy/tema.css`,
`lib/convexy/barra-do-navegador.ts`, `tests/unit/_convexy-tema.ts`,
`tests/unit/convexy-tema-cobre-os-tokens.test.ts`, `tests/unit/convexy-tema-contraste.test.ts`,
`tests/e2e/convexy-identidade.spec.ts`. O `app/globals.css` **não** é editado: o `tema.css`
vence os blocos de token do original com seletor de atributo dobrado (0,2,0), fora de camada,
em qualquer ordem de carga.

| Arquivo | Trecho | Reaplicar |
|---|---|---|
| `app/layout.tsx` | `import { IBM_Plex_Mono, Inter, Lexend_Deca } from "next/font/google";` | manter o nosso import |
| `app/layout.tsx` | `import "./convexy/tema.css";` (com o comentário `// Convexy: …`) **logo depois** de `import "./globals.css";` | manter depois do `globals.css` |
| `app/layout.tsx` | `const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-atkinson" })` e `const lexend = Lexend_Deca({ …, variable: "--font-lexend" })` no lugar de `const atkinson = Atkinson_Hyperlegible(…)` | manter o nome `--font-atkinson` (o `globals.css` o lê) |
| `app/layout.tsx` | ``className={`${inter.variable} ${lexend.variable} ${plexMono.variable}`}`` no `<html>` | idem |
| `app/layout.tsx` | `import { coresDaBarraConvexy } from "@/lib/convexy/barra-do-navegador";` (sai o import de `coresDaBarraDoNavegador`) e `themeColor: coresDaBarraConvexy(),` no `viewport`, com o comentário `Convexy:` acima | manter o nosso `viewport` |
| `tests/e2e/aviso-de-caso-no-whatsapp.spec.ts:280`, `tests/e2e/conversa-do-caso.spec.ts:340`, `tests/e2e/passagem-com-contexto.spec.ts:261` | `toMatch(/Inter/i)` no lugar de `toMatch(/Atkinson/i)` | trocar de novo se o original mexer na linha |
| `.github/workflows/e2e.yml` | linha `convexy-identidade.spec.ts` em `SPECS_PARTE_1`, logo depois de `icone-da-marca.spec.ts` | reaplicar a linha dentro do bloco `>-`, **sem comentário** no bloco |
| `CHANGELOG.md` | `## [1.44.0-cvx.3]` | ordem de "Base e versões" |

Conferência depois de um merge do original:
`pnpm vitest run tests/unit/convexy-tema-cobre-os-tokens.test.ts tests/unit/convexy-tema-contraste.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/branding-barra-do-navegador.test.ts tests/unit/e2e-cobertura-completa.test.ts`.
`convexy-tema-cobre-os-tokens` reprova quando o original renomeia ou cria token nos blocos
`[data-theme]` do `globals.css`: decidir o valor Convexy e acrescentá-lo ao `tema.css`.
```

- [ ] **Step 2: Desvios aceitos e afirmações que não valem**

Em `CONVEXY.md`, no fim da lista de `## Desvios aceitos`, acrescentar:
```markdown
- **Paleta (`-cvx.3`)** — popover igual ao cartão (`#131923` no escuro, e não `#171E2A` do
  CRM antigo: os aliases estão fixados em `globals.css:529-532`); campo no escuro igual ao
  fundo (`#0B0D10`, e não `#111720`). Ficam na paleta do original, aceitas: o nome do produto
  sem logo (`components/branding/MarcaDoProduto.tsx:30-31`, `lib/branding/desenho.ts:101`);
  `--color-accent-fg` escuro `#161510` (só vale sem cor de marca — aqui há); as prévias do
  `CampoDeLogo` e o fundo dos e-mails (leem `REGUA_DO_PRODUTO`, que não muda —
  `lib/branding/regua-do-produto.ts` é gerado do `globals.css`); o showcase `app/design/`.
- **Fontes (`-cvx.3`)** — Lexend Deca só em `h1–h3`: `CardTitle` é `<div>` e números de
  destaque ficam na Inter (exigiria classe em componente do original). `display: "swap"` nas
  duas fontes, como a Atkinson do original.
```
e no fim de `## Afirmações de docs do original que não valem no fork`:
```markdown
- `docs/white-label.md:80` ("a fonte é a Atkinson Hyperlegible"), `docs/brand/README.md:73`,
  `docs/design-system/00-overview.md:24,41` e `docs/design-system/03-typography.md`: no fork o
  texto é Inter e os títulos `h1–h3` são Lexend Deca (`-cvx.3`).
- `docs/white-label.md:81` ("o fundo é o mesmo em toda marca, e é por isso que a cor da barra do
  navegador também é") e o cabeçalho de `lib/branding/barra-do-navegador.ts` (`#faf9f6` /
  `#161510` são a cor da barra): no fork o fundo é `#F8FAFC`/`#0B0D10` e a barra vem de
  `lib/convexy/barra-do-navegador.ts`.
```

- [ ] **Step 3: Rollback da etapa 3**

No fim de `CONVEXY.md`, acrescentar:
````markdown
## Rollback de uma versão da etapa 3

Para a `-cvx` anterior, dentro do `tmux`, com log (exemplo: da `-cvx.3` para a `-cvx.2`):
```bash
cd /opt/deskcommcrm && tmux new -s rollback-cvx3 "bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.2 --force 2>&1 | tee /root/update-$(date +%Y%m%d-%H%M)-rollback-cvx3.log; echo FIM; read"
```
`--force` porque o alvo é ancestral do HEAD (`update.sh:107-114`). Depois disso o botão
"Atualizar" **volta a oferecer** a versão revertida (ela não é ancestral do HEAD —
`agent.sh:161-164`): **não clicar**; corrigir com a `-cvx` seguinte. A `-cvx.3` não tem banco
nem `.env`: o rollback é só código e imagens.
````

- [ ] **Step 4: Seção no CHANGELOG**

Em `CHANGELOG.md`, entre `## [Não lançado]` (e a linha em branco que o segue) e `## [1.44.0-cvx.2] — 2026-09-23`, inserir (trocar `AAAA-MM-DD` pela saída de `date +%F` — o dia do corte; se o merge escorregar de dia, a Task 7 Step 3 manda corrigir):
```markdown
## [1.44.0-cvx.3] — AAAA-MM-DD

Nova identidade visual da Convexy nos temas claro e escuro: fundos, textos, bordas e cinzas novos, a fonte Inter no texto e a Lexend Deca nos títulos, e a barra do navegador (no celular) na cor do fundo novo. A cor de destaque continua a da marca definida em `/admin/marca`. Sem mudança no banco nem no `.env`.

```

- [ ] **Step 5: Conferir e commitar**

```bash
sed -n 9,20p CHANGELOG.md
git diff --name-only refs/upstream-tags/v1.44.0 HEAD | grep -vE '^docs/superpowers/' | sort
pnpm vitest run tests/unit/release-chega-na-lp.test.ts tests/unit/convexy-cabecalho-cvx.test.ts tests/unit/changelog-cabe-na-tela-da-vps.test.ts tests/unit/documentacao-aponta-para-o-que-existe.test.ts tests/unit/evidencia-citada.test.ts lib/system/changelog.test.ts
git add CONVEXY.md CHANGELOG.md
git commit -m "docs(convexy): registro e notas da 1.44.0-cvx.3

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
Expected: o `sed` mostra `## [Não lançado]`, depois `## [1.44.0-cvx.3] — <hoje>`, depois `## [1.44.0-cvx.2] — 2026-09-23`. O `diff --name-only` lista exatamente os arquivos da etapa 2 já registrados (`.env.hostgator.example`, `CHANGELOG.md`, `CONVEXY.md`, `docker-compose.prod.yml`, os quatro `Dockerfile*`, `hostgator-setup-kit/_common.sh`, `comecar.sh`, `install.sh`, `tests/unit/_convexy-cabecalho.ts`, `_identidade-deste-repo.ts`, `convexy-cabecalho-cvx.test.ts`, `convexy-ultima-versao.test.ts`, `release-chega-na-lp.test.ts`) mais os da `-cvx.3` (`.github/workflows/e2e.yml`, `app/convexy/tema.css`, `app/layout.tsx`, `lib/convexy/barra-do-navegador.ts`, as três specs e2e alteradas, `tests/e2e/convexy-identidade.spec.ts`, `tests/unit/_convexy-tema.ts`, `tests/unit/convexy-tema-cobre-os-tokens.test.ts`, `tests/unit/convexy-tema-contraste.test.ts`) — nada fora do `CONVEXY.md` (spec 7.5). Os testes PASS.

---

### Task 7 [GitHub]: PR, CI, merge, tag e publicação da `v1.44.0-cvx.3`

**Files:** nenhum novo.

**Interfaces:**
- Consumes: Tasks 0–6 em `convexy/cvx-3`.
- Produces: `main` do fork com a `-cvx.3`; tag `v1.44.0-cvx.3`; quatro imagens `:1.44.0-cvx.3` e `stable` apontando para elas.

- [ ] **Step 1: Suítes locais**

```bash
cd /Users/victorraby/Downloads/Quantux/backup-deskcommcrm/DeskcommCRM
NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck && pnpm lint
pnpm test:unit > /tmp/cvx3-vt.log 2>&1; echo "exit=$?"; grep -aE "Test Files|Tests |Errors " /tmp/cvx3-vt.log | tail -3
node -e 'console.log(require("./package.json").scripts["test:shell"].split(" && ").map(s=>s.replace(/^bash /,"")).join("\n"))' \
  | while read -r s; do bash "$s" </dev/null >/dev/null 2>&1; echo "$? $s"; done > /tmp/cvx3-shell.txt; diff /tmp/cvx3-shell-base.txt /tmp/cvx3-shell.txt && echo "shell igual à base"
```
Expected: typecheck e lint exit 0 (lint: 0 erros; só os warnings já existentes); Vitest `exit=0`, sem `failed` e sem linha `Errors`, com **2** arquivos e **44** casos a mais que `/tmp/cvx3-vt-base.log` (`convexy-tema-cobre-os-tokens` 15 + `convexy-tema-contraste` 29); `shell igual à base`.

- [ ] **Step 2: Workflows, push e PR**

Pedir confirmação ao Victor. Depois:
```bash
gh workflow list --all -R victorrabyfs/DeskcommCRM --json path,state --jq '.[]|[.path,.state]|@tsv'
git push -u origin convexy/cvx-3
gh pr create -R victorrabyfs/DeskcommCRM --base main --head convexy/cvx-3 \
  --title "Convexy 1.44.0-cvx.3: paleta, fontes e barra do navegador" \
  --body "Etapa 3, primeira versão (spec docs/superpowers/specs/2026-09-22-identidade-convexy-design.md, seção 7.2; plano docs/superpowers/plans/2026-09-23-convexy-cvx3-paleta-fontes.md). Paleta da Convexy por cima do globals.css (app/convexy/tema.css), Inter + Lexend Deca, theme-color do fundo novo. Sem banco, sem .env. Destino: instalação do fork. DoD 13: mudança só de aparência (sem dado, rota, log ou worker novos). Prova em tela: tests/e2e/convexy-identidade.spec.ts (PARTE_1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
Expected: `ci.yml`, `e2e.yml`, `perf.yml`, `publish-image.yml` em `active`; `acolhida.yml`, `release.yml`, `relogio.yml`, `vigia-de-colisao.yml` em `disabled_manually`; a URL do PR é `https://github.com/victorrabyfs/DeskcommCRM/pull/…`.

- [ ] **Step 3: Esperar os cinco obrigatórios resolverem**

`gh pr checks --watch` sai antes de os cinco aparecerem; esperar por nome:
```bash
while :; do
  linhas=$(gh pr checks convexy/cvx-3 -R victorrabyfs/DeskcommCRM --json name,bucket \
    --jq '.[] | select(.name=="verify" or .name=="invariants" or .name=="build-and-size" or .name=="e2e" or .name=="imagens-ok") | "\(.name) \(.bucket)"' 2>/dev/null)
  vistos=$(printf '%s\n' "$linhas" | awk 'NF{print $1}' | sort -u | wc -l | tr -d ' ')
  pendentes=$(printf '%s\n' "$linhas" | grep -c ' pending$')
  echo "$(date +%T) obrigatórios vistos=$vistos/5 pendentes=$pendentes"
  [ "$vistos" -eq 5 ] && [ "$pendentes" -eq 0 ] && break
  sleep 60
done
printf '%s\n' "$linhas" | sort -u
gh pr checks convexy/cvx-3 -R victorrabyfs/DeskcommCRM --json name,bucket --jq '.[]|select(.name|startswith("e2e-parte"))|"\(.name) \(.bucket)"'
```
Expected: `build-and-size pass`, `e2e pass`, `imagens-ok pass`, `invariants pass`, `verify pass`; as cinco `e2e-parte (N)` com `pass` — **não** `skipping` (o PR toca `app/layout.tsx`, que o `pr-alcanca-o-e2e.sh` mede; parte pulada não provaria tela nenhuma).

**Se `build-and-size`, `e2e` ou `imagens-ok` falhar**, ver se é o download do Google Fonts no `next build` (a `-cvx.3` passou a baixar Inter e Lexend Deca):
```bash
id=$(gh run list -R victorrabyfs/DeskcommCRM --branch convexy/cvx-3 --workflow perf.yml --limit 1 --json databaseId --jq '.[0].databaseId')   # perf.yml → build-and-size; e2e.yml → e2e; publish-image.yml → imagens-ok
gh run view "$id" -R victorrabyfs/DeskcommCRM --log-failed | grep -iE "fonts\.(googleapis|gstatic)\.com|Failed to fetch" | head -3
gh run rerun "$id" -R victorrabyfs/DeskcommCRM --failed
```
Se o `grep` achar o erro de rede: **um** `rerun --failed` e voltar ao laço. Se falhar de novo, ou se o erro for outro: parar e investigar (superpowers:systematic-debugging), corrigir na branch; nunca desligar check.

- [ ] **Step 4: Data da seção e merge por merge commit**

```bash
git fetch -q origin && git diff --quiet HEAD origin/convexy/cvx-3 && echo "branch local = remota"
grep -n "^## \[1.44.0-cvx.3\] — $(date +%F)$" CHANGELOG.md || echo "DATA DA SEÇÃO DIFERENTE DE HOJE — corrigir, commitar, empurrar e voltar ao Step 3"
gh pr merge convexy/cvx-3 -R victorrabyfs/DeskcommCRM --merge
gh pr view convexy/cvx-3 -R victorrabyfs/DeskcommCRM --json state,mergeCommit --jq '.state, .mergeCommit.oid'
```
Expected: `branch local = remota`; a linha da seção com a data de hoje; `MERGED` e o sha do merge.

- [ ] **Step 5: Tag e publicação**

```bash
git fetch origin main
test "$(gh pr view convexy/cvx-3 -R victorrabyfs/DeskcommCRM --json state --jq .state)" = MERGED || { echo "PR não está MERGED — não criar tag"; exit 1; }
git tag -a v1.44.0-cvx.3 -m "Convexy 1.44.0-cvx.3 — paleta, fontes e barra do navegador" origin/main
git push origin v1.44.0-cvx.3
until id=$(gh run list -R victorrabyfs/DeskcommCRM --workflow publish-image.yml --event push --limit 20 --json databaseId,headBranch --jq '[.[]|select(.headBranch=="v1.44.0-cvx.3")][0].databaseId // empty') && [ -n "$id" ]; do sleep 5; done
gh run watch "$id" -R victorrabyfs/DeskcommCRM --exit-status
git ls-remote --tags origin
```
Expected: o `pre-push` local aceita (`vX.Y.Z-cvx.N`); o run termina verde (inclui `a-tag-veio-da-main` e `promover-stable`); `ls-remote` lista `v1.44.0`, `v1.44.0-cvx.1`, `v1.44.0-cvx.2`, `v1.44.0-cvx.3`, cada uma com `^{}`.

- [ ] **Step 6: Conferir as imagens publicadas**

```bash
digest_de() { local i=$1 ref=$2 t; t=$(curl -s "https://ghcr.io/token?scope=repository:victorrabyfs/$i:pull&service=ghcr.io" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  curl -sI -H "Authorization: Bearer $t" -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.docker.distribution.manifest.v2+json" \
    "https://ghcr.io/v2/victorrabyfs/$i/manifests/$ref" | awk 'tolower($1)=="docker-content-digest:"{print $2} /^HTTP/{print $2}' | tr -d '\r' | paste -sd' ' -; }
for i in deskcommcrm deskcomm-worker deskcomm-scheduler deskcomm-voice-agent; do
  echo "$i cvx3=$(digest_de $i 1.44.0-cvx.3) stable=$(digest_de $i stable)"
done
```
Expected: em cada imagem, `cvx3` e `stable` com `200` e **o mesmo digest**.

---

### Task 8 [VPS]: Aplicar a `-cvx.3` pelo botão e conferir

**Files:** nenhum.

**Interfaces:**
- Consumes: Task 7 (tag e imagens públicas); VPS em `v1.44.0-cvx.2`.
- Produces: produção em `1.44.0-cvx.3`, conferida em tela nos dois temas.

- [ ] **Step 1: Confirmação e estado de partida**

Pedir confirmação ao Victor (a recriação dos contêineres derruba o app por alguns segundos — fora do pico das clínicas). Depois:
```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; git tag -l | tr "\n" " "; echo; git config --get versionsort.suffix || echo "versionsort.suffix vazio (ok)"; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300'
```
Expected: `v1.44.0-cvx.2`; tags só `v1.44.0 v1.44.0-cvx.1 v1.44.0-cvx.2` (e `v1.44.0-cvx.3`, se o agente já buscou); `versionsort.suffix vazio (ok)`; health `1.44.0-cvx.2`. Tag intrusa: repetir a limpeza de `CONVEXY.md`, "Migrar uma VPS do original para o fork", passo 3, antes de seguir.

- [ ] **Step 2: Atualizar pelo botão (Victor)**

Esperar até 5 min (ciclo do agente, `agent.sh:127`). Em `https://<dominio-de-producao>/app/settings/atualizacao` deve aparecer `1.44.0-cvx.3` com as notas "Nova identidade visual da Convexy…". Victor clica em "Atualizar". Se não aparecer em 10 min: `git tag -l` na VPS e o manifesto `1.44.0-cvx.3` (Task 7 Step 6).

- [ ] **Step 3: Verificar**

```bash
ssh <host-ssh> 'cd /opt/deskcommcrm && git describe --tags --exact-match HEAD; grep -E "^(APP|WORKER|SCHEDULER|VOICE_AGENT)_IMAGE=" .env; curl -s -o /dev/null -w "%{http_code}\n" https://<dominio-de-producao>/; curl -s https://<dominio-de-producao>/api/v1/health | head -c 300; echo; curl -s https://<dominio-de-producao>/login | grep -oiE "<meta name=\"theme-color\"[^>]*>"'
```
Expected: `v1.44.0-cvx.3`; as quatro `*_IMAGE` em `ghcr.io/victorrabyfs/…:1.44.0-cvx.3`; `307`; health com `"version":"1.44.0-cvx.3"`; duas metas `theme-color`, uma com `media="(prefers-color-scheme: light)"` e `content="#F8FAFC"`, outra com `(prefers-color-scheme: dark)` e `content="#0B0D10"`.

- [ ] **Step 4: Conferência em tela, claro e escuro (Victor, ou Claude pelo navegador com aprovação)**

Recarregar sem cache (Cmd+Shift+R). Nos dois temas (controle de tema no topo): `/login` (título em Lexend, texto em Inter, fundo `#F8FAFC`/`#0B0D10`); `/app/settings`; caixa de entrada e uma conversa; um diálogo (título `h2` em Lexend); campos de formulário (borda visível no escuro); a barra lateral com o logo claro (no escuro ele continua com o chip branco até a `-cvx.4`); a agenda (trilhas de pessoa legíveis); no celular, a barra do navegador na cor do fundo. Nada ilegível, nenhum fundo "bege" do original sobrando.

**Se algo estiver errado:** parar e perguntar ao Victor. Rollback (só com a aprovação dele):
```bash
ssh -t <host-ssh> 'cd /opt/deskcommcrm && tmux new -s rollback-cvx3 "bash hostgator-setup-kit/update.sh --to v1.44.0-cvx.2 --force 2>&1 | tee /root/update-$(date +%Y%m%d-%H%M)-rollback-cvx3.log; echo FIM; read"'
```
Se o SSH cair: `ssh -t <host-ssh> 'tmux attach -t rollback-cvx3'`. Depois do rollback o botão **volta a oferecer** a `-cvx.3` (ela não é ancestral do HEAD — `agent.sh:161-164`): **não clicar**; a correção sai como `v1.44.0-cvx.4`.

---

## Cobertura da spec (7.2)

| Requisito | Onde |
|---|---|
| 7.2 arquivos novos (`tema.css`, `lib/convexy/barra-do-navegador.ts`, os dois unitários) | Tasks 1, 4, 1, 2 |
| 7.2 tabela: `layout.tsx` (fontes, import depois do `globals.css`, `themeColor`) | Tasks 3, 1, 4 |
| 7.2 tabela: três specs `/Atkinson/` → `/Inter/` | Task 3 Step 5 |
| 7.2 tabela: `e2e.yml` (spec nova, 7.1) | Task 5 Step 2 |
| 7.2 tabela: `CHANGELOG.md` | Task 6 Step 4 |
| 7.2.1 seletor dobrado, fora de camada, sem `!important`, tabela e sombras | Task 1 (teste de forma, de valores, de sombras); Task 5 (folha publicada, rgb na tela) |
| 7.2.1 aliases acompanham | Task 5 (`bg-popover`, `border-input`) |
| 7.2.2 Inter em `--font-atkinson`, Lexend em `--font-lexend`, `className` | Task 3 |
| 7.2.2 `@layer theme, base, components, utilities;`; `h1–h3` em `@layer base`; `ss01` anulado fora | Tasks 1, 3; Task 5 (sonda `font-mono`, `fontFeatureSettings`) |
| 7.2.3 barra `#F8FAFC`/`#0B0D10`, régua intacta | Task 4; Task 5 (meta); Task 8 (`curl`) |
| 7.2.4 acento derivado e cores fixas aceitas | Task 2; Task 6 (desvios) |
| 7.2.5 `convexy-tema-cobre-os-tokens` (a) e (b) | Task 1 |
| 7.2.5 `convexy-tema-contraste` (pisos, acento, barra = `--color-bg`) | Tasks 2 e 4 |
| 7.2.5 e2e em `/login` e `/app/settings`, fontes pelo primeiro nome, tokens por sonda nos dois temas | Task 5 |
| 7.2.5 rollback e botão que reoferece | Task 6 Step 3; Task 8 Step 4 |
| 7.1 `CONVEXY.md` (trecho, local, motivo, reaplicar; docs que não valem, incl. `docs/white-label.md:80`) | Task 6 |
| 7.1 suítes antes da tag; conferência em tela | Task 7 Step 1; Task 5; Task 8 Step 4 |

## Pronto quando

- `/api/v1/health` responde `1.44.0-cvx.3`, aplicada **pelo botão** (Task 8);
- `curl` de `/login` traz `theme-color` `#F8FAFC` e `#0B0D10` (Task 8 Step 3);
- conferência em tela, claro e escuro, sem regressão visível (Task 8 Step 4);
- `CONVEXY.md` registra cada alteração em arquivo do original e o rollback (Task 6).
