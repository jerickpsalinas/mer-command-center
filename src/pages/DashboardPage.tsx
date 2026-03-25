import {
  Users, CheckCircle2, XCircle, Pause, TrendingUp, AlertTriangle,
  FileText, StickyNote, Award, Clock, AlertCircle, ChevronRight,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import KPICard from "@/components/KPICard";
import ComplianceProgress from "@/components/ComplianceProgress";
import StatusBadge from "@/components/StatusBadge";
import { useSheetData, getKPIMetrics, getComplianceBreakdown, getNeedsAttention, getBookkeeperStats } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";
import { motion } from "framer-motion";
import type { Client } from "@/data/mockData";

function NeedsAttentionSection({ clients }: { clients: Client[] }) {
  const attention = getNeedsAttention(clients);

  const sections = [
    { title: "Missing Bank Statements", count: attention.missingStatements.length, icon: FileText, priority: "critical" as const,
      items: attention.missingStatements.map(c => ({ id: c.id, label: c.name, badge: <StatusBadge status="Non-Compliant" /> })) },
    { title: "Unresolved Transactions", count: attention.unresolvedTransactions.length, icon: AlertCircle, priority: "high" as const,
      items: attention.unresolvedTransactions.slice(0, 6).map(c => ({ id: c.id, label: c.name, badge: <span className="font-mono-data text-xs font-semibold text-destructive">{c.uncategorizedTransactions}</span> })) },
    { title: "Not Reconciled", count: attention.notReconciled.length, icon: Clock, priority: "medium" as const,
      items: attention.notReconciled.slice(0, 5).map(c => ({ id: c.id, label: c.name, badge: <span className="font-mono-data text-xs text-muted-foreground">{c.lastReconciledDate}</span> })) },
    { title: "No Approved Notes", count: attention.noApprovedNotes.length, icon: StickyNote, priority: "medium" as const, items: [] },
  ];

  const priorityStyles = {
    critical: "bg-destructive/8 border-destructive/20 text-destructive",
    high: "bg-warning/8 border-warning/20 text-warning",
    medium: "bg-muted border-border text-muted-foreground",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.8 }}
      className="lg:col-span-2 rounded-xl border border-destructive/15 bg-card shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-destructive/[0.02]">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
          Needs Attention
          <span className="ml-auto text-xs font-mono-data text-destructive font-semibold">{sections.reduce((sum, s) => sum + s.count, 0)} issues</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {sections.map((section) => (
          <div key={section.title} className="p-5">
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
                  <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0 group cursor-pointer hover:bg-accent/30 -mx-2 px-2 rounded-md transition-colors">
                    <span className="text-foreground truncate text-[13px]">{item.label}</span>
                    <div className="flex items-center gap-1.5">{item.badge}<ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-3xl font-mono-data font-bold text-destructive">{section.count}</p>
                <p className="text-xs text-muted-foreground mt-1">clients without approved notes</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function BookkeepersSection({ clients, bookkeepers }: { clients: Client[]; bookkeepers: string[] }) {
  const bkStats = getBookkeeperStats(clients, bookkeepers);
  const compliantClients = clients.filter(c => c.complianceStatus === "Compliant").slice(0, 2);
  const missingClients = clients.filter(c => c.bankTransactions.includes("Missing")).slice(0, 1);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.9 }}
      className="rounded-xl border border-border bg-card shadow-card">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><Award className="h-4 w-4 text-primary" /></div>
          Top Bookkeepers
        </h2>
      </div>
      <div className="p-5 space-y-3">
        {bkStats.map((bk, i) => (
          <div key={bk.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors -mx-2">
            <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center text-xs font-bold text-primary">#{i + 1}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground">{bk.name}</p>
              <p className="text-[11px] text-muted-foreground">{bk.totalClients} clients · {bk.compliant} compliant</p>
            </div>
            <div className="text-right"><span className="font-mono-data text-sm font-bold text-foreground">{bk.rate}%</span></div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-6 py-4">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Recent Activity</h3>
        <div className="space-y-2.5 text-[12px] text-muted-foreground">
          {compliantClients.map(c => <p key={c.id}>{c.name} marked <span className="text-success font-semibold">Compliant</span></p>)}
          {missingClients.map(c => <p key={c.id}>{c.name} flagged — <span className="text-destructive font-semibold">missing statements</span></p>)}
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useSheetData();
  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  const { clients, monthlyTrends, bookkeepers } = data;
  const kpi = getKPIMetrics(clients);
  const breakdown = getComplianceBreakdown(clients);

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Clients" value={kpi.total} icon={Users} index={0} />
        <KPICard title="Compliant" value={kpi.compliant} icon={CheckCircle2} variant="success" index={1} />
        <KPICard title="Non-Compliant" value={kpi.nonCompliant} icon={XCircle} variant="destructive" index={2} />
        <KPICard title="On Hold" value={kpi.onHold} icon={Pause} variant="warning" index={3} />
        <KPICard title="Completion %" value={`${kpi.avgCompletion}%`} icon={TrendingUp} index={4} />
        <KPICard title="Not Reconciled" value={kpi.notReconciled} icon={AlertTriangle} variant="destructive" index={5} />
        <KPICard title="Outstanding Stmts" value={kpi.outstandingStatements} icon={FileText} variant="warning" index={6} />
        <KPICard title="No Updated Notes" value={kpi.withoutNotes} icon={StickyNote} variant="destructive" index={7} />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}
        className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-sm font-semibold text-foreground mb-5">Compliance Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ComplianceProgress label="Bank Transactions" value={breakdown.bankPct} index={0} />
          <ComplianceProgress label="Uncategorized Transactions" value={breakdown.uncatPct} index={1} />
          <ComplianceProgress label="Unapplied Payments" value={breakdown.unappliedPct} index={2} />
          <ComplianceProgress label="Statement Requests" value={breakdown.stmtPct} index={3} />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
          <h2 className="text-sm font-semibold text-foreground mb-5">Compliance Trend</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 8% 16%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(25 10% 50%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(25 10% 50%)" }} />
              <Tooltip contentStyle={{ background: "hsl(20 10% 13%)", border: "1px solid hsl(20 8% 20%)", borderRadius: "8px", fontSize: "12px", boxShadow: "var(--shadow-elevated)", color: "hsl(30 25% 88%)" }} />
              <Line type="monotone" dataKey="compliant" stroke="hsl(160 55% 42%)" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, fill: "hsl(20 10% 11%)" }} name="Compliant" />
              <Line type="monotone" dataKey="nonCompliant" stroke="hsl(0 65% 50%)" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, fill: "hsl(20 10% 11%)" }} name="Non-Compliant" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.7 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
          <h2 className="text-sm font-semibold text-foreground mb-5">Completion % by Month</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 8% 16%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(25 10% 50%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(25 10% 50%)" }} />
              <Tooltip contentStyle={{ background: "hsl(20 10% 13%)", border: "1px solid hsl(20 8% 20%)", borderRadius: "8px", fontSize: "12px", boxShadow: "var(--shadow-elevated)", color: "hsl(30 25% 88%)" }} />
              <Bar dataKey="completionPct" fill="hsl(340 45% 55%)" radius={[6, 6, 0, 0]} name="Completion %" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <NeedsAttentionSection clients={clients} />
        <BookkeepersSection clients={clients} bookkeepers={bookkeepers} />
      </div>
    </div>
  );
}
