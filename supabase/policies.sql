-- TD Jogos — RLS policies
-- Rodar após schema.sql

-- =====================================================
-- Funções auxiliares (bypassam RLS via SECURITY DEFINER)
-- Essenciais pra evitar recursão infinita em policies que referenciam profiles.
-- =====================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('admin','superadmin')
      and ativo = true
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'superadmin'
      and ativo = true
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.is_superadmin() to authenticated, anon;

-- =====================================================
-- profiles
-- =====================================================
alter table profiles enable row level security;

drop policy if exists "profiles_read_all" on profiles;
create policy "profiles_read_all"
  on profiles for select
  using (true);

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self"
  on profiles for update
  using (auth.uid() = id);

drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all"
  on profiles for all
  using (public.is_admin());

-- =====================================================
-- groups (leitura pública, escrita só superadmin)
-- =====================================================
alter table groups enable row level security;

drop policy if exists "groups_read_all" on groups;
create policy "groups_read_all" on groups for select using (true);

drop policy if exists "groups_admin_update" on groups;
create policy "groups_admin_update" on groups for update using (public.is_admin());

-- =====================================================
-- email_exceptions (leitura pública pra validar login; escrita só admin)
-- =====================================================
alter table email_exceptions enable row level security;

drop policy if exists "exc_read_all" on email_exceptions;
create policy "exc_read_all" on email_exceptions for select using (true);

drop policy if exists "exc_admin_all" on email_exceptions;
create policy "exc_admin_all" on email_exceptions for all using (public.is_admin());

-- =====================================================
-- challenge_config (leitura pública)
-- =====================================================
alter table challenge_config enable row level security;

drop policy if exists "challenge_read_all" on challenge_config;
create policy "challenge_read_all" on challenge_config for select using (true);

-- =====================================================
-- pending_claims (admin lê/escreve; fluxo de claim é via função SECURITY DEFINER)
-- =====================================================
alter table pending_claims enable row level security;

drop policy if exists "pending_admin_all" on pending_claims;
create policy "pending_admin_all"
  on pending_claims for all
  using (public.is_admin());

-- =====================================================
-- posts
-- =====================================================
alter table posts enable row level security;

drop policy if exists "posts_read" on posts;
create policy "posts_read"
  on posts for select
  using (
    status = 'approved'
    or user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "posts_insert_own" on posts;
create policy "posts_insert_own"
  on posts for insert
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "posts_admin_update" on posts;
create policy "posts_admin_update"
  on posts for update
  using (public.is_admin());

drop policy if exists "posts_admin_delete" on posts;
create policy "posts_admin_delete"
  on posts for delete
  using (public.is_admin());

-- =====================================================
-- Storage bucket `postagens`
-- =====================================================
-- Criar bucket `postagens` como PÚBLICO (read) e as policies de escrita abaixo.
-- Rodar depois de criar o bucket no Dashboard.

drop policy if exists "postagens_upload_own" on storage.objects;
create policy "postagens_upload_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'postagens'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "postagens_delete_admin" on storage.objects;
create policy "postagens_delete_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'postagens'
    and public.is_admin()
  );
