import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useClientDetails } from "@/hooks/useClientDetails";
import { useIsFetching } from "@tanstack/react-query";
import { useSheetData } from "@/hooks/useSheetData";
import { isCleanupTagString } from "@/lib/cleanupCycle";
import {
  computePillars,
  brokenConnections,
  cleanupBacklog,
  statementChase,
  workflowSkips,
  enforcementFlags,
  cleanupLeaderboard,
  pillarHistory,
  type PillarScore,
  type WatchlistItem,
} from "@/lib/healthPillars";
import { Skeleton } from "@/components/ui/skeleton";
import { DataError } from "@/components/DataStatus";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Minus, Search, ArrowRight,
  Banknote, FileSpreadsheet, FileText, Workflow as WorkflowIcon, LucideIcon,
  CheckCircle2, ShieldCheck, Users,
} from "lucide-react";

/* ---------------- Atoms ---------------- */

function Trend({ delta }: { delta: number }) {
  if (Math.abs(delta) < 1) {
    return (
      <span
        role="img"
        aria-label="Stable vs last month"
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        <Minus className="h-3 w-3" aria-hidden /> Stable
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      role="img"
      aria-label={`${up ? "Up" : "Down"} ${Math.abs(delta).toFixed(1)} percent vs last month`}
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold font-mono-data tabular-nums ${
        up ? "text-success" : "text-destructive"
      }`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
      {up ? "+" : ""}
      {delta.toFixed(1)}%
    </span>
  );
}

function EmptyState({ icon: Icon, title, hint, className = "" }: { icon: LucideIcon; title: string; hint: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-8 ${className}`}>
      <Icon className="h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}

/** Live data pulse — animates whenever react-query is refetching. */
function LivePulse() {
  const fetching = useIsFetching({ queryKey: ["sheet-data"] });
  const live = fetching > 0;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
      <span className="relative inline-flex h-1.5 w-1.5">
        {live && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${live ? "bg-success" : "bg-success/60"}`} />
      </span>
      {live ? "Syncing" : "Live"}
    </span>
  );
}

/* ---------------- Pillar tile (card style matching other tabs) ---------------- */

function PillarCard({
  index,
  pillar,
  history,
  icon: Icon,
  i,
}: {
  index: string;
  pillar: PillarScore;
  history: number[];
  icon: LucideIcon;
  i: number;
}) {
  const delta = history.length >= 2 ? history[history.length - 1] - history[history.length - 2] : 0;
  const tone = pillar.pct >= 90 ? "success" : pillar.pct >= 70 ? "warning" : "destructive";
  const toneClasses = {
    success: { text: "text-success", bg: "bg-success/10", ring: "border-success/20" },
    warning: { text: "text-warning", bg: "bg-warning/10", ring: "border-warning/20" },
    destructive: { text: "text-destructive", bg: "bg-destructive/10", ring: "border-destructive/20" },
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: i * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
      className={`group rounded-xl border bg-card p-5 density-card shadow-card hover:shadow-card-hover transition-[box-shadow,border-color] duration-300 ${toneClasses.ring}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
          Pillar {index}
        </span>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${toneClasses.bg} ${toneClasses.text} transition-transform duration-300 group-hover:scale-105`}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>

      <h3 className="font-serif italic text-primary text-lg sm:text-xl leading-tight mb-3 break-words text-balance">
        {pillar.label}
      </h3>

      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="font-mono-data tabular-nums text-foreground tracking-tighter leading-none" aria-label={`${pillar.pct} percent`}>
          <span className="text-5xl">{pillar.pct}</span>
          <span className="text-xl text-primary/60">%</span>
        </div>
        <Trend delta={delta} />
      </div>

      {/* Live status block (replaces the bar) */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Passing</p>
          <p className="text-sm font-mono-data tabular-nums text-success">{pillar.passing}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Failing</p>
          <p className={`text-sm font-mono-data tabular-nums ${pillar.failing > 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {pillar.failing}
          </p>
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <LivePulse />
      </div>
    </motion.div>
  );
}

/* ---------------- Watchlist (interactive) ---------------- */

type SortKey = "severity" | "name" | "bookkeeper";

function Watchlist({
  title,
  subtitle,
  items,
  emptyLabel,
  icon: Icon,
  i,
  onOpen,
}: {
  title: string;
  subtitle: string;
  items: WatchlistItem[];
  emptyLabel: string;
  icon: LucideIcon;
  i: number;
  onOpen: (name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("severity");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter(
        (it) =>
          it.client.name.toLowerCase().includes(q) ||
          (it.client.bookkeeper || "").toLowerCase().includes(q) ||
          it.primary.toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sort === "name") {
      sorted.sort((a, b) => a.client.name.localeCompare(b.client.name));
    } else if (sort === "bookkeeper") {
      sorted.sort((a, b) => (a.client.bookkeeper || "").localeCompare(b.client.bookkeeper || ""));
    }
    // severity = preserves source order (already severity-sorted in lib helpers)
    return sorted;
  }, [items, search, sort]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: i * 0.05 }}
      className="rounded-xl border border-border bg-card p-5 density-card shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-primary shrink-0" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground truncate" title={title}>{title}</h3>
        </div>
        <span className="font-mono-data text-2xl text-foreground tabular-nums leading-none shrink-0" aria-label={`${items.length} items`}>
          {items.length.toString().padStart(2, "0")}
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-primary/60 mb-3">
        {items.length === 0 ? emptyLabel : subtitle}
      </p>

      {/* Controls */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 min-h-[40px] text-xs flex-1 min-w-0 focus-within:ring-2 focus-within:ring-ring transition-colors duration-150">
            <Search className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={`Search ${title}`}
              className="bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground w-full min-w-0"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-border bg-background px-1.5 min-h-[40px] text-[11px] font-medium text-foreground shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Sort ${title}`}
          >
            <option value="severity">Severity</option>
            <option value="name">Name</option>
            <option value="bookkeeper">Bookkeeper</option>
          </select>
        </div>
      )}

      <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1 -mr-1 flex-1 min-w-0">
        {items.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All clear" hint="No clients in this queue right now" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="No matches" hint="Try a different search term" />
        ) : (
          filtered.map((it) => (
            <button
              key={it.client.id + it.client.name}
              type="button"
              onClick={() => onOpen(it.client.name)}
              aria-label={`Open ${it.client.name}`}
              className="w-full text-left block rounded-md px-2 py-2 min-h-[40px] -mx-2 hover:bg-accent transition-colors duration-150 group/row border-b border-border/40 last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <div className="flex justify-between gap-2 items-baseline">
                <span className="text-xs text-foreground/90 font-medium truncate min-w-0 flex-1 group-hover/row:text-primary transition-colors duration-150" title={it.client.name}>
                  {it.client.name}
                </span>
                <span className="text-primary tabular-nums shrink-0 text-[11px] font-mono-data">
                  {it.primary}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-[10px] text-muted-foreground break-words min-w-0 flex-1">
                  {it.detail}
                </p>
                <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover/row:text-primary group-hover/row:translate-x-0.5 transition-all duration-150 shrink-0" aria-hidden />
              </div>
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
}

/* ---------------- Page ---------------- */

export default function HealthPillarsPage() {
  const { data, isLoading, error, refetch, isFetching } = useSheetData();
  const { open: openClient, modal: clientModal } = useClientDetails();

  const view = useMemo(() => {
    if (!data) return null;
    // Exclude cleanup-cycle clients — these pillars measure the regular MER cycle.
    const clients = data.clients.filter((c) => !isCleanupTagString(c.categoryTags, c.status));
    const merHistory = data.merHistory.filter(
      (r) => !isCleanupTagString(r.categoryTags, r.status),
    );
    const pillars = computePillars(clients);
    return {
      pillars,
      sparks: {
        bankFeed: pillarHistory(merHistory, "bankFeed").map((p) => p.pct),
        categorization: pillarHistory(merHistory, "categorization").map((p) => p.pct),
        statements: pillarHistory(merHistory, "statements").map((p) => p.pct),
        workflow: pillarHistory(merHistory, "workflow").map((p) => p.pct),
      },
      watchlists: {
        broken: brokenConnections(clients),
        cleanup: cleanupBacklog(clients),
        statements: statementChase(clients),
        workflow: workflowSkips(clients),
      },
      flags: enforcementFlags(clients),
      leaderboard: cleanupLeaderboard(clients),
      clients,
    };
  }, [data]);

  if (error && !view) {
    return <DataError message={error.message} onRetry={() => refetch()} isRetrying={isFetching} />;
  }

  if (isLoading || !view) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading compliance health pillars…</span>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-border">
          <div className="space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="space-y-2 sm:items-end sm:flex sm:flex-col">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        {/* Pillar tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-12 w-24" />
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            </div>
          ))}
        </div>
        {/* Watchlists */}
        <div className="space-y-4">
          <Skeleton className="h-7 w-56" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-8" />
                </div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
                {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-10 w-full" />)}
              </div>
            ))}
          </div>
        </div>
        {/* Flags + Registry */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Skeleton className="lg:col-span-7 h-[280px] rounded-xl" />
          <Skeleton className="lg:col-span-5 h-[280px] rounded-xl" />
        </div>
      </div>
    );
  }

  const { pillars, sparks, watchlists, flags, leaderboard } = view;
  const compositeDelta = (() => {
    // Average this-month vs last-month across ALL four pillars, not just Bank Feed.
    const series = [sparks.bankFeed, sparks.categorization, sparks.statements, sparks.workflow];
    const deltas = series
      .filter((s) => s.length >= 2)
      .map((s) => s[s.length - 1] - s[s.length - 2]);
    if (deltas.length === 0) return 0;
    return deltas.reduce((a, b) => a + b, 0) / deltas.length;
  })();

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-border"
      >
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-medium mb-2">
            Compliance Health · Internal MER Ledger
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground text-balance">
            Compliance Health Pillars
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl text-pretty">
            Four targeted health pillars derived live from the MER ledger. Click any client to open it
            in the Clients view.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Composite</span>
          <span className="font-mono-data text-4xl text-foreground tabular-nums leading-none" aria-label={`Composite score ${pillars.composite} percent`}>
            {pillars.composite}%
          </span>
          <Trend delta={compositeDelta} />
        </div>
      </motion.header>

      {/* Pillars — rearranged: chase-heavy & connectivity first */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Health pillars">
        <PillarCard index="I"   pillar={pillars.bankFeed}       history={sparks.bankFeed}       icon={Banknote}        i={0} />
        <PillarCard index="II"  pillar={pillars.statements}     history={sparks.statements}     icon={FileText}        i={1} />
        <PillarCard index="III" pillar={pillars.categorization} history={sparks.categorization} icon={FileSpreadsheet} i={2} />
        <PillarCard index="IV"  pillar={pillars.workflow}       history={sparks.workflow}       icon={WorkflowIcon}    i={3} />
      </section>

      {/* Watchlists */}
      <section>
        <div className="flex items-baseline justify-between mb-4 gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Targeted Watchlists</h2>
            <p className="text-sm text-muted-foreground mt-1">Clients needing action in each pillar</p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hidden sm:inline shrink-0">
            Search · Sort · Open Client
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Watchlist
            title="Broken Connections"
            subtitle="Requires Re-auth"
            items={watchlists.broken}
            emptyLabel="All Feeds Live"
            icon={Banknote}
            i={0}
            onOpen={openClient}
          />
          <Watchlist
            title="Cleanup Backlog"
            subtitle="Items in Queue"
            items={watchlists.cleanup}
            emptyLabel="Nothing to Clean"
            icon={FileSpreadsheet}
            i={1}
            onOpen={openClient}
          />
          <Watchlist
            title="Statement Chase Queue"
            subtitle="Awaiting Receipt"
            items={watchlists.statements}
            emptyLabel="All Statements In"
            icon={FileText}
            i={2}
            onOpen={openClient}
          />
          <Watchlist
            title="Workflow Skips"
            subtitle="Steps Outstanding"
            items={watchlists.workflow}
            emptyLabel="Workflow Clean"
            icon={WorkflowIcon}
            i={3}
            onOpen={openClient}
          />
        </div>
      </section>

      {/* Enforcement Flags & Bookkeeper Registry */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-7 rounded-xl border border-border bg-card p-5 density-card shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
            <h3 className="text-sm font-semibold text-foreground">Process Enforcement Flags</h3>
            <span className="ml-auto text-[11px] text-muted-foreground font-mono-data tabular-nums">
              {flags.length} flagged
            </span>
          </div>
          {flags.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No process violations" hint="Every client is following the MER workflow" />
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1 min-w-0">
              {flags.map((f, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => openClient(f.client.name)}
                    aria-label={`Open ${f.client.name}`}
                    className="w-full text-left flex items-start gap-3 text-sm min-h-[40px] border-b border-border/40 pb-2 last:border-0 hover:bg-accent rounded-md px-2 py-1.5 -mx-2 transition-colors duration-150 group/row focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate max-w-full group-hover/row:text-primary transition-colors duration-150" title={f.client.name}>
                          {f.client.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-destructive">
                          {f.type.replace(/-/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">{f.message}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="lg:col-span-5 rounded-xl border border-border bg-card p-5 density-card shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Bookkeeper Registry</h3>
          {leaderboard.length === 0 ? (
            <EmptyState icon={Users} title="No bookkeepers yet" hint="The registry fills in once clients are assigned" />
          ) : (
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 min-w-0">
              {leaderboard.map((row, i) => (
                <div
                  key={row.bookkeeper}
                  className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0 rounded-md hover:bg-accent/30 transition-colors duration-150 -mx-1 px-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono-data text-primary/60 text-xs tabular-nums w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="size-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px] text-primary shrink-0" aria-hidden>
                      {row.bookkeeper.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate" title={row.bookkeeper}>{row.bookkeeper}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {row.cleanClients}/{row.totalClients} clean · {row.cleanupBacklog} backlog
                      </p>
                    </div>
                  </div>
                  <span className="font-mono-data tabular-nums text-sm text-primary font-semibold shrink-0">
                    {row.efficiencyPct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-4 flex flex-col sm:flex-row sm:justify-between gap-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        <span className="tabular-nums">Derived live from MER columns · {view.clients.length} active clients</span>
        <Link to="/" className="inline-flex items-center min-h-[40px] sm:min-h-0 text-primary/70 hover:text-primary transition-colors duration-150 normal-case tracking-normal rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Back to Dashboard
        </Link>
      </footer>
      {clientModal}
    </div>
  );
}
