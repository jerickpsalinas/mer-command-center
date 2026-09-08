import { DEMO_MODE } from "@/lib/demoMode";

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

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL ||
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
      page: "Client Modal",
    });
  } catch {
    /* non-blocking */
  }
}

// Actions that trigger real-world side effects (SMS, email, tag changes, GHL sequences).
// These get an 8-second undo window before the webhook actually fires.
const UNDOABLE_ACTIONS = new Set<ActionType>([
  "bank-reconnection",
  "missing-statement",
  "mark-resolved",
  "mark-statement-resolved",
  "clear-mer-data",
  "docs-request",
  "mark-docs-received",
  "notes-approval",
  "undo-notes-approval",
]);

export function isUndoableAction(action: ActionType): boolean {
  return UNDOABLE_ACTIONS.has(action);
}

export const UNDO_WINDOW_MS = 8000;

/**
 * Schedules a dashboard action with an undo window. The webhook is NOT called
 * until `UNDO_WINDOW_MS` elapses. Returns a `cancel()` you can call from an
 * Undo button; the returned promise resolves either with the ActionResult
 * (if the timer completes) or `{ success: false, errorType: "UNDONE" }` if
 * cancel() was called first.
 */
export function scheduleDashboardAction(
  payload: ActionPayload,
): { promise: Promise<ActionResult>; cancel: () => void } {
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let resolvePromise: (r: ActionResult) => void;

  const promise = new Promise<ActionResult>((resolve) => {
    resolvePromise = resolve;
    timeoutId = setTimeout(() => {
      if (cancelled) return;
      fireDashboardAction(payload).then(resolve);
    }, UNDO_WINDOW_MS);
  });

  return {
    promise,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      resolvePromise({
        success: false,
        errorType: "UNDONE",
        message: "Action was undone before it fired.",
      });
    },
  };
}

export async function fireDashboardAction(
  payload: ActionPayload,
): Promise<ActionResult> {
  // Demo build: never hit the live automation webhook. Simulate a short
  // round-trip and report success so the UI flows (toasts, toggle state,
  // activity feed) all behave exactly like production without side effects.
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      success: true,
      message: "Demo mode — action simulated (no live automation was triggered).",
    };
  }
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data: { success?: boolean; message?: string; errorType?: string; allowOverride?: boolean } = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (res.ok && data.success) {
      void logActivity(payload, true, data.message, payload.triggeredBy);
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
    void logActivity(payload, false, data.message || "Failed", payload.triggeredBy);
    return {
      success: false,
      errorType: data.errorType || "UNKNOWN_ERROR",
      message: data.message || "An unexpected error occurred.",
      allowOverride: false,
      error: data.message,
    };
  } catch {
    void logActivity(payload, false, "Network error", payload.triggeredBy);
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
