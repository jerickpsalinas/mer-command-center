
CREATE TABLE public.team_chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  user_name text NOT NULL,
  user_role text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);

CREATE INDEX idx_team_chat_created_at ON public.team_chat_messages (created_at);

GRANT SELECT, INSERT, UPDATE ON public.team_chat_messages TO authenticated;
GRANT ALL ON public.team_chat_messages TO service_role;

ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users read"
  ON public.team_chat_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users insert own messages"
  ON public.team_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can soft-delete own messages"
  ON public.team_chat_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Developers can soft-delete any message"
  ON public.team_chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'developer')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'developer')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_chat_messages;
