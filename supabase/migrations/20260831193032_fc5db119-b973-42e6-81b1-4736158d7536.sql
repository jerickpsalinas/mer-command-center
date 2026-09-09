-- user_profiles: read-only for signed-in users; no anon access; writes stay service-role only
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_profiles FROM anon;

DROP POLICY IF EXISTS "authenticated_read_profiles" ON public.user_profiles;

CREATE POLICY "authenticated_read_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- mer_history: signed-in users can read and insert; no anon access; no update/delete from clients
ALTER TABLE public.mer_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mer_history FROM anon;

DROP POLICY IF EXISTS "authenticated_read_mer_history" ON public.mer_history;

CREATE POLICY "authenticated_read_mer_history"
  ON public.mer_history
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_insert_mer_history" ON public.mer_history;

CREATE POLICY "authenticated_insert_mer_history"
  ON public.mer_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);