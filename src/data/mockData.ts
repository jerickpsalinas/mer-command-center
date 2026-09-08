export interface Client {
  id: string;
  name: string;
  clientType: "School" | "Non-Profit" | "For-Profit";
  bookkeeper: string;
  status?: string;
  bankTransactions: string;
  uncategorizedTransactions: number;
  transactionsWithoutPayees: number;
  undepositedFunds: number;
  unappliedPayments: number;
  statementRequestStatus: string;
  lastReconciledDate: string;
  prevMonthNotesApproved: boolean;
  financialsSentToClient: boolean;
  booksClosedInQB: boolean;
  completionPct: number;
  complianceStatus: "Compliant" | "Non-Compliant" | "On Hold" | "Pending MER";
  merKey?: string;
  ghlContactId?: string;
  categoryTags?: string;
  notes?: string;
  qboConnected?: string;
  /** P&L figures synced daily from QBO via n8n (USD). Default 0 when absent. */
  totalIncome?: number;
  totalExpenses?: number;
  netIncome?: number;
  /** "Mon YYYY" label used by the Last Reconciled Date age rule. */
  reportingMonth?: string;
  /** True when the client has the GHL tag `docs-claimed-pending-verify` (WF13). */
  pendingVerification?: boolean;
  /** Company name from GHL (may differ from `name`). */
  companyName?: string;
}

export interface MonthlyTrend {
  month: string;
  compliant: number;
  nonCompliant: number;
  completionPct: number;
  trend?: string;
  type?: "auto" | "manual";
}
