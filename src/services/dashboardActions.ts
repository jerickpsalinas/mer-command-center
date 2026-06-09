import { toast } from "@/hooks/use-toast";

export type ActionType =
  | "bank-reconnection"
  | "missing-statement"
  | "notes-approval"
  | "undo-notes-approval"
  | "mark-resolved"
  | "mark-statement-resolved"
  | "clear-mer-data"
  | "docs-request"
  | "mark-docs-received";

export interface ActionPayload {
  action: ActionType;
  clientName: string;
  bookkeeper: string;
  merKey: string;
  ghlContactId: string;
  cycleMonth: string;
  triggeredBy: string;
  override?: boolean;
  forceOverride?: boolean;
}

type LogEntry = { action: ActionType; ts: number };
const sessionActionLog = new Map<string, LogEntry[]>();
const logKey = (merKey: string, cycleMonth: string) => `${merKey}__${cycleMonth}`;

export function recordSessionAction(
  merKey: string,
  cycleMonth: string,
  action: ActionType,
) {
  if (!merKey) return;
  const k = logKey(merKey, cycleMonth);
  const list = sessionActionLog.get(k) ?? [];
  list.push({ action, ts: Date.now() });
  sessionActionLog.set(k, list);
}

export function isStatementRequestActive(merKey: string, cycleMonth: string): boolean {
  if (!merKey) return false;
  const list = sessionActionLog.get(logKey(merKey, cycleMonth)) ?? [];
  let active = false;
  for (const e of list) {
    if (e.action === "missing-statement") active = true;
    else if (e.action === "mark-statement-resolved") active = false;
  }
  return active;
}

export function isDocsRequestActive(merKey: string, cycleMonth: string): boolean {
  if (!merKey) return false;
  const list = sessionActionLog.get(logKey(merKey, cycleMonth)) ?? [];
  let active = false;
  for (const e of list) {
    if (e.action === "docs-request") active = true;
    else if (e.action === "mark-docs-received") active = false;
  }
  return active;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  errorType?: string;
  message?: string;
  allowOverride?: boolean;
  overridePayload?: ActionPayload;
}

export async function fireDashboardAction(
  _payload: ActionPayload,
): Promise<ActionResult> {
  toast({
    title: "Demo Mode",
    description: "This action is disabled in the demo.",
  });
  return { success: true, message: "Demo Mode — action disabled." };
}
