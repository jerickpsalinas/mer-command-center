import { useState } from "react";
import KPICard from "@/components/KPICard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, ArrowRight, Save, Calendar, Minus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useSheetData, getKPIMetrics } from "@/hooks/useSheetData";
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

function getCurrentMonthLabel() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default function MonthlyTrendsPage() {
  const { data, isLoading, error } = useSheetData();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number | null>(null);
  const [compareIdx, setCompareIdx] = useState<string>("-");

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  const { clients, monthlyTrends } = data;

  // Current month metrics computed from dashboard (Monthly Progress) data
  const kpi = getKPIMetrics(clients);
  const currentMonthLabel = getCurrentMonthLabel();

  // Historical trends from the Monthly Trends sheet
  const validTrends = monthlyTrends.filter(t => t.compliant > 0 || t.nonCompliant > 0 || t.completionPct > 0);
  const autoTrends = validTrends.filter(t => t.type !== "manual");
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

  // Compute trend for manual save by comparing to last auto-snapshot
  const lastAutoSnapshot = autoTrends.length > 0 ? autoTrends[autoTrends.length - 1] : null;
  const manualTrend = lastAutoSnapshot
    ? (kpi.avgCompletion > lastAutoSnapshot.completionPct ? "Improving"
      : kpi.avgCompletion < lastAutoSnapshot.completionPct ? "Declining" : "Stable")
    : "-";

  const handleSaveSnapshot = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        month: currentMonthLabel,
        compliant: kpi.compliant,
        nonCompliant: kpi.nonCompliant,
        completion: `${kpi.avgCompletion}%`,
        trend: manualTrend,
        type: "manual",
      };
      await fetch(
        "https://script.google.com/macros/s/AKfycbx33oNiGud15mBaGx24U8A-HMGqqrbPrL_QxnP94D_HCQB9lEqV6MOsPjVm3o3Hqo_A/exec",
        { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(payload) }
      );
      toast({ title: "Manual snapshot saved", description: `${currentMonthLabel} data sent to Google Sheets (type: manual)` });
    } catch {
      toast({ title: "Failed to save snapshot", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Month Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Current Month: {currentMonthLabel}</h2>
              <p className="text-[11px] text-muted-foreground">Live data from your dashboard</p>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <motion.button
              onClick={handleSaveSnapshot}
              disabled={isSaving}
              whileHover={{ scale: isSaving ? 1 : 1.03 }}
              whileTap={{ scale: isSaving ? 1 : 0.97 }}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all w-full sm:w-auto ${
                isSaving
                  ? "bg-muted/30 text-muted-foreground cursor-not-allowed border border-border"
                  : "bg-primary text-primary-foreground shadow-md hover:shadow-lg"
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving…" : "Save Manual Snapshot"}
            </motion.button>
            <p className="text-[11px] text-muted-foreground/70 italic max-w-sm text-left sm:text-right leading-relaxed">
              Auto-snapshots save at month-end. Use manual snapshot to capture data anytime. All data is stored in the Trends sheet.
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
                {histPrevious.month} → {histCurrent.month}
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
                        <span className="font-mono-data text-lg text-muted-foreground">{prev}{suffix}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono-data text-lg font-bold text-foreground">{curr}{suffix}</span>
                      </div>
                      <p className={`text-xs font-semibold mt-1.5 ${isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground"}`}>
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
              whileHover={{ scale: 1.005 }}
              className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
              <h2 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Compliance Over Time</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={autoTrends}>
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
                <BarChart data={autoTrends}>
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
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-2.5">Trend</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-2.5">Type</th>
                </tr>
              </thead>
              <tbody>
                {validTrends.map((t, i) => (
                  <tr key={`${t.month}-${t.type}-${i}`} className={`border-b border-border hover:bg-accent/50 transition-colors cursor-pointer ${i === histIdx ? "bg-primary/5 border-l-2 border-l-primary" : ""} ${compIdxNum !== null && i === compIdxNum ? "bg-accent/30" : ""}`}
                    onClick={() => setSelectedHistoryIdx(i)}>
                    <td className="px-4 py-2.5 font-medium text-foreground">{t.month}</td>
                    <td className="px-4 py-2.5 font-mono-data text-success">{t.compliant}</td>
                    <td className="px-4 py-2.5 font-mono-data text-destructive">{t.nonCompliant}</td>
                    <td className="px-4 py-2.5 font-mono-data text-foreground">{t.completionPct}%</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${
                        t.trend === "Improving" ? "text-success" : t.trend === "Declining" ? "text-destructive" : "text-muted-foreground"
                      }`}>
                        {t.trend === "Improving" && <TrendingUp className="inline h-3 w-3 mr-1" />}
                        {t.trend === "Declining" && <TrendingDown className="inline h-3 w-3 mr-1" />}
                        {t.trend === "Stable" && <Minus className="inline h-3 w-3 mr-1" />}
                        {t.trend || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        t.type === "manual"
                          ? "bg-accent/50 text-accent-foreground border border-border"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}>
                        {t.type || "auto"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-8 shadow-card text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Historical Data Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Click <strong>"Save Manual Snapshot"</strong> to check current data anytime. Auto-snapshots are saved at the end of each month via your Google Apps Script trigger.
          </p>
        </motion.div>
      )}
    </div>
  );
}
