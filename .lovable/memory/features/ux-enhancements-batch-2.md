---
name: UX Enhancements Batch 2
description: Sticky sub-header, density toggle, sparklines, optimistic refresh, animated KPIs, toast→notif bridge, mobile bottom tab bar, swipe gestures.
type: feature
---
# UX Enhancements (batch 2)

Items 3, 4, 5, 9, 12, 14, 16, 17 from the suggestions list.

## #3 Sticky sub-header
`src/components/StickyPageHeader.tsx`. Reusable wrapper with a sentinel + IntersectionObserver. Currently used on Clients page to surface filter chips + result count when scrolling.

## #4 Density toggle
Added `density: "comfortable" | "compact"` to `useUserSettings`. Applied as `data-density` attr on `<html>` and consumed via CSS rules in `index.css` (`density-card`, `density-gap-3`, `density-space-y-6`, `density-text` classes). Settings page exposes it as a segmented control.

## #5 Inline sparklines
`src/components/ClientSparkline.tsx` — pure SVG, no recharts. Renders trailing 6 months of completion% per client on Clients page cards.

## #9 Optimistic refresh
In `AppLayout.tsx`, `<main>` opacity drops to 60% during `useIsFetching` instead of blocking with a spinner.

## #12 Animated KPI counters
`src/components/AnimatedNumber.tsx` using framer-motion's `animate()`. `KPICard` now wraps numeric values to count up/down on data refresh.

## #14 Toast → Notification bridge
`src/lib/toastLog.ts` — tiny external store (subscribe/getSnapshot pattern) that captures every `toast()` call. `useToast` was patched to push entries. NotificationDropdown uses `useSyncExternalStore` to render a "Recent activity" section above live alerts; opening the bell auto-marks them read.

## #16 Mobile bottom tab bar
`src/components/MobileTabBar.tsx` — 4 tabs (Dashboard, Clients, Cycle, More). "More" opens the existing sidebar drawer. Layout adds `pb-[72px]` on `<main>` for clearance and hides the footer on mobile. Uses `safe-area-inset-bottom`.

## #17 Swipe gestures
`src/components/SwipeableCard.tsx` — touch-only swipe-left reveals a single action panel (88px wide). Used on Clients page cards to expose "History". Falls through to onTap for non-swipe taps; also lets pointer events through on desktop.

## Bonus
Added a `@media print` block in `index.css` so client pages print cleanly (sidebar/header/glass surfaces hidden, shadows stripped).
