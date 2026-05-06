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
}

export interface ActionResult {
  success: boolean;
  error?: string;
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
    if (!res.ok) return { success: false, error: `Server error: ${res.status}` };
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Network error — could not reach automation server.",
    };
  }
}
