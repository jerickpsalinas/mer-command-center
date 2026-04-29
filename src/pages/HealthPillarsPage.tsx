import { useMemo } from "react";
import { Link } from "react-router-dom";
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
  clientDots,
  type PillarScore,
  type WatchlistItem,
} from "@/lib/healthPillars";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Frame, Minus } from "lucide-react";

/* ---------------- Visual atoms ---------------- */

function Sparkline({ values, className = "" }: { values: number[]; className?: string }) {
  if (values.length === 0) {
    return <div className={`h-10 ${className}`} />;
  }
  const max = Math.max(...values, 1);
  return (
    <div className={`flex items-end gap-1 h-10 ${className}`}>
      {values.map((v, i) => (
        <div
          key={i}
          className="w-2 bg-primary/40 rounded-[1px] transition-[height]"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function Trend({ delta }: { delta: number }) {
  if (Math.abs(delta) < 1) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Minus className="h-3 w-3" /> Stable
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-tighter italic ${
        up ? "text-success" : "text-destructive"
      }`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}
      {delta.toFixed(1)}%
    </span>
  );
}

/** Rose-gold framed card — the Atelier signature. */
function Frame_({
  children,
  className = "",
  spotlight = false,
}: {
  children: React.ReactNode;
  className?: string;
  spotlight?: boolean;
}) {
  return (
    <div
      className={`relative bg-card/40 group transition-transform duration-500 hover:-translate-y-0.5 ${className}`}
      style={{
        outline: "1px solid hsl(var(--primary) / 0.5)",
        outlineOffset: "-1px",
        boxShadow: "0 25px 50px -12px hsl(var(--background) / 0.6), inset 0 0 0 4px hsl(var(--background) / 0.4)",
      }}
    >
      {spotlight && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, hsl(var(--primary) / 0.08) 0%, transparent 70%)",
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

/* ---------------- Pillar tile ---------------- */

function PillarFrame({
  index,
  pillar,
  history,
  large = false,
}: {
  index: string;
  pillar: PillarScore;
  history: number[];
  large?: boolean;
}) {
  const delta =
    history.length >= 2 ? history[history.length - 1] - history[history.length - 2] : 0;

  return (
    <Frame_ spotlight className={large ? "p-6 sm:p-10 h-full" : "p-6 sm:p-8 h-full"}>
      <div className="flex flex-col h-full">
        <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
          Pillar {index}
        </span>
        <h2
          className={`font-serif italic text-primary leading-tight mb-4 break-words ${
            large ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"
          }`}
        >
          {pillar.label}
        </h2>

        <div className="mt-auto">
          <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
            <div className="tabular-nums font-serif text-foreground tracking-tighter leading-none">
              <span className={large ? "text-6xl sm:text-7xl" : "text-4xl sm:text-5xl"}>
                {pillar.pct}
              </span>
              <span className="text-2xl text-primary/60">%</span>
            </div>
            <div className="text-right space-y-1">
              <Trend delta={delta} />
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums">
                {pillar.passing}/{pillar.total} passing
              </div>
            </div>
          </div>

          <div className="border-t border-primary/10 pt-4">
            <Sparkline values={history.length ? history : [pillar.pct]} />
          </div>
        </div>
      </div>
    </Frame_>
  );
}

/* ---------------- Watchlist gallery card ---------------- */

function WatchlistFrame({
  title,
  items,
  emptyLabel,
  unit,
}: {
  title: string;
  items: WatchlistItem[];
  emptyLabel: string;
  unit: string;
}) {
  return (
    <div className="border border-primary/15 bg-card/30 backdrop-blur-sm p-5 sm:p-6 rounded-sm hover:border-primary/40 transition-colors">
      <div className="flex items-baseline justify-between mb-4 gap-2">
        <h3 className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
          {title}
        </h3>
        <span className="font-serif text-2xl sm:text-3xl text-foreground tabular-nums leading-none">
          {items.length.toString().padStart(2, "0")}
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-primary/60 mb-4">
        {items.length === 0 ? emptyLabel : unit}
      </p>
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">All clear in this queue.</p>
        ) : (
          items.slice(0, 8).map((it) => (
            <div
              key={it.client.id + it.client.name}
              className="text-xs border-b border-primary/5 pb-2 last:border-0 last:pb-0"
            >
              <div className="flex justify-between gap-2 items-baseline">
                <span className="text-foreground/90 font-medium break-words min-w-0 flex-1">
                  {it.client.name}
                </span>
                <span className="text-primary tabular-nums shrink-0 text-[11px]">
                  {it.primary}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 break-words">{it.detail}</p>
            </div>
          ))
        )}
        {items.length > 8 && (
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground pt-2">
            +{items.length - 8} more
          </p>
        )}
      </div>
    </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="h-[420px] lg:col-span-7" />
          <div className="lg:col-span-5 space-y-6">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
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
    <div className="space-y-12 max-w-[1400px] mx-auto">
      {/* Header — Curator's perspective */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 border-b border-primary/10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-medium mb-2">
            Compliance Salon · Internal MER Ledger
          </p>
          <h1 className="font-serif italic text-3xl sm:text-4xl text-primary tracking-tight text-balance">
            Compliance Health Pillars
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl text-pretty">
            Four targeted health pillars, derived live from the MER ledger — replacing the single
            aggregate compliance flag with actionable, separately-trending diagnostics.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Composite
          </span>
          <span className="font-serif text-4xl text-foreground tabular-nums">
            {pillars.composite}%
          </span>
          <Trend delta={compositeDelta} />
        </div>
      </header>

      {/* Pillar gallery — asymmetric salon arrangement */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <div className="lg:col-span-7 lg:row-span-2">
          <PillarFrame index="I" pillar={pillars.bankFeed} history={sparks.bankFeed} large />
        </div>
        <div className="lg:col-span-5">
          <PillarFrame index="II" pillar={pillars.categorization} history={sparks.categorization} />
        </div>
        <div className="lg:col-span-5">
          <PillarFrame index="III" pillar={pillars.statements} history={sparks.statements} />
        </div>
        <div className="lg:col-span-12">
          <PillarFrame index="IV" pillar={pillars.workflow} history={sparks.workflow} />
        </div>
      </section>

      {/* Watchlists — sketched risks */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-serif italic text-2xl sm:text-3xl text-primary">
            Watchlists & Sketched Risks
          </h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hidden sm:inline">
            Targeted Action Queues
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <WatchlistFrame
            title="Broken Connections"
            items={watchlists.broken}
            emptyLabel="All Feeds Live"
            unit="Requires Re-auth"
          />
          <WatchlistFrame
            title="Cleanup Backlog"
            items={watchlists.cleanup}
            emptyLabel="Nothing to Clean"
            unit="Items in Queue"
          />
          <WatchlistFrame
            title="Statement Chase"
            items={watchlists.statements}
            emptyLabel="All Statements In"
            unit="Awaiting Receipt"
          />
          <WatchlistFrame
            title="Workflow Skips"
            items={watchlists.workflow}
            emptyLabel="Workflow Clean"
            unit="Steps Outstanding"
          />
        </div>
      </section>

      {/* Lower row — Enforcement Flags & Bookkeeper Registry */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <Frame_ className="lg:col-span-7 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Frame className="h-4 w-4 text-primary" />
            <h3 className="font-serif italic text-xl sm:text-2xl text-primary">
              Process Enforcement Flags
            </h3>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {flags.length} flagged
            </span>
          </div>
          {flags.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              No process violations detected. The atelier is in order.
            </p>
          ) : (
            <ul className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {flags.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm border-b border-primary/5 pb-3 last:border-0"
                >
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 flex-wrap">
                      <span className="font-medium text-foreground break-words">
                        {f.client.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-destructive">
                        {f.type.replace(/-/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 break-words">{f.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Frame_>

        <Frame_ className="lg:col-span-5 p-6 sm:p-8">
          <h3 className="font-serif italic text-xl sm:text-2xl text-primary mb-6">
            Bookkeeper Registry
          </h3>
          <div className="space-y-4">
            {leaderboard.map((row, i) => (
              <div
                key={row.bookkeeper}
                className="flex items-center justify-between gap-3 border-b border-primary/5 pb-3 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-serif italic text-primary/60 text-sm tabular-nums w-6 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="size-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px] text-primary shrink-0">
                    {row.bookkeeper.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {row.bookkeeper}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {row.cleanClients}/{row.totalClients} clean · {row.cleanupBacklog} backlog
                    </p>
                  </div>
                </div>
                <span className="tabular-nums text-sm text-primary font-medium shrink-0">
                  {row.efficiencyPct}%
                </span>
              </div>
            ))}
          </div>
        </Frame_>
      </section>

      {/* Footer note + legend */}
      <footer className="border-t border-primary/10 pt-6 flex flex-col sm:flex-row sm:justify-between gap-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        <span>
          Derived live from MER columns · {view.clients.length} active clients
        </span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" /> Passing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-destructive" /> Failing
          </span>
          <Link to="/" className="text-primary/70 hover:text-primary transition-colors normal-case tracking-normal">
            Back to Dashboard
          </Link>
        </span>
      </footer>
    </div>
  );
}
