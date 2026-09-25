/**
 * As ORIENTAÇÕES INSTALADAS no menu da Convexy (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 3.4): o único
 * conteúdo exclusivo do hub `/app/crm`, que vira um grupo da porta Contatos.
 * A rota `GET /api/v1/convexy/orientacoes` devolve esta forma; o menu a lê por
 * `components/convexy/menu/useOrientacoes.ts`.
 */
export interface RespostaDasOrientacoes {
  /** O título do guia vem no idioma de quem pediu. */
  readonly orientacoes: ReadonlyArray<{ readonly installation_id: string; readonly titulo: string }>;
  /** Não deu para ler: o menu mostra o aviso e leva a Extensões, como o hub fazia. */
  readonly indisponivel: boolean;
}

/** Cada orientação leva à tela da extensão. */
export function hrefDaOrientacao(installationId: string): string {
  return `/app/extensions/${encodeURIComponent(installationId)}`;
}
