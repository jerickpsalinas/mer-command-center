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
}

export const clients: Client[] = [
  { id: "1", name: "Maple Street Tax Co.", clientType: "For-Profit", bookkeeper: "Sarah", bankTransactions: "Received", uncategorizedTransactions: 3, transactionsWithoutPayees: 1, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "2", name: "Riverside Dental Group", clientType: "For-Profit", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: true, financialsSentToClient: true, booksClosedInQB: true, completionPct: 100, complianceStatus: "Compliant" },
  { id: "3", name: "Pinehurst Realty LLC", clientType: "For-Profit", bookkeeper: "Sarah", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: true, financialsSentToClient: true, booksClosedInQB: true, completionPct: 100, complianceStatus: "Compliant" },
  { id: "4", name: "Green Valley Farms", clientType: "For-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 5, transactionsWithoutPayees: 2, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "04/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "5", name: "Sunrise Wellness Spa", clientType: "For-Profit", bookkeeper: "Marcus", bankTransactions: "1 Missing", uncategorizedTransactions: 8, transactionsWithoutPayees: 4, undepositedFunds: 1, unappliedPayments: 0, statementRequestStatus: "Not Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 0, complianceStatus: "Non-Compliant" },
  { id: "6", name: "Oakwood Learning Center", clientType: "School", bookkeeper: "Sarah", bankTransactions: "Received", uncategorizedTransactions: 2, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "7", name: "Harbor View Marina", clientType: "For-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 1, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "8", name: "Summit Legal Partners", clientType: "For-Profit", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "9", name: "Blue Ridge Healthcare", clientType: "Non-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "10", name: "Coastal Fitness Studio", clientType: "For-Profit", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "06/30/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "11", name: "Lakeview Community Church", clientType: "Non-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "12", name: "Northgate Auto Services", clientType: "For-Profit", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "13", name: "Elmwood Dance Academy", clientType: "School", bookkeeper: "Sarah", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "14", name: "Silverstone Investments", clientType: "For-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "15", name: "Ridgewood Pet Clinic", clientType: "For-Profit", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "16", name: "Lakewood Youth Foundation", clientType: "Non-Profit", bookkeeper: "Sarah", bankTransactions: "1 Missing", uncategorizedTransactions: 12, transactionsWithoutPayees: 5, undepositedFunds: 0, unappliedPayments: 1, statementRequestStatus: "Not Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 22, complianceStatus: "Non-Compliant" },
  { id: "17", name: "Westside Construction Co.", clientType: "For-Profit", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "18", name: "Thornfield Bakery LLC", clientType: "For-Profit", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "19", name: "Clearwater Landscaping Inc.", clientType: "For-Profit", bookkeeper: "Sarah", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "20", name: "Maplewood Senior Care", clientType: "Non-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "21", name: "Ironwood CrossFit LLC", clientType: "For-Profit", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "22", name: "Sunridge Charter School", clientType: "School", bookkeeper: "Sarah", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "23", name: "Pinebrook Plumbing Co.", clientType: "For-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "24", name: "Horizon Church Ministries", clientType: "Non-Profit", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "25", name: "Riverbend Accounting Group", clientType: "For-Profit", bookkeeper: "Sarah", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "26", name: "Lakeside Event Center", clientType: "For-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "27", name: "Meadowbrook Veterinary Clinic", clientType: "For-Profit", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "28", name: "Sterling Property Management", clientType: "For-Profit", bookkeeper: "Sarah", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "29", name: "Valley View Auto Repair", clientType: "For-Profit", bookkeeper: "Tyler", bankTransactions: "1 Missing", uncategorizedTransactions: 3, transactionsWithoutPayees: 1, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Not Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "30", name: "Crestwood Academy", clientType: "School", bookkeeper: "Sarah", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
  { id: "31", name: "Brookside Community Foundation", clientType: "Non-Profit", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "32", name: "Pinecrest Dental Associates", clientType: "For-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 2, transactionsWithoutPayees: 1, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "11/30/24", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 44, complianceStatus: "Non-Compliant" },
  { id: "33", name: "Harvest Moon Organic Farm", clientType: "For-Profit", bookkeeper: "Sarah", bankTransactions: "1 Missing", uncategorizedTransactions: 7, transactionsWithoutPayees: 3, undepositedFunds: 0, unappliedPayments: 1, statementRequestStatus: "Not Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 33, complianceStatus: "Non-Compliant" },
  { id: "34", name: "Sunrise Christian Academy", clientType: "School", bookkeeper: "Marcus", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "08/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 67, complianceStatus: "Non-Compliant" },
  { id: "35", name: "Riverside Gym & Fitness", clientType: "For-Profit", bookkeeper: "Tyler", bankTransactions: "Received", uncategorizedTransactions: 0, transactionsWithoutPayees: 0, undepositedFunds: 0, unappliedPayments: 0, statementRequestStatus: "Received", lastReconciledDate: "07/31/25", prevMonthNotesApproved: false, financialsSentToClient: false, booksClosedInQB: false, completionPct: 56, complianceStatus: "Non-Compliant" },
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
  { month: "Mar 2025", compliant: 9, nonCompliant: 20, completionPct: 23 },
  { month: "Apr 2025", compliant: 12, nonCompliant: 17, completionPct: 30 },
  { month: "May 2025", compliant: 14, nonCompliant: 18, completionPct: 35 },
  { month: "Jun 2025", compliant: 17, nonCompliant: 18, completionPct: 43 },
  { month: "Jul 2025", compliant: 19, nonCompliant: 17, completionPct: 48 },
  { month: "Aug 2025", compliant: 25, nonCompliant: 10, completionPct: 63 },
];

export const bookkeepers = ["Sarah", "Marcus", "Tyler"];
export const clientTypes = ["School", "Non-Profit", "For-Profit"];
export const complianceStatuses = ["Compliant", "Non-Compliant", "On Hold"];

export function getKPIMetrics() {
  const total = clients.length;
  const compliant = clients.filter(c => c.complianceStatus === "Compliant").length;
  const nonCompliant = clients.filter(c => c.complianceStatus === "Non-Compliant").length;
  const onHold = clients.filter(c => c.complianceStatus === "On Hold").length;
  const avgCompletion = Math.round(clients.reduce((sum, c) => sum + c.completionPct, 0) / total);
  const notReconciled = clients.filter(c => c.lastReconciledDate !== "08/31/25").length;
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
    notReconciled: clients.filter(c => c.lastReconciledDate !== "08/31/25"),
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
