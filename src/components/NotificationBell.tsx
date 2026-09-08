import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/time";
import { EmptyState } from "@/components/EmptyState";

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user) return;
    const { data: anns } = await supabase
      .from("announcements")
      .select("id, title, message, created_at")
      .eq("archived", false)
      .order("created_at", { ascending: false });
    const list = (anns ?? []) as Announcement[];
    setAnnouncements(list);
    if (list.length) {
      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id)
        .in(
          "announcement_id",
          list.map((a) => a.id),
        );
      setReadIds(new Set((reads ?? []).map((r) => r.announcement_id as string)));
    } else {
      setReadIds(new Set());
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const unread = announcements.filter((a) => !readIds.has(a.id));
  const hasUnread = unread.length > 0;

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && user && unread.length > 0) {
      const rows = unread.map((a) => ({
        announcement_id: a.id,
        user_id: user.id,
      }));
      await supabase.from("announcement_reads").insert(rows);
      setReadIds(new Set([...readIds, ...unread.map((a) => a.id)]));
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          title="Announcements"
          aria-label={hasUnread ? `Announcements, ${unread.length} unread` : "Announcements"}
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {hasUnread && (
            <span
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
              aria-hidden="true"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-1rem)] p-0 max-h-[480px] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Announcements</h3>
          {announcements.length > 0 && (
            <span className="text-[11px] font-mono-data tabular-nums text-muted-foreground">
              {announcements.length}
            </span>
          )}
        </div>
        <div className="overflow-y-auto scrollbar-thin">
          {announcements.length === 0 ? (
            <div className="px-4 py-10">
              <EmptyState icon={Bell} title="No announcements yet" size="sm" />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {announcements.map((a) => {
                const isUnread = !readIds.has(a.id);
                return (
                  <li key={a.id} className="px-4 py-3 hover:bg-muted/40 transition-colors duration-150">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate" title={a.title}>
                            {a.title}
                          </p>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" title="Unread" aria-label="Unread" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                          {a.message}
                        </p>
                        <p className="text-[10px] font-mono-data tabular-nums text-muted-foreground mt-1.5">
                          <time dateTime={a.created_at}>{timeAgo(a.created_at)}</time>
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
