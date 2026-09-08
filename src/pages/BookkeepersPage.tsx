import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, TrendingUp, TrendingDown, Users, Clock, AlertTriangle, FileText, Activity, ArrowRight, Search, Camera, Loader2, X, UserX, LineChart as LineChartIcon } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useSheetData } from "@/hooks/useSheetData";
import { DataError } from "@/components/DataStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { getBookkeeperPerformance, getBookkeeperPerformanceForMonth, type BookkeeperPerformance } from "@/lib/insights";
import KPICard from "@/components/KPICard";
import MonthFilter from "@/components/MonthFilter";
import { useClientDetails } from "@/hooks/useClientDetails";
import { useMerWorkflowContacts, contactDisplayName } from "@/hooks/useMerWorkflowContacts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { useDeveloperFilter } from "@/hooks/useDeveloperFilter";
import type { Client } from "@/data/mockData";


/* Chart palette — theme tokens only so light/dark both work. */
const CHART = {
  grid: "hsl(var(--border))",
  tick: "hsl(var(--muted-foreground))",
  cursor: "hsl(var(--muted))",
  success: "hsl(var(--success))",
  primary: "hsl(var(--primary))",
};

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  boxShadow: "var(--shadow-elevated)",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};
const tooltipLabelStyle = { color: "hsl(var(--popover-foreground))", fontWeight: 600 };

function rateBarTone(rate: number) {
  return rate >= 80 ? "bg-success" : rate >= 50 ? "bg-warning" : "bg-destructive";
}

/** Skeleton shaped like the final layout: KPI row, toolbar, leaderboard card grid. */
function BookkeepersSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading bookkeeper performance…</span>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[96px] rounded-xl" />)}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Skeleton className="h-10 w-full sm:w-72 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-[220px] rounded-xl" />
            <Skeleton className="h-[130px] rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BookkeepersPage() {
  const { data, isLoading, error, refetch, isFetching } = useSheetData();
  const { contacts: merWorkflowContacts } = useMerWorkflowContacts();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>("current");
  const [savingSnap, setSavingSnap] = useState(false);
  const { open: openClient, modal: clientModal } = useClientDetails();

  // Merge GHL mer-workflow contacts with sheet clients (only for current month).
  const mergedClients: Client[] = useMemo(() => {
    if (!data) return [];
    if (monthFilter !== "current") return data.clients;
    const norm = (s: string) => s.trim().toLowerCase();
    const byGhlId = new Map<string, Client>();
    const byName = new Map<string, Client>();
    for (const c of data.clients) {
      const gid = c.ghlContactId;
      if (gid) byGhlId.set(gid, c);
      byName.set(norm(c.name), c);
    }
    return merWorkflowContacts.map<Client>((contact) => {
      const matched = byGhlId.get(contact.id) || byName.get(norm(contactDisplayName(contact)));
      if (matched) return matched;
      return {
        id: contact.id,
        name: contactDisplayName(contact),
        clientType: "For-Profit",
        bookkeeper: "—",
        status: "Pending MER",
        bankTransactions: "",
        uncategorizedTransactions: 0,
        transactionsWithoutPayees: 0,
        undepositedFunds: 0,
        unappliedPayments: 0,
        statementRequestStatus: "",
        lastReconciledDate: "",
        prevMonthNotesApproved: false,
        financialsSentToClient: false,
        booksClosedInQB: false,
        completionPct: 0,
        complianceStatus: "On Hold",
        ghlContactId: contact.id,
        categoryTags: (contact.tags || []).join(","),
      } as Client;
    });
  }, [data, merWorkflowContacts, monthFilter]);


  // Available months (most recent first) derived from MER history
  const monthOptions = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>(); // label -> iso
    for (const r of data.merHistory) {
      if (r.month && r.monthDate) map.set(r.month, r.monthDate);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].localeCompare(a[1]))
      .map(([label]) => label);
  }, [data]);

  const { isDeveloper } = useDeveloperFilter();

  const stats = useMemo<BookkeeperPerformance[]>(() => {
    if (!data) return [];
    // Filter out developer-role users from the leaderboard.
    const ops = data.bookkeepers.filter((bk) => !isDeveloper(bk));
    if (monthFilter === "current") {
      return ops
        .map((bk) => getBookkeeperPerformance(mergedClients, data.merHistory, bk))
        .sort((a, b) => b.rate - a.rate);
    }
    return ops
      .map((bk) => getBookkeeperPerformanceForMonth(data.merHistory, bk, monthFilter))
      .filter((x): x is BookkeeperPerformance => x !== null)
      .sort((a, b) => b.rate - a.rate);
  }, [data, mergedClients, monthFilter, isDeveloper]);

  const handleSaveSnapshot = async () => {
    if (!data || savingSnap) return;
    setSavingSnap(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const rows = data.bookkeepers.map((bk) => {
        const own = mergedClients.filter((c) => c.bookkeeper === bk);
        const total = own.length;
        const compliant = own.filter((c) => c.complianceStatus === "Compliant").length;
        const nonCompliant = own.filter((c) => c.complianceStatus === "Non-Compliant").length;
        const onHold = own.filter((c) => /hold/i.test(c.status || "")).length;
        const pendingMer = own.filter((c) => (c.status || "") === "Pending MER").length;
        const avg = total ? Math.round(own.reduce((s, c) => s + (c.completionPct || 0), 0) / total) : 0;
        const outstanding = own.filter((c) => (c.bankTransactions || "").includes("Missing")).length;
        const uncat = own.reduce((s, c) => s + (c.uncategorizedTransactions || 0), 0);
        return {
          date: today,
          bookkeeper: bk,
          total_clients: total,
          compliant,
          non_compliant: nonCompliant,
          on_hold: onHold,
          pending_mer: pendingMer,
          avg_completion_pct: avg,
          outstanding_statements: outstanding,
          uncategorized_total: uncat,
        };
      });
      const { error: upErr } = await supabase
        .from("bookkeeper_performance")
        .upsert(rows, { onConflict: "date,bookkeeper" });
      if (upErr) throw upErr;
      toast.success(`${rows.length} bookkeeper rows saved for ${today}.`);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Could not save snapshot.");
    } finally {
      setSavingSnap(false);
    }
  };


  if (isLoading) return <BookkeepersSkeleton />;
  if (error || !data) return <DataError message={error?.message} onRetry={() => refetch()} isRetrying={isFetching} />;

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

      {/* Search + Month filter */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm w-full sm:w-72 shadow-card focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-colors duration-150">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <input
            type="search"
            aria-label="Search bookkeepers"
            placeholder="Search bookkeepers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full min-w-0"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="shrink-0 -mr-1 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <MonthFilter
          value={monthFilter}
          onChange={(v) => { setMonthFilter(v); setSelected(null); }}
          months={data.availableMonths}
          latestMonth={data.latestMonth}
          compact
        />
        {monthFilter !== "current" && (
          <span className="text-[11px] text-muted-foreground">
            Showing performance for <span className="font-semibold text-foreground">{monthFilter}</span>
          </span>
        )}
        {isAdmin && monthFilter === "current" && (
          <button
            onClick={handleSaveSnapshot}
            disabled={savingSnap}
            className="sm:ml-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 min-h-10 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors duration-150 disabled:opacity-50"
          >
            {savingSnap ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Camera className="h-3.5 w-3.5" aria-hidden />}
            {savingSnap ? "Saving…" : "Save Snapshot"}
          </button>
        )}
      </div>


      {/* Leaderboard cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((s, i) => {
          const isTop = i === 0 && search === "";
          const TrendIcon = s.trendPct >= 0 ? TrendingUp : TrendingDown;
          const trendColor = s.trendPct >= 0 ? "text-success" : "text-destructive";
          const isSelected = selected === s.name;
          return (
            <div key={s.name} className="flex flex-col gap-2 min-w-0">
              <motion.button
                type="button"
                onClick={() => setSelected(s.name)}
                aria-pressed={isSelected}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.01, y: -2 }}
                className={`text-left rounded-xl border bg-card p-4 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected ? "border-primary/40 ring-1 ring-primary/25" : isTop ? "border-primary/30 ring-1 ring-primary/15" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isTop && <Award className="h-3.5 w-3.5 text-primary shrink-0" aria-label="Top performer" />}
                      <h3 className="text-sm font-semibold text-foreground truncate" title={s.name}>{s.name}</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      <span className="font-mono-data tabular-nums">{s.totalClients}</span> client{s.totalClients !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold font-mono-data tabular-nums shrink-0 ${trendColor}`} title="Change vs. previous month">
                    <TrendIcon className="h-3 w-3" aria-hidden />
                    {s.trendPct > 0 ? "+" : ""}{s.trendPct}pp
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">Compliance</span>
                    <span className="font-mono-data font-semibold tabular-nums text-foreground">{s.rate}%</span>
                  </div>
                  <div
                    className="h-1.5 rounded-full bg-muted overflow-hidden"
                    role="progressbar"
                    aria-valuenow={s.rate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Compliance rate"
                  >
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${rateBarTone(s.rate)}`}
                      style={{ width: `${Math.min(100, Math.max(0, s.rate))}%` }}
                    />
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Avg Completion</dt>
                    <dd className="font-mono-data tabular-nums text-foreground">{s.avgCompletion}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Velocity</dt>
                    <dd className="font-mono-data tabular-nums text-foreground">{s.velocityDays !== null ? `${s.velocityDays}d` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Uncat. Txns</dt>
                    <dd className={`font-mono-data tabular-nums ${s.totalUncategorized > 0 ? "text-warning" : "text-foreground"}`}>{s.totalUncategorized}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Missing Stmts</dt>
                    <dd className={`font-mono-data tabular-nums ${s.missingStatements > 0 ? "text-destructive" : "text-foreground"}`}>{s.missingStatements}</dd>
                  </div>
                </dl>

                <div className="mt-3 pt-2 border-t border-border/50 text-[10px] text-muted-foreground/70 hover:text-primary transition-colors duration-150 flex items-center justify-between">
                  <span>View detailed breakdown</span>
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </div>
              </motion.button>
              <PerformanceHistory bookkeeper={s.name} />
            </div>
          );

        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-border bg-card shadow-card p-10 flex flex-col items-center text-center">
            <UserX className="h-8 w-8 text-muted-foreground mb-3" aria-hidden />
            <p className="text-sm font-semibold text-foreground">
              {stats.length === 0 ? "No bookkeeper data for this month" : "No bookkeepers match your search"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.length === 0 ? "Pick another month or wait for MER submissions to arrive." : "Try a different name or clear the search."}
            </p>
          </div>
        )}
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
                <Activity className="h-4 w-4 text-primary shrink-0" aria-hidden />
                <span className="truncate" title={focus.name}>{focus.name} — Detailed Performance</span>
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                <span className="font-mono-data tabular-nums">{focus.totalClients}</span> clients · <span className="font-mono-data tabular-nums">{focus.rate}%</span> compliance
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close detailed performance"
              className="inline-flex items-center gap-1 h-10 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 shrink-0"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>

          <div className="p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Trend chart */}
            <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden />
                Avg Completion Over Time
              </h3>
              {focusTrend.length > 1 ? (
                <div className="min-w-0 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={focusTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: CHART.tick }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: CHART.tick }} unit="%" axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ stroke: CHART.tick, strokeDasharray: "3 3" }} />
                      <Line type="monotone" dataKey="avgPct" stroke={CHART.primary} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: CHART.primary }} activeDot={{ r: 5 }} name="Avg %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-center">
                  <LineChartIcon className="h-7 w-7 text-muted-foreground mb-2" aria-hidden />
                  <p className="text-xs font-semibold text-foreground">Not enough history yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Needs at least 2 months of MER submissions.</p>
                </div>
              )}
            </div>

            {/* Per-client completion */}
            <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
                Per-Client Completion (current month)
              </h3>
              {focusClients.length === 0 ? (
                <div className="h-[200px] flex flex-col items-center justify-center text-center">
                  <Users className="h-7 w-7 text-muted-foreground mb-2" aria-hidden />
                  <p className="text-xs font-semibold text-foreground">No clients assigned</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">This bookkeeper has no clients in the current month.</p>
                </div>
              ) : (
                <div className="min-w-0" style={{ height: Math.max(200, focusClients.length * 22) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={focusClients
                        .map((c) => ({ name: c.name.length > 16 ? c.name.slice(0, 14) + "…" : c.name, pct: c.completionPct, full: c.name }))
                        .sort((a, b) => a.pct - b.pct)}
                      layout="vertical"
                      margin={{ left: 0, right: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: CHART.tick }} unit="%" axisLine={{ stroke: CHART.grid }} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: CHART.tick }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: CHART.cursor, opacity: 0.6 }} />
                      <Bar
                        dataKey="pct"
                        fill={CHART.primary}
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        name="Completion %"
                        onClick={(d: Record<string, unknown>) => d?.full && openClient(d.full as string)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {focusClients
                  .slice()
                  .sort((a, b) => a.completionPct - b.completionPct)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openClient(c.name)}
                      title={c.name}
                      className="max-w-full min-h-9 inline-flex items-center text-[10.5px] px-2 py-1 rounded-md border border-border bg-card hover:border-primary/40 hover:text-primary transition-colors duration-150 text-muted-foreground"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="font-mono-data tabular-nums text-foreground/80 ml-1 shrink-0">{c.completionPct}%</span>
                    </button>
                  ))}
              </div>
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
      {clientModal}
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
    <div className={`rounded-lg border p-3 min-w-0 ${colorMap[variant]}`}>
      <div className="flex items-center gap-2 mb-1 min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80 truncate" title={label}>{label}</span>
      </div>
      <p className="font-mono-data text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

type PerfRow = {
  date: string;
  compliant: number;
  avg_completion_pct: number | string;
};

function PerformanceHistory({ bookkeeper }: { bookkeeper: string }) {
  const [rows, setRows] = useState<PerfRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: snap, error } = await supabase
        .from("bookkeeper_performance")
        .select("date, compliant, avg_completion_pct")
        .eq("bookkeeper", bookkeeper)
        .gte("date", since.toISOString().slice(0, 10))
        .order("date", { ascending: true });
      if (!cancelled) {
        if (error) setRows([]);
        else setRows((snap as PerfRow[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookkeeper]);

  const chartData = rows.map((r) => ({
    date: r.date.slice(5), // MM-DD
    compliant: Number(r.compliant) || 0,
    avgPct: Number(r.avg_completion_pct) || 0,
  }));

  return (
    <div className="min-w-0 rounded-xl border border-border bg-card/60 p-3 shadow-card">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Performance History
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">last 30 days</span>
      </div>
      {loading ? (
        <div className="h-[90px] flex items-end gap-1 px-1 pb-1" aria-busy="true" aria-label="Loading performance history">
          {[40, 55, 45, 70, 60, 80, 65, 85].map((h, i) => (
            <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
          ))}
        </div>
      ) : chartData.length === 0 ? (
        <EmptyState icon={Camera} title="No snapshots yet" hint="Save a snapshot to start tracking." size="sm" />
      ) : (
        <div className="min-w-0 h-[90px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: CHART.tick }} interval="preserveStartEnd" axisLine={{ stroke: CHART.grid }} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: CHART.tick }} width={28} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ ...tooltipStyle, fontSize: "10px", padding: "4px 8px" }}
                labelStyle={tooltipLabelStyle}
                cursor={{ stroke: CHART.tick, strokeDasharray: "3 3" }}
              />
              <Line type="monotone" dataKey="compliant" stroke={CHART.success} strokeWidth={1.75} dot={false} name="Compliant" />
              <Line type="monotone" dataKey="avgPct" stroke={CHART.primary} strokeWidth={1.75} dot={false} name="Avg %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

