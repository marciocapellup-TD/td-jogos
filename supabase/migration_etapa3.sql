-- ============================================================================
-- Migration Etapa 3 (22/06/2026 → 21/07/2026) — 30 dias corridos, individual.
-- ============================================================================
-- Modelo NOVO vs Etapa 2:
--   * Metas PLANAS (não crescem por semana).
--   * SEM TETO de pontos: cada post conta e soma; os pontos do pilar são só a
--     meta mínima de referência. enforce_daily_limits vira no-op na janela E3.
--   * Novo pilar Cultura (coluna tipo_cultura). Salada/Vegetais vira pilar
--     próprio ('salada'), separado de Energia ('energia' = só frutas na E3).
--
-- Pontuação por POST na E3:
--   energia    = 1 pt por fruta (quantidade_frutas)
--   salada     = 1 pt
--   hidratacao = 1 pt
--   cultura    = 3 pts
--   movimento  = floor(total_seg / 3000) * 5   (5 pts a cada 50 min)
--   mental     = floor(total_seg /  600) * 4   (4 pts a cada 10 min)
--
-- Idempotente. RODAR ANTES DE 22/06/2026.
-- Aplicar via Management API (o MCP Supabase não alcança o projeto lzlnnspoepidhbsyclmk).
-- Etapas 1 e 2 ficam 100% preservadas (branches por data).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Nova coluna tipo_cultura (livro|podcast|hobby|passeio|exposicao)
-- ---------------------------------------------------------------------------
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tipo_cultura text;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_tipo_cultura_check;
ALTER TABLE posts ADD CONSTRAINT posts_tipo_cultura_check
  CHECK (tipo_cultura IS NULL OR tipo_cultura IN ('livro','podcast','hobby','passeio','exposicao'));

-- ---------------------------------------------------------------------------
-- 2) CHECK de categoria += 'salada','cultura'
-- ---------------------------------------------------------------------------
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_categoria_check;
ALTER TABLE posts ADD CONSTRAINT posts_categoria_check
  CHECK (categoria IN ('energia','movimento','mental','hidratacao','salada','cultura'));

-- ---------------------------------------------------------------------------
-- 3) Frutas sem teto: relaxa de (1..2) para (>= 1)
-- ---------------------------------------------------------------------------
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_quantidade_frutas_check;
ALTER TABLE posts ADD CONSTRAINT posts_quantidade_frutas_check
  CHECK (quantidade_frutas IS NULL OR quantidade_frutas >= 1);

-- ---------------------------------------------------------------------------
-- 4) chk_categoria_campos: + branches salada/cultura; fruta passa a >= 1.
--    Backward-compat: posts E1/E2 (tipo_cultura NULL) continuam válidos.
-- ---------------------------------------------------------------------------
ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_categoria_campos;
ALTER TABLE posts ADD CONSTRAINT chk_categoria_campos CHECK (
  (categoria = 'energia'
    AND tipo_alimento IS NOT NULL AND minutos IS NULL AND horario IS NULL AND tipo_cultura IS NULL
    AND (
      (tipo_alimento = 'fruta'   AND quantidade_frutas >= 1)
      OR (tipo_alimento = 'vegetal' AND quantidade_frutas IS NULL)
    )
  )
  OR (categoria IN ('movimento','mental')
    AND minutos IS NOT NULL
    AND quantidade_frutas IS NULL AND tipo_alimento IS NULL AND horario IS NULL AND tipo_cultura IS NULL)
  OR (categoria = 'hidratacao'
    AND horario IS NOT NULL
    AND quantidade_frutas IS NULL AND minutos IS NULL AND tipo_alimento IS NULL AND tipo_cultura IS NULL)
  OR (categoria = 'salada'
    AND quantidade_frutas IS NULL AND minutos IS NULL AND tipo_alimento IS NULL AND horario IS NULL AND tipo_cultura IS NULL)
  OR (categoria = 'cultura'
    AND tipo_cultura IS NOT NULL
    AND quantidade_frutas IS NULL AND minutos IS NULL AND tipo_alimento IS NULL AND horario IS NULL)
);

-- ---------------------------------------------------------------------------
-- 5) calcular_pontos — adiciona branch Etapa 3 (FLAT, por unidade, sem cap).
--    Etapas 1 e 2 copiadas VERBATIM da versão viva.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS calcular_pontos(text, int, int, date);
DROP FUNCTION IF EXISTS calcular_pontos(text, int, int, date, int);

CREATE OR REPLACE FUNCTION calcular_pontos(
  p_categoria text,
  p_minutos int,
  p_qtd int,
  p_data date,
  p_segundos int DEFAULT 0,
  p_tipo_alimento text DEFAULT NULL,
  p_horario text DEFAULT NULL
) RETURNS smallint LANGUAGE plpgsql AS $$
DECLARE
  v_etapa3_inicio date := DATE '2026-06-22';
  v_etapa3_fim    date := DATE '2026-07-21';
  v_etapa2_inicio date := DATE '2026-05-18';
  v_etapa2_fim    date := DATE '2026-06-07';
  v_etapa1_inicio date := DATE '2026-04-20';
  v_etapa1_fim    date := DATE '2026-05-10';
  v_semana int;
  v_meta_mov int;
  v_meta_men int;
  v_total_seg int;
BEGIN
  -- ===== Etapa 3 (metas planas, pontuação por unidade, SEM teto) =====
  IF p_data BETWEEN v_etapa3_inicio AND v_etapa3_fim THEN
    v_total_seg := coalesce(p_minutos, 0) * 60 + coalesce(p_segundos, 0);
    IF p_categoria = 'energia'    THEN RETURN coalesce(p_qtd, 0)::smallint; END IF;  -- 1 pt por fruta
    IF p_categoria = 'salada'     THEN RETURN 1::smallint; END IF;
    IF p_categoria = 'hidratacao' THEN RETURN 1::smallint; END IF;
    IF p_categoria = 'cultura'    THEN RETURN 3::smallint; END IF;
    IF p_categoria = 'movimento'  THEN RETURN (floor(v_total_seg / 3000.0) * 5)::smallint; END IF;  -- 5 pts / 50 min
    IF p_categoria = 'mental'     THEN RETURN (floor(v_total_seg /  600.0) * 4)::smallint; END IF;  -- 4 pts / 10 min
    RETURN 0::smallint;
  END IF;

  -- ===== Etapa 2 (verbatim) =====
  IF p_data BETWEEN v_etapa2_inicio AND v_etapa2_fim THEN
    v_semana := floor((p_data - v_etapa2_inicio) / 7)::int + 1;

    IF p_categoria = 'energia' THEN
      IF p_tipo_alimento = 'fruta'   THEN RETURN coalesce(p_qtd, 0)::smallint; END IF;
      IF p_tipo_alimento = 'vegetal' THEN RETURN 1::smallint; END IF;
      RETURN 0::smallint;
    END IF;

    IF p_categoria = 'hidratacao' THEN
      RETURN 1::smallint;
    END IF;

    v_meta_mov := CASE v_semana WHEN 1 THEN 40 WHEN 2 THEN 45 WHEN 3 THEN 50 ELSE 9999 END;
    v_meta_men := CASE v_semana WHEN 1 THEN 5  WHEN 2 THEN 6  WHEN 3 THEN 7  ELSE 9999 END;
    v_total_seg := coalesce(p_minutos, 0) * 60 + coalesce(p_segundos, 0);

    IF p_categoria = 'movimento' AND v_total_seg >= v_meta_mov * 60 THEN RETURN 4::smallint; END IF;
    IF p_categoria = 'mental'    AND v_total_seg >= v_meta_men * 60 THEN RETURN 2::smallint; END IF;
    RETURN 0::smallint;
  END IF;

  -- ===== Etapa 1 (verbatim) =====
  IF p_data BETWEEN v_etapa1_inicio AND v_etapa1_fim THEN
    v_semana := floor((p_data - v_etapa1_inicio) / 7)::int + 1;

    IF p_categoria = 'energia' THEN
      RETURN coalesce(p_qtd, 0)::smallint;
    END IF;

    v_meta_mov := CASE v_semana WHEN 1 THEN 20 WHEN 2 THEN 25 WHEN 3 THEN 30 ELSE 9999 END;
    v_meta_men := CASE v_semana WHEN 1 THEN 3  WHEN 2 THEN 4  WHEN 3 THEN 5  ELSE 9999 END;
    v_total_seg := coalesce(p_minutos, 0) * 60 + coalesce(p_segundos, 0);

    IF p_categoria = 'movimento' AND v_total_seg >= v_meta_mov * 60 THEN RETURN 3::smallint; END IF;
    IF p_categoria = 'mental'    AND v_total_seg >= v_meta_men * 60 THEN RETURN 2::smallint; END IF;
    RETURN 0::smallint;
  END IF;

  RETURN 0::smallint;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) [FIX BUG] Índices unique da E2 estavam SEM teto superior de data
--    (data_registro >= '2026-05-18'), o que bloquearia hidratação ilimitada
--    na E3 (falha silenciosa no 2º registro do mesmo horário). Recria com teto.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS uniq_hidratacao_horario_dia;
CREATE UNIQUE INDEX uniq_hidratacao_horario_dia
  ON posts (user_id, data_registro, horario)
  WHERE categoria = 'hidratacao'
    AND status <> 'rejected'
    AND data_registro >= DATE '2026-05-18'
    AND data_registro <= DATE '2026-06-07';

DROP INDEX IF EXISTS uniq_energia_vegetal_dia;
CREATE UNIQUE INDEX uniq_energia_vegetal_dia
  ON posts (user_id, data_registro)
  WHERE categoria = 'energia'
    AND tipo_alimento = 'vegetal'
    AND status <> 'rejected'
    AND data_registro >= DATE '2026-05-18'
    AND data_registro <= DATE '2026-06-07';

-- ---------------------------------------------------------------------------
-- 7) enforce_daily_limits — NO-OP na janela E3 (sem limites, posts ilimitados).
--    IMPORTANTE: trg_enforce_daily_limits roda ANTES de trg_force_data_registro
--    (ordem alfabética), então NEW.data_registro pode não estar setado aqui.
--    Por isso o guard E3 usa a data por timezone (igual ao force_data_registro).
--    Branches E1/E2 copiados VERBATIM da versão viva.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_daily_limits() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_count int;
  v_sum_frutas int;
  v_user_tz text;
  v_hora_local int;
  v_self_id uuid := coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  IF NEW.status = 'rejected' THEN
    RETURN NEW;
  END IF;

  -- Etapa 3: sem nenhum limite diário (pilares ilimitados, hidratação sem janela).
  IF (current_timestamp AT TIME ZONE 'America/Sao_Paulo')::date
       BETWEEN DATE '2026-06-22' AND DATE '2026-07-21' THEN
    RETURN NEW;
  END IF;

  IF NEW.categoria = 'energia' AND NEW.tipo_alimento = 'fruta' THEN
    SELECT coalesce(sum(quantidade_frutas), 0) INTO v_sum_frutas FROM posts
     WHERE user_id = NEW.user_id
       AND data_registro = NEW.data_registro
       AND categoria = 'energia' AND tipo_alimento = 'fruta'
       AND status <> 'rejected'
       AND id <> v_self_id;
    IF v_sum_frutas + coalesce(NEW.quantidade_frutas, 0) > 2 THEN
      RAISE EXCEPTION 'Limite diário de frutas excedido. Você já registrou % fruta(s) hoje; só pode mais %.',
        v_sum_frutas, GREATEST(0, 2 - v_sum_frutas);
    END IF;

  ELSIF NEW.categoria = 'energia' AND NEW.tipo_alimento = 'vegetal' THEN
    SELECT count(*) INTO v_count FROM posts
     WHERE user_id = NEW.user_id
       AND data_registro = NEW.data_registro
       AND categoria = 'energia' AND tipo_alimento = 'vegetal'
       AND status <> 'rejected'
       AND id <> v_self_id;
    IF v_count >= 1 THEN
      RAISE EXCEPTION 'Você já registrou vegetal/salada hoje (máx 1/dia)';
    END IF;

  ELSIF NEW.categoria = 'hidratacao' THEN
    SELECT timezone INTO v_user_tz FROM profiles WHERE id = NEW.user_id;
    v_user_tz := coalesce(v_user_tz, 'America/Sao_Paulo');
    v_hora_local := EXTRACT(HOUR FROM (current_timestamp AT TIME ZONE v_user_tz))::int;

    IF NEW.horario = 'manha' AND (v_hora_local < 0 OR v_hora_local > 11) THEN
      RAISE EXCEPTION 'Manhã só pode ser registrada entre 00:00 e 11:59 (agora são %h no seu fuso)', v_hora_local;
    ELSIF NEW.horario = 'tarde' AND (v_hora_local < 12 OR v_hora_local > 17) THEN
      RAISE EXCEPTION 'Tarde só pode ser registrada entre 12:00 e 17:59 (agora são %h no seu fuso)', v_hora_local;
    ELSIF NEW.horario = 'noite' AND (v_hora_local < 18 OR v_hora_local > 23) THEN
      RAISE EXCEPTION 'Noite só pode ser registrada entre 18:00 e 23:59 (agora são %h no seu fuso)', v_hora_local;
    END IF;

  ELSIF NEW.categoria IN ('movimento','mental') THEN
    SELECT count(*) INTO v_count FROM posts
     WHERE user_id = NEW.user_id
       AND data_registro = NEW.data_registro
       AND categoria = NEW.categoria
       AND status <> 'rejected'
       AND id <> v_self_id;
    IF v_count >= 1 THEN
      RAISE EXCEPTION 'Você já registrou % hoje (máx 1/dia)', NEW.categoria;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Re-afirma recalc_pontos_on_approve (7 args) — blindagem contra
--    reaplicação de versões antigas (hardening tinha uma de 4 args).
--    Assinatura inalterada → o branch E3 de calcular_pontos é usado na aprovação.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalc_pontos_on_approve() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    NEW.pontos := calcular_pontos(
      NEW.categoria,
      NEW.minutos,
      NEW.quantidade_frutas,
      NEW.data_registro,
      coalesce(NEW.segundos, 0),
      NEW.tipo_alimento,
      NEW.horario
    );
  ELSE
    NEW.pontos := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 9) resultado_etapa: aceita 'etapa3' + branch de datas no congelador.
-- ---------------------------------------------------------------------------
ALTER TABLE resultado_etapa DROP CONSTRAINT IF EXISTS resultado_etapa_etapa_check;
ALTER TABLE resultado_etapa ADD CONSTRAINT resultado_etapa_etapa_check
  CHECK (etapa IN ('etapa1','etapa2','etapa3'));

CREATE OR REPLACE FUNCTION public.congelar_resultado_etapa(p_etapa text default 'etapa2')
returns int
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

  if p_etapa = 'etapa3' then
    v_inicio := date '2026-06-22'; v_fim := date '2026-07-21';
  elsif p_etapa = 'etapa2' then
    v_inicio := date '2026-05-18'; v_fim := date '2026-06-07';
  elsif p_etapa = 'etapa1' then
    v_inicio := date '2026-04-20'; v_fim := date '2026-05-10';
  else
    raise exception 'Etapa inválida: %', p_etapa;
  end if;

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

-- ---------------------------------------------------------------------------
-- 10) challenge_config → janela E3 (informativo; UI usa constantes JS)
-- ---------------------------------------------------------------------------
UPDATE challenge_config
   SET data_inicio = DATE '2026-06-22',
       data_fim    = DATE '2026-07-21'
 WHERE id = 1;
