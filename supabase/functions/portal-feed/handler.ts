import { timingSafeEqual } from "node:crypto";
import { buildPortalFeed, FeedError } from "./feed.ts";

export const SHEET_CACHE_MS = 60_000;
export const SHEET_TIMEOUT_MS = 30_000;

// Hash both inputs to fixed-width values before constant-time comparison.
export async function portalKeyMatches(provided: string | null, expected: string | undefined) {
  if (!expected || !provided) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}

interface Dependencies {
  getKey: () => string | undefined;
  sheetUrl: string;
  fetcher?: typeof fetch;
  now?: () => number;
}

export function createPortalFeedHandler({ getKey, sheetUrl, fetcher = fetch, now = Date.now }: Dependencies) {
  let cached: { raw: Record<string, unknown>; expiresAt: number } | undefined;
  let inFlight: Promise<Record<string, unknown>> | undefined;
  async function loadSheet() {
    if (cached && cached.expiresAt > now()) return cached.raw;
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SHEET_TIMEOUT_MS);
      try {
        const url = new URL(sheetUrl);
        url.searchParams.set("t", String(now()));
        const response = await fetcher(url, { signal: controller.signal });
        if (!response.ok) throw new FeedError(502, "Sheet data is temporarily unavailable");
        const raw: unknown = await response.json();
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new FeedError(502, "Invalid sheet response");
        const object = raw as Record<string, unknown>;
        if (!Array.isArray(object["MER Dashboard Data"]) || !Array.isArray(object["Bookkeeping Log"])) throw new FeedError(502, "Sheet response is missing required data tabs");
        cached = { raw: object, expiresAt: now() + SHEET_CACHE_MS };
        return object;
      } finally { clearTimeout(timer); }
    })();
    try { return await inFlight; } finally { inFlight = undefined; }
  }
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
  return async (request: Request): Promise<Response> => {
    // No CORS headers or OPTIONS allowance: only key-bearing server requests.
    if (!(await portalKeyMatches(request.headers.get("x-portal-key"), getKey()))) return json({ error: "Unauthorized" }, 401);
    if (request.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", Allow: "GET" },
    });
    try {
      const url = new URL(request.url);
      if ([...url.searchParams.keys()].some((key) => key !== "month") || url.searchParams.getAll("month").length > 1) throw new FeedError(400, "Only one optional month parameter is supported");
      const month = url.searchParams.get("month");
      if (month != null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new FeedError(400, "month must use YYYY-MM format");
      return json(buildPortalFeed(await loadSheet(), month, new Date(now())));
    } catch (error) {
      // Never echo upstream data, URLs, request headers, or secret values.
      if (error instanceof FeedError) return json({ error: error.message }, error.status);
      if (error instanceof Error && error.name === "AbortError") return json({ error: "Sheet request timed out" }, 504);
      return json({ error: "Feed is temporarily unavailable" }, 502);
    }
  };
}