import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useIsFetching } from "@tanstack/react-query";
import { useSheetData } from "@/hooks/useSheetData";
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
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Minus, Search, ArrowRight,
  Banknote, FileSpreadsheet, FileText, Workflow as WorkflowIcon, LucideIcon,
} from "lucide-react";

/* ---------------- Atoms ---------------- */

function Trend({ delta }: { delta: number }) {
  if (Math.abs(delta) < 1) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Minus className="h-3 w-3" /> Stable
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold ${
        up ? "text-success" : "text-destructive"
      }`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}
      {delta.toFixed(1)}%
    </span>
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
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <h2 className="font-serif italic text-primary text-lg sm:text-xl leading-tight mb-3 break-words text-balance">
        {pillar.label}
      </h2>

      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="tabular-nums font-serif text-foreground tracking-tighter leading-none">
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
}: {
  title: string;
  subtitle: string;
  items: WatchlistItem[];
  emptyLabel: string;
  icon: LucideIcon;
  i: number;
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
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
        </div>
        <span className="font-serif text-2xl text-foreground tabular-nums leading-none shrink-0">
          {items.length.toString().padStart(2, "0")}
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-primary/60 mb-3">
        {items.length === 0 ? emptyLabel : subtitle}
      </p>

      {/* Controls */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs flex-1 min-w-0">
            <Search className="h-3 w-3 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground w-full min-w-0"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-border bg-background px-1.5 py-1 text-[11px] font-medium text-foreground shrink-0"
            aria-label="Sort watchlist"
          >
            <option value="severity">Severity</option>
            <option value="name">Name</option>
            <option value="bookkeeper">Bookkeeper</option>
          </select>
        </div>
      )}

      <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1 -mr-1 flex-1">
        {items.length === 0 ? (
          <p className="text-xs italic text-muted-foreground py-4 text-center">All clear in this queue.</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs italic text-muted-foreground py-4 text-center">No matches.</p>
        ) : (
          filtered.map((it) => (
            <Link
              key={it.client.id + it.client.name}
              to={`/clients?search=${encodeURIComponent(it.client.name)}`}
              className="block rounded-md px-2 py-2 -mx-2 hover:bg-accent transition-colors group/row border-b border-border/40 last:border-0"
            >
              <div className="flex justify-between gap-2 items-baseline">
                <span className="text-xs text-foreground/90 font-medium break-words min-w-0 flex-1 group-hover/row:text-primary transition-colors">
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
                <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover/row:text-primary group-hover/row:translate-x-0.5 transition-all shrink-0" />
              </div>
            </Link>
          ))
        )}
      </div>
    </motion.div>
  );
}

/* ---------------- Page ---------------- */

export default function HealthPillarsPage() {
  const { data, isLoading } = useSheetData();

  const view = useMemo(() => {
    if (!data) return null;
    const { clients, merHistory } = data;
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

  if (isLoading || !view) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      </div>
    );
  }

  const { pillars, sparks, watchlists, flags, leaderboard } = view;
  const compositeDelta = (() => {
    const all = sparks.bankFeed;
    if (all.length < 2) return 0;
    return all[all.length - 1] - all[all.length - 2];
  })();

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5 border-b border-border"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-medium mb-2">
            Compliance Salon · Internal MER Ledger
          </p>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-primary tracking-tight text-balance">
            Compliance Health Pillars
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl text-pretty">
            Four targeted health pillars derived live from the MER ledger. Click any client to open it
            in the Clients view.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Composite</span>
          <span className="font-serif text-4xl text-foreground tabular-nums leading-none">
            {pillars.composite}%
          </span>
          <Trend delta={compositeDelta} />
        </div>
      </motion.header>

      {/* Pillars — rearranged: chase-heavy & connectivity first */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PillarCard index="I"   pillar={pillars.bankFeed}       history={sparks.bankFeed}       icon={Banknote}        i={0} />
        <PillarCard index="II"  pillar={pillars.statements}     history={sparks.statements}     icon={FileText}        i={1} />
        <PillarCard index="III" pillar={pillars.categorization} history={sparks.categorization} icon={FileSpreadsheet} i={2} />
        <PillarCard index="IV"  pillar={pillars.workflow}       history={sparks.workflow}       icon={WorkflowIcon}    i={3} />
      </section>

      {/* Watchlists */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif italic text-2xl text-primary">Targeted Watchlists</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hidden sm:inline">
            Search · Sort · Open Client
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Watchlist
            title="Broken Connections"
            subtitle="Requires Re-auth"
            items={watchlists.broken}
            emptyLabel="All Feeds Live"
            icon={Banknote}
            i={0}
          />
          <Watchlist
            title="Cleanup Backlog"
            subtitle="Items in Queue"
            items={watchlists.cleanup}
            emptyLabel="Nothing to Clean"
            icon={FileSpreadsheet}
            i={1}
          />
          <Watchlist
            title="Statement Chase Queue"
            subtitle="Awaiting Receipt"
            items={watchlists.statements}
            emptyLabel="All Statements In"
            icon={FileText}
            i={2}
          />
          <Watchlist
            title="Workflow Skips"
            subtitle="Steps Outstanding"
            items={watchlists.workflow}
            emptyLabel="Workflow Clean"
            icon={WorkflowIcon}
            i={3}
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
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold text-foreground">Process Enforcement Flags</h3>
            <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
              {flags.length} flagged
            </span>
          </div>
          {flags.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              No process violations detected.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {flags.map((f, i) => (
                <li key={i}>
                  <Link
                    to={`/clients?search=${encodeURIComponent(f.client.name)}`}
                    className="flex items-start gap-3 text-sm border-b border-border/40 pb-2 last:border-0 hover:bg-accent rounded-md px-2 py-1.5 -mx-2 transition-colors group/row"
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="font-medium text-foreground break-words group-hover/row:text-primary transition-colors">
                          {f.client.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-destructive">
                          {f.type.replace(/-/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">{f.message}</p>
                    </div>
                  </Link>
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
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {leaderboard.map((row, i) => (
              <div
                key={row.bookkeeper}
                className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-serif italic text-primary/60 text-xs tabular-nums w-6 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="size-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px] text-primary shrink-0">
                    {row.bookkeeper.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{row.bookkeeper}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {row.cleanClients}/{row.totalClients} clean · {row.cleanupBacklog} backlog
                    </p>
                  </div>
                </div>
                <span className="tabular-nums text-sm text-primary font-semibold shrink-0">
                  {row.efficiencyPct}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-4 flex flex-col sm:flex-row sm:justify-between gap-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        <span>Derived live from MER columns · {view.clients.length} active clients</span>
        <Link to="/" className="text-primary/70 hover:text-primary transition-colors normal-case tracking-normal">
          Back to Dashboard
        </Link>
      </footer>
    </div>
  );
}
