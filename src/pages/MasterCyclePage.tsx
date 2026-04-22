import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, ChevronDown, AlertTriangle, CheckCircle2, Clock, Activity, Flame } from "lucide-react";
import { useSheetData } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";
import StatusBadge from "@/components/StatusBadge";
import type { CycleEntry } from "@/services/googleSheets";

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

function StageDot({ active, current }: { active: boolean; current: boolean }) {
  return (
    <div
      className={`h-2 w-2 rounded-full transition-all ${
        current ? "bg-primary ring-4 ring-primary/20" : active ? "bg-primary/70" : "bg-muted"
      }`}
    />
  );
}

export default function MasterCyclePage() {
  const { data, isLoading, error } = useSheetData();
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEscalated, setFilterEscalated] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

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
    // For each cycle, sort entries by stage number (timeline order)
    const grouped = Array.from(map.entries()).map(([key, items]) => {
      const sorted = [...items].sort((a, b) => a.stageNumber - b.stageNumber);
      const latest = [...items].sort(
        (a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0)
      )[0];
      return {
        key,
        clientName: latest.clientName,
        companyName: latest.companyName,
        clientEmail: latest.clientEmail,
        month: latest.month,
        cycleStatus: latest.cycleStatus,
        currentStage: latest.stageNumber,
        currentStageName: latest.stageName,
        daysInStage: latest.daysInStage,
        escalated: items.some((i) => i.escalated),
        entries: sorted,
        latestTimestamp: latest.timestamp,
      };
    });
    // Sort cycles by latest timestamp desc
    grouped.sort(
      (a, b) =>
        (Date.parse(b.latestTimestamp) || 0) - (Date.parse(a.latestTimestamp) || 0)
    );
    return grouped;
  }, [entries]);

  const months = useMemo(
    () => Array.from(new Set(cycles.map((c) => c.month).filter(Boolean))),
    [cycles]
  );
  const statuses = useMemo(
    () => Array.from(new Set(cycles.map((c) => c.cycleStatus).filter(Boolean))),
    [cycles]
  );

  // Determine the maximum stage number across the dataset, so the timeline scales.
  const maxStage = useMemo(
    () => entries.reduce((m, e) => Math.max(m, e.stageNumber), 0) || 1,
    [entries]
  );

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
      return true;
    });
  }, [cycles, search, filterMonth, filterStatus, filterEscalated]);

  // KPIs
  const totalCycles = cycles.length;
  const activeCycles = cycles.filter((c) => c.cycleStatus.toLowerCase() === "active").length;
  const completedCycles = cycles.filter(
    (c) => c.cycleStatus.toLowerCase() === "completed"
  ).length;
  const escalatedCycles = cycles.filter((c) => c.escalated).length;

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  const activeFilters = [filterMonth, filterStatus, filterEscalated].filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <KpiTile
          label="Total Cycles"
          value={totalCycles}
          icon={<Activity className="h-4 w-4" />}
          tone="muted"
        />
        <KpiTile
          label="Active"
          value={activeCycles}
          icon={<Clock className="h-4 w-4" />}
          tone="primary"
        />
        <KpiTile
          label="Completed"
          value={completedCycles}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
        <KpiTile
          label="Escalated"
          value={escalatedCycles}
          icon={<Flame className="h-4 w-4" />}
          tone="destructive"
        />
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
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
        <div className="ml-auto text-[12px] text-muted-foreground font-mono-data">
          {filtered.length} of {cycles.length} cycles
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
          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + idx * 0.02 }}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
            >
              <button
                onClick={() => setExpanded(open ? null : c.key)}
                className="w-full text-left p-4 lg:p-5 hover:bg-accent/30 transition-colors"
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-foreground break-words">
                        {c.clientName}
                      </h3>
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
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span className="font-mono-data">{c.month}</span>
                      <span>·</span>
                      <span>
                        Stage{" "}
                        <span className="text-foreground font-semibold">
                          {c.currentStage}
                        </span>
                        : {c.currentStageName}
                      </span>
                      <span>·</span>
                      <span>
                        <span className="text-foreground font-mono-data font-semibold">
                          {c.daysInStage}
                        </span>{" "}
                        day{c.daysInStage === 1 ? "" : "s"} in stage
                      </span>
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

                {/* Stage timeline */}
                <div className="mt-4 flex items-center gap-1.5">
                  {Array.from({ length: maxStage }).map((_, i) => {
                    const stageNum = i + 1;
                    const reached = c.entries.some((e) => e.stageNumber === stageNum);
                    const current = stageNum === c.currentStage;
                    return (
                      <div key={stageNum} className="flex items-center gap-1.5 flex-1">
                        <StageDot active={reached} current={current} />
                        {i < maxStage - 1 && (
                          <div
                            className={`h-px flex-1 ${
                              reached && c.entries.some((e) => e.stageNumber > stageNum)
                                ? "bg-primary/40"
                                : "bg-border"
                            }`}
                          />
                        )}
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
                  <div className="p-4 lg:p-5 space-y-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12px]">
                      {c.clientEmail && (
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span className="text-foreground font-mono-data break-all">
                            {c.clientEmail}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Stage History
                      </h4>
                      <div className="space-y-2">
                        {c.entries.map((e) => (
                          <div
                            key={e.id}
                            className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-3"
                          >
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                                {e.stageNumber}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-foreground">
                                  {e.stageName}
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
                                {e.categoryTags && e.categoryTags !== "None" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono-data">
                                    {e.categoryTags}
                                  </span>
                                )}
                                {e.escalated && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-semibold">
                                    Escalated
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground font-mono-data ml-auto">
                                  {e.daysInStage}d in stage
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
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
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "muted" | "primary" | "success" | "destructive";
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
      </p>
    </div>
  );
}
