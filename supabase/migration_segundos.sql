-- Migracao: adicionar coluna segundos em posts + atualizar calcular_pontos
-- Rodar no Supabase SQL Editor. Idempotente — pode rodar mais de uma vez sem problema.

-- 1. Adicionar coluna segundos (default 0 mantem posts antigos validos)
alter table posts
  add column if not exists segundos smallint not null default 0
  check (segundos >= 0 and segundos < 60);

-- 2. Atualizar funcao de pontuacao para comparar total em segundos
create or replace function calcular_pontos(
  p_categoria text,
  p_minutos int,
  p_qtd int,
  p_data date,
  p_segundos int default 0
) returns smallint
language plpgsql
as $$
declare
  v_inicio date;
  v_fim date;
  v_semana int;
  v_meta_mov int;
  v_meta_men int;
  v_total_seg int;
begin
  v_inicio := (select data_inicio from challenge_config where id = 1);
  v_fim    := (select data_fim    from challenge_config where id = 1);

  if p_data < v_inicio or p_data > v_fim then
    return 0;
  end if;

  if p_categoria = 'energia' then
    return coalesce(p_qtd, 0);
  end if;

  v_semana := ((p_data - v_inicio) / 7) + 1;

  v_meta_mov := case v_semana when 1 then 20 when 2 then 25 when 3 then 30 else 9999 end;
  v_meta_men := case v_semana when 1 then 3  when 2 then 4  when 3 then 5  else 9999 end;

  v_total_seg := coalesce(p_minutos, 0) * 60 + coalesce(p_segundos, 0);

  if p_categoria = 'movimento' and v_total_seg >= v_meta_mov * 60 then
    return 3;
  end if;
  if p_categoria = 'mental' and v_total_seg >= v_meta_men * 60 then
    return 2;
  end if;

  return 0;
end;
$$;

-- 3. Atualizar trigger de recalculo para passar segundos
create or replace function recalc_pontos_on_approve()
returns trigger
language plpgsql
as $$
begin
  if NEW.status = 'approved' and (OLD.status is distinct from 'approved') then
    NEW.pontos := calcular_pontos(
      NEW.categoria,
      NEW.minutos,
      NEW.quantidade_frutas,
      NEW.data_registro,
      NEW.segundos
    );
  end if;
  if NEW.status <> 'approved' then
    NEW.pontos := 0;
  end if;
  return NEW;
end;
$$;
