import type { Client, MonthlyTrend } from "@/data/mockData";
import { DEMO_MODE } from "@/lib/demoMode";
import { DEMO_SHEET_RAW } from "@/data/demoSheet";
import {
  evaluateSheetRow,
  bankTransactionsOk as _bankTransactionsOk,
  statementReceived as _statementReceived,
  isUnreconciled as _isUnreconciled,
} from "@/lib/complianceExplain";

const SHEET_URL = import.meta.env.VITE_SHEET_URL ||
  "https://script.google.com/macros/s/AKfycbw9IvPEUAl5CG62MVzMdeDF5guhT27DzeIIrLTX5IwFALfUUI9n2rfJuezzp30w8Bda/exec";

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
  month: string;          // e.g. "May 2025"
  monthRaw: string;       // raw value from sheet (used for sorting / month-end date)
  monthDate: string;      // ISO yyyy-mm-01 (for date-range filtering)
  timestamp: string;      // raw submission timestamp
  timestampMs: number;    // parsed
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
  submittedBy: Record<string, string>; // clientName -> latest submitter
  clientMonths: Record<string, string>; // clientName -> latest reporting month
  merHistory: MerHistoryRow[];         // every MER row parsed
  availableMonths: string[];           // sorted "Mon YYYY" labels (asc)
  latestMonth: string;                 // most recent available month label
  actionLog: ActionLogEntry[];         // entries from "Action Log" tab
}

function norm(val: unknown): string {
  return String(val ?? "").trim().toLowerCase();
}

/**
 * WF13 (Docs Claimed Handler) applies the `docs-claimed-pending-verify` tag
 * to a client's GHL contact when they text back DOCSDONE. Team then has 72h
 * to verify in TaxDome. Kept as a helper so ClientsPage / MasterCyclePage
 * can also compute this live from GHL tags (not just the sheet snapshot).
 */
export const PENDING_VERIFY_TAG = "docs-claimed-pending-verify";
export function hasPendingVerifyTag(tags: string | string[] | undefined | null): boolean {
  if (!tags) return false;
  const list = Array.isArray(tags)
    ? tags
    : String(tags).split(/[,;]/);
  return list.some((t) => String(t).trim().toLowerCase() === PENDING_VERIFY_TAG);
}

function yesNo(val: unknown): boolean {
  const v = norm(val);
  return v === "yes" || v === "y" || v === "approved" || v === "true";
}

function num(val: unknown): number {
  const n = Number(String(val ?? "").replace(/[$,]/g, "").trim());
  return isNaN(n) ? 0 : n;
}

// Compliance/completion logic lives in @/lib/complianceExplain (single source of truth).
// These re-exports keep the historical import surface working for callers.
export const bankTransactionsOk = _bankTransactionsOk;
export const statementReceived = _statementReceived;
export const isUnreconciled = _isUnreconciled;

function deriveComplianceStatus(row: Record<string, unknown>): Client["complianceStatus"] {
  return evaluateSheetRow(row).status;
}

function deriveCompletionPct(row: Record<string, unknown>): number {
  return evaluateSheetRow(row).completionPct;
}

function parseClient(row: Record<string, unknown>, index: number): Client {
  const status = deriveComplianceStatus(row);
  const merKey = String(row["MER Key"] ?? row["merKey"] ?? "").trim();
  const ghlContactId =
    String(row["GHL Contact ID"] ?? "").trim() ||
    (merKey.includes("_") ? merKey.split("_")[0] : "");
  return {
    id: String(index + 1),
    merKey,
    ghlContactId,
    name: String(row["Client Name"] ?? "").trim(),
    clientType: (String(row["Client Type"] ?? "For-Profit").trim() as Client["clientType"]),
    bookkeeper: String(row["Bookkeeper"] ?? "").trim(),
    status: String(row["Status"] ?? "").trim(),
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
    categoryTags: String(row["Category Tags"] ?? "").trim(),
    notes: String(row["Notes"] ?? "").trim(),
    qboConnected: String(row["QBO Connected"] ?? "").trim(),
    totalIncome: num(row["Total Income"]),
    totalExpenses: num(row["Total Expenses"]),
    netIncome: num(row["Net Income"]),
    reportingMonth: formatMonthYear(String(row["Month"] ?? "").trim()),
    pendingVerification: hasPendingVerifyTag(String(row["Category Tags"] ?? "")),
  };
}

function formatMonthYear(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  // Try parsing directly
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  // Handle "March 2026" → "Mar 2026"
  const m = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const monthMap: Record<string, string> = {
      january: "Jan", february: "Feb", march: "Mar", april: "Apr",
      may: "May", june: "Jun", july: "Jul", august: "Aug",
      september: "Sep", october: "Oct", november: "Nov", december: "Dec",
    };
    const short = monthMap[m[1].toLowerCase()] ?? m[1].slice(0, 3);
    return `${short} ${m[2]}`;
  }
  return trimmed;
}

function parseCycleEntry(row: Record<string, unknown>, index: number): CycleEntry {
  return {
    id: String(index + 1),
    clientName: String(row["Client Name"] ?? "").trim(),
    companyName: String(row["Company Name"] ?? "").trim(),
    clientEmail: String(row["Client Email"] ?? "").trim(),
    ghlContactId: String(row["GHL Contact ID"] ?? "").trim(),
    stageNumber: num(row["Stage Number"]),
    stageName: String(row["Stage Name"] ?? "").trim(),
    month: String(row["Month"] ?? "").trim(),
    timestamp: String(row["Timestamp"] ?? "").trim(),
    categoryTags: String(row["Category Tags"] ?? "").trim(),
    cycleStatus: String(row["Cycle Status"] ?? "").trim(),
    daysInStage: num(row["Days in Stage"]),
    escalated: yesNo(row["Escalated"]),
    notes: String(row["Notes"] ?? "").trim(),
    cycleKey: String(row["Cycle Key"] ?? "").trim(),
  };
}

function deriveMonthlyTrendsFromMER(rows: Record<string, unknown>[]): MonthlyTrend[] {
  // Group rows by month, compute compliant/non-compliant + avg completion
  const buckets = new Map<string, { compliant: number; nonCompliant: number; pctSum: number; count: number; raw: string }>();
  for (const row of rows) {
    const rawMonth = String(row["Month"] ?? "").trim();
    if (!rawMonth) continue;
    const key = formatMonthYear(rawMonth);
    const status = deriveComplianceStatus(row);
    const pct = deriveCompletionPct(row);
    const b = buckets.get(key) ?? { compliant: 0, nonCompliant: 0, pctSum: 0, count: 0, raw: rawMonth };
    if (status === "Compliant") b.compliant++;
    else b.nonCompliant++;
    b.pctSum += pct;
    b.count++;
    buckets.set(key, b);
  }
  const trends: MonthlyTrend[] = [];
  for (const [month, b] of buckets) {
    trends.push({
      month,
      compliant: b.compliant,
      nonCompliant: b.nonCompliant,
      completionPct: b.count ? Math.round(b.pctSum / b.count) : 0,
      trend: "-",
      type: "auto",
    });
  }
  // Sort chronologically
  trends.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  // Derive trend by comparing each month's completion % to the previous month
  // Threshold: ±2 percentage points = Stable, otherwise Improving/Declining
  for (let i = 0; i < trends.length; i++) {
    if (i === 0) {
      trends[i].trend = "-";
      continue;
    }
    const diff = trends[i].completionPct - trends[i - 1].completionPct;
    if (diff >= 2) trends[i].trend = "Improving";
    else if (diff <= -2) trends[i].trend = "Declining";
    else trends[i].trend = "Stable";
  }
  return trends;
}

export async function fetchSheetData(): Promise<SheetData> {
  // Demo build: never hit the live Google Sheets bridge. Parse the bundled
  // fictional payload through the exact same pipeline so every downstream
  // view behaves identically to production.
  if (DEMO_MODE) {
    // Small delay so loading states render naturally in the demo.
    await new Promise((r) => setTimeout(r, 300));
    return parseSheetData(DEMO_SHEET_RAW);
  }

  const url = `${SHEET_URL}?t=${Date.now()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const raw = await res.json();
  return parseSheetData(raw);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSheetData(raw: any): SheetData {
  const merRows: Record<string, unknown>[] = raw["MER Dashboard Data"] ?? [];
  const logRows: Record<string, unknown>[] = raw["Bookkeeping Log"] ?? [];
  const actionLogRows: Record<string, string>[] = raw["Action Log"] ?? [];
  const actionLog = parseActionLog(actionLogRows);

  // QBO connectivity truth source: the "QBO Credentials" sheet tab written
  // by WF7a on connect and refreshed daily by WF7b. The per-MER-row
  // "QBO Connected" column is only ever set for the current cycle, so on
  // its own it wildly under-reports connections. Build a Set of GHL
  // Contact IDs whose Status === "connected" and let it override.
  //
  // Requires the Apps Script bridge to include "QBO Credentials" in its
  // JSON output. If the endpoint doesn't ship it, the set is empty and
  // we fall back to whatever the MER row says (safe legacy behavior).
  const qboRows: Record<string, unknown>[] = raw["QBO Credentials"] ?? [];
  const qboConnectedIds = new Set<string>(
    qboRows
      .filter((r) => String(r["Status"] ?? "").trim().toLowerCase() === "connected")
      .map((r) => String(r["GHL Contact ID"] ?? "").trim())
      .filter(Boolean),
  );
  const qboConnectedNames = new Set<string>(
    qboRows
      .filter((r) => String(r["Status"] ?? "").trim().toLowerCase() === "connected")
      .map((r) => String(r["Client Name"] ?? "").trim().toLowerCase())
      .filter(Boolean),
  );
  const isQboConnected = (row: Record<string, unknown>): boolean => {
    const gid = String(row["GHL Contact ID"] ?? "").trim();
    if (gid && qboConnectedIds.has(gid)) return true;
    const merKey = String(row["MER Key"] ?? "").trim();
    const idFromKey = merKey.includes("_") ? merKey.split("_")[0] : "";
    if (idFromKey && qboConnectedIds.has(idFromKey)) return true;
    const name = String(row["Client Name"] ?? "").trim().toLowerCase();
    if (name && qboConnectedNames.has(name)) return true;
    // Legacy fallback: honor a "Yes" written into the MER row itself.
    return String(row["QBO Connected"] ?? "").trim().toLowerCase() === "yes";
  };

  // Build full MER history (one parsed Client per row, with month metadata)
  const merHistory: MerHistoryRow[] = [];
  const monthDateMap = new Map<string, string>(); // label -> first ISO seen (for sorting)
  for (let i = 0; i < merRows.length; i++) {
    const row = merRows[i];
    const name = String(row["Client Name"] ?? "").trim();
    if (!name) continue;
    const rawMonth = String(row["Month"] ?? "").trim();
    if (!rawMonth) continue;
    const monthLabel = formatMonthYear(rawMonth);
    // Convert "Mon YYYY" → ISO "YYYY-MM-01"
    const d = new Date(rawMonth);
    const iso = !isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
      : "";
    if (iso && !monthDateMap.has(monthLabel)) monthDateMap.set(monthLabel, iso);

    const ts = String(row["Timestamp"] ?? "").trim();
    const tsMs = Date.parse(ts) || 0;
    const parsed = parseClient(row, i);
    if (isQboConnected(row)) parsed.qboConnected = "Yes";
    merHistory.push({
      ...parsed,
      month: monthLabel,
      monthRaw: rawMonth,
      monthDate: iso,
      timestamp: ts,
      timestampMs: tsMs,
      submittedBy: String(row["Submitted By"] ?? "").trim(),
    });
  }

  // For the Clients/Progress views, we want one row per client (latest month).
  const latestByClient = new Map<string, Record<string, unknown>>();
  for (const row of merRows) {
    const name = String(row["Client Name"] ?? "").trim();
    if (!name) continue;
    const ts = Date.parse(String(row["Timestamp"] ?? "")) || 0;
    const existing = latestByClient.get(name);
    const existingTs = existing ? Date.parse(String(existing["Timestamp"] ?? "")) || 0 : -1;
    if (!existing || ts >= existingTs) latestByClient.set(name, row);
  }

  const clientRowsLatest = Array.from(latestByClient.values());
  const clients = clientRowsLatest.map((r, i) => {
    const parsed = parseClient(r, i);
    if (isQboConnected(r)) parsed.qboConnected = "Yes";
    return parsed;
  });

  const submittedBy: Record<string, string> = {};
  const clientMonths: Record<string, string> = {};
  for (const r of clientRowsLatest) {
    const name = String(r["Client Name"] ?? "").trim();
    submittedBy[name] = String(r["Submitted By"] ?? "").trim();
    clientMonths[name] = formatMonthYear(String(r["Month"] ?? ""));
  }

  // Monthly trends derived from ALL MER rows (every month present)
  const monthlyTrends = deriveMonthlyTrendsFromMER(merRows);

  // Bookkeepers derived from unique values
  const bookkeepers = Array.from(
    new Set(clients.map((c) => c.bookkeeper).filter(Boolean))
  ).sort();

  // Cycle entries: full log (sorted by timestamp desc)
  const cycleEntries = logRows
    .filter((r) => String(r["Client Name"] ?? "").trim() !== "")
    .map((r, i) => parseCycleEntry(r, i))
    .sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));

  // Available months sorted chronologically (asc)
  const availableMonths = Array.from(monthDateMap.entries())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([label]) => label);
  const latestMonth = availableMonths[availableMonths.length - 1] ?? "";

  return {
    clients,
    monthlyTrends,
    bookkeepers,
    cycleEntries,
    submittedBy,
    clientMonths,
    merHistory,
    availableMonths,
    latestMonth,
    actionLog,
  };
}
