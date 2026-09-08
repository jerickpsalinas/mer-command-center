import { useEffect, useMemo, useState } from "react";
import { isCleanupTagString } from "@/lib/cleanupCycle";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Flame,
  Mail,
  X,
  Tag as TagIcon,
  Loader2,
  Info,
  SearchX,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSheetData } from "@/hooks/useSheetData";
import { DataError } from "@/components/DataStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import type { CycleEntry } from "@/services/googleSheets";
import { useClientDetails } from "@/hooks/useClientDetails";
import { useGhlTags, getNextCycleTag } from "@/hooks/useGhlTags";
import { hasPendingVerifyTag } from "@/services/googleSheets";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/activityLogger";

/* ────────────────────────────────────────────────────────────────────────────
 * Pipeline 1 — Master Bookkeeping Cycle (8 canonical stages)
 * Source of truth: MER Command Center Automation Blueprint v2.
 * The Bookkeeping Log sheet writes one row per stage transition; we use this
 * canonical list to render the rail, regardless of which stages exist in data.
 * ──────────────────────────────────────────────────────────────────────── */
const PIPELINE_STAGES: {
  num: number;
  name: string;
  short: string;
  automove: boolean;
  who: string;
}[] = [
  { num: 1, name: "New Cycle Started", short: "New Cycle", automove: true, who: "System (auto)" },
  { num: 2, name: "Weekly Processing", short: "Weekly Work", automove: false, who: "Team in TaxDome" },
  { num: 3, name: "Documents Requested", short: "Docs Requested", automove: false, who: "GHL email + SMS" },
  { num: 4, name: "Awaiting Client Response", short: "Awaiting Client", automove: false, who: "Client (reminders auto)" },
  { num: 5, name: "Documents Received", short: "Docs Received", automove: false, who: "Bookkeeper applies tag" },
  { num: 6, name: "Month-End Review", short: "Month-End", automove: false, who: "Bookkeeper + Assistant" },
  { num: 7, name: "Internal Review", short: "Internal Review", automove: false, who: "Bookkeeper → Jessica" },
  { num: 8, name: "Completed", short: "Completed", automove: false, who: "Jessica applies tag" },
];

const STAGE_NAME_BY_NUM = new Map(PIPELINE_STAGES.map((s) => [s.num, s.name]));

function stageTone(num: number): {
  bg: string;
  text: string;
  ring: string;
  bar: string;
} {
  // 4-color grouping: stages 1-4 (intake), 5-6 (processing), 7 (review), 8 (done)
  if (num === 8) return { bg: "bg-success/15", text: "text-success", ring: "ring-success/40", bar: "bg-success" };
  if (num === 7) return { bg: "bg-warning/15", text: "text-warning", ring: "ring-warning/40", bar: "bg-warning" };
  if (num >= 5) return { bg: "bg-primary/15", text: "text-primary", ring: "ring-primary/40", bar: "bg-primary" };
  return { bg: "bg-muted", text: "text-muted-foreground", ring: "ring-border", bar: "bg-muted-foreground/40" };
}

/** Days-in-stage emphasis: warning after a week, destructive after two. */
function daysTone(days: number): string {
  if (days >= 14) return "text-destructive";
  if (days >= 7) return "text-warning";
  return "text-foreground";
}

/** Skeleton shaped like the final layout: KPI strip, pipeline rail (4 phase columns), filters, cycle cards. */
function MasterCycleSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading master cycle…</span>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-12 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-card p-4 lg:p-5 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-6 w-64 rounded" />
          <Skeleton className="h-3 w-44 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_0.6fr_0.6fr] gap-3">
          {[4, 2, 1, 1].map((n, i) => (
            <div key={i} className="rounded-2xl border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between px-1">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className={`grid gap-2 ${n === 4 ? "grid-cols-2 sm:grid-cols-4" : n === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                {Array.from({ length: n }).map((_, j) => (
                  <Skeleton key={j} className="h-[118px] rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-full sm:w-72 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card shadow-card p-4 lg:p-5 space-y-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-64 rounded" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === "active"
      ? "bg-primary/10 text-primary border-primary/20"
      : s === "completed"
        ? "bg-success/10 text-success border-success/20"
        : s === "escalated"
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : s === "on hold" || s === "paused"
            ? "bg-warning/10 text-warning border-warning/20"
            : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {status || "—"}
    </span>
  );
}

function CategoryChips({ tags }: { tags: string }) {
  if (!tags || tags === "None") return null;
  const list = tags
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {list.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono-data uppercase tracking-wide"
        >
          <TagIcon className="h-2.5 w-2.5" aria-hidden />
          {t}
        </span>
      ))}
    </div>
  );
}

export default function MasterCyclePage() {
  const { data, isLoading, error, refetch, isFetching } = useSheetData();
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEscalated, setFilterEscalated] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStage, setFilterStage] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { open: openClient, modal: clientModal } = useClientDetails();
  const { tagsMap, applyTag } = useGhlTags();
  const { isAdmin, isDeveloper } = useAuth();
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [pendingTag, setPendingTag] = useState<
    | {
        contactId: string;
        tag: string;
        displayName: string;
        clientName: string;
        cycleMonth: string;
      }
    | null
  >(null);

  const handleApplyTag = async (
    contactId: string,
    tag: string,
    displayName: string,
    ctx?: { clientName: string; cycleMonth: string },
  ) => {
    setApplyingId(contactId);
    try {
      await applyTag(contactId, tag);
      toast.success(`Tag ${tag} applied to ${displayName}`);

      if (tag === "jessica-approved" || tag === "jessica-approved-cleanup") {
        void logActivity({
          action: "mark-approved",
          clientName: ctx?.clientName ?? displayName,
          page: "Master Cycle",
          details: `Applied tag: ${tag}`,
          cycleMonth: ctx?.cycleMonth ?? "",
        });
      }

      // If this advances to docs-received (regular or cleanup), also fire WF6
      // to stop the doc-request automation. Failures here are silent.
      if (tag === "docs-received" || tag === "docs-received-cleanup") {
        const cycleMonth = ctx?.cycleMonth ?? "";
        const clientName = ctx?.clientName ?? displayName;
        const bookkeeper =
          data?.clients.find(
            (c) =>
              c.name === clientName ||
              c.ghlContactId === contactId,
          )?.bookkeeper ?? "";
        const merKey = `${contactId}_${cycleMonth.replace(/\s+/g, "")}`;
        void logActivity({
          action: "mark-docs-received",
          clientName,
          page: "Master Cycle",
          details: `Applied tag: ${tag}`,
          cycleMonth,
        });
        try {
          await fetch(
            "https://n8n.srv1482383.hstgr.cloud/webhook/dashboard-action",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "mark-docs-received",
                merKey,
                ghlContactId: contactId,
                clientName: displayName,
                bookkeeper,
                cycleMonth,
              }),
            },
          );
        } catch (err) {
          console.error("WF6 mark-docs-received call failed", err);
        }
      }
    } catch {
      toast.error("Failed to apply tag. Please try again.");
    } finally {
      setApplyingId(null);
    }
  };

  // Cleanup-cycle clients are tracked separately (see GHL Active Clients page);
  // this pipeline only covers the regular Master Bookkeeping Cycle.
  const entries = (data?.cycleEntries ?? []).filter(
    (e) => !isCleanupTagString(e.categoryTags, e.cycleStatus, e.stageName, e.cycleKey),
  );

  // Group entries by Cycle Key (one client per month = one cycle)
  const cycles = useMemo(() => {
    const map = new Map<string, CycleEntry[]>();
    for (const e of entries) {
      const key = e.cycleKey || `${e.clientName}_${e.month}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    const grouped = Array.from(map.entries()).map(([key, items]) => {
      const sorted = [...items].sort((a, b) => a.stageNumber - b.stageNumber);
      const latest = [...items].sort(
        (a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0),
      )[0];
      // Fallback: compute days-in-stage from the latest entry's timestamp when
      // the sheet doesn't provide it (column missing or 0).
      let daysInStage = Number(latest.daysInStage) || 0;
      if (!daysInStage && latest.timestamp) {
        const t = Date.parse(latest.timestamp);
        if (!Number.isNaN(t)) {
          daysInStage = Math.max(0, Math.floor((Date.now() - t) / 86400000));
        }
      }
      const categorySet = new Set<string>();
      for (const it of items) {
        if (it.categoryTags && it.categoryTags !== "None") {
          it.categoryTags
            .split(/[,;]/)
            .map((t) => t.trim())
            .filter(Boolean)
            .forEach((t) => categorySet.add(t));
        }
      }
      return {
        key,
        clientName: latest.clientName,
        companyName: latest.companyName,
        clientEmail: latest.clientEmail,
        ghlContactId: latest.ghlContactId,
        month: latest.month,
        cycleStatus: latest.cycleStatus,
        currentStage: latest.stageNumber,
        currentStageName: latest.stageName || STAGE_NAME_BY_NUM.get(latest.stageNumber) || "",
        daysInStage,
        escalated: items.some((i) => i.escalated),
        categories: Array.from(categorySet),
        entries: sorted,
        latestTimestamp: latest.timestamp,
      };
    });
    grouped.sort((a, b) => {
      // Stage 5 (Documents Received) clients that have replied DOCSDONE via WF13
      // and are awaiting TaxDome verification bubble to the very top — the team
      // needs them immediately visible so the 72h window doesn't slip.
      const aPending = a.currentStage === 5 && hasPendingVerifyTag(tagsMap[a.ghlContactId] ?? []);
      const bPending = b.currentStage === 5 && hasPendingVerifyTag(tagsMap[b.ghlContactId] ?? []);
      if (aPending !== bPending) return aPending ? -1 : 1;

      const ta = Math.max(
        Date.parse(a.latestTimestamp) || 0,
        ...a.entries.map((e) => Date.parse(e.timestamp) || 0),
      );
      const tb = Math.max(
        Date.parse(b.latestTimestamp) || 0,
        ...b.entries.map((e) => Date.parse(e.timestamp) || 0),
      );
      if (tb !== ta) return tb - ta;
      // Tie-breaker: most recently advanced stage first, then fewest days in stage
      if (b.currentStage !== a.currentStage) return b.currentStage - a.currentStage;
      return a.daysInStage - b.daysInStage;
    });

    return grouped;
  }, [entries, tagsMap]);

  const months = useMemo(
    () => Array.from(new Set(cycles.map((c) => c.month).filter(Boolean))),
    [cycles],
  );
  const statuses = useMemo(
    () => Array.from(new Set(cycles.map((c) => c.cycleStatus).filter(Boolean))),
    [cycles],
  );
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of cycles) for (const t of c.categories) set.add(t);
    return Array.from(set).sort();
  }, [cycles]);

  // Latest cycle month (by most recent activity) — used as the default scope so
  // KPIs reflect the current month only, matching the Dashboard's behaviour.
  const latestCycleMonth = useMemo(() => {
    if (cycles.length === 0) return "";
    const byMonth = new Map<string, number>();
    for (const c of cycles) {
      const t = Date.parse(c.latestTimestamp) || 0;
      byMonth.set(c.month, Math.max(byMonth.get(c.month) ?? 0, t));
    }
    return Array.from(byMonth.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  }, [cycles]);

  // Default the month filter to the latest month on first load so totals align
  // with the Dashboard's "current" month view.
  useEffect(() => {
    if (!filterMonth && latestCycleMonth) setFilterMonth(latestCycleMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestCycleMonth]);

  // Cycles scoped to the active month (when one is selected). All KPI tallies
  // derive from this single array so Total = Active + Completed + (other) and
  // every stage count rolls up to the same Total.
  const scopedCycles = useMemo(
    () => (filterMonth ? cycles.filter((c) => c.month === filterMonth) : cycles),
    [cycles, filterMonth],
  );

  // Counts per canonical stage (current stage of each cycle in the active scope)
  const stageCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const c of scopedCycles) counts.set(c.currentStage, (counts.get(c.currentStage) ?? 0) + 1);
    return counts;
  }, [scopedCycles]);

  const filtered = useMemo(() => {
    return scopedCycles.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.clientName.toLowerCase().includes(q) &&
          !c.companyName.toLowerCase().includes(q)
        )
          return false;
      }
      if (filterStatus && c.cycleStatus !== filterStatus) return false;
      if (filterEscalated === "yes" && !c.escalated) return false;
      if (filterEscalated === "no" && c.escalated) return false;
      if (filterCategory && !c.categories.includes(filterCategory)) return false;
      if (filterStage !== null && c.currentStage !== filterStage) return false;
      return true;
    });
  }, [scopedCycles, search, filterStatus, filterEscalated, filterCategory, filterStage]);

  // KPIs — all derived from the same scoped array so totals always reconcile.
  const totalCycles = scopedCycles.length;
  const activeCycles = scopedCycles.filter((c) => c.cycleStatus.trim().toLowerCase() === "active").length;
  const completedCycles = scopedCycles.filter(
    (c) => c.cycleStatus.trim().toLowerCase() === "completed",
  ).length;
  // Escalated is a SUBSET of Active — never an additional category.
  const escalatedCycles = scopedCycles.filter(
    (c) => c.escalated && c.cycleStatus.trim().toLowerCase() === "active",
  ).length;
  const avgDaysInStage = useMemo(() => {
    const active = scopedCycles.filter((c) => c.cycleStatus.trim().toLowerCase() === "active");
    if (active.length === 0) return 0;
    return Math.round(
      active.reduce((s, c) => s + (Number(c.daysInStage) || 0), 0) / active.length,
    );
  }, [scopedCycles]);


  if (isLoading) return <MasterCycleSkeleton />;
  if (error || !data) return <DataError message={error?.message} onRetry={() => refetch()} isRetrying={isFetching} />;

  const activeFilters = [
    filterMonth,
    filterStatus,
    filterEscalated,
    filterCategory,
    filterStage !== null ? String(filterStage) : "",
  ].filter(Boolean).length;

  const clearAll = () => {
    setFilterMonth("");
    setFilterStatus("");
    setFilterEscalated("");
    setFilterCategory("");
    setFilterStage(null);
    setSearch("");
  };

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-3"
      >
        <KpiTile label="Total Cycles" value={totalCycles} icon={<Activity className="h-4 w-4" />} tone="muted" tooltip={<>Total Cycles tracks every client moving through the bookkeeping pipeline (from the Bookkeeping Log), including clients who aren't on the MER workflow. This is why it may not match Dashboard's Total Clients count, which only counts MER workflow clients.</>} />
        <KpiTile label="Active" value={activeCycles} icon={<Clock className="h-4 w-4" />} tone="primary" />
        <KpiTile label="Cycle: Completed" value={completedCycles} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <KpiTile
          label="Escalated"
          value={escalatedCycles}
          icon={<Flame className="h-4 w-4" />}
          tone="destructive"
          hint={activeCycles > 0 ? `of ${activeCycles} active` : "no active cycles"}
        />
        <KpiTile
          label="Avg Days / Stage"
          value={avgDaysInStage}
          icon={<Clock className="h-4 w-4" />}
          tone="muted"
          suffix="d"
        />

      </motion.div>

      {/* Pipeline rail — primary visual */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        aria-label="Pipeline 1 — Master Bookkeeping Cycle"
        className="rounded-2xl border border-border bg-card shadow-card p-4 lg:p-5"
      >
        <header className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <p className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-primary/80">
              Pipeline 1 · 8 Stages
            </p>
            <h2 className="font-display text-xl font-semibold text-foreground mt-0.5">
              Where every active cycle is sitting
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Click a stage to filter the list below.
            </p>
          </div>
          {filterStage !== null && (
            <button
              type="button"
              onClick={() => setFilterStage(null)}
              className="inline-flex items-center gap-1.5 text-[12px] min-h-9 text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" aria-hidden />
              Clear stage filter
            </button>
          )}
        </header>

        {/* Stage groups: 4 phase-boxes wrapping individual stage cards */}
        {(() => {
          const GROUPS: {
            label: string;
            sub: string;
            stages: number[];
            box: string;
            chip: string;
          }[] = [
            {
              label: "Prep & Outreach",
              sub: "Stages 1–4",
              stages: [1, 2, 3, 4],
              box: "bg-muted/40 border-border",
              chip: "bg-muted text-muted-foreground",
            },
            {
              label: "Books in Progress",
              sub: "Stages 5–6",
              stages: [5, 6],
              box: "bg-primary/5 border-primary/20",
              chip: "bg-primary/15 text-primary",
            },
            {
              label: "Review",
              sub: "Stage 7",
              stages: [7],
              box: "bg-warning/5 border-warning/20",
              chip: "bg-warning/15 text-warning",
            },
            {
              label: "Done",
              sub: "Stage 8",
              stages: [8],
              box: "bg-success/5 border-success/20",
              chip: "bg-success/15 text-success",
            },
          ];
          return (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4 pb-2 scrollbar-thin lg:grid lg:grid-cols-[2fr_1fr_0.6fr_0.6fr] lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0">
              {GROUPS.map((g) => {
                const total = g.stages.reduce((sum, n) => sum + (stageCounts.get(n) ?? 0), 0);
                return (
                  <section
                    key={g.label}
                    className={`snap-start shrink-0 w-[85%] sm:w-[70%] md:w-[55%] lg:w-auto lg:shrink min-w-0 rounded-2xl border ${g.box} p-3`}
                    aria-label={`${g.label} (${g.sub})`}
                  >
                    <header className="flex items-center justify-between mb-2.5 px-1">
                      <div className="min-w-0">
                        <h3 className="text-[12px] font-semibold text-foreground leading-tight truncate">
                          {g.label}
                        </h3>
                        <p className="text-[10px] font-mono-data uppercase tracking-wider text-muted-foreground">
                          {g.sub}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono-data tabular-nums ${g.chip}`}
                      >
                        {total}
                        <span className="font-medium opacity-70">
                          {total === 1 ? "cycle" : "cycles"}
                        </span>
                      </span>
                    </header>
                    <ol
                      className={`grid gap-2 ${
                        g.stages.length >= 4
                          ? "grid-cols-2 sm:grid-cols-4"
                          : g.stages.length === 2
                            ? "grid-cols-2"
                            : "grid-cols-1"
                      }`}
                    >
                      {g.stages.map((num) => {
                        const s = PIPELINE_STAGES.find((p) => p.num === num)!;
                        const count = stageCounts.get(num) ?? 0;
                        const tone = stageTone(num);
                        const selected = filterStage === num;
                        return (
                          <li key={num}>
                            <button
                              type="button"
                              onClick={() => setFilterStage(selected ? null : num)}
                              aria-pressed={selected}
                              aria-label={`${s.name}: ${count} ${count === 1 ? "cycle" : "cycles"}`}
                              title={`${s.name} — ${s.who}${s.automove ? " · Automove ON" : ""}`}
                              className={`w-full text-left rounded-xl border p-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                selected
                                  ? `${tone.bg} border-transparent ring-2 ${tone.ring}`
                                  : "bg-card border-border hover:bg-accent/30"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono-data ${tone.bg} ${tone.text}`}
                                >
                                  {s.num}
                                </span>
                                {s.automove && (
                                  <span
                                    className="text-[9px] font-mono-data uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/10 text-success"
                                    title="Auto-advances to next stage"
                                  >
                                    Auto
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-[12px] font-semibold text-foreground leading-tight break-words">
                                {s.short}
                              </p>
                              <div className="mt-1.5 flex items-baseline gap-1">
                                <span
                                  className={`text-2xl font-bold tabular-nums font-mono-data ${count > 0 ? "text-foreground" : "text-muted-foreground/60"}`}
                                >
                                  {count}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {count === 1 ? "cycle" : "cycles"}
                                </span>
                              </div>
                              <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${tone.bar} transition-[width] duration-300`}
                                  style={{
                                    width:
                                      totalCycles > 0
                                        ? `${Math.min(100, (count / totalCycles) * 100)}%`
                                        : "0%",
                                  }}
                                />
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })}
            </div>
          );
        })()}
      </motion.section>


      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 min-h-10 text-sm w-full sm:w-72 shadow-card focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-colors duration-150">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            <input
              type="search"
              aria-label="Search client or company"
              placeholder="Search client or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full min-w-0"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="shrink-0 -mr-1 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            )}
          </div>

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 min-h-9 rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" aria-hidden /> Clear filters
            </button>
          )}

          <div className="sm:ml-auto text-[12px] text-muted-foreground font-mono-data tabular-nums">
            {filtered.length} of {cycles.length} cycles
            {filterStage !== null && (
              <span className="ml-2 text-primary">
                · Stage {filterStage}: {STAGE_NAME_BY_NUM.get(filterStage)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mr-1">
            <Filter className="h-3.5 w-3.5" aria-hidden />
            <span>Filters</span>
            {activeFilters > 0 && (
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center" aria-label={`${activeFilters} active filters`}>
                {activeFilters}
              </span>
            )}
          </div>
          {[
            { value: filterMonth, setter: setFilterMonth, label: "All Months", options: months },
            { value: filterStatus, setter: setFilterStatus, label: "All Statuses", options: statuses },
            { value: filterCategory, setter: setFilterCategory, label: "All Categories", options: categories },
            {
              value: filterEscalated,
              setter: setFilterEscalated,
              label: "All Cycles",
              options: ["yes", "no"],
              display: (o: string) => (o === "yes" ? "Escalated only" : "Not escalated"),
            },
          ].map(({ value, setter, label, options, display }: { value: string; setter: (v: string) => void; label: string; options: string[]; display?: (o: string) => string }) => (
            <div key={label} className="relative">
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                aria-label={label}
                className={`appearance-none rounded-lg border bg-card pl-3 pr-8 py-2 min-h-10 text-sm cursor-pointer transition-colors duration-150 ${
                  value
                    ? "border-primary/30 text-foreground font-medium"
                    : "border-border text-muted-foreground"
                } hover:border-muted-foreground/40`}
              >
                <option value="">{label}</option>
                {options.map((o: string) => (
                  <option key={o} value={o}>
                    {display ? display(o) : o}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Cycle list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-card shadow-card px-4 py-12">
            <EmptyState
              icon={Calendar}
              title={activeFilters > 0 || search ? "No cycles match the current filters" : "No cycles logged yet"}
              hint={
                activeFilters > 0 || search
                  ? <>Try widening your search or clearing a filter.{" "}
                      <button
                        type="button"
                        onClick={clearAll}
                        className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 min-h-9 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Clear filters
                      </button>
                    </>
                  : "Cycles appear here as the Bookkeeping Log records stage transitions."
              }
              variant="plain"
            />
          </div>
        )}
        {filtered.map((c, idx) => {
          const open = expanded === c.key;
          const tone = stageTone(c.currentStage);
          const stageMeta = PIPELINE_STAGES.find((s) => s.num === c.currentStage);
          const contactDisplay = c.clientName?.trim() || "";
          const company = c.companyName?.trim() || "";
          const primary = company || contactDisplay || "Unnamed";
          const secondary = company ? contactDisplay : "";
          const liveTags = (c.ghlContactId && tagsMap[c.ghlContactId]) || [];
          const cycleInfo = c.ghlContactId ? getNextCycleTag(liveTags) : null;
          const isApplying = applyingId === c.ghlContactId;
          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 + idx * 0.015 }}
              className={`rounded-xl border bg-card shadow-card overflow-hidden transition-colors duration-150 ${c.escalated ? "border-destructive/30" : "border-border"}`}
            >
              <div
                tabIndex={0}
                aria-expanded={open}
                aria-label={`${open ? "Collapse" : "Expand"} ${primary}`}
                onClick={() => setExpanded(open ? null : c.key)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(open ? null : c.key); } }}
                className="w-full text-left p-4 lg:p-5 hover:bg-muted/40 transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <div className="flex flex-wrap items-start gap-4">
                  {/* Stage badge — large, scannable */}
                  <div
                    className={`shrink-0 h-12 w-12 rounded-xl ${tone.bg} ${tone.text} flex flex-col items-center justify-center font-mono-data`}
                    title={stageMeta?.name}
                  >
                    <span className="text-[9px] uppercase tracking-wider opacity-70">Stage</span>
                    <span className="text-base font-bold leading-none">{c.currentStage}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openClient(c.clientName); }}
                        aria-label={`Open ${primary}`}
                        className="text-[15px] font-semibold text-foreground break-words text-left hover:text-primary transition-colors duration-150 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {primary}
                      </button>
                      {c.escalated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          ESCALATED
                        </span>
                      )}
                      {c.currentStage === 5 && hasPendingVerifyTag(liveTags) && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/30"
                          title="Client texted DOCSDONE — awaiting TaxDome verification (WF13, 72h window)"
                        >
                          PENDING VERIFICATION
                        </span>
                      )}
                    </div>
                    {secondary && (
                      <p className="text-[12px] text-muted-foreground mt-0.5 break-words">
                        {secondary}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                      <span className="font-mono-data">{c.month}</span>
                      <span aria-hidden>·</span>
                      <span className="text-foreground/90">
                        {c.currentStageName || stageMeta?.name}
                      </span>
                      <span aria-hidden>·</span>
                      <span>
                        <span className={`font-mono-data font-semibold tabular-nums ${daysTone(c.daysInStage)}`}>
                          {c.daysInStage}
                        </span>{" "}
                        day{c.daysInStage === 1 ? "" : "s"} in stage
                      </span>
                      {c.categories.length > 0 && (
                        <>
                          <span aria-hidden>·</span>
                          <CategoryChips tags={c.categories.join(",")} />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cycleInfo && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono-data uppercase tracking-wide ${
                          cycleInfo.kind === "regular"
                            ? "bg-info/15 text-info border-info/30"
                            : "bg-warning/15 text-warning border-warning/30"
                        }`}
                      >
                        {cycleInfo.kind === "regular" ? "REGULAR" : "CLEANUP"}
                      </span>
                    )}
                    {cycleInfo?.next && c.ghlContactId && (cycleInfo.next.startsWith("jessica-approved") ? (isAdmin || isDeveloper) : true) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingTag({
                            contactId: c.ghlContactId,
                            tag: cycleInfo.next!,
                            displayName: primary,
                            clientName: c.clientName,
                            cycleMonth: c.month,
                          });
                        }}
                        disabled={isApplying || applyingId !== null}
                        aria-label={`Apply tag ${cycleInfo.next}`}
                        className="inline-flex items-center gap-1.5 min-h-9 px-2.5 rounded-md text-[11px] font-semibold font-mono-data bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {isApplying ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <span aria-hidden>+</span>
                        )}
                        {cycleInfo.next}
                      </button>
                    )}
                    <StatusPill status={c.cycleStatus} />
                    <ChevronDown
                      aria-hidden
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Stage timeline — labeled segments across the canonical 8 stages */}
                <div className="mt-4 grid grid-cols-8 gap-1">
                  {PIPELINE_STAGES.map((s) => {
                    const reached = c.entries.some((e) => e.stageNumber >= s.num);
                    const isCurrent = s.num === c.currentStage;
                    return (
                      <div key={s.num} className="flex flex-col items-stretch gap-1">
                        <div
                          className={`h-1.5 rounded-full transition-colors ${
                            isCurrent
                              ? `${stageTone(s.num).bar}`
                              : reached
                                ? "bg-primary/60"
                                : "bg-muted"
                          }`}
                        />
                        <span
                          className={`text-[9px] font-mono-data text-center truncate ${
                            isCurrent
                              ? "text-foreground font-semibold"
                              : reached
                                ? "text-muted-foreground"
                                : "text-muted-foreground/50"
                          }`}
                          title={s.name}
                        >
                          {s.num}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {open && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="border-t border-border bg-muted/30"
                >
                  <div className="p-4 lg:p-5 space-y-4">
                    {/* Contact line */}
                    {c.clientEmail && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        <span className="text-foreground font-mono-data break-all">
                          {c.clientEmail}
                        </span>
                      </div>
                    )}

                    {/* Current stage context */}
                    {stageMeta && (
                      <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-[12px]">
                        <span className="text-muted-foreground">Current owner: </span>
                        <span className="text-foreground font-medium">{stageMeta.who}</span>
                        {stageMeta.automove && (
                          <span className="ml-2 text-[10px] font-mono-data uppercase tracking-wider text-success bg-success/10 px-1.5 py-0.5 rounded">
                            Auto-advances
                          </span>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Stage History
                      </h3>
                      <div className="space-y-2">
                        {(() => {
                          // Sort by timestamp ascending so duration = next.ts - this.ts
                          const byTime = [...c.entries].sort(
                            (a, b) => (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0),
                          );
                          return byTime.map((e, i) => {
                            let days = Number(e.daysInStage) || 0;
                            if (!days) {
                              const start = Date.parse(e.timestamp);
                              const end =
                                i < byTime.length - 1
                                  ? Date.parse(byTime[i + 1].timestamp)
                                  : Date.now();
                              if (!Number.isNaN(start) && !Number.isNaN(end)) {
                                days = Math.max(0, Math.floor((end - start) / 86400000));
                              }
                            }
                            return (
                              <div
                                key={e.id}
                                className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-3"
                              >
                                <div className="flex items-center gap-2 shrink-0">
                                  <div
                                    className={`h-7 w-7 rounded-full text-[11px] font-bold flex items-center justify-center font-mono-data ${stageTone(e.stageNumber).bg} ${stageTone(e.stageNumber).text}`}
                                  >
                                    {e.stageNumber}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-foreground">
                                      {e.stageName || STAGE_NAME_BY_NUM.get(e.stageNumber)}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground font-mono-data">
                                      {e.timestamp}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                  {e.notes && (
                                    <p className="text-[12px] text-foreground/90 break-words">
                                      {e.notes}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <CategoryChips tags={e.categoryTags} />
                                    {e.escalated && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-semibold uppercase tracking-wider">
                                        Escalated
                                      </span>
                                    )}
                                    <span className={`text-[10px] font-mono-data ml-auto tabular-nums ${days >= 14 ? "text-destructive" : days >= 7 ? "text-warning" : "text-muted-foreground"}`}>
                                      {days}d in stage
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
      {clientModal}
      <AlertDialog
        open={pendingTag !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTag(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply{" "}
              <span className="font-mono-data font-semibold text-foreground">
                {pendingTag?.tag}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {pendingTag?.displayName}
              </span>
              . This will trigger automation. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingTag) return;
                const p = pendingTag;
                setPendingTag(null);
                handleApplyTag(p.contactId, p.tag, p.displayName, {
                  clientName: p.clientName,
                  cycleMonth: p.cycleMonth,
                });
              }}
            >
              Apply tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon,
  tone,
  suffix,
  hint,
  tooltip,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "muted" | "primary" | "success" | "destructive";
  suffix?: string;
  hint?: string;
  tooltip?: React.ReactNode;
}) {
  const toneCls = {
    muted: "text-muted-foreground bg-muted",
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    destructive: "text-destructive bg-destructive/10",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`About ${label}`}
                  className="h-6 w-6 -m-1.5 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors duration-150 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={(e) => e.preventDefault()}
                >
                  <Info className="h-3 w-3" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-xs text-xs leading-relaxed">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${toneCls}`} aria-hidden>
          {icon}
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono-data tabular-nums">
        {value}
        {suffix && <span className="text-sm text-muted-foreground ml-0.5">{suffix}</span>}
      </p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

