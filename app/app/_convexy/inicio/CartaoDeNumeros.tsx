import Link from "next/link";

import type { ResultadoDoBloco } from "./blocos";

export interface NumeroDoCartao {
  readonly chave: string;
  readonly rotulo: string;
  readonly valor: number;
}

/**
 * O bloco de números do painel do Início (29/09): os números do mês lado a lado,
 * com a mesma falha isolada e o mesmo atalho dos outros blocos. CONVEXY.md,
 * "Menu da clínica".
 */
export function CartaoDeNumeros({
  id,
  titulo,
  resultado,
  falhou,
  atalho,
}: {
  id: string;
  titulo: string;
  resultado: ResultadoDoBloco<readonly NumeroDoCartao[]>;
  falhou: string;
  atalho: { href: string; rotulo: string };
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:col-span-2 xl:col-span-3"
    >
      <h2 id={id} className="text-sm font-semibold text-text">
        {titulo}
      </h2>
      {!resultado.ok ? (
        <p role="status" className="text-sm text-text-muted">
          {falhou}
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {resultado.dados.map((numero) => (
            <div key={numero.chave} className="rounded-md bg-surface-elevated px-3 py-2">
              <dt className="text-xs text-text-muted">{numero.rotulo}</dt>
              <dd className="text-2xl font-semibold text-text tabular-nums">{numero.valor}</dd>
            </div>
          ))}
        </dl>
      )}
      <Link href={atalho.href} className="text-sm font-medium text-accent hover:underline">
        {atalho.rotulo}
      </Link>
    </section>
  );
}
