import { ChevronDown, ChevronUp } from "lucide-react";
import type {
  ClientSequenceSummary,
  CurrentSequenceInfo,
  SequenceEvent,
} from "@/utils/sequenceStatus";

interface Props {
  summary: ClientSequenceSummary;
  bankHistory: SequenceEvent[];
  statementHistory: SequenceEvent[];
  notesApprovalCount: number;
  showHistory?: boolean;
  onToggleHistory?: () => void;
}

function StatusPill({ status }: { status: "active" | "resolved" | null }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-warning/15 text-warning border border-warning/25">
        🟡 Active
      </span>
    );
  }
  if (status === "resolved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-success/15 text-success border border-success/25">
        ✅ Resolved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-muted text-muted-foreground border border-border">
      — None
    </span>
  );
}

function formatDate(ts: string | null): string {
  if (!ts) return "—";
  return ts.split(" ")[0] || "—";
}

function daysCell(info: CurrentSequenceInfo): string {
  if (info.status === "active" && info.daysActive !== null) {
    return `${info.daysActive} day${info.daysActive === 1 ? "" : "s"}`;
  }
  return "—";
}

function CurrentTable({ summary }: { summary: ClientSequenceSummary }) {
  const rows: { icon: string; name: string; info: CurrentSequenceInfo }[] = [
    { icon: "🔌", name: "Bank Reconnection", info: summary.bankReconnection },
    { icon: "📄", name: "Statement Request", info: summary.statementRequest },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Sequence</th>
              <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Status</th>
              <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Latest Start</th>
              <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Days Active</th>
              <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Total Triggers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2 text-foreground">
                  <span className="mr-1.5">{r.icon}</span>
                  {r.name}
                </td>
                <td className="px-3 py-2"><StatusPill status={r.info.status} /></td>
                <td className="px-3 py-2 font-mono-data text-muted-foreground">{formatDate(r.info.startedAt)}</td>
                <td className="px-3 py-2 font-mono-data text-muted-foreground">{daysCell(r.info)}</td>
                <td className="px-3 py-2 font-mono-data text-foreground">{r.info.triggerCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistoryGroup({
  icon,
  name,
  events,
}: {
  icon: string;
  name: string;
  events: SequenceEvent[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          <span className="mr-1.5">{icon}</span>{name}
        </span>
        <span className="text-[10.5px] text-muted-foreground">
          {events.length} trigger{events.length === 1 ? "" : "s"}
        </span>
      </div>
      {events.length === 0 ? (
        <div className="px-3 py-3 text-[11px] text-muted-foreground">No history</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">#</th>
                <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Started</th>
                <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Started By</th>
                <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Resolved</th>
                <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Resolved By</th>
                <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Days Open</th>
                <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Cycle</th>
              </tr>
            </thead>
            <tbody>
              {events
                .slice()
                .reverse()
                .map((e, i) => {
                  const num = events.length - i;
                  return (
                    <tr key={`${e.startedTs}-${i}`} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 font-mono-data text-muted-foreground">{num}</td>
                      <td className="px-3 py-2 font-mono-data text-foreground">{formatDate(e.startedAt)}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[140px]">{e.startedBy || "—"}</td>
                      <td className="px-3 py-2 font-mono-data">
                        {e.status === "resolved" ? (
                          <span className="text-success">{formatDate(e.resolvedAt)}</span>
                        ) : (
                          <span className="text-warning">Active</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[140px]">{e.resolvedBy || "—"}</td>
                      <td className="px-3 py-2 font-mono-data text-muted-foreground">
                        {e.daysOpen !== null ? `${e.daysOpen}d` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{e.cycleMonth || "—"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SequenceStatusTable({
  summary,
  bankHistory,
  statementHistory,
  notesApprovalCount,
  showHistory = false,
  onToggleHistory,
}: Props) {
  const totalHistory = bankHistory.length + statementHistory.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          Sequence Status
        </span>
        <span className="text-[10.5px] text-muted-foreground">· current state across all cycles</span>
        {notesApprovalCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-success/15 text-success border border-success/25">
            ✅ {notesApprovalCount} note{notesApprovalCount === 1 ? "" : "s"} approved
          </span>
        )}
      </div>

      <CurrentTable summary={summary} />

      {totalHistory > 0 && onToggleHistory && (
        <button
          onClick={onToggleHistory}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-muted/40 text-foreground border border-border hover:bg-muted/60 transition-colors"
        >
          {showHistory ? (
            <>Hide History <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>View Full History ({totalHistory}) <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}

      {showHistory && totalHistory > 0 && (
        <div className="space-y-3">
          <HistoryGroup icon="🔌" name="Bank Reconnection" events={bankHistory} />
          <HistoryGroup icon="📄" name="Statement Request" events={statementHistory} />
        </div>
      )}
    </div>
  );
}
