-- TD Jogos — Migration: campo de comentário (legenda) nos posts
-- ===============================================================
-- Adiciona coluna `comentario` na tabela posts. É um texto livre
-- escrito pelo usuário no momento da postagem (tipo legenda).
-- O comentário sobrevive à ação "Liberar foto" do admin, pois mora
-- na tabela posts e não no Storage.
--
-- Idempotente — pode rodar mais de uma vez.

alter table posts
  add column if not exists comentario text;

-- Limite leve de tamanho pra evitar abuso. 500 chars cabem como legenda
-- de Instagram e ainda é confortável de exibir no card.
alter table posts
  drop constraint if exists chk_comentario_tamanho;
alter table posts
  add constraint chk_comentario_tamanho
  check (comentario is null or char_length(comentario) <= 500);

-- =====================================================
-- Estende audit log pra capturar edição do comentário
-- =====================================================
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
     or NEW.comentario is distinct from OLD.comentario
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
        'motivo_reprovacao', OLD.motivo_reprovacao,
        'comentario', OLD.comentario
      ),
      jsonb_build_object(
        'status', NEW.status,
        'pontos', NEW.pontos,
        'minutos', NEW.minutos,
        'segundos', NEW.segundos,
        'quantidade_frutas', NEW.quantidade_frutas,
        'foto_url', NEW.foto_url,
        'motivo_reprovacao', NEW.motivo_reprovacao,
        'comentario', NEW.comentario
      )
    );
  end if;
  return NEW;
end;
$$;
