import type { ActionLogEntry } from "@/services/googleSheets";

export type SequenceStatus = "active" | "resolved" | "approved" | null;

export interface SequenceInfo {
  status: SequenceStatus;
  startedDate: string | null;
  resolvedDate: string | null;
  daysActive: number | null;
  cycleMonth: string;
}

export interface ClientSequenceSummary {
  ghlContactId: string;
  clientName: string;
  cycleMonth: string;
  bankReconnection: SequenceInfo;
  statementRequest: SequenceInfo;
  notesApproval: SequenceInfo;
  hasActiveSequence: boolean;
  hasAnySequenceThisCycle: boolean;
}

export function getDaysActive(timestamp: string): number | null {
  if (!timestamp) return null;
  const parts = timestamp.split(" ");
  if (parts.length < 2) {
    const fallback = new Date(timestamp);
    if (isNaN(fallback.getTime())) return null;
    return Math.floor((Date.now() - fallback.getTime()) / (1000 * 60 * 60 * 24));
  }
  const [datePart, timePart, ampm] = parts;
  const [month, day, year] = datePart.split("/");
  if (!month || !day || !year) return null;
  let [hours, minutes] = (timePart || "0:0").split(":").map(Number);
  if (isNaN(hours)) hours = 0;
  if (isNaN(minutes)) minutes = 0;
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  const sent = new Date(Number(year), Number(month) - 1, Number(day), hours, minutes);
  if (isNaN(sent.getTime())) return null;
  return Math.floor((Date.now() - sent.getTime()) / (1000 * 60 * 60 * 24));
}

export function getSequenceInfoForClient(
  ghlContactId: string,
  cycleMonth: string,
  actionLog: ActionLogEntry[],
): ClientSequenceSummary {
  const entries = (actionLog || []).filter(
    (e) => e.ghlContactId === ghlContactId && e.cycleMonth === cycleMonth,
  );

  const getInfo = (startType: string, resolveType: string | null): SequenceInfo => {
    const startEntry = entries.find((e) => e.actionType === startType);
    const resolveEntry = resolveType ? entries.find((e) => e.actionType === resolveType) : null;

    if (!startEntry) {
      return { status: null, startedDate: null, resolvedDate: null, daysActive: null, cycleMonth };
    }

    if (resolveEntry) {
      return {
        status: "resolved",
        startedDate: startEntry.timestamp,
        resolvedDate: resolveEntry.timestamp,
        daysActive: getDaysActive(startEntry.timestamp),
        cycleMonth,
      };
    }

    return {
      status: startType === "notes-approval" ? "approved" : "active",
      startedDate: startEntry.timestamp,
      resolvedDate: null,
      daysActive: getDaysActive(startEntry.timestamp),
      cycleMonth,
    };
  };

  const bankReconnection = getInfo("bank-reconnection", "mark-resolved");
  const statementRequest = getInfo("missing-statement", "mark-statement-resolved");
  const notesApproval = getInfo("notes-approval", null);

  const hasActiveSequence =
    bankReconnection.status === "active" || statementRequest.status === "active";

  const hasAnySequenceThisCycle =
    bankReconnection.status !== null ||
    statementRequest.status !== null ||
    notesApproval.status !== null;

  return {
    ghlContactId,
    clientName: entries[0]?.clientName || "",
    cycleMonth,
    bankReconnection,
    statementRequest,
    notesApproval,
    hasActiveSequence,
    hasAnySequenceThisCycle,
  };
}

export function getCycleMonthsForContact(
  ghlContactId: string,
  actionLog: ActionLogEntry[],
): string[] {
  const set = new Set<string>();
  for (const e of actionLog || []) {
    if (e.ghlContactId === ghlContactId && e.cycleMonth) set.add(e.cycleMonth);
  }
  return Array.from(set);
}
