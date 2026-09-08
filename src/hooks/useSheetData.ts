import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchSheetData, type SheetData, type MerHistoryRow } from "@/services/googleSheets";
import {
  isUnreconciled,
  bankTransactionsOk,
  statementReceived,
} from "@/lib/complianceExplain";
import type { Client, MonthlyTrend } from "@/data/mockData";
import { recordStatusSnapshots } from "@/utils/statusHistory";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings } from "@/hooks/useUserSettings";

/**
 * `autoRefresh` here is a per-caller opt-out (some pages don't want polling).
 * When true (default), the actual polling cadence comes from the user's
 * settings-page toggle + interval; when the user disables auto-refresh,
 * polling stops. Manual refresh (header button) still works.
 */
export function useSheetData(autoRefresh = true) {
  const { profile, user } = useAuth();
  const { syncPrefs } = useUserSettings();
  const pollMs = autoRefresh && syncPrefs.autoRefresh
    ? Math.max(15, syncPrefs.refreshInterval) * 1000
    : false;
  const query = useQuery<SheetData>({
    queryKey: ["sheet-data"],
    queryFn: fetchSheetData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: pollMs,
  });

  useEffect(() => {
    if (query.data?.merHistory?.length) {
      void recordStatusSnapshots(query.data.merHistory, profile?.name || user?.email || "Dashboard");
    }
  }, [query.data, profile?.name, user?.email]);

  return query;
}

/**
 * Build a clients snapshot for a given month label (e.g. "May 2025").
 * Returns the latest submission per client within that month.
 */
export function getClientsForMonth(merHistory: MerHistoryRow[], monthLabel: string): Client[] {
  if (!monthLabel) return [];
  const inMonth = merHistory.filter((r) => r.month === monthLabel);
  const latestByClient = new Map<string, MerHistoryRow>();
  for (const row of inMonth) {
    const existing = latestByClient.get(row.name);
    if (!existing || row.timestampMs >= existing.timestampMs) latestByClient.set(row.name, row);
  }
  return Array.from(latestByClient.values()).map((r, i) => ({ ...r, id: String(i + 1) }));
}

/**
 * Filter merHistory by ISO date range (inclusive). Bounds are yyyy-mm-dd.
 */
export function filterHistoryByDateRange(
  merHistory: MerHistoryRow[],
  fromIso?: string,
  toIso?: string
): MerHistoryRow[] {
  return merHistory.filter((r) => {
    if (!r.monthDate) return false;
    if (fromIso && r.monthDate < fromIso) return false;
    if (toIso && r.monthDate > toIso) return false;
    return true;
  });
}

/**
 * Group history rows by month label, latest submission per client per month.
 */
export function groupHistoryByMonth(rows: MerHistoryRow[]): Map<string, Client[]> {
  const byMonth = new Map<string, Map<string, MerHistoryRow>>();
  for (const r of rows) {
    if (!byMonth.has(r.month)) byMonth.set(r.month, new Map());
    const inner = byMonth.get(r.month)!;
    const existing = inner.get(r.name);
    if (!existing || r.timestampMs >= existing.timestampMs) inner.set(r.name, r);
  }
  const out = new Map<string, Client[]>();
  for (const [month, inner] of byMonth) {
    out.set(month, Array.from(inner.values()).map((r, i) => ({ ...r, id: String(i + 1) })));
  }
  return out;
}

/**
 * For a single client name, return their row for every month they appear in (asc).
 */
export function getClientHistory(merHistory: MerHistoryRow[], clientName: string): MerHistoryRow[] {
  const rows = merHistory.filter((r) => r.name === clientName);
  const byMonth = new Map<string, MerHistoryRow>();
  for (const r of rows) {
    const existing = byMonth.get(r.month);
    if (!existing || r.timestampMs >= existing.timestampMs) byMonth.set(r.month, r);
  }
  return Array.from(byMonth.values()).sort((a, b) => a.monthDate.localeCompare(b.monthDate));
}


// Derived helpers that mirror the old mockData functions
export function getKPIMetrics(clients: Client[]) {
  const total = clients.length;
  if (total === 0) return { total: 0, compliant: 0, nonCompliant: 0, onHold: 0, pendingMer: 0, avgCompletion: 0, notReconciled: 0, outstandingStatements: 0, withoutNotes: 0 };
  const compliant = clients.filter((c) => c.complianceStatus === "Compliant").length;
  const nonCompliant = clients.filter((c) => c.complianceStatus === "Non-Compliant").length;
  const onHold = clients.filter((c) => c.complianceStatus === "On Hold").length;
  const pendingMer = clients.filter((c) => c.complianceStatus === "Pending MER").length;

  // Pending MER clients haven't submitted anything yet — including them in
  // negative KPIs (Not Reconciled, Outstanding Statements, No Notes, avg %)
  // inflates the "bad" numbers with placeholder rows and lies to the client.
  const submitted = clients.filter((c) => c.complianceStatus !== "Pending MER");
  const submittedCount = submitted.length || 1;
  const avgCompletion = Math.round(
    submitted.reduce((s, c) => s + c.completionPct, 0) / submittedCount,
  );
  const notReconciled = submitted.filter((c) => isUnreconciled(c.lastReconciledDate)).length;
  const outstandingStatements = submitted.filter((c) => !statementReceived(c.statementRequestStatus)).length;
  const withoutNotes = submitted.filter((c) => !c.prevMonthNotesApproved).length;
  return { total, compliant, nonCompliant, onHold, pendingMer, avgCompletion, notReconciled, outstandingStatements, withoutNotes };
}

export function getComplianceBreakdown(clients: Client[]) {
  // Pending MER placeholders drag every bar to 0% — exclude them, same as KPIs.
  const submitted = clients.filter((c) => c.complianceStatus !== "Pending MER");
  const total = submitted.length || 1;
  return {
    bankPct: Math.round((submitted.filter((c) => bankTransactionsOk(c.bankTransactions)).length / total) * 100),
    uncatPct: Math.round((submitted.filter((c) => (c.uncategorizedTransactions || 0) === 0).length / total) * 100),
    unappliedPct: Math.round((submitted.filter((c) => (c.unappliedPayments || 0) === 0).length / total) * 100),
    stmtPct: Math.round((submitted.filter((c) => statementReceived(c.statementRequestStatus)).length / total) * 100),
  };
}

export function getNeedsAttention(clients: Client[]) {
  // Only surface clients that have actually submitted a MER — placeholder
  // "Pending MER" rows have blank fields that would false-positive every list.
  const submitted = clients.filter((c) => c.complianceStatus !== "Pending MER");
  return {
    // NOTE: "missingBankFeed" was previously (mis)labeled "missingStatements" and
    // filtered the Bank Transactions column. Kept the same field name to avoid a
    // rename cascade, but the dashboard now labels the panel correctly.
    missingStatements: submitted.filter((c) => /missing/i.test(c.bankTransactions || "")),
    notReconciled: submitted.filter((c) => isUnreconciled(c.lastReconciledDate)),
    unresolvedTransactions: submitted.filter((c) => (c.uncategorizedTransactions || 0) > 0),
    noApprovedNotes: submitted.filter((c) => !c.prevMonthNotesApproved),
  };
}

export function getBookkeeperStats(clients: Client[], bookkeepers: string[]) {
  return bookkeepers
    .map((bk) => {
      const bkClients = clients.filter((c) => c.bookkeeper === bk);
      const compliant = bkClients.filter((c) => c.complianceStatus === "Compliant").length;
      const rate = bkClients.length > 0 ? Math.round((compliant / bkClients.length) * 100) : 0;
      return { name: bk, totalClients: bkClients.length, compliant, rate };
    })
    .sort((a, b) => b.rate - a.rate);
}
