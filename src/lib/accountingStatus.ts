import type { MerHistoryRow } from "@/services/googleSheets";

/**
 * ACCOUNTING COMPLETION / RECONCILIATION CASCADE
 *
 * Separate from the 10-check compliance engine (complianceExplain.ts). This models
 * Jessica's "green means our accounting work is complete" — driven purely by whether the
 * books are reconciled.
 *
 * Key rule (confirmed from client conversation Oct 2026):
 *   Reconciliation is CUMULATIVE. You cannot reconcile September without first reconciling
 *   May–August. So the single most-recent "Last Reconciled Date" a client has tells us how
 *   far their books are reconciled, and every month up to and including that month counts as
 *   done — even if the team never went back and filled in the older months' rows.
 *
 * The signal is the manually-entered "Last Reconciled Date" field (QBO cannot supply it;
 * confirmed unpullable — it is hand-entered via the Update MER form or the sheet).
 *
 * We key off the MONTH the reconciled date falls in, not the exact day, so a non-month-end
 * statement-close date (e.g. the 25th) still maps cleanly to its month.
 */

export type AccountingStatus =
  | "Reconciled"          // this month's own books are reconciled directly
  | "Reconciled (carried)" // green only because a LATER month is reconciled (inferred)
  | "Not Reconciled"      // no reconciliation at or after this month
  | "Unknown";            // could not parse the reporting month

export interface AccountingEvaluation {
  status: AccountingStatus;
  /** True when the month counts as accounting-done (either directly or carried). */
  done: boolean;
  /** True when done ONLY because a later month is reconciled (not this month's own entry). */
  inferred: boolean;
}

const MONTH_ABBR = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Convert a "May 2025" / "September 2025" month label into a comparable index (year*12+month). */
export function monthLabelToIndex(label: string): number | null {
  const m = String(label ?? "").trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const idx = MONTH_ABBR.indexOf(m[1].slice(0, 3).toLowerCase());
  if (idx < 0) return null;
  return parseInt(m[2], 10) * 12 + idx;
}

const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Convert a month index (year*12+month) back into a "Sep 2025" label. */
export function monthIndexToLabel(idx: number): string {
  const y = Math.floor(idx / 12);
  const m = ((idx % 12) + 12) % 12;
  return `${MONTH_LABEL[m]} ${y}`;
}

/** Convert a reconciled-date string into the index of the month it falls in. */
export function dateToMonthIndex(dateStr: string): number | null {
  const v = String(dateStr ?? "").trim();
  if (!v) return null;
  const low = v.toLowerCase();
  if (low === "n/a" || low === "-" || low === "none" || low === "null") return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  // Guard against future-dated typos — a reconciled date can't be in the future.
  if (d.getTime() > Date.now() + 86_400_000) return null;
  return d.getFullYear() * 12 + d.getMonth();
}

/**
 * Build a map of normalized client name → the index of the LATEST month that client's books
 * are reconciled through, scanning every row they have across all months.
 */
export function buildReconciledThroughMap(merHistory: MerHistoryRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of merHistory) {
    const idx = dateToMonthIndex(r.lastReconciledDate);
    if (idx == null) continue;
    const key = r.name.trim().toLowerCase();
    const existing = map.get(key);
    if (existing == null || idx > existing) map.set(key, idx);
  }
  return map;
}

/**
 * Evaluate a single client's accounting status for one reporting month.
 *
 * @param reportingMonth  e.g. "Sep 2025" — the month being viewed
 * @param ownReconciledDate  the Last Reconciled Date on THIS month's own row
 * @param latestReconciledIdx  the latest reconciled-through month index across ALL the
 *        client's rows (from buildReconciledThroughMap)
 */
export function evaluateAccounting(
  reportingMonth: string,
  ownReconciledDate: string | undefined,
  latestReconciledIdx: number | null | undefined,
): AccountingEvaluation {
  const repIdx = monthLabelToIndex(reportingMonth);
  if (repIdx == null) return { status: "Unknown", done: false, inferred: false };
  if (latestReconciledIdx == null) return { status: "Not Reconciled", done: false, inferred: false };

  const done = latestReconciledIdx >= repIdx;
  if (!done) return { status: "Not Reconciled", done: false, inferred: false };

  const ownIdx = dateToMonthIndex(ownReconciledDate ?? "");
  const directly = ownIdx != null && ownIdx >= repIdx;
  const inferred = !directly;
  return {
    status: inferred ? "Reconciled (carried)" : "Reconciled",
    done: true,
    inferred,
  };
}

/** Convenience: evaluate accounting for a client using a prebuilt reconciled-through map. */
export function getAccountingStatus(
  clientName: string,
  reportingMonth: string,
  ownReconciledDate: string | undefined,
  reconciledThroughMap: Map<string, number>,
): AccountingEvaluation {
  const latest = reconciledThroughMap.get(clientName.trim().toLowerCase());
  return evaluateAccounting(reportingMonth, ownReconciledDate, latest ?? null);
}
