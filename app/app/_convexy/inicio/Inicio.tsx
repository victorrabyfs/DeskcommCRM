import type { ActiveOrg, AuthUser } from "@/lib/auth/types";
import { nichoDaOrganizacao } from "@/lib/convexy/nicho-da-organizacao";
import { ROTULO_DO_FUNIL, ROTULO_DOS_CONTATOS_NOVOS, TEXTOS, rotuloPorNicho, texto } from "@/lib/convexy/textos";
import { tagDeIdioma } from "@/lib/i18n/datas";
import { createClient } from "@/lib/supabase/server";
import { fusoUtilizavel } from "@/lib/tempo/fusos";

import {
  agendaDeHoje,
  carregarBloco,
  conversasEsperando,
  funilDoCrm,
  minhasTarefas,
  numerosDoMes,
  type ResultadoDoBloco,
} from "./blocos";
import { CartaoDeNumeros, type NumeroDoCartao } from "./CartaoDeNumeros";
import { CartaoDoInicio, type LinhaDoCartao } from "./CartaoDoInicio";
import { limitesDoDia, limitesDoMes, momentoNoDia } from "./dia";
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
  // Painel (29/09): números do mês e funil, antes dos blocos do dia. CONVEXY.md, "Menu da clínica".
  const mes = limitesDoMes(agora, fuso);
  const [nicho, numeros, funil, conversas, agenda, tarefas] = await Promise.all([
    nichoDaOrganizacao(org.orgId),
    visiveis.includes("/app/metrics") ? carregarBloco("mes", org.orgId, () => numerosDoMes(supabase, org.orgId, mes)) : null,
    visiveis.includes("/app/kanban") ? carregarBloco("funil", org.orgId, () => funilDoCrm(supabase, org.orgId)) : null,
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
  const m = TEXTOS.inicio.mes;
  const numerosDoCartao: ResultadoDoBloco<readonly NumeroDoCartao[]> | null = numeros
    ? numeros.ok
      ? {
          ok: true,
          dados: [
            { chave: "conversas", rotulo: texto(m.conversas, idioma), valor: numeros.dados.conversas },
            { chave: "contatos", rotulo: rotuloPorNicho(ROTULO_DOS_CONTATOS_NOVOS, nicho, idioma), valor: numeros.dados.contatos },
            { chave: "agendamentos", rotulo: texto(m.agendamentos, idioma), valor: numeros.dados.agendamentos },
            { chave: "compareceram", rotulo: texto(m.compareceram, idioma), valor: numeros.dados.compareceram },
            { chave: "faltaram", rotulo: texto(m.faltaram, idioma), valor: numeros.dados.faltaram },
          ],
        }
      : numeros
    : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{texto(TEXTOS.portas.inicio, idioma)}</h1>
        <p className="text-xs text-text-muted">
          {texto(TEXTOS.inicio.atualizadoAs, idioma)} {hora.format(agora)}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {numerosDoCartao ? (
          <CartaoDeNumeros
            id="inicio-mes"
            titulo={texto(m.titulo, idioma)}
            resultado={numerosDoCartao}
            falhou={falhou}
            atalho={{ href: "/app/metrics", rotulo: texto(m.atalho, idioma) }}
          />
        ) : null}
        {funil ? (
          <CartaoDoInicio
            id="inicio-funil"
            titulo={funil.ok && funil.dados.nome ? funil.dados.nome : rotuloPorNicho(ROTULO_DO_FUNIL, nicho, idioma)}
            resultado={comLinhas(funil, (e) => ({
              chave: e.id,
              texto: e.nome,
              detalhe: String(e.abertos),
              href: "/app/kanban",
            }))}
            vazio={texto(TEXTOS.inicio.funil.vazio, idioma)}
            falhou={falhou}
            atalho={{ href: "/app/kanban", rotulo: texto(TEXTOS.inicio.funil.atalho, idioma) }}
          />
        ) : null}
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
