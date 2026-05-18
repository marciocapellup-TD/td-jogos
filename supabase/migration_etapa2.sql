-- ============================================================================
-- Migration Etapa 2 (18/05/2026 → 07/06/2026)
-- ============================================================================
-- Mudanças:
-- 1. Energia ganha tipo_alimento (fruta|vegetal) — 1 post de fruta + 1 de vegetal/dia
-- 2. Nova categoria 'hidratacao' com horário (manha|tarde|noite) — 3 posts/dia, 1 por horário
-- 3. Movimento: meta 40/45/50 min, +4 pts
-- 4. Mental: meta 5/6/7 min, +2 pts
-- 5. Etapa 1 (20/04 → 10/05) preservada na função calcular_pontos (branch antigo)
--
-- Rodar ANTES de 18/05/2026 no SQL Editor do Supabase. Idempotente.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Novas colunas
-- ---------------------------------------------------------------------------
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS tipo_alimento text
    CHECK (tipo_alimento IN ('fruta','vegetal')),
  ADD COLUMN IF NOT EXISTS horario text
    CHECK (horario IN ('manha','tarde','noite'));

-- ---------------------------------------------------------------------------
-- 2) Expande CHECK de categoria pra incluir 'hidratacao'
-- ---------------------------------------------------------------------------
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_categoria_check;
ALTER TABLE posts ADD CONSTRAINT posts_categoria_check
  CHECK (categoria IN ('energia','movimento','mental','hidratacao'));

-- ---------------------------------------------------------------------------
-- 3) Substitui CHECK de campos obrigatórios por categoria
--    (Etapa 1 só tinha chk_energia / chk_mov_mental — agora cobrimos hidratacao
--    e energia com tipo_alimento. Posts antigos ficam válidos pq:
--      - energia/Etapa1 com tipo_alimento=NULL? NÃO, eles têm tipo_alimento=NULL
--        e quantidade_frutas NOT NULL — não passariam no CHECK novo.
--    Solução: backfill tipo_alimento='fruta' nos posts antigos de energia.)
-- ---------------------------------------------------------------------------
UPDATE posts
   SET tipo_alimento = 'fruta'
 WHERE categoria = 'energia'
   AND tipo_alimento IS NULL
   AND quantidade_frutas IS NOT NULL;

ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_energia;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_mov_mental;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_categoria_campos;
ALTER TABLE posts ADD CONSTRAINT chk_categoria_campos CHECK (
  (categoria = 'energia'
    AND tipo_alimento IS NOT NULL
    AND minutos IS NULL
    AND horario IS NULL
    AND (
      (tipo_alimento = 'fruta'   AND quantidade_frutas BETWEEN 1 AND 2)
      OR
      (tipo_alimento = 'vegetal' AND quantidade_frutas IS NULL)
    )
  )
  OR
  (categoria IN ('movimento','mental')
    AND minutos IS NOT NULL
    AND quantidade_frutas IS NULL
    AND tipo_alimento IS NULL
    AND horario IS NULL
  )
  OR
  (categoria = 'hidratacao'
    AND horario IS NOT NULL
    AND quantidade_frutas IS NULL
    AND minutos IS NULL
    AND tipo_alimento IS NULL
    -- segundos fica com default 0 do schema; não validamos aqui
  )
);

-- ---------------------------------------------------------------------------
-- 4) Unique partial indexes (impede duplicata por dia) — só Etapa 2
--    Frutas: até 2 posts/dia somando max 2 frutas (validado no trigger).
--    Vegetal: 1/dia.
--    Hidratação: 1 por horário/dia.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS uniq_hidratacao_horario_dia;
DROP INDEX IF EXISTS uniq_energia_tipo_alimento_dia;
DROP INDEX IF EXISTS uniq_energia_vegetal_dia;

CREATE UNIQUE INDEX uniq_hidratacao_horario_dia
  ON posts (user_id, data_registro, horario)
  WHERE categoria = 'hidratacao'
    AND status <> 'rejected'
    AND data_registro >= DATE '2026-05-18';

CREATE UNIQUE INDEX uniq_energia_vegetal_dia
  ON posts (user_id, data_registro)
  WHERE categoria = 'energia'
    AND tipo_alimento = 'vegetal'
    AND status <> 'rejected'
    AND data_registro >= DATE '2026-05-18';

-- ---------------------------------------------------------------------------
-- 5) calcular_pontos — substitui versão de migration_segundos.sql
--    Branch Etapa 2 (18/05 → 07/06) com regras novas
--    Branch Etapa 1 (20/04 → 10/05) preservado
--
--    Importante: a assinatura mudou (adicionados p_tipo_alimento e p_horario).
--    CREATE OR REPLACE só substitui se a assinatura é idêntica, então droppa
--    as versões antigas explicitamente pra evitar overloads ambíguos.
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
  v_etapa2_inicio date := DATE '2026-05-18';
  v_etapa2_fim    date := DATE '2026-06-07';
  v_etapa1_inicio date := DATE '2026-04-20';
  v_etapa1_fim    date := DATE '2026-05-10';
  v_semana int;
  v_meta_mov int;
  v_meta_men int;
  v_total_seg int;
BEGIN
  -- ===== Etapa 2 =====
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

  -- ===== Etapa 1 (preservada) =====
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

  -- Fora de janela: 0
  RETURN 0::smallint;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Trigger recalc_pontos_on_approve — passa novos params
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
-- 7) Trigger enforce_daily_limits — limites por categoria/tipo/horário
--    - Energia/fruta: até 2 posts/dia somando no máximo 2 frutas
--    - Energia/vegetal: 1 post/dia
--    - Hidratacao: 1 por horário (já garantido pelo unique index acima)
--    - Movimento/Mental: 1 por dia (mantido)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_daily_limits() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_count int;
  v_sum_frutas int;
  v_self_id uuid := coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  IF NEW.status = 'rejected' THEN
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
  -- Hidratacao: cap por horário garantido pelo unique index uniq_hidratacao_horario_dia
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Atualiza challenge_config para Etapa 2 (informativo — UI usa constantes JS)
-- ---------------------------------------------------------------------------
UPDATE challenge_config
   SET data_inicio = DATE '2026-05-18',
       data_fim    = DATE '2026-06-07'
 WHERE id = 1;
