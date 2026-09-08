import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Grid3x3, Search } from "lucide-react";
import { buildComplianceHeatmap } from "@/lib/insights";
import type { MerHistoryRow } from "@/services/googleSheets";
import { cn, CARD, CARD_TITLE } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

interface Props {
  history: MerHistoryRow[];
}

// Theme-token scale so the heatmap tracks the active (dark/light) palette.
const SCALE = [
  { label: "0–24%", color: "hsl(var(--destructive) / 0.9)" },
  { label: "25–49%", color: "hsl(var(--destructive) / 0.5)" },
  { label: "50–69%", color: "hsl(var(--warning) / 0.8)" },
  { label: "70–89%", color: "hsl(var(--success) / 0.5)" },
  { label: "90–100%", color: "hsl(var(--success) / 0.9)" },
  { label: "No data", color: "hsl(var(--muted))" },
] as const;

function cellStyle(pct: number | null): { backgroundColor: string } {
  const s =
    pct === null ? SCALE[5]
      : pct >= 90 ? SCALE[4]
        : pct >= 70 ? SCALE[3]
          : pct >= 50 ? SCALE[2]
            : pct >= 25 ? SCALE[1]
              : SCALE[0];
  return { backgroundColor: s.color };
}

export default function ComplianceHeatmap({ history }: Props) {
  const [search, setSearch] = useState("");
  const { clients, months, cells } = useMemo(() => buildComplianceHeatmap(history), [history]);

  const filtered = clients.filter((c) => c.toLowerCase().includes(search.toLowerCase()));

  if (months.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(CARD, "p-3 sm:p-5")}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className={CARD_TITLE}>
            <Grid3x3 className="h-4 w-4 text-primary" aria-hidden />
            Compliance Heatmap
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
            {filtered.length} clients × {months.length} months — color = completion %
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 min-h-[40px] text-sm w-full sm:w-60 focus-within:ring-2 focus-within:ring-ring transition-colors duration-150">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter clients…"
            aria-label="Filter heatmap clients"
            className="bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground w-full min-w-0"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          size="sm"
          title="No matching clients"
          hint="Try a different name or clear the filter"
        />
      ) : (
        <div className="overflow-x-auto min-w-0 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent -mx-2 px-2">
          <table className="border-separate border-spacing-1 min-w-full">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-card text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 min-w-[180px]">
                  Client
                </th>
                {months.map((m) => (
                  <th key={m} scope="col" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 py-1 text-center whitespace-nowrap">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client}>
                  <th scope="row" className="sticky left-0 z-10 bg-card text-xs font-medium text-foreground text-left pr-3 py-1 align-middle truncate max-w-[200px]" title={client}>
                    {client}
                  </th>
                  {months.map((m) => {
                    const cell = cells.get(`${client}::${m}`);
                    const pct = cell?.completionPct ?? null;
                    return (
                      <td key={m} className="px-0.5">
                        <div
                          title={cell ? `${client} · ${m}: ${pct}% (${cell.status})` : `${client} · ${m}: no data`}
                          className={`h-7 w-12 rounded-md flex items-center justify-center text-[10px] font-mono-data tabular-nums font-semibold cursor-default transition-transform duration-150 hover:scale-110 ${pct === null ? "text-muted-foreground" : "text-foreground"}`}
                          style={cellStyle(pct)}
                        >
                          {pct !== null ? `${pct}` : "—"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Legend:</span>
        {SCALE.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-sm" style={{ backgroundColor: l.color }} aria-hidden />
            {l.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
