import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { focusForBookkeeper, type FocusItem } from "@/lib/focus";
import { cn } from "@/lib/utils";

const urgencyStyles = {
  late: "bg-destructive-soft text-destructive border-destructive/20",
  soon: "bg-warning-soft text-warning-ink border-warning/20",
  ok: "bg-muted text-muted-foreground border-border",
};

function deadlineLabel(item: FocusItem) {
  if (item.daysLate > 0) return `${item.daysLate}d late`;
  if (item.daysLate === 0) return "Due today";
  const date = new Date(`${item.dueDate}T00:00:00Z`);
  return `Due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

export default function TodaysFocus({ items, month, loading = false }: { items: FocusItem[]; month: string; loading?: boolean }) {
  const { profile } = useAuth();
  const [preferMine, setPreferMine] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const mine = focusForBookkeeper(items, profile?.name || "");
  const myClients = preferMine && mine.length > 0;
  const filtered = myClients ? mine : items;
  const visible = expanded ? filtered : filtered.slice(0, 8);

  return (
    <section aria-labelledby="todays-focus-title" className="border-y border-border py-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-sm text-gold-foreground font-semibold mb-1">{month} close</p>
          <h3 id="todays-focus-title" className="font-display text-xl text-plum">
            Today’s Focus <span className="text-muted-foreground font-sans text-base">· {filtered.length} clients need work</span>
          </h3>
        </div>
        <div className="flex gap-1 border border-border rounded-md bg-card p-1" aria-label="Focus clients">
          <Button size="sm" variant={!myClients ? "secondary" : "ghost"} aria-pressed={!myClients} onClick={() => { setPreferMine(false); setExpanded(false); }}>All</Button>
          <Button size="sm" variant={myClients ? "secondary" : "ghost"} aria-pressed={myClients} disabled={mine.length === 0} onClick={() => { setPreferMine(true); setExpanded(false); }}><ListFilter aria-hidden />My clients</Button>
        </div>
      </div>
      {loading ? <p role="status" className="py-6 text-muted-foreground">Loading current close clients…</p> : filtered.length === 0 ? (
        <div className="flex items-center gap-3 py-6 text-success">
          <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden />
          <p className="text-base font-medium">🎉 All clients complete for {month}!</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visible.map((item) => (
            <Button key={item.id} variant="ghost" asChild className="h-auto w-full justify-start whitespace-normal rounded-none px-2 py-4 text-left hover:bg-card">
              <Link to={`/clients?${new URLSearchParams(item.id !== item.name ? { client: item.id } : { q: item.name }).toString()}`} aria-label={`Open details for ${item.name}`}>
                <div className="grid w-full min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-3 lg:gap-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-foreground break-words">{item.name}</span>
                      {item.closeGroup === "Second" && <span className="rounded border border-gold/40 bg-gold-soft px-2 py-0.5 text-sm text-gold-foreground">2nd Close</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 break-words">{item.bookkeeper || "Unassigned"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-plum mb-2 break-words">Stage {item.stageLabel}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={item.percent} className="h-1.5" aria-label={`${item.name} stage progress`} />
                      <span className="text-sm font-mono-data text-muted-foreground w-12 shrink-0 text-right">{item.percent}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground break-words min-w-0">{item.nextStep}</p>
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded border px-2 py-1 text-sm whitespace-nowrap", urgencyStyles[item.urgency])}>
                      <Clock className="h-3.5 w-3.5" aria-hidden />{deadlineLabel(item)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gold-foreground shrink-0" aria-hidden />
                  </div>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      )}
      {!loading && filtered.length > 8 && <Button variant="link" className="mt-2 px-0" onClick={() => setExpanded(!expanded)}>{expanded ? "Show top 8" : `View all ${filtered.length}`}<ArrowRight aria-hidden /></Button>}
    </section>
  );
}