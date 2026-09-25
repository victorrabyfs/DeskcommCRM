import Link from "next/link";

import type { ResultadoDoBloco } from "./blocos";

export interface LinhaDoCartao {
  readonly chave: string;
  readonly texto: string;
  readonly detalhe?: string;
  /** Tarefa atrasada: o detalhe sai em cor de erro. */
  readonly destaque?: boolean;
  readonly href: string;
}

/** Um bloco do Início: contador, até 5 linhas, estado vazio, falha isolada e atalho (spec 7). */
export function CartaoDoInicio({
  id,
  titulo,
  resultado,
  vazio,
  falhou,
  atalho,
}: {
  id: string;
  titulo: string;
  resultado: ResultadoDoBloco<{ total: number; linhas: readonly LinhaDoCartao[] }>;
  vazio: string;
  falhou: string;
  atalho: { href: string; rotulo: string };
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={id} className="text-sm font-semibold text-text">
          {titulo}
        </h2>
        {resultado.ok ? (
          <span className="text-2xl font-semibold text-text tabular-nums">{resultado.dados.total}</span>
        ) : null}
      </div>
      {!resultado.ok ? (
        <p role="status" className="text-sm text-text-muted">
          {falhou}
        </p>
      ) : resultado.dados.linhas.length === 0 ? (
        <p className="text-sm text-text-muted">{vazio}</p>
      ) : (
        <ul className="divide-y divide-border">
          {resultado.dados.linhas.map((linha) => (
            <li key={linha.chave}>
              <Link href={linha.href} className="flex items-center justify-between gap-3 py-2 text-sm text-text hover:text-accent">
                <span className="min-w-0 truncate">{linha.texto}</span>
                {linha.detalhe ? (
                  <span className={linha.destaque ? "shrink-0 text-xs font-medium text-error-fg" : "shrink-0 text-xs text-text-muted"}>
                    {linha.detalhe}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={atalho.href} className="mt-auto text-sm font-medium text-accent hover:underline">
        {atalho.rotulo}
      </Link>
    </section>
  );
}
