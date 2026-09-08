import { useEffect, useMemo, useState } from "react";
import { Clock, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ActionLogEntry, MerHistoryRow } from "@/services/googleSheets";
import { timeAgo } from "@/lib/time";


interface ActivityRow {
  id: string;
  ts: number;
  who: string;
  client: string;
  action: string;
  source: "Dashboard" | "Action Log" | "MER";
  ok?: boolean;
}

const sourceColor: Record<ActivityRow["source"], string> = {
  Dashboard: "text-primary bg-primary/10",
  "Action Log": "text-warning bg-warning/10",
  MER: "text-success bg-success/10",
};

export default function RecentActivityFeed({
  actionLog,
  merHistory,
  limit = 8,
}: {
  actionLog: ActionLogEntry[];
  merHistory: MerHistoryRow[];
  limit?: number;
}) {
  
  const [dashActions, setDashActions] = useState<ActivityRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("id,action,client_name,triggered_by,success,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled || !data) return;
      setDashActions(
        data.map((r) => ({
          id: `db-${r.id}`,
          ts: r.created_at ? Date.parse(r.created_at) : 0,
          who: r.triggered_by || "Dashboard",
          client: r.client_name || "—",
          action: r.action || "action",
          source: "Dashboard" as const,
          ok: r.success !== false,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo<ActivityRow[]>(() => {
    const out: ActivityRow[] = [...dashActions];

    for (const a of actionLog ?? []) {
      const ts = a.timestamp ? Date.parse(a.timestamp) : 0;
      if (!ts) continue;
      out.push({
        id: `al-${a.ghlContactId}-${a.timestamp}-${a.actionType}`,
        ts,
        who: a.triggeredBy || "System",
        client: a.clientName || "—",
        action: a.actionType,
        source: "Action Log",
      });
    }

    for (const r of merHistory ?? []) {
      const ts = r.timestampMs;
      if (!ts) continue;
      out.push({
        id: `mh-${r.name}-${ts}`,
        ts,
        who: r.submittedBy || r.bookkeeper || "Bookkeeper",
        client: r.name,
        action: "MER submission",
        source: "MER",
      });
    }

    return out
      .filter((r) => !!r.who)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit);
  }, [dashActions, actionLog, merHistory, limit]);

  return (
    <div className="border-t border-border px-4 sm:px-6 py-4">
      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" aria-hidden /> Recent Activity
      </h4>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-start gap-2.5 py-1.5 rounded-md hover:bg-accent/20 -mx-1 px-1 transition-colors duration-150"
          >
            <div
              className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                r.ok === false ? "bg-destructive" : "bg-success"
              }`}
              aria-label={r.ok === false ? "Failed" : "Succeeded"}
              role="img"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${sourceColor[r.source]}`}
                >
                  {r.source}
                </span>
                <time
                  className="text-[10px] text-muted-foreground font-mono-data tabular-nums"
                  dateTime={new Date(r.ts).toISOString()}
                  title={new Date(r.ts).toLocaleString()}
                >
                  {timeAgo(r.ts)}
                </time>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed break-words">
                <span className="text-foreground font-medium">{r.who}</span>{" "}
                <span className="text-muted-foreground">{r.action}</span>
                {r.client && r.client !== "—" && (
                  <>
                    {" "}
                    on <span className="text-foreground font-medium">{r.client}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-6">
            <Inbox className="h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden />
            <p className="text-sm font-medium text-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-0.5">Submissions and actions will show up here</p>
          </div>
        )}
      </div>
    </div>
  );
}
