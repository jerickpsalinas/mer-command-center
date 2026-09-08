import { ChevronDown, ChevronUp, CheckCircle2, CircleDot, Minus, History } from "lucide-react";
import type {
  ClientSequenceSummary,
  CurrentSequenceInfo,
  SequenceEvent,
} from "@/utils/sequenceStatus";

interface Props {
  summary: ClientSequenceSummary;
  bankHistory: SequenceEvent[];
  statementHistory: SequenceEvent[];
  docsHistory: SequenceEvent[];
  notesApprovalCount: number;
  showHistory?: boolean;
  onToggleHistory?: () => void;
}

function StatusPill({ status }: { status: "active" | "resolved" | null }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-warning/15 text-warning border border-warning/25 whitespace-nowrap">
        <CircleDot className="h-3 w-3" aria-hidden /> Active
      </span>
    );
  }
  if (status === "resolved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-success/15 text-success border border-success/25 whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3" aria-hidden /> Resolved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-muted text-muted-foreground border border-border whitespace-nowrap">
      <Minus className="h-3 w-3" aria-hidden /> None
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

const TH_BASE =
  "text-xs font-medium uppercase tracking-wider text-muted-foreground px-3 py-2 whitespace-nowrap sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border";
const TH_L = `${TH_BASE} text-left`;
const TH_R = `${TH_BASE} text-right`;
const NUM = "font-mono-data tabular-nums text-right";

function CurrentTable({ summary }: { summary: ClientSequenceSummary }) {
  const rows: { icon: string; name: string; info: CurrentSequenceInfo }[] = [
    { icon: "🔌", name: "Bank Reconnection", info: summary.bankReconnection },
    { icon: "📄", name: "Statement Request", info: summary.statementRequest },
    { icon: "📁", name: "Document Request", info: summary.docsRequest },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th scope="col" className={TH_L}>Sequence</th>
              <th scope="col" className={TH_L}>Status</th>
              <th scope="col" className={TH_L}>Latest Start</th>
              <th scope="col" className={TH_R}>Days Active</th>
              <th scope="col" className={TH_R}>Total Triggers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors duration-150">
                <td className="px-3 py-2 text-foreground whitespace-nowrap">
                  <span className="mr-1.5" aria-hidden>{r.icon}</span>
                  {r.name}
                </td>
                <td className="px-3 py-2"><StatusPill status={r.info.status} /></td>
                <td className="px-3 py-2 font-mono-data tabular-nums text-muted-foreground whitespace-nowrap">{formatDate(r.info.startedAt)}</td>
                <td className={`px-3 py-2 ${NUM} whitespace-nowrap ${r.info.status === "active" ? "text-warning" : "text-muted-foreground"}`}>{daysCell(r.info)}</td>
                <td className={`px-3 py-2 ${NUM} text-foreground`}>{r.info.triggerCount}</td>
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
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-foreground truncate">
          <span className="mr-1.5" aria-hidden>{icon}</span>{name}
        </h3>
        <span className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold font-mono-data tabular-nums bg-muted text-muted-foreground border border-border">
          {events.length} trigger{events.length === 1 ? "" : "s"}
        </span>
      </div>
      {events.length === 0 ? (
        <div className="flex flex-col items-center text-center px-3 py-6">
          <History className="h-6 w-6 text-muted-foreground mb-2" aria-hidden />
          <p className="text-xs font-semibold text-foreground">No history</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">This sequence has never been triggered.</p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th scope="col" className={TH_R}>#</th>
                <th scope="col" className={TH_L}>Started</th>
                <th scope="col" className={TH_L}>Started By</th>
                <th scope="col" className={TH_L}>Resolved</th>
                <th scope="col" className={TH_L}>Resolved By</th>
                <th scope="col" className={TH_R}>Days Open</th>
                <th scope="col" className={TH_L}>Cycle</th>
              </tr>
            </thead>
            <tbody>
              {events
                .slice()
                .reverse()
                .map((e, i) => {
                  const num = events.length - i;
                  return (
                    <tr key={`${e.startedTs}-${i}`} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors duration-150">
                      <td className={`px-3 py-2 ${NUM} text-muted-foreground`}>{num}</td>
                      <td className="px-3 py-2 font-mono-data tabular-nums text-foreground whitespace-nowrap">{formatDate(e.startedAt)}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[140px]" title={e.startedBy || undefined}>{e.startedBy || "—"}</td>
                      <td className="px-3 py-2 font-mono-data tabular-nums whitespace-nowrap">
                        {e.status === "resolved" ? (
                          <span className="text-success">{formatDate(e.resolvedAt)}</span>
                        ) : (
                          <span className="text-warning">Active</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[140px]" title={e.resolvedBy || undefined}>{e.resolvedBy || "—"}</td>
                      <td className={`px-3 py-2 ${NUM} text-muted-foreground whitespace-nowrap`}>
                        {e.daysOpen !== null ? `${e.daysOpen}d` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]" title={e.cycleMonth || undefined}>{e.cycleMonth || "—"}</td>
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
  docsHistory,
  notesApprovalCount,
  showHistory = false,
  onToggleHistory,
}: Props) {
  const totalHistory = bankHistory.length + statementHistory.length + docsHistory.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-xs font-medium uppercase tracking-wider text-foreground">
          Sequence Status
        </h3>
        <span className="text-[10.5px] text-muted-foreground">· current state across all cycles</span>
        {notesApprovalCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-success/15 text-success border border-success/25 whitespace-nowrap">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            <span className="font-mono-data tabular-nums">{notesApprovalCount}</span> note{notesApprovalCount === 1 ? "" : "s"} approved
          </span>
        )}
      </div>

      <CurrentTable summary={summary} />

      {totalHistory > 0 && onToggleHistory && (
        <button
          type="button"
          onClick={onToggleHistory}
          aria-expanded={showHistory}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 min-h-9 rounded-md bg-muted/40 text-foreground border border-border hover:bg-muted/60 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {showHistory ? (
            <>Hide History <ChevronUp className="h-3 w-3" aria-hidden /></>
          ) : (
            <>View Full History (<span className="font-mono-data tabular-nums">{totalHistory}</span>) <ChevronDown className="h-3 w-3" aria-hidden /></>
          )}
        </button>
      )}

      {showHistory && totalHistory > 0 && (
        <div className="space-y-3">
          <HistoryGroup icon="🔌" name="Bank Reconnection" events={bankHistory} />
          <HistoryGroup icon="📄" name="Statement Request" events={statementHistory} />
          <HistoryGroup icon="📁" name="Document Request" events={docsHistory} />
        </div>
      )}
    </div>
  );
}
