import type { Client, MonthlyTrend } from "@/data/mockData";

export interface CycleEntry {
  id: string;
  clientName: string;
  companyName: string;
  clientEmail: string;
  ghlContactId: string;
  stageNumber: number;
  stageName: string;
  month: string;
  timestamp: string;
  categoryTags: string;
  cycleStatus: string;
  daysInStage: number;
  escalated: boolean;
  notes: string;
  cycleKey: string;
}

export interface MerHistoryRow extends Client {
  month: string;
  monthRaw: string;
  monthDate: string;
  timestamp: string;
  timestampMs: number;
  submittedBy: string;
}

export interface ActionLogEntry {
  timestamp: string;
  actionType: string;
  clientName: string;
  ghlContactId: string;
  cycleMonth: string;
  triggeredBy: string;
  status: string;
  notes: string;
}

export function parseActionLog(rows: Record<string, string>[]): ActionLogEntry[] {
  return rows
    .filter((row) => row["Action Type"] && row["GHL Contact ID"])
    .map((row) => ({
      timestamp: row["Timestamp"] || "",
      actionType: row["Action Type"] || "",
      clientName: row["Client Name"] || "",
      ghlContactId: row["GHL Contact ID"] || "",
      cycleMonth: row["Cycle Month"] || "",
      triggeredBy: row["Triggered By"] || "",
      status: row["Status"] || "",
      notes: row["Notes"] || "",
    }));
}

export interface SheetData {
  clients: Client[];
  monthlyTrends: MonthlyTrend[];
  bookkeepers: string[];
  cycleEntries: CycleEntry[];
  submittedBy: Record<string, string>;
  clientMonths: Record<string, string>;
  merHistory: MerHistoryRow[];
  availableMonths: string[];
  latestMonth: string;
  actionLog: ActionLogEntry[];
}

export function isUnreconciled(val: unknown): boolean {
  const v = String(val ?? "").trim().toLowerCase();
  return v === "" || v === "n/a" || v === "-" || v === "none" || v === "null";
}

// ============ DEMO MODE — hardcoded sample data ============

const GREENFIELD_CLIENTS = [
  { id:"1", name:"Maple Street Tax Co.", clientType:"For-Profit", bookkeeper:"Sarah", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"2", name:"Riverside Dental Group", clientType:"For-Profit", bookkeeper:"Marcus", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"3", name:"Pinehurst Realty LLC", clientType:"For-Profit", bookkeeper:"Sarah", bankTransactions:"1 Missing", uncategorizedTransactions:5, transactionsWithoutPayees:2, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Not Received", lastReconciledDate:"06/30/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:33, complianceStatus:"Non-Compliant" },
  { id:"4", name:"Green Valley Farms", clientType:"For-Profit", bookkeeper:"Tyler", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"5", name:"Sunrise Wellness Spa", clientType:"For-Profit", bookkeeper:"Marcus", bankTransactions:"1 Missing", uncategorizedTransactions:8, transactionsWithoutPayees:4, undepositedFunds:1, unappliedPayments:0, statementRequestStatus:"Not Received", lastReconciledDate:"06/30/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:11, complianceStatus:"Non-Compliant" },
  { id:"6", name:"Harbor View Marina", clientType:"For-Profit", bookkeeper:"Tyler", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"7", name:"Summit Legal Partners", clientType:"For-Profit", bookkeeper:"Sarah", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"05/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:56, complianceStatus:"On Hold" },
  { id:"8", name:"Blue Ridge Healthcare", clientType:"Non-Profit", bookkeeper:"Tyler", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"9", name:"Oakwood Learning Center", clientType:"School", bookkeeper:"Sarah", bankTransactions:"Received", uncategorizedTransactions:2, transactionsWithoutPayees:1, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:56, complianceStatus:"Non-Compliant" },
  { id:"10", name:"Coastal Fitness Studio", clientType:"For-Profit", bookkeeper:"Marcus", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"11", name:"Lakeview Community Church", clientType:"Non-Profit", bookkeeper:"Tyler", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"12", name:"Northgate Auto Services", clientType:"For-Profit", bookkeeper:"Marcus", bankTransactions:"Received", uncategorizedTransactions:3, transactionsWithoutPayees:1, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"07/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:44, complianceStatus:"Non-Compliant" },
  { id:"13", name:"Elmwood Dance Academy", clientType:"For-Profit", bookkeeper:"Sarah", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"14", name:"Silverstone Investments", clientType:"For-Profit", bookkeeper:"Tyler", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"15", name:"Ridgewood Pet Clinic", clientType:"For-Profit", bookkeeper:"Marcus", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"16", name:"Lakewood Youth Foundation", clientType:"Non-Profit", bookkeeper:"Tyler", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:false, booksClosedInQB:true, completionPct:89, complianceStatus:"Non-Compliant" },
  { id:"17", name:"Westside Construction Co.", clientType:"For-Profit", bookkeeper:"Sarah", bankTransactions:"Received", uncategorizedTransactions:1, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:44, complianceStatus:"Non-Compliant" },
  { id:"18", name:"Thornfield Bakery LLC", clientType:"For-Profit", bookkeeper:"Marcus", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
];

const GREENFIELD_MONTHLY_TRENDS: MonthlyTrend[] = [
  { month:"Mar 2025", compliant:12, nonCompliant:6, completionPct:63, trend:"-", type:"auto" },
  { month:"Apr 2025", compliant:10, nonCompliant:8, completionPct:50, trend:"Declining", type:"auto" },
  { month:"May 2025", compliant:3, nonCompliant:15, completionPct:18, trend:"Declining", type:"auto" },
  { month:"Jun 2025", compliant:5, nonCompliant:13, completionPct:28, trend:"Improving", type:"auto" },
  { month:"Jul 2025", compliant:9, nonCompliant:9, completionPct:50, trend:"Improving", type:"auto" },
  { month:"Aug 2025", compliant:11, nonCompliant:5, completionPct:61, trend:"Improving", type:"auto" },
];

const GREENFIELD_BOOKKEEPERS = ["Sarah", "Marcus", "Tyler"];

export async function fetchSheetData(): Promise<SheetData> {
  const submittedBy: Record<string, string> = {};
  const clientMonths: Record<string, string> = {};
  for (const c of GREENFIELD_CLIENTS) {
    submittedBy[c.name] = c.bookkeeper;
    clientMonths[c.name] = "Aug 2025";
  }
  return {
    clients: GREENFIELD_CLIENTS as any[],
    monthlyTrends: GREENFIELD_MONTHLY_TRENDS,
    merHistory: GREENFIELD_CLIENTS.map((c, i) => ({
      ...(c as any),
      month: "Aug 2025",
      monthRaw: "Aug 2025",
      monthDate: "2025-08-01",
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      timestampMs: Date.now() - i * 3600000,
      submittedBy: c.bookkeeper,
    })) as MerHistoryRow[],
    clientMonths,
    submittedBy,
    latestMonth: "Aug 2025",
    actionLog: [
      { timestamp: new Date(Date.now() - 120000).toISOString(), actionType: "Books Closed", clientName: "Maple Street Tax Co.", ghlContactId: "1", cycleMonth: "Aug 2025", triggeredBy: "Sarah", status: "success", notes: "" },
      { timestamp: new Date(Date.now() - 900000).toISOString(), actionType: "AI Categorization", clientName: "Riverside Dental Group", ghlContactId: "2", cycleMonth: "Aug 2025", triggeredBy: "System", status: "success", notes: "12 transactions auto-categorized" },
      { timestamp: new Date(Date.now() - 3600000).toISOString(), actionType: "Statement Flagged", clientName: "Sunrise Wellness Spa", ghlContactId: "5", cycleMonth: "Aug 2025", triggeredBy: "System", status: "warning", notes: "Bank statement not received" },
      { timestamp: new Date(Date.now() - 7200000).toISOString(), actionType: "Financials Sent", clientName: "Green Valley Farms", ghlContactId: "4", cycleMonth: "Aug 2025", triggeredBy: "Tyler", status: "success", notes: "" },
      { timestamp: new Date(Date.now() - 10800000).toISOString(), actionType: "Books Closed", clientName: "Harbor View Marina", ghlContactId: "6", cycleMonth: "Aug 2025", triggeredBy: "Tyler", status: "success", notes: "" },
    ],
    bookkeepers: GREENFIELD_BOOKKEEPERS,
    availableMonths: ["Mar 2025","Apr 2025","May 2025","Jun 2025","Jul 2025","Aug 2025"],
    cycleEntries: [],
  };
}
