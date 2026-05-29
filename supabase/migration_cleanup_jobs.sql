-- ============================================================================
-- Migration: agenda pg_cron pra invocar a edge function `limpar-fotos-aprovadas`
-- 3 vezes ao dia em horários BR distintos (09:00 / 15:00 / 21:00).
--
-- Limpa fotos do Storage de posts aprovados com mais de 4h (lógica na edge).
--
-- DEPENDÊNCIA: antes de rodar este arquivo, faça UMA VEZ no SQL Editor:
--   SELECT vault.create_secret('<SERVICE_ROLE_KEY_AQUI>', 'edge_fn_auth');
-- ============================================================================

-- 1) Habilita extensões (já vêm pré-instaladas no Supabase Free)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Helper: invoca a edge function via pg_net (assíncrono)
CREATE OR REPLACE FUNCTION public.disparar_limpar_fotos()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT net.http_post(
    url := 'https://lzlnnspoepidhbsyclmk.supabase.co/functions/v1/limpar-fotos-aprovadas',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'edge_fn_auth' LIMIT 1),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$;

-- Garante acesso restrito (só postgres/service_role podem invocar fora do cron)
REVOKE ALL ON FUNCTION public.disparar_limpar_fotos() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.disparar_limpar_fotos() FROM anon, authenticated;

-- 3) Remove jobs antigos com mesmo nome (idempotência se rodar de novo)
DO $$
BEGIN
  PERFORM cron.unschedule('limpar-fotos-09br') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='limpar-fotos-09br');
  PERFORM cron.unschedule('limpar-fotos-15br') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='limpar-fotos-15br');
  PERFORM cron.unschedule('limpar-fotos-21br') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='limpar-fotos-21br');
EXCEPTION WHEN OTHERS THEN
  -- cron.unschedule pode não aceitar WHERE; alternativa abaixo
  NULL;
END $$;

-- 4) Agenda os 3 jobs (BR = UTC-3)
--    09:00 BR = 12:00 UTC
--    15:00 BR = 18:00 UTC
--    21:00 BR = 00:00 UTC
SELECT cron.schedule('limpar-fotos-09br', '0 12 * * *', $$SELECT public.disparar_limpar_fotos();$$);
SELECT cron.schedule('limpar-fotos-15br', '0 18 * * *', $$SELECT public.disparar_limpar_fotos();$$);
SELECT cron.schedule('limpar-fotos-21br', '0 0 * * *',  $$SELECT public.disparar_limpar_fotos();$$);

-- 5) Conferência: lista jobs ativos
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'limpar-fotos%' ORDER BY jobname;
