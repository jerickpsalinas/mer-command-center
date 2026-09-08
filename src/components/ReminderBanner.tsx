import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FOCUS_RING } from "@/lib/utils";

interface Reminder {
  id: string;
  message: string;
}

export default function ReminderBanner() {
  const { user } = useAuth();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: rem } = await supabase
        .from("active_reminder")
        .select("id, message")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !rem) return;
      const { data: dis } = await supabase
        .from("reminder_dismissals")
        .select("reminder_id")
        .eq("reminder_id", rem.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (dis) {
        setDismissed(true);
      } else {
        setReminder(rem as Reminder);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleDismiss = async () => {
    if (!reminder || !user) return;
    setDismissed(true);
    await supabase.from("reminder_dismissals").insert({
      reminder_id: reminder.id,
      user_id: user.id,
    });
  };

  if (!reminder || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative w-full min-h-10 flex items-center justify-center bg-warning text-warning-foreground px-12 py-2 text-sm font-medium border-b border-border shadow-sm"
    >
      <span className="truncate text-center">{reminder.message}</span>
      <button
        type="button"
        onClick={handleDismiss}
        className={`absolute right-1 h-10 w-10 flex items-center justify-center rounded-md hover:bg-warning-foreground/10 transition-colors duration-150 ${FOCUS_RING} focus-visible:ring-offset-0`}
        aria-label="Dismiss reminder"
        title="Dismiss reminder"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
