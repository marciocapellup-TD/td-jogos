-- TD Jogos — Hardening: feature de Editar Post
-- ===============================================
-- Habilita usuário a editar próprio post + admin editar qualquer post,
-- com proteção contra mudança de campos imutáveis (categoria, data,
-- autor, status). Estende audit log pra capturar edição de conteúdo.
--
-- Idempotente — pode rodar mais de uma vez.

-- =====================================================
-- 1. Policy: usuário pode UPDATE seu próprio post
-- =====================================================
drop policy if exists "posts_update_own" on posts;
create policy "posts_update_own"
  on posts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A policy "posts_admin_update" já existe (admin edita qualquer post).

-- =====================================================
-- 2. Trigger: protege campos imutáveis em qualquer UPDATE
-- =====================================================
create or replace function proteger_campos_imutaveis_posts()
returns trigger
language plpgsql
as $$
begin
  -- user_id nunca muda (impede sequestro)
  if NEW.user_id is distinct from OLD.user_id then
    raise exception 'Não é permitido alterar o autor do post.';
  end if;

  -- categoria nunca muda (vira post diferente)
  if NEW.categoria is distinct from OLD.categoria then
    raise exception 'Não é permitido alterar a categoria do post.';
  end if;

  -- data_registro nunca muda (impede backfill via edição)
  if NEW.data_registro is distinct from OLD.data_registro then
    raise exception 'Não é permitido alterar a data do post.';
  end if;

  -- status: só admin muda (mantém fluxo aprovar/reprovar/excluir)
  if NEW.status is distinct from OLD.status and not public.is_admin() then
    raise exception 'Apenas admin pode alterar o status do post.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_proteger_campos_posts on posts;
create trigger trg_proteger_campos_posts
  before update on posts
  for each row execute function proteger_campos_imutaveis_posts();

-- =====================================================
-- 3. Estender audit log pra capturar edição de conteúdo
-- =====================================================
-- Antes registrava só status + pontos. Agora registra minutos,
-- segundos, quantidade_frutas e foto_url também.
create or replace function log_post_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status is distinct from OLD.status
     or NEW.pontos is distinct from OLD.pontos
     or NEW.minutos is distinct from OLD.minutos
     or NEW.segundos is distinct from OLD.segundos
     or NEW.quantidade_frutas is distinct from OLD.quantidade_frutas
     or NEW.foto_url is distinct from OLD.foto_url
  then
    insert into audit_log (actor_id, tabela, operacao, registro_id, antes, depois)
    values (
      auth.uid(),
      'posts',
      'update',
      NEW.id::text,
      jsonb_build_object(
        'status', OLD.status,
        'pontos', OLD.pontos,
        'minutos', OLD.minutos,
        'segundos', OLD.segundos,
        'quantidade_frutas', OLD.quantidade_frutas,
        'foto_url', OLD.foto_url,
        'motivo_reprovacao', OLD.motivo_reprovacao
      ),
      jsonb_build_object(
        'status', NEW.status,
        'pontos', NEW.pontos,
        'minutos', NEW.minutos,
        'segundos', NEW.segundos,
        'quantidade_frutas', NEW.quantidade_frutas,
        'foto_url', NEW.foto_url,
        'motivo_reprovacao', NEW.motivo_reprovacao
      )
    );
  end if;
  return NEW;
end;
$$;
