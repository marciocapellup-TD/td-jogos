-- TD Jogos — Resultado oficial congelado da ETAPA 1 (por GRUPO)
-- Idempotente — pode rodar mais de uma vez.
--
-- A Etapa 1 (20/04→10/05/2026) foi disputada por GRUPOS, com cap diário de
-- 35 pts por grupo. O snapshot oficial de indivíduos (`resultado_etapa`) não
-- serve aqui: o vencedor é um GRUPO e a soma precisa respeitar o cap diário.
-- Por isso esta tabela/funcão dedicadas, espelhando a agregação capada do
-- Dashboard (Etapa1View / agregados): least(soma_do_dia, 35) somado por grupo.
-- Ordenação: pontos desc, depois created_at do último post que pontuou (asc),
-- 3º critério nome do grupo (determinístico).

-- =====================================================
-- Tabela
-- =====================================================
create table if not exists resultado_etapa_grupo (
  etapa          text not null check (etapa in ('etapa1')),
  posicao        int  not null,
  group_id       int  not null references groups(id) on delete cascade,
  grupo_nome     text not null,          -- desnormalizado no momento do congelamento
  grupo_cor      text,
  pontos         int  not null,          -- já com cap diário de 35/grupo aplicado
  ultimo_post_at timestamptz,            -- max(created_at) dos posts que pontuaram
  congelado_em   timestamptz not null default now(),
  congelado_por  uuid references profiles(id),
  primary key (etapa, group_id),
  unique (etapa, posicao)
);

create index if not exists idx_resultado_etapa_grupo_ordem on resultado_etapa_grupo (etapa, posicao);

-- =====================================================
-- RLS — leitura pública; escrita só via função SECURITY DEFINER abaixo.
-- =====================================================
alter table resultado_etapa_grupo enable row level security;

drop policy if exists "resultado_grupo_read_all" on resultado_etapa_grupo;
create policy "resultado_grupo_read_all" on resultado_etapa_grupo for select using (true);

grant select on resultado_etapa_grupo to authenticated, anon;
revoke insert, update, delete on resultado_etapa_grupo from authenticated, anon;

-- =====================================================
-- Função congeladora — admin-only, re-rodável (delete + reinsert), cap-aware.
-- =====================================================
create or replace function public.congelar_resultado_grupo(p_etapa text default 'etapa1')
returns int                           -- nº de grupos congelados
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inicio date;
  v_fim    date;
  v_cap    int := 35;                 -- cap diário por grupo (Etapa 1)
  v_n      int;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin pode congelar o resultado da etapa.';
  end if;

  if p_etapa = 'etapa1' then
    v_inicio := date '2026-04-20'; v_fim := date '2026-05-10';
  else
    raise exception 'Etapa inválida para resultado por grupo: %', p_etapa;
  end if;

  delete from resultado_etapa_grupo where etapa = p_etapa;

  insert into resultado_etapa_grupo
    (etapa, posicao, group_id, grupo_nome, grupo_cor, pontos, ultimo_post_at, congelado_por)
  with daily as (
    select pr.group_id, po.data_registro, sum(po.pontos) as pts_dia
    from posts po
    join profiles pr on pr.id = po.user_id
    where po.status = 'approved'
      and po.data_registro between v_inicio and v_fim
      and pr.group_id is not null
    group by pr.group_id, po.data_registro
  ),
  capped as (
    select group_id, sum(least(pts_dia, v_cap)) as pontos
    from daily group by group_id
  ),
  ultimo as (
    select pr.group_id, max(po.created_at) as ultimo_post_at
    from posts po
    join profiles pr on pr.id = po.user_id
    where po.status = 'approved'
      and po.data_registro between v_inicio and v_fim
      and pr.group_id is not null
      and po.pontos > 0
    group by pr.group_id
  ),
  agg as (
    select g.id as group_id, g.nome as grupo_nome, g.cor as grupo_cor,
           coalesce(c.pontos, 0)::int as pontos, u.ultimo_post_at
    from groups g
    left join capped c on c.group_id = g.id
    left join ultimo u on u.group_id = g.id
  )
  select
    p_etapa,
    row_number() over (order by agg.pontos desc, agg.ultimo_post_at asc nulls last, agg.grupo_nome asc),
    agg.group_id, agg.grupo_nome, agg.grupo_cor, agg.pontos, agg.ultimo_post_at, auth.uid()
  from agg;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.congelar_resultado_grupo(text) from public;
grant execute on function public.congelar_resultado_grupo(text) to authenticated;

-- =====================================================
-- Congelamento inicial (Etapa 1). Roda como postgres no migration — fora do
-- gate is_admin() —, então faz o INSERT direto, espelhando a função acima.
-- congelado_por = null (não há auth.uid em conexão de serviço).
-- A função admin-gated continua disponível para re-congelar pela app.
-- =====================================================
delete from resultado_etapa_grupo where etapa = 'etapa1';

insert into resultado_etapa_grupo
  (etapa, posicao, group_id, grupo_nome, grupo_cor, pontos, ultimo_post_at, congelado_por)
with daily as (
  select pr.group_id, po.data_registro, sum(po.pontos) as pts_dia
  from posts po
  join profiles pr on pr.id = po.user_id
  where po.status = 'approved'
    and po.data_registro between date '2026-04-20' and date '2026-05-10'
    and pr.group_id is not null
  group by pr.group_id, po.data_registro
),
capped as (
  select group_id, sum(least(pts_dia, 35)) as pontos
  from daily group by group_id
),
ultimo as (
  select pr.group_id, max(po.created_at) as ultimo_post_at
  from posts po
  join profiles pr on pr.id = po.user_id
  where po.status = 'approved'
    and po.data_registro between date '2026-04-20' and date '2026-05-10'
    and pr.group_id is not null
    and po.pontos > 0
  group by pr.group_id
),
agg as (
  select g.id as group_id, g.nome as grupo_nome, g.cor as grupo_cor,
         coalesce(c.pontos, 0)::int as pontos, u.ultimo_post_at
  from groups g
  left join capped c on c.group_id = g.id
  left join ultimo u on u.group_id = g.id
)
select
  'etapa1',
  row_number() over (order by agg.pontos desc, agg.ultimo_post_at asc nulls last, agg.grupo_nome asc),
  agg.group_id, agg.grupo_nome, agg.grupo_cor, agg.pontos, agg.ultimo_post_at, null
from agg;
