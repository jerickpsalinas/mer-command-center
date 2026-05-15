import { useMemo, useState } from "react";
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
} from "lucide-react";
import { useSheetData } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";
import type { CycleEntry } from "@/services/googleSheets";
import { useClientDetails } from "@/hooks/useClientDetails";

/* ────────────────────────────────────────────────────────────────────────────
 * Pipeline 1 — Master Bookkeeping Cycle (8 canonical stages)
 * Source of truth: Brant & Associates Automation Blueprint v2.
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
          <TagIcon className="h-2.5 w-2.5" />
          {t}
        </span>
      ))}
    </div>
  );
}

export default function MasterCyclePage() {
  const { data, isLoading, error } = useSheetData();
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEscalated, setFilterEscalated] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStage, setFilterStage] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { open: openClient, modal: clientModal } = useClientDetails();

  const entries = data?.cycleEntries ?? [];

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
    grouped.sort(
      (a, b) => (Date.parse(b.latestTimestamp) || 0) - (Date.parse(a.latestTimestamp) || 0),
    );
    return grouped;
  }, [entries]);

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

  // Counts per canonical stage (current stage of each cycle)
  const stageCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const c of cycles) counts.set(c.currentStage, (counts.get(c.currentStage) ?? 0) + 1);
    return counts;
  }, [cycles]);

  const filtered = useMemo(() => {
    return cycles.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.clientName.toLowerCase().includes(q) &&
          !c.companyName.toLowerCase().includes(q)
        )
          return false;
      }
      if (filterMonth && c.month !== filterMonth) return false;
      if (filterStatus && c.cycleStatus !== filterStatus) return false;
      if (filterEscalated === "yes" && !c.escalated) return false;
      if (filterEscalated === "no" && c.escalated) return false;
      if (filterCategory && !c.categories.includes(filterCategory)) return false;
      if (filterStage !== null && c.currentStage !== filterStage) return false;
      return true;
    });
  }, [cycles, search, filterMonth, filterStatus, filterEscalated, filterCategory, filterStage]);

  // KPIs
  const totalCycles = cycles.length;
  const activeCycles = cycles.filter((c) => c.cycleStatus.toLowerCase() === "active").length;
  const completedCycles = cycles.filter(
    (c) => c.cycleStatus.toLowerCase() === "completed",
  ).length;
  const escalatedCycles = cycles.filter((c) => c.escalated).length;
  const avgDaysInStage = useMemo(() => {
    const active = cycles.filter((c) => c.cycleStatus.toLowerCase() === "active");
    if (active.length === 0) return 0;
    return Math.round(
      active.reduce((s, c) => s + (Number(c.daysInStage) || 0), 0) / active.length,
    );
  }, [cycles]);

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

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
    <div className="space-y-5">
      {/* KPI strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-3"
      >
        <KpiTile label="Total Cycles" value={totalCycles} icon={<Activity className="h-4 w-4" />} tone="muted" />
        <KpiTile label="Active" value={activeCycles} icon={<Clock className="h-4 w-4" />} tone="primary" />
        <KpiTile label="Completed" value={completedCycles} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <KpiTile label="Escalated" value={escalatedCycles} icon={<Flame className="h-4 w-4" />} tone="destructive" />
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
              onClick={() => setFilterStage(null)}
              className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 transition-colors"
            >
              <X className="h-3 w-3" />
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
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_0.6fr_0.6fr] gap-3">
              {GROUPS.map((g) => {
                const total = g.stages.reduce((sum, n) => sum + (stageCounts.get(n) ?? 0), 0);
                return (
                  <section
                    key={g.label}
                    className={`rounded-2xl border ${g.box} p-3`}
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
                              onClick={() => setFilterStage(selected ? null : num)}
                              aria-pressed={selected}
                              title={`${s.name} — ${s.who}${s.automove ? " · Automove ON" : ""}`}
                              className={`w-full text-left rounded-xl border p-3 transition-all ${
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
                                  className={`h-full ${tone.bar} transition-all`}
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
        className="flex flex-wrap items-center gap-3"
      >
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm w-72 shadow-card focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search client or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeFilters > 0 && (
            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
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
        ].map(({ value, setter, label, options, display }: any) => (
          <div key={label} className="relative">
            <select
              value={value}
              onChange={(e) => setter(e.target.value)}
              className={`appearance-none rounded-lg border bg-card pl-3 pr-8 py-2 text-sm cursor-pointer transition-colors ${
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
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        ))}
        {activeFilters > 0 && (
          <button
            onClick={clearAll}
            className="text-[12px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        )}
        <div className="ml-auto text-[12px] text-muted-foreground font-mono-data">
          {filtered.length} of {cycles.length} cycles
          {filterStage !== null && (
            <span className="ml-2 text-primary">
              · Stage {filterStage}: {STAGE_NAME_BY_NUM.get(filterStage)}
            </span>
          )}
        </div>
      </motion.div>

      {/* Cycle list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No cycles match the current filters.
          </div>
        )}
        {filtered.map((c, idx) => {
          const open = expanded === c.key;
          const tone = stageTone(c.currentStage);
          const stageMeta = PIPELINE_STAGES.find((s) => s.num === c.currentStage);
          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 + idx * 0.015 }}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(open ? null : c.key)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(open ? null : c.key); } }}
                className="w-full text-left p-4 lg:p-5 hover:bg-accent/30 transition-colors cursor-pointer"
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
                        onClick={(e) => { e.stopPropagation(); openClient(c.clientName); }}
                        className="text-[15px] font-semibold text-foreground break-words text-left hover:text-primary transition-colors"
                      >
                        {c.clientName}
                      </button>
                      {c.escalated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                          <AlertTriangle className="h-3 w-3" />
                          ESCALATED
                        </span>
                      )}
                    </div>
                    {c.companyName && (
                      <p className="text-[12px] text-muted-foreground mt-0.5 break-words">
                        {c.companyName}
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
                        <span className="text-foreground font-mono-data font-semibold tabular-nums">
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

                  <div className="flex items-center gap-3 shrink-0">
                    <StatusPill status={c.cycleStatus} />
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
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
              </button>

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
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
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
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Stage History
                      </h4>
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
                                    <span className="text-[10px] text-muted-foreground font-mono-data ml-auto tabular-nums">
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
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon,
  tone,
  suffix,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "muted" | "primary" | "success" | "destructive";
  suffix?: string;
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
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${toneCls}`}>
          {icon}
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono-data tabular-nums">
        {value}
        {suffix && <span className="text-sm text-muted-foreground ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}
