-- ============================================================================
-- Migration: janela manha/tarde/noite ancorada SEMPRE em America/Sao_Paulo.
--
-- Antes: a função enforce_daily_limits lia profiles.timezone e validava a
-- janela no fuso local do usuário. Resultado: Mariane (Europe/London) batia
-- "noite" às 18h Londres (= 14h BR), antes do BR virar noite.
--
-- Agora: janelas são globais, ancoradas no horário de Brasília. Mariane às
-- 18h Londres vê BR=14h → só pode "tarde". Pra registrar "noite" precisa
-- esperar BR chegar nas 18h (= 22h Londres).
--
-- profiles.timezone permanece na tabela (sem dependência) — pode ser removido
-- em PR separado se houver vontade de limpar.
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_daily_limits() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_count int;
  v_sum_frutas int;
  v_hora_br int;
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
    -- Janela ancorada em horário de Brasília para todo mundo, independente do
    -- timezone do usuário. Isso garante que quem está fora do BR (ex: Mariane
    -- em Londres) só consegue registrar "noite" quando o BR também está em noite.
    v_hora_br := EXTRACT(HOUR FROM (current_timestamp AT TIME ZONE 'America/Sao_Paulo'))::int;

    IF NEW.horario = 'manha' AND (v_hora_br < 0 OR v_hora_br > 11) THEN
      RAISE EXCEPTION 'Manhã só pode ser registrada entre 00:00 e 11:59 (agora são %h no horário de Brasília)', v_hora_br;
    ELSIF NEW.horario = 'tarde' AND (v_hora_br < 12 OR v_hora_br > 17) THEN
      RAISE EXCEPTION 'Tarde só pode ser registrada entre 12:00 e 17:59 (agora são %h no horário de Brasília)', v_hora_br;
    ELSIF NEW.horario = 'noite' AND (v_hora_br < 18 OR v_hora_br > 23) THEN
      RAISE EXCEPTION 'Noite só pode ser registrada entre 18:00 e 23:59 (agora são %h no horário de Brasília)', v_hora_br;
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
