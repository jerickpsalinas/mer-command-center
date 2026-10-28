import { closeDueDate, getCloseGroup } from "../_shared/focus.ts";
import type { MerHistoryRow } from "../_shared/sheetData.ts";

/** Strict Received checks here intentionally differ from broader KPI aliases. */
export function buildOutstandingStatements(snapshot: MerHistoryRow[], completedIds: Set<string>, month: string) {
  return snapshot.flatMap((client) => {
    const id = client.ghlContactId || client.name;
    if (client.complianceStatus === "On Hold" || client.completionPct >= 100 ||
        client.status?.trim().toLowerCase() === "completed" || completedIds.has(id)) return [];
    if (client.statementRequestStatus.trim().toLowerCase() === "received" &&
        client.bankTransactions.trim().toLowerCase() === "received") return [];
    const closeGroup = getCloseGroup(client);
    const dueDate = closeDueDate(month, closeGroup) || "";
    // Owner close work starts the month after the reporting month.
    const closeStart = dueDate ? `${dueDate.slice(0, 7)}-01` : "";
    const requested = Date.parse(client.statementRequestedAt || "");
    const missingSince = Number.isNaN(requested) ? closeStart : new Date(requested).toISOString().slice(0, 10);
    return [{
      id,
      name: client.name,
      bookkeeper: client.bookkeeper,
      closeGroup,
      statementStatus: client.statementRequestStatus || "Not requested",
      bankTransactionsStatus: client.bankTransactions,
      lastReconciledDate: client.lastReconciledDate,
      missingSince,
      dueDate,
    }];
  }).sort((a, b) => Number(a.closeGroup === "Second") - Number(b.closeGroup === "Second") ||
    a.missingSince.localeCompare(b.missingSince) || a.name.localeCompare(b.name));
}