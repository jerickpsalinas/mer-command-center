import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Grid3x3, Search } from "lucide-react";
import { buildComplianceHeatmap } from "@/lib/insights";
import type { MerHistoryRow } from "@/services/googleSheets";

interface Props {
  history: MerHistoryRow[];
}

function cellColor(pct: number | null): string {
  if (pct === null) return "hsl(20, 8%, 16%)"; // muted slate for missing
  if (pct >= 90) return "hsl(160, 60%, 38%)";
  if (pct >= 70) return "hsl(160, 55%, 50%)";
  if (pct >= 50) return "hsl(38, 75%, 55%)";
  if (pct >= 25) return "hsl(20, 80%, 55%)";
  return "hsl(0, 70%, 50%)";
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
      className="rounded-xl border border-border bg-card p-3 sm:p-5 shadow-card"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Grid3x3 className="h-4 w-4 text-primary" />
            Compliance Heatmap
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {filtered.length} clients × {months.length} months — color = completion %
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-sm w-full sm:w-60">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter clients…"
            className="bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="border-separate border-spacing-1 min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 min-w-[180px]">
                Client
              </th>
              {months.map((m) => (
                <th key={m} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 py-1 text-center whitespace-nowrap">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((client) => (
              <tr key={client}>
                <td className="sticky left-0 z-10 bg-card text-xs font-medium text-foreground pr-3 py-1 align-middle truncate max-w-[200px]">
                  {client}
                </td>
                {months.map((m) => {
                  const cell = cells.get(`${client}::${m}`);
                  const pct = cell?.completionPct ?? null;
                  return (
                    <td key={m} className="px-0.5">
                      <div
                        title={cell ? `${client} · ${m}: ${pct}% (${cell.status})` : `${client} · ${m}: no data`}
                        className="h-7 w-12 rounded-md flex items-center justify-center text-[10px] font-mono-data font-semibold text-white/95 cursor-default transition-transform hover:scale-110"
                        style={{ backgroundColor: cellColor(pct), opacity: pct === null ? 0.25 : 1 }}
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Legend:</span>
        {[
          { label: "0–24%", color: "hsl(0, 70%, 50%)" },
          { label: "25–49%", color: "hsl(20, 80%, 55%)" },
          { label: "50–69%", color: "hsl(38, 75%, 55%)" },
          { label: "70–89%", color: "hsl(160, 55%, 50%)" },
          { label: "90–100%", color: "hsl(160, 60%, 38%)" },
          { label: "No data", color: "hsl(20, 8%, 16%)", opacity: 0.4 },
        ].map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-sm" style={{ backgroundColor: l.color, opacity: l.opacity ?? 1 }} />
            {l.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
