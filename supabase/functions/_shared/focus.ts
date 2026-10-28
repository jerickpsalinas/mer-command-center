import type { Client } from "./merTypes.ts";
import type { CycleEntry } from "./sheetData.ts";
import { getComplianceChecks } from "./complianceExplain.ts";

export const STAGE_COUNT = 8;
export const STAGE_NAMES = ["Not Started", "New Cycle Started", "Weekly Processing", "Documents Requested", "Awaiting Client Response", "Documents Received", "Month-End Review", "Internal Review", "Completed"];
/** Close is due on this day of the month after the reporting month. */
export const CLOSE_DUE_DAY = 15;
export const CLIENT_REPORT_DUE_DAY = 20;
export const SECOND_CLOSE_DUE_DAY = 30;
/** Edit this list when the firm's Second Close roster changes. */
export const SECOND_CLOSE_CLIENTS: readonly string[] = ["Complete Dimensions"];
export type CloseGroup = "First" | "Second";
export const SOON_DAYS = 3;

export type Urgency = "late" | "soon" | "ok";
export interface FocusItem {
  id: string;
  name: string;
  stage: number;
  stageLabel: string;
  percent: number;
  bookkeeper: string;
  nextStep: string;
  dueDate: string;
  /** Positive = days late, negative = days left. */
  daysLate: number;
  urgency: Urgency;
  closeGroup: CloseGroup;
  lastActivity: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const norm = (s: string) => (s || "").trim().toLowerCase();
const DAY = 86_400_000;

export function focusForBookkeeper(items: FocusItem[], bookkeeper: string): FocusItem[] {
  const name = norm(bookkeeper);
  return name ? items.filter((item) => norm(item.bookkeeper) === name) : [];
}

const normalizedClientName = (name: string) => name.toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\b(l\s*l\s*c|i\s*n\s*c|llc|inc|incorporated)\b/g, " ")
  .replace(/\s+/g, " ").trim();

export function getCloseGroup(client: Pick<Client, "name" | "closeGroup">): CloseGroup {
  if (client.closeGroup === "Second") return "Second";
  const name = normalizedClientName(client.name);
  return SECOND_CLOSE_CLIENTS.some((entry) => {
    const target = normalizedClientName(entry);
    return name === target || name.startsWith(`${target} `);
  }) ? "Second" : "First";
}

/** Owner deadline in the following month, capped at its last day (UTC). */
export function closeDueDate(month: string, closeGroup: CloseGroup = "First"): string | null {
  const m = /^([A-Za-z]{3})\w*\s+(\d{4})$/.exec(month.trim());
  if (!m) return null;
  const idx = MONTHS.indexOf(m[1].slice(0, 1).toUpperCase() + m[1].slice(1, 3).toLowerCase());
  if (idx < 0) return null;
  const year = Number(m[2]);
  const lastDay = new Date(Date.UTC(year, idx + 2, 0)).getUTCDate();
  const dueDay = closeGroup === "Second" ? Math.min(SECOND_CLOSE_DUE_DAY, lastDay) : CLOSE_DUE_DAY;
  return new Date(Date.UTC(year, idx + 1, dueDay)).toISOString().slice(0, 10);
}

function entryMonthLabel(raw: string) {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function buildFocusList(clients: Client[], entries: CycleEntry[], month: string, now = new Date()): FocusItem[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const monthEntries = entries.filter((e) => entryMonthLabel(e.month) === month);

  const items: FocusItem[] = [];
  for (const c of clients) {
    if (c.complianceStatus === "On Hold") continue;
    const closeGroup = getCloseGroup(c);
    const due = closeDueDate(month, closeGroup);
    const daysLate = due ? Math.round((today - Date.parse(`${due}T00:00:00Z`)) / DAY) : 0;
    const urgency: Urgency = !due ? "ok" : daysLate > 0 ? "late" : -daysLate <= SOON_DAYS ? "soon" : "ok";
    const matching = monthEntries.filter((e) =>
      c.ghlContactId && e.ghlContactId ? c.ghlContactId === e.ghlContactId : norm(c.name) === norm(e.clientName));
    const latest = matching.sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0))[0];
    const stage = Math.max(0, Math.min(STAGE_COUNT, latest?.stageNumber || 0));
    if (stage >= STAGE_COUNT || (!c.rolledOver && (c.completionPct ?? 0) >= 100)) continue;
    const stageName = latest?.stageName || STAGE_NAMES[stage];
    let nextStep: string;
    if (c.complianceStatus === "Pending MER" || c.rolledOver) nextStep = "Submit MER";
    else {
      const failing = getComplianceChecks(c).filter((k) => !k.passed).map((k) => k.label);
      nextStep = latest?.cycleStatus || failing.slice(0, 2).join(", ") || c.status || `Advance past ${stageName}`;
    }
    const lastActivity = latest?.timestamp || (c as Client & { timestampMs?: number }).timestampMs && new Date((c as Client & { timestampMs: number }).timestampMs).toISOString() || "";
    items.push({
      id: c.ghlContactId || c.name,
      name: c.name,
      stage,
      stageLabel: `${stage} of ${STAGE_COUNT} – ${stageName}`,
      percent: Math.round((stage / STAGE_COUNT) * 100),
      bookkeeper: c.bookkeeper || "",
      nextStep,
      dueDate: due || "",
      daysLate,
      urgency: latest?.escalated && urgency === "ok" ? "soon" : urgency,
      closeGroup,
      lastActivity: lastActivity || "",
    });
  }
  const rank = { late: 0, soon: 1, ok: 2 } as const;
  return items.sort((a, b) =>
    rank[a.urgency] - rank[b.urgency] || b.daysLate - a.daysLate || a.stage - b.stage ||
    (Date.parse(a.lastActivity) || 0) - (Date.parse(b.lastActivity) || 0) || a.name.localeCompare(b.name));
}
