import StatusBadge from "@/components/StatusBadge";
import StickyPageHeader from "@/components/StickyPageHeader";
import ClientSparkline from "@/components/ClientSparkline";
import SwipeableCard from "@/components/SwipeableCard";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, AlertTriangle, ArrowUpDown, BarChart3, History, TrendingUp, Bookmark, BookmarkPlus, X, Filter, ArrowUp, ArrowDown, Minus, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSheetData, getClientHistory, getClientsForMonth } from "@/hooks/useSheetData";
import MonthFilter from "@/components/MonthFilter";
import { useUserSettings, type SavedFilter } from "@/hooks/useUserSettings";
import { DataLoading, DataError } from "@/components/DataStatus";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { diffClientMonths } from "@/lib/insights";
import { toast } from "@/hooks/use-toast";
import ClientDetailsModal from "@/components/ClientDetailsModal";
import { getSequenceInfoForClient } from "@/utils/sequenceStatus";
import { Tooltip as UTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SortKey = "name" | "completionPct" | "complianceStatus" | "uncategorizedTransactions";
type SortDir = "asc" | "desc";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg border border-border bg-card shadow-elevated text-foreground">
      <p className="text-xs font-semibold mb-0.5">{payload[0]?.payload?.full || label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[11px] text-muted-foreground">
          {p.name}: <span className="font-mono-data font-semibold text-foreground">{p.value}%</span>
        </p>
      ))}
    </div>
  );
};

function getIssueDetails(c: { uncategorizedTransactions: number; bankTransactions: string; unappliedPayments: number; prevMonthNotesApproved: boolean }) {
  const issues: string[] = [];
  if (c.uncategorizedTransactions > 0) issues.push(`${c.uncategorizedTransactions} uncategorized txns`);
  if (c.bankTransactions.includes("Missing")) issues.push("Missing bank statements");
  if (c.unappliedPayments > 0) issues.push(`${c.unappliedPayments} unapplied payments`);
  if (!c.prevMonthNotesApproved) issues.push("Notes not approved");
  return issues;
}

export default function ClientsPage() {
  const { data, isLoading, error } = useSheetData();
  const { savedFilters, saveFilter, deleteFilter } = useUserSettings();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<SavedFilter["status"]>("all");

  // Sync ?search= on first mount / when URL changes externally (e.g. from Compliance Health links)
  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null && q !== search) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [bookkeeperFilter, setBookkeeperFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [minCompletion, setMinCompletion] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("completionPct");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [historyClient, setHistoryClient] = useState<string | null>(null);
  const [detailsClient, setDetailsClient] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("current");
  const [sequenceFilter, setSequenceFilter] = useState<"all" | "active" | "resolved" | "approved">("all");

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  // Snapshot of clients for the chosen month (or live latest)
  const isLatest = monthFilter === "current";
  const monthClients = isLatest ? data.clients : getClientsForMonth(data.merHistory, monthFilter);

  const history = historyClient ? getClientHistory(data.merHistory, historyClient) : [];
  const monthDiff = history.length >= 2 ? diffClientMonths(history[history.length - 2], history[history.length - 1]) : [];

  // Latest MerHistoryRow for the selected details client (carries month + submission meta).
  // Use a normalized (trim + lowercase) match so cards always open even when the snapshot
  // name has different whitespace/casing from the historical rows.
  const detailsRow = (() => {
    if (!detailsClient) return null;
    const norm = (s: string) => s.trim().toLowerCase();
    const target = norm(detailsClient);
    const rows = data.merHistory.filter((r) => norm(r.name) === target);
    if (rows.length === 0) {
      // Fallback: synthesize a minimal row from the current month snapshot so the modal
      // still opens with whatever info we have, instead of silently doing nothing.
      const snap = monthClients.find((c) => norm(c.name) === target);
      return snap ? (snap as unknown as typeof data.merHistory[number]) : null;
    }
    return rows.reduce((latest, r) => (r.timestampMs >= latest.timestampMs ? r : latest), rows[0]);
  })();

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "completionPct" ? "asc" : "desc"); }
  };

  const filtered = monthClients
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => statusFilter === "all" || c.complianceStatus === statusFilter)
    .filter((c) => !bookkeeperFilter || c.bookkeeper === bookkeeperFilter)
    .filter((c) => !typeFilter || c.clientType === typeFilter)
    .filter((c) => c.completionPct >= minCompletion)
    .filter((c) => {
      if (sequenceFilter === "all") return true;
      const ghlId = (c as any).ghlContactId || (((c as any).merKey as string) || "").split("_")[0] || "";
      const seqMonth = data.clientMonths[c.name] || data.latestMonth;
      const seq = getSequenceInfoForClient(ghlId, seqMonth, data.actionLog);
      if (sequenceFilter === "active") return seq.hasActiveSequence;
      if (sequenceFilter === "resolved")
        return (
          seq.bankReconnection.status === "resolved" ||
          seq.statementRequest.status === "resolved"
        );
      if (sequenceFilter === "approved") return seq.notesApprovalCount > 0;
      return true;
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      if (sortKey === "completionPct") return mul * (a.completionPct - b.completionPct);
      if (sortKey === "complianceStatus") return mul * a.complianceStatus.localeCompare(b.complianceStatus);
      if (sortKey === "uncategorizedTransactions") return mul * (a.uncategorizedTransactions - b.uncategorizedTransactions);
      return 0;
    });

  const chartData = [...monthClients]
    .sort((a, b) => a.completionPct - b.completionPct)
    .slice(0, 15)
    .map((c) => ({ name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name, pct: c.completionPct, full: c.name }));

  const getBarColor = (pct: number) => {
    if (pct >= 80) return "hsl(160, 55%, 42%)";
    if (pct >= 50) return "hsl(38, 70%, 50%)";
    return "hsl(0, 65%, 50%)";
  };

  const sortButtons: { key: SortKey; label: string }[] = [
    { key: "completionPct", label: "Completion %" },
    { key: "name", label: "Name" },
    { key: "complianceStatus", label: "Status" },
    { key: "uncategorizedTransactions", label: "Uncat. Txns" },
  ];

  const applyFilter = (f: SavedFilter) => {
    setSearch(f.search);
    setStatusFilter(f.status);
    setBookkeeperFilter(f.bookkeeper);
    setTypeFilter(f.clientType);
    setMinCompletion(f.minCompletion);
  };

  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return;
    saveFilter({
      name: newFilterName.trim(),
      search,
      status: statusFilter,
      bookkeeper: bookkeeperFilter,
      clientType: typeFilter,
      minCompletion,
    });
    toast({ title: "Filter saved", description: `"${newFilterName.trim()}" available in your saved views.` });
    setNewFilterName("");
    setShowSaveDialog(false);
  };

  const hasActiveFilter = search || statusFilter !== "all" || bookkeeperFilter || typeFilter || minCompletion > 0;
  const clientTypes = Array.from(new Set(monthClients.map((c) => c.clientType))).sort();

  return (
    <div className="space-y-6 density-space-y-6">
      {/* Sticky sub-header (#3) — appears once user scrolls past the chart */}
      <StickyPageHeader>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground border border-border">
          <Search className="h-3 w-3 text-muted-foreground" />
          {filtered.length} of {monthClients.length}
        </span>
        {statusFilter !== "all" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium border border-primary/20">
            {statusFilter}
            <button onClick={() => setStatusFilter("all")} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
          </span>
        )}
        {bookkeeperFilter && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium border border-primary/20">
            BK: {bookkeeperFilter}
            <button onClick={() => setBookkeeperFilter("")} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
          </span>
        )}
        {typeFilter && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium border border-primary/20">
            {typeFilter}
            <button onClick={() => setTypeFilter("")} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
          </span>
        )}
        {minCompletion > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium border border-primary/20">
            ≥ {minCompletion}%
            <button onClick={() => setMinCompletion(0)} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
          </span>
        )}
        {search && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium border border-primary/20 max-w-[160px] truncate">
            "{search}"
            <button onClick={() => setSearch("")} className="hover:text-destructive shrink-0"><X className="h-2.5 w-2.5" /></button>
          </span>
        )}
      </StickyPageHeader>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        whileHover={{ scale: 1.003 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-6 density-card shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
        <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Lowest Completion % Clients
        </h2>
        <p className="text-[11px] text-muted-foreground mb-4">Bottom {chartData.length} clients by completion percentage</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 8%, 16%)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(25, 10%, 50%)" }} unit="%" />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: "hsl(25, 10%, 50%)" }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(20, 8%, 14%)" }} />
            <Bar
              dataKey="pct"
              radius={[0, 4, 4, 0]}
              name="Completion %"
              cursor="pointer"
              onClick={(d: any) => {
                const name = d?.payload?.full ?? d?.full;
                if (name) setDetailsClient(name);
              }}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Saved filter chips */}
      {savedFilters.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mr-1 inline-flex items-center gap-1">
            <Bookmark className="h-3 w-3" />Saved:
          </span>
          {savedFilters.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-card pl-3 pr-1.5 py-1 text-[11px] font-medium text-foreground hover:border-primary/30 transition-colors">
              <button onClick={() => applyFilter(f)} className="hover:text-primary">{f.name}</button>
              <button onClick={() => deleteFilter(f.id)} className="h-4 w-4 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input type="text" placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full min-w-0" />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {hasActiveFilter && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setBookkeeperFilter("");
                setTypeFilter("");
                setMinCompletion(0);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors"
            >
              <X className="h-3 w-3" />Clear filters
            </button>
          )}

          <MonthFilter
            value={monthFilter}
            onChange={setMonthFilter}
            months={data.availableMonths}
            latestMonth={data.latestMonth}
            compact
          />

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SavedFilter["status"])}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground flex-1 sm:flex-none min-w-0">
            <option value="all">All statuses</option>
            <option value="Compliant">Compliant</option>
            <option value="Non-Compliant">Non-Compliant</option>
            <option value="On Hold">On Hold</option>
          </select>

          <select value={bookkeeperFilter} onChange={(e) => setBookkeeperFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground flex-1 sm:flex-none min-w-0 max-w-[50%] sm:max-w-none">
            <option value="">All bookkeepers</option>
            {data.bookkeepers.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground flex-1 sm:flex-none min-w-0 max-w-[50%] sm:max-w-none">
            <option value="">All types</option>
            {clientTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={sequenceFilter}
            onChange={(e) => setSequenceFilter(e.target.value as typeof sequenceFilter)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground flex-1 sm:flex-none min-w-0 max-w-[50%] sm:max-w-none"
          >
            <option value="all">All sequences</option>
            <option value="active">🟡 Active sequences</option>
            <option value="resolved">✅ Resolved sequences</option>
            <option value="approved">📝 Notes approved</option>
          </select>

          <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
            Min %
            <input type="number" min={0} max={100} value={minCompletion} onChange={(e) => setMinCompletion(Number(e.target.value))}
              className="w-14 rounded-md border border-border bg-card px-1.5 py-1 text-xs font-mono-data text-foreground" />
          </label>

          {hasActiveFilter && (
            <button onClick={() => setShowSaveDialog(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors">
              <BookmarkPlus className="h-3 w-3" />Save view
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mr-1">Sort:</span>
          {sortButtons.map((s) => (
            <button key={s.key} onClick={() => toggleSort(s.key)}
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md border transition-colors ${
                sortKey === s.key ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}>
              {s.label}
              {sortKey === s.key && <ArrowUpDown className="h-3 w-3" />}
            </button>
          ))}
          <span className="text-[11px] text-muted-foreground sm:ml-auto">{filtered.length} clients</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 density-gap-3">
        {filtered.map((c, i) => {
          const issues = getIssueDetails(c);
          const ghlId = (c as any).ghlContactId || (((c as any).merKey as string) || "").split("_")[0] || "";
          const seqMonth = data.clientMonths[c.name] || data.latestMonth;
          const seq = getSequenceInfoForClient(ghlId, seqMonth, data.actionLog);
          const dotCls = seq.hasActiveSequence
            ? "bg-destructive"
            : seq.hasAnyActivity
              ? "bg-success"
              : "bg-muted-foreground/40";
          const dotTip = seq.hasActiveSequence
            ? "Active sequence"
            : seq.hasAnyActivity
              ? "All resolved"
              : "No sequence activity";
          const cardInner = (
            <div className="text-left p-4 density-card group">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground leading-tight truncate">{c.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.clientType} · {c.bookkeeper}</p>
                  {c.status?.trim() && (
                    <p className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-semibold uppercase tracking-wider text-primary max-w-full truncate">
                      <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                      <span className="truncate">{c.status}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <TooltipProvider delayDuration={150}>
                    <UTooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsClient(c.name);
                          }}
                          aria-label={dotTip}
                          className={`h-2.5 w-2.5 rounded-full ${dotCls} ring-2 ring-transparent hover:ring-border transition`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-[11px]">{dotTip}</TooltipContent>
                    </UTooltip>
                  </TooltipProvider>
                  <StatusBadge status={c.complianceStatus} />
                </div>
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="inline-flex items-center gap-2">
                    <ClientSparkline clientName={c.name} history={data.merHistory} />
                    <span className="font-mono-data font-semibold text-foreground tabular-nums">{c.completionPct}%</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${c.completionPct}%`, backgroundColor: getBarColor(c.completionPct) }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Last Reconciled</span><p className="font-mono-data text-foreground">{c.lastReconciledDate || "—"}</p></div>
                <div><span className="text-muted-foreground">Uncat. Txns</span><p className="font-mono-data text-foreground">{c.uncategorizedTransactions}</p></div>
              </div>
              {issues.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/50">
                  <div className="flex items-center gap-1 text-xs text-destructive mb-1.5">
                    <AlertTriangle className="h-3 w-3" /><span className="font-semibold">{issues.length} issue{issues.length > 1 ? "s" : ""} found</span>
                  </div>
                  <ul className="space-y-0.5">
                    {issues.map((issue, idx) => (
                      <li key={idx} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-destructive/60 shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground/70 group-hover:text-primary transition-colors">
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Tap for details <span className="hidden sm:inline">· swipe ← for history</span></span>
                <span>›</span>
              </div>
            </div>
          );

          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.015 }}
              whileHover={{ scale: 1.01, y: -2 }}
              className="rounded-xl border border-border bg-card shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300"
            >
              <SwipeableCard
                onTap={() => setDetailsClient(c.name)}
                leftAction={{
                  label: "History",
                  icon: History,
                  color: "bg-primary text-primary-foreground",
                  onAction: () => setHistoryClient(c.name),
                }}
              >
                {cardInner}
              </SwipeableCard>
            </motion.div>
          );
        })}
      </div>

      {/* Client details modal — grouped MER fields, live from sheet */}
      <ClientDetailsModal
        open={!!detailsClient}
        onClose={() => setDetailsClient(null)}
        client={detailsRow}
        actionLog={data.actionLog}
        onViewHistory={() => {
          if (detailsClient) {
            const name = detailsClient;
            setDetailsClient(null);
            setHistoryClient(name);
          }
        }}
      />

      {/* Per-client history dialog with MoM diff */}
      <Dialog open={!!historyClient} onOpenChange={(open) => !open && setHistoryClient(null)}>
        <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] sm:w-auto max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              {historyClient} – Monthly History
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{history.length} month{history.length === 1 ? "" : "s"} on record</p>
          </DialogHeader>

          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No history found.</p>
          ) : (
            <div className="space-y-5">
              {/* Month-over-month diff */}
              {monthDiff.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      What changed: {history[history.length - 2].month} → {history[history.length - 1].month}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {monthDiff.map((d, i) => {
                      const Icon = d.direction === "improved" ? ArrowUp : d.direction === "regressed" ? ArrowDown : Minus;
                      const color = d.direction === "improved" ? "text-success" : d.direction === "regressed" ? "text-destructive" : "text-muted-foreground";
                      return (
                        <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
                          <Icon className={`h-3 w-3 ${color} shrink-0`} />
                          <span className="text-foreground font-medium min-w-[120px] sm:min-w-[140px]">{d.field}:</span>
                          <span className="font-mono-data text-muted-foreground break-all">{d.prev}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className={`font-mono-data font-semibold ${color} break-all`}>{d.curr}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Sparkline */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Completion % over time</span>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={history.map((h) => ({ month: h.month, pct: h.completionPct }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 8%, 16%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(25, 10%, 50%)" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(25, 10%, 50%)" }} unit="%" />
                    <Tooltip contentStyle={{ background: "hsl(20, 10%, 13%)", border: "1px solid hsl(20, 8%, 20%)", borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="pct" stroke="hsl(340, 45%, 55%)" strokeWidth={2.5} dot={{ r: 3.5 }} name="Completion %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Per-month table */}
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent rounded-lg border border-border">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Month</th>
                      <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Status</th>
                      <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">%</th>
                      <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Uncat.</th>
                      <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Unapp.</th>
                      <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Stmt</th>
                      <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">Reconciled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((h) => (
                      <tr key={h.month} className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors">
                        <td className="px-3 py-2 font-medium text-foreground text-xs">{h.month}</td>
                        <td className="px-3 py-2"><StatusBadge status={h.complianceStatus} /></td>
                        <td className="px-3 py-2 text-right font-mono-data text-xs text-foreground">{h.completionPct}%</td>
                        <td className="px-3 py-2 text-right font-mono-data text-xs text-muted-foreground">{h.uncategorizedTransactions || "-"}</td>
                        <td className="px-3 py-2 text-right font-mono-data text-xs text-muted-foreground">{h.unappliedPayments || "-"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{h.statementRequestStatus || "-"}</td>
                        <td className="px-3 py-2 font-mono-data text-xs text-muted-foreground">{h.lastReconciledDate || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save filter dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md w-[calc(100vw-1rem)] sm:w-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4 text-primary" />
              Save Filter View
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Give your current filter combination a name.</p>
          </DialogHeader>
          <div className="space-y-4">
            <input
              autoFocus
              type="text"
              value={newFilterName}
              onChange={(e) => setNewFilterName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
              placeholder="e.g. My non-compliant clients"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
            />
            <div className="rounded-lg bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-1">
              <p><span className="font-semibold text-foreground">Search:</span> {search || "—"}</p>
              <p><span className="font-semibold text-foreground">Status:</span> {statusFilter}</p>
              <p><span className="font-semibold text-foreground">Bookkeeper:</span> {bookkeeperFilter || "any"}</p>
              <p><span className="font-semibold text-foreground">Type:</span> {typeFilter || "any"}</p>
              <p><span className="font-semibold text-foreground">Min completion:</span> {minCompletion}%</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSaveDialog(false)} className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button onClick={handleSaveFilter} disabled={!newFilterName.trim()}
                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
