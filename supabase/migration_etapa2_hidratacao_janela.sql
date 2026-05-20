-- ============================================================================
-- Migration: valida janela de horário para hidratacao (manha/tarde/noite)
-- usando o timezone do usuário (default America/Sao_Paulo).
--
-- Janelas:
--   manha: 00:00 - 11:59
--   tarde: 12:00 - 17:59
--   noite: 18:00 - 23:59
--
-- Usuários fora do Brasil (ex: Mariane em Londres) recebem timezone próprio.
-- ============================================================================

-- 1) Adiciona coluna timezone em profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo';

-- 2) Mariane Brandão em Londres (UTC+1 em BST, UTC+0 em GMT — Postgres lida com horário de verão automaticamente)
UPDATE profiles
   SET timezone = 'Europe/London'
 WHERE nome_exibicao ILIKE '%mariane%brand%'
    OR nome_exibicao ILIKE '%mariana%brand%';

-- 3) Atualiza enforce_daily_limits: pra hidratacao, valida que a hora atual
--    no fuso do usuário está dentro da janela do horario escolhido.
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
    -- Valida que o horário escolhido (manha/tarde/noite) bate com a hora real
    -- no fuso do usuário. Não usa NEW.created_at porque pode ainda ser null
    -- em BEFORE INSERT — usa current_timestamp.
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
