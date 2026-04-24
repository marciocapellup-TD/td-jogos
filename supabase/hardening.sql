-- TD Jogos — Hardening de segurança
-- ===================================
-- Rodar UMA VEZ no SQL Editor do Supabase. Idempotente (pode rodar várias vezes sem problema).
--
-- Cobre 6 vulnerabilidades identificadas na revisão:
-- V1 (crítico) data_registro forjado → força current_date
-- V3 (crítico) admin edita pontos de post approved → trigger recalcula sempre
-- V4/V5 (alto) admin promove outros / muda grupo → só superadmin
-- V6 (baixo)  email_exceptions leitura pública → só admin lê
-- Audit log   detecção pós-fato de mudanças em posts/profiles

-- =====================================================
-- Bloco 1 — V1: força data_registro = hoje no INSERT
-- =====================================================
create or replace function force_data_registro_hoje()
returns trigger
language plpgsql
as $$
begin
  -- Usa timezone de Brasília em vez de UTC (server roda em UTC).
  -- Se não fizer isso, posts feitos à noite BR caem no dia seguinte.
  NEW.data_registro := (current_timestamp at time zone 'America/Sao_Paulo')::date;
  return NEW;
end;
$$;

drop trigger if exists trg_force_data_registro on posts;
create trigger trg_force_data_registro
  before insert on posts
  for each row execute function force_data_registro_hoje();

-- =====================================================
-- Bloco 2 — V3: recalcula pontos SEMPRE que status=approved
-- (não só na primeira aprovação)
-- =====================================================
create or replace function recalc_pontos_on_approve()
returns trigger
language plpgsql
as $$
begin
  if NEW.status = 'approved' then
    NEW.pontos := calcular_pontos(NEW.categoria, NEW.minutos, NEW.quantidade_frutas, NEW.data_registro);
  else
    NEW.pontos := 0;
  end if;
  return NEW;
end;
$$;
-- Trigger já existe (trg_recalc_pontos em schema.sql); função substituída acima.

-- =====================================================
-- Bloco 3 — V4+V5: só superadmin promove / muda grupo
-- =====================================================
create or replace function proteger_campos_sensiveis_profile()
returns trigger
language plpgsql
as $$
begin
  if NEW.role is distinct from OLD.role and not public.is_superadmin() then
    raise exception 'Apenas superadmin pode alterar o papel (role).';
  end if;
  if NEW.group_id is distinct from OLD.group_id and not public.is_superadmin() then
    raise exception 'Apenas superadmin pode trocar o grupo de um participante.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_proteger_profile on profiles;
create trigger trg_proteger_profile
  before update on profiles
  for each row execute function proteger_campos_sensiveis_profile();

-- =====================================================
-- Bloco 4 — V6: email_exceptions só admin lê
-- =====================================================
drop policy if exists "exc_read_all" on email_exceptions;
drop policy if exists "exc_read_admin" on email_exceptions;
create policy "exc_read_admin" on email_exceptions for select using (public.is_admin());
-- A função email_allowed() é SECURITY DEFINER, consulta sem RLS.
-- Login externo continua funcionando sem problema.

-- =====================================================
-- Bloco 5 — Audit log: detecção pós-fato
-- =====================================================
create table if not exists audit_log (
  id bigserial primary key,
  created_at timestamptz default now(),
  actor_id uuid,
  tabela text,
  operacao text,
  registro_id text,
  antes jsonb,
  depois jsonb
);

alter table audit_log enable row level security;

drop policy if exists "audit_read_superadmin" on audit_log;
create policy "audit_read_superadmin" on audit_log for select using (public.is_superadmin());

-- Log de mudanças em posts (status ou pontos)
-- SECURITY DEFINER: roda com privilégios do owner, bypassa RLS do audit_log
create or replace function log_post_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status is distinct from OLD.status
     or NEW.pontos is distinct from OLD.pontos
  then
    insert into audit_log (actor_id, tabela, operacao, registro_id, antes, depois)
    values (
      auth.uid(),
      'posts',
      'update',
      NEW.id::text,
      jsonb_build_object('status', OLD.status, 'pontos', OLD.pontos, 'motivo_reprovacao', OLD.motivo_reprovacao),
      jsonb_build_object('status', NEW.status, 'pontos', NEW.pontos, 'motivo_reprovacao', NEW.motivo_reprovacao)
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_audit_post_update on posts;
create trigger trg_audit_post_update
  after update on posts
  for each row execute function log_post_update();

-- Log de mudanças em profiles (role ou group_id)
create or replace function log_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.role is distinct from OLD.role
     or NEW.group_id is distinct from OLD.group_id
     or NEW.ativo is distinct from OLD.ativo
  then
    insert into audit_log (actor_id, tabela, operacao, registro_id, antes, depois)
    values (
      auth.uid(),
      'profiles',
      'update',
      NEW.id::text,
      jsonb_build_object('role', OLD.role, 'group_id', OLD.group_id, 'ativo', OLD.ativo),
      jsonb_build_object('role', NEW.role, 'group_id', NEW.group_id, 'ativo', NEW.ativo)
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_audit_profile_update on profiles;
create trigger trg_audit_profile_update
  after update on profiles
  for each row execute function log_profile_update();

-- Log de deleções em posts (admin excluindo)
create or replace function log_post_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (actor_id, tabela, operacao, registro_id, antes, depois)
  values (
    auth.uid(),
    'posts',
    'delete',
    OLD.id::text,
    jsonb_build_object(
      'user_id', OLD.user_id,
      'categoria', OLD.categoria,
      'status', OLD.status,
      'pontos', OLD.pontos,
      'data_registro', OLD.data_registro
    ),
    null
  );
  return OLD;
end;
$$;

drop trigger if exists trg_audit_post_delete on posts;
create trigger trg_audit_post_delete
  after delete on posts
  for each row execute function log_post_delete();
