-- TD Jogos — RLS policies
-- Rodar após schema.sql

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
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));

-- =====================================================
-- groups (leitura pública, escrita só superadmin)
-- =====================================================
alter table groups enable row level security;

drop policy if exists "groups_read_all" on groups;
create policy "groups_read_all" on groups for select using (true);

-- =====================================================
-- challenge_config (leitura pública)
-- =====================================================
alter table challenge_config enable row level security;

drop policy if exists "challenge_read_all" on challenge_config;
create policy "challenge_read_all" on challenge_config for select using (true);

-- =====================================================
-- pending_claims (leitura só pelo próprio fluxo de claim; admin lê/escreve)
-- =====================================================
alter table pending_claims enable row level security;

drop policy if exists "pending_admin_all" on pending_claims;
create policy "pending_admin_all"
  on pending_claims for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));

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
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin'))
  );

drop policy if exists "posts_insert_own" on posts;
create policy "posts_insert_own"
  on posts for insert
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "posts_admin_update" on posts;
create policy "posts_admin_update"
  on posts for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));

drop policy if exists "posts_admin_delete" on posts;
create policy "posts_admin_delete"
  on posts for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));

-- =====================================================
-- Storage bucket `postagens`
-- =====================================================
-- Criar bucket `postagens` como PÚBLICO (read) e as policies de escrita abaixo.
-- Rodar depois de criar o bucket no Dashboard.

-- upload: usuário autenticado só na pasta do próprio id
drop policy if exists "postagens_upload_own" on storage.objects;
create policy "postagens_upload_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'postagens'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- delete: só admin
drop policy if exists "postagens_delete_admin" on storage.objects;
create policy "postagens_delete_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'postagens'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','superadmin'))
  );
