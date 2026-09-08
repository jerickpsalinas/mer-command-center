import type { Client } from "@/data/mockData";

/**
 * Four Health Pillars derived from existing MER columns.
 * No Apps Script changes required.
 */

export type PillarKey = "bankFeed" | "categorization" | "statements" | "workflow";

export interface PillarScore {
  key: PillarKey;
  label: string;
  pct: number;          // 0-100, % of clients passing this pillar
  passing: number;      // count passing
  failing: number;      // count failing
  total: number;
}

export interface PillarSet {
  bankFeed: PillarScore;
  categorization: PillarScore;
  statements: PillarScore;
  workflow: PillarScore;
  composite: number;    // simple average across the 4 pillar pcts
}

// ---------- Per-client predicates ----------

/** Bank Feed pillar: feed connected & reconciled within last 60 days. */
export function failsBankFeed(c: Client): boolean {
  const txt = (c.bankTransactions || "").toLowerCase();
  const missing = txt.includes("missing") || txt === "" || txt === "not received";
  if (missing) return true;
  const last = c.lastReconciledDate?.trim();
  if (!last) return true;
  const d = new Date(last);
  if (isNaN(d.getTime())) return false;
  const daysAgo = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return daysAgo > 60;
}

/** Categorization pillar: zero uncategorized + missing payees + unapplied payments. */
export function failsCategorization(c: Client): boolean {
  return (
    (c.uncategorizedTransactions || 0) > 0 ||
    (c.transactionsWithoutPayees || 0) > 0 ||
    (c.unappliedPayments || 0) > 0 ||
    (c.undepositedFunds || 0) > 0
  );
}

/** Statements pillar: statement request marked Received. */
export function failsStatements(c: Client): boolean {
  return (c.statementRequestStatus || "").trim().toLowerCase() !== "received";
}

/** Workflow pillar: all three workflow checkboxes set. */
export function failsWorkflow(c: Client): boolean {
  return !c.prevMonthNotesApproved || !c.financialsSentToClient || !c.booksClosedInQB;
}

/** Out-of-order workflow: financials sent or books closed BEFORE notes approved. */
export function isWorkflowOutOfOrder(c: Client): boolean {
  if (c.prevMonthNotesApproved) return false;
  return c.financialsSentToClient || c.booksClosedInQB;
}

// ---------- Pillar aggregation ----------

function score(label: string, key: PillarKey, clients: Client[], fails: (c: Client) => boolean): PillarScore {
  const total = clients.length;
  const failing = clients.filter(fails).length;
  const passing = total - failing;
  const pct = total === 0 ? 100 : Math.round((passing / total) * 100);
  return { key, label, pct, passing, failing, total };
}

export function computePillars(clients: Client[]): PillarSet {
  const bankFeed = score("Bank Feed Integrity", "bankFeed", clients, failsBankFeed);
  const categorization = score("Categorization Drift", "categorization", clients, failsCategorization);
  const statements = score("Statement Harvest", "statements", clients, failsStatements);
  const workflow = score("Workflow Adherence", "workflow", clients, failsWorkflow);
  const composite = Math.round((bankFeed.pct + categorization.pct + statements.pct + workflow.pct) / 4);
  return { bankFeed, categorization, statements, workflow, composite };
}

// ---------- Watchlists (targeted action queues) ----------

export interface WatchlistItem {
  client: Client;
  primary: string; // headline metric/label
  detail: string;  // secondary detail
}

export function brokenConnections(clients: Client[]): WatchlistItem[] {
  return clients
    .filter(failsBankFeed)
    .map((c) => {
      const txt = c.bankTransactions || "";
      const missingMatch = txt.match(/(\d+)\s*missing/i);
      const missing = missingMatch ? Number(missingMatch[1]) : 0;
      return {
        client: c,
        primary: missing > 0 ? `${missing} missing` : (txt || "No feed"),
        detail: c.lastReconciledDate ? `Last recon ${c.lastReconciledDate}` : "Never reconciled",
        sortKey: missing,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ client, primary, detail }) => ({ client, primary, detail }));
}

export function cleanupBacklog(clients: Client[]): WatchlistItem[] {
  return clients
    .filter(failsCategorization)
    .map((c) => {
      const total =
        (c.uncategorizedTransactions || 0) +
        (c.transactionsWithoutPayees || 0) +
        (c.unappliedPayments || 0) +
        (c.undepositedFunds || 0);
      return {
        client: c,
        primary: `${total} items`,
        detail: `Uncat ${c.uncategorizedTransactions} · No payee ${c.transactionsWithoutPayees} · Unapplied ${c.unappliedPayments}`,
        sortKey: total,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ client, primary, detail }) => ({ client, primary, detail }));
}

export function statementChase(clients: Client[]): WatchlistItem[] {
  return clients.filter(failsStatements).map((c) => ({
    client: c,
    primary: c.statementRequestStatus || "Not Received",
    detail: `Bookkeeper: ${c.bookkeeper || "Unassigned"}`,
  }));
}

export function workflowSkips(clients: Client[]): WatchlistItem[] {
  return clients.filter(failsWorkflow).map((c) => {
    const missing: string[] = [];
    if (!c.prevMonthNotesApproved) missing.push("Notes");
    if (!c.financialsSentToClient) missing.push("Financials");
    if (!c.booksClosedInQB) missing.push("Close");
    return {
      client: c,
      primary: missing.join(" · "),
      detail: isWorkflowOutOfOrder(c) ? "Out-of-order workflow" : `Bookkeeper: ${c.bookkeeper || "Unassigned"}`,
    };
  });
}

// ---------- Process Enforcement Flags ----------

export interface EnforcementFlag {
  client: Client;
  type: "out-of-order" | "stale-recon" | "missing-feed";
  message: string;
}

export function enforcementFlags(clients: Client[]): EnforcementFlag[] {
  const flags: EnforcementFlag[] = [];
  for (const c of clients) {
    if (isWorkflowOutOfOrder(c)) {
      flags.push({
        client: c,
        type: "out-of-order",
        message: "Financials/Close marked done before Notes Approved",
      });
    }
    if ((c.bankTransactions || "").toLowerCase().includes("missing") && c.financialsSentToClient) {
      flags.push({
        client: c,
        type: "missing-feed",
        message: "Financials sent while bank feed missing transactions",
      });
    }
  }
  return flags;
}

// ---------- Per-pillar dot map for a client ----------

export interface ClientPillarDots {
  bankFeed: boolean;          // true = passing
  categorization: boolean;
  statements: boolean;
  workflow: boolean;
}

export function clientDots(c: Client): ClientPillarDots {
  return {
    bankFeed: !failsBankFeed(c),
    categorization: !failsCategorization(c),
    statements: !failsStatements(c),
    workflow: !failsWorkflow(c),
  };
}

// ---------- Cleanup leaderboard (per bookkeeper) ----------

export interface LeaderboardRow {
  bookkeeper: string;
  totalClients: number;
  cleanClients: number;       // pass all 4 pillars
  cleanupBacklog: number;     // total items needing cleanup
  efficiencyPct: number;      // cleanClients / totalClients
}

export function cleanupLeaderboard(clients: Client[]): LeaderboardRow[] {
  const map = new Map<string, LeaderboardRow>();
  for (const c of clients) {
    const bk = (c.bookkeeper || "Unassigned").trim();
    const dots = clientDots(c);
    const clean = dots.bankFeed && dots.categorization && dots.statements && dots.workflow;
    const backlog =
      (c.uncategorizedTransactions || 0) +
      (c.transactionsWithoutPayees || 0) +
      (c.unappliedPayments || 0) +
      (c.undepositedFunds || 0);
    const cur = map.get(bk) ?? {
      bookkeeper: bk,
      totalClients: 0,
      cleanClients: 0,
      cleanupBacklog: 0,
      efficiencyPct: 0,
    };
    cur.totalClients += 1;
    if (clean) cur.cleanClients += 1;
    cur.cleanupBacklog += backlog;
    map.set(bk, cur);
  }
  const rows = Array.from(map.values()).map((r) => ({
    ...r,
    efficiencyPct: r.totalClients ? Math.round((r.cleanClients / r.totalClients) * 100) : 0,
  }));
  return rows.sort((a, b) => b.efficiencyPct - a.efficiencyPct || a.cleanupBacklog - b.cleanupBacklog);
}

// ---------- Sparkline from MER history ----------

import type { MerHistoryRow } from "@/services/googleSheets";

/** Per-month pillar % across history. Returns chronologically ascending values. */
export function pillarHistory(
  history: MerHistoryRow[],
  pillar: PillarKey
): { month: string; pct: number }[] {
  const fails = {
    bankFeed: failsBankFeed,
    categorization: failsCategorization,
    statements: failsStatements,
    workflow: failsWorkflow,
  }[pillar];

  // Latest row per (client, month)
  const byMonth = new Map<string, Map<string, MerHistoryRow>>();
  for (const r of history) {
    if (!byMonth.has(r.month)) byMonth.set(r.month, new Map());
    const inner = byMonth.get(r.month)!;
    const existing = inner.get(r.name);
    if (!existing || r.timestampMs >= existing.timestampMs) inner.set(r.name, r);
  }

  const out: { month: string; pct: number; iso: string }[] = [];
  for (const [month, inner] of byMonth) {
    const rows = Array.from(inner.values());
    if (rows.length === 0) continue;
    const passing = rows.filter((r) => !fails(r)).length;
    out.push({ month, pct: Math.round((passing / rows.length) * 100), iso: rows[0].monthDate });
  }
  return out
    .sort((a, b) => a.iso.localeCompare(b.iso))
    .map(({ month, pct }) => ({ month, pct }));
}
