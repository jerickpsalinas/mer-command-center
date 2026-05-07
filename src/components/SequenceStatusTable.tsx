import { ChevronDown, ChevronUp } from "lucide-react";
import type { ClientSequenceSummary, SequenceInfo, SequenceStatus } from "@/utils/sequenceStatus";

interface Props {
  summary: ClientSequenceSummary;
  showHistory?: boolean;
  allCycleSummaries?: ClientSequenceSummary[];
  onToggleHistory?: () => void;
}

function StatusPill({ status }: { status: SequenceStatus }) {
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
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold bg-success/15 text-success border border-success/25">
        ✅ Approved
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
  const datePart = ts.split(" ")[0];
  return datePart || "—";
}

function daysCell(info: SequenceInfo): string {
  if (info.status === "active" && info.daysActive !== null) {
    return `${info.daysActive} day${info.daysActive === 1 ? "" : "s"}`;
  }
  return "—";
}

function SequenceTable({ summary, label }: { summary: ClientSequenceSummary; label?: string }) {
  const rows: { icon: string; name: string; info: SequenceInfo }[] = [
    { icon: "🔌", name: "Bank Reconnection", info: summary.bankReconnection },
    { icon: "📄", name: "Statement Request", info: summary.statementRequest },
    { icon: "📝", name: "Notes Approval", info: summary.notesApproval },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {label && (
        <div className="px-3 py-2 bg-muted/30 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {label}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Sequence</th>
              <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Status</th>
              <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Started</th>
              <th className="text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Days Active</th>
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
                <td className="px-3 py-2 font-mono-data text-muted-foreground">{formatDate(r.info.startedDate)}</td>
                <td className="px-3 py-2 font-mono-data text-muted-foreground">{daysCell(r.info)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SequenceStatusTable({
  summary,
  showHistory = false,
  allCycleSummaries = [],
  onToggleHistory,
}: Props) {
  const past = allCycleSummaries.filter((s) => s.cycleMonth !== summary.cycleMonth);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          Sequence Status
        </span>
        <span className="text-[10.5px] text-muted-foreground">· {summary.cycleMonth}</span>
      </div>

      <SequenceTable summary={summary} />

      {past.length > 0 && onToggleHistory && (
        <button
          onClick={onToggleHistory}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-muted/40 text-foreground border border-border hover:bg-muted/60 transition-colors"
        >
          {showHistory ? (
            <>
              Hide History <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              View All History <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}

      {showHistory && past.length > 0 && (
        <div className="space-y-3">
          {past.map((s) => (
            <SequenceTable key={s.cycleMonth} summary={s} label={s.cycleMonth} />
          ))}
        </div>
      )}
    </div>
  );
}
