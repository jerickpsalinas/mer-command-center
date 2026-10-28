import { parseSheetData } from "../_shared/sheetData.ts";
import { bankTransactionsOk } from "../_shared/complianceExplain.ts";
import { getKPIMetrics } from "../_shared/kpi.ts";
import { buildFocusList } from "../_shared/focus.ts";
import type { MerHistoryRow, CycleEntry } from "../_shared/sheetData.ts";
import { buildOutstandingStatements } from "./statements.ts";

export class FeedError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const normalized = (value: string) => value.trim().toLowerCase();
const timestamp = (value: string) => Date.parse(value) || 0;
const stageNames = ["", "New Cycle Started", "Weekly Processing", "Documents Requested", "Awaiting Client Response", "Documents Received", "Month-End Review", "Internal Review", "Completed"];

function monthSnapshot(history: MerHistoryRow[], month: string) {
  const byName = new Map<string, MerHistoryRow>();
  for (const row of history) {
    if (row.month !== month) continue;
    const prior = byName.get(row.name);
    if (!prior || row.timestampMs >= prior.timestampMs) byName.set(row.name, row);
  }
  const unique = new Map<string, MerHistoryRow>();
  for (const row of byName.values()) {
    const key = row.ghlContactId || normalized(row.name);
    const prior = unique.get(key);
    if (!prior || row.timestampMs >= prior.timestampMs) unique.set(key, row);
  }
  return [...unique.values()];
}

function cycleStatus(client: MerHistoryRow, entries: CycleEntry[], month: string, now: Date) {
  const matching = entries.filter((entry) => {
    const date = new Date(entry.month);
    const label = Number.isNaN(date.getTime()) ? entry.month : date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    if (label !== month) return false;
    if (client.ghlContactId && entry.ghlContactId) return client.ghlContactId === entry.ghlContactId;
    return normalized(client.name) === normalized(entry.clientName);
  });
  const latest = matching.sort((a, b) => timestamp(b.timestamp) - timestamp(a.timestamp))[0];
  if (!latest) return { currentStageNumber: null, currentStageName: null, daysInStage: null, escalated: false };
  const parsedTimestamp = Date.parse(latest.timestamp);
  const daysInStage = latest.daysInStage || (Number.isNaN(parsedTimestamp) ? 0 : Math.max(0, Math.floor((now.getTime() - parsedTimestamp) / 86_400_000)));
  return {
    currentStageNumber: latest.stageNumber,
    currentStageName: latest.stageName || stageNames[latest.stageNumber] || "",
    daysInStage,
    escalated: matching.some((entry) => entry.escalated),
  };
}

export function buildPortalFeed(raw: Record<string, unknown>, requestedMonth?: string | null, now = new Date()) {
  if (requestedMonth != null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)) {
    throw new FeedError(400, "month must use YYYY-MM format");
  }
  if (!Array.isArray(raw["MER Dashboard Data"]) || !Array.isArray(raw["Bookkeeping Log"])) {
    throw new FeedError(502, "Sheet response is missing required data tabs");
  }
  // Use the application's existing parser; never serialize its financial/private fields.
  const data = parseSheetData(raw);
  const month = requestedMonth
    ? new Date(`${requestedMonth}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
    : data.latestMonth;
  if (!month || !data.availableMonths.includes(month)) throw new FeedError(404, "No MER data available for this month");
  const snapshot = monthSnapshot(data.merHistory, month);
  const kpi = getKPIMetrics(snapshot);
  const clients = snapshot.map((client) => ({
    name: client.name,
    ghlContactId: client.ghlContactId || "",
    bookkeeper: client.bookkeeper,
    complianceStatus: client.complianceStatus,
    completionPct: client.completionPct,
    statementRequestStatus: client.statementRequestStatus,
    lastReconciledDate: client.lastReconciledDate,
    bankTransactionsOk: bankTransactionsOk(client.bankTransactions),
    financialsSentToClient: client.financialsSentToClient,
    booksClosedInQB: client.booksClosedInQB,
    uncategorizedTransactions: client.uncategorizedTransactions,
    pendingVerification: Boolean(client.pendingVerification),
    ...cycleStatus(client, data.cycleEntries, month, now),
  }));
  const focus = buildFocusList(snapshot, data.cycleEntries, month, now)
    .map(({ id, name, stage, stageLabel, percent, bookkeeper, nextStep, dueDate, daysLate, urgency, closeGroup }) => ({ id, name, stage, stageLabel, percent, bookkeeper, nextStep, dueDate, daysLate, urgency, closeGroup }));
  // Chasing statements always tracks the current close, even during historical browsing.
  const currentSnapshot = month === data.latestMonth ? snapshot : monthSnapshot(data.merHistory, data.latestMonth);
  const completedIds = new Set(currentSnapshot
    .filter((client) => {
      const cycle = cycleStatus(client, data.cycleEntries, data.latestMonth, now);
      return (cycle.currentStageNumber ?? 0) >= 8 || cycle.currentStageName?.trim().toLowerCase() === "completed";
    }).map((client) => client.ghlContactId || client.name));
  const outstandingStatements = buildOutstandingStatements(currentSnapshot, completedIds, data.latestMonth);
  return {
    month,
    availableMonths: data.availableMonths,
    generatedAt: now.toISOString(),
    summary: {
      totalClients: kpi.total,
      compliant: kpi.compliant,
      nonCompliant: kpi.nonCompliant,
      onHold: kpi.onHold,
      pendingMer: kpi.pendingMer,
      avgCompletionPct: kpi.avgCompletion,
      financialsSent: clients.filter((client) => client.financialsSentToClient).length,
      booksClosed: clients.filter((client) => client.booksClosedInQB).length,
      docsOutstanding: kpi.outstandingStatements,
      escalated: clients.filter((client) => client.escalated).length,
    },
    clients,
    // Preserve the dashboard's raw-row historical trend aggregation.
    focus,
    focusCount: focus.length,
    outstandingStatements,
    outstandingStatementsCount: outstandingStatements.length,
    trend: data.monthlyTrends.slice(-6).map(({ month, compliant, nonCompliant, completionPct }) => ({ month, compliant, nonCompliant, completionPct })),
  };
}