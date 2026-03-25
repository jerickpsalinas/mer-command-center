import { useQuery } from "@tanstack/react-query";
import { fetchSheetData, type SheetData } from "@/services/googleSheets";
import type { Client, MonthlyTrend } from "@/data/mockData";

export function useSheetData(autoRefresh = true) {
  return useQuery<SheetData>({
    queryKey: ["sheet-data"],
    queryFn: fetchSheetData,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: autoRefresh ? 60_000 : false,
  });
}

// Derived helpers that mirror the old mockData functions
export function getKPIMetrics(clients: Client[]) {
  const total = clients.length;
  if (total === 0) return { total: 0, compliant: 0, nonCompliant: 0, onHold: 0, avgCompletion: 0, notReconciled: 0, outstandingStatements: 0, withoutNotes: 0 };
  const compliant = clients.filter((c) => c.complianceStatus === "Compliant").length;
  const nonCompliant = clients.filter((c) => c.complianceStatus === "Non-Compliant").length;
  const onHold = clients.filter((c) => c.complianceStatus === "On Hold").length;
  const avgCompletion = Math.round(clients.reduce((s, c) => s + c.completionPct, 0) / total);
  const notReconciled = clients.filter((c) => !c.lastReconciledDate).length;
  const outstandingStatements = clients.filter((c) => c.statementRequestStatus !== "Received").length;
  const withoutNotes = clients.filter((c) => !c.prevMonthNotesApproved).length;
  return { total, compliant, nonCompliant, onHold, avgCompletion, notReconciled, outstandingStatements, withoutNotes };
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
    missingStatements: clients.filter((c) => c.bankTransactions.includes("Missing")),
    notReconciled: clients.filter((c) => !c.lastReconciledDate),
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
