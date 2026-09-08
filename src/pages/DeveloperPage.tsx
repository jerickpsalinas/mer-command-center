import { useEffect, useState, useCallback, useMemo, useId } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  Megaphone,
  Bell,
  Archive,
  ArchiveRestore,
  Loader2,
  Pencil,
  Trash2,
  X,
  Check,
  Clock,
  CalendarClock,
  BellOff,
  MessageSquareOff,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";

interface ReminderRow {
  id: string;
  message: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
  scheduled_at: string | null;
}

interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  created_at: string;
  created_by: string;
  archived: boolean;
  scheduled_at: string | null;
}

// Format a UTC timestamp as EST (America/New_York) for display.
const formatEst = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

// Convert a `datetime-local` string — ALWAYS interpreted as America/New_York (EST/EDT) —
// to a UTC ISO string for storage. If empty, returns null.
const localInputToUtc = (value: string): string | null => {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  // Treat the wall time as if it were UTC, then measure how NY interprets that
  // instant and shift by the difference to get the true UTC for that NY wall time.
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcGuess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const nyAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
  );
  const offset = utcGuess - nyAsUtc;
  return new Date(utcGuess + offset).toISOString();
};

// Convert a stored UTC ISO timestamp to a `datetime-local` value
// (YYYY-MM-DDTHH:mm) expressed in America/New_York wall time for editing.
const utcToLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
};

// Format a date+time pair as an EST preview, or null when incomplete.
const previewEst = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  const iso = localInputToUtc(`${date}T${time}`);
  return iso ? formatEst(iso) : null;
};

function DateTimeFields({
  date,
  time,
  onDate,
  onTime,
}: {
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
}) {
  const preview = previewEst(date, time);
  const uid = useId();
  const dateId = `${uid}-date`;
  const timeId = `${uid}-time`;
  return (
    <div>
      <style>{`
        .dev-schedule-input {
          color-scheme: dark;
        }
        .dev-schedule-input::-webkit-calendar-picker-indicator {
          filter: brightness(0) invert(1) !important;
          opacity: 1 !important;
          cursor: pointer;
        }
        .dev-schedule-input::-webkit-clear-button,
        .dev-schedule-input::-webkit-inner-spin-button {
          filter: brightness(0) invert(1) !important;
        }
        .light .dev-schedule-input {
          color-scheme: light;
        }
        .light .dev-schedule-input::-webkit-calendar-picker-indicator,
        .light .dev-schedule-input::-webkit-clear-button,
        .light .dev-schedule-input::-webkit-inner-spin-button {
          filter: none !important;
        }
      `}</style>
      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex flex-col gap-1">
          <Label htmlFor={dateId} className="text-xs text-muted-foreground">
            Date <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <input
            id={dateId}
            type="date"
            required
            aria-required="true"
            value={date}
            onChange={(e) => onDate(e.target.value)}
            className="dev-schedule-input h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-[160px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={timeId} className="text-xs text-muted-foreground">
            Time <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <input
            id={timeId}
            type="time"
            required
            aria-required="true"
            value={time}
            onChange={(e) => onTime(e.target.value)}
            className="dev-schedule-input h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-[120px]"
          />
        </div>
        <span className="text-xs text-muted-foreground h-9 flex items-center">EST (Florida)</span>
      </div>
      {preview && (
        <p className="text-xs text-muted-foreground mt-1" aria-live="polite">
          Will post on <span className="font-mono-data tabular-nums text-foreground">{preview}</span>
        </p>
      )}
    </div>
  );
}

export default function DeveloperPage() {
  const { user, isDeveloper, loading } = useAuth();

  // Reminder form
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderSchedule, setReminderSchedule] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [savingReminder, setSavingReminder] = useState(false);

  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editReminderText, setEditReminderText] = useState("");
  const [editReminderDate, setEditReminderDate] = useState("");
  const [editReminderTime, setEditReminderTime] = useState("");
  const [confirmDeleteReminder, setConfirmDeleteReminder] = useState<string | null>(null);

  // Announcement form
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [updateSchedule, setUpdateSchedule] = useState(false);
  const [updateDate, setUpdateDate] = useState("");
  const [updateTime, setUpdateTime] = useState("");
  const [postingAnn, setPostingAnn] = useState(false);

  const [updates, setUpdates] = useState<AnnouncementRow[]>([]);
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editUpdateDate, setEditUpdateDate] = useState("");
  const [editUpdateTime, setEditUpdateTime] = useState("");

  // Generic cancel-confirm for scheduled items
  const [confirmCancel, setConfirmCancel] = useState<
    { kind: "reminder" | "announcement"; id: string } | null
  >(null);
  const [confirmDeleteUpdate, setConfirmDeleteUpdate] = useState<string | null>(null);

  const loadReminders = useCallback(async () => {
    const { data } = await supabase
      .from("active_reminder")
      .select("id, message, created_by, created_at, is_active, scheduled_at")
      .order("created_at", { ascending: false });
    setReminders((data ?? []) as ReminderRow[]);
  }, []);

  const loadUpdates = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, message, created_at, created_by, archived, scheduled_at")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as AnnouncementRow[];
    setUpdates(list);

    if (list.length) {
      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .in("announcement_id", list.map((a) => a.id));
      const counts: Record<string, number> = {};
      (reads ?? []).forEach((r: { announcement_id: string }) => {
        counts[r.announcement_id] = (counts[r.announcement_id] || 0) + 1;
      });
      setReadCounts(counts);
    }

    const { count } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true });
    setTotalUsers(count ?? 0);
  }, []);

  useEffect(() => {
    if (!isDeveloper) return;
    const publishDue = async () => {
      const nowIso = new Date().toISOString();
      const { data: dueAnns } = await supabase
        .from("announcements")
        .select("id")
        .eq("archived", true)
        .not("scheduled_at", "is", null)
        .lte("scheduled_at", nowIso);
      if (dueAnns && dueAnns.length) {
        await Promise.all(
          dueAnns.map((a) =>
            supabase.from("announcements").update({ archived: false }).eq("id", a.id),
          ),
        );
        await loadUpdates();
      }
      const { data: dueRems } = await supabase
        .from("active_reminder")
        .select("id")
        .eq("is_active", false)
        .not("scheduled_at", "is", null)
        .lte("scheduled_at", nowIso);
      if (dueRems && dueRems.length) {
        await Promise.all(
          dueRems.map((r) =>
            supabase.from("active_reminder").update({ is_active: true }).eq("id", r.id),
          ),
        );
        await loadReminders();
      }
    };
    loadReminders();
    loadUpdates();
    publishDue();
    // Poll every 60s so scheduled items move into the published lists in real time.
    const t = setInterval(() => {
      loadReminders();
      loadUpdates();
      publishDue();
    }, 60_000);
    return () => clearInterval(t);
  }, [isDeveloper, loadReminders, loadUpdates]);


  // Combined upcoming-scheduled list (computed from already-loaded data).
  const scheduledItems = useMemo(() => {
    const now = Date.now();
    const items: Array<{
      kind: "reminder" | "announcement";
      id: string;
      title: string;
      preview: string;
      scheduled_at: string;
    }> = [];
    reminders.forEach((r) => {
      if (r.scheduled_at && new Date(r.scheduled_at).getTime() > now) {
        items.push({
          kind: "reminder",
          id: r.id,
          title: "Reminder",
          preview: r.message.slice(0, 60),
          scheduled_at: r.scheduled_at,
        });
      }
    });
    updates.forEach((a) => {
      if (a.scheduled_at && new Date(a.scheduled_at).getTime() > now) {
        items.push({
          kind: "announcement",
          id: a.id,
          title: a.title,
          preview: a.message.slice(0, 60),
          scheduled_at: a.scheduled_at,
        });
      }
    });
    items.sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
    );
    return items;
  }, [reminders, updates]);

  if (loading) return null;
  if (!isDeveloper) return <Navigate to="/" replace />;

  const setActiveReminderHandler = async () => {
    if (!user || !reminderMessage.trim()) return;
    const scheduledIso = reminderSchedule
      ? localInputToUtc(`${reminderDate}T${reminderTime}`)
      : null;
    if (reminderSchedule && !scheduledIso) {
      toast.error("Pick a valid date and time.");
      return;
    }
    setSavingReminder(true);
    try {
      // Only deactivate current active reminder when this one publishes immediately.
      if (!scheduledIso) {
        const { error: upErr } = await supabase
          .from("active_reminder")
          .update({ is_active: false })
          .eq("is_active", true);
        if (upErr) throw upErr;
      }
      const { error: insErr } = await supabase.from("active_reminder").insert({
        message: reminderMessage.trim(),
        created_by: user.id,
        is_active: scheduledIso === null,
        scheduled_at: scheduledIso,
      });
      if (insErr) throw insErr;
      setReminderMessage("");
      setReminderSchedule(false);
      setReminderDate("");
      setReminderTime("");
      toast.success(
        scheduledIso
          ? `Reminder scheduled for ${formatEst(scheduledIso)} EST`
          : "Reminder set — visible to all users",
      );
      await loadReminders();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to set reminder");
    } finally {
      setSavingReminder(false);
    }
  };

  const saveReminderEdit = async (id: string) => {
    if (!editReminderText.trim()) return;
    const patch: { message: string; scheduled_at?: string | null } = {
      message: editReminderText.trim(),
    };
    if (editReminderDate && editReminderTime) {
      patch.scheduled_at = localInputToUtc(`${editReminderDate}T${editReminderTime}`);
    }
    const { error } = await supabase
      .from("active_reminder")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingReminderId(null);
    toast.success("Reminder updated.");
    await loadReminders();
  };

  const deactivateReminder = async (id: string) => {
    const { error } = await supabase
      .from("active_reminder")
      .update({ is_active: false })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reminder deactivated.");
    await loadReminders();
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from("active_reminder").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reminder deleted.");
    setConfirmDeleteReminder(null);
    await loadReminders();
  };

  const postUpdate = async () => {
    if (!user || !title.trim() || !message.trim()) return;
    const scheduledIso = updateSchedule
      ? localInputToUtc(`${updateDate}T${updateTime}`)
      : null;
    if (updateSchedule && !scheduledIso) {
      toast.error("Pick a valid date and time.");
      return;
    }
    setPostingAnn(true);
    try {
      const { error } = await supabase.from("announcements").insert({
        title: title.trim(),
        message: message.trim(),
        created_by: user.id,
        scheduled_at: scheduledIso,
        ...(scheduledIso ? { archived: true } : {}),
      });
      if (error) throw error;
      setTitle("");
      setMessage("");
      setUpdateSchedule(false);
      setUpdateDate("");
      setUpdateTime("");
      toast.success(
        scheduledIso
          ? `System update scheduled for ${formatEst(scheduledIso)} EST`
          : "System update posted — all users will see a notification",
      );
      await loadUpdates();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setPostingAnn(false);
    }
  };

  const beginEditUpdate = (u: AnnouncementRow) => {
    setEditingUpdateId(u.id);
    setEditTitle(u.title);
    setEditMessage(u.message);
    const [d, t] = utcToLocalInput(u.scheduled_at).split("T");
    setEditUpdateDate(d || "");
    setEditUpdateTime(t || "");
  };

  const saveUpdateEdit = async (id: string, original: AnnouncementRow) => {
    if (!editTitle.trim() || !editMessage.trim()) return;
    const patch: {
      title: string;
      message: string;
      scheduled_at?: string | null;
    } = {
      title: editTitle.trim(),
      message: editMessage.trim(),
    };
    // Only include scheduled_at when editing an item that was scheduled,
    // so we don't accidentally re-schedule already-published updates.
    if (original.scheduled_at) {
      patch.scheduled_at =
        editUpdateDate && editUpdateTime
          ? localInputToUtc(`${editUpdateDate}T${editUpdateTime}`)
          : null;
    }
    const { error } = await supabase
      .from("announcements")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingUpdateId(null);
    toast.success("System update edited.");
    await loadUpdates();
  };

  const setArchived = async (id: string, archived: boolean) => {
    const { error } = await supabase
      .from("announcements")
      .update({ archived })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(archived ? "System update archived." : "System update unarchived.");
    await loadUpdates();
  };

  const deleteUpdate = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("System update deleted.");
    setConfirmDeleteUpdate(null);
    await loadUpdates();
  };

  const cancelScheduledItem = async () => {
    if (!confirmCancel) return;
    const table = confirmCancel.kind === "reminder" ? "active_reminder" : "announcements";
    const { error } = await supabase.from(table).delete().eq("id", confirmCancel.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Scheduled item cancelled.");
    setConfirmCancel(null);
    if (confirmCancel.kind === "reminder") await loadReminders();
    else await loadUpdates();
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Developer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the global reminder banner and post system updates.
        </p>
      </div>

      {/* Section A — Reminder */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4" aria-labelledby="dev-reminder-heading">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
          <div>
            <h2 id="dev-reminder-heading" className="text-base font-semibold text-foreground">Active Reminder</h2>
            <p className="text-xs text-muted-foreground">Shown as a banner to every signed-in user.</p>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New reminder</p>
          <div className="space-y-1.5">
            <Label htmlFor="reminder-msg">
              Message <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Textarea
              id="reminder-msg"
              required
              aria-required="true"
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              placeholder="e.g. MERs due Friday at 5pm"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="reminder-schedule"
              checked={reminderSchedule}
              onCheckedChange={(v) => {
                setReminderSchedule(v);
                if (!v) {
                  setReminderDate("");
                  setReminderTime("");
                }
              }}
            />
            <Label htmlFor="reminder-schedule" className="cursor-pointer">
              {reminderSchedule ? "Schedule for Later" : "Post Now"}
            </Label>
          </div>
          {reminderSchedule && (
            <div className="pt-1">
              <DateTimeFields
                date={reminderDate}
                time={reminderTime}
                onDate={setReminderDate}
                onTime={setReminderTime}
              />
            </div>
          )}

          <Button
            onClick={setActiveReminderHandler}
            disabled={
              savingReminder ||
              !reminderMessage.trim() ||
              (reminderSchedule && (!reminderDate || !reminderTime))
            }
          >
            {savingReminder && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
            {savingReminder ? "Saving…" : reminderSchedule ? "Schedule Reminder" : "Set Active Reminder"}
          </Button>
        </div>

        <div className="space-y-3 mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Published reminders</p>
          {reminders.filter((r) => !r.scheduled_at || new Date(r.scheduled_at).getTime() <= Date.now()).length === 0 && (
            <EmptyState icon={Bell} title="No reminders yet" hint="Post one above and it will appear here." variant="dashed" />
          )}
          {reminders
            .filter((r) => !r.scheduled_at || new Date(r.scheduled_at).getTime() <= Date.now())
            .map((r) => (
            <div
              key={r.id}
              className={`rounded-lg border p-4 transition-colors duration-150 ${
                r.is_active
                  ? "border-warning/40 bg-warning/10"
                  : "border-border bg-background opacity-70"
              }`}
            >
              {editingReminderId === r.id ? (
                <div className="space-y-2">
                  <Label htmlFor={`edit-reminder-${r.id}`} className="sr-only">Reminder message</Label>
                  <Textarea
                    id={`edit-reminder-${r.id}`}
                    value={editReminderText}
                    onChange={(e) => setEditReminderText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveReminderEdit(r.id)}>
                      <Check className="h-4 w-4 mr-1" aria-hidden="true" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingReminderId(null)}>
                      <X className="h-4 w-4 mr-1" aria-hidden="true" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground break-words">{r.message}</p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
                    <span className="font-mono-data tabular-nums">{new Date(r.created_at).toLocaleString()}</span>
                    {r.is_active ? (
                      <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase tracking-wider border-success/30 text-success">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase tracking-wider border-border text-muted-foreground">Inactive</Badge>
                    )}
                  </p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingReminderId(r.id);
                        setEditReminderText(r.message);
                        setEditReminderDate("");
                        setEditReminderTime("");
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Edit
                    </Button>
                    {r.is_active && (
                      <Button size="sm" variant="outline" onClick={() => deactivateReminder(r.id)}>
                        Deactivate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDeleteReminder(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Section B — System Updates */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4" aria-labelledby="dev-updates-heading">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" aria-hidden="true" />
          <div>
            <h2 id="dev-updates-heading" className="text-base font-semibold text-foreground">System Updates</h2>
            <p className="text-xs text-muted-foreground">Posts a notification to all users.</p>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New update</p>
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">
              Title <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="ann-title"
              required
              aria-required="true"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short title"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ann-msg">
              Message <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Textarea
              id="ann-msg"
              required
              aria-required="true"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="System update body"
              rows={4}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="update-schedule"
              checked={updateSchedule}
              onCheckedChange={(v) => {
                setUpdateSchedule(v);
                if (!v) {
                  setUpdateDate("");
                  setUpdateTime("");
                }
              }}
            />
            <Label htmlFor="update-schedule" className="cursor-pointer">
              {updateSchedule ? "Schedule for Later" : "Post Now"}
            </Label>
          </div>
          {updateSchedule && (
            <div className="pt-1">
              <DateTimeFields
                date={updateDate}
                time={updateTime}
                onDate={setUpdateDate}
                onTime={setUpdateTime}
              />
            </div>
          )}

          <Button
            onClick={postUpdate}
            disabled={
              postingAnn ||
              !title.trim() ||
              !message.trim() ||
              (updateSchedule && (!updateDate || !updateTime))
            }
          >
            {postingAnn && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
            {postingAnn ? "Posting…" : updateSchedule ? "Schedule System Update" : "Post System Update"}
          </Button>
        </div>

        <div className="space-y-3 mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Published updates</p>
          {updates.filter((a) => !a.scheduled_at || new Date(a.scheduled_at).getTime() <= Date.now()).length === 0 && (
            <EmptyState icon={Activity} title="No system updates yet" hint="Post one above and it will appear here." variant="dashed" />
          )}
          {updates
            .filter((a) => !a.scheduled_at || new Date(a.scheduled_at).getTime() <= Date.now())
            .map((a) => {
            const reads = readCounts[a.id] || 0;
            const isEditing = editingUpdateId === a.id;
            return (
              <div
                key={a.id}
                className={`rounded-lg border border-border p-4 transition-colors duration-150 ${
                  a.archived ? "bg-muted/30 opacity-70" : "bg-background"
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor={`edit-title-${a.id}`} className="sr-only">Title</Label>
                    <Input
                      id={`edit-title-${a.id}`}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title"
                    />
                    <Label htmlFor={`edit-msg-${a.id}`} className="sr-only">Message</Label>
                    <Textarea
                      id={`edit-msg-${a.id}`}
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveUpdateEdit(a.id, a)}>
                        <Check className="h-4 w-4 mr-1" aria-hidden="true" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingUpdateId(null)}>
                        <X className="h-4 w-4 mr-1" aria-hidden="true" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                        <span className="truncate" title={a.title}>{a.title}</span>
                        {a.archived && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase tracking-wider border-border text-muted-foreground">
                            Archived
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                        {a.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2 font-mono-data tabular-nums">
                        {new Date(a.created_at).toLocaleString()} · {reads} of {totalUsers} users read
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => beginEditUpdate(a)}
                        title="Edit"
                        aria-label={`Edit update: ${a.title}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setArchived(a.id, !a.archived)}
                        title={a.archived ? "Unarchive" : "Archive"}
                        aria-label={`${a.archived ? "Unarchive" : "Archive"} update: ${a.title}`}
                      >
                        {a.archived ? (
                          <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Archive className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDeleteUpdate(a.id)}
                        title="Delete permanently"
                        aria-label={`Delete update: ${a.title}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section C — Scheduled (Upcoming) */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card space-y-4" aria-labelledby="dev-scheduled-heading">
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 id="dev-scheduled-heading" className="text-base font-semibold text-foreground">Scheduled (Upcoming)</h2>
          <span className="text-xs text-muted-foreground ml-auto">Auto-refreshes every 60s</span>
        </div>

        {scheduledItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 flex flex-col items-center text-center gap-1.5">
            <CalendarClock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Nothing scheduled</p>
            <p className="text-xs text-muted-foreground">Toggle "Schedule for Later" on a reminder or update to queue it.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledItems.map((item) => {
              const isEditingReminder =
                item.kind === "reminder" && editingReminderId === item.id;
              const isEditingAnnouncement =
                item.kind === "announcement" && editingUpdateId === item.id;
              const fullReminder =
                item.kind === "reminder"
                  ? reminders.find((r) => r.id === item.id)
                  : undefined;
              const fullAnnouncement =
                item.kind === "announcement"
                  ? updates.find((a) => a.id === item.id)
                  : undefined;

              return (
                <div
                  key={`${item.kind}:${item.id}`}
                  className="rounded-lg border border-warning/40 bg-warning/5 p-4 transition-colors duration-150"
                >
                  {isEditingReminder ? (
                    <div className="space-y-2">
                      <Label htmlFor={`edit-sched-reminder-${item.id}`} className="sr-only">Reminder message</Label>
                      <Textarea
                        id={`edit-sched-reminder-${item.id}`}
                        value={editReminderText}
                        onChange={(e) => setEditReminderText(e.target.value)}
                        rows={3}
                      />
                      <DateTimeFields
                        date={editReminderDate}
                        time={editReminderTime}
                        onDate={setEditReminderDate}
                        onTime={setEditReminderTime}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveReminderEdit(item.id)}>
                          <Check className="h-4 w-4 mr-1" aria-hidden="true" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingReminderId(null)}
                        >
                          <X className="h-4 w-4 mr-1" aria-hidden="true" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : isEditingAnnouncement && fullAnnouncement ? (
                    <div className="space-y-2">
                      <Label htmlFor={`edit-sched-title-${item.id}`} className="sr-only">Title</Label>
                      <Input
                        id={`edit-sched-title-${item.id}`}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                      />
                      <Label htmlFor={`edit-sched-msg-${item.id}`} className="sr-only">Message</Label>
                      <Textarea
                        id={`edit-sched-msg-${item.id}`}
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        rows={4}
                      />
                      <DateTimeFields
                        date={editUpdateDate}
                        time={editUpdateTime}
                        onDate={setEditUpdateDate}
                        onTime={setEditUpdateTime}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveUpdateEdit(item.id, fullAnnouncement)}
                        >
                          <Check className="h-4 w-4 mr-1" aria-hidden="true" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUpdateId(null)}
                        >
                          <X className="h-4 w-4 mr-1" aria-hidden="true" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className="bg-warning/15 text-warning border-warning/40 hover:bg-warning/15 text-[9px] uppercase tracking-wider"
                            variant="outline"
                          >
                            {item.kind === "reminder" ? "Reminder" : "System update"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Scheduled for <span className="font-mono-data tabular-nums">{formatEst(item.scheduled_at)}</span> EST
                          </span>
                        </div>
                        {item.kind === "announcement" && (
                          <p className="text-sm font-semibold text-foreground truncate" title={item.title}>{item.title}</p>
                        )}
                        <p className="text-xs text-muted-foreground break-words">
                          {item.preview}
                          {item.preview.length >= 60 ? "…" : ""}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          aria-label={`Edit scheduled ${item.kind}`}
                          onClick={() => {
                            if (item.kind === "reminder" && fullReminder) {
                              setEditingReminderId(fullReminder.id);
                              setEditReminderText(fullReminder.message);
                              const [d, t] = utcToLocalInput(
                                fullReminder.scheduled_at,
                              ).split("T");
                              setEditReminderDate(d || "");
                              setEditReminderTime(t || "");
                            } else if (
                              item.kind === "announcement" &&
                              fullAnnouncement
                            ) {
                              beginEditUpdate(fullAnnouncement);
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          title="Cancel"
                          aria-label={`Cancel scheduled ${item.kind}`}
                          onClick={() =>
                            setConfirmCancel({ kind: item.kind, id: item.id })
                          }
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AlertDialog
        open={!!confirmDeleteReminder}
        onOpenChange={(o) => !o && setConfirmDeleteReminder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the reminder. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteReminder && deleteReminder(confirmDeleteReminder)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDeleteUpdate}
        onOpenChange={(o) => !o && setConfirmDeleteUpdate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this system update?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteUpdate && deleteUpdate(confirmDeleteUpdate)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog
        open={!!confirmCancel}
        onOpenChange={(o) => !o && setConfirmCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this scheduled item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove it before it publishes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={cancelScheduledItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel item</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
