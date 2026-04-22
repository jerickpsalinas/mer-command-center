---
name: MER history & exports
description: Time-travel month picker on Dashboard, per-client history dialog on Clients page, and Export Center (XLSX/PDF/CSV) for any month or date range.
type: feature
---
# MER history browsing & on-demand exports

## Data layer
- `fetchSheetData` returns `merHistory` (every MER row parsed as Client + month/timestamp metadata), `availableMonths` (chronological asc labels like "May 2025"), and `latestMonth`.
- Helpers in `useSheetData.ts`:
  - `getClientsForMonth(merHistory, label)` — latest submission per client within a month.
  - `getClientHistory(merHistory, name)` — that client's row across every month they appear (asc).
  - `filterHistoryByDateRange`, `groupHistoryByMonth`.

## Dashboard month picker (`/`)
- Top-of-page `Select` lets the user time-travel. All KPIs, charts, attention lists, leaderboard, reports summary recompute against the chosen month's snapshot.
- Default = `latestMonth`. Indicator shows "live" vs "historical view". Reset button clears the override.

## Per-client history dialog (`/clients`)
- Each client card is a button. Clicking opens a Dialog with the client's monthly timeline:
  - Sparkline (LineChart) of completion % across months.
  - Per-month table: status, %, uncategorized, unapplied, statement, last reconciled.

## Export Center (`src/components/ExportCenter.tsx`)
- Mounted on Dashboard and Monthly Trends pages.
- Three modes: Single Month / Date Range (from-to) / All Time.
- Three formats:
  - **XLSX** (`xlsx` lib) — multi-sheet workbook matching original MER template: KPI Overview + per-month Client Review sheets + Monthly Trends.
  - **PDF** (`jspdf` + `jspdf-autotable`, landscape letter) — title + KPI table + per-month client tables, page numbers, color-coded status.
  - **CSV** — raw flat history rows for further analysis.
- Generation is fully client-side from `merHistory`.

## Files
- `src/services/googleSheets.ts` — adds `MerHistoryRow`, `availableMonths`, `latestMonth` on `SheetData`.
- `src/hooks/useSheetData.ts` — month/date helpers.
- `src/lib/merExport.ts` — XLSX/PDF/CSV generators.
- `src/components/ExportCenter.tsx` — UI panel.
- `src/pages/DashboardPage.tsx` — month picker + Export Center mount.
- `src/pages/ClientsPage.tsx` — per-client history dialog.
- `src/pages/MonthlyTrendsPage.tsx` — Export Center mount.
