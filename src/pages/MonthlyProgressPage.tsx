import { useState, useMemo, useCallback } from "react";
import { useClientDetails } from "@/hooks/useClientDetails";

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
import { Search, ArrowUpDown, Filter, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useSheetData, getClientsForMonth } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";
import type { Client } from "@/data/mockData";

type SortKey = "name" | "completionPct" | "lastReconciledDate" | "uncategorizedTransactions";
type SortDir = "asc" | "desc";

export default function MonthlyProgressPage() {
  const { data, isLoading, error } = useSheetData();
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

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  const activeFilters = [filterType, filterBookkeeper, filterStatus].filter(Boolean).length;

  const SortHeader = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
    <th className={`text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3.5 cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap sticky top-0 bg-muted/50 backdrop-blur-sm z-10 ${className}`}
      onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">{label}<ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-primary" : ""}`} /></span>
    </th>
  );

  const StaticHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <th className={`text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3.5 whitespace-nowrap sticky top-0 bg-muted/50 backdrop-blur-sm z-10 ${className}`}>{children}</th>
  );

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm w-72 shadow-card focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full" />
        </div>
        <MonthFilter
          value={monthFilter}
          onChange={setMonthFilter}
          months={data.availableMonths}
          latestMonth={data.latestMonth}
          compact
        />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Filter className="h-3.5 w-3.5" /><span>Filters</span>
          {activeFilters > 0 && <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{activeFilters}</span>}
        </div>
        {[
          { value: filterType, setter: setFilterType, label: "All Types", options: clientTypes },
          { value: filterBookkeeper, setter: setFilterBookkeeper, label: "All Bookkeepers", options: bookkeepers },
          { value: filterStatus, setter: setFilterStatus, label: "All Statuses", options: complianceStatuses },
        ].map(({ value, setter, label, options }) => (
          <div key={label} className="relative">
            <select value={value} onChange={(e) => setter(e.target.value)}
              className={`appearance-none rounded-lg border bg-card pl-3 pr-8 py-2 text-sm cursor-pointer transition-colors ${value ? "border-primary/30 text-foreground font-medium" : "border-border text-muted-foreground"} hover:border-muted-foreground/40`}>
              <option value="">{label}</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        ))}
        <div className="ml-auto text-[12px] text-muted-foreground font-mono-data">{filtered.length} of {clients.length} clients</div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden relative">
        <div className="overflow-auto max-h-[calc(100vh-220px)] scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <SortHeader label="Client" field="name" className="min-w-[180px]" />
                <StaticHeader>Type</StaticHeader>
                <StaticHeader>Bookkeeper</StaticHeader>
                <StaticHeader>Bank Txns</StaticHeader>
                <SortHeader label="Uncat." field="uncategorizedTransactions" />
                <StaticHeader>No Payee</StaticHeader>
                <StaticHeader>Undep.</StaticHeader>
                <StaticHeader>Unapplied</StaticHeader>
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
                    onClick={() => openClient(c.name)}
                    className={`border-b border-border/60 hover:bg-accent/40 transition-colors cursor-pointer ${needsAttention ? "bg-destructive/[0.03]" : ""}`}>
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap text-[13px]">
                      <div className="flex items-center gap-2">{needsAttention && <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />}{c.name}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[13px]">{c.clientType}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[13px]">{c.bookkeeper}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={c.bankTransactions.includes("Missing") ? "Non-Compliant" : "Compliant"} className="text-[11px]" /></td>
                    <td className="px-4 py-3"><span className={`font-mono-data text-[13px] font-semibold ${c.uncategorizedTransactions > 0 ? "text-destructive" : "text-success"}`}>{c.uncategorizedTransactions}</span></td>
                    <td className="px-4 py-3"><span className={`font-mono-data text-[13px] font-semibold ${c.transactionsWithoutPayees > 0 ? "text-warning" : "text-foreground"}`}>{c.transactionsWithoutPayees}</span></td>
                    <td className="px-4 py-3 font-mono-data text-[13px] text-foreground">{c.undepositedFunds}</td>
                    <td className="px-4 py-3 font-mono-data text-[13px] text-foreground">{c.unappliedPayments}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={c.statementRequestStatus === "Received" ? "Received" : "Not Received"} /></td>
                    <td className="px-4 py-3 font-mono-data text-[13px] text-muted-foreground whitespace-nowrap">{formatDateToISO(c.lastReconciledDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={c.prevMonthNotesApproved ? "Yes" : "No"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-14 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${c.completionPct >= 90 ? "bg-success" : c.completionPct >= 50 ? "bg-warning" : "bg-destructive"}`}
                            style={{ width: `${c.completionPct}%` }} />
                        </div>
                        <span className={`font-mono-data text-xs font-semibold ${c.completionPct >= 90 ? "text-success" : c.completionPct >= 50 ? "text-warning" : "text-destructive"}`}>{c.completionPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={c.complianceStatus} client={c} /></td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
      {clientModal}
    </div>
  );
}
