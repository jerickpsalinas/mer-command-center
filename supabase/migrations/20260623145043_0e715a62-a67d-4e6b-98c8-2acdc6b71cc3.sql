CREATE TABLE public.announcement_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('like','heart')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id, reaction)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_reactions TO authenticated;
GRANT ALL ON public.announcement_reactions TO service_role;

ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read reactions"
  ON public.announcement_reactions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users insert own reactions"
  ON public.announcement_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own reactions"
  ON public.announcement_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reactions;
ALTER TABLE public.announcement_reactions REPLICA IDENTITY FULL;