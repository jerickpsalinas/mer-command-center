import { useState } from "react";
import KPICard from "@/components/KPICard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
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

  const metrics = previous ? [
    { label: "Compliant", curr: current.compliant, prev: previous.compliant, suffix: "", inverse: false },
    { label: "Non-Compliant", curr: current.nonCompliant, prev: previous.nonCompliant, suffix: "", inverse: true },
    { label: "Completion", curr: current.completionPct, prev: previous.completionPct, suffix: "%", inverse: false },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Month selectors */}
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
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{previous.month}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{current.month}</span>
          </span>
        )}
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Compliant" value={current.compliant} icon={CheckCircle2} variant="success"
          trend={previous ? `${(current.compliant - previous.compliant) >= 0 ? "+" : ""}${current.compliant - previous.compliant}` : undefined} index={0} />
        <KPICard title="Non-Compliant" value={current.nonCompliant} icon={XCircle} variant="destructive"
          trend={previous ? `${(current.nonCompliant - previous.nonCompliant) >= 0 ? "+" : ""}${current.nonCompliant - previous.nonCompliant}` : undefined} index={1} />
        <KPICard title="Completion %" value={`${current.completionPct}%`} icon={TrendingUp}
          trend={previous ? `${(current.completionPct - previous.completionPct) >= 0 ? "+" : ""}${current.completionPct - previous.completionPct}pp` : undefined} index={2} />
        <KPICard title="Trend" value={previous ? ((current.completionPct - previous.completionPct) >= 0 ? "Improving" : "Declining") : "—"}
          icon={(previous && (current.completionPct - previous.completionPct) >= 0) ? TrendingUp : TrendingDown}
          variant={!previous ? undefined : (current.completionPct - previous.completionPct) >= 0 ? "success" : "destructive"} index={3} />
      </div>

      {/* Comparison detail */}
      {previous && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            {previous.month} → {current.month}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {metrics.map(({ label, curr, prev, suffix, inverse }) => {
              const diff = curr - prev;
              const isPositive = inverse ? diff < 0 : diff > 0;
              const isNegative = inverse ? diff > 0 : diff < 0;
              return (
                <div key={label} className="rounded-lg border border-border bg-muted/20 p-4 text-center">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono-data text-lg text-muted-foreground">{prev}{suffix}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono-data text-lg font-bold text-foreground">{curr}{suffix}</span>
                  </div>
                  <p className={`text-xs font-semibold mt-1.5 ${isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground"}`}>
                    {diff > 0 ? "+" : ""}{diff}{suffix === "%" ? "pp" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">Compliance Over Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 8% 16%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(25 10% 50%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(25 10% 50%)" }} />
              <Tooltip contentStyle={{ background: "hsl(20 10% 13%)", border: "1px solid hsl(20 8% 20%)", borderRadius: "6px", fontSize: "12px", color: "hsl(30 25% 88%)" }} />
              <Legend />
              <Line type="monotone" dataKey="compliant" stroke="hsl(160 55% 42%)" strokeWidth={2} dot={{ r: 3 }} name="Compliant" />
              <Line type="monotone" dataKey="nonCompliant" stroke="hsl(0 65% 50%)" strokeWidth={2} dot={{ r: 3 }} name="Non-Compliant" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-4">Completion % by Month</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 8% 16%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(25 10% 50%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(25 10% 50%)" }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "hsl(20 10% 13%)", border: "1px solid hsl(20 8% 20%)", borderRadius: "6px", fontSize: "12px", color: "hsl(30 25% 88%)" }} />
              <Bar dataKey="completionPct" fill="hsl(340 45% 55%)" radius={[4, 4, 0, 0]} name="Completion %" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Data table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
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
              <tr key={t.month} className={`border-b border-border hover:bg-accent/50 transition-colors cursor-pointer ${i === idx ? "bg-primary/5 border-l-2 border-l-primary" : ""} ${compIdx !== null && i === compIdx ? "bg-accent/30" : ""}`}
                onClick={() => setSelectedMonth(i)}>
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
