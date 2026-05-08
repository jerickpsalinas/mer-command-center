import type { ActionLogEntry } from "@/services/googleSheets";

export type SequenceStatus = "active" | "resolved" | "approved" | null;

export type SequenceKind = "bank-reconnection" | "statement-request";

const PAIRS: Record<SequenceKind, { start: string; resolve: string }> = {
  "bank-reconnection": { start: "bank-reconnection", resolve: "mark-resolved" },
  "statement-request": { start: "missing-statement", resolve: "mark-statement-resolved" },
};

/** Parse "MM/DD/YYYY H:MM AM/PM" or fallback to Date(). Returns ms epoch or null. */
export function parseTimestamp(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const parts = ts.trim().split(/\s+/);
  if (parts.length >= 2) {
    const [datePart, timePart, ampm] = parts;
    const [m, d, y] = datePart.split("/");
    if (m && d && y) {
      let [h, min] = (timePart || "0:0").split(":").map(Number);
      if (isNaN(h)) h = 0;
      if (isNaN(min)) min = 0;
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      const dt = new Date(Number(y), Number(m) - 1, Number(d), h, min);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
  }
  const fb = new Date(ts);
  return isNaN(fb.getTime()) ? null : fb.getTime();
}

export function getDaysActive(timestamp: string | null): number | null {
  const t = parseTimestamp(timestamp);
  if (t === null) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

export interface SequenceEvent {
  startedAt: string;
  startedBy: string;
  startedTs: number;
  resolvedAt: string | null;
  resolvedBy: string | null;
  daysOpen: number | null; // days between start and resolve (or now if active)
  cycleMonth: string;
  status: "active" | "resolved";
}

export interface CurrentSequenceInfo {
  status: "active" | "resolved" | null;
  startedAt: string | null;
  startedBy: string | null;
  resolvedAt: string | null;
  daysActive: number | null;
  cycleMonth: string | null;
  triggerCount: number; // total times this sequence has been started for this client
}

export interface ClientSequenceSummary {
  ghlContactId: string;
  clientName: string;
  bankReconnection: CurrentSequenceInfo;
  statementRequest: CurrentSequenceInfo;
  notesApprovalCount: number;
  hasActiveSequence: boolean;
  hasAnyActivity: boolean;
}

/** Build chronological event pairs (start → resolve) for one sequence kind. */
export function getSequenceEvents(
  ghlContactId: string,
  kind: SequenceKind,
  actionLog: ActionLogEntry[],
): SequenceEvent[] {
  const { start, resolve } = PAIRS[kind];
  const entries = (actionLog || []).filter((e) => e.ghlContactId === ghlContactId);

  const starts = entries
    .filter((e) => e.actionType === start)
    .map((e) => ({ entry: e, ts: parseTimestamp(e.timestamp) ?? 0 }))
    .sort((a, b) => a.ts - b.ts);

  const resolves = entries
    .filter((e) => e.actionType === resolve)
    .map((e) => ({ entry: e, ts: parseTimestamp(e.timestamp) ?? 0 }))
    .sort((a, b) => a.ts - b.ts);

  const usedResolve = new Set<number>();
  const events: SequenceEvent[] = [];

  for (const s of starts) {
    // find earliest unmatched resolve after this start
    let matchIdx = -1;
    for (let i = 0; i < resolves.length; i++) {
      if (usedResolve.has(i)) continue;
      if (resolves[i].ts >= s.ts) { matchIdx = i; break; }
    }
    if (matchIdx >= 0) {
      usedResolve.add(matchIdx);
      const r = resolves[matchIdx];
      events.push({
        startedAt: s.entry.timestamp,
        startedBy: s.entry.triggeredBy || "",
        startedTs: s.ts,
        resolvedAt: r.entry.timestamp,
        resolvedBy: r.entry.triggeredBy || "",
        daysOpen: Math.max(0, Math.floor((r.ts - s.ts) / (1000 * 60 * 60 * 24))),
        cycleMonth: s.entry.cycleMonth || "",
        status: "resolved",
      });
    } else {
      events.push({
        startedAt: s.entry.timestamp,
        startedBy: s.entry.triggeredBy || "",
        startedTs: s.ts,
        resolvedAt: null,
        resolvedBy: null,
        daysOpen: getDaysActive(s.entry.timestamp),
        cycleMonth: s.entry.cycleMonth || "",
        status: "active",
      });
    }
  }

  return events;
}

function currentFromEvents(events: SequenceEvent[]): CurrentSequenceInfo {
  if (events.length === 0) {
    return {
      status: null,
      startedAt: null,
      startedBy: null,
      resolvedAt: null,
      daysActive: null,
      cycleMonth: null,
      triggerCount: 0,
    };
  }
  const latest = events[events.length - 1];
  return {
    status: latest.status,
    startedAt: latest.startedAt,
    startedBy: latest.startedBy,
    resolvedAt: latest.resolvedAt,
    daysActive: latest.daysOpen,
    cycleMonth: latest.cycleMonth,
    triggerCount: events.length,
  };
}

export function getSequenceInfoForClient(
  ghlContactId: string,
  cycleMonth: string,
  actionLog: ActionLogEntry[],
): ClientSequenceSummary {
  const bankEvents = getSequenceEvents(ghlContactId, "bank-reconnection", actionLog);
  const stmtEvents = getSequenceEvents(ghlContactId, "statement-request", actionLog);
  const bankReconnection = currentFromEvents(bankEvents);
  const statementRequest = currentFromEvents(stmtEvents);

  const notesApprovalCount = (actionLog || []).filter(
    (e) =>
      e.ghlContactId === ghlContactId &&
      e.actionType === "notes-approval" &&
      e.cycleMonth === cycleMonth,
  ).length;

  const clientName =
    (actionLog || []).find((e) => e.ghlContactId === ghlContactId)?.clientName || "";

  const hasActiveSequence =
    bankReconnection.status === "active" || statementRequest.status === "active";
  const hasAnyActivity =
    bankEvents.length > 0 || stmtEvents.length > 0 || notesApprovalCount > 0;

  return {
    ghlContactId,
    clientName,
    bankReconnection,
    statementRequest,
    notesApprovalCount,
    hasActiveSequence,
    hasAnyActivity,
  };
}

// Back-compat: ClientsPage filter checks `notesApproval.status === "approved"`.
// Provide a derived getter via a small adapter so existing code keeps working.
export function hasApprovedNotes(summary: ClientSequenceSummary): boolean {
  return summary.notesApprovalCount > 0;
}
