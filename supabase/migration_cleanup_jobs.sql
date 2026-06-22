-- ============================================================================
-- Migration: agenda pg_cron pra invocar a edge function `limpar-fotos-aprovadas`
-- DE HORA EM HORA (0 * * * *).
--
-- A edge function delega a decisão pra RPC public.fotos_para_limpar() que apaga:
--   órfãos (sem post vivo), aprovadas > 4h, e — se passar do teto de 500 MB —
--   aprovadas recentes oldest-first. Protege pending/rejected.
--
-- DEPENDÊNCIA (auth durável, NÃO usa mais a service_role que rotaciona):
--   o secret do Vault `edge_fn_auth` deve conter o MESMO valor do secret
--   LIMPAR_FOTOS_SECRET setado na edge function. Setar UMA VEZ:
--     SELECT vault.create_secret('<LIMPAR_FOTOS_SECRET>', 'edge_fn_auth');
--   (ou vault.update_secret(id, '<...>') se já existir).
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

-- 3) Remove jobs antigos (os 3 diários e o horário, p/ idempotência)
DO $$
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY ARRAY['limpar-fotos-09br','limpar-fotos-15br','limpar-fotos-21br','limpar-fotos-hora'] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

-- 4) Agenda 1 job de hora em hora
SELECT cron.schedule('limpar-fotos-hora', '0 * * * *', $$SELECT public.disparar_limpar_fotos();$$);

-- 5) Conferência: lista jobs ativos
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'limpar-fotos%' ORDER BY jobname;
