import { useMemo } from "react";
import { Clock } from "lucide-react";
import type { ActionLogEntry, MerHistoryRow } from "@/services/googleSheets";
import { useDeveloperFilter } from "@/hooks/useDeveloperFilter";

interface ActivityRow {
  id: string;
  ts: number;
  who: string;
  client: string;
  action: string;
  source: "Dashboard" | "Action Log" | "MER";
  ok?: boolean;
}

const timeAgo = (ms: number): string => {
  const diff = Date.now() - ms;
  if (!Number.isFinite(diff) || diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

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
  const { isDeveloper } = useDeveloperFilter();
  const dashActions: ActivityRow[] = useMemo(
    () =>
      (actionLog ?? []).slice(0, 5).map((a, i) => ({
        id: `db-${i}-${a.timestamp}`,
        ts: a.timestamp ? Date.parse(a.timestamp) : 0,
        who: a.triggeredBy || "Dashboard",
        client: a.clientName || "—",
        action: a.actionType || "action",
        source: "Dashboard" as const,
        ok: a.status !== "error",
      })),
    [actionLog]
  );

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
      .filter((r) => r.who && !isDeveloper(r.who))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit);
  }, [dashActions, actionLog, merHistory, isDeveloper, limit]);

  return (
    <div className="border-t border-border px-4 sm:px-6 py-4">
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" /> Recent Activity
      </h3>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-start gap-2.5 py-1.5 rounded-md hover:bg-accent/20 -mx-1 px-1 transition-colors"
          >
            <div
              className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                r.ok === false ? "bg-destructive" : "bg-success"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${sourceColor[r.source]}`}
                >
                  {r.source}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{timeAgo(r.ts)}</span>
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
        {rows.length === 0 && <p className="text-xs text-muted-foreground">No recent activity</p>}
      </div>
    </div>
  );
}
