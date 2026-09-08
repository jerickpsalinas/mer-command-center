import { useCallback, useEffect, useState } from "react";
import { Bell, MessageCircle, ThumbsUp, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, FOCUS_RING, DIALOG_SHELL, DIALOG_HEADER, DIALOG_TITLE, DIALOG_BODY } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TeamChatModal from "@/components/TeamChatModal";

interface SystemUpdate {
  id: string;
  title: string;
  message: string;
  created_at: string;
  scheduled_at: string | null;
}

interface ReactionRow {
  id: string;
  announcement_id: string;
  user_id: string;
  reaction: "like" | "heart";
}

const FLOAT_BTN_STYLE: React.CSSProperties = {
  backgroundColor: "hsl(var(--primary))",
  boxShadow:
    "0 0 0 1.5px hsl(var(--primary) / 0.45), 0 4px 16px hsl(var(--primary) / 0.25), 0 8px 24px hsl(var(--background) / 0.4)",
};

const CHAT_LAST_SEEN_KEY = "team_chat_last_seen_at";

function getChatLastSeenAt(): number {
  try {
    const v = Number(localStorage.getItem(CHAT_LAST_SEEN_KEY) || 0);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

export default function FloatingActionStack() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [othersOnline, setOthersOnline] = useState(false);
  const [updates, setUpdates] = useState<SystemUpdate[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [chatUnread, setChatUnread] = useState(0);
  const [chatLastSeenAt, setChatLastSeenAt] = useState<number>(() => getChatLastSeenAt());

  const load = useCallback(async () => {
    if (!user) return;
    const { data: anns } = await supabase
      .from("announcements")
      .select("id, title, message, created_at, scheduled_at")
      .eq("archived", false)
      .order("created_at", { ascending: false });
    const list = (anns ?? []) as SystemUpdate[];
    setUpdates(list);
    if (list.length) {
      const ids = list.map((a) => a.id);
      const [{ data: reads }, { data: rxs }] = await Promise.all([
        supabase
          .from("announcement_reads")
          .select("announcement_id")
          .eq("user_id", user.id)
          .in("announcement_id", ids),
        supabase
          .from("announcement_reactions")
          .select("id, announcement_id, user_id, reaction")
          .in("announcement_id", ids),
      ]);
      setReadIds(new Set((reads ?? []).map((r) => r.announcement_id as string)));
      setReactions((rxs ?? []) as ReactionRow[]);
    } else {
      setReadIds(new Set());
      setReactions([]);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: announcements (archive/delete/insert) — keep bell modal in sync
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("announcements_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  // Realtime: reactions
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("announcement_reactions_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcement_reactions" },
        () => {
          void (async () => {
            const ids = updates.map((u) => u.id);
            if (!ids.length) return;
            const { data } = await supabase
              .from("announcement_reactions")
              .select("id, announcement_id, user_id, reaction")
              .in("announcement_id", ids);
            setReactions((data ?? []) as ReactionRow[]);
          })();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, updates]);

  // Realtime presence → green dot when at least one other user is online
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("team_chat_presence", {
      config: { presence: { key: user.id } },
    });

    const recomputeOthers = () => {
      const state = channel.presenceState() as Record<string, unknown[]>;
      const otherKeys = Object.keys(state).filter((k) => k !== user.id);
      setOthersOnline(otherKeys.length > 0);
    };

    channel
      .on("presence", { event: "sync" }, recomputeOthers)
      .on("presence", { event: "join" }, recomputeOthers)
      .on("presence", { event: "leave" }, recomputeOthers)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unread = updates.filter((a) => !readIds.has(a.id));
  const hasUnread = unread.length > 0;

  const handleOpen = async () => {
    setOpen(true);
    // Re-fetch so freshly archived/deleted items don't linger in the modal.
    await load();
    if (user && unread.length > 0) {
      const rows = unread.map((a) => ({ announcement_id: a.id, user_id: user.id }));
      await supabase.from("announcement_reads").insert(rows);
      setReadIds(new Set([...readIds, ...unread.map((a) => a.id)]));
    }
  };

  const handleChatClick = () => {
    setChatMinimized(false);
    setChatOpen((v) => !v);
  };

  // Auto-reopen chat when a new message arrives while it's minimized
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("team_chat_minimized_watcher")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_chat_messages" },
        (payload) => {
          const row = payload.new as { user_id?: string } | null;
          if (!row || row.user_id === user.id) return;
          if (chatMinimized && !chatOpen) {
            setChatMinimized(false);
            setChatOpen(true);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, chatMinimized, chatOpen]);

  // Track unread team-chat count. Loads count on mount, subscribes to new
  // inserts, and resets whenever the chat window is open (marking messages
  // as seen once the user is actually viewing them).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadCount = async () => {
      const sinceIso = new Date(chatLastSeenAt || 0).toISOString();
      const { count } = await supabase
        .from("team_chat_messages")
        .select("id", { count: "exact", head: true })
        .gt("created_at", sinceIso)
        .neq("user_id", user.id)
        .eq("is_deleted", false);
      if (!cancelled) setChatUnread(count ?? 0);
    };
    void loadCount();

    const channel = supabase
      .channel("team_chat_unread_counter")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_chat_messages" },
        (payload) => {
          const row = payload.new as { user_id?: string; is_deleted?: boolean } | null;
          if (!row || row.user_id === user.id || row.is_deleted) return;
          // Only bump if the chat isn't already open in the foreground.
          if (chatOpen && !chatMinimized) return;
          setChatUnread((n) => n + 1);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, chatLastSeenAt, chatOpen, chatMinimized]);

  // Clear unread when chat window becomes open + not minimized
  useEffect(() => {
    if (chatOpen && !chatMinimized) {
      const now = Date.now();
      try {
        localStorage.setItem(CHAT_LAST_SEEN_KEY, String(now));
      } catch {
        /* noop */
      }
      setChatLastSeenAt(now);
      setChatUnread(0);
    }
  }, [chatOpen, chatMinimized]);

  const toggleReaction = async (annId: string, kind: "like" | "heart") => {
    if (!user) return;
    const mine = reactions.find(
      (r) => r.announcement_id === annId && r.user_id === user.id && r.reaction === kind,
    );
    if (mine) {
      setReactions((prev) => prev.filter((r) => r.id !== mine.id));
      await supabase.from("announcement_reactions").delete().eq("id", mine.id);
    } else {
      const optimistic: ReactionRow = {
        id: `tmp-${Date.now()}`,
        announcement_id: annId,
        user_id: user.id,
        reaction: kind,
      };
      setReactions((prev) => [...prev, optimistic]);
      const { data, error } = await supabase
        .from("announcement_reactions")
        .insert({ announcement_id: annId, user_id: user.id, reaction: kind })
        .select("id, announcement_id, user_id, reaction")
        .single();
      if (error) {
        setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
      } else if (data) {
        setReactions((prev) =>
          prev.map((r) => (r.id === optimistic.id ? (data as ReactionRow) : r)),
        );
      }
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 max-lg:bottom-[calc(72px+env(safe-area-inset-bottom)+12px)] max-lg:right-3 z-30 flex flex-col gap-3">
        {/* Message — Team Chat (TOP) */}
        <button
          onClick={handleChatClick}
          type="button"
          title={chatUnread > 0 ? `Team Chat (${chatUnread} new)` : "Team Chat"}
          aria-label={chatUnread > 0 ? `Open team chat, ${chatUnread} unread` : "Open team chat"}
          className={`relative h-14 w-14 max-sm:h-12 max-sm:w-12 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-150 ${FOCUS_RING}`}
          style={FLOAT_BTN_STYLE}
        >
          <MessageCircle className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
          {chatUnread > 0 ? (
            <span
              className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-destructive ring-2 ring-background text-[10px] font-bold text-destructive-foreground flex items-center justify-center tabular-nums"
              title={`${chatUnread} unread message${chatUnread === 1 ? "" : "s"}`}
            >
              {chatUnread > 99 ? "99+" : chatUnread}
            </span>
          ) : (
            <span
              className={`absolute top-1 right-1 h-3 w-3 rounded-full ring-2 ring-background transition-colors duration-150 ${
                othersOnline ? "bg-success" : "bg-muted-foreground"
              }`}
              aria-hidden="true"
              title={othersOnline ? "Teammates online" : "No one else online"}
            />
          )}
        </button>

        {/* Bell — System Updates (BOTTOM) */}
        <button
          onClick={handleOpen}
          type="button"
          title="System Updates"
          aria-label={hasUnread ? `System updates, ${unread.length} unread` : "System updates"}
          className={`relative h-14 w-14 max-sm:h-12 max-sm:w-12 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-150 ${FOCUS_RING}`}
          style={FLOAT_BTN_STYLE}
        >
          <Bell className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
          {hasUnread && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-destructive ring-2 ring-background" aria-hidden="true" />
          )}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn(DIALOG_SHELL, "sm:max-w-lg overflow-hidden")}>
          <DialogHeader className={DIALOG_HEADER}>
            <DialogTitle className={cn(DIALOG_TITLE, "text-base")}>
              <Bell className="h-4 w-4 text-warning" aria-hidden="true" />
              System Updates
            </DialogTitle>
          </DialogHeader>
          <div className={cn(DIALOG_BODY, "px-0 sm:px-0 py-0")}>
            {updates.length === 0 ? (
              <div className="px-4 py-12">
                <EmptyState icon={Bell} title="No system updates yet" size="sm" />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {updates.map((a) => {
                  const isUnread = !readIds.has(a.id);
                  const likes = reactions.filter(
                    (r) => r.announcement_id === a.id && r.reaction === "like",
                  );
                  const hearts = reactions.filter(
                    (r) => r.announcement_id === a.id && r.reaction === "heart",
                  );
                  const ownLike = likes.some((r) => r.user_id === user.id);
                  const ownHeart = hearts.some((r) => r.user_id === user.id);
                  return (
                    <li key={a.id} className="px-5 py-4 hover:bg-accent/40 transition-colors duration-150">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{a.title}</p>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0" title="Unread" aria-label="Unread" role="img" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                            {a.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1.5">{timeAgo(
                            a.scheduled_at && new Date(a.scheduled_at).getTime() <= Date.now()
                              ? a.scheduled_at
                              : a.created_at
                          )}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => void toggleReaction(a.id, "like")}
                              aria-pressed={ownLike}
                              aria-label={`Like (${likes.length})`}
                              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 min-h-[28px] rounded-full border transition-colors duration-150 ${FOCUS_RING} ${
                                ownLike
                                  ? "bg-info/15 text-info border-info/30"
                                  : "bg-transparent text-muted-foreground border-border/60 hover:bg-accent"
                              }`}
                              title="Like"
                            >
                              <ThumbsUp className={`h-3 w-3 ${ownLike ? "fill-current" : ""}`} aria-hidden="true" />
                              <span>👍 {likes.length}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleReaction(a.id, "heart")}
                              aria-pressed={ownHeart}
                              aria-label={`Heart (${hearts.length})`}
                              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 min-h-[28px] rounded-full border transition-colors duration-150 ${FOCUS_RING} ${
                                ownHeart
                                  ? "bg-destructive/15 text-destructive border-destructive/30"
                                  : "bg-transparent text-muted-foreground border-border/60 hover:bg-accent"
                              }`}
                              title="Heart"
                            >
                              <Heart className={`h-3 w-3 ${ownHeart ? "fill-current" : ""}`} aria-hidden="true" />
                              <span>❤️ {hearts.length}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TeamChatModal
        open={chatOpen}
        minimized={false}
        onMinimize={() => {
          setChatOpen(false);
          setChatMinimized(true);
        }}
        onClose={() => {
          setChatOpen(false);
          setChatMinimized(false);
        }}
      />
    </>
  );
}
