-- Keep-alive: prevents the Supabase free-tier project from auto-pausing after
-- 7 days of no activity. Runs every 3 days and performs a real read against an
-- existing table so the database registers genuine activity. pg_cron and pg_net
-- are already enabled (see 20260528233405).

-- Idempotent: drop any prior definition before (re)scheduling.
SELECT cron.unschedule('mer-keepalive')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mer-keepalive');

-- Every 3 days at 06:00 UTC. A lightweight COUNT touches the table for real
-- (SELECT 1 can be optimized away and may not register as activity).
SELECT cron.schedule(
  'mer-keepalive',
  '0 6 */3 * *',
  $$ SELECT count(*) FROM public.user_profiles $$
);