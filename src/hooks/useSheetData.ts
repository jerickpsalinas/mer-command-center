import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { fetchSheetData, type SheetData, type MerHistoryRow } from "@/services/googleSheets";
import { useInactiveClientIds } from "@/hooks/useInactiveClientIds";
import {
  isUnreconciled,
  bankTransactionsOk,
  statementReceived,
} from "@/lib/complianceExplain";
import type { Client, MonthlyTrend } from "@/data/mockData";
import { monthLabelToIndex } from "@/lib/accountingStatus";
import { recordStatusSnapshots } from "@/utils/statusHistory";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings } from "@/hooks/useUserSettings";

// Persists the last successful sheet fetch to localStorage so every page that
// reads it (Dashboard, Billing, etc.) can render instantly on mount instead of
// showing a spinner while the Apps Script bridge responds. React Query still
// treats the cached value as stale per staleTime, so a fresh fetch always
// kicks off in the background and silently replaces it.
const SHEET_CACHE_KEY = "brant-sheet-data-cache";
// If the cache is older than this, discard it rather than risk showing
// data that's silently gone stale (e.g. the live fetch has been quietly
// failing) as if it were current. This is generous on purpose — the cache
// is only ever used for the very first paint. React Query's staleTime
// (30s, below) means a fresh background fetch fires immediately after
// mount regardless, so a longer max-age just means more refreshes get an
// instant paint instead of a spinner, without making anything look more
// "live" than it already briefly is.
const SHEET_CACHE_MAX_AGE_MS = 2 * 60 * 60_000;
// Core keys every valid SheetData must have. Guards against serving a
// cached object saved by an older build whose shape has since changed
// (a new field added, etc.) — better to discard and re-fetch than let
// downstream code choke on an unexpectedly-missing field.
const SHEET_DATA_KEYS: (keyof SheetData)[] = [
  "clients", "monthlyTrends", "bookkeepers", "cycleEntries",
  "submittedBy", "clientMonths", "merHistory", "availableMonths",
  "latestMonth", "actionLog", "billing",
];

function isValidSheetData(data: unknown): data is SheetData {
  if (!data || typeof data !== "object") return false;
  return SHEET_DATA_KEYS.every((k) => k in (data as Record<string, unknown>));
}

function readCachedSheetData(): { data: SheetData; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(SHEET_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > SHEET_CACHE_MAX_AGE_MS) {
      localStorage.removeItem(SHEET_CACHE_KEY);
      return null;
    }
    if (!isValidSheetData(parsed.data)) {
      localStorage.removeItem(SHEET_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedSheetData(data: SheetData) {
  try {
    localStorage.setItem(SHEET_CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Storage full/unavailable (private browsing, etc.) — cache is a
    // convenience only, safe to skip.
  }
}

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
  // Read once per render rather than once per option — both `initialData`
  // and `initialDataUpdatedAt` need the same cached snapshot, and React
  // Query only invokes these lazily on the query's first creation anyway.
  const cachedSheetData = readCachedSheetData();
  const query = useQuery<SheetData>({
    queryKey: ["sheet-data"],
    queryFn: fetchSheetData,
    initialData: () => cachedSheetData?.data,
    initialDataUpdatedAt: () => cachedSheetData?.savedAt,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: pollMs,
  });

  useEffect(() => {
    if (query.data) writeCachedSheetData(query.data);
  }, [query.data]);

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
 * For a given client name, find their most recent MER submission across ALL months.
 * Returns undefined if the client has never submitted.
 */
export function getLatestSubmission(merHistory: MerHistoryRow[], clientName: string): MerHistoryRow | undefined {
  const norm = clientName.trim().toLowerCase();
  let latest: MerHistoryRow | undefined;
  for (const r of merHistory) {
    if (r.name.trim().toLowerCase() !== norm) continue;
    if (!latest || r.timestampMs > latest.timestampMs) latest = r;
  }
  return latest;
}

/**
 * Build a lookup map: normalized client name → most recent MerHistoryRow across all months.
 * Used by the rollover merge logic to avoid scanning the full history per contact.
 */
export function buildLatestSubmissionMap(
  merHistory: MerHistoryRow[],
  asOfMonthLabel?: string,
): Map<string, MerHistoryRow> {
  // When asOfMonthLabel is given (the month being viewed), never roll forward a
  // submission from a LATER reporting month — otherwise a historical view would
  // pull future data backward. Pick the most recent reporting month at-or-before
  // the view, using submission timestamp only as a tiebreaker within a month.
  const asOfIdx = asOfMonthLabel ? monthLabelToIndex(asOfMonthLabel) : null;
  const map = new Map<string, MerHistoryRow>();
  for (const r of merHistory) {
    const ri = monthLabelToIndex(r.month);
    if (asOfIdx != null && ri != null && ri > asOfIdx) continue;
    const key = r.name.trim().toLowerCase();
    const existing = map.get(key);
    if (!existing) { map.set(key, r); continue; }
    const existingIdx = monthLabelToIndex(existing.month);
    const rKey = ri ?? -Infinity;
    const eKey = existingIdx ?? -Infinity;
    if (rKey > eKey || (rKey === eKey && r.timestampMs > existing.timestampMs)) {
      map.set(key, r);
    }
  }
  return map;
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
export { getKPIMetrics } from "../../supabase/functions/_shared/kpi";

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
    financialsNotSent: submitted.filter((c) => !c.financialsSentToClient),
  };
}

/**
 * Wraps useSheetData and filters out contacts tagged "inactive-client" in GHL.
 * All pages displaying client-level data should use this instead of useSheetData.
 */
export function useFilteredSheetData(autoRefresh = true) {
  const query = useSheetData(autoRefresh);
  const { inactiveIds, loading: inactiveLoading } = useInactiveClientIds();

  const filtered = useMemo(() => {
    if (!query.data || inactiveIds.size === 0) return query.data;
    const d = query.data;
    const isInactive = (ghlId: string | undefined) => ghlId ? inactiveIds.has(ghlId) : false;
    const inactiveNames = new Set(
      d.clients.filter((c) => isInactive(c.ghlContactId)).map((c) => c.name),
    );
    return {
      ...d,
      clients: d.clients.filter((c) => !isInactive(c.ghlContactId)),
      merHistory: d.merHistory.filter((r) => !isInactive(r.ghlContactId)),
      billing: d.billing.filter((r) => !inactiveNames.has(r.clientName)),
      cycleEntries: d.cycleEntries.filter((r) => !isInactive(r.ghlContactId)),
      actionLog: d.actionLog.filter((r) => !isInactive(r.ghlContactId)),
    } as SheetData;
  }, [query.data, inactiveIds]);

  return {
    ...query,
    data: filtered,
    isLoading: query.isLoading || inactiveLoading,
  };
}

export function getBookkeeperStats(clients: Client[], bookkeepers: string[]) {
  return bookkeepers
    .map((bk) => {
      const bkClients = clients.filter((c) => c.bookkeeper === bk);
      const compliant = bkClients.filter((c) => c.complianceStatus === "Compliant").length;
      // Count true Non-Compliant only — NOT total − compliant, which would fold
      // On Hold + Pending MER into non-compliant (they are neither).
      const nonCompliant = bkClients.filter((c) => c.complianceStatus === "Non-Compliant").length;
      const rate = bkClients.length > 0 ? Math.round((compliant / bkClients.length) * 100) : 0;
      const submitted = bkClients.filter((c) => c.complianceStatus !== "Pending MER" && c.complianceStatus !== "On Hold");
      const avgCompletion = submitted.length > 0
        ? Math.round(submitted.reduce((s, c) => s + c.completionPct, 0) / submitted.length)
        : 0;
      return { name: bk, totalClients: bkClients.length, compliant, nonCompliant, rate, avgCompletion };
    })
    .sort((a, b) => b.rate - a.rate);
}
