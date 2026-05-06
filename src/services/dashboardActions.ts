export type ActionType =
  | "bank-reconnection"
  | "missing-statement"
  | "notes-approval"
  | "mark-resolved";

export interface ActionPayload {
  action: ActionType;
  clientName: string;
  bookkeeper: string;
  merKey: string;
  cycleMonth: string;
  triggeredBy: "dashboard";
  override?: boolean;
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
