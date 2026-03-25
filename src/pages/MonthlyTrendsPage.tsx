import { useState } from "react";
import KPICard from "@/components/KPICard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useSheetData } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";

export default function MonthlyTrendsPage() {
  const { data, isLoading, error } = useSheetData();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [compareMonth, setCompareMonth] = useState<number | null>(null);

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  const { monthlyTrends } = data;
  const idx = selectedMonth ?? monthlyTrends.length - 1;
  const compIdx = compareMonth ?? (idx > 0 ? idx - 1 : null);
  const current = monthlyTrends[idx];
  const previous = compIdx !== null && compIdx !== idx ? monthlyTrends[compIdx] : null;
  const compDiff = previous ? current.compliant - previous.compliant : 0;
  const pctDiff = previous ? current.completionPct - previous.completionPct : 0;

  const handleDownloadCSV = () => {
    const headers = ["Month", "Compliant", "Non-Compliant", "Completion %"];
    const rows = monthlyTrends.map(t => [t.month, t.compliant, t.nonCompliant, t.completionPct]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "monthly-trends.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">Month:</label>
          <select value={idx} onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground">
            {monthlyTrends.map((t, i) => <option key={t.month} value={i}>{t.month}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">Compare to:</label>
          <select
            value={compIdx ?? ""}
            onChange={(e) => setCompareMonth(e.target.value === "" ? null : Number(e.target.value))}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">None</option>
            {monthlyTrends.map((t, i) => i !== idx ? <option key={t.month} value={i}>{t.month}</option> : null)}
          </select>
        </div>
        {previous && (
          <span className="text-xs text-muted-foreground">
            Comparing <span className="text-foreground font-medium">{current.month}</span> vs <span className="text-foreground font-medium">{previous.month}</span>
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={handleDownloadCSV}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download CSV
        </button>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Compliant" value={current.compliant} icon={CheckCircle2} variant="success"
          trend={previous ? `${compDiff >= 0 ? "+" : ""}${compDiff} vs ${previous.month}` : undefined} index={0} />
        <KPICard title="Non-Compliant" value={current.nonCompliant} icon={XCircle} variant="destructive"
          trend={previous ? `${(current.nonCompliant - previous.nonCompliant) >= 0 ? "+" : ""}${current.nonCompliant - previous.nonCompliant} vs ${previous.month}` : undefined} index={1} />
        <KPICard title="Completion %" value={`${current.completionPct}%`} icon={TrendingUp}
          trend={previous ? `${pctDiff >= 0 ? "+" : ""}${pctDiff}pp vs ${previous.month}` : undefined} index={2} />
        <KPICard title="Trend" value={previous ? (pctDiff >= 0 ? "Improving" : "Declining") : "—"} icon={pctDiff >= 0 ? TrendingUp : TrendingDown}
          variant={!previous ? undefined : pctDiff >= 0 ? "success" : "destructive"} index={3} />
      </div>

      {/* Comparison detail table */}
      {previous && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Month-over-Month Comparison: {current.month} vs {previous.month}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Compliant", curr: current.compliant, prev: previous.compliant, suffix: "" },
              { label: "Non-Compliant", curr: current.nonCompliant, prev: previous.nonCompliant, suffix: "" },
              { label: "Completion", curr: current.completionPct, prev: previous.completionPct, suffix: "%" },
            ].map(({ label, curr, prev, suffix }) => {
              const diff = curr - prev;
              return (
                <div key={label} className="rounded-lg border border-border bg-muted/20 p-4 text-center">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono-data text-lg text-muted-foreground">{prev}{suffix}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono-data text-lg font-bold text-foreground">{curr}{suffix}</span>
                  </div>
                  <p className={`text-xs font-semibold mt-1 ${diff > 0 ? (label === "Non-Compliant" ? "text-destructive" : "text-success") : diff < 0 ? (label === "Non-Compliant" ? "text-success" : "text-destructive") : "text-muted-foreground"}`}>
                    {diff > 0 ? "+" : ""}{diff}{suffix === "%" ? "pp" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">Compliance Over Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
              <Legend />
              <Line type="monotone" dataKey="compliant" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} name="Compliant" />
              <Line type="monotone" dataKey="nonCompliant" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} name="Non-Compliant" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">Completion % by Month</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
              <Bar dataKey="completionPct" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Completion %" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-lg border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-2.5">Month</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-2.5">Compliant</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-2.5">Non-Compliant</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-2.5">Completion %</th>
            </tr>
          </thead>
          <tbody>
            {monthlyTrends.map((t, i) => (
              <tr key={t.month} className={`border-b border-border hover:bg-accent/50 transition-colors ${i === idx ? "bg-primary/5" : ""} ${compIdx !== null && i === compIdx ? "bg-accent/30" : ""}`}>
                <td className="px-4 py-2.5 font-medium text-foreground">{t.month}</td>
                <td className="px-4 py-2.5 font-mono-data text-success">{t.compliant}</td>
                <td className="px-4 py-2.5 font-mono-data text-destructive">{t.nonCompliant}</td>
                <td className="px-4 py-2.5 font-mono-data text-foreground">{t.completionPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
