import StatusBadge from "@/components/StatusBadge";
import { useState } from "react";
import { Search, AlertTriangle, ArrowUpDown, BarChart3, History, X, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSheetData, getClientHistory } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SortKey = "name" | "completionPct" | "complianceStatus" | "uncategorizedTransactions";
type SortDir = "asc" | "desc";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg border border-border bg-card shadow-elevated text-foreground">
      <p className="text-xs font-semibold mb-0.5">{payload[0]?.payload?.full || label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[11px] text-muted-foreground">
          {p.name}: <span className="font-mono-data font-semibold text-foreground">{p.value}%</span>
        </p>
      ))}
    </div>
  );
};

function getIssueDetails(c: { uncategorizedTransactions: number; bankTransactions: string; unappliedPayments: number; prevMonthNotesApproved: boolean }) {
  const issues: string[] = [];
  if (c.uncategorizedTransactions > 0) issues.push(`${c.uncategorizedTransactions} uncategorized txns`);
  if (c.bankTransactions.includes("Missing")) issues.push("Missing bank statements");
  if (c.unappliedPayments > 0) issues.push(`${c.unappliedPayments} unapplied payments`);
  if (!c.prevMonthNotesApproved) issues.push("Notes not approved");
  return issues;
}

export default function ClientsPage() {
  const { data, isLoading, error } = useSheetData();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("completionPct");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "completionPct" ? "asc" : "desc"); }
  };

  const filtered = data.clients
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      if (sortKey === "completionPct") return mul * (a.completionPct - b.completionPct);
      if (sortKey === "complianceStatus") return mul * a.complianceStatus.localeCompare(b.complianceStatus);
      if (sortKey === "uncategorizedTransactions") return mul * (a.uncategorizedTransactions - b.uncategorizedTransactions);
      return 0;
    });

  const chartData = [...data.clients]
    .sort((a, b) => a.completionPct - b.completionPct)
    .slice(0, 15)
    .map(c => ({ name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name, pct: c.completionPct, full: c.name }));

  const getBarColor = (pct: number) => {
    if (pct >= 80) return "hsl(160, 55%, 42%)";
    if (pct >= 50) return "hsl(38, 70%, 50%)";
    return "hsl(0, 65%, 50%)";
  };

  const sortButtons: { key: SortKey; label: string }[] = [
    { key: "completionPct", label: "Completion %" },
    { key: "name", label: "Name" },
    { key: "complianceStatus", label: "Status" },
    { key: "uncategorizedTransactions", label: "Uncat. Txns" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        whileHover={{ scale: 1.003 }}
        className="rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
        <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Lowest Completion % Clients
        </h2>
        <p className="text-[11px] text-muted-foreground mb-4">Bottom {chartData.length} clients by completion percentage</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 8%, 16%)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(25, 10%, 50%)" }} unit="%" />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: "hsl(25, 10%, 50%)" }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(20, 8%, 14%)" }} />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]} name="Completion %">
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm w-64">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mr-1">Sort:</span>
          {sortButtons.map(s => (
            <button key={s.key} onClick={() => toggleSort(s.key)}
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md border transition-colors ${
                sortKey === s.key
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}>
              {s.label}
              {sortKey === s.key && <ArrowUpDown className="h-3 w-3" />}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} clients</span>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c, i) => {
          const issues = getIssueDetails(c);
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.015 }}
              whileHover={{ scale: 1.01, y: -2 }}
              className="rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground leading-tight">{c.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.clientType} · {c.bookkeeper}</p>
                </div>
                <StatusBadge status={c.complianceStatus} />
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-mono-data font-semibold text-foreground">{c.completionPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${c.completionPct}%`, backgroundColor: getBarColor(c.completionPct) }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Last Reconciled</span><p className="font-mono-data text-foreground">{c.lastReconciledDate || "—"}</p></div>
                <div><span className="text-muted-foreground">Uncat. Txns</span><p className="font-mono-data text-foreground">{c.uncategorizedTransactions}</p></div>
              </div>
              {issues.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/50">
                  <div className="flex items-center gap-1 text-xs text-destructive mb-1.5">
                    <AlertTriangle className="h-3 w-3" /><span className="font-semibold">{issues.length} issue{issues.length > 1 ? "s" : ""} found</span>
                  </div>
                  <ul className="space-y-0.5">
                    {issues.map((issue, idx) => (
                      <li key={idx} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-destructive/60 shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
