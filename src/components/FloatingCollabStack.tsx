import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, MessageCircle, X, Send } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const SEED_NOTICES: Notice[] = [
  {
    id: "n1",
    title: "New Feature: Monthly Trends",
    message:
      "You can now view 6-month compliance trends per client from the Reports tab.",
    time: "2h ago",
    read: false,
  },
  {
    id: "n2",
    title: "Scheduled Maintenance",
    message:
      "Portal will have brief downtime Sunday 2AM–3AM EST for routine updates.",
    time: "1d ago",
    read: false,
  },
  {
    id: "n3",
    title: "Reminder: Month-End Checklist",
    message:
      "Please confirm all client MER statuses are updated before the 5th.",
    time: "3d ago",
    read: true,
  },
  {
    id: "n4",
    title: "Welcome to the Team!",
    message:
      "New bookkeeper onboarding materials are now available in the User Guide tab.",
    time: "1w ago",
    read: true,
  },
  {
    id: "n5",
    title: "Dashboard Performance Improved",
    message: "Load times across all pages have been optimized.",
    time: "2w ago",
    read: true,
  },
];

interface ChatMsg {
  author: string;
  role: string;
  text: string;
  time: string;
}

const SEED_CHAT: ChatMsg[] = [
  {
    author: "Maria",
    role: "Bookkeeper",
    text: "Morning! Greenfield's March statements are ready for review.",
    time: "9:02 AM",
  },
  {
    author: "Alex",
    role: "Team Lead",
    text: "Great, thank you! I'll take a look this afternoon.",
    time: "9:05 AM",
  },
  {
    author: "Maria",
    role: "Bookkeeper",
    text: "Also flagged one client as at-risk — details in the Clients tab.",
    time: "9:06 AM",
  },
  {
    author: "Alex",
    role: "Team Lead",
    text: "Got it, I'll follow up with them today.",
    time: "9:10 AM",
  },
];

type PanelKey = "notif" | "chat" | null;

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
      {role}
    </span>
  );
}

export default function FloatingCollabStack() {
  const [panel, setPanel] = useState<PanelKey>(null);
  const [notices, setNotices] = useState<Notice[]>(SEED_NOTICES);
  const [messages, setMessages] = useState<ChatMsg[]>(SEED_CHAT);
  const [draft, setDraft] = useState("");

  const unread = notices.filter((n) => !n.read).length;

  const toggle = (k: Exclude<PanelKey, null>) =>
    setPanel((p) => (p === k ? null : k));

  const markRead = (id: string) =>
    setNotices((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    setMessages((prev) => [
      ...prev,
      { author: "You", role: "Guest", text, time },
    ]);
    setDraft("");
  };

  return (
    <div className="fixed z-50 right-4 bottom-[88px] lg:bottom-6 flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {panel === "notif" && (
          <motion.div
            key="notif"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-[13px] font-semibold text-foreground">
                  Notifications
                </span>
                {unread > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">
                    {unread} new
                  </span>
                )}
              </div>
              <button
                onClick={() => setPanel(null)}
                className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent divide-y divide-border/60">
              {notices.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    n.read
                      ? "hover:bg-accent/40"
                      : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12.5px] font-semibold text-foreground truncate">
                          {n.title}
                        </p>
                        <span className="text-[10.5px] text-muted-foreground shrink-0">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                        {n.message}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {panel === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto w-[340px] max-w-[calc(100vw-2rem)] h-[420px] rounded-xl border border-border bg-popover shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <span className="text-[13px] font-semibold text-foreground">
                  Team Chat
                </span>
              </div>
              <button
                onClick={() => setPanel(null)}
                className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent px-3 py-3 space-y-2.5">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border/60 bg-background/40 p-2.5"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[12px] font-semibold text-foreground">
                      {m.author}
                    </span>
                    <RoleBadge role={m.role} />
                    <span className="text-[10.5px] text-muted-foreground ml-auto">
                      {m.time}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-foreground/90 leading-relaxed break-words">
                    {m.text}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-2 flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type a message…"
                className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-[12.5px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                onClick={send}
                disabled={!draft.trim()}
                className="h-9 w-9 flex items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 disabled:opacity-50 transition-colors"
                title="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto flex flex-col gap-3">
        <button
          onClick={() => toggle("notif")}
          className={`relative h-12 w-12 rounded-full border shadow-lg flex items-center justify-center transition-all ${
            panel === "notif"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-popover text-foreground border-border hover:bg-accent"
          }`}
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
              {unread}
            </span>
          )}
        </button>
        <button
          onClick={() => toggle("chat")}
          className={`relative h-12 w-12 rounded-full border shadow-lg flex items-center justify-center transition-all ${
            panel === "chat"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-popover text-foreground border-border hover:bg-accent"
          }`}
          title="Team Chat"
          aria-label="Team Chat"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
