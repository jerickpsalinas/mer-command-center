
CREATE TABLE public.announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  archived boolean DEFAULT false
);
CREATE INDEX idx_announcements_created_at ON public.announcements (created_at DESC);
CREATE INDEX idx_announcements_archived ON public.announcements (archived);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads non-archived announcements" ON public.announcements FOR SELECT TO authenticated USING (archived = false);
CREATE POLICY "Only developers manage announcements" ON public.announcements FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'developer')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'developer')
);

CREATE TABLE public.announcement_reads (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);
CREATE INDEX idx_announcement_reads_user ON public.announcement_reads (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_reads TO authenticated;
GRANT ALL ON public.announcement_reads TO service_role;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own reads" ON public.announcement_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users mark own reads" ON public.announcement_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Developers see all reads" ON public.announcement_reads FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'developer')
);

CREATE TABLE public.active_reminder (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);
CREATE INDEX idx_active_reminder_active ON public.active_reminder (is_active, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_reminder TO authenticated;
GRANT ALL ON public.active_reminder TO service_role;
ALTER TABLE public.active_reminder ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active reminder" ON public.active_reminder FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Only developers manage reminders" ON public.active_reminder FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'developer')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'developer')
);

CREATE TABLE public.reminder_dismissals (
  reminder_id uuid NOT NULL REFERENCES public.active_reminder(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  dismissed_at timestamptz DEFAULT now(),
  PRIMARY KEY (reminder_id, user_id)
);
CREATE INDEX idx_reminder_dismissals_user ON public.reminder_dismissals (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_dismissals TO authenticated;
GRANT ALL ON public.reminder_dismissals TO service_role;
ALTER TABLE public.reminder_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own dismissals" ON public.reminder_dismissals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users mark own dismissals" ON public.reminder_dismissals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
