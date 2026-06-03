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
  triggeredByUser?: string,
) {
  try {
    // Capture the actual logged-in user so the Activity Log shows WHO
    // clicked the CTA, not just the literal "dashboard" source.
    let actor: string | null = triggeredByUser?.trim() || null;
    if (!actor) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;
        if (uid) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("name,email")
            .eq("id", uid)
            .maybeSingle();
          actor = profile?.name || profile?.email || authData.user?.email || null;
        }
      } catch {
        /* fall back to payload.triggeredBy */
      }
    }

    await supabase.from("activity_log").insert({
      action: payload.action,
      client_name: payload.clientName,
      bookkeeper: payload.bookkeeper,
      cycle_month: payload.cycleMonth,
      triggered_by: actor || payload.triggeredBy,
      success,
      message: message ?? null,
    });
  } catch {
    /* non-blocking */
  }
}

export async function fireDashboardAction(
  payload: ActionPayload,
  triggeredByUser?: string,
): Promise<ActionResult> {
  try {
    const webhookBody = {
      ...payload,
      dashboardUser: triggeredByUser || null,
    };
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookBody),
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
    void logActivity(payload, false, "Network error");
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
