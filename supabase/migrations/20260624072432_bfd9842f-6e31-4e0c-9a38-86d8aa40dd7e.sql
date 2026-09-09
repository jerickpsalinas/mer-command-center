DROP POLICY IF EXISTS "Developers see all announcements" ON public.announcements;
CREATE POLICY "Developers see all announcements"
ON public.announcements
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'developer'
  )
);

DROP POLICY IF EXISTS "Developers see all reminders" ON public.active_reminder;
CREATE POLICY "Developers see all reminders"
ON public.active_reminder
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'developer'
  )
);