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
  if (v === "" || v === "n/a" || v === "-" || v === "none" || v === "null") return true;
  // Demo cycle anchor: anything reconciled before the latest month-end (Aug 31, 2025) is stale.
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return false;
  const month = parseInt(m[1], 10);
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  const anchor = 2025 * 12 + 8; // Aug 2025
  return year * 12 + month < anchor;
}


// ============ DEMO MODE — hardcoded sample data ============

const GREENFIELD_CLIENTS = [
  { id:"1", name:"Maple Street Tax Co.", clientType:"For-Profit", bookkeeper:"Sarah", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"2", name:"Riverside Dental Group", clientType:"For-Profit", bookkeeper:"Marcus", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"3", name:"Pinehurst Realty LLC", clientType:"For-Profit", bookkeeper:"Sarah", status:"Need to reconnect bank feed", bankTransactions:"1 Missing", uncategorizedTransactions:5, transactionsWithoutPayees:2, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Not Received", lastReconciledDate:"06/30/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:22, complianceStatus:"Non-Compliant" },
  { id:"4", name:"Green Valley Farms", clientType:"For-Profit", bookkeeper:"Tyler", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"5", name:"Sunrise Wellness Spa", clientType:"For-Profit", bookkeeper:"Marcus", status:"Need to reconnect broken bank feeds", bankTransactions:"1 Missing", uncategorizedTransactions:8, transactionsWithoutPayees:4, undepositedFunds:1, unappliedPayments:0, statementRequestStatus:"Not Received", lastReconciledDate:"06/30/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:0, complianceStatus:"Non-Compliant" },
  { id:"6", name:"Harbor View Marina", clientType:"For-Profit", bookkeeper:"Tyler", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"7", name:"Summit Legal Partners", clientType:"For-Profit", bookkeeper:"Sarah", status:"On Hold", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"05/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:44, complianceStatus:"On Hold" },
  { id:"8", name:"Blue Ridge Healthcare", clientType:"Non-Profit", bookkeeper:"Tyler", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"9", name:"Oakwood Learning Center", clientType:"School", bookkeeper:"Sarah", status:"Ready for manager's review", bankTransactions:"Received", uncategorizedTransactions:2, transactionsWithoutPayees:1, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:true, completionPct:56, complianceStatus:"Non-Compliant" },
  { id:"10", name:"Coastal Fitness Studio", clientType:"For-Profit", bookkeeper:"Marcus", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"11", name:"Lakeview Community Church", clientType:"Non-Profit", bookkeeper:"Tyler", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"12", name:"Northgate Auto Services", clientType:"For-Profit", bookkeeper:"Marcus", status:"Ready for manager's review", bankTransactions:"Received", uncategorizedTransactions:3, transactionsWithoutPayees:1, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"07/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:44, complianceStatus:"Non-Compliant" },
  { id:"13", name:"Elmwood Dance Academy", clientType:"For-Profit", bookkeeper:"Sarah", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"14", name:"Silverstone Investments", clientType:"For-Profit", bookkeeper:"Tyler", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"15", name:"Ridgewood Pet Clinic", clientType:"For-Profit", bookkeeper:"Marcus", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"16", name:"Lakewood Youth Foundation", clientType:"Non-Profit", bookkeeper:"Tyler", status:"Balance Sheet Reconciled, Missing One Statement", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Not Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:false, booksClosedInQB:true, completionPct:67, complianceStatus:"Non-Compliant" },
  { id:"17", name:"Westside Construction Co.", clientType:"For-Profit", bookkeeper:"Sarah", status:"Ready for manager's review", bankTransactions:"Received", uncategorizedTransactions:1, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:44, complianceStatus:"Non-Compliant" },
  { id:"18", name:"Thornfield Bakery LLC", clientType:"For-Profit", bookkeeper:"Marcus", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"19", name:"Clearwater Landscaping Inc.", clientType:"For-Profit", bookkeeper:"Sarah", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"20", name:"Maplewood Senior Care", clientType:"Non-Profit", bookkeeper:"Tyler", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"21", name:"Ironwood CrossFit LLC", clientType:"For-Profit", bookkeeper:"Marcus", status:"Need to reconnect bank feed", bankTransactions:"1 Missing", uncategorizedTransactions:4, transactionsWithoutPayees:2, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Not Received", lastReconciledDate:"06/30/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:11, complianceStatus:"Non-Compliant" },
  { id:"22", name:"Sunridge Charter School", clientType:"School", bookkeeper:"Sarah", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"23", name:"Pinebrook Plumbing Co.", clientType:"For-Profit", bookkeeper:"Tyler", status:"Ready for manager's review", bankTransactions:"Received", uncategorizedTransactions:6, transactionsWithoutPayees:3, undepositedFunds:0, unappliedPayments:1, statementRequestStatus:"Received", lastReconciledDate:"07/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:33, complianceStatus:"Non-Compliant" },
  { id:"24", name:"Horizon Church Ministries", clientType:"Non-Profit", bookkeeper:"Marcus", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"25", name:"Riverbend Accounting Group", clientType:"For-Profit", bookkeeper:"Sarah", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"26", name:"Lakeside Event Center", clientType:"For-Profit", bookkeeper:"Tyler", status:"On Hold", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"04/30/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:33, complianceStatus:"On Hold" },
  { id:"27", name:"Meadowbrook Veterinary Clinic", clientType:"For-Profit", bookkeeper:"Marcus", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"28", name:"Sterling Property Management", clientType:"For-Profit", bookkeeper:"Sarah", status:"Balance Sheet Reconciled, Missing One Statement", bankTransactions:"Received", uncategorizedTransactions:2, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Not Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:67, complianceStatus:"Non-Compliant" },
  { id:"29", name:"Valley View Auto Repair", clientType:"For-Profit", bookkeeper:"Tyler", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"30", name:"Crestwood Academy", clientType:"School", bookkeeper:"Sarah", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"31", name:"Brookside Community Foundation", clientType:"Non-Profit", bookkeeper:"Marcus", status:"Ready for manager's review", bankTransactions:"Received", uncategorizedTransactions:1, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:true, completionPct:56, complianceStatus:"Non-Compliant" },
  { id:"32", name:"Pinecrest Dental Associates", clientType:"For-Profit", bookkeeper:"Tyler", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"33", name:"Harvest Moon Organic Farm", clientType:"For-Profit", bookkeeper:"Sarah", status:"Need to reconnect bank feed", bankTransactions:"1 Missing", uncategorizedTransactions:3, transactionsWithoutPayees:1, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Not Received", lastReconciledDate:"07/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:22, complianceStatus:"Non-Compliant" },
  { id:"34", name:"Sunrise Christian Academy", clientType:"School", bookkeeper:"Marcus", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"35", name:"Riverside Gym & Fitness", clientType:"For-Profit", bookkeeper:"Tyler", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"36", name:"Golden Gate Insurance LLC", clientType:"For-Profit", bookkeeper:"Sarah", status:"Ready for manager's review", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:true, completionPct:56, complianceStatus:"Non-Compliant" },
  { id:"37", name:"Northside Community Clinic", clientType:"Non-Profit", bookkeeper:"Marcus", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"38", name:"Cornerstone Roofing Inc.", clientType:"For-Profit", bookkeeper:"Tyler", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
  { id:"39", name:"Willow Creek Day Care", clientType:"For-Profit", bookkeeper:"Sarah", status:"Need to reconnect bank feed", bankTransactions:"1 Missing", uncategorizedTransactions:7, transactionsWithoutPayees:3, undepositedFunds:0, unappliedPayments:1, statementRequestStatus:"Not Received", lastReconciledDate:"05/31/25", prevMonthNotesApproved:false, financialsSentToClient:false, booksClosedInQB:false, completionPct:0, complianceStatus:"Non-Compliant" },
  { id:"40", name:"Magnolia Events & Catering", clientType:"For-Profit", bookkeeper:"Marcus", status:"Complete", bankTransactions:"Received", uncategorizedTransactions:0, transactionsWithoutPayees:0, undepositedFunds:0, unappliedPayments:0, statementRequestStatus:"Received", lastReconciledDate:"08/31/25", prevMonthNotesApproved:true, financialsSentToClient:true, booksClosedInQB:true, completionPct:100, complianceStatus:"Compliant" },
];

const GREENFIELD_MONTHLY_TRENDS = [
  { month:"Mar 2025", compliant:9,  nonCompliant:20, completionPct:23 },
  { month:"Apr 2025", compliant:12, nonCompliant:17, completionPct:30 },
  { month:"May 2025", compliant:14, nonCompliant:18, completionPct:35 },
  { month:"Jun 2025", compliant:17, nonCompliant:18, completionPct:43 },
  { month:"Jul 2025", compliant:19, nonCompliant:17, completionPct:48 },
  { month:"Aug 2025", compliant:25, nonCompliant:13, completionPct:63 },
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
    merHistory: [
      ...GREENFIELD_CLIENTS.map((c, i) => ({ ...c, month: "Aug 2025", monthRaw: "Aug 2025", monthDate: "2025-08-01", timestamp: new Date(Date.now() - i * 3600000).toISOString(), timestampMs: Date.now() - i * 3600000, submittedBy: c.bookkeeper })),
      ...GREENFIELD_CLIENTS.map((c, i) => ({ ...c, id: String(100 + i), month: "Jul 2025", monthRaw: "Jul 2025", monthDate: "2025-07-01", completionPct: Math.max(0, c.completionPct - 20), complianceStatus: c.completionPct >= 80 ? "Compliant" : "Non-Compliant", timestamp: new Date(Date.now() - 2592000000 - i * 3600000).toISOString(), timestampMs: Date.now() - 2592000000 - i * 3600000, submittedBy: c.bookkeeper })),
      ...GREENFIELD_CLIENTS.map((c, i) => ({ ...c, id: String(200 + i), month: "Jun 2025", monthRaw: "Jun 2025", monthDate: "2025-06-01", completionPct: Math.max(0, c.completionPct - 40), complianceStatus: c.completionPct >= 90 ? "Compliant" : "Non-Compliant", timestamp: new Date(Date.now() - 5184000000 - i * 3600000).toISOString(), timestampMs: Date.now() - 5184000000 - i * 3600000, submittedBy: c.bookkeeper })),
    ] as MerHistoryRow[],
    clientMonths,
    submittedBy,
    latestMonth: "Aug 2025",
    actionLog: [
      { timestamp: new Date(Date.now() - 120000).toISOString(), actionType: "Books Closed", clientName: "Maple Street Tax Co.", ghlContactId: "1", cycleMonth: "Aug 2025", triggeredBy: "Sarah", status: "success", notes: "" },
      { timestamp: new Date(Date.now() - 900000).toISOString(), actionType: "AI Categorization", clientName: "Riverside Dental Group", ghlContactId: "2", cycleMonth: "Aug 2025", triggeredBy: "System", status: "success", notes: "8 transactions auto-categorized" },
      { timestamp: new Date(Date.now() - 1800000).toISOString(), actionType: "bank-reconnection", clientName: "Pinehurst Realty LLC", ghlContactId: "3", cycleMonth: "Aug 2025", triggeredBy: "Sarah", status: "Sent", notes: "Bank Reconnection Sequence Started" },
      { timestamp: new Date(Date.now() - 3600000).toISOString(), actionType: "Statement Flagged", clientName: "Sunrise Wellness Spa", ghlContactId: "5", cycleMonth: "Aug 2025", triggeredBy: "System", status: "warning", notes: "Bank statement not received" },
      { timestamp: new Date(Date.now() - 5400000).toISOString(), actionType: "Financials Sent", clientName: "Green Valley Farms", ghlContactId: "4", cycleMonth: "Aug 2025", triggeredBy: "Tyler", status: "success", notes: "" },
      { timestamp: new Date(Date.now() - 7200000).toISOString(), actionType: "Books Closed", clientName: "Harbor View Marina", ghlContactId: "6", cycleMonth: "Aug 2025", triggeredBy: "Tyler", status: "success", notes: "" },
      { timestamp: new Date(Date.now() - 9000000).toISOString(), actionType: "missing-statement", clientName: "Harvest Moon Organic Farm", ghlContactId: "33", cycleMonth: "Aug 2025", triggeredBy: "Marcus", status: "Sent", notes: "Statement Request Sequence Started" },
      { timestamp: new Date(Date.now() - 10800000).toISOString(), actionType: "MER Submitted", clientName: "Magnolia Events & Catering", ghlContactId: "40", cycleMonth: "Aug 2025", triggeredBy: "Marcus", status: "success", notes: "" },
    ],
    bookkeepers: GREENFIELD_BOOKKEEPERS,
    availableMonths: ["Jun 2025", "Jul 2025", "Aug 2025"],
    cycleEntries: [
      { id:"1", clientName:"Maple Street Tax Co.", companyName:"Maple Street Tax Co.", clientEmail:"contact@maplestreettax.com", ghlContactId:"1", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780969971900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"1_Aug2025" },
      { id:"2", clientName:"Riverside Dental Group", companyName:"Riverside Dental Group", clientEmail:"contact@riversidedentalgroup.com", ghlContactId:"2", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780966371900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"2_Aug2025" },
      { id:"3", clientName:"Pinehurst Realty LLC", companyName:"Pinehurst Realty LLC", clientEmail:"contact@pinehurstrealty.com", ghlContactId:"3", stageNumber:4, stageName:"Awaiting Client Response", month:"2025-08-01", timestamp:new Date(1780098771900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:10, escalated:true, notes:"Awaiting client to reconnect bank feed.", cycleKey:"3_Aug2025" },
      { id:"4", clientName:"Green Valley Farms", companyName:"Green Valley Farms", clientEmail:"contact@greenvalleyfarms.com", ghlContactId:"4", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780959171900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"4_Aug2025" },
      { id:"5", clientName:"Sunrise Wellness Spa", companyName:"Sunrise Wellness Spa", clientEmail:"contact@sunrisewellnessspa.com", ghlContactId:"5", stageNumber:4, stageName:"Awaiting Client Response", month:"2025-08-01", timestamp:new Date(1779918771900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:12, escalated:true, notes:"Awaiting client to reconnect bank feed.", cycleKey:"5_Aug2025" },
      { id:"6", clientName:"Harbor View Marina", companyName:"Harbor View Marina", clientEmail:"contact@harborviewmarina.com", ghlContactId:"6", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780951971900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"6_Aug2025" },
      { id:"7", clientName:"Summit Legal Partners", companyName:"Summit Legal Partners", clientEmail:"contact@summitlegalpartners.com", ghlContactId:"7", stageNumber:2, stageName:"Weekly Processing", month:"2025-08-01", timestamp:new Date(1779652371900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:15, escalated:false, notes:"Client on hold pending management decision.", cycleKey:"7_Aug2025" },
      { id:"8", clientName:"Blue Ridge Healthcare", companyName:"Blue Ridge Healthcare", clientEmail:"contact@blueridgehealthcare.com", ghlContactId:"8", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780944771900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"8_Aug2025" },
      { id:"9", clientName:"Oakwood Learning Center", companyName:"Oakwood Learning Center", clientEmail:"contact@oakwoodlearningcente.com", ghlContactId:"9", stageNumber:7, stageName:"Internal Review", month:"2025-08-01", timestamp:new Date(1780768371900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:2, escalated:false, notes:"All bookkeeping tasks complete. Awaiting internal review.", cycleKey:"9_Aug2025" },
      { id:"10", clientName:"Coastal Fitness Studio", companyName:"Coastal Fitness Studio", clientEmail:"contact@astalfitnessstudio.com", ghlContactId:"10", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780937571900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"10_Aug2025" },
      { id:"11", clientName:"Lakeview Community Church", companyName:"Lakeview Community Church", clientEmail:"contact@lakeviewmmunitychurc.com", ghlContactId:"11", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780933971900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"11_Aug2025" },
      { id:"12", clientName:"Northgate Auto Services", companyName:"Northgate Auto Services", clientEmail:"contact@northgateautoservice.com", ghlContactId:"12", stageNumber:7, stageName:"Internal Review", month:"2025-08-01", timestamp:new Date(1780757571900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:2, escalated:false, notes:"All bookkeeping tasks complete. Awaiting internal review.", cycleKey:"12_Aug2025" },
      { id:"13", clientName:"Elmwood Dance Academy", companyName:"Elmwood Dance Academy", clientEmail:"contact@elmwooddanceacademy.com", ghlContactId:"13", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780926771900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"13_Aug2025" },
      { id:"14", clientName:"Silverstone Investments", companyName:"Silverstone Investments", clientEmail:"contact@silverstoneinvestmen.com", ghlContactId:"14", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780923171900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"14_Aug2025" },
      { id:"15", clientName:"Ridgewood Pet Clinic", companyName:"Ridgewood Pet Clinic", clientEmail:"contact@ridgewoodpetclinic.com", ghlContactId:"15", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780919571900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"15_Aug2025" },
      { id:"16", clientName:"Lakewood Youth Foundation", companyName:"Lakewood Youth Foundation", clientEmail:"contact@lakewoodyouthfoundat.com", ghlContactId:"16", stageNumber:6, stageName:"Month-End Review", month:"2025-08-01", timestamp:new Date(1780570371900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:4, escalated:false, notes:"Balance sheet reconciled. Missing one bank statement.", cycleKey:"16_Aug2025" },
      { id:"17", clientName:"Westside Construction Co.", companyName:"Westside Construction Co.", clientEmail:"contact@westsidenstruction.com", ghlContactId:"17", stageNumber:7, stageName:"Internal Review", month:"2025-08-01", timestamp:new Date(1780739571900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:2, escalated:false, notes:"All bookkeeping tasks complete. Awaiting internal review.", cycleKey:"17_Aug2025" },
      { id:"18", clientName:"Thornfield Bakery LLC", companyName:"Thornfield Bakery LLC", clientEmail:"contact@thornfieldbakery.com", ghlContactId:"18", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780908771900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"18_Aug2025" },
      { id:"19", clientName:"Clearwater Landscaping Inc.", companyName:"Clearwater Landscaping Inc.", clientEmail:"contact@clearwaterlandscapin.com", ghlContactId:"19", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780905171900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"19_Aug2025" },
      { id:"20", clientName:"Maplewood Senior Care", companyName:"Maplewood Senior Care", clientEmail:"contact@maplewoodseniorcare.com", ghlContactId:"20", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780901571900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"20_Aug2025" },
      { id:"21", clientName:"Ironwood CrossFit LLC", companyName:"Ironwood CrossFit LLC", clientEmail:"contact@ironwoodcrossfit.com", ghlContactId:"21", stageNumber:4, stageName:"Awaiting Client Response", month:"2025-08-01", timestamp:new Date(1780120371900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:9, escalated:true, notes:"Awaiting client to reconnect bank feed.", cycleKey:"21_Aug2025" },
      { id:"22", clientName:"Sunridge Charter School", companyName:"Sunridge Charter School", clientEmail:"contact@sunridgecharterschoo.com", ghlContactId:"22", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780894371900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"22_Aug2025" },
      { id:"23", clientName:"Pinebrook Plumbing Co.", companyName:"Pinebrook Plumbing Co.", clientEmail:"contact@pinebrookplumbing.com", ghlContactId:"23", stageNumber:7, stageName:"Internal Review", month:"2025-08-01", timestamp:new Date(1780717971900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:2, escalated:false, notes:"All bookkeeping tasks complete. Awaiting internal review.", cycleKey:"23_Aug2025" },
      { id:"24", clientName:"Horizon Church Ministries", companyName:"Horizon Church Ministries", clientEmail:"contact@horizonchurchministr.com", ghlContactId:"24", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780887171900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"24_Aug2025" },
      { id:"25", clientName:"Riverbend Accounting Group", companyName:"Riverbend Accounting Group", clientEmail:"contact@riverbendacuntinggro.com", ghlContactId:"25", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780883571900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"25_Aug2025" },
      { id:"26", clientName:"Lakeside Event Center", companyName:"Lakeside Event Center", clientEmail:"contact@lakesideeventcenter.com", ghlContactId:"26", stageNumber:2, stageName:"Weekly Processing", month:"2025-08-01", timestamp:new Date(1779583971900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:15, escalated:false, notes:"Client on hold pending management decision.", cycleKey:"26_Aug2025" },
      { id:"27", clientName:"Meadowbrook Veterinary Clinic", companyName:"Meadowbrook Veterinary Clinic", clientEmail:"contact@meadowbrookveterinar.com", ghlContactId:"27", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780876371900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"27_Aug2025" },
      { id:"28", clientName:"Sterling Property Management", companyName:"Sterling Property Management", clientEmail:"contact@sterlingpropertymana.com", ghlContactId:"28", stageNumber:6, stageName:"Month-End Review", month:"2025-08-01", timestamp:new Date(1780527171900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:4, escalated:false, notes:"Balance sheet reconciled. Missing one bank statement.", cycleKey:"28_Aug2025" },
      { id:"29", clientName:"Valley View Auto Repair", companyName:"Valley View Auto Repair", clientEmail:"contact@valleyviewautorepair.com", ghlContactId:"29", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780869171900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"29_Aug2025" },
      { id:"30", clientName:"Crestwood Academy", companyName:"Crestwood Academy", clientEmail:"contact@crestwoodacademy.com", ghlContactId:"30", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780865571900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"30_Aug2025" },
      { id:"31", clientName:"Brookside Community Foundation", companyName:"Brookside Community Foundation", clientEmail:"contact@brooksidemmunityfoun.com", ghlContactId:"31", stageNumber:7, stageName:"Internal Review", month:"2025-08-01", timestamp:new Date(1780689171900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:2, escalated:false, notes:"All bookkeeping tasks complete. Awaiting internal review.", cycleKey:"31_Aug2025" },
      { id:"32", clientName:"Pinecrest Dental Associates", companyName:"Pinecrest Dental Associates", clientEmail:"contact@pinecrestdentalassoc.com", ghlContactId:"32", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780858371900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"32_Aug2025" },
      { id:"33", clientName:"Harvest Moon Organic Farm", companyName:"Harvest Moon Organic Farm", clientEmail:"contact@harvestmoonorganicfa.com", ghlContactId:"33", stageNumber:4, stageName:"Awaiting Client Response", month:"2025-08-01", timestamp:new Date(1779990771900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:10, escalated:true, notes:"Awaiting client to reconnect bank feed.", cycleKey:"33_Aug2025" },
      { id:"34", clientName:"Sunrise Christian Academy", companyName:"Sunrise Christian Academy", clientEmail:"contact@sunrisechristianacad.com", ghlContactId:"34", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780851171900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"34_Aug2025" },
      { id:"35", clientName:"Riverside Gym & Fitness", companyName:"Riverside Gym & Fitness", clientEmail:"contact@riversidegymfitness.com", ghlContactId:"35", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780847571900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"35_Aug2025" },
      { id:"36", clientName:"Golden Gate Insurance LLC", companyName:"Golden Gate Insurance LLC", clientEmail:"contact@goldengateinsurance.com", ghlContactId:"36", stageNumber:7, stageName:"Internal Review", month:"2025-08-01", timestamp:new Date(1780671171900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:2, escalated:false, notes:"All bookkeeping tasks complete. Awaiting internal review.", cycleKey:"36_Aug2025" },
      { id:"37", clientName:"Northside Community Clinic", companyName:"Northside Community Clinic", clientEmail:"contact@northsidemmunityclin.com", ghlContactId:"37", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780840371900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"37_Aug2025" },
      { id:"38", clientName:"Cornerstone Roofing Inc.", companyName:"Cornerstone Roofing Inc.", clientEmail:"contact@rnerstoneroofing.com", ghlContactId:"38", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780836771900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"38_Aug2025" },
      { id:"39", clientName:"Willow Creek Day Care", companyName:"Willow Creek Day Care", clientEmail:"contact@willowcreekdaycare.com", ghlContactId:"39", stageNumber:4, stageName:"Awaiting Client Response", month:"2025-08-01", timestamp:new Date(1779969171900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:10, escalated:true, notes:"Awaiting client to reconnect bank feed.", cycleKey:"39_Aug2025" },
      { id:"40", clientName:"Magnolia Events & Catering", companyName:"Magnolia Events & Catering", clientEmail:"contact@magnoliaeventscateri.com", ghlContactId:"40", stageNumber:8, stageName:"Completed", month:"2025-08-01", timestamp:new Date(1780829571900).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"40_Aug2025" }
    ],
  };
}
