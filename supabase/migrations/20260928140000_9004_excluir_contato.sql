-- Convexy (fork victorrabyfs/DeskcommCRM) — migration 9004: excluir contato inteiro, ou nada.
-- Registro: CONVEXY.md, "Excluir contato".
--
-- O MESMO SQL está no apêndice de supabase/baseline.sql, no bloco
-- "excluir contato (migration 9004)", no FIM do apêndice: ele redefine
-- `fn_followup_generation_write` (bloco "follow-up: a geração é do sistema" do
-- original) e a definição que vale é a última do arquivo.
-- tests/invariants/convexy-excluir-contato.test.ts compara os dois e cobra que
-- esta continue sendo a última definição.
--
-- Defeito do original (1.59 e main): apagar um contato que já passou por retorno
-- automático falhava com 42501 (a guarda do follow-up recusava a cascata), DEPOIS
-- de a rota já ter apagado mensagens e conversas em comandos separados.

-- A remoção em cascata não é escrita de quem está logado sobre o follow-up.
-- A guarda abaixo existe para que ninguém forje ou apague, pela API, um turno ou
-- uma etapa interna do follow-up. Quando a linha sai porque o CONTATO foi apagado,
-- quem a apaga é a chave estrangeira (on delete cascade), de dentro do gatilho
-- dela: pg_trigger_depth() > 1. Sem esta exceção, todo contato que já passou por
-- um retorno automático ficava impossível de apagar pela tela.
create or replace function public.fn_followup_generation_write()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='DELETE' and pg_trigger_depth() > 1 then return old; end if;
 if tg_table_name='job_queue' then
  if auth.uid() is not null and ((tg_op<>'DELETE' and new.kind='followup_turn') or (tg_op<>'INSERT' and old.kind='followup_turn')) then
   raise exception 'followup_job_internal' using errcode='42501';
  end if;
  if tg_op='UPDATE' and old.kind='followup_turn' then
   if new.organization_id<>old.organization_id or new.contact_id is distinct from old.contact_id or new.kind<>old.kind
    or new.payload->'followup_enrollment_id' is distinct from old.payload->'followup_enrollment_id'
    or new.payload->'node_id' is distinct from old.payload->'node_id'
    or new.payload->'source_step_key' is distinct from old.payload->'source_step_key'
   then raise exception 'followup_job_origin_immutable' using errcode='42501'; end if;
  end if;
 elsif auth.uid() is not null and ((tg_op<>'DELETE' and new.idempotency_key ~ ':[0-9]+$') or (tg_op<>'INSERT' and old.idempotency_key ~ ':[0-9]+$')) then
  raise exception 'followup_step_internal' using errcode='42501';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
revoke all on function public.fn_followup_generation_write() from public,anon,authenticated;

-- A exclusão do contato numa transação só: histórico (mensagens e conversas,
-- on delete restrict no contato) e a ficha saem juntos, ou nada sai. Antes, a
-- rota apagava o histórico em comandos separados e, se a ficha falhasse, o
-- histórico já tinha ido embora. `security invoker`: vale a RLS de quem chama,
-- a mesma de quando a rota apagava tabela por tabela.
create or replace function public.fn_excluir_contato(p_organization_id uuid, p_contact_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  delete from public.messages where contact_id = p_contact_id and organization_id = p_organization_id;
  delete from public.conversations where contact_id = p_contact_id and organization_id = p_organization_id;
  delete from public.contacts where id = p_contact_id and organization_id = p_organization_id
    returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.fn_excluir_contato(uuid, uuid) from public, anon;
grant execute on function public.fn_excluir_contato(uuid, uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
