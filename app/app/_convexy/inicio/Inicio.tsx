import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import { TEXTOS, texto } from "@/lib/convexy/textos";
import { tagDeIdioma } from "@/lib/i18n/datas";
import { createClient } from "@/lib/supabase/server";
import { fusoUtilizavel } from "@/lib/tempo/fusos";

import { agendaDeHoje, carregarBloco, conversasEsperando, minhasTarefas, type ResultadoDoBloco } from "./blocos";
import { CartaoDoInicio, type LinhaDoCartao } from "./CartaoDoInicio";
import { limitesDoDia, momentoNoDia } from "./dia";
import { RecarregarAoVoltar } from "./RecarregarAoVoltar";

type Bloco = ResultadoDoBloco<{ total: number; linhas: readonly LinhaDoCartao[] }>;

function comLinhas<T>(
  resultado: ResultadoDoBloco<{ total: number; linhas: readonly T[] }>,
  linha: (item: T) => LinhaDoCartao,
): Bloco {
  return resultado.ok ? { ok: true, dados: { total: resultado.dados.total, linhas: resultado.dados.linhas.map(linha) } } : resultado;
}

/**
 * O INÍCIO, versão simples desta entrega (spec
 * docs/superpowers/specs/2026-09-25-convexy-menu-novo-design.md, 7). Três
 * blocos, cada um só se o destino dele está no que a pessoa vê, carregados em
 * paralelo e com falha isolada. O "hoje" e as horas são os da organização
 * (`fusoUtilizavel` cai no padrão do produto quando o fuso é nulo ou inválido).
 */
export async function Inicio({ user, org, visiveis }: { user: AuthUser; org: ActiveOrg; visiveis: readonly string[] }) {
  const supabase = await createClient();
  const idioma = user.idioma;
  const fuso = fusoUtilizavel(org.timezone);
  const agora = new Date();
  const dia = limitesDoDia(agora, fuso);
  const hora = new Intl.DateTimeFormat(tagDeIdioma(idioma), { timeZone: fuso, hour: "2-digit", minute: "2-digit" });
  const [conversas, agenda, tarefas] = await Promise.all([
    visiveis.includes("/app/inbox")
      ? carregarBloco("conversas", org.orgId, () => conversasEsperando(supabase, org.orgId, user.id, idioma))
      : null,
    visiveis.includes("/app/agenda")
      ? carregarBloco("agenda", org.orgId, () => agendaDeHoje(supabase, org.orgId, dia))
      : null,
    visiveis.includes("/app/tasks")
      ? carregarBloco("tarefas", org.orgId, () => minhasTarefas(supabase, org.orgId, user.id, dia, agora))
      : null,
  ]);
  const falhou = texto(TEXTOS.inicio.falhou, idioma);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{texto(TEXTOS.portas.inicio, idioma)}</h1>
        <p className="text-xs text-text-muted">
          {texto(TEXTOS.inicio.atualizadoAs, idioma)} {hora.format(agora)}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {conversas ? (
          <CartaoDoInicio
            id="inicio-conversas"
            titulo={texto(TEXTOS.inicio.conversas.titulo, idioma)}
            resultado={comLinhas(conversas, (c) => ({
              chave: c.id,
              texto: c.nome,
              detalhe: c.desde ? momentoNoDia(new Date(c.desde), dia, fuso, idioma) : undefined,
              href: `/app/inbox/${c.id}`,
            }))}
            vazio={texto(TEXTOS.inicio.conversas.vazio, idioma)}
            falhou={falhou}
            atalho={{ href: "/app/inbox", rotulo: texto(TEXTOS.inicio.conversas.atalho, idioma) }}
          />
        ) : null}
        {agenda ? (
          <CartaoDoInicio
            id="inicio-agenda"
            titulo={texto(TEXTOS.inicio.agenda.titulo, idioma)}
            resultado={comLinhas(agenda, (a) => ({
              chave: a.id,
              texto: a.titulo,
              detalhe: momentoNoDia(new Date(a.inicio), dia, fuso, idioma),
              href: "/app/agenda",
            }))}
            vazio={texto(TEXTOS.inicio.agenda.vazio, idioma)}
            falhou={falhou}
            atalho={{ href: "/app/agenda", rotulo: texto(TEXTOS.inicio.agenda.atalho, idioma) }}
          />
        ) : null}
        {tarefas ? (
          <CartaoDoInicio
            id="inicio-tarefas"
            titulo={texto(TEXTOS.inicio.tarefas.titulo, idioma)}
            resultado={comLinhas(tarefas, (t) => ({
              chave: t.id,
              texto: t.titulo,
              detalhe: texto(t.atrasada ? TEXTOS.inicio.tarefas.atrasada : TEXTOS.inicio.tarefas.hoje, idioma),
              destaque: t.atrasada,
              href: "/app/tasks",
            }))}
            vazio={texto(TEXTOS.inicio.tarefas.vazio, idioma)}
            falhou={falhou}
            atalho={{ href: "/app/tasks", rotulo: texto(TEXTOS.inicio.tarefas.atalho, idioma) }}
          />
        ) : null}
      </div>
      <RecarregarAoVoltar />
    </div>
  );
}
