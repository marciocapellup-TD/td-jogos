-- TD Jogos — Transparência (26/06/2026)
-- Função agregada (security definer) que alimenta a página /transparencia
-- SEM expor dados individuais sensíveis (só contagens + log sanitizado).
-- Idempotente.

create or replace function public.transparencia_resumo()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'posts', (
      select jsonb_build_object(
        'total', count(*),
        'aprovados', count(*) filter (where status = 'approved'),
        'rejeitados', count(*) filter (where status = 'rejected'),
        'pendentes', count(*) filter (where status = 'pending')
      ) from posts
    ),
    'fotos', (
      select jsonb_build_object(
        'aprovados', count(*) filter (where status = 'approved'),
        'com_foto', count(*) filter (where status = 'approved' and foto_url is not null and foto_url <> '')
      ) from posts
    ),
    'autoaprovacao_geral', (
      select count(*) from posts where reviewed_by = user_id and status = 'approved'
    ),
    'revisores', (
      select coalesce(jsonb_agg(r), '[]'::jsonb) from (
        select pr.nome_exibicao as nome, count(*) as n
        from posts po join profiles pr on pr.id = po.reviewed_by
        where po.status = 'approved'
        group by pr.nome_exibicao order by count(*) desc limit 6
      ) r
    ),
    'organizador', (
      select jsonb_build_object(
        'nome', max(p.nome_exibicao),
        'posts', count(po.id),
        'aprovados', count(po.id) filter (where po.status = 'approved'),
        'auto_aprovados', count(po.id) filter (where po.reviewed_by = po.user_id and po.status = 'approved'),
        'pontos', coalesce(sum(po.pontos) filter (where po.status = 'approved'), 0)
      )
      from profiles p left join posts po on po.user_id = p.id
      where p.email = 'marcio.capellup@tributodevido.com.br'
    ),
    'audit_total', (select count(*) from audit_log),
    'ultimas_auditorias', (
      select coalesce(jsonb_agg(a), '[]'::jsonb) from (
        select al.created_at, al.tabela, al.operacao,
               (select nome_exibicao from profiles where id = al.actor_id) as ator
        from audit_log al order by al.created_at desc limit 15
      ) a
    )
  );
$$;

revoke all on function public.transparencia_resumo() from public, anon;
grant execute on function public.transparencia_resumo() to authenticated;
