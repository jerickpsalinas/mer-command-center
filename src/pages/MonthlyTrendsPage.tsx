import { useState } from "react";
import KPICard from "@/components/KPICard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSheetData } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";

const tooltipStyle = {
  background: "hsl(20, 10%, 13%)", border: "1px solid hsl(20, 8%, 20%)",
  borderRadius: "10px", fontSize: "12px", color: "hsl(30, 25%, 88%)",
  boxShadow: "0 8px 24px -6px hsl(20 12% 3% / 0.6)",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[11px]" style={{ color: p.color || p.stroke }}>
          {p.name}: <span className="font-mono-data font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function MonthlyTrendsPage() {
  const { data, isLoading, error } = useSheetData();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [compareMonth, setCompareMonth] = useState<number | null>(null);

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  const { monthlyTrends } = data;

  // Filter to only months that have data (at least one compliant or nonCompliant)
  const validIndices = monthlyTrends
    .map((t, i) => ({ ...t, originalIndex: i }))
    .filter(t => t.compliant > 0 || t.nonCompliant > 0 || t.completionPct > 0);

  const validTrends = validIndices.map(v => monthlyTrends[v.originalIndex]);

  const idx = selectedMonth ?? validIndices.length - 1;
  const compIdx = compareMonth ?? (idx > 0 ? idx - 1 : null);
  const current = validTrends[idx];
  const previous = compIdx !== null && compIdx !== idx ? validTrends[compIdx] : null;

  const metrics = previous ? [
    { label: "Compliant", curr: current.compliant, prev: previous.compliant, suffix: "", inverse: false },
    { label: "Non-Compliant", curr: current.nonCompliant, prev: previous.nonCompliant, suffix: "", inverse: true },
    { label: "Completion", curr: current.completionPct, prev: previous.completionPct, suffix: "%", inverse: false },
  ] : [];

  const trendDiff = previous ? current.completionPct - previous.completionPct : 0;
  const isImproving = previous ? trendDiff >= 0 : false;

  return (
    <div className="space-y-6">
      {/* Month selectors */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-4 shadow-card flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">View Month</span>
          <select value={idx} onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-foreground min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
            {validTrends.map((t, i) => <option key={t.month} value={i}>{t.month}</option>)}
          </select>
        </div>
        <div className="h-8 w-px bg-border hidden sm:block" />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground whitespace-nowrap">Compare</span>
          <select
            value={compIdx ?? ""}
            onChange={(e) => setCompareMonth(e.target.value === "" ? null : Number(e.target.value))}
            className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-foreground min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          >
            <option value="">None</option>
            {validTrends.map((t, i) => i !== idx ? <option key={t.month} value={i}>{t.month}</option> : null)}
          </select>
        </div>
        {previous && (
          <div className="ml-auto hidden sm:flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-1.5">
            <span className="text-xs font-medium text-foreground">{previous.month}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{current.month}</span>
          </div>
        )}
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Compliant" value={current.compliant} icon={CheckCircle2} variant="success" index={0} />
        <KPICard title="Non-Compliant" value={current.nonCompliant} icon={XCircle} variant="destructive" index={1} />
        <KPICard title="Completion %" value={`${current.completionPct}%`} icon={TrendingUp} index={2} />

        {/* Trend card with effects */}
        <AnimatePresence mode="wait">
          <motion.div
            key={previous ? (isImproving ? "improving" : "declining") : "neutral"}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className={`relative overflow-hidden rounded-xl border p-5 h-full transition-all duration-500 ${
              !previous ? "border-border bg-card" :
              isImproving
                ? "border-success/30 bg-success/5"
                : "border-destructive/30 bg-destructive/5"
            }`}>
              {previous && (
                <motion.div
                  className={`absolute inset-0 opacity-10 ${isImproving ? "bg-success" : "bg-destructive"}`}
                  animate={{ opacity: [0.05, 0.12, 0.05] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Trend</span>
                  <motion.div
                    animate={previous ? { y: [0, -2, 0] } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {(previous && isImproving)
                      ? <TrendingUp className="h-4 w-4 text-success" />
                      : <TrendingDown className="h-4 w-4 text-destructive" />
                    }
                  </motion.div>
                </div>
                <p className={`font-mono-data text-2xl font-bold ${
                  !previous ? "text-muted-foreground" :
                  isImproving ? "text-success" : "text-destructive"
                }`}>
                  {previous ? (isImproving ? "Improving" : "Declining") : "—"}
                </p>
                
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
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
                <motion.div key={label} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="rounded-lg border border-border bg-muted/20 p-4 text-center">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono-data text-lg text-muted-foreground">{prev}{suffix}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono-data text-lg font-bold text-foreground">{curr}{suffix}</span>
                  </div>
                  <p className={`text-xs font-semibold mt-1.5 ${isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground"}`}>
                    {diff > 0 ? "+" : ""}{diff}{suffix === "%" ? "pp" : ""}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.005 }}
          className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
          <h2 className="text-sm font-semibold text-foreground mb-4">Compliance Over Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={validTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 8%, 16%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(25, 10%, 50%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(25, 10%, 50%)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(30, 25%, 88%)" }} />
              <Line type="monotone" dataKey="compliant" stroke="hsl(160, 55%, 42%)" strokeWidth={2} dot={{ r: 3 }} name="Compliant" />
              <Line type="monotone" dataKey="nonCompliant" stroke="hsl(0, 65%, 50%)" strokeWidth={2} dot={{ r: 3 }} name="Non-Compliant" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.005 }}
          className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
          <h2 className="text-sm font-semibold text-foreground mb-4">Completion % by Month</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={validTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 8%, 16%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(25, 10%, 50%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(25, 10%, 50%)" }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(20, 8%, 14%)" }} />
              <Bar dataKey="completionPct" fill="hsl(340, 45%, 55%)" radius={[4, 4, 0, 0]} name="Completion %" />
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
            {validTrends.map((t, i) => (
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
