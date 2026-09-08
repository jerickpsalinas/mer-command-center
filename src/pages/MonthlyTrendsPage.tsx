import { useState } from "react";
import { Link } from "react-router-dom";
import KPICard from "@/components/KPICard";
import ComplianceHeatmap from "@/components/ComplianceHeatmap";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, ArrowRight, Calendar, Minus, Sparkles, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useSheetData, getKPIMetrics } from "@/hooks/useSheetData";
import { DataError } from "@/components/DataStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

/* Chart palette — all theme tokens so light mode and dark mode both work. */
const CHART = {
  grid: "hsl(var(--border))",
  tick: "hsl(var(--muted-foreground))",
  cursor: "hsl(var(--muted))",
  success: "hsl(var(--success))",
  destructive: "hsl(var(--destructive))",
  primary: "hsl(var(--primary))",
  foreground: "hsl(var(--foreground))",
};
const AXIS_TICK = { fontSize: 11, fill: CHART.tick };

interface TooltipPayloadEntry {
  name: string;
  value: number | string;
  color?: string;
  stroke?: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-elevated">
      <p className="text-xs font-semibold mb-1">{label}</p>
      {payload.map((p, i: number) => (
        <p key={i} className="text-[11px]" style={{ color: p.color || p.stroke }}>
          {p.name}: <span className="font-mono-data font-semibold tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const CHART_HEIGHT = 240;

/** Skeleton shaped like the final layout: banner, KPI row, selectors, two chart cards, table. */
function TrendsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading monthly trends…</span>
      <Skeleton className="h-[88px] rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[96px] rounded-xl" />)}
      </div>
      <Skeleton className="h-[84px] rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
      <div className="rounded-xl border border-border bg-card shadow-card p-4 space-y-2">
        <Skeleton className="h-8 rounded-md" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
      </div>
    </div>
  );
}

const TH = "text-xs font-medium uppercase tracking-wider text-muted-foreground px-3 sm:px-4 py-2.5 whitespace-nowrap";

function getCurrentMonthLabel() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default function MonthlyTrendsPage() {
  const { data, isLoading, error, refetch, isFetching } = useSheetData();
  const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number | null>(null);
  const [compareIdx, setCompareIdx] = useState<string>("-");

  if (isLoading) return <TrendsSkeleton />;
  if (error || !data) return <DataError message={error?.message} onRetry={() => refetch()} isRetrying={isFetching} />;

  const { clients, monthlyTrends } = data;

  // Current month metrics computed from dashboard (Monthly Progress) data
  const kpi = getKPIMetrics(clients);
  const currentMonthLabel = getCurrentMonthLabel();

  // Historical trends derived live from every MER submission
  const validTrends = monthlyTrends.filter(t => t.compliant > 0 || t.nonCompliant > 0 || t.completionPct > 0);
  const autoTrends = validTrends;
  const hasHistory = validTrends.length > 0;

  // Comparison logic for historical data
  const histIdx = selectedHistoryIdx ?? (hasHistory ? validTrends.length - 1 : null);
  const compIdxNum = compareIdx !== "-" ? Number(compareIdx) : null;
  const histCurrent = histIdx !== null ? validTrends[histIdx] : null;
  const histPrevious = compIdxNum !== null && histIdx !== null && compIdxNum !== histIdx ? validTrends[compIdxNum] ?? null : null;

  const histMetrics = histCurrent && histPrevious ? [
    { label: "Compliant", curr: histCurrent.compliant, prev: histPrevious.compliant, suffix: "", inverse: false },
    { label: "Non-Compliant", curr: histCurrent.nonCompliant, prev: histPrevious.nonCompliant, suffix: "", inverse: true },
    { label: "Completion", curr: histCurrent.completionPct, prev: histPrevious.completionPct, suffix: "%", inverse: false },
  ] : [];

  const trendDiff = histPrevious && histCurrent ? histCurrent.completionPct - histPrevious.completionPct : 0;
  const isImproving = histPrevious ? trendDiff >= 0 : false;

  return (
    <div className="space-y-6">
      {/* Current Month Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Current Month: {currentMonthLabel}</h2>
              <p className="text-sm text-muted-foreground">Live data from your dashboard</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 max-w-md">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Trends update <strong className="text-foreground">live</strong> from every MER submission — no snapshots needed.
              Use the <strong className="text-foreground">Export Center</strong> below to download any month or date range.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Current KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Compliant" value={kpi.compliant} icon={CheckCircle2} variant="success" index={0} />
        <KPICard title="Non-Compliant" value={kpi.nonCompliant} icon={XCircle} variant="destructive" index={1} />
        <KPICard title="Completion %" value={`${kpi.avgCompletion}%`} icon={TrendingUp} index={2} />
        <KPICard title="Total Clients" value={kpi.total} icon={Calendar} index={3} />
      </div>

      {/* Historical Trends Section */}
      {hasHistory ? (
        <>
          {/* History selectors */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4 sm:gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">View Month</label>
                <Select value={String(histIdx)} onValueChange={(v) => setSelectedHistoryIdx(Number(v))}>
                  <SelectTrigger className="w-full sm:min-w-[160px] bg-muted/30 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {validTrends.map((t, i) => <SelectItem key={t.month} value={String(i)}>{t.month}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Compare To</label>
                <Select value={compareIdx} onValueChange={(v) => setCompareIdx(v)}>
                  <SelectTrigger className="w-full sm:min-w-[160px] bg-muted/30 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">—</SelectItem>
                    {validTrends.map((t, i) => i !== histIdx ? <SelectItem key={t.month} value={String(i)}>{t.month}</SelectItem> : null)}
                  </SelectContent>
                </Select>
              </div>
              {histPrevious && histCurrent && (
                <div className="ml-auto hidden sm:flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                  <span className="text-xs font-medium text-foreground">{histPrevious.month}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{histCurrent.month}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* History KPI cards */}
          {histCurrent && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard title="Compliant" value={histCurrent.compliant} icon={CheckCircle2} variant="success" index={0} />
              <KPICard title="Non-Compliant" value={histCurrent.nonCompliant} icon={XCircle} variant="destructive" index={1} />
              <KPICard title="Completion %" value={`${histCurrent.completionPct}%`} icon={TrendingUp} index={2} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={histPrevious ? (isImproving ? "improving" : "declining") : "neutral"}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <div className={`relative overflow-hidden rounded-xl border p-4 sm:p-5 h-full transition-all duration-500 ${
                    !histPrevious ? "border-border bg-card" :
                    isImproving ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                  }`}>
                    {histPrevious && (
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
                          animate={histPrevious ? { y: [0, -2, 0] } : {}}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          {(histPrevious && isImproving)
                            ? <TrendingUp className="h-4 w-4 text-success" />
                            : <TrendingDown className="h-4 w-4 text-destructive" />
                          }
                        </motion.div>
                      </div>
                      <p className={`font-mono-data text-xl sm:text-2xl font-bold ${
                        !histPrevious ? "text-muted-foreground" : isImproving ? "text-success" : "text-destructive"
                      }`}>
                        {histPrevious ? (isImproving ? "Improving" : "Declining") : "—"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Comparison detail */}
          {histPrevious && histCurrent && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card">
              <h2 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">
                <span className="font-mono-data">{histPrevious.month}</span> → <span className="font-mono-data">{histCurrent.month}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {histMetrics.map(({ label, curr, prev, suffix, inverse }) => {
                  const diff = curr - prev;
                  const isPositive = inverse ? diff < 0 : diff > 0;
                  const isNegative = inverse ? diff > 0 : diff < 0;
                  return (
                    <motion.div key={label} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="rounded-lg border border-border bg-muted/20 p-4 text-center">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                      <div className="flex items-center justify-center gap-3">
                        <span className="font-mono-data tabular-nums text-lg text-muted-foreground">{prev}{suffix}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        <span className="font-mono-data tabular-nums text-lg font-bold text-foreground">{curr}{suffix}</span>
                      </div>
                      <p className={`text-xs font-semibold font-mono-data tabular-nums mt-1.5 ${isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground"}`}>
                        {diff > 0 ? "+" : ""}{diff}{suffix === "%" ? "%" : ""}
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
              className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
              <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Compliance Over Time</h3>
              <div className="min-w-0" style={{ height: CHART_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={autoTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis dataKey="month" tick={AXIS_TICK} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: CHART.tick, strokeDasharray: "3 3" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", color: CHART.foreground }} iconSize={10} />
                    <Line type="monotone" dataKey="compliant" stroke={CHART.success} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: CHART.success }} activeDot={{ r: 5 }} name="Compliant" />
                    <Line type="monotone" dataKey="nonCompliant" stroke={CHART.destructive} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: CHART.destructive }} activeDot={{ r: 5 }} name="Non-Compliant" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
              <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Completion % by Month</h3>
              <div className="min-w-0" style={{ height: CHART_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={autoTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="month" tick={AXIS_TICK} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                    <YAxis tick={AXIS_TICK} domain={[0, 100]} unit="%" axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART.cursor, opacity: 0.6 }} />
                    <Bar dataKey="completionPct" fill={CHART.primary} radius={[4, 4, 0, 0]} name="Completion %" maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Data table */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm min-w-[540px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th scope="col" className={`text-left ${TH}`}>Month</th>
                    <th scope="col" className={`text-right ${TH}`}>Compliant</th>
                    <th scope="col" className={`text-right ${TH}`}>Non-Comp.</th>
                    <th scope="col" className={`text-right ${TH}`}>Completion</th>
                    <th scope="col" className={`text-left ${TH}`}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {validTrends.map((t, i) => {
                    const isSelected = i === histIdx;
                    const isCompare = compIdxNum !== null && i === compIdxNum;
                    return (
                      <tr
                        key={`${t.month}-${i}`}
                        tabIndex={0}
                        onClick={() => setSelectedHistoryIdx(i)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedHistoryIdx(i); } }}
                        className={`border-b border-border last:border-0 hover:bg-muted/40 transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                          isSelected ? "bg-primary/5 shadow-[inset_2px_0_0_hsl(var(--primary))]" : isCompare ? "bg-accent/30" : ""
                        }`}
                      >
                        <td className="px-3 sm:px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{t.month}</td>
                        <td className="px-3 sm:px-4 py-2.5 text-right font-mono-data tabular-nums text-success">{t.compliant}</td>
                        <td className="px-3 sm:px-4 py-2.5 text-right font-mono-data tabular-nums text-destructive">{t.nonCompliant}</td>
                        <td className="px-3 sm:px-4 py-2.5 text-right font-mono-data tabular-nums text-foreground">{t.completionPct}%</td>
                        <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            t.trend === "Improving" ? "text-success" : t.trend === "Declining" ? "text-destructive" : "text-muted-foreground"
                          }`}>
                            {t.trend === "Improving" && <TrendingUp className="h-3 w-3" aria-hidden />}
                            {t.trend === "Declining" && <TrendingDown className="h-3 w-3" aria-hidden />}
                            {t.trend === "Stable" && <Minus className="h-3 w-3" aria-hidden />}
                            {t.trend || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-10 shadow-card">
          <EmptyState
            icon={TrendingUp}
            title="No historical data yet"
            hint={<>Trends populate automatically as bookkeepers submit MER rows. Once submissions arrive in the <strong>MER Dashboard Data</strong> sheet, this view will fill in instantly.</>}
            variant="plain"
          />
        </motion.div>
      )}

      {/* Compliance Heatmap (clients × months) */}
      {data.merHistory.length > 0 && <ComplianceHeatmap history={data.merHistory} />}

      {/* Link to Export Center */}
      <Link to="/reports" className="group block rounded-xl border border-border bg-card hover:bg-accent/30 p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-[box-shadow,background-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Need to download trends?</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">All exports — including the Monthly Trends Summary — live in the Export Center.</p>
          </div>
          <div className="flex items-center gap-1 text-primary text-xs font-semibold shrink-0 ml-auto">
            Open Export Center <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
          </div>
        </div>
      </Link>
    </div>
  );
}
