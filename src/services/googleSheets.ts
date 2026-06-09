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
  { month:"Mar 2025", compliant:18, nonCompliant:8, completionPct:63 },
  { month:"Apr 2025", compliant:15, nonCompliant:10, completionPct:52 },
  { month:"May 2025", compliant:8, nonCompliant:18, completionPct:28 },
  { month:"Jun 2025", compliant:10, nonCompliant:16, completionPct:35 },
  { month:"Jul 2025", compliant:20, nonCompliant:12, completionPct:58 },
  { month:"Aug 2025", compliant:26, nonCompliant:10, completionPct:74 },
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
      { id:"1", clientName:"Pinehurst Realty LLC", companyName:"Pinehurst Realty LLC", clientEmail:"contact@pinehurstllc.com", ghlContactId:"3", stageNumber:4, stageName:"Awaiting Client Response", month:"2025-08-01", timestamp:new Date(Date.now()-172800000).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:7, escalated:true, notes:"7 days passed. No documents received. Escalated to Assistant.", cycleKey:"3_Aug2025" },
      { id:"2", clientName:"Sunrise Wellness Spa", companyName:"Sunrise Wellness Spa", clientEmail:"contact@sunrisespa.com", ghlContactId:"5", stageNumber:4, stageName:"Awaiting Client Response", month:"2025-08-01", timestamp:new Date(Date.now()-259200000).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:10, escalated:true, notes:"10 days passed. No documents received. Escalated to Assistant.", cycleKey:"5_Aug2025" },
      { id:"3", clientName:"Maple Street Tax Co.", companyName:"Maple Street Tax Co.", clientEmail:"contact@maplestreettax.com", ghlContactId:"1", stageNumber:7, stageName:"Internal Review", month:"2025-08-01", timestamp:new Date(Date.now()-86400000).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:1, escalated:false, notes:"All bookkeeping tasks complete. Awaiting internal review.", cycleKey:"1_Aug2025" },
      { id:"4", clientName:"Riverside Dental Group", companyName:"Riverside Dental Group", clientEmail:"contact@riversidedental.com", ghlContactId:"2", stageNumber:8, stageName:"Complete", month:"2025-08-01", timestamp:new Date(Date.now()-43200000).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"2_Aug2025" },
      { id:"5", clientName:"Green Valley Farms", companyName:"Green Valley Farms", clientEmail:"contact@greenvalleyfarms.com", ghlContactId:"4", stageNumber:8, stageName:"Complete", month:"2025-08-01", timestamp:new Date(Date.now()-50000000).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"4_Aug2025" },
      { id:"6", clientName:"Harbor View Marina", companyName:"Harbor View Marina", clientEmail:"contact@harborviewmarina.com", ghlContactId:"6", stageNumber:8, stageName:"Complete", month:"2025-08-01", timestamp:new Date(Date.now()-54000000).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Resolved", daysInStage:0, escalated:false, notes:"Cycle complete.", cycleKey:"6_Aug2025" },
      { id:"7", clientName:"Ironwood CrossFit LLC", companyName:"Ironwood CrossFit LLC", clientEmail:"contact@ironwoodcrossfit.com", ghlContactId:"21", stageNumber:3, stageName:"Documents Requested", month:"2025-08-01", timestamp:new Date(Date.now()-345600000).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:12, escalated:true, notes:"Documents not received after 12 days.", cycleKey:"21_Aug2025" },
      { id:"8", clientName:"Harvest Moon Organic Farm", companyName:"Harvest Moon Organic Farm", clientEmail:"contact@harvestmoon.com", ghlContactId:"33", stageNumber:4, stageName:"Awaiting Client Response", month:"2025-08-01", timestamp:new Date(Date.now()-288000000).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:8, escalated:true, notes:"8 days passed. No documents received.", cycleKey:"33_Aug2025" },
      { id:"9", clientName:"Summit Legal Partners", companyName:"Summit Legal Partners", clientEmail:"contact@summitlegal.com", ghlContactId:"7", stageNumber:2, stageName:"On Hold", month:"2025-08-01", timestamp:new Date(Date.now()-432000000).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:15, escalated:false, notes:"Client on hold pending management decision.", cycleKey:"7_Aug2025" },
      { id:"10", clientName:"Willow Creek Day Care", companyName:"Willow Creek Day Care", clientEmail:"contact@willowcreek.com", ghlContactId:"39", stageNumber:4, stageName:"Awaiting Client Response", month:"2025-08-01", timestamp:new Date(Date.now()-518400000).toISOString(), categoryTags:"mer-workflow", cycleStatus:"Active", daysInStage:14, escalated:true, notes:"14 days passed. No documents received. Critical.", cycleKey:"39_Aug2025" },
    ],
  };
}
