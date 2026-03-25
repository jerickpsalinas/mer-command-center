import { useState } from "react";
import KPICard from "@/components/KPICard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useSheetData } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";

export default function MonthlyTrendsPage() {
  const { data, isLoading, error } = useSheetData();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  const { monthlyTrends } = data;
  const idx = selectedMonth ?? monthlyTrends.length - 1;
  const current = monthlyTrends[idx];
  const previous = idx > 0 ? monthlyTrends[idx - 1] : null;
  const compDiff = previous ? current.compliant - previous.compliant : 0;
  const pctDiff = previous ? current.completionPct - previous.completionPct : 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-4">
        <select value={idx} onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground">
          {monthlyTrends.map((t, i) => <option key={t.month} value={i}>{t.month}</option>)}
        </select>
        {previous && <span className="text-xs text-muted-foreground">vs {previous.month}</span>}
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Compliant" value={current.compliant} icon={CheckCircle2} variant="success"
          trend={previous ? `${compDiff >= 0 ? "+" : ""}${compDiff} vs last month` : undefined} index={0} />
        <KPICard title="Non-Compliant" value={current.nonCompliant} icon={XCircle} variant="destructive" index={1} />
        <KPICard title="Completion %" value={`${current.completionPct}%`} icon={TrendingUp}
          trend={previous ? `${pctDiff >= 0 ? "+" : ""}${pctDiff}pp vs last month` : undefined} index={2} />
        <KPICard title="Trend" value={pctDiff >= 0 ? "Improving" : "Declining"} icon={pctDiff >= 0 ? TrendingUp : TrendingDown}
          variant={pctDiff >= 0 ? "success" : "destructive"} index={3} />
      </div>

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
              <tr key={t.month} className={`border-b border-border hover:bg-accent/50 transition-colors ${i === idx ? "bg-primary/5" : ""}`}>
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
