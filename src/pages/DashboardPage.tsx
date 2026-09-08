import { useRef, useCallback, useState as useLocalState } from "react";
import { Link } from "react-router-dom";
import {
  Users, CheckCircle2, XCircle, Pause, TrendingUp, AlertTriangle,
  FileText, StickyNote, Award, Clock, AlertCircle, ChevronRight, Camera, Download, ArrowRight,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon, UserX, type LucideIcon,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import html2canvas from "html2canvas";
import KPICard from "@/components/KPICard";
import StatusBadge from "@/components/StatusBadge";
import AtRiskAlerts from "@/components/AtRiskAlerts";
import MonthFilter from "@/components/MonthFilter";
import { useSheetData, getKPIMetrics, getComplianceBreakdown, getNeedsAttention, getBookkeeperStats, getClientsForMonth } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { motion } from "framer-motion";
import ClientDetailsModal from "@/components/ClientDetailsModal";
import type { Client } from "@/data/mockData";
import type { MerHistoryRow } from "@/services/googleSheets";
import { useMerWorkflowContacts, contactDisplayName } from "@/hooks/useMerWorkflowContacts";
import { useDeveloperFilter } from "@/hooks/useDeveloperFilter";
import RecentActivityFeed from "@/components/RecentActivityFeed";

// Theme-token colors so charts follow the active (dark/light) palette.
const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
  bg: "hsl(var(--card))",
  cursor: "hsl(var(--accent) / 0.5)",
};

const AXIS_TICK = { fontSize: 10, fill: CHART_COLORS.muted };

interface TooltipPayloadEntry {
  name: string;
  value: number | string;
  color?: string;
  fill?: string;
  unit?: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg text-xs border border-border bg-popover text-popover-foreground shadow-elevated">
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p, i: number) => (
        <p key={i} className="text-[11px] flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color || p.fill }} aria-hidden />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono-data tabular-nums font-semibold">{p.value}{typeof p.value === 'number' && p.unit ? p.unit : ''}</span>
        </p>
      ))}
    </div>
  );
};

function ChartEmpty({ icon: Icon, title, hint, height = 240 }: { icon: LucideIcon; title: string; hint: string; height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4" style={{ height }}>
      <Icon className="h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}

function NeedsAttentionSection({ clients, merHistory, actionLog }: { clients: Client[]; merHistory: MerHistoryRow[]; actionLog: import("@/services/googleSheets").ActionLogEntry[] }) {
  const attention = getNeedsAttention(clients);
  const [detailsClient, setDetailsClient] = useLocalState<string | null>(null);

  const detailsRow = (() => {
    if (!detailsClient) return null;
    const norm = (s: string) => s.trim().toLowerCase();
    const target = norm(detailsClient);
    const rows = merHistory.filter((r) => norm(r.name) === target);
    if (rows.length === 0) {
      const snap = clients.find((c) => norm(c.name) === target);
      return snap ? (snap as unknown as MerHistoryRow) : null;
    }
    return rows.reduce((latest, r) => (r.timestampMs >= latest.timestampMs ? r : latest), rows[0]);
  })();

  const sections = [
    { title: "Missing Bank Feed Transactions", count: attention.missingStatements.length, icon: FileText, priority: "critical" as const,
      items: attention.missingStatements.map(c => ({ id: c.id, name: c.name, label: c.name, badge: <StatusBadge status="Non-Compliant" client={c} /> })) },
    { title: "Unresolved Transactions", count: attention.unresolvedTransactions.length, icon: AlertCircle, priority: "high" as const,
      items: attention.unresolvedTransactions.slice(0, 6).map(c => ({ id: c.id, name: c.name, label: c.name, badge: <span className="font-mono-data text-xs font-semibold text-destructive">{c.uncategorizedTransactions}</span> })) },
    { title: "Not Reconciled", count: attention.notReconciled.length, icon: Clock, priority: "medium" as const,
      items: attention.notReconciled.slice(0, 5).map(c => ({ id: c.id, name: c.name, label: c.name, badge: <span className="font-mono-data text-xs text-muted-foreground">{c.lastReconciledDate}</span> })) },
    { title: "No Approved Notes", count: attention.noApprovedNotes.length, icon: StickyNote, priority: "medium" as const,
      items: attention.noApprovedNotes.slice(0, 5).map(c => ({ id: c.id, name: c.name, label: c.name, badge: <span className="text-[10px] font-semibold text-destructive uppercase tracking-wider">Pending</span> })) },
  ];

  const priorityStyles = {
    critical: "bg-destructive/8 border-destructive/20 text-destructive",
    high: "bg-warning/8 border-warning/20 text-warning",
    medium: "bg-muted border-border text-muted-foreground",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
      className="lg:col-span-2 rounded-xl border border-destructive/15 bg-card shadow-card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border bg-destructive/[0.02]">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
          <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0"><AlertTriangle className="h-4 w-4 text-destructive" aria-hidden /></div>
          Needs Attention
          <span className="ml-auto text-xs font-mono-data text-destructive font-semibold">{sections.reduce((sum, s) => sum + s.count, 0)} issues</span>
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {sections.map((section) => (
          <div key={section.title} className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border ${priorityStyles[section.priority]}`}>
                <section.icon className="h-3 w-3" aria-hidden />{section.priority === "critical" ? "Critical" : section.priority === "high" ? "High" : "Medium"}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ml-auto">{section.count}</span>
            </div>
            <p className="text-xs font-semibold text-foreground mb-3">{section.title}</p>
            {section.items.length > 0 ? (
              <div className="space-y-0">
                {section.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDetailsClient(item.name)}
                    aria-label={`Open details for ${item.name}`}
                    className="w-full flex items-center justify-between text-sm min-h-[40px] py-2 border-b border-border/50 last:border-0 group cursor-pointer hover:bg-accent/30 -mx-2 px-2 rounded-md transition-colors duration-150 gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-foreground text-[13px] truncate min-w-0" title={item.label}>{item.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">{item.badge}<ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150" aria-hidden /></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-4">
                <CheckCircle2 className="h-6 w-6 text-success/70 mb-1.5" aria-hidden />
                <p className="text-sm font-medium text-foreground">All clear</p>
                <p className="text-xs text-muted-foreground mt-0.5">No clients in this queue</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <ClientDetailsModal
        open={!!detailsClient}
        onClose={() => setDetailsClient(null)}
        client={detailsRow}
        actionLog={actionLog}
      />
    </motion.div>
  );
}

function BookkeepersSection({ clients, bookkeepers, actionLog, merHistory }: { clients: Client[]; bookkeepers: string[]; actionLog: import("@/services/googleSheets").ActionLogEntry[]; merHistory: MerHistoryRow[] }) {
  const bkStats = getBookkeeperStats(clients, bookkeepers);


  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-xl border border-border bg-card shadow-card">
      <div className="px-4 sm:px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><Award className="h-4 w-4 text-primary" aria-hidden /></div>
          Top Bookkeepers
        </h3>
      </div>
      <div className="p-4 sm:p-5 space-y-3">
        {bkStats.length === 0 ? (
          <EmptyState icon={Users} title="No bookkeepers yet" hint="Rankings appear once clients are assigned" />
        ) : bkStats.map((bk, i) => {
          const nonCompliant = bk.totalClients - bk.compliant;
          return (
            <motion.div key={bk.name} whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors duration-150 -mx-2 cursor-default">
              <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center text-xs font-bold font-mono-data text-primary shrink-0">#{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate" title={bk.name}>{bk.name}</p>
                <p className="text-[11px] text-muted-foreground break-words tabular-nums">{bk.totalClients} clients · <span className="text-success">{bk.compliant} compliant</span> · <span className="text-destructive">{nonCompliant} non-compliant</span></p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono-data tabular-nums text-sm font-bold text-foreground">{bk.rate}%</span>
                <p className="text-[10px] text-muted-foreground">rate</p>
              </div>
            </motion.div>
          );
        })}
      </div>
      <RecentActivityFeed actionLog={actionLog} merHistory={merHistory} limit={8} />
    </motion.div>
  );
}

function KPIChartsSection({ kpi, breakdown }: { kpi: ReturnType<typeof getKPIMetrics>; breakdown: ReturnType<typeof getComplianceBreakdown> }) {
  const pieData = [
    { name: "Compliant", value: kpi.compliant, color: CHART_COLORS.success },
    { name: "On Hold", value: kpi.onHold, color: CHART_COLORS.warning },
    { name: "Non-Compliant", value: kpi.nonCompliant, color: CHART_COLORS.destructive },
  ];

  const breakdownData = [
    { name: "Bank Txns", value: breakdown.bankPct, fill: CHART_COLORS.success },
    { name: "Uncat. Txns", value: breakdown.uncatPct, fill: CHART_COLORS.primary },
    { name: "Unapplied", value: breakdown.unappliedPct, fill: CHART_COLORS.warning },
    { name: "Statements", value: breakdown.stmtPct, fill: CHART_COLORS.destructive },
  ];

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; name: string; value: number }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 18;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="currentColor" className="fill-foreground" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={10} fontWeight={500}>
        {name}: {value}
      </text>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Compliance Distribution - Donut */}
      <motion.div whileHover={{ scale: 1.005 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
        <h3 className="text-sm font-semibold text-foreground mb-1">Compliance Distribution</h3>
        <p className="text-[11px] text-muted-foreground mb-3 tabular-nums">{kpi.total} total clients</p>
        <div className="h-[260px] min-w-0">
          {kpi.total === 0 ? (
            <ChartEmpty icon={PieChartIcon} title="No clients to chart" hint="Distribution appears once clients are loaded" height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius="40%" outerRadius="62%" dataKey="value" paddingAngle={3} strokeWidth={0}
                  label={renderCustomLabel} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: CHART_COLORS.muted }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Compliance Breakdown % - Bar */}
      <motion.div whileHover={{ scale: 1.005 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
        <h3 className="text-sm font-semibold text-foreground mb-1">Compliance Breakdown %</h3>
        <p className="text-[11px] text-muted-foreground mb-3">Percentage of clients meeting each criteria</p>
        <div className="h-[260px] min-w-0">
          {kpi.total === 0 ? (
            <ChartEmpty icon={BarChart3} title="No breakdown available" hint="Criteria percentages appear once clients are loaded" height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={breakdownData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} strokeOpacity={0.6} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={AXIS_TICK} unit="%" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={70} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_COLORS.cursor }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} name="% Compliant" unit="%">
                  {breakdownData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch, isFetching } = useSheetData();
  const { contacts: merWorkflowContacts } = useMerWorkflowContacts();
  const dashRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useLocalState(false);
  const [monthFilter, setMonthFilter] = useLocalState<string>("current");
  // Sync freshness is shown in the app footer + header refresh spinner;
  // no page-wide re-render needed here.

  const handleCapture = useCallback(async () => {
    if (!dashRef.current || capturing) return;
    setCapturing(true);
    try {
      const canvas = await html2canvas(dashRef.current, {
        backgroundColor: "#000000",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      link.download = `MER_Dashboard_${date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success(`Dashboard exported as MER_Dashboard_${date}.png`);
    } catch {
      toast.error("Could not generate PNG");
    } finally {
      setCapturing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setCapturing is stable from useState, capturing is intentionally the only trigger
  }, [capturing]);

  const { isDeveloper } = useDeveloperFilter();

  if (isLoading) return <DataLoading variant="dashboard" />;
  if (error || !data) return <DataError message={error?.message} onRetry={() => refetch()} isRetrying={isFetching} />;

  const { monthlyTrends, bookkeepers: allBookkeepers, merHistory, availableMonths, latestMonth } = data;
  // Strip developer-role users from any list shown to operations.
  const bookkeepers = allBookkeepers.filter((bk) => !isDeveloper(bk));

  // "current" = live latest, else historical snapshot for the picked month
  const isLatest = monthFilter === "current";
  const activeMonth = isLatest ? latestMonth : monthFilter;
  const sheetClients = isLatest ? data.clients : getClientsForMonth(merHistory, monthFilter);

  // When viewing the current month, GHL mer-workflow contacts are the source of
  // truth for WHO appears. Overlay matching MER data; otherwise show a placeholder.
  const mergedClients: Client[] = (() => {
    if (!isLatest) return sheetClients;
    const norm = (s: string) => s.trim().toLowerCase();
    const byGhlId = new Map<string, Client>();
    const byName = new Map<string, Client>();
    for (const c of data.clients) {
      const gid = c.ghlContactId;
      if (gid) byGhlId.set(gid, c);
      byName.set(norm(c.name), c);
    }
    // Dedupe by ghlContactId (preferred) then normalized name so the KPI
    // numerator (status filters) and denominator (clients.length) always
    // derive from the same unique set — one row per real client.
    const seen = new Set<string>();
    const out: Client[] = [];
    for (const contact of merWorkflowContacts) {
      const matched = byGhlId.get(contact.id) || byName.get(norm(contactDisplayName(contact)));
      const key = (matched && matched.ghlContactId) || contact.id || norm(contactDisplayName(contact));
      if (seen.has(key)) continue;
      seen.add(key);
      if (matched) {
        out.push(matched);
      } else {
        out.push({
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
          complianceStatus: "Pending MER",
          ghlContactId: contact.id,
          categoryTags: (contact.tags || []).join(","),
        } as Client);
      }
    }
    return out;
  })();


  const clients = mergedClients;

  const kpi = getKPIMetrics(clients);
  const breakdown = getComplianceBreakdown(clients);

  // Period-over-period deltas from monthly trends (compare active month to previous).
  const trendIdx = (() => {
    if (!monthlyTrends?.length) return -1;
    const i = monthlyTrends.findIndex((t) => t.month === activeMonth);
    return i >= 0 ? i : monthlyTrends.length - 1;
  })();
  const currTrend = trendIdx >= 0 ? monthlyTrends[trendIdx] : null;
  const prevTrend = trendIdx > 0 ? monthlyTrends[trendIdx - 1] : null;
  const deltaCompliant = currTrend && prevTrend ? currTrend.compliant - prevTrend.compliant : undefined;
  const deltaNonCompliant = currTrend && prevTrend ? currTrend.nonCompliant - prevTrend.nonCompliant : undefined;
  const deltaCompletion = currTrend && prevTrend ? currTrend.completionPct - prevTrend.completionPct : undefined;
  const deltaLabel = prevTrend ? `vs ${prevTrend.month}` : undefined;

  return (
    <div ref={dashRef} className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-mono-data tabular-nums text-foreground font-semibold">{clients.length}</span> clients ·{" "}
            {isLatest ? <span className="text-success">live</span> : <span className="text-warning">historical view · {activeMonth}</span>}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 w-full sm:w-auto">
          <div className="flex items-end gap-3">
            <MonthFilter
              value={monthFilter}
              onChange={setMonthFilter}
              months={availableMonths}
              latestMonth={latestMonth}
              label="Reporting Month"
              className="flex-1 sm:flex-none"
            />
            {!isLatest && (
              <button
                type="button"
                onClick={() => setMonthFilter("current")}
                className="min-h-[40px] text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors duration-150 rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
              >
                Reset to latest
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleCapture}
            disabled={capturing}
            className="inline-flex items-center justify-center gap-2 min-h-[40px] rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground shadow-card hover:bg-accent hover:text-foreground transition-colors duration-150 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Camera className={`h-3.5 w-3.5 ${capturing ? "animate-pulse" : ""}`} aria-hidden />
            {capturing ? "Capturing…" : "Capture as PNG"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        <KPICard title="Total Clients" value={kpi.total} icon={Users} index={0} />
        <KPICard title="Compliant" value={kpi.compliant} icon={CheckCircle2} variant="success" index={1}
          delta={deltaCompliant} deltaLabel={deltaLabel}
          tooltip={<><p className="font-semibold text-foreground mb-1">Compliant</p><p>A client counts as Compliant only when ALL 10 checks pass: Bank Transactions Received, 0 Uncategorized, 0 Transactions Without Payees, 0 Undeposited Funds, 0 Unapplied Payments, Statement Request Received, Last Reconciled Date valid, Prev Month Notes Approved, Financials Sent To Client, and Books Closed In QB.</p></>} />
        <KPICard title="Non-Compliant" value={kpi.nonCompliant} icon={XCircle} variant="destructive" index={2}
          delta={deltaNonCompliant} deltaLabel={deltaLabel} invertDeltaColor
          tooltip={<><p className="font-semibold text-foreground mb-1">Non-Compliant</p><p>Any client where one or more of the 10 compliance checks fail and the sheet Status is not "On Hold". Hover an individual badge to see which specific fields failed.</p></>} />
        <KPICard title="On Hold" value={kpi.onHold} icon={Pause} variant="warning" index={3}
          tooltip={<><p className="font-semibold text-foreground mb-1">On Hold</p><p>Triggered when the sheet's Status column contains the word "hold" (case-insensitive). On Hold takes precedence over the other 10 checks.</p></>} />
        <KPICard title="Pending MER" value={kpi.pendingMer} icon={Pause} variant="default" index={4}
          tooltip={<><p className="font-semibold text-foreground mb-1">Pending MER</p><p>Active GHL contacts (mer-workflow tag) that have not submitted any MER data yet. They are tracked separately from On Hold so the compliance KPIs aren't inflated.</p></>} />
        <KPICard title="Completion %" value={`${kpi.avgCompletion}%`} icon={TrendingUp} index={5}
          delta={deltaCompletion} deltaLabel={deltaLabel} />
        {/* Not Reconciled / Outstanding Stmts / No Updated Notes removed —
            same numbers are already broken out in the Compliance Breakdown bar
            chart below, and in the Needs Attention panel further down. */}
      </div>

      {/* Charts: Donut + Breakdown Bar */}
      <KPIChartsSection kpi={kpi} breakdown={breakdown} />

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
          whileHover={{ scale: 1.005 }} className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
          <h3 className="text-sm font-semibold text-foreground mb-4 sm:mb-5">Compliance Trend</h3>
          <div className="h-[240px] min-w-0">
            {!monthlyTrends?.length ? (
              <ChartEmpty icon={LineChartIcon} title="No trend data yet" hint="Trends appear after the first monthly submission" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyTrends} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} strokeOpacity={0.6} />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: CHART_COLORS.muted }} />
                  <Line type="monotone" dataKey="compliant" stroke={CHART_COLORS.success} strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, fill: CHART_COLORS.bg }} name="Compliant" />
                  <Line type="monotone" dataKey="nonCompliant" stroke={CHART_COLORS.destructive} strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, fill: CHART_COLORS.bg }} name="Non-Compliant" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
          whileHover={{ scale: 1.005 }} className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
          <h3 className="text-sm font-semibold text-foreground mb-4 sm:mb-5">Completion % by Month</h3>
          <div className="h-[240px] min-w-0">
            {!monthlyTrends?.length ? (
              <ChartEmpty icon={BarChart3} title="No monthly data yet" hint="Completion history appears after the first submission" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyTrends} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} strokeOpacity={0.6} />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_COLORS.cursor }} />
                  <Bar dataKey="completionPct" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} name="Completion %" unit="%" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* At-Risk Alerts (configurable in Settings) */}
      <AtRiskAlerts />

      {/* Needs Attention + Bookkeepers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <NeedsAttentionSection clients={clients} merHistory={merHistory} actionLog={data.actionLog} />
        <BookkeepersSection clients={clients} bookkeepers={bookkeepers} actionLog={data.actionLog} merHistory={merHistory} />
      </div>

      {/* Link to Export Center */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <Link to="/reports" className="group block rounded-xl border border-border bg-card hover:bg-accent/30 p-5 shadow-card hover:shadow-card-hover transition-[box-shadow,background-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Need to download a report?</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">All exports — submissions, scorecards, exec summary, full backup &amp; more — live in the Export Center.</p>
            </div>
            <div className="flex items-center gap-1 text-primary text-xs font-semibold shrink-0">
              Open Export Center <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
