---
name: Master Bookkeeping Cycle
description: /master-cycle page surfacing Bookkeeping Log. Canonical 8-stage Pipeline 1 rail with per-stage cycle counts (clickable to filter), KPIs, category-tag filter, expandable cycle cards with stage history.
type: feature
---
# Master Bookkeeping Cycle

Route: `/master-cycle` (sidebar icon: Workflow).

## Source
`Bookkeeping Log` tab in the Google Sheet. Parsed in `src/services/googleSheets.ts` as `cycleEntries`. Rows are written by automation (Zapier/n8n) — one row per stage transition.

## Canonical pipeline (Blueprint v2)
The 8 stages of Pipeline 1 — Master Bookkeeping Cycle — are hardcoded in `MasterCyclePage.tsx` as `PIPELINE_STAGES` (source of truth: Brant & Associates Automation Blueprint v2). The rail always renders all 8 stages even if data is empty for some.

1. New Cycle Started (automove ON, system)
2. Weekly Processing (team in TaxDome)
3. Documents Requested (GHL email + SMS)
4. Awaiting Client Response (auto reminders D3/D5/D7)
5. Documents Received (bookkeeper applies `docs-received` tag)
6. Month-End Review (bookkeeper + assistant)
7. Internal Review (bookkeeper applies `review-ready`)
8. Completed (Jessica applies `jessica-approved`)

## Page anatomy
- **KPI strip** (5): Total Cycles · Active · Completed · Escalated · Avg Days/Stage (active only).
- **Pipeline rail** (primary visual): 8 stage cards in a responsive grid, each showing count of cycles whose current stage = that stage, with a density bar. Stages tinted by progression (cool → warm → success). Click toggles a stage filter on the cycle list.
- **Filters**: search (client/company), month, status, category tag, escalated only/not, plus a "Clear all" link. Stage filter is set by clicking the rail.
- **Cycle cards**: large stage badge on the left (color-coded by stage), client + company, escalated chip, month + current stage name + days-in-stage + category chips, status pill on right. Below: 8-segment timeline rail showing reached/current per cycle.
- **Expanded view**: client email, "current owner" hint pulled from canonical stage metadata, and full Stage History list.

## Notes
- GHL Contact ID and raw Cycle Key strings are intentionally hidden from the UI (tech-only fields).
- Category tags are split on `,`/`;`, deduped per cycle, and rendered as uppercase mono chips.
- The MER Dashboard Data tab is still the source for clients/progress/trends. Bookkeepers list and Monthly Trends are derived in-app from MER rows.
- The MER tab contains multiple months per client; we keep only the latest-timestamp row per client for the Clients/Progress/Dashboard views.
