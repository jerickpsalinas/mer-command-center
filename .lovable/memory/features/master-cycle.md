---
name: Master Bookkeeping Cycle
description: New page surfacing Bookkeeping Log tab — cycle entries grouped by Cycle Key, expandable timeline, KPIs (total/active/completed/escalated), filters by month/status/escalated.
type: feature
---
# Master Bookkeeping Cycle

Route: `/master-cycle` (sidebar icon: Workflow).

## Source
`Bookkeeping Log` tab in the Google Sheet. Parsed in `src/services/googleSheets.ts` as `cycleEntries`.

## Behavior
- Entries are grouped by `Cycle Key` (one client per month = one cycle).
- Each cycle shows: client + company, current stage + days in stage, status pill, escalation badge, and a stage-dot timeline scaled to the dataset's max stage number.
- Click a cycle to expand → shows email + full Stage History (each stage entry with timestamp, notes, tags, escalated flag).
- KPIs strip: Total Cycles / Active / Completed / Escalated.
- Filters: search (client or company), month, cycle status, escalated only/not.

## Notes
- The MER Dashboard Data tab is still the source for clients/progress/trends. Bookkeepers list and Monthly Trends are derived in-app from MER rows (no separate sheets needed).
- The MER tab now contains multiple months per client; we keep only the latest-timestamp row per client for the Clients/Progress/Dashboard views.
