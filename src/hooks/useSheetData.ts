import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchSheetData, isUnreconciled, type SheetData, type MerHistoryRow } from "@/services/googleSheets";
import type { Client, MonthlyTrend } from "@/data/mockData";
import { recordStatusSnapshots } from "@/utils/statusHistory";

export function useSheetData(autoRefresh = true) {
  const query = useQuery<SheetData>({
    queryKey: ["sheet-data"],
    queryFn: fetchSheetData,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: autoRefresh ? 60_000 : false,
  });

  useEffect(() => {
    if (query.data?.merHistory?.length) {
      void recordStatusSnapshots(query.data.merHistory);
    }
  }, [query.data]);

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
  const avgCompletion = Math.round(clients.reduce((s, c) => s + c.completionPct, 0) / total);
  const notReconciled = clients.filter((c) => isUnreconciled(c.lastReconciledDate)).length;
  const outstandingStatements = clients.filter((c) => c.statementRequestStatus.trim().toLowerCase() !== "received").length;
  const withoutNotes = clients.filter((c) => !c.prevMonthNotesApproved).length;
  return { total, compliant, nonCompliant, onHold, pendingMer, avgCompletion, notReconciled, outstandingStatements, withoutNotes };
}

export function getComplianceBreakdown(clients: Client[]) {
  const total = clients.length || 1;
  return {
    bankPct: Math.round((clients.filter((c) => c.bankTransactions === "Received").length / total) * 100),
    uncatPct: Math.round((clients.filter((c) => c.uncategorizedTransactions === 0).length / total) * 100),
    unappliedPct: Math.round((clients.filter((c) => c.unappliedPayments === 0).length / total) * 100),
    stmtPct: Math.round((clients.filter((c) => c.statementRequestStatus === "Received").length / total) * 100),
  };
}

export function getNeedsAttention(clients: Client[]) {
  return {
    missingStatements: clients.filter((c) => c.statementRequestStatus.trim().toLowerCase() !== "received"),
    notReconciled: clients.filter((c) => isUnreconciled(c.lastReconciledDate)),
    unresolvedTransactions: clients.filter((c) => c.uncategorizedTransactions > 0),
    noApprovedNotes: clients.filter((c) => !c.prevMonthNotesApproved),
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
