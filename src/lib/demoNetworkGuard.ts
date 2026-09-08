import { DEMO_MODE } from "@/lib/demoMode";

/**
 * DEMO NETWORK GUARD
 * ------------------
 * The dashboard has many inline integrations that POST to live automation
 * (n8n), the GoHighLevel CRM, and a Google Apps Script sheet bridge. In this
 * public demo none of those must ever fire. Rather than thread a DEMO_MODE
 * check through every call site, we patch `window.fetch` once at startup and
 * short-circuit any request bound for a known external integration host,
 * returning a benign success response so optimistic UI flows still resolve.
 *
 * Same-origin requests and Supabase are left untouched (Supabase paths are
 * already guarded individually and degrade gracefully in the demo).
 */
const BLOCKED_HOST_FRAGMENTS = [
  "n8n.srv1482383.hstgr.cloud",
  "services.leadconnectorhq.com",
  "script.google.com",
  "script.googleusercontent.com",
];

export function installDemoNetworkGuard() {
  if (!DEMO_MODE) return;
  if (typeof window === "undefined" || !window.fetch) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url = "";
    try {
      if (typeof input === "string") url = input;
      else if (input instanceof URL) url = input.toString();
      else if (input instanceof Request) url = input.url;
    } catch {
      url = "";
    }

    const isBlocked = BLOCKED_HOST_FRAGMENTS.some((frag) => url.includes(frag));
    if (isBlocked) {
      // Simulate a brief round-trip, then resolve with a generic success body
      // shaped to satisfy the various callers (webhooks + GHL list endpoints).
      await new Promise((r) => setTimeout(r, 400));
      const body = JSON.stringify({
        success: true,
        message: "Demo mode — no live integration was contacted.",
        contacts: [],
        tags: [],
        meta: {},
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return originalFetch(input as RequestInfo, init);
  };
}
