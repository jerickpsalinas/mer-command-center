import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { markCommentsSeen } from "@/hooks/useClientCommentActivity";
import { toast } from "sonner";
import { timeAgo } from "@/lib/time";
import { EmptyState } from "@/components/EmptyState";


interface ClientComment {
  id: string;
  ghl_contact_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  comment: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

function formatFullDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}


interface Props {
  ghlContactId: string;
}

export default function ClientCommentsSection({ ghlContactId }: Props) {
  const { user, profile, isDeveloper } = useAuth();
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const inputId = useId();

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    if (!ghlContactId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("client_comments")
        .select("*")
        .eq("ghl_contact_id", ghlContactId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        return;
      }
      setComments((data ?? []) as ClientComment[]);
      markCommentsSeen(ghlContactId);
      scrollToBottom();
    })();




    const channel = supabase
      .channel(`client_comments_${ghlContactId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_comments",
          filter: `ghl_contact_id=eq.${ghlContactId}`,
        },
        (payload) => {
          setComments((prev) => {
            const incoming = payload.new as ClientComment;
            if (prev.some((c) => c.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          markCommentsSeen(ghlContactId);
          scrollToBottom();
        },

      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "client_comments",
          filter: `ghl_contact_id=eq.${ghlContactId}`,
        },
        (payload) => {
          const updated = payload.new as ClientComment;
          setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [ghlContactId, scrollToBottom]);

  const addComment = async () => {
    const text = input.trim();
    if (!text || !user || sending || !ghlContactId) return;
    setSending(true);
    const userName = profile?.name || user.email || "Unknown";
    const userRole = profile?.role || "user";
    const { error } = await supabase.from("client_comments").insert({
      ghl_contact_id: ghlContactId,
      user_id: user.id,
      user_name: userName,
      user_role: userRole,
      comment: text,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setInput("");
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase
      .from("client_comments")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (sending) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void addComment();
    }
  };

  if (!ghlContactId) return null;

  const visibleCount = comments.filter((c) => !c.is_deleted).length;

  return (
    <section className="rounded-lg border border-border bg-card" aria-labelledby={headingId}>
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <MessageCircle className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <h3 id={headingId} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Comments
        </h3>
        {comments.length > 0 && (
          <span className="inline-flex h-5 items-center rounded-full border border-border bg-muted/40 px-1.5 text-[10.5px] font-mono-data tabular-nums text-muted-foreground">
            {visibleCount}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="max-h-[260px] overflow-y-auto px-4 py-3 space-y-3" aria-live="polite">
        {comments.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No comments yet" hint="Be the first to leave a note" size="sm" />
        ) : (
          comments.map((c) => {
            const own = c.user_id === user?.id;
            const canDelete = own || isDeveloper;
            return (
              <div key={c.id} className="group">
                <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                  <span className="text-[11px] font-semibold text-foreground truncate" title={c.user_name}>
                    {c.user_name}
                  </span>
                  <span className="inline-flex h-4 items-center text-[9px] uppercase tracking-wider px-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold shrink-0">
                    {c.user_role}
                  </span>
                  <time
                    dateTime={c.created_at}
                    className="text-[10px] text-muted-foreground shrink-0"
                    title={formatFullDate(c.created_at)}
                  >
                    · {timeAgo(c.created_at)}
                  </time>
                  <span className="text-[10px] text-muted-foreground/70 ml-auto shrink-0 hidden sm:inline font-mono-data tabular-nums">
                    {formatFullDate(c.created_at)}
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  <div
                    className={`flex-1 rounded-lg px-3 py-2 text-xs leading-relaxed break-words whitespace-pre-wrap transition-colors ${
                      c.is_deleted
                        ? "bg-muted/30 text-muted-foreground italic"
                        : own
                          ? "bg-primary/10 text-foreground border border-primary/15"
                          : "bg-muted text-foreground"
                    }`}
                  >
                    {c.is_deleted ? "This comment was deleted" : c.comment}
                  </div>
                  {!c.is_deleted && canDelete && (
                    <button
                      type="button"
                      onClick={() => deleteComment(c.id)}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
                      title="Delete comment"
                      aria-label={`Delete comment by ${c.user_name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-3 flex items-end gap-2">
        <label htmlFor={inputId} className="sr-only">
          Add a comment
        </label>
        <Textarea
          id={inputId}
          value={input}
          onChange={(e) => { if (!sending) setInput(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment… (Enter to send, Shift+Enter for a new line)"
          rows={1}
          aria-disabled={sending || undefined}
          className="resize-none min-h-[38px] max-h-[120px] text-xs"
        />
        <Button
          type="button"
          onClick={addComment}
          disabled={!input.trim() || sending}
          aria-busy={sending}
          size="sm"
          className="shrink-0 h-9"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          )}
          {sending ? "Sending…" : "Add Comment"}
        </Button>
      </div>
    </section>
  );
}
