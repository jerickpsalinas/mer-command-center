// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { buildPortalFeed } from "../../supabase/functions/portal-feed/feed";
import { createPortalFeedHandler, portalKeyMatches, SHEET_CACHE_MS, SHEET_TIMEOUT_MS } from "../../supabase/functions/portal-feed/handler";
import { evaluateSheetRow } from "@/lib/complianceExplain";

const good = (name = "Client", month = "Oct 2026") => ({
  "Client Name": name, Month: month, "GHL Contact ID": name,
  Timestamp: "2026-10-20", "Bank Transactions": "Received",
  "Statement Request Status": "Received", "Last Reconciled Date": "2026-09-30",
  "Prev Month Notes Approved": "Yes", "Financials Sent To Client": "Yes", "Books Closed In QB": "Yes",
});
const raw = (rows: Record<string, unknown>[] = [good()], log: Record<string, unknown>[] = []) => ({ "MER Dashboard Data": rows, "Bookkeeping Log": log });
const request = (path = "", key?: string, method = "GET") => new Request(`https://example.test/portal-feed${path}`, { method, headers: key ? { "x-portal-key": key } : {} });
// Synthetic fixture only; never read or print configured project secrets.
const fixtureKey = "unit-test-only-not-a-project-credential";

describe("private portal feed", () => {
  it("uses the app's exact compliance evaluation and completion percentage", () => {
    const row = { ...good(), "Financials Sent To Client": "No" };
    const feed = buildPortalFeed(raw([row]), "2026-10");
    expect(feed.clients[0].complianceStatus).toBe(evaluateSheetRow(row).status);
    expect(feed.clients[0].completionPct).toBe(90);
  });
  it("excludes On Hold from average completion", () => {
    const feed = buildPortalFeed(raw([good(), { ...good("Paused"), Status: "On Hold", "Bank Transactions": "Missing", "Books Closed In QB": "No" }]));
    expect(feed.summary).toMatchObject({ totalClients: 2, compliant: 1, nonCompliant: 0, onHold: 1, avgCompletionPct: 100 });
  });
  it("defaults to latest month and accepts YYYY-MM", () => {
    const data = raw([good("Past", "Sep 2026"), good()]);
    expect(buildPortalFeed(data).month).toBe("Oct 2026");
    expect(buildPortalFeed(data, "2026-09").month).toBe("Sep 2026");
    expect(buildPortalFeed(data).availableMonths).toEqual(["Sep 2026", "Oct 2026"]);
  });
  it("rejects invalid and unavailable months", () => {
    expect(() => buildPortalFeed(raw(), "2026-13")).toThrow("YYYY-MM");
    expect(() => buildPortalFeed(raw(), "2026-08")).toThrow("No MER data");
  });
  it("returns one latest row per client, deduplicating contact IDs", () => {
    const rows = [good(), { ...good("Renamed"), "GHL Contact ID": "Client", Timestamp: "2026-10-21", "Books Closed In QB": "No" }];
    expect(buildPortalFeed(raw(rows)).clients).toHaveLength(1);
    expect(buildPortalFeed(raw(rows)).clients[0].completionPct).toBe(90);
  });
  it("never includes financial amounts, emails, or notes", () => {
    const feed = buildPortalFeed(raw([{ ...good(), Notes: "PRIVATE_NOTE", Email: "PRIVATE_EMAIL", "Total Income": 123456, "Total Expenses": 654321, "Net Income": 555555 }]));
    const serialized = JSON.stringify(feed);
    for (const excluded of ["PRIVATE_NOTE", "PRIVATE_EMAIL", "123456", "654321", "555555", "notes", "email", "totalIncome", "totalExpenses", "netIncome"]) expect(serialized).not.toContain(excluded);
    expect(Object.keys(feed.clients[0])).toEqual(["name", "ghlContactId", "bookkeeper", "complianceStatus", "completionPct", "statementRequestStatus", "lastReconciledDate", "bankTransactionsOk", "financialsSentToClient", "booksClosedInQB", "uncategorizedTransactions", "pendingVerification", "currentStageNumber", "currentStageName", "daysInStage", "escalated"]);
  });
  it("joins only the selected month's latest stage and any escalation", () => {
    const log = [
      { ...good(), "Stage Number": 4, "Days in Stage": 3, Escalated: "Yes" },
      { ...good(), Timestamp: "2026-10-22", "Stage Number": 7, "Days in Stage": 2 },
      { ...good("Client", "Sep 2026"), Timestamp: "2026-10-23", "Stage Number": 8 },
    ];
    expect(buildPortalFeed(raw([good()], log)).clients[0]).toMatchObject({ currentStageNumber: 7, currentStageName: "Internal Review", daysInStage: 2, escalated: true });
    expect(buildPortalFeed(raw([good()], log)).summary.escalated).toBe(1);
  });
  it("limits historical trends to the last six available months", () => {
    const rows = Array.from({ length: 8 }, (_, i) => good("Client", `${["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"][i]} 2026`));
    expect(buildPortalFeed(raw(rows)).trend.map((point) => point.month)).toEqual(["May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026", "Oct 2026"]);
  });
  it("recognizes pending verification and outstanding statements", () => {
    const row = { ...good(), "Category Tags": "DOCS-CLAIMED-PENDING-VERIFY", "Statement Request Status": "Pending" };
    expect(buildPortalFeed(raw([row])).clients[0].pendingVerification).toBe(true);
    expect(buildPortalFeed(raw([row])).summary.docsOutstanding).toBe(1);
  });
  it("requires the exact shared key and fails closed without configuration", async () => {
    expect(await portalKeyMatches(fixtureKey, fixtureKey)).toBe(true);
    expect(await portalKeyMatches("invalid", fixtureKey)).toBe(false);
    expect(await portalKeyMatches(fixtureKey, undefined)).toBe(false);
    const fetcher = vi.fn();
    const handler = createPortalFeedHandler({ getKey: () => fixtureKey, sheetUrl: "https://example.test/sheet", fetcher });
    expect((await handler(request())).status).toBe(401);
    expect((await handler(request("", "invalid"))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("allows only GET with no browser CORS access", async () => {
    const handler = createPortalFeedHandler({ getKey: () => fixtureKey, sheetUrl: "https://example.test/sheet", fetcher: vi.fn() });
    expect((await handler(request("", fixtureKey, "POST"))).status).toBe(405);
    const response = await handler(request("", undefined, "OPTIONS"));
    expect(response.status).toBe(401);
    expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });
  it("caches the upstream sheet for exactly 60 seconds", async () => {
    let clock = Date.parse("2026-10-24T23:46:00Z");
    const fetcher = vi.fn(async () => new Response(JSON.stringify(raw())));
    const handler = createPortalFeedHandler({ getKey: () => fixtureKey, sheetUrl: "https://example.test/sheet", fetcher, now: () => clock });
    expect((await handler(request("", fixtureKey))).status).toBe(200);
    clock += 59_999;
    await handler(request("?month=2026-10", fixtureKey));
    expect(fetcher).toHaveBeenCalledTimes(1);
    clock += 1;
    await handler(request("", fixtureKey));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(SHEET_CACHE_MS).toBe(60_000);
  });
  it("aborts an upstream request after 30 seconds", async () => {
    vi.useFakeTimers();
    try {
      const fetcher: typeof fetch = async (_input, options) => new Promise<Response>((_resolve, reject) => options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
      const handler = createPortalFeedHandler({ getKey: () => fixtureKey, sheetUrl: "https://example.test/sheet", fetcher });
      const responsePromise = handler(request("", fixtureKey));
      await vi.waitFor(() => expect(vi.getTimerCount()).toBeGreaterThan(0));
      await vi.advanceTimersByTimeAsync(30_000);
      expect((await responsePromise).status).toBe(504);
      expect(SHEET_TIMEOUT_MS).toBe(30_000);
    } finally { vi.useRealTimers(); }
  });
  describe("outstanding statements", () => {
    const missing = (name: string, status = "Requested") => ({ ...good(name), "Statement Request Status": status, "Books Closed In QB": "No" });
    it.each(["Requested", "Pending", "Not Requested", ""])("includes statement status %j and preserves raw status", (status) => {
      const feed = buildPortalFeed(raw([missing("Client", status)]));
      expect(feed.outstandingStatementsCount).toBe(1);
      expect(feed.outstandingStatements[0].statementStatus).toBe(status || "Not requested");
    });
    it.each(["Pending", "Not Received", "", "Yes"])("includes bank transactions %j even with statements Received", (status) => {
      const feed = buildPortalFeed(raw([{ ...missing("Client", "Received"), "Bank Transactions": status }]));
      expect(feed.outstandingStatements[0].bankTransactionsStatus).toBe(status);
    });
    it("excludes both Received, held and all completion signals", () => {
      const rows = [missing("Received", " received "), { ...missing("Held"), Status: "On Hold" },
        { ...missing("StatusDone"), Status: "Completed" }, missing("StageDone"), missing("LabelDone"), good("PercentDone")];
      const log = [{ ...good("StageDone"), "Stage Number": 8 }, { ...good("LabelDone"), "Stage Name": "Completed", "Stage Number": 7 }];
      expect(buildPortalFeed(raw(rows, log)).outstandingStatements).toEqual([]);
    });
    it("uses the latest log stage rather than an old Completed entry", () => {
      const log = [{ ...good(), "Stage Number": 8 }, { ...good(), Timestamp: "2026-10-22", "Stage Number": 3 }];
      expect(buildPortalFeed(raw([missing("Client")], log)).outstandingStatementsCount).toBe(1);
    });
    it("uses current close despite historical query and deduplicates latest submissions", () => {
      const rows = [missing("Client"), { ...missing("Client", "Pending"), Timestamp: "2026-10-22" }, { ...missing("Past"), Month: "Sep 2026" }];
      const feed = buildPortalFeed(raw(rows), "2026-09");
      expect(feed.month).toBe("Sep 2026");
      expect(feed.clients[0].name).toBe("Past");
      expect(feed.outstandingStatements.map((item) => item.name)).toEqual(["Client"]);
      expect(feed.outstandingStatements[0]).toMatchObject({ statementStatus: "Pending", missingSince: "2026-11-01", dueDate: "2026-11-15" });
    });
    it("sorts First before Second then oldest request date and shares owner deadlines", () => {
      const rows = [{ ...missing("Complete Dimensions, LLC"), "Statement Requested Date": "2026-10-19" },
        { ...missing("Newer"), "Statement Request Date": "2026-11-03" },
        { ...missing("Older"), "Date Statement Requested": "2026-11-02" },
        { ...missing("Explicit"), "Close Group": "Second", "Statement Requested At": "2026-10-18T12:00:00Z" }];
      const items = buildPortalFeed(raw(rows)).outstandingStatements;
      expect(items.map((item) => item.name)).toEqual(["Older", "Newer", "Explicit", "Complete Dimensions, LLC"]);
      expect(items[0]).toMatchObject({ closeGroup: "First", missingSince: "2026-11-02", dueDate: "2026-11-15" });
      expect(items[3]).toMatchObject({ closeGroup: "Second", missingSince: "2026-10-19", dueDate: "2026-11-30" });
    });
    it("caps February's Second deadline and falls back on invalid request dates", () => {
      const row = { ...missing("Complete Dimensions"), Month: "Jan 2026", "Statement Requested Date": "invalid" };
      expect(buildPortalFeed(raw([row])).outstandingStatements[0]).toMatchObject({ missingSince: "2026-02-01", dueDate: "2026-02-28" });
    });
    it("uses name as fallback id and serializes only operational fields", () => {
      const row = { ...missing("No ID"), "GHL Contact ID": "", Bookkeeper: "Assigned", Notes: "PRIVATE", Email: "PRIVATE", "Total Income": 876543 };
      const feed = buildPortalFeed(raw([row]));
      expect(feed.outstandingStatements[0]).toMatchObject({ id: "No ID", bookkeeper: "Assigned", lastReconciledDate: "2026-09-30" });
      expect(Object.keys(feed.outstandingStatements[0])).toEqual(["id", "name", "bookkeeper", "closeGroup", "statementStatus", "bankTransactionsStatus", "lastReconciledDate", "missingSince", "dueDate"]);
      expect(JSON.stringify(feed)).not.toContain("PRIVATE");
      expect(JSON.stringify(feed)).not.toContain("876543");
    });
  });
  describe("today's focus", () => {
    const now = new Date("2026-11-14T12:00:00Z");
    it("lists incomplete clients with due Nov 15 for Oct close, sorted lowest stage first", () => {
      const rows = [good("Done"), { ...good("A"), "Books Closed In QB": "No" }, { ...good("B"), "Books Closed In QB": "No" }];
      const log = [{ ...good("A"), "Stage Number": 6 }, { ...good("B"), "Stage Number": 3 }, { ...good("Done"), "Stage Number": 8 }];
      const feed = buildPortalFeed(raw(rows, log), "2026-10", now);
      expect(feed.focusCount).toBe(2);
      expect(feed.focus.map((f) => f.name)).toEqual(["B", "A"]);
      expect(feed.focus[0]).toMatchObject({ stage: 3, percent: 38, dueDate: "2026-11-15", daysLate: -1, urgency: "soon" });
      expect(Object.keys(feed.focus[0])).toEqual(["id", "name", "stage", "stageLabel", "percent", "bookkeeper", "nextStep", "dueDate", "daysLate", "urgency", "closeGroup"]);
    });
    it("marks late after the due date", () => {
      const feed = buildPortalFeed(raw([{ ...good(), "Books Closed In QB": "No" }]), "2026-10", new Date("2026-11-18T12:00:00Z"));
      expect(feed.focus[0]).toMatchObject({ daysLate: 3, urgency: "late" });
    });
  });
});