import { useEffect, useState } from "react";
import { MessageSquare, ChevronDown, Send } from "lucide-react";

interface Comment {
  author: string;
  role: string;
  text: string;
  time: string;
}

const SEED: Comment[] = [
  {
    author: "Alex",
    role: "Team Lead",
    text: "Reached out about the missing March bank statement, waiting on reply.",
    time: "2d ago",
  },
  {
    author: "Maria",
    role: "Bookkeeper",
    text: "Docs received, starting reconciliation now.",
    time: "1d ago",
  },
];

export default function InternalNotesSection({ clientKey }: { clientKey: string }) {
  const [open, setOpen] = useState(true);
  const [comments, setComments] = useState<Comment[]>(SEED);
  const [draft, setDraft] = useState("");

  // Reset per client
  useEffect(() => {
    setComments(SEED);
    setDraft("");
  }, [clientKey]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setComments((prev) => [
      ...prev,
      { author: "You", role: "Guest", text, time: "just now" },
    ]);
    setDraft("");
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            Internal Notes
          </span>
          <span className="text-[10.5px] text-muted-foreground">({comments.length})</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-2">
            {comments.map((c, i) => (
              <div
                key={i}
                className="rounded-md border border-border/60 bg-background/40 p-3"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[12px] font-semibold text-foreground">
                    {c.author}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {c.role}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground ml-auto">
                    {c.time}
                  </span>
                </div>
                <p className="text-[12.5px] text-foreground/90 leading-relaxed break-words">
                  {c.text}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Add an internal note…"
              className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-[12.5px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md text-[12px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 disabled:opacity-50 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
