-- ============================================================================
-- Fix: permite até 2 posts de fruta/dia, somando no máximo 2 frutas no total.
-- Vegetal continua 1/dia. Mov/Mental continuam 1/dia.
-- ============================================================================

-- 1) Remove índice unique que impedia 2º post de fruta no mesmo dia
DROP INDEX IF EXISTS uniq_energia_tipo_alimento_dia;

-- 2) Cria índice unique só para vegetal (1 vegetal/dia continua valendo)
DROP INDEX IF EXISTS uniq_energia_vegetal_dia;
CREATE UNIQUE INDEX uniq_energia_vegetal_dia
  ON posts (user_id, data_registro)
  WHERE categoria = 'energia'
    AND tipo_alimento = 'vegetal'
    AND status <> 'rejected'
    AND data_registro >= DATE '2026-05-18';

-- 3) Ajusta enforce_daily_limits: pra fruta, soma quantidade_frutas no dia
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
  RETURN NEW;
END;
$$;
