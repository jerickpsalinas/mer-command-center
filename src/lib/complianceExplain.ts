import type { Client } from "@/data/mockData";

/**
 * SINGLE SOURCE OF TRUTH for MER compliance rules.
 *
 * Everything that renders a compliance status, tooltip explanation,
 * completion %, or "issues found" list must derive from evaluateCompliance().
 * Do NOT re-implement these checks anywhere else — extend this file instead.
 */

export interface ComplianceCheck {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
  /** When true, this check contributes to the compliance badge (not just completion %). */
  countsForCompliance: boolean;
}

export type ComplianceStatus =
  | "Compliant"
  | "Non-Compliant"
  | "On Hold"
  | "Pending MER";

export interface ComplianceEvaluation {
  status: ComplianceStatus;
  checks: ComplianceCheck[];
  completionPct: number;
  failingLabels: string[];
}

// ----- low-level primitives (kept small + pure) -----

const norm = (val: unknown): string => String(val ?? "").trim().toLowerCase();

const asNumber = (val: unknown): number => {
  const n = Number(String(val ?? "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const truthyYesNo = (val: unknown): boolean => {
  const v = norm(val);
  return v === "yes" || v === "y" || v === "approved" || v === "true";
};

/**
 * Bank Transactions check.
 *
 * Historical logic: anything not blank and not containing "missing" passed —
 * which silently marked "Not Received", "N/A", "TBD" as Compliant.
 *
 * New logic (deliberately permissive to avoid false-negatives on real data):
 *   - Blank → fail
 *   - Explicit negative label ("not received", "n/a", "tbd", …) → fail
 *   - "N Missing" where N > 0 → fail (0 Missing is fine, means all received)
 *   - Any other "missing" phrasing → fail
 *   - Everything else passes.
 */
export const bankTransactionsOk = (val: unknown): boolean => {
  const v = norm(val);
  if (!v) return false;
  const negatives = new Set([
    "not received", "not-received", "pending", "n/a", "na",
    "tbd", "unknown", "-", "none", "null", "outstanding", "waiting", "no",
  ]);
  if (negatives.has(v)) return false;
  // "3 Missing" → fail; "0 Missing" → pass; "Missing" alone → fail.
  const missingMatch = v.match(/(\d+)\s*missing/);
  if (missingMatch) return parseInt(missingMatch[1], 10) === 0;
  if (v.includes("missing")) return false;
  return true;
};

export const statementReceived = (val: unknown): boolean =>
  norm(val) === "received";

/**
 * Convert a "Sep 2025" / "September 2025" label into the last day of the
 * PRIOR month (Aug 31, 2025 in this case). Returns null on parse failure.
 */
function endOfPriorMonth(monthLabel: string): Date | null {
  const parts = monthLabel.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!parts) return null;
  const monthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const idx = monthNames.indexOf(parts[1].slice(0, 3).toLowerCase());
  if (idx < 0) return null;
  const year = parseInt(parts[2], 10);
  // Day 0 of month N = last day of month N-1
  return new Date(year, idx, 0);
}

/**
 * Last Reconciled Date check — Option A (tied to reporting month).
 *
 * Passes when the column holds a real parseable date AND that date is on or
 * after the end of the PRIOR month of the given reporting month. For a
 * Sep 2025 MER, the date must be ≥ Aug 31, 2025.
 *
 * If `reportingMonth` is not supplied (e.g. Client badge tooltip with no
 * month context) we fall back to the presence + parseable check so we don't
 * false-fail. All server-side sheet rows DO supply reportingMonth.
 */
export const lastReconciledOk = (
  val: unknown,
  reportingMonth?: string,
): boolean => {
  const v = norm(val);
  if (!v) return false;
  if (v === "n/a" || v === "-" || v === "none" || v === "null") return false;
  const parsed = new Date(String(val));
  if (isNaN(parsed.getTime())) return false;
  // Future-dated typos never pass, regardless of reporting month.
  if (parsed.getTime() > Date.now() + 86_400_000) return false;
  if (!reportingMonth) return true;
  const cutoff = endOfPriorMonth(reportingMonth);
  if (!cutoff) return true;
  return parsed.getTime() >= cutoff.getTime();
};

/** Utility: `isUnreconciled` is kept for legacy imports; prefer `lastReconciledOk`. */
export const isUnreconciled = (val: unknown): boolean => !lastReconciledOk(val);

// ----- the rule set -----

interface RowLike {
  bankTransactions?: string;
  uncategorizedTransactions?: number;
  transactionsWithoutPayees?: number;
  undepositedFunds?: number;
  unappliedPayments?: number;
  statementRequestStatus?: string;
  lastReconciledDate?: string;
  prevMonthNotesApproved?: boolean;
  financialsSentToClient?: boolean;
  booksClosedInQB?: boolean;
  status?: string;
  complianceStatus?: ComplianceStatus | string;
  /** "Mon YYYY" label used by the Last Reconciled Date age rule (Option A). */
  reportingMonth?: string;
  /** Same value as reportingMonth under a different name (MerHistoryRow uses `month`). */
  month?: string;
}

/**
 * Build the ordered list of compliance checks for a client-like row.
 * The order shown here is the order rendered in tooltips.
 */
export function buildChecks(row: RowLike): ComplianceCheck[] {
  const bank = row.bankTransactions ?? "";
  const stmt = row.statementRequestStatus ?? "";
  const lastRecon = row.lastReconciledDate ?? "";
  const uncat = row.uncategorizedTransactions ?? 0;
  const noPayee = row.transactionsWithoutPayees ?? 0;
  const undep = row.undepositedFunds ?? 0;
  const unapplied = row.unappliedPayments ?? 0;
  const reportingMonth = row.reportingMonth ?? row.month;

  return [
    { key: "bank", label: "Bank Transactions Received", passed: bankTransactionsOk(bank), detail: bank || "—", countsForCompliance: true },
    { key: "uncat", label: "Uncategorized Transactions = 0", passed: uncat === 0, detail: String(uncat), countsForCompliance: true },
    { key: "noPayee", label: "Transactions Without Payees = 0", passed: noPayee === 0, detail: String(noPayee), countsForCompliance: true },
    { key: "undep", label: "Undeposited Funds = 0", passed: undep === 0, detail: String(undep), countsForCompliance: true },
    { key: "unapplied", label: "Unapplied Payments = 0", passed: unapplied === 0, detail: String(unapplied), countsForCompliance: true },
    { key: "stmt", label: "Statement Request Received", passed: statementReceived(stmt), detail: stmt || "—", countsForCompliance: true },
    { key: "recon", label: "Last Reconciled Date valid", passed: lastReconciledOk(lastRecon, reportingMonth), detail: lastRecon || "—", countsForCompliance: true },
    { key: "notes", label: "Prev Month Notes Approved", passed: !!row.prevMonthNotesApproved, detail: row.prevMonthNotesApproved ? "Yes" : "No", countsForCompliance: true },
    { key: "fin",  label: "Financials Sent To Client", passed: !!row.financialsSentToClient, detail: row.financialsSentToClient ? "Yes" : "No", countsForCompliance: true },
    { key: "close", label: "Books Closed In QB",       passed: !!row.booksClosedInQB,       detail: row.booksClosedInQB ? "Yes" : "No",       countsForCompliance: true },
  ];
}

/** Full evaluation — status + checks + completion %. Callers pass any row with the MER fields. */
export function evaluateCompliance(row: RowLike): ComplianceEvaluation {
  // 1. On Hold overrides everything (matches historical behavior).
  if (norm(row.status).includes("hold")) {
    return {
      status: "On Hold",
      checks: buildChecks(row),
      completionPct: 100, // On Hold is intentionally excluded from completion accounting
      failingLabels: [],
    };
  }
  const checks = buildChecks(row);
  const complianceChecks = checks.filter((c) => c.countsForCompliance);
  const passing = complianceChecks.filter((c) => c.passed).length;
  const failing = complianceChecks.filter((c) => !c.passed);
  const compliant = failing.length === 0;
  const total = complianceChecks.length || 1;
  return {
    status: compliant ? "Compliant" : "Non-Compliant",
    checks,
    completionPct: Math.round((passing / total) * 100),
    failingLabels: failing.map((c) => c.label),
  };
}

/**
 * Raw-sheet-row adapter — parses "Yes"/"No"/numeric strings from the Apps Script JSON
 * into the shape `evaluateCompliance` expects. Used by services/googleSheets.ts.
 */
export function evaluateSheetRow(row: Record<string, unknown>): ComplianceEvaluation {
  const rawMonth = String(row["Month"] ?? "").trim();
  // Reuse the same "Mon YYYY" normalization the sheet parser uses so
  // "September 2025" and Date objects both resolve to a comparable label.
  const normalizedMonth = normalizeMonthLabel(rawMonth);
  return evaluateCompliance({
    status: String(row["Status"] ?? ""),
    bankTransactions: String(row["Bank Transactions"] ?? ""),
    uncategorizedTransactions: asNumber(row["Uncategorized Transactions"]),
    transactionsWithoutPayees: asNumber(row["Transactions Without Payees"]),
    undepositedFunds: asNumber(row["Undeposited Funds"]),
    unappliedPayments: asNumber(row["Unapplied Payments"]),
    statementRequestStatus: String(row["Statement Request Status"] ?? ""),
    lastReconciledDate: String(row["Last Reconciled Date"] ?? ""),
    prevMonthNotesApproved: truthyYesNo(row["Prev Month Notes Approved"]),
    financialsSentToClient: truthyYesNo(row["Financials Sent To Client"]),
    booksClosedInQB: truthyYesNo(row["Books Closed In QB"]),
    reportingMonth: normalizedMonth,
  });
}

function normalizeMonthLabel(raw: string): string {
  if (!raw) return raw;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  const m = raw.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m) return `${m[1].slice(0, 3)} ${m[2]}`;
  return raw;
}

// ----- back-compat exports (existing UI code imports these names) -----

export function getComplianceChecks(c: Client): ComplianceCheck[] {
  return buildChecks(c);
}

export const COMPLIANCE_CHECK_COUNT = 10;

export const COMPLIANCE_RULE_SUMMARY: Record<
  "Compliant" | "Non-Compliant" | "On Hold",
  string
> = {
  Compliant:
    "All 10 checks must pass: Bank Transactions Received, 0 Uncategorized, 0 Transactions Without Payees, 0 Undeposited Funds, 0 Unapplied Payments, Statement Request Received, Last Reconciled Date valid, Prev Month Notes Approved, Financials Sent, Books Closed In QB.",
  "Non-Compliant":
    "Any of the 10 compliance checks failed (and the client is not On Hold). Hover the badge to see which specific checks failed.",
  "On Hold":
    'Triggered when the sheet\'s Status column contains "hold" (case-insensitive). On Hold overrides the other checks.',
};
