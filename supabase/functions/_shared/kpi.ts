import type { Client } from "./merTypes.ts";
import { isUnreconciled, statementReceived } from "./complianceExplain.ts";

export function getKPIMetrics(clients: Client[]) {
  const total = clients.length;
  if (total === 0) return { total: 0, compliant: 0, nonCompliant: 0, onHold: 0, pendingMer: 0, rolledOver: 0, avgCompletion: 0, notReconciled: 0, outstandingStatements: 0, withoutNotes: 0 };
  const compliant = clients.filter((c) => c.complianceStatus === "Compliant").length;
  const nonCompliant = clients.filter((c) => c.complianceStatus === "Non-Compliant").length;
  const onHold = clients.filter((c) => c.complianceStatus === "On Hold").length;
  const pendingMer = clients.filter((c) => c.complianceStatus === "Pending MER").length;
  const rolledOver = clients.filter((c) => c.rolledOver).length;

  // Pending MER and On Hold clients are excluded from the completion average:
  // Pending MER hasn't submitted anything; On Hold is intentionally paused.
  // Including either inflates or deflates the team's real completion number.
  const submitted = clients.filter((c) => c.complianceStatus !== "Pending MER" && c.complianceStatus !== "On Hold");
  const submittedCount = submitted.length || 1;
  const avgCompletion = Math.round(
    submitted.reduce((s, c) => s + c.completionPct, 0) / submittedCount,
  );
  const notReconciled = submitted.filter((c) => isUnreconciled(c.lastReconciledDate)).length;
  const outstandingStatements = submitted.filter((c) => !statementReceived(c.statementRequestStatus)).length;
  const withoutNotes = submitted.filter((c) => !c.prevMonthNotesApproved).length;
  return { total, compliant, nonCompliant, onHold, pendingMer, rolledOver, avgCompletion, notReconciled, outstandingStatements, withoutNotes };
}

