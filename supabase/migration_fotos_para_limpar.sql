-- TD Jogos — RPC de decisão de limpeza do Storage (bucket `postagens`).
-- Idempotente. SECURITY DEFINER (dona postgres) pra enxergar storage.objects.
--
-- Decide QUAIS objetos do bucket apagar, cruzando storage.objects com posts:
--   - órfão  : objeto sem post de foto viva apontando pra ele (qualquer idade)
--   - tempo  : post approved com foto viva e mais velho que p_retencao (4h)
--   - teto   : se, após órfão+tempo, o bucket ainda passar de p_target_bytes,
--              evicta approved recentes (<=4h) OLDEST-FIRST até ficar abaixo
-- Protege: pending (revisão) e rejected com foto viva (não entram em nenhum ramo).
-- Retorna (path, post_id, motivo, size_bytes). post_id null = órfão (só apagar do Storage).

-- Pré-requisito: a edge function marca foto_liberada=true E foto_url=null ao limpar.
-- A coluna era NOT NULL (o update nulo falhava silenciosamente porque o cron nunca
-- rodava — 401). Como o design sempre assumiu foto_url anulável (PostCard trata null),
-- tornamos nullable. Insert do Postar continua enviando foto_url normalmente.
alter table posts alter column foto_url drop not null;

create or replace function public.fotos_para_limpar(
  p_target_bytes bigint default 524288000,  -- 500 MB
  p_retencao     interval default '4 hours'
)
returns table(path text, post_id uuid, motivo text, size_bytes bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total     bigint;
  v_freed     bigint;
  v_remaining bigint;
begin
  -- Classifica cada objeto do bucket (path = name) contra os posts de foto viva.
  create temp table _cls on commit drop as
  select o.name                                   as path,
         coalesce((o.metadata->>'size')::bigint,0) as size_bytes,
         l.post_id, l.status, l.post_created
  from storage.objects o
  left join (
    select split_part(p.foto_url, '/postagens/', 2) as path,
           p.id          as post_id,
           p.status::text as status,
           p.created_at  as post_created
    from posts p
    where p.foto_liberada = false
      and p.foto_url like 'https://%/postagens/%'
  ) l on l.path = o.name
  where o.bucket_id = 'postagens';

  select coalesce(sum(c.size_bytes), 0) into v_total from _cls c;

  -- Espaço liberado por órfão + tempo.
  select coalesce(sum(c.size_bytes), 0) into v_freed
  from _cls c
  where c.post_id is null
     or (c.status = 'approved' and c.post_created < now() - p_retencao);

  v_remaining := v_total - v_freed;

  return query
  -- órfão + tempo
  select c.path,
         c.post_id,
         case when c.post_id is null then 'orfao' else 'tempo' end,
         c.size_bytes
  from _cls c
  where c.post_id is null
     or (c.status = 'approved' and c.post_created < now() - p_retencao)
  union all
  -- teto: só se ainda passar do alvo; evicta approved recentes oldest-first
  select e.path, e.post_id, 'teto', e.size_bytes
  from (
    select c.path, c.post_id, c.size_bytes,
           v_remaining - coalesce(sum(c.size_bytes) over (
             order by c.post_created asc, c.path
             rows between unbounded preceding and 1 preceding), 0) as antes
    from _cls c
    where c.status = 'approved' and c.post_created >= now() - p_retencao
  ) e
  where v_remaining > p_target_bytes and e.antes > p_target_bytes;
end;
$$;

revoke all on function public.fotos_para_limpar(bigint, interval) from public, anon, authenticated;
grant execute on function public.fotos_para_limpar(bigint, interval) to service_role;
