import { useState, useMemo } from "react";
import { useClientDetails } from "@/hooks/useClientDetails";
import { bankTransactionsOk, statementReceived } from "@/lib/complianceExplain";

function formatDateToISO(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "—";
  const trimmed = dateStr.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // MM/DD/YYYY or MM/DD/YY
  const slashParts = trimmed.split("/");
  if (slashParts.length === 3) {
    const [mm, dd, yy] = slashParts;
    const year = parseInt(yy, 10);
    const fullYear = year < 100 ? 2000 + year : year;
    return `${fullYear}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // Try Date parse as fallback (handles "July 31, 2025", etc.)
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return trimmed;
}
import StatusBadge from "@/components/StatusBadge";
import MonthFilter from "@/components/MonthFilter";
import { Search, ArrowUpDown, Filter, ChevronDown, SearchX, X } from "lucide-react";
import { motion } from "framer-motion";
import { useSheetData, getClientsForMonth } from "@/hooks/useSheetData";
import { DataError } from "@/components/DataStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { cn, FOCUS_RING, FOCUS_RING_INSET, TH, COUNT_BADGE, BTN_SOFT_DESTRUCTIVE, SEARCH_WRAPPER, SELECT_NATIVE, CARD } from "@/lib/utils";

type SortKey = "name" | "completionPct" | "lastReconciledDate" | "uncategorizedTransactions";
type SortDir = "asc" | "desc";

function pctTone(pct: number) {
  return pct >= 90 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive";
}
function pctBarTone(pct: number) {
  return pct >= 90 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-destructive";
}

/** Skeleton shaped like the final layout: toolbar, then table rows (cards on mobile). */
function ProgressSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading monthly progress…</span>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-10 w-full sm:w-72 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[190px] rounded-xl" />)}
      </div>
      <div className="hidden sm:block rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border"><Skeleton className="h-4 w-full rounded" /></div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-10 rounded ml-auto" />
              <Skeleton className="h-2 w-14 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MonthlyProgressPage() {
  const { data, isLoading, error, refetch, isFetching } = useSheetData();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBookkeeper, setFilterBookkeeper] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [monthFilter, setMonthFilter] = useState<string>("current");
  const { open: openClient, modal: clientModal } = useClientDetails();

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const clients = useMemo(
    () => (monthFilter === "current" ? (data?.clients ?? []) : getClientsForMonth(data?.merHistory ?? [], monthFilter)),
    [data, monthFilter]
  );
  const bookkeepers = data?.bookkeepers ?? [];
  const clientTypes = useMemo(() => [...new Set(clients.map(c => c.clientType))], [clients]);
  const complianceStatuses = ["Compliant", "Non-Compliant", "On Hold"];

  const filtered = useMemo(() => {
    let d = [...clients];
    if (search) d = d.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    if (filterType) d = d.filter(c => c.clientType === filterType);
    if (filterBookkeeper) d = d.filter(c => c.bookkeeper === filterBookkeeper);
    if (filterStatus) d = d.filter(c => c.complianceStatus === filterStatus);
    d.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "completionPct") cmp = a.completionPct - b.completionPct;
      else if (sortKey === "uncategorizedTransactions") cmp = a.uncategorizedTransactions - b.uncategorizedTransactions;
      else cmp = a.lastReconciledDate.localeCompare(b.lastReconciledDate);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return d;
  }, [clients, search, filterType, filterBookkeeper, filterStatus, sortKey, sortDir]);

  if (isLoading) return <ProgressSkeleton />;
  if (error || !data) return <DataError message={error?.message} onRetry={() => refetch()} isRetrying={isFetching} />;

  const activeFilters = [filterType, filterBookkeeper, filterStatus].filter(Boolean).length;
  const hasAnyFilter = Boolean(search || filterType || filterBookkeeper || filterStatus);
  const clearFilters = () => {
    setSearch("");
    setFilterType("");
    setFilterBookkeeper("");
    setFilterStatus("");
  };

  const SortHeader = ({ label, field, className = "", align = "left" }: { label: string; field: SortKey; className?: string; align?: "left" | "right" }) => {
    const active = sortKey === field;
    return (
      <th
        scope="col"
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
        className={cn(TH, align === "right" ? "text-right" : "text-left", className)}
      >
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className={cn("inline-flex items-center gap-1 -my-1 py-1 rounded-sm uppercase tracking-wider hover:text-foreground transition-colors duration-150 select-none", FOCUS_RING, active && "text-foreground")}
        >
          {label}
          <ArrowUpDown className={`h-3 w-3 ${active ? "text-primary" : ""}`} aria-hidden />
        </button>
      </th>
    );
  };

  const StaticHeader = ({ children, className = "", align = "left" }: { children: React.ReactNode; className?: string; align?: "left" | "right" }) => (
    <th scope="col" className={cn(TH, align === "right" ? "text-right" : "text-left", className)}>{children}</th>
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className={cn(SEARCH_WRAPPER, "w-full sm:w-72")}>
          <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <input type="search" aria-label="Search clients" placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full min-w-0" />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className={cn("shrink-0 -mr-1 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150", FOCUS_RING)}
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>
        <MonthFilter
          value={monthFilter}
          onChange={setMonthFilter}
          months={data.availableMonths}
          latestMonth={data.latestMonth}
          compact
        />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Filter className="h-3.5 w-3.5" aria-hidden /><span>Filters</span>
          {activeFilters > 0 && <span className={COUNT_BADGE} aria-label={`${activeFilters} active filters`}>{activeFilters}</span>}
        </div>
        {[
          { value: filterType, setter: setFilterType, label: "All Types", options: clientTypes },
          { value: filterBookkeeper, setter: setFilterBookkeeper, label: "All Bookkeepers", options: bookkeepers },
          { value: filterStatus, setter: setFilterStatus, label: "All Statuses", options: complianceStatuses },
        ].map(({ value, setter, label, options }) => (
          <div key={label} className="relative w-full sm:w-auto">
            <select value={value} onChange={(e) => setter(e.target.value)} aria-label={label}
              className={cn(SELECT_NATIVE, "appearance-none w-full sm:w-auto pr-8 cursor-pointer", value ? "border-primary/30 text-foreground font-medium" : "text-muted-foreground")}>
              <option value="">{label}</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
          </div>
        ))}
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className={BTN_SOFT_DESTRUCTIVE}
          >
            <X className="h-3 w-3" aria-hidden /> Clear
          </button>
        )}
        <div className="sm:ml-auto text-[12px] text-muted-foreground font-mono-data tabular-nums">{filtered.length} of {clients.length} clients</div>
      </motion.div>

      {/* Mobile: card grid. Table is unusable at <sm because it has 13 columns. */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {filtered.map((c, i) => {
          const needsAttention = c.complianceStatus === "Non-Compliant" && c.completionPct < 50;
          return (
            <motion.div
              key={c.id}
              tabIndex={0}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.2) }}
              onClick={() => openClient(c.name)}
              onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openClient(c.name); } }}
              className={cn(CARD, "p-4 cursor-pointer hover:bg-muted/40 transition-colors duration-150", FOCUS_RING, needsAttention && "border-destructive/30")}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5" title={c.name}>
                    {needsAttention && <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" aria-label="Needs attention" />}
                    <span className="truncate">{c.name}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.clientType} · {c.bookkeeper}</p>
                </div>
                <StatusBadge status={c.complianceStatus} client={c} />
              </div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={c.completionPct} aria-valuemin={0} aria-valuemax={100} aria-label="Completion">
                  <div className={`h-full rounded-full transition-[width] duration-300 ${pctBarTone(c.completionPct)}`} style={{ width: `${Math.min(100, Math.max(0, c.completionPct))}%` }} />
                </div>
                <span className={`font-mono-data text-xs font-semibold tabular-nums ${pctTone(c.completionPct)}`}>{c.completionPct}%</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <div className="flex justify-between"><dt className="text-muted-foreground">Bank Txns</dt><dd className={bankTransactionsOk(c.bankTransactions) ? "text-success" : "text-destructive"}>{bankTransactionsOk(c.bankTransactions) ? "OK" : "Missing"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Statement</dt><dd className={statementReceived(c.statementRequestStatus) ? "text-success" : "text-destructive"}>{statementReceived(c.statementRequestStatus) ? "Rcvd" : "Not Rcvd"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Uncat.</dt><dd className={`font-mono-data tabular-nums ${c.uncategorizedTransactions > 0 ? "text-destructive" : "text-foreground"}`}>{c.uncategorizedTransactions}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">No Payee</dt><dd className={`font-mono-data tabular-nums ${c.transactionsWithoutPayees > 0 ? "text-warning" : "text-foreground"}`}>{c.transactionsWithoutPayees}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Undep.</dt><dd className="font-mono-data tabular-nums text-foreground">{c.undepositedFunds}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Unapplied</dt><dd className="font-mono-data tabular-nums text-foreground">{c.unappliedPayments}</dd></div>
                <div className="flex justify-between col-span-2"><dt className="text-muted-foreground">Last Recon.</dt><dd className="font-mono-data tabular-nums text-foreground">{formatDateToISO(c.lastReconciledDate)}</dd></div>
                <div className="flex justify-between col-span-2"><dt className="text-muted-foreground">Notes Approved</dt><dd className={c.prevMonthNotesApproved ? "text-success" : "text-destructive"}>{c.prevMonthNotesApproved ? "Yes" : "No"}</dd></div>
              </dl>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <EmptyState
            icon={SearchX}
            variant="card"
            title={hasAnyFilter ? "No clients match the current filters" : "No clients for this month"}
            hint={hasAnyFilter ? "Try widening your search or clearing a filter." : "Pick another month or wait for MER submissions to arrive."}
            action={hasAnyFilter ? { label: "Clear filters", onClick: clearFilters } : undefined}
          />
        )}
      </div>

      {/* Desktop / tablet: full table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className={cn(CARD, "hidden sm:block overflow-hidden relative")}>
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <SortHeader label="Client" field="name" className="min-w-[180px]" />
                <StaticHeader>Type</StaticHeader>
                <StaticHeader>Bookkeeper</StaticHeader>
                <StaticHeader>Bank Txns</StaticHeader>
                <SortHeader label="Uncat." field="uncategorizedTransactions" align="right" />
                <StaticHeader align="right">No Payee</StaticHeader>
                <StaticHeader align="right">Undep.</StaticHeader>
                <StaticHeader align="right">Unapplied</StaticHeader>
                <StaticHeader>Stmt Status</StaticHeader>
                <SortHeader label="Last Recon." field="lastReconciledDate" />
                <StaticHeader>Notes</StaticHeader>
                <SortHeader label="Completion" field="completionPct" />
                <StaticHeader>Status</StaticHeader>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const needsAttention = c.complianceStatus === "Non-Compliant" && c.completionPct < 50;
                return (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 + i * 0.015 }}
                    tabIndex={0}
                    onClick={() => openClient(c.name)}
                    onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openClient(c.name); } }}
                    className={cn("border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors duration-150 cursor-pointer", FOCUS_RING_INSET, needsAttention && "bg-destructive/[0.03]")}>
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap text-[13px]">
                      <div className="flex items-center gap-2 max-w-[260px]">
                        {needsAttention && <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" aria-label="Needs attention" />}
                        <span className="truncate" title={c.name}>{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[13px]">{c.clientType}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[13px] max-w-[160px] truncate" title={c.bookkeeper}>{c.bookkeeper}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={bankTransactionsOk(c.bankTransactions) ? "Received" : "Not Received"} className="text-[11px]" /></td>
                    <td className="px-4 py-3 text-right"><span className={`font-mono-data tabular-nums text-[13px] font-semibold ${c.uncategorizedTransactions > 0 ? "text-destructive" : "text-success"}`}>{c.uncategorizedTransactions}</span></td>
                    <td className="px-4 py-3 text-right"><span className={`font-mono-data tabular-nums text-[13px] font-semibold ${c.transactionsWithoutPayees > 0 ? "text-warning" : "text-foreground"}`}>{c.transactionsWithoutPayees}</span></td>
                    <td className="px-4 py-3 text-right font-mono-data tabular-nums text-[13px] text-foreground">{c.undepositedFunds}</td>
                    <td className="px-4 py-3 text-right font-mono-data tabular-nums text-[13px] text-foreground">{c.unappliedPayments}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={statementReceived(c.statementRequestStatus) ? "Received" : "Not Received"} /></td>
                    <td className="px-4 py-3 font-mono-data tabular-nums text-[13px] text-muted-foreground whitespace-nowrap">{formatDateToISO(c.lastReconciledDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={c.prevMonthNotesApproved ? "Yes" : "No"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-14 h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={c.completionPct} aria-valuemin={0} aria-valuemax={100} aria-label="Completion">
                          <div className={`h-full rounded-full transition-[width] duration-300 ${pctBarTone(c.completionPct)}`}
                            style={{ width: `${Math.min(100, Math.max(0, c.completionPct))}%` }} />
                        </div>
                        <span className={`font-mono-data text-xs font-semibold tabular-nums ${pctTone(c.completionPct)}`}>{c.completionPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={c.complianceStatus} client={c} /></td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-0">
                    <EmptyState
                      icon={SearchX}
                      title={hasAnyFilter ? "No clients match the current filters" : "No clients for this month"}
                      hint={hasAnyFilter ? "Try widening your search or clearing a filter." : "Pick another month or wait for MER submissions to arrive."}
                      action={hasAnyFilter ? { label: "Clear filters", onClick: clearFilters } : undefined}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
      {clientModal}
    </div>
  );
}

