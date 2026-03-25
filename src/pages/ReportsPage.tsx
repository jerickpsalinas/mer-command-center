import ComplianceProgress from "@/components/ComplianceProgress";
import StatusBadge from "@/components/StatusBadge";
import { motion } from "framer-motion";
import { FileText, ShieldAlert, BarChart3, Users } from "lucide-react";
import { useSheetData, getKPIMetrics, getComplianceBreakdown, getBookkeeperStats, getNeedsAttention } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";

export default function ReportsPage() {
  const { data, isLoading, error } = useSheetData();
  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  const { clients, bookkeepers } = data;
  const kpi = getKPIMetrics(clients);
  const breakdown = getComplianceBreakdown(clients);
  const bkStats = getBookkeeperStats(clients, bookkeepers);
  const attention = getNeedsAttention(clients);

  const sections = [
    {
      title: "Compliance Summary", icon: FileText,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-mono-data font-semibold text-success">{kpi.compliant}</p><p className="text-xs text-muted-foreground">Compliant</p></div>
            <div><p className="text-2xl font-mono-data font-semibold text-destructive">{kpi.nonCompliant}</p><p className="text-xs text-muted-foreground">Non-Compliant</p></div>
            <div><p className="text-2xl font-mono-data font-semibold text-foreground">{kpi.avgCompletion}%</p><p className="text-xs text-muted-foreground">Avg Completion</p></div>
          </div>
          <div className="space-y-3">
            <ComplianceProgress label="Bank Transactions" value={breakdown.bankPct} />
            <ComplianceProgress label="Uncategorized" value={breakdown.uncatPct} />
            <ComplianceProgress label="Unapplied Payments" value={breakdown.unappliedPct} />
            <ComplianceProgress label="Statements" value={breakdown.stmtPct} />
          </div>
        </div>
      ),
    },
    {
      title: "Risk Summary", icon: ShieldAlert,
      content: (
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Missing Statements</span><span className="font-mono-data text-destructive font-medium">{attention.missingStatements.length}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Not Reconciled</span><span className="font-mono-data text-destructive font-medium">{attention.notReconciled.length}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Unresolved Txns</span><span className="font-mono-data text-warning font-medium">{attention.unresolvedTransactions.length}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">No Approved Notes</span><span className="font-mono-data text-destructive font-medium">{attention.noApprovedNotes.length}</span></div>
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">High-risk clients:</p>
            <div className="mt-2 space-y-1">
              {clients.filter(c => c.completionPct < 40).map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-foreground">{c.name}</span>
                  <span className="font-mono-data text-xs text-destructive">{c.completionPct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Client Status Breakdown", icon: Users,
      content: (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b border-border">
            <div><p className="text-lg font-mono-data font-semibold text-foreground">{clients.filter(c => c.clientType === "School").length}</p><p className="text-xs text-muted-foreground">Schools</p></div>
            <div><p className="text-lg font-mono-data font-semibold text-foreground">{clients.filter(c => c.clientType === "For-Profit").length}</p><p className="text-xs text-muted-foreground">For-Profit</p></div>
            <div><p className="text-lg font-mono-data font-semibold text-foreground">{clients.filter(c => c.clientType === "Non-Profit").length}</p><p className="text-xs text-muted-foreground">Non-Profit</p></div>
          </div>
          {bkStats.map(bk => (
            <div key={bk.name} className="flex items-center justify-between text-sm py-1">
              <span className="text-foreground">{bk.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{bk.totalClients} clients</span>
                <span className="font-mono-data text-xs font-medium text-foreground">{bk.rate}%</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Monthly Performance", icon: BarChart3,
      content: (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total Clients</span><span className="font-mono-data text-foreground">{kpi.total}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Overall Completion</span><span className="font-mono-data text-foreground">{kpi.avgCompletion}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Outstanding Statements</span><span className="font-mono-data text-foreground">{kpi.outstandingStatements}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Without Notes</span><span className="font-mono-data text-foreground">{kpi.withoutNotes}</span></div>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {sections.map((section, i) => (
        <motion.div key={section.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
          className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <section.icon className="h-4 w-4 text-primary" />{section.title}
          </h2>
          {section.content}
        </motion.div>
      ))}
    </div>
  );
}
