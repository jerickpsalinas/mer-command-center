import { useRef, useCallback, useState as useLocalState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users, CheckCircle2, XCircle, Pause, TrendingUp, AlertTriangle,
  FileText, StickyNote, Award, Clock, AlertCircle, ChevronRight, ShieldAlert, BarChart3, Camera, Calendar, Download, ArrowRight,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import html2canvas from "html2canvas";
import KPICard from "@/components/KPICard";
import ComplianceProgress from "@/components/ComplianceProgress";
import StatusBadge from "@/components/StatusBadge";
import AtRiskAlerts from "@/components/AtRiskAlerts";
import MonthFilter from "@/components/MonthFilter";
import { useSheetData, getKPIMetrics, getComplianceBreakdown, getNeedsAttention, getBookkeeperStats, getClientsForMonth } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import ClientDetailsModal from "@/components/ClientDetailsModal";
import { useClientDetails } from "@/hooks/useClientDetails";
import type { Client } from "@/data/mockData";
import type { MerHistoryRow } from "@/services/googleSheets";
import { useMerWorkflowContacts, contactDisplayName } from "@/hooks/useMerWorkflowContacts";
import { useDeveloperFilter } from "@/hooks/useDeveloperFilter";
import RecentActivityFeed from "@/components/RecentActivityFeed";
import { RefreshCw } from "lucide-react";

const CHART_COLORS = {
  primary: "hsl(340, 45%, 55%)",
  success: "hsl(160, 55%, 42%)",
  warning: "hsl(38, 80%, 52%)",
  destructive: "hsl(0, 65%, 50%)",
  muted: "hsl(25, 10%, 50%)",
  grid: "hsl(20, 8%, 16%)",
  bg: "hsl(20, 10%, 11%)",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-[10px] text-xs border border-border bg-popover text-foreground shadow-elevated">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[11px]" style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-mono-data font-semibold">{p.value}{typeof p.value === 'number' && p.unit ? p.unit : ''}</span>
        </p>
      ))}
    </div>
  );
};

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
    { title: "Missing Bank Statements", count: attention.missingStatements.length, icon: FileText, priority: "critical" as const,
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
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.8 }}
      className="lg:col-span-2 rounded-xl border border-destructive/15 bg-card shadow-card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border bg-destructive/[0.02]">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
          <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
          Needs Attention
          <span className="ml-auto text-xs font-mono-data text-destructive font-semibold">{sections.reduce((sum, s) => sum + s.count, 0)} issues</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {sections.map((section) => (
          <div key={section.title} className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border ${priorityStyles[section.priority]}`}>
                <section.icon className="h-3 w-3" />{section.priority === "critical" ? "Critical" : section.priority === "high" ? "High" : "Medium"}
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
                    className="w-full flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0 group cursor-pointer hover:bg-accent/30 -mx-2 px-2 rounded-md transition-colors gap-2 text-left"
                  >
                    <span className="text-foreground text-[13px] break-words min-w-0">{item.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">{item.badge}<ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-3xl font-mono-data font-bold text-success">0</p>
                <p className="text-xs text-muted-foreground mt-1">all clear</p>
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
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.9 }}
      className="rounded-xl border border-border bg-card shadow-card">
      <div className="px-4 sm:px-6 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><Award className="h-4 w-4 text-primary" /></div>
          Top Bookkeepers
        </h2>
      </div>
      <div className="p-4 sm:p-5 space-y-3">
        {bkStats.map((bk, i) => {
          const nonCompliant = bk.totalClients - bk.compliant;
          return (
            <motion.div key={bk.name} whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors -mx-2 cursor-default">
              <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center text-xs font-bold text-primary shrink-0">#{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground break-words">{bk.name}</p>
                <p className="text-[11px] text-muted-foreground break-words">{bk.totalClients} clients · <span className="text-success">{bk.compliant} compliant</span> · <span className="text-destructive">{nonCompliant} non-compliant</span></p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono-data text-sm font-bold text-foreground">{bk.rate}%</span>
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

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: any) => {
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
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Compliance Distribution - Donut */}
      <motion.div whileHover={{ scale: 1.005 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
        <h2 className="text-sm font-semibold text-foreground mb-1">Compliance Distribution</h2>
        <p className="text-[11px] text-muted-foreground mb-3">{kpi.total} total clients</p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius="40%" outerRadius="62%" dataKey="value" paddingAngle={3} strokeWidth={0}
              label={renderCustomLabel} labelLine={false}>
              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Compliance Breakdown % - Bar */}
      <motion.div whileHover={{ scale: 1.005 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
        <h2 className="text-sm font-semibold text-foreground mb-1">Compliance Breakdown %</h2>
        <p className="text-[11px] text-muted-foreground mb-3">Percentage of clients meeting each criteria</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={breakdownData} layout="vertical" margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: CHART_COLORS.muted }} unit="%" />
            <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10, fill: CHART_COLORS.muted }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(20, 8%, 14%)" }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} name="% Compliant">
              {breakdownData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}

function ReportsSummarySection({ clients, bookkeepers }: { clients: Client[]; bookkeepers: string[] }) {
  const kpi = getKPIMetrics(clients);
  const attention = getNeedsAttention(clients);
  const bkStats = getBookkeeperStats(clients, bookkeepers);
  const highRisk = clients.filter(c => c.completionPct < 40).sort((a, b) => a.completionPct - b.completionPct);
  const { open: openClient, modal: clientModal } = useClientDetails();

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 1.0 }}
      className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart3 className="h-4 w-4 text-primary" /></div>
          Reports Summary
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span className="text-xs font-semibold text-foreground">Risk Overview</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Missing Statements</span><span className="font-mono-data text-destructive font-medium">{attention.missingStatements.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Not Reconciled</span><span className="font-mono-data text-destructive font-medium">{attention.notReconciled.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Unresolved Txns</span><span className="font-mono-data text-warning font-medium">{attention.unresolvedTransactions.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">No Approved Notes</span><span className="font-mono-data text-destructive font-medium">{attention.noApprovedNotes.length}</span></div>
          </div>
          {highRisk.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">High-risk ({highRisk.length})</p>
              <div className="space-y-1">
                {highRisk.slice(0, 5).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openClient(c.name)}
                    className="w-full flex items-center justify-between text-xs py-1 hover:bg-accent/40 -mx-2 px-2 rounded-md transition-colors text-left cursor-pointer"
                  >
                    <span className="text-foreground truncate mr-2">{c.name}</span>
                    <span className="font-mono-data text-destructive font-semibold">{c.completionPct}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Performance</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Clients</span><span className="font-mono-data text-foreground">{kpi.total}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Avg Completion</span><span className="font-mono-data text-foreground">{kpi.avgCompletion}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Outstanding Stmts</span><span className="font-mono-data text-foreground">{kpi.outstandingStatements}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Without Notes</span><span className="font-mono-data text-foreground">{kpi.withoutNotes}</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">Top Bookkeepers</p>
            <div className="space-y-1">
              {bkStats.slice(0, 3).map((bk, i) => (
                <div key={bk.name} className="flex items-center justify-between text-xs py-1">
                  <span className="text-foreground">#{i + 1} {bk.name}</span>
                  <span className="font-mono-data text-foreground font-semibold">{bk.rate}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {clientModal}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error, dataUpdatedAt, refetch, isFetching } = useSheetData();
  const { contacts: merWorkflowContacts } = useMerWorkflowContacts();
  const dashRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useLocalState(false);
  const [monthFilter, setMonthFilter] = useLocalState<string>("current");
  const [, setNowTick] = useLocalState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [setNowTick]);

  const handleCapture = useCallback(async () => {
    if (!dashRef.current || capturing) return;
    setCapturing(true);
    try {
      const canvas = await html2canvas(dashRef.current, {
        backgroundColor: "#1a1614",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      link.download = `MER_Dashboard_${date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "PNG saved", description: `Dashboard exported as MER_Dashboard_${date}.png` });
    } catch {
      toast({ title: "Capture failed", description: "Could not generate PNG", variant: "destructive" });
    } finally {
      setCapturing(false);
    }
  }, [capturing]);

  const { isDeveloper } = useDeveloperFilter();

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

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
      const gid = (c as any).ghlContactId as string | undefined;
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
        complianceStatus: "Pending MER",
        ghlContactId: contact.id,
        categoryTags: (contact.tags || []).join(","),
      } as Client;
    });
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

  // Live sync indicator state
  const syncedMs = dataUpdatedAt || 0;
  const syncedAgo = (() => {
    if (!syncedMs) return "—";
    const diff = Math.max(0, Date.now() - syncedMs);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
  })();


  return (
    <div ref={dashRef} className="space-y-6 sm:space-y-7">
      {/* Top bar: Month picker + Capture */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-end gap-3 flex-wrap">
          <MonthFilter
            value={monthFilter}
            onChange={setMonthFilter}
            months={availableMonths}
            latestMonth={latestMonth}
            label="Reporting Month"
          />
          {!isLatest && (
            <button
              onClick={() => setMonthFilter("current")}
              className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline pb-2.5"
            >
              Reset to latest
            </button>
          )}
          <div className="pb-2.5 text-[11px] text-muted-foreground">
            <span className="font-mono-data text-foreground font-semibold">{clients.length}</span> clients ·{" "}
            {isLatest ? <span className="text-success">live</span> : <span className="text-warning">historical view</span>}
          </div>
        </div>
        <button
          onClick={handleCapture}
          disabled={capturing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground shadow-card hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          <Camera className={`h-3.5 w-3.5 ${capturing ? "animate-pulse" : ""}`} />
          {capturing ? "Capturing…" : "Capture as PNG"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KPICard title="Total Clients" value={kpi.total} icon={Users} index={0} />
        <KPICard title="Compliant" value={kpi.compliant} icon={CheckCircle2} variant="success" index={1}
          tooltip={<><p className="font-semibold text-foreground mb-1">Compliant</p><p>A client counts as Compliant only when ALL 7 checks pass: Bank Transactions present (not missing), 0 Uncategorized Transactions, 0 Unapplied Payments, Statement Request = Received, Prev Month Notes Approved, Financials Sent To Client, and Books Closed In QB.</p></>} />
        <KPICard title="Non-Compliant" value={kpi.nonCompliant} icon={XCircle} variant="destructive" index={2}
          tooltip={<><p className="font-semibold text-foreground mb-1">Non-Compliant</p><p>Any client where one or more of the 7 compliance checks fail and the sheet Status is not "On Hold". Hover an individual badge to see which specific fields failed.</p></>} />
        <KPICard title="On Hold" value={kpi.onHold} icon={Pause} variant="warning" index={3}
          tooltip={<><p className="font-semibold text-foreground mb-1">On Hold</p><p>Triggered when the sheet's Status column contains the word "hold" (case-insensitive). On Hold takes precedence over the other 7 checks.</p></>} />
        <KPICard title="Pending MER" value={kpi.pendingMer} icon={Pause} variant="default" index={4}
          tooltip={<><p className="font-semibold text-foreground mb-1">Pending MER</p><p>Active GHL contacts (mer-workflow tag) that have not submitted any MER data yet. They are tracked separately from On Hold so the compliance KPIs aren't inflated.</p></>} />
        <KPICard title="Completion %" value={`${kpi.avgCompletion}%`} icon={TrendingUp} index={4} />
        <KPICard title="Not Reconciled" value={kpi.notReconciled} icon={AlertTriangle} variant="destructive" index={5} />
        <KPICard title="Outstanding Stmts" value={kpi.outstandingStatements} icon={FileText} variant="warning" index={6} />
        <KPICard title="No Updated Notes" value={kpi.withoutNotes} icon={StickyNote} variant="destructive" index={7} />
      </div>

      {/* Charts: Donut + Breakdown Bar */}
      <KPIChartsSection kpi={kpi} breakdown={breakdown} />

      {/* Compliance Breakdown Progress Bars */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card">
        <h2 className="text-sm font-semibold text-foreground mb-4 sm:mb-5">Compliance Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <ComplianceProgress label="Bank Transactions" value={breakdown.bankPct} index={0} />
          <ComplianceProgress label="Uncategorized Transactions" value={breakdown.uncatPct} index={1} />
          <ComplianceProgress label="Unapplied Payments" value={breakdown.unappliedPct} index={2} />
          <ComplianceProgress label="Statement Requests" value={breakdown.stmtPct} index={3} />
        </div>
      </motion.div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }}
          whileHover={{ scale: 1.005 }} className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
          <h2 className="text-sm font-semibold text-foreground mb-4 sm:mb-5">Compliance Trend</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyTrends} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: CHART_COLORS.muted }} />
              <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.muted }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="compliant" stroke={CHART_COLORS.success} strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, fill: CHART_COLORS.bg }} name="Compliant" />
              <Line type="monotone" dataKey="nonCompliant" stroke={CHART_COLORS.destructive} strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, fill: CHART_COLORS.bg }} name="Non-Compliant" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.7 }}
          whileHover={{ scale: 1.005 }} className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
          <h2 className="text-sm font-semibold text-foreground mb-4 sm:mb-5">Completion % by Month</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyTrends} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: CHART_COLORS.muted }} />
              <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.muted }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(20, 8%, 14%)" }} />
              <Bar dataKey="completionPct" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} name="Completion %" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* At-Risk Alerts (configurable in Settings) */}
      <AtRiskAlerts />

      {/* Needs Attention + Bookkeepers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <NeedsAttentionSection clients={clients} merHistory={merHistory} actionLog={data.actionLog} />
        <BookkeepersSection clients={clients} bookkeepers={bookkeepers} />
      </div>

      {/* Reports Summary */}
      <ReportsSummarySection clients={clients} bookkeepers={bookkeepers} />

      {/* Link to Export Center */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 1.1 }}>
        <Link to="/reports" className="group block rounded-xl border border-border bg-card hover:bg-accent/30 p-5 shadow-card hover:shadow-card-hover transition-[box-shadow,background-color] duration-300">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Need to download a report?</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">All exports — submissions, scorecards, exec summary, full backup &amp; more — live in the Export Center.</p>
            </div>
            <div className="flex items-center gap-1 text-primary text-xs font-semibold shrink-0">
              Open Export Center <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
