-- TD Jogos — Resultado oficial congelado por etapa
-- Idempotente — pode rodar mais de uma vez.
-- Cria a tabela `resultado_etapa` (snapshot oficial do ranking final), suas
-- policies de RLS (leitura pública, sem escrita por cliente) e a função
-- `congelar_resultado_etapa()` que recomputa o ranking no servidor e grava o
-- snapshot. A ordenação reproduz EXATAMENTE o ordenarRanking do front
-- (Dashboard.jsx / Home.jsx): pontos desc, depois created_at do último post
-- que pontuou (asc), e quem não pontuou por último. 3º critério nome_exibicao
-- para empates exatos serem determinísticos.

-- =====================================================
-- Tabela
-- =====================================================
create table if not exists resultado_etapa (
  etapa          text not null check (etapa in ('etapa1','etapa2')),
  posicao        int  not null,
  user_id        uuid not null references profiles(id) on delete cascade,
  nome_exibicao  text not null,          -- desnormalizado: nome no momento do congelamento
  pontos         int  not null,
  ultimo_post_at timestamptz,            -- max(created_at) dos posts que pontuaram; null = nunca pontuou
  congelado_em   timestamptz not null default now(),
  congelado_por  uuid references profiles(id),
  primary key (etapa, user_id),
  unique (etapa, posicao)
);

create index if not exists idx_resultado_etapa_ordem on resultado_etapa (etapa, posicao);

-- =====================================================
-- RLS — leitura pública (qualquer logado vê o resultado oficial),
-- escrita só via função SECURITY DEFINER abaixo (cliente nunca grava direto).
-- =====================================================
alter table resultado_etapa enable row level security;

drop policy if exists "resultado_read_all" on resultado_etapa;
create policy "resultado_read_all" on resultado_etapa for select using (true);

grant select on resultado_etapa to authenticated, anon;
revoke insert, update, delete on resultado_etapa from authenticated, anon;

-- =====================================================
-- Função congeladora — admin-only, re-rodável (delete + reinsert).
-- =====================================================
create or replace function public.congelar_resultado_etapa(p_etapa text default 'etapa2')
returns int                           -- nº de linhas congeladas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inicio date;
  v_fim    date;
  v_n      int;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin pode congelar o resultado da etapa.';
  end if;

  if p_etapa = 'etapa2' then
    v_inicio := date '2026-05-18'; v_fim := date '2026-06-07';
  elsif p_etapa = 'etapa1' then
    v_inicio := date '2026-04-20'; v_fim := date '2026-05-10';
  else
    raise exception 'Etapa inválida: %', p_etapa;
  end if;

  -- delete + reinsert => idempotente / re-rodável (refaz o snapshot)
  delete from resultado_etapa where etapa = p_etapa;

  insert into resultado_etapa
    (etapa, posicao, user_id, nome_exibicao, pontos, ultimo_post_at, congelado_por)
  select
    p_etapa,
    row_number() over (
      order by agg.pontos desc, agg.ultimo_post_at asc nulls last, agg.nome_exibicao asc
    ),
    agg.id, agg.nome_exibicao, agg.pontos, agg.ultimo_post_at, auth.uid()
  from (
    select
      pr.id,
      pr.nome_exibicao,
      coalesce(sum(po.pontos), 0)                        as pontos,
      max(po.created_at) filter (where po.pontos > 0)    as ultimo_post_at
    from profiles pr
    left join posts po
      on po.user_id = pr.id
     and po.status = 'approved'
     and po.data_registro between v_inicio and v_fim
    where pr.ativo = true
    group by pr.id, pr.nome_exibicao
  ) agg;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.congelar_resultado_etapa(text) from public;
grant execute on function public.congelar_resultado_etapa(text) to authenticated;
