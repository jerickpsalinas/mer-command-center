import type { Client } from "@/data/mockData";
import type { MerHistoryRow, CycleEntry } from "@/services/googleSheets";
import type { AtRiskThresholds } from "@/hooks/useUserSettings";

/* ------------------------------------------------------------------ */
/*  Per-bookkeeper performance                                        */
/* ------------------------------------------------------------------ */
export interface BookkeeperPerformance {
  name: string;
  totalClients: number;
  compliant: number;
  nonCompliant: number;
  rate: number;
  avgCompletion: number;
  totalUncategorized: number;
  totalUnapplied: number;
  missingStatements: number;
  notReconciled: number;
  velocityDays: number | null; // avg days from month-end to 100%
  trendPct: number;            // delta vs previous month avg completion
}

export function getBookkeeperPerformance(
  clients: Client[],
  history: MerHistoryRow[],
  bookkeeper: string,
): BookkeeperPerformance {
  return computeBookkeeperPerformance(clients, history, bookkeeper);
}

/**
 * Compute performance for a specific month (label, e.g. "Oct 2025").
 * Returns null if the bookkeeper has no rows in that month.
 * Builds a synthetic "clients" snapshot from MER history rows for that month
 * (latest submission per client) so the same metrics work historically.
 */
export function getBookkeeperPerformanceForMonth(
  history: MerHistoryRow[],
  bookkeeper: string,
  monthLabel: string,
): BookkeeperPerformance | null {
  const monthRows = history.filter((r) => r.bookkeeper === bookkeeper && r.month === monthLabel);
  if (!monthRows.length) return null;

  // Latest row per client for that month
  const latest = new Map<string, MerHistoryRow>();
  for (const r of monthRows) {
    const ex = latest.get(r.name);
    if (!ex || r.timestampMs >= ex.timestampMs) latest.set(r.name, r);
  }
  const snapshot: Client[] = Array.from(latest.values()).map((r) => ({
    name: r.name,
    bookkeeper: r.bookkeeper,
    completionPct: r.completionPct,
    complianceStatus: r.complianceStatus ?? "Non-Compliant",
    bankTransactions: r.bankTransactions ?? "",
    uncategorizedTransactions: r.uncategorizedTransactions ?? 0,
    unappliedPayments: r.unappliedPayments ?? 0,
    statementRequestStatus: r.statementRequestStatus ?? "",
    lastReconciledDate: r.lastReconciledDate ?? "",
    prevMonthNotesApproved: !!r.prevMonthNotesApproved,
    financialsSentToClient: !!r.financialsSentToClient,
    booksClosedInQB: !!r.booksClosedInQB,
  } as unknown as Client));

  return computeBookkeeperPerformance(snapshot, history, bookkeeper);
}

function computeBookkeeperPerformance(
  clients: Client[],
  history: MerHistoryRow[],
  bookkeeper: string,
): BookkeeperPerformance {
  const own = clients.filter((c) => c.bookkeeper === bookkeeper);
  const compliant = own.filter((c) => c.complianceStatus === "Compliant").length;
  const nonCompliant = own.filter((c) => c.complianceStatus === "Non-Compliant").length;
  const avgCompletion = own.length
    ? Math.round(own.reduce((s, c) => s + c.completionPct, 0) / own.length)
    : 0;
  const totalUncategorized = own.reduce((s, c) => s + c.uncategorizedTransactions, 0);
  const totalUnapplied = own.reduce((s, c) => s + c.unappliedPayments, 0);
  const missingStatements = own.filter((c) => c.statementRequestStatus.trim().toLowerCase() !== "received").length;
  const notReconciled = own.filter((c) => !c.lastReconciledDate).length;

  // Velocity: avg days from month-end to first 100% completion submission
  const ownHistory = history.filter((r) => r.bookkeeper === bookkeeper);
  const velocityDays = computeAvgVelocity(ownHistory);

  // Trend vs previous month: compare avg completion of own clients latest vs prior month
  const months = Array.from(new Set(ownHistory.map((r) => r.monthDate))).sort();
  let trendPct = 0;
  if (months.length >= 2) {
    const latest = months[months.length - 1];
    const prev = months[months.length - 2];
    const avgFor = (iso: string) => {
      const rows = ownHistory.filter((r) => r.monthDate === iso);
      if (!rows.length) return 0;
      return rows.reduce((s, r) => s + r.completionPct, 0) / rows.length;
    };
    trendPct = Math.round(avgFor(latest) - avgFor(prev));
  }

  return {
    name: bookkeeper,
    totalClients: own.length,
    compliant,
    nonCompliant,
    rate: own.length ? Math.round((compliant / own.length) * 100) : 0,
    avgCompletion,
    totalUncategorized,
    totalUnapplied,
    missingStatements,
    notReconciled,
    velocityDays,
    trendPct,
  };
}

/* ------------------------------------------------------------------ */
/*  Completion velocity (#6)                                          */
/*  For each (client, month), find the earliest submission that hits  */
/*  100% completion. Days = diff between month-end date and that      */
/*  submission's timestamp. Average across all such records.          */
/* ------------------------------------------------------------------ */
export function computeAvgVelocity(rows: MerHistoryRow[]): number | null {
  // Group by (client, monthDate)
  const buckets = new Map<string, MerHistoryRow[]>();
  for (const r of rows) {
    if (!r.monthDate) continue;
    const key = `${r.name}::${r.monthDate}`;
    const arr = buckets.get(key) ?? [];
    arr.push(r);
    buckets.set(key, arr);
  }
  const days: number[] = [];
  for (const arr of buckets.values()) {
    const hits = arr
      .filter((r) => r.completionPct >= 100 && r.timestampMs > 0)
      .sort((a, b) => a.timestampMs - b.timestampMs);
    if (!hits.length) continue;
    const first = hits[0];
    const monthEnd = endOfMonthMs(first.monthDate);
    if (!monthEnd) continue;
    const diff = (first.timestampMs - monthEnd) / (1000 * 60 * 60 * 24);
    if (diff >= -2) days.push(Math.max(0, diff)); // tolerate same-day
  }
  if (!days.length) return null;
  return Math.round((days.reduce((s, d) => s + d, 0) / days.length) * 10) / 10;
}

function endOfMonthMs(iso: string): number | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  return last.getTime();
}

/* ------------------------------------------------------------------ */
/*  At-Risk detection (#3)                                            */
/* ------------------------------------------------------------------ */
export type RiskReason =
  | "consecutiveNonCompliant"
  | "decliningCompletion"
  | "stuckInStage"
  | "lowCompletion";

export interface AtRiskClient {
  name: string;
  bookkeeper: string;
  reasons: { type: RiskReason; detail: string }[];
  severity: number; // higher = worse
}

export function getAtRiskClients(
  clients: Client[],
  history: MerHistoryRow[],
  cycles: CycleEntry[],
  thresholds: AtRiskThresholds,
): AtRiskClient[] {
  const out = new Map<string, AtRiskClient>();
  const ensure = (name: string, bookkeeper: string) => {
    if (!out.has(name)) out.set(name, { name, bookkeeper, reasons: [], severity: 0 });
    return out.get(name)!;
  };

  // Helper: chronological history per client
  const byClient = new Map<string, MerHistoryRow[]>();
  for (const r of history) {
    const arr = byClient.get(r.name) ?? [];
    arr.push(r);
    byClient.set(r.name, arr);
  }
  for (const arr of byClient.values()) arr.sort((a, b) => a.monthDate.localeCompare(b.monthDate));

  // 1. Consecutive non-compliant months
  for (const [name, rows] of byClient) {
    let streak = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].complianceStatus === "Non-Compliant") streak++;
      else break;
    }
    if (streak >= thresholds.consecutiveNonCompliantMonths) {
      const c = clients.find((x) => x.name === name);
      const entry = ensure(name, c?.bookkeeper ?? rows[rows.length - 1]?.bookkeeper ?? "—");
      entry.reasons.push({
        type: "consecutiveNonCompliant",
        detail: `${streak} consecutive non-compliant month${streak > 1 ? "s" : ""}`,
      });
      entry.severity += streak * 2;
    }
  }

  // 2. Declining completion across N consecutive months
  for (const [name, rows] of byClient) {
    if (rows.length < thresholds.completionDropMonths + 1) continue;
    const tail = rows.slice(-(thresholds.completionDropMonths + 1));
    let declining = true;
    for (let i = 1; i < tail.length; i++) {
      if (tail[i].completionPct >= tail[i - 1].completionPct) { declining = false; break; }
    }
    if (declining) {
      const c = clients.find((x) => x.name === name);
      const entry = ensure(name, c?.bookkeeper ?? rows[rows.length - 1]?.bookkeeper ?? "—");
      const drop = tail[0].completionPct - tail[tail.length - 1].completionPct;
      entry.reasons.push({
        type: "decliningCompletion",
        detail: `Completion dropping ${thresholds.completionDropMonths} months in a row (−${drop}pp)`,
      });
      entry.severity += thresholds.completionDropMonths;
    }
  }

  // 3. Stuck in same Master Cycle stage > N days (use latest entry per client)
  const latestCycle = new Map<string, CycleEntry>();
  for (const e of cycles) {
    const existing = latestCycle.get(e.clientName);
    if (!existing || (Date.parse(e.timestamp) || 0) > (Date.parse(existing.timestamp) || 0)) {
      latestCycle.set(e.clientName, e);
    }
  }
  for (const [name, e] of latestCycle) {
    if (e.daysInStage >= thresholds.stuckInStageDays && e.cycleStatus.toLowerCase() !== "completed") {
      const c = clients.find((x) => x.name === name);
      const entry = ensure(name, c?.bookkeeper ?? "—");
      entry.reasons.push({
        type: "stuckInStage",
        detail: `Stuck in "${e.stageName || `Stage ${e.stageNumber}`}" for ${e.daysInStage} days`,
      });
      entry.severity += Math.floor(e.daysInStage / 7);
    }
  }

  // 4. Low completion this month
  for (const c of clients) {
    if (c.completionPct < thresholds.lowCompletionPct) {
      const entry = ensure(c.name, c.bookkeeper);
      entry.reasons.push({
        type: "lowCompletion",
        detail: `Current completion ${c.completionPct}% (below ${thresholds.lowCompletionPct}%)`,
      });
      entry.severity += 1;
    }
  }

  return Array.from(out.values())
    .filter((x) => x.reasons.length > 0)
    .sort((a, b) => b.severity - a.severity);
}

/* ------------------------------------------------------------------ */
/*  Month-over-month diff for a single client (#2)                    */
/* ------------------------------------------------------------------ */
export interface ClientFieldDiff {
  field: string;
  prev: string;
  curr: string;
  direction: "improved" | "regressed" | "unchanged";
}

export function diffClientMonths(prev: MerHistoryRow, curr: MerHistoryRow): ClientFieldDiff[] {
  const fmt = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));
  const num = (v: number) => String(v);
  const yn = (b: boolean) => (b ? "Yes" : "No");
  const direction = (improved: boolean, regressed: boolean): ClientFieldDiff["direction"] =>
    improved ? "improved" : regressed ? "regressed" : "unchanged";

  const fields: ClientFieldDiff[] = [];
  const push = (field: string, p: string, c: string, dir: ClientFieldDiff["direction"]) => {
    if (p !== c) fields.push({ field, prev: p, curr: c, direction: dir });
  };

  push("Completion %", `${prev.completionPct}%`, `${curr.completionPct}%`,
    direction(curr.completionPct > prev.completionPct, curr.completionPct < prev.completionPct));
  push("Status", prev.complianceStatus, curr.complianceStatus,
    direction(curr.complianceStatus === "Compliant" && prev.complianceStatus !== "Compliant",
              curr.complianceStatus !== "Compliant" && prev.complianceStatus === "Compliant"));
  push("Bank Transactions", fmt(prev.bankTransactions), fmt(curr.bankTransactions),
    direction(curr.bankTransactions === "Received" && prev.bankTransactions !== "Received",
              curr.bankTransactions !== "Received" && prev.bankTransactions === "Received"));
  push("Uncategorized Txns", num(prev.uncategorizedTransactions), num(curr.uncategorizedTransactions),
    direction(curr.uncategorizedTransactions < prev.uncategorizedTransactions,
              curr.uncategorizedTransactions > prev.uncategorizedTransactions));
  push("Unapplied Payments", num(prev.unappliedPayments), num(curr.unappliedPayments),
    direction(curr.unappliedPayments < prev.unappliedPayments,
              curr.unappliedPayments > prev.unappliedPayments));
  push("Statement Request", fmt(prev.statementRequestStatus), fmt(curr.statementRequestStatus),
    direction(curr.statementRequestStatus === "Received" && prev.statementRequestStatus !== "Received",
              curr.statementRequestStatus !== "Received" && prev.statementRequestStatus === "Received"));
  push("Last Reconciled", fmt(prev.lastReconciledDate), fmt(curr.lastReconciledDate),
    direction(!!curr.lastReconciledDate && !prev.lastReconciledDate,
              !curr.lastReconciledDate && !!prev.lastReconciledDate));
  push("Notes Approved", yn(prev.prevMonthNotesApproved), yn(curr.prevMonthNotesApproved),
    direction(curr.prevMonthNotesApproved && !prev.prevMonthNotesApproved,
              !curr.prevMonthNotesApproved && prev.prevMonthNotesApproved));
  push("Financials Sent", yn(prev.financialsSentToClient), yn(curr.financialsSentToClient),
    direction(curr.financialsSentToClient && !prev.financialsSentToClient,
              !curr.financialsSentToClient && prev.financialsSentToClient));
  push("Books Closed", yn(prev.booksClosedInQB), yn(curr.booksClosedInQB),
    direction(curr.booksClosedInQB && !prev.booksClosedInQB,
              !curr.booksClosedInQB && prev.booksClosedInQB));

  return fields;
}

/* ------------------------------------------------------------------ */
/*  Compliance heatmap (#5): clients × months grid                    */
/* ------------------------------------------------------------------ */
export interface HeatmapCell {
  client: string;
  month: string;
  completionPct: number | null;
  status: "Compliant" | "Non-Compliant" | "On Hold" | "Pending MER" | null;
}

export function buildComplianceHeatmap(history: MerHistoryRow[]): {
  clients: string[];
  months: string[];
  cells: Map<string, HeatmapCell>; // key: `${client}::${month}`
} {
  // Latest submission per (client, month)
  const latest = new Map<string, MerHistoryRow>();
  for (const r of history) {
    const key = `${r.name}::${r.month}`;
    const existing = latest.get(key);
    if (!existing || r.timestampMs >= existing.timestampMs) latest.set(key, r);
  }

  const monthSet = new Map<string, string>(); // label -> iso (sort key)
  const clientSet = new Set<string>();
  const cells = new Map<string, HeatmapCell>();
  for (const r of latest.values()) {
    monthSet.set(r.month, r.monthDate);
    clientSet.add(r.name);
    cells.set(`${r.name}::${r.month}`, {
      client: r.name,
      month: r.month,
      completionPct: r.completionPct,
      status: r.complianceStatus,
    });
  }

  const months = Array.from(monthSet.entries())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([label]) => label);
  const clients = Array.from(clientSet).sort();
  return { clients, months, cells };
}
