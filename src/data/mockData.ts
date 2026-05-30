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
  complianceStatus: "Compliant" | "Non-Compliant" | "On Hold";
  merKey?: string;
  ghlContactId?: string;
  categoryTags?: string;
}

export const clients: Client[] = [
  { id: "1", name: "Academy of Excellence", clientType: "School", bookkeeper: "Daniel", bankTransactions: "Received", uncategorizedTransactions: 3, transactionsWithoutPayees: 1, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "2", name: "Creative Pathways Preparatory Academy", clientType: "School", bookkeeper: "Daniel", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: true, financialsSentToClient: true, booksClosedInQB: true, completionPct: 100, complianceStatus: "Compliant" },
  { id: "3", name: "Fathers H.A.R.B.O.R", clientType: "School", bookkeeper: "Daniel", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: true, financialsSentToClient: true, booksClosedInQB: true, completionPct: 100, complianceStatus: "Compliant" },
  { id: "4", name: "Alpha Envirotech Consulting", clientType: "For-Profit", bookkeeper: "Daniel", bankTransactions: "Received", uncategorizedTransactions: 5, transactionsWithoutPayees: 2, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "03/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "5", name: "Advanced Hair Care and Wellness", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "1 Missing", uncategorizedTransactions: 8, transactionsWithoutPayees: 4, undepositedFunds: 1, unappliedPayments: 0, statementRequestStatus: "Not Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 0, complianceStatus: "Non-Compliant" },
  { id: "6", name: "Fields of Arts Christian Academy", clientType: "School", bookkeeper: "Daniel", bankTransactions: "Received", uncategorizedTransactions: 2, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "7", name: "Aging Grace", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 1, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "8", name: "Akay83 Real Estate LLC", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "9", name: "Chatman Speaks LLC", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "10", name: "Complete Dimensions Wellness", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "05/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "11", name: "Coastal Restore", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "12", name: "Extreme Party Palace & More LLC", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "13", name: "Heart to Heart Christian Academy", clientType: "School", bookkeeper: "Daniel", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "14", name: "Freedom Logistics", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "15", name: "Home Improvement Solutions", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "16", name: "Jericho School For Children with Autism", clientType: "School", bookkeeper: "Daniel", bankTransactions: "1 Missing", uncategorizedTransactions: 12, transactionsWithoutPayees: 5, undepositedFunds: 0, unappliedPayments: 1, statementRequestStatus: "Not Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 22, complianceStatus: "Non-Compliant" },
  { id: "17", name: "I'm a Star Foundation Inc", clientType: "Non-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "18", name: "Indulgence Dance Studio", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "19", name: "JG PowerHouse Gym LLC", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "20", name: "Livality Integrated Health", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "21", name: "Kidz Club Academy LLC", clientType: "School", bookkeeper: "Daniel", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "22", name: "North Florida Care Services LLC", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "23", name: "Suncoast Community School", clientType: "School", bookkeeper: "Daniel", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "24", name: "TDH Christian Academy", clientType: "School", bookkeeper: "Daniel", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "25", name: "Northside Coalition of Jacksonville", clientType: "Non-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "26", name: "Sk8City JAX", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "27", name: "Open Storehouse", clientType: "Non-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "28", name: "Tina Smiths Cleaning", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "29", name: "The New Life Church at Jacksonville Inc", clientType: "Non-Profit", bookkeeper: "Daniel", bankTransactions: "1 Missing", uncategorizedTransactions: 3, transactionsWithoutPayees: 1, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Not Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "30", name: "The Restored House Ministries", clientType: "Non-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "31", name: "Wimberly Handyman Services & More", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "32", name: "Zarephath Christian Academy", clientType: "School", bookkeeper: "Daniel", bankTransactions: "Received", uncategorizedTransactions: 2, transactionsWithoutPayees: 1, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "10/31/24", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 44, complianceStatus: "Non-Compliant" },
  { id: "33", name: "MAI Academy", clientType: "For-Profit", bookkeeper: "Daniel", bankTransactions: "1 Missing", uncategorizedTransactions: 7, transactionsWithoutPayees: 3, undepositedFunds: 0, unappliedPayments: 1, statementRequestStatus: "Not Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 33, complianceStatus: "Non-Compliant" },
  { id: "34", name: "Elevation Lounge Jax", clientType: "For-Profit", bookkeeper: "Jaydin", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "35", name: "World of Joy and Caring Corp", clientType: "For-Profit", bookkeeper: "Keyana", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
];

export interface MonthlyTrend {
  month: string;
  compliant: number;
  nonCompliant: number;
  completionPct: number;
  trend?: string;
  type?: "auto" | "manual";
}

export const monthlyTrends: MonthlyTrend[] = [
  { month: "Jan 2025", compliant: 20, nonCompliant: 1, completionPct: 63 },
  { month: "Feb 2025", compliant: 25, nonCompliant: 1, completionPct: 78 },
  { month: "Mar 2025", compliant: 10, nonCompliant: 1, completionPct: 31 },
  { month: "Apr 2025", compliant: 16, nonCompliant: 1, completionPct: 50 },
  { month: "May 2025", compliant: 0, nonCompliant: 29, completionPct: 0 },
  { month: "Jun 2025", compliant: 2, nonCompliant: 34, completionPct: 6 },
  { month: "Jul 2025", compliant: 2, nonCompliant: 34, completionPct: 6 },
];

export const bookkeepers = ["Daniel", "Keyana", "Tyler", "Jaydin"];
export const clientTypes = ["School", "Non-Profit", "For-Profit"];
export const complianceStatuses = ["Compliant", "Non-Compliant", "On Hold"];

export function getKPIMetrics() {
  const total = clients.length;
  const compliant = clients.filter(c => c.complianceStatus === "Compliant").length;
  const nonCompliant = clients.filter(c => c.complianceStatus === "Non-Compliant").length;
  const onHold = clients.filter(c => c.complianceStatus === "On Hold").length;
  const avgCompletion = Math.round(clients.reduce((sum, c) => sum + c.completionPct, 0) / total);
  const notReconciled = clients.filter(c => c.lastReconciledDate !== "07/31/25").length;
  const outstandingStatements = clients.filter(c => c.statementRequestStatus === "Not Received").length;
  const withoutNotes = clients.filter(c => !c.prevMonthNotesApproved).length;

  return { total, compliant, nonCompliant, onHold, avgCompletion, notReconciled, outstandingStatements, withoutNotes };
}

export function getComplianceBreakdown() {
  const total = clients.length;
  const bankComplete = clients.filter(c => c.bankTransactions === "Received").length;
  const uncatComplete = clients.filter(c => c.uncategorizedTransactions === 0).length;
  const unappliedComplete = clients.filter(c => c.unappliedPayments === 0).length;
  const stmtComplete = clients.filter(c => c.statementRequestStatus === "Received").length;

  return {
    bankPct: Math.round((bankComplete / total) * 100),
    uncatPct: Math.round((uncatComplete / total) * 100),
    unappliedPct: Math.round((unappliedComplete / total) * 100),
    stmtPct: Math.round((stmtComplete / total) * 100),
  };
}

export function getNeedsAttention() {
  return {
    missingStatements: clients.filter(c => c.bankTransactions.includes("Missing")),
    notReconciled: clients.filter(c => c.lastReconciledDate !== "07/31/25"),
    unresolvedTransactions: clients.filter(c => c.uncategorizedTransactions > 0),
    noApprovedNotes: clients.filter(c => !c.prevMonthNotesApproved),
  };
}

export function getBookkeeperStats() {
  const stats = bookkeepers.map(bk => {
    const bkClients = clients.filter(c => c.bookkeeper === bk);
    const compliant = bkClients.filter(c => c.complianceStatus === "Compliant").length;
    const rate = bkClients.length > 0 ? Math.round((compliant / bkClients.length) * 100) : 0;
    return { name: bk, totalClients: bkClients.length, compliant, rate };
  });
  return stats.sort((a, b) => b.rate - a.rate);
}
