import type { Client, MonthlyTrend } from "@/data/mockData";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbx33oNiGud15mBaGx24U8A-HMGqqrbPrL_QxnP94D_HCQB9lEqV6MOsPjVm3o3Hqo_A/exec";

export interface SheetData {
  clients: Client[];
  monthlyTrends: MonthlyTrend[];
  bookkeepers: string[];
}

function yesNo(val: unknown): boolean {
  return String(val).trim().toLowerCase() === "yes";
}

function num(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function deriveComplianceStatus(row: Record<string, unknown>): Client["complianceStatus"] {
  const allGood =
    String(row["Bank Transactions"]).trim() === "Received" &&
    num(row["Uncategorized Transactions"]) === 0 &&
    num(row["Unapplied Payments"]) === 0 &&
    String(row["Statement Request Status"]).trim() === "Received" &&
    yesNo(row["Prev Month Notes Approved"]) &&
    yesNo(row["Financials Sent To Client"]) &&
    yesNo(row["Books Closed In QB"]);
  return allGood ? "Compliant" : "Non-Compliant";
}

function deriveCompletionPct(row: Record<string, unknown>): number {
  const checks = [
    String(row["Bank Transactions"]).trim() === "Received",
    num(row["Uncategorized Transactions"]) === 0,
    num(row["Transactions Without Payees"]) === 0,
    num(row["Unapplied Payments"]) === 0,
    String(row["Statement Request Status"]).trim() === "Received",
    yesNo(row["Prev Month Notes Approved"]),
    yesNo(row["Financials Sent To Client"]),
    yesNo(row["Books Closed In QB"]),
    String(row["Last Reconciled Date"]).trim() !== "",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function parseClient(row: Record<string, unknown>, index: number): Client {
  const status = deriveComplianceStatus(row);
  return {
    id: String(index + 1),
    name: String(row["Client Name"] ?? "").trim(),
    clientType: (String(row["Client Type"] ?? "For-Profit").trim() as Client["clientType"]),
    bookkeeper: String(row["Bookkeeper"] ?? "").trim(),
    bankTransactions: String(row["Bank Transactions"] ?? "").trim(),
    uncategorizedTransactions: num(row["Uncategorized Transactions"]),
    transactionsWithoutPayees: num(row["Transactions Without Payees"]),
    undepositedFunds: num(row["Undeposited Funds"]),
    unappliedPayments: num(row["Unapplied Payments"]),
    statementRequestStatus: String(row["Statement Request Status"] ?? "").trim(),
    lastReconciledDate: String(row["Last Reconciled Date"] ?? "").trim(),
    prevMonthNotesApproved: yesNo(row["Prev Month Notes Approved"]),
    financialsSentToClient: yesNo(row["Financials Sent To Client"]),
    booksClosedInQB: yesNo(row["Books Closed In QB"]),
    completionPct: deriveCompletionPct(row),
    complianceStatus: status,
  };
}

function formatMonthYear(raw: string): string {
  // Try parsing as a date and return "Mon YYYY"
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  // Already in "Mon YYYY" format or similar, return as-is
  return raw;
}

function parseTrend(row: Record<string, unknown>): MonthlyTrend {
  const rawCompletion = String(row["Completion"] ?? row["Completion %"] ?? "0").replace("%", "");
  const pct = num(rawCompletion);
  const rawMonth = String(row["Month"] ?? row["Month End Date"] ?? "").trim();
  const rawType = String(row["Type"] ?? "auto").trim().toLowerCase();
  return {
    month: formatMonthYear(rawMonth),
    compliant: num(row["Compliant"]),
    nonCompliant: num(row["Non-Compliant"]),
    completionPct: pct <= 1 ? Math.round(pct * 100) : Math.round(pct),
    trend: String(row["Trend"] ?? "-").trim(),
    type: rawType === "manual" ? "manual" : "auto",
  };
}

export async function fetchSheetData(): Promise<SheetData> {
  const url = `${SHEET_URL}?t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const raw = await res.json();

  const clientRows: Record<string, unknown>[] = raw["Monthly Progress"] ?? [];
  const trendRows: Record<string, unknown>[] = raw["Monthly Trends"] ?? [];
  const bkRows: Record<string, unknown>[] = raw["Bookkeepers"] ?? [];

  const clients = clientRows
    .filter((r) => String(r["Client Name"] ?? "").trim() !== "")
    .map((r, i) => parseClient(r, i));

  const monthlyTrends = trendRows
    .filter((r) => String(r["Month"] ?? r["Month End Date"] ?? "").trim() !== "")
    .map(parseTrend);

  const bookkeepers = bkRows
    .map((r) => String(r["Bookkeeper Name"] ?? "").trim())
    .filter(Boolean);

  return { clients, monthlyTrends, bookkeepers };
}
