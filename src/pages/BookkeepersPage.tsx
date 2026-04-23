import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Award, TrendingUp, TrendingDown, Users, Clock, AlertTriangle, FileText, Activity, ArrowRight, Search, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useSheetData } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";
import { getBookkeeperPerformance, getBookkeeperPerformanceForMonth, type BookkeeperPerformance } from "@/lib/insights";
import KPICard from "@/components/KPICard";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "10px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

export default function BookkeepersPage() {
  const { data, isLoading, error } = useSheetData();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const stats = useMemo<BookkeeperPerformance[]>(() => {
    if (!data) return [];
    return data.bookkeepers
      .map((bk) => getBookkeeperPerformance(data.clients, data.merHistory, bk))
      .sort((a, b) => b.rate - a.rate);
  }, [data]);

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  const filtered = stats.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const focus = selected ? stats.find((s) => s.name === selected) ?? null : null;

  // Per-month avg completion for focused bookkeeper
  const focusTrend = focus
    ? (() => {
        const rows = data.merHistory.filter((r) => r.bookkeeper === focus.name);
        const byMonth = new Map<string, { sum: number; n: number; iso: string }>();
        for (const r of rows) {
          if (!r.month) continue;
          const b = byMonth.get(r.month) ?? { sum: 0, n: 0, iso: r.monthDate };
          b.sum += r.completionPct;
          b.n += 1;
          byMonth.set(r.month, b);
        }
        return Array.from(byMonth.entries())
          .map(([month, b]) => ({ month, iso: b.iso, avgPct: Math.round(b.sum / b.n) }))
          .sort((a, b) => a.iso.localeCompare(b.iso))
          .map(({ month, avgPct }) => ({ month, avgPct }));
      })()
    : [];

  const focusClients = focus ? data.clients.filter((c) => c.bookkeeper === focus.name) : [];

  // Aggregate KPIs
  const totalClients = stats.reduce((s, x) => s + x.totalClients, 0);
  const overallCompliant = stats.reduce((s, x) => s + x.compliant, 0);
  const overallRate = totalClients ? Math.round((overallCompliant / totalClients) * 100) : 0;
  const topPerformer = stats[0];

  return (
    <div className="space-y-6">
      {/* Aggregate KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Bookkeepers" value={stats.length} icon={Users} index={0} />
        <KPICard title="Avg Compliance Rate" value={`${overallRate}%`} icon={Activity} variant="success" index={1} />
        <KPICard title="Top Performer" value={topPerformer?.name ?? "—"} icon={Award} index={2} />
        <KPICard title="Total Clients Managed" value={totalClients} icon={FileText} index={3} />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm w-full sm:w-72">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search bookkeepers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      {/* Leaderboard cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((s, i) => {
          const isTop = i === 0 && search === "";
          const trendIcon = s.trendPct >= 0 ? TrendingUp : TrendingDown;
          const trendColor = s.trendPct >= 0 ? "text-success" : "text-destructive";
          return (
            <motion.button
              key={s.name}
              onClick={() => setSelected(s.name)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ scale: 1.01, y: -2 }}
              className={`text-left rounded-xl border bg-card p-4 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300 ${
                isTop ? "border-primary/30 ring-1 ring-primary/15" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    {isTop && <Award className="h-3.5 w-3.5 text-primary" />}
                    <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.totalClients} client{s.totalClients !== 1 ? "s" : ""}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${trendColor}`}>
                  {(() => { const TI = trendIcon; return <TI className="h-3 w-3" />; })()}
                  {s.trendPct > 0 ? "+" : ""}{s.trendPct}pp
                </span>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">Compliance</span>
                  <span className="font-mono-data font-semibold text-foreground">{s.rate}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${s.rate}%`,
                      backgroundColor:
                        s.rate >= 80 ? "hsl(160, 55%, 42%)" : s.rate >= 50 ? "hsl(38, 70%, 50%)" : "hsl(0, 65%, 50%)",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Avg Completion</span>
                  <p className="font-mono-data text-foreground">{s.avgCompletion}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Velocity</span>
                  <p className="font-mono-data text-foreground">{s.velocityDays !== null ? `${s.velocityDays}d` : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Uncat. Txns</span>
                  <p className="font-mono-data text-foreground">{s.totalUncategorized}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Missing Stmts</span>
                  <p className="font-mono-data text-foreground">{s.missingStatements}</p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-border/50 text-[10px] text-muted-foreground/70 hover:text-primary transition-colors flex items-center justify-between">
                <span>View detailed breakdown</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Drill-down panel */}
      {focus && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/20 bg-card shadow-card overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border bg-primary/[0.04]">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{focus.name} — Detailed Performance</span>
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{focus.totalClients} clients · {focus.rate}% compliance</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Close
            </button>
          </div>

          <div className="p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Trend chart */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Avg Completion Over Time
              </h3>
              {focusTrend.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={focusTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 8%, 16%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(25, 10%, 50%)" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(25, 10%, 50%)" }} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="avgPct" stroke="hsl(340, 45%, 55%)" strokeWidth={2.5} dot={{ r: 3 }} name="Avg %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">Need at least 2 months of data.</p>
              )}
            </div>

            {/* Per-client completion */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Per-Client Completion (current month)
              </h3>
              <ResponsiveContainer width="100%" height={Math.max(200, focusClients.length * 22)}>
                <BarChart
                  data={focusClients
                    .map((c) => ({ name: c.name.length > 16 ? c.name.slice(0, 14) + "…" : c.name, pct: c.completionPct }))
                    .sort((a, b) => a.pct - b.pct)}
                  layout="vertical"
                  margin={{ left: 0, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 8%, 16%)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(25, 10%, 50%)" }} unit="%" />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: "hsl(25, 10%, 50%)" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="pct" fill="hsl(340, 45%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Issue breakdown */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile label="Missing Statements" value={focus.missingStatements} icon={AlertTriangle} variant={focus.missingStatements > 0 ? "destructive" : "default"} />
              <StatTile label="Not Reconciled" value={focus.notReconciled} icon={Clock} variant={focus.notReconciled > 0 ? "warning" : "default"} />
              <StatTile label="Uncat. Txns" value={focus.totalUncategorized} icon={FileText} variant={focus.totalUncategorized > 0 ? "warning" : "default"} />
              <StatTile label="Unapplied Pmts" value={focus.totalUnapplied} icon={FileText} variant={focus.totalUnapplied > 0 ? "warning" : "default"} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatTile({
  label, value, icon: Icon, variant,
}: { label: string; value: number; icon: React.ElementType; variant: "default" | "warning" | "destructive" }) {
  const colorMap = {
    default: "bg-muted/40 border-border text-foreground",
    warning: "bg-warning/8 border-warning/20 text-warning",
    destructive: "bg-destructive/8 border-destructive/20 text-destructive",
  };
  return (
    <div className={`rounded-lg border p-3 ${colorMap[variant]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className="font-mono-data text-xl font-bold">{value}</p>
    </div>
  );
}
