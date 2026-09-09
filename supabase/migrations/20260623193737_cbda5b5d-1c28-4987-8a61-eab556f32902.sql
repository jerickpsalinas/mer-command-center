
ALTER TABLE public.active_reminder ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

DROP POLICY IF EXISTS "Anyone reads active reminder" ON public.active_reminder;
CREATE POLICY "Anyone reads active reminder" ON public.active_reminder
  FOR SELECT USING (
    is_active = true
    AND (scheduled_at IS NULL OR scheduled_at <= now())
  );

DROP POLICY IF EXISTS "Anyone reads non-archived announcements" ON public.announcements;
CREATE POLICY "Anyone reads non-archived announcements" ON public.announcements
  FOR SELECT USING (
    archived = false
    AND (scheduled_at IS NULL OR scheduled_at <= now())
  );
