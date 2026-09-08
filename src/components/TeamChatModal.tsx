import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Trash2, X, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { FOCUS_RING, FOCUS_RING_INSET } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import EmptyState from "@/components/EmptyState";

export interface TeamChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

interface Props {
  open: boolean;
  minimized?: boolean;
  onMinimize?: () => void;
  onClose: () => void;
}

export default function TeamChatModal({ open, minimized = false, onMinimize, onClose }: Props) {
  const { user, profile, isDeveloper } = useAuth();
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Escape closes the panel while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus the composer when the panel opens (expanded)
  useEffect(() => {
    if (open && !minimized) {
      const id = requestAnimationFrame(() => textareaRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open, minimized]);

  // Mount/unmount with fade-scale animation
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [open]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Initial load + realtime subscription while open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("team_chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(500);
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        return;
      }
      setMessages((data ?? []) as TeamChatMessage[]);
      scrollToBottom();
    })();

    const channel = supabase
      .channel("team_chat_messages_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_chat_messages" },
        (payload) => {
          setMessages((prev) => {
            const incoming = payload.new as TeamChatMessage;
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
          scrollToBottom();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "team_chat_messages" },
        (payload) => {
          const updated = payload.new as TeamChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [open, scrollToBottom]);

  useEffect(() => {
    if (!minimized && open) scrollToBottom();
  }, [minimized, open, scrollToBottom]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user || sending) return;
    setSending(true);
    const userName = profile?.name || user.email || "Unknown";
    const userRole = profile?.role || "user";
    const { error } = await supabase.from("team_chat_messages").insert({
      user_id: user.id,
      user_name: userName,
      user_role: userRole,
      message: text,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setInput("");
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase
      .from("team_chat_messages")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  if (!mounted) return null;

  return (
    <div
      className={`fixed z-[35] bottom-[150px] right-6 max-lg:bottom-[calc(72px+env(safe-area-inset-bottom)+140px)] max-sm:right-3 max-sm:left-3 max-sm:w-auto w-[380px] rounded-xl border border-border bg-card shadow-elevated overflow-hidden flex flex-col transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-[0.97]"
      }`}
      style={{
        height: minimized ? "auto" : "min(520px, calc(100vh - 200px))",
        transformOrigin: "bottom right",
      }}

      role="dialog"
      aria-label="Team Chat"
    >
      {/* Header */}
      <div
        className={`px-4 py-3 border-b border-border flex items-center gap-2 shrink-0 bg-card ${minimized && onMinimize ? `cursor-pointer hover:bg-accent/40 transition-colors duration-150 ${FOCUS_RING_INSET}` : ""}`}
        onClick={minimized && onMinimize ? onMinimize : undefined}
        onKeyDown={
          minimized && onMinimize
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onMinimize();
                }
              }
            : undefined
        }
        role={minimized && onMinimize ? "button" : undefined}
        tabIndex={minimized && onMinimize ? 0 : undefined}
        title={minimized ? "Click to restore" : undefined}
      >
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold flex-1">Team Chat</h3>
        {onMinimize && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className={`h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150 ${FOCUS_RING}`}
            title={minimized ? "Restore" : "Minimize"}
            aria-label={minimized ? "Restore chat" : "Minimize chat"}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150 ${FOCUS_RING}`}
          title="Close"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>


      {!minimized && (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin" aria-live="polite">
            {messages.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                size="sm"
                title="No messages yet"
                hint="Start the conversation with your team."
                className="h-full"
              />
            ) : (
              messages.map((m) => {
                const own = m.user_id === user?.id;
                const canDelete = own || isDeveloper;
                return (
                  <div
                    key={m.id}
                    className={`group flex flex-col ${own ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 px-1 mb-0.5">
                      <span className="text-[11px] font-semibold text-foreground">
                        {m.user_name}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                        {m.user_role}
                      </span>
                      <span className="text-[10px] font-mono-data tabular-nums text-muted-foreground">
                        · <time dateTime={m.created_at}>{timeAgo(m.created_at)}</time>
                      </span>
                    </div>
                    <div className="flex items-end gap-1 max-w-[80%]">
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${
                          m.is_deleted
                            ? "bg-muted/40 text-muted-foreground italic"
                            : own
                              ? "bg-primary/15 text-foreground border border-primary/20"
                              : "bg-muted text-foreground"
                        }`}
                      >
                        {m.is_deleted ? "🚫 This message was deleted" : m.message}
                      </div>
                      {!m.is_deleted && canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(m.id)}
                          className={`opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-[opacity,color,background-color] duration-150 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 ${FOCUS_RING}`}
                          title="Delete message"
                          aria-label="Delete message"
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

          {/* Composer */}
          <div className="border-t border-border p-3 flex items-end gap-2 shrink-0">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              aria-label="Message"
              rows={1}
              className="resize-none min-h-[40px] max-h-[120px]"
            />
            <Button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              size="icon"
              className="shrink-0"
              title="Send"
              aria-label={sending ? "Sending message" : "Send message"}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
