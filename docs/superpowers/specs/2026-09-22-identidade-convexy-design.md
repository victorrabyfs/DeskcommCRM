# Identidade Convexy no fork do DeskcommCRM — design

- **Data:** 2026-09-22
- **Status:** aguardando revisão
- **Repositório:** `victorrabyfs/DeskcommCRM` (fork de `melgarafael/DeskcommCRM`)
- **Base:** release `v1.42.0` do original (a versão em produção em `https://<dominio-de-producao>`)

## 1. Objetivo

Fazer a plataforma inteira aparecer como **Convexy**, com a mesma identidade visual do CRM
atual da Convexy (`<frontend-atual>` na VPS): nome, cores, fontes, logos claro e
escuro e ícones. A identidade é **uma só, para todas as clínicas e organizações**.

A restrição que governa todo o desenho: **continuar recebendo as atualizações do original sem
perder a identidade**. Por isso, preferência absoluta por configuração e por arquivos novos da
Convexy; alteração em arquivo do original só quando não há outro caminho, pequena e registrada.

## 2. Decisões já tomadas

| Decisão | Escolha |
|---|---|
| Onde vive o código próprio | Fork `victorrabyfs/DeskcommCRM`, com o original como remoto `upstream` |
| Contribuir de volta ao original | **Não** — a função de logo claro/escuro fica só no fork |
| Marca por clínica | **Desligada** — identidade única da Convexy para todos |
| Domínio próprio por clínica | Fora de escopo (a plataforma é só SaaS em `<dominio-de-producao>`) |
| Logo claro/escuro | SVGs oficiais embutidos no código, não enviados pela tela |

## 3. Fora de escopo

- Funções de SaaS (teste de 7/14/30 dias, planos, cobrança) — spec própria.
- Instagram direto pela Meta — spec própria.
- Marca por plano (Enterprise personalizar) — a chave da seção 6.5 deixa o caminho aberto, mas
  nada disso é construído agora.
- Logo dentro dos e-mails de acesso: os e-mails recebem nome e cor (seção 6.1); imagem no corpo
  do e-mail fica para depois.
- A página interna de design system (`app/design/`), que tem as próprias referências de fonte.

## 4. Identidade de origem (medida no CRM atual)

**Fontes:** Inter (texto) e Lexend Deca (títulos e números de destaque), ambas do Google Fonts.

**Cores** (`src/index.css` e `tailwind.config.js` do CRM atual):

| Papel | Claro | Escuro |
|---|---|---|
| Ação / marca | `#146BFF` (hover `#0754F8`) | mesma |
| Acento secundário | `#12D6E8` | mesma |
| Fundo da página | `#F8FAFC` | `#0B0D10` |
| Barra lateral | `#FFFFFF` | `#0B0D10` |
| Cartão / superfície | `#FFFFFF` | `#131923` |
| Popover | `#FFFFFF` | `#171E2A` |
| Campo de formulário | `#FFFFFF` | `#111720` |
| Texto principal | `#0B0D10` | `#FFFFFF` |

**Arquivos de marca** (`public/branding/` do CRM atual): `logo-light-v3.svg`,
`logo-dark-v3.svg`, `icon-v2.svg`, `icon-white-v2.svg`, `logo-email.png`.

## 5. Como o DeskcommCRM monta a marca hoje (v1.42.0)

- **Nome e cor** vêm do banco (`platform_branding`, tela `/admin/marca`), com o `.env`
  (`APP_NAME`, `APP_ACCENT_HEX`) como semente. A cor gera sozinha a escala `--color-accent-*`
  nos dois temas (`lib/branding/css.ts`).
- **Tokens neutros** (fundo, superfície, texto, borda) são fixos em `app/globals.css`, blocos
  `[data-theme="light"]` e `[data-theme="dark"]`, com paleta bege quente.
- **Fontes** são carregadas por `next/font/google` em `app/layout.tsx` (Atkinson Hyperlegible
  + IBM Plex Mono) e expostas como `--font-atkinson` / `--font-mono`; `app/globals.css` usa
  `--font-atkinson` em `--font-sans` e no `font-family` do `body`.
- **Logo**: um único logo (upload PNG/JPG ou `APP_LOGO_URL`). Aparece em
  `components/shell/Sidebar.tsx` e em `app/(public)/layout.tsx`. SVG é recusado no upload por
  segurança. No tema escuro o logo enviado ganha uma moldura clara.
- **Ícone e manifest**: `app/icon.tsx` (gerado) e `app/manifest.ts`.
- **Marca por organização**: lida de `organizations.settings.branding` por
  `marcaDaOrganizacaoDeSettings()` em `lib/branding/organizacao.ts`. Esse é o ponto único
  consumido por `app/app/layout.tsx`, `app/app/settings/marca/page.tsx`,
  `app/api/v1/marca/logo/route.ts` e `lib/branding/saida.ts` (e-mails de convite e LGPD).
  O menu aponta para a página em `lib/navigation/catalogo.ts`.

## 6. Design

### 6.1 Configuração (sem código)

- Em `/admin/marca`: nome **Convexy**, cor **`#146BFF`**. A escala de acento sai do próprio
  sistema.
- No `.env` da VPS: `APP_NAME=Convexy`, `APP_ACCENT_HEX=#146bff` (semente e piso de rollback,
  conforme `docs/white-label.md`), depois `bash hostgator-setup-kit/marca-emails.sh` para os
  e-mails de acesso saírem com nome e cor da Convexy.
- `SUPPORT_EMAIL` com o e-mail de suporte da Convexy.

### 6.2 Camada Convexy (arquivos novos)

Tudo que é da Convexy mora em lugares que o original não conhece, para nunca conflitar:

```
app/convexy/tema.css          paleta neutra + fontes da Convexy (claro e escuro)
components/convexy/LogoConvexy.tsx   logo e ícone com troca por tema
public/convexy/               logo-light.svg, logo-dark.svg, icon.svg, icon-white.svg
CONVEXY.md                    registro de toda alteração em arquivo do original
```

**`app/convexy/tema.css`** sobrepõe os tokens de `app/globals.css` com a paleta da seção 4,
nos seletores `[data-theme="light"]` e `[data-theme="dark"]`: `--color-bg`,
`--color-surface`, `--color-surface-elevated`, `--color-text*`, `--color-border*`,
`--color-overlay` e a escala `--color-neutral-*` (trocando o bege quente por cinza-azulado
frio, derivado da tinta `#0B0D10` e do fundo `#F8FAFC`). **Não** mexe em `--color-accent-*`
(vem da cor configurada) nem nas cores semânticas de sucesso/aviso/erro, exceto se o contraste
com o fundo novo reprovar — nesse caso o ajuste entra no mesmo arquivo. Também redefine
`--font-sans` e o `font-family` do `body` para Inter, e aplica Lexend Deca em títulos
(`h1`–`h3`) e números de destaque. É importado **depois** de `globals.css`, então vence por
ordem de cascata, sem `!important`.

**`LogoConvexy`** renderiza o logo claro e o escuro (e, recolhido, o ícone claro e o branco),
escondendo o que não é do tema atual via CSS `[data-theme]` — sem JavaScript de detecção, sem
piscar na troca de tema e sem divergência entre servidor e cliente (o erro React #418 que
`Sidebar.tsx` documenta).

### 6.3 Alterações pontuais em arquivos do original

Cada uma entra em `CONVEXY.md` com o motivo e o trecho, para ser reconferida a cada
atualização.

| Arquivo | Alteração |
|---|---|
| `app/layout.tsx` | Carregar Inter e Lexend Deca por `next/font/google` (variáveis `--font-inter`, `--font-lexend`) no lugar de Atkinson; mantém IBM Plex Mono. Importar `app/convexy/tema.css` depois de `globals.css`. |
| `components/shell/Sidebar.tsx` | O bloco que desenha o logo passa a usar `LogoConvexy`. |
| `app/(public)/layout.tsx` | Idem, no logo da fachada (login, cadastro, recuperação de senha). |
| `app/icon.tsx` / `app/manifest.ts` | Ícone da Convexy (`public/convexy/icon.svg`) no favicon e no ícone do app. |
| `lib/branding/organizacao.ts` | `marcaDaOrganizacaoDeSettings()` devolve `null` quando a marca por organização está desligada (seção 6.5). |
| `lib/navigation/catalogo.ts` | Item "Marca" das configurações da organização escondido quando desligada. |
| `app/app/settings/marca/page.tsx` | `notFound()` quando desligada. |
| `lib/env.ts` | Declarar `MARCA_POR_ORGANIZACAO` (`on`/`off`, padrão `on`). |
| `hostgator-setup-kit/_common.sh` | `IMG_NS="ghcr.io/victorrabyfs"` (seção 7). |
| `docker-compose.prod.yml` / `.env.hostgator.example` | Imagens padrão de `app`, `worker` e `scheduler` apontando para `ghcr.io/victorrabyfs` — a lista que o comentário de `IMG_NS` manda um fork trocar junto. |

O objetivo é manter essa tabela curta: se durante a implementação surgir outro arquivo do
original, ele entra aqui e no `CONVEXY.md`, com justificativa.

### 6.4 Por que os SVGs podem entrar sem passar pela recusa de upload

A recusa de SVG existe porque arquivo enviado por terceiros pode carregar script num bucket
público. Os SVGs da Convexy são arquivos do repositório, revisados em PR e servidos como
estáticos de `public/` por `<img>`, o que não executa script. Antes de copiar, cada SVG é
conferido para não conter `<script>`, `on*=` nem referências externas.

### 6.5 Chave da marca por organização

Variável `MARCA_POR_ORGANIZACAO` no `.env`, declarada em `lib/env.ts` com padrão `on` (o
comportamento do original). Na Convexy, `off`. Com `off`:

- `marcaDaOrganizacaoDeSettings()` devolve `null`, então **todo** consumidor (layout, logo,
  e-mails de convite e LGPD) cai na marca da instalação. Marcas já gravadas por alguma
  organização ficam no banco, ignoradas, e voltam se a chave for religada.
- O item de menu some e a página `/app/settings/marca` responde 404.
- `/admin/marca` (marca da instalação, só admin da plataforma) continua funcionando.

A chave é o gancho para, no futuro, liberar a marca por plano sem refazer nada.

## 7. Infraestrutura do fork

1. **`main` do fork = v1.42.0 do original.** O `main` atual do fork é uma cópia antiga sem
   commits próprios; ele é alinhado com a tag `v1.42.0` e a Camada Convexy entra por PR.
2. **Remoto `upstream` sem tags automáticas** (`git config remote.upstream.tagOpt --no-tags`).
   Tags do original **nunca** são enviadas ao fork: uma `v1.43.0` do original no fork seria
   oferecida pelo botão "Atualizar" da VPS no lugar da versão Convexy.
3. **Numeração das versões Convexy:** `vX.Y.Z-cvx.N`, onde `X.Y.Z` é a versão do original em
   que ela se baseia (primeira: `v1.42.0-cvx.1`). É semver válido, então o
   `publish-image.yml` publica `ghcr.io/victorrabyfs/deskcommcrm:1.42.0-cvx.1`, e o agente de
   atualização (`git tag -l 'v*' --sort=-v:refname`) a ordena acima de `v1.42.0`. **O plano
   de implementação ensaia essa ordenação e o fluxo do `update.sh` antes de publicar**, porque
   o `install.sh` e partes da doutrina descartam tags com hífen — se o ensaio mostrar um
   bloqueio, a numeração muda antes de qualquer VPS depender dela.
4. **Imagens:** `IMG_NS` passa a `ghcr.io/victorrabyfs`; o CI do fork publica
   `deskcommcrm`, `deskcomm-worker` e `deskcomm-scheduler`. Pacotes novos no GHCR nascem
   privados: ficam **públicos**, ou a VPS faz `docker login` no GHCR.
5. **VPS:** `/opt/deskcommcrm` troca o `origin` para o fork, remove as tags do original que
   não sejam a base, e passa a atualizar pelo `update.sh`/botão como hoje.
6. **Agente de atualização pela tela:** continua ligado; agora ele só enxerga versões Convexy.

## 8. Como trazer uma atualização do original

1. `git fetch upstream tag vA.B.C --no-tags`
2. Branch a partir do `main` do fork, `git merge vA.B.C`.
3. Conflitos: só podem aparecer nos arquivos da tabela 6.3. Resolver com o `CONVEXY.md` à mão.
4. CI verde + conferência em tela (claro e escuro).
5. Merge no `main`, tag `vA.B.C-cvx.1`, CI publica, botão "Atualizar" aparece na VPS.

Automatizar os passos 1–2 (abrir PR sozinho quando sair versão nova) fica para depois de o
fluxo manual rodar pelo menos uma vez.

## 9. Verificação

- **Testes do projeto** (`pnpm typecheck`, `pnpm lint`, `pnpm test:unit`) verdes no fork.
  Testes do original que afirmam a marca ou a fonte padrão (ex.: `tests/e2e/marca-logo.spec.ts`)
  e que reprovarem por causa da Camada Convexy são ajustados e listados no `CONVEXY.md` —
  nunca desligados em silêncio.
- **Teste novo** para a chave da seção 6.5: com `off`, `marcaDaOrganizacaoDeSettings()` devolve
  `null` mesmo com marca gravada; com `on`, comportamento original.
- **Conferência em tela**, lado a lado com o CRM atual da Convexy, nos temas claro e escuro:
  login, menu aberto e recolhido, uma página de lista, um formulário, um modal. Contraste de
  texto sobre o fundo novo no mínimo AA.
- **Ensaio de atualização**: merge de uma versão mais nova do original numa branch descartável
  para medir quantos arquivos conflitam (esperado: só os da tabela 6.3, ou nenhum).
- **Ensaio de versão** da seção 7.3 antes da primeira publicação.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| O original reescreve `Sidebar.tsx` ou `app/(public)/layout.tsx` com frequência | Alteração mínima (troca de um bloco por `<LogoConvexy/>`); o `CONVEXY.md` diz o que reaplicar |
| O original muda nomes de tokens em `globals.css` | `tema.css` deixa de sobrepor em silêncio; a conferência em tela da atualização pega |
| Numeração `-cvx.N` recusada por algum ponto do kit | Ensaio obrigatório antes de publicar (7.3) |
| GHCR privado bloqueia o `docker pull` da VPS | Pacotes públicos ou `docker login` (7.4) |
| Botão "Atualizar" oferecer versão do original | Tags do original nunca vão para o fork (7.2) |
