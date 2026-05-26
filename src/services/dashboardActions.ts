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
  triggeredBy: "dashboard";
  override?: boolean;
  forceOverride?: boolean;
}

// In-session tracker for fired actions (used to derive toggle state for
// statement-request buttons since no Action Log sheet is available client-side).
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

export function isStatementRequestActive(
  merKey: string,
  cycleMonth: string,
): boolean {
  if (!merKey) return false;
  const list = sessionActionLog.get(logKey(merKey, cycleMonth)) ?? [];
  let active = false;
  for (const e of list) {
    if (e.action === "missing-statement") active = true;
    else if (e.action === "mark-statement-resolved") active = false;
  }
  return active;
}

export function isDocsRequestActive(
  merKey: string,
  cycleMonth: string,
): boolean {
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

const WEBHOOK_URL =
  "https://n8n.srv1482383.hstgr.cloud/webhook/dashboard-action";

import { supabase } from "@/integrations/supabase/client";

async function logActivity(
  payload: ActionPayload,
  success: boolean,
  message?: string,
) {
  try {
    await supabase.from("activity_log").insert({
      action: payload.action,
      client_name: payload.clientName,
      bookkeeper: payload.bookkeeper,
      cycle_month: payload.cycleMonth,
      triggered_by: payload.triggeredBy,
      success,
      message: message ?? null,
    });
  } catch {
    /* non-blocking */
  }
}

export async function fireDashboardAction(
  payload: ActionPayload,
): Promise<ActionResult> {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (res.ok && data.success) {
      void logActivity(payload, true, data.message);
      return { success: true, message: data.message };
    }
    if (res.status === 409 && data.allowOverride) {
      return {
        success: false,
        errorType: data.errorType,
        message: data.message,
        allowOverride: true,
        overridePayload: { ...payload, override: true },
      };
    }
    void logActivity(payload, false, data.message || "Failed");
    return {
      success: false,
      errorType: data.errorType || "UNKNOWN_ERROR",
      message: data.message || "An unexpected error occurred.",
      allowOverride: false,
      error: data.message,
    };
  } catch {
    return {
      success: false,
      errorType: "NETWORK_ERROR",
      message:
        "Could not reach the automation server. Please check your connection and try again.",
      allowOverride: false,
      error: "Network error",
    };
  }
}
