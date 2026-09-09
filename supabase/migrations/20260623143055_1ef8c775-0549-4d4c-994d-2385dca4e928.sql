
CREATE TABLE public.client_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ghl_contact_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  user_name text NOT NULL,
  user_role text NOT NULL,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);

CREATE INDEX idx_client_comments_contact ON public.client_comments (ghl_contact_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.client_comments TO authenticated;
GRANT ALL ON public.client_comments TO service_role;

ALTER TABLE public.client_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users read"
  ON public.client_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users insert own comments"
  ON public.client_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can soft-delete own comments"
  ON public.client_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Developers can soft-delete any comment"
  ON public.client_comments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'developer')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'developer')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.client_comments;
