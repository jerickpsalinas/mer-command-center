// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildFocusList, closeDueDate, CLIENT_REPORT_DUE_DAY, focusForBookkeeper, getCloseGroup } from "@/lib/focus";
import { parseSheetData } from "../../supabase/functions/_shared/sheetData";

const row = (name: string, extra: Record<string, unknown> = {}) => ({
  "Client Name": name, Month: "Oct 2026", "GHL Contact ID": name,
  Timestamp: "2026-10-20", Bookkeeper: "Jessica Brant", "Bank Transactions": "Received",
  "Statement Request Status": "Received", "Last Reconciled Date": "2026-09-30",
  "Prev Month Notes Approved": "Yes", "Financials Sent To Client": "Yes", "Books Closed In QB": "No", ...extra,
});
const parsed = (rows: Record<string, unknown>[], log: Record<string, unknown>[] = []) => parseSheetData({ "MER Dashboard Data": rows, "Bookkeeping Log": log });

describe("close deadlines", () => {
  it("sets First Close owner deadline to Nov 15 for October", () => {
    expect(closeDueDate("Oct 2026", "First")).toBe("2026-11-15");
  });
  it("sets First Close client report deadline to the 20th", () => {
    expect(CLIENT_REPORT_DUE_DAY).toBe(20);
  });
  it("sets Second Close owner deadline to Nov 30 for October", () => {
    expect(closeDueDate("Oct 2026", "Second")).toBe("2026-11-30");
  });
  it("caps Second Close at February's last day including leap years", () => {
    expect(closeDueDate("Jan 2027", "Second")).toBe("2027-02-28");
    expect(closeDueDate("Jan 2028", "Second")).toBe("2028-02-29");
  });
  it("recognizes Complete Dimensions despite case, punctuation, and legal suffixes", () => {
    for (const name of ["COMPLETE DIMENSIONS, LLC", "Complete Dimensions Inc.", "Complete Dimensions Wellness Center", "Complete Dimensions, L.L.C."]) {
      expect(getCloseGroup({ name })).toBe("Second");
    }
    expect(getCloseGroup({ name: "Other Dimensions LLC" })).toBe("First");
  });
  it("honors the optional Second sheet close group for unlisted clients", () => {
    const data = parsed([row("Other", { "Close Group": "Second" })]);
    expect(buildFocusList(data.clients, [], "Oct 2026")[0]).toMatchObject({ closeGroup: "Second", dueDate: "2026-11-30" });
  });
  it("computes urgency per client's owner deadline", () => {
    const data = parsed([row("Regular"), row("Complete Dimensions")]);
    const focus = buildFocusList(data.clients, [], "Oct 2026", new Date("2026-11-18T12:00:00Z"));
    expect(focus[0]).toMatchObject({ name: "Regular", daysLate: 3, urgency: "late", closeGroup: "First" });
    expect(focus[1]).toMatchObject({ daysLate: -12, urgency: "ok", closeGroup: "Second" });
  });
  it("marks deadlines three days away as soon, four as neutral, and due day as soon", () => {
    const data = parsed([row("Complete Dimensions")]);
    const check = (day: number) => buildFocusList(data.clients, [], "Oct 2026", new Date(`2026-11-${day}T12:00:00Z`))[0];
    expect(check(26).urgency).toBe("ok");
    expect(check(27).urgency).toBe("soon");
    expect(check(30)).toMatchObject({ daysLate: 0, urgency: "soon" });
  });
});

describe("focus work queue", () => {
  it("sorts urgency, days overdue, lowest stage, then oldest activity", () => {
    const data = parsed([row("Later"), row("Older"), row("Lower"), row("Complete Dimensions")], [
      { ...row("Later"), "Stage Number": 4, Timestamp: "2026-10-22" },
      { ...row("Older"), "Stage Number": 4, Timestamp: "2026-10-21" },
      { ...row("Lower"), "Stage Number": 2, Timestamp: "2026-10-23" },
      { ...row("Complete Dimensions"), "Stage Number": 1 },
    ]);
    expect(buildFocusList(data.clients, data.cycleEntries, "Oct 2026", new Date("2026-11-18")).map((item) => item.name)).toEqual(["Lower", "Older", "Later", "Complete Dimensions"]);
  });
  it("excludes completed and held clients but includes rollover needing this month's MER", () => {
    const data = parsed([row("Done", { "Books Closed In QB": "Yes" }), row("Stage done"), row("Held", { Status: "On Hold" }), row("Rollover", { "Books Closed In QB": "Yes" })], [{ ...row("Stage done"), "Stage Number": 8 }]);
    const clients = data.clients.map((client) => client.name === "Rollover" ? { ...client, rolledOver: true } : client);
    expect(buildFocusList(clients, data.cycleEntries, "Oct 2026")).toMatchObject([{ name: "Rollover", nextStep: "Submit MER" }]);
  });
  it("matches My clients by signed-in name and returns no matches for blank names", () => {
    const data = parsed([row("Mine"), row("Other", { Bookkeeper: "Other Person" })]);
    const items = buildFocusList(data.clients, [], "Oct 2026");
    expect(focusForBookkeeper(items, " jessica brant ").map((item) => item.name)).toEqual(["Mine"]);
    expect(focusForBookkeeper(items, "")).toEqual([]);
  });
});