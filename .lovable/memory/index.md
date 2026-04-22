# Project Memory

## Core
- Internal MER dashboard for bookkeeping/accounting compliance tracking.
- Luxury 'Gilded Rose' aesthetic: dark charcoal (#1a1614), rose/pink accents. Playfair Display (headers), Inter (UI).
- Google Apps Script JSON bridge via TanStack Query. STRICTLY no hardcoded data.
- Risk lists expand vertically (no scrollbars). Use word-wrapping (break-words) to prevent cutoffs.
- Monthly Trends date format strictly 'Mon YYYY'. Comparison deltas are percentages (%).
- Mobile-first layout: fluid padding, edge-to-edge scrollable data tables on mobile.
- Sheet has 2 tabs: "MER Dashboard Data" (clients/progress, latest row per client used) and "Bookkeeping Log" (cycle/stage tracking → Master Bookkeeping Cycle page).
- Bookkeepers list and Monthly Trends derived in-app from MER rows; no separate sheets needed.

## Memories
- [Project Overview](mem://project/overview) — High-level purpose of the internal MER dashboard
- [Gilded Rose Aesthetic](mem://style/aesthetic) — Visual design language, typography, and color schemes
- [Backend Architecture](mem://tech/backend) — Data fetching, Google Apps Script integration, TanStack Query setup
- [Compliance & Priority](mem://features/compliance) — Compliance logic, leaderboard, recent activity feed, and priority lists
- [Data Sync](mem://features/data-sync) — Manual/auto refresh features and visual states
- [Notification System](mem://features/notifications) — Live notification alerts and UI details
- [Monthly Trends](mem://features/reporting/monthly-trends) — Trends page logic, date formats, and UI interactions
- [Snapshots & Export](mem://features/reporting/snapshots) — Auto/manual data snapshots, backend trigger, and UI export logic
- [Layout & Responsive](mem://style/layout) — Minimalist constraints, responsive padding, table display
- [Client Management](mem://features/client-management) — Clients page sorting and client cards
- [Dashboard Analytics](mem://features/dashboard-analytics) — Main dashboard charts and reports summary
- [Settings Interface](mem://features/settings) — Refresh intervals and dynamically derived configuration
- [Theme Management](mem://features/theme-management) — Dark/light mode switching
- [Master Bookkeeping Cycle](mem://features/master-cycle) — /master-cycle page from Bookkeeping Log tab: grouped cycles, stage timeline, escalation
- [MER history & exports](mem://features/mer-history-exports) — Dashboard month picker, per-client history dialog, Export Center (XLSX/PDF/CSV) for any month or range
