-- TD Jogos — Limites da gestão na Etapa 3 (forward-only):
--   • Cultura: máximo 2 registros/dia  → bloqueio no INSERT (enforce_daily_limits)
--   • Mental:  máximo 20 min/dia (8 pts/dia) → cap de pontos na aprovação
--              (recalc_pontos_on_approve). "Aceita registrar mais, conta só 20."
-- Idempotente. E1/E2 inalterados. Posts já aprovados NÃO são recalculados.

-- =====================================================
-- 1) enforce_daily_limits: E3 ganha o teto de cultura (2/dia). Mental/demais
--    seguem sem bloqueio (mental é cap de PONTOS, não de quantidade).
--    Roda ANTES de force_data_registro_hoje → usa a data Brasília calculada.
-- =====================================================
CREATE OR REPLACE FUNCTION public.enforce_daily_limits()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_count int;
  v_sum_frutas int;
  v_user_tz text;
  v_hora_local int;
  v_self_id uuid := coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  v_hoje_br date := (current_timestamp AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF NEW.status = 'rejected' THEN
    RETURN NEW;
  END IF;

  -- Etapa 3: só a Cultura tem teto (máx 2/dia). Demais pilares seguem ilimitados.
  IF v_hoje_br BETWEEN DATE '2026-06-22' AND DATE '2026-07-21' THEN
    IF NEW.categoria = 'cultura' THEN
      SELECT count(*) INTO v_count FROM posts
       WHERE user_id = NEW.user_id
         AND data_registro = v_hoje_br
         AND categoria = 'cultura'
         AND status <> 'rejected'
         AND id <> v_self_id;
      IF v_count >= 2 THEN
        RAISE EXCEPTION 'Máximo de 2 registros de cultura por dia.';
      END IF;
    END IF;
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
$function$;

-- =====================================================
-- 2) recalc_pontos_on_approve: cap de pontos do Mental na E3 (8 pts/dia = 20 min).
--    Conta os pontos de mental JÁ aprovados do mesmo user no mesmo dia e capa.
--    Forward-only: só roda na transição de aprovação; aprovados não recalculam.
-- =====================================================
CREATE OR REPLACE FUNCTION public.recalc_pontos_on_approve()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_prior int;
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

    -- Etapa 3 · Mental: teto de 20 min/dia = 8 pts/dia. Excedente não pontua.
    IF NEW.categoria = 'mental'
       AND NEW.data_registro BETWEEN DATE '2026-06-22' AND DATE '2026-07-21' THEN
      SELECT coalesce(sum(pontos), 0) INTO v_prior FROM posts
       WHERE user_id = NEW.user_id
         AND data_registro = NEW.data_registro
         AND categoria = 'mental'
         AND status = 'approved'
         AND id <> NEW.id;
      NEW.pontos := least(NEW.pontos, greatest(0, 8 - v_prior));
    END IF;
  ELSE
    NEW.pontos := 0;
  END IF;
  RETURN NEW;
END;
$function$;
