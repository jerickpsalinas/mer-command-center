import StatusBadge from "@/components/StatusBadge";
import StickyPageHeader from "@/components/StickyPageHeader";
import ClientSparkline from "@/components/ClientSparkline";
import SwipeableCard from "@/components/SwipeableCard";
import { useMemo, useState, useEffect, useDeferredValue } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, AlertTriangle, ArrowUpDown, BarChart3, History, TrendingUp, Bookmark, BookmarkPlus, X, Filter, ArrowUp, ArrowDown, Minus, FileText, Lock, CheckCircle2, Eye, ChevronRight, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSheetData, getClientHistory, getClientsForMonth } from "@/hooks/useSheetData";
import { hasPendingVerifyTag, type MerHistoryRow, type ActionLogEntry } from "@/services/googleSheets";
import { evaluateCompliance } from "@/lib/complianceExplain";

import { useUserSettings, type SavedFilter } from "@/hooks/useUserSettings";
import { DataLoading, DataError } from "@/components/DataStatus";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { diffClientMonths } from "@/lib/insights";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import ClientDetailsModal from "@/components/ClientDetailsModal";
import MonthFilter from "@/components/MonthFilter";
import { getSequenceInfoForClient } from "@/utils/sequenceStatus";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMerWorkflowContacts, contactDisplayName, type MerWorkflowContact } from "@/hooks/useMerWorkflowContacts";
import type { Client } from "@/data/mockData";


type SortKey = "name" | "completionPct" | "complianceStatus" | "uncategorizedTransactions" | "lastReconciled";
type SortDir = "asc" | "desc";

/** Parse a MER-style date string ("6/30/2025" etc.) to a sortable epoch ms. */
function reconciledMs(raw: string): number {
  if (!raw) return 0;
  const t = Date.parse(raw);
  return isNaN(t) ? 0 : t;
}

interface TooltipPayloadEntry {
  name: string;
  value: number | string;
  color?: string;
  fill?: string;
  payload?: Record<string, unknown>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg border border-border bg-card shadow-elevated text-foreground">
      <p className="text-xs font-semibold mb-0.5">{(payload[0]?.payload?.full as string) || label}</p>
      {payload.map((p, i: number) => (
        <p key={i} className="text-[11px] text-muted-foreground">
          {p.name}: <span className="font-mono-data font-semibold text-foreground">{p.value}%</span>
        </p>
      ))}
    </div>
  );
};

function getIssueDetails(c: Client) {
  // "Pending MER" placeholders have blank fields — every check would false-positive.
  if (c.complianceStatus === "Pending MER") return [];
  // On Hold clients are excluded from the pass/fail grid by design.
  if (c.complianceStatus === "On Hold") return [];
  // Derive from the canonical rule set so the card list matches the badge tooltip.
  return evaluateCompliance(c).failingLabels;
}

export default function ClientsPage() {
  const { data: sheetData, isLoading, error } = useSheetData();
  const { contacts: merWorkflowContacts, loading: ghlLoading } = useMerWorkflowContacts();
  const { savedFilters, saveFilter, deleteFilter } = useUserSettings();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  // Defer the filter/sort re-computation so typing feels instant on long lists.
  // The input stays perfectly responsive; the card grid catches up a tick later.
  const deferredSearch = useDeferredValue(search);
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
  const [detailsClient, setDetailsClient] = useState<string | null>(
    () => searchParams.get("open") ?? null,
  );

  // Sync ?open=<clientName> — opens the details modal directly (used by
  // Activity Log drill-in so a bookkeeper can jump from an audit row to
  // the client's full record in one click).
  useEffect(() => {
    const openName = searchParams.get("open");
    if (openName && openName !== detailsClient) setDetailsClient(openName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("current");
  const [sequenceFilter, setSequenceFilter] = useState<"all" | "active" | "resolved" | "approved">("all");
  const [categoryTagFilter, setCategoryTagFilter] = useState<string>("all");
  const [merStatusFilter, setMerStatusFilter] = useState<string>("all");
  const [cycleStatusFilter, setCycleStatusFilter] = useState<
    "all" | "escalation-active" | "bank-reconnection-active" | "statement-request-active" | "docs-request-active" | "ready-for-pipeline" | "pending-verification" | "qbo-not-connected"
  >("all");
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const toggleIssues = (id: string) =>
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  const [comingSoon, setComingSoon] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  

  const sheetLoading = isLoading || !sheetData;
  const data = sheetData ?? {
    clients: [] as Client[],
    merHistory: [] as MerHistoryRow[],
    clientMonths: {} as Record<string, string>,
    latestMonth: "",
    actionLog: [] as ActionLogEntry[],
    bookkeepers: [] as string[],
    availableMonths: [] as string[],
  };

  // Snapshot of clients for the chosen month (or live latest)
  const isLatest = monthFilter === "current";
  const monthClients = isLatest ? data.clients : getClientsForMonth(data.merHistory, monthFilter);

  // Build the client list for the active month.
  // - Latest: source-of-truth = active GHL contacts (with mer-workflow tag), overlaying current MER snapshot.
  //   Contacts without a MER row appear as "Pending MER" placeholders.
  // - Historical month: source-of-truth = MER rows submitted that month (so we always show who was tracked then,
  //   even if the client is no longer in the current GHL active set). We also append "Pending MER" placeholders
  //   for any current GHL contact that had no MER row that month.
  const mergedClients: Client[] = (() => {
    const norm = (s: string) => s.trim().toLowerCase();
    const byGhlId = new Map<string, Client>();
    const byName = new Map<string, Client>();
    for (const c of monthClients) {
      const gid = c.ghlContactId;
      if (gid) byGhlId.set(gid, c);
      byName.set(norm(c.name), c);
    }

    const makePlaceholder = (contact: MerWorkflowContact): Client => ({
      id: contact.id,
      name: contactDisplayName(contact),
      clientType: "For-Profit",
      bookkeeper: "—",
      status: "Pending MER",
      bankTransactions: "",
      uncategorizedTransactions: 0,
      transactionsWithoutPayees: 0,
      undepositedFunds: 0,
      unappliedPayments: 0,
      statementRequestStatus: "",
      lastReconciledDate: "",
      prevMonthNotesApproved: false,
      financialsSentToClient: false,
      booksClosedInQB: false,
      completionPct: 0,
      complianceStatus: "Pending MER",
      ghlContactId: contact.id,
      categoryTags: (contact.tags || []).join(","),
    } as Client);

    if (isLatest) {
      return merWorkflowContacts.map<Client>((contact) => {
        const liveTags = contact.tags || [];
        const matched = byGhlId.get(contact.id) || byName.get(norm(contactDisplayName(contact)));
        if (matched) return {
          ...matched,
          categoryTags: liveTags.join(","),
          pendingVerification: hasPendingVerifyTag(liveTags),
        };
        return makePlaceholder(contact);
      });
    }

    // Historical: base list is that month's MER rows only (so old/completed clients still appear
    // for that month). We deliberately do NOT append placeholders for currently-active GHL contacts
    // that had no MER row that month — a client onboarded later shouldn't appear as "Pending MER"
    // for a month before they existed. That would pollute historical compliance counts.
    return monthClients.map((c) => {
      const gid = c.ghlContactId;
      const contact =
        (gid && merWorkflowContacts.find((x) => x.id === gid)) ||
        merWorkflowContacts.find((x) => norm(contactDisplayName(x)) === norm(c.name));
      if (!contact) return c;
      const liveTags = contact.tags || [];
      return {
        ...c,
        categoryTags: liveTags.join(","),
        pendingVerification: hasPendingVerifyTag(liveTags),
      };
    });
  })();

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
    else {
      setSortKey(key);
      // Sensible defaults: "smallest/oldest first" for things you want to fix,
      // "biggest/newest first" for things you want to celebrate.
      const ascByDefault: SortKey[] = ["completionPct", "lastReconciled", "name"];
      setSortDir(ascByDefault.includes(key) ? "asc" : "desc");
    }
  };

  const filtered = mergedClients
    .filter((c) => c.name.toLowerCase().includes(deferredSearch.toLowerCase()))
    .filter((c) => statusFilter === "all" || c.complianceStatus === statusFilter)
    .filter((c) => {
      if (merStatusFilter === "all") return true;
      if (merStatusFilter.toLowerCase() === "ready for manager's review") {
        const statusMatch = (c.status || "").trim().toLowerCase() === "ready for manager's review";
        const tags = (c.categoryTags || "").split(",").map((t) => t.trim().toLowerCase());
        const tagMatch = tags.includes("review-ready") || tags.includes("review-ready-cleanup");
        return statusMatch || tagMatch;
      }
      return (c.status || "").trim().toLowerCase() === merStatusFilter.toLowerCase();
    })
    .filter((c) => !bookkeeperFilter || c.bookkeeper === bookkeeperFilter)
    .filter((c) => !typeFilter || c.clientType === typeFilter)
    .filter((c) => c.completionPct >= minCompletion)
    .filter((c) => {
      if (categoryTagFilter === "all") return true;
      const raw = c.categoryTags;
      if (!raw) return false;
      const tags = raw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      return tags.includes(categoryTagFilter);
    })
    .filter((c) => {
      if (sequenceFilter === "all" && cycleStatusFilter === "all") return true;
      const ghlId = c.ghlContactId || (c.merKey || "").split("_")[0] || "";
      const seqMonth = data.clientMonths[c.name] || data.latestMonth;
      const seq = getSequenceInfoForClient(ghlId, seqMonth, data.actionLog);
      if (sequenceFilter !== "all") {
        if (sequenceFilter === "active" && !seq.hasActiveSequence) return false;
        if (
          sequenceFilter === "resolved" &&
          seq.bankReconnection.status !== "resolved" &&
          seq.statementRequest.status !== "resolved"
        )
          return false;
        if (sequenceFilter === "approved" && seq.notesApprovalCount === 0) return false;
      }
      if (cycleStatusFilter !== "all") {
        if (cycleStatusFilter === "bank-reconnection-active") {
          if (seq.bankReconnection.status !== "active") return false;
        } else if (cycleStatusFilter === "statement-request-active") {
          if (seq.statementRequest.status !== "active") return false;
        } else if (cycleStatusFilter === "docs-request-active") {
          if (seq.docsRequest.status !== "active") return false;
        } else if (cycleStatusFilter === "escalation-active") {
          const entries = (data.actionLog || []).filter((e) => e.ghlContactId === ghlId);
          const hasTrigger = entries.some((e) => /escalat/i.test(e.actionType) && !/resolv/i.test(e.actionType));
          const hasResolve = entries.some((e) => /escalat/i.test(e.actionType) && /resolv/i.test(e.actionType));
          if (!hasTrigger || hasResolve) return false;
        } else if (cycleStatusFilter === "ready-for-pipeline") {
          const entries = (data.actionLog || []).filter((e) => e.ghlContactId === ghlId);
          if (!entries.some((e) => /ready[-_ ]?for[-_ ]?pipeline/i.test(e.actionType))) return false;
        } else if (cycleStatusFilter === "pending-verification") {
          if (!c.pendingVerification) return false;
        } else if (cycleStatusFilter === "qbo-not-connected") {
          const v = String(c.qboConnected ?? "").trim().toLowerCase();
          const connected = v === "yes" || v === "true" || v === "connected";
          if (connected) return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      if (sortKey === "completionPct") return mul * (a.completionPct - b.completionPct);
      if (sortKey === "complianceStatus") return mul * a.complianceStatus.localeCompare(b.complianceStatus);
      if (sortKey === "uncategorizedTransactions") return mul * (a.uncategorizedTransactions - b.uncategorizedTransactions);
      if (sortKey === "lastReconciled") return mul * (reconciledMs(a.lastReconciledDate) - reconciledMs(b.lastReconciledDate));
      return 0;
    });

  const chartData = [...monthClients]
    .sort((a, b) => a.completionPct - b.completionPct)
    .slice(0, 15)
    .map((c) => ({ name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name, pct: c.completionPct, full: c.name }));

  const getBarColor = (pct: number) => {
    if (pct >= 80) return "hsl(var(--success))";
    if (pct >= 50) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const sortButtons: { key: SortKey; label: string }[] = [
    { key: "completionPct", label: "Completion %" },
    { key: "lastReconciled", label: "Last Reconciled" },
    { key: "uncategorizedTransactions", label: "Uncat. Txns" },
    { key: "name", label: "Name" },
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
    toast.success(`"${newFilterName.trim()}" available in your saved views.`);
    setNewFilterName("");
    setShowSaveDialog(false);
  };

  const hasActiveFilter = search || statusFilter !== "all" || bookkeeperFilter || typeFilter || minCompletion > 0 || merStatusFilter !== "all";
  const activeFilterCount = [
    !!search,
    statusFilter !== "all",
    !!bookkeeperFilter,
    !!typeFilter,
    minCompletion > 0,
    merStatusFilter !== "all",
    sequenceFilter !== "all",
    cycleStatusFilter !== "all",
  ].filter(Boolean).length;
  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setBookkeeperFilter("");
    setTypeFilter("");
    setMinCompletion(0);
    setMerStatusFilter("all");
    setSequenceFilter("all");
    setCycleStatusFilter("all");
  };
  const clientTypes = Array.from(new Set(monthClients.map((c) => c.clientType))).sort();

  const merStatusCounts = useMemo(() => {
    const completed = mergedClients.filter((c) => (c.status || "").trim().toLowerCase() === "completed").length;
    const review = mergedClients.filter((c) => {
      const statusMatch = (c.status || "").trim().toLowerCase() === "ready for manager's review";
      const tags = (c.categoryTags || "").split(",").map((t) => t.trim().toLowerCase());
      const tagMatch = tags.includes("review-ready") || tags.includes("review-ready-cleanup");
      return statusMatch || tagMatch;
    }).length;
    return { completed, review };
  }, [mergedClients]);

  if (isLoading && ghlLoading) return <DataLoading variant="list" />;
  if (error) return <DataError message={error?.message} />;


  return (
    <div className="space-y-6 density-space-y-6">
      {/* Sticky sub-header (#3) — appears once user scrolls past the chart */}
      <StickyPageHeader>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground border border-border">
          <Search className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono-data tabular-nums">{filtered.length} of {mergedClients.length}</span>
        </span>
        {statusFilter !== "all" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium border border-primary/20">
            {statusFilter}
            <button type="button" onClick={() => setStatusFilter("all")} aria-label={`Remove status filter ${statusFilter}`} className="rounded-full hover:text-destructive transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><X className="h-2.5 w-2.5" aria-hidden="true" /></button>
          </span>
        )}
        {merStatusFilter !== "all" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {merStatusFilter}
            <button type="button" onClick={() => setMerStatusFilter("all")} aria-label={`Remove MER status filter ${merStatusFilter}`} className="ml-1 rounded-full hover:text-destructive transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        )}
        {bookkeeperFilter && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium border border-primary/20">
            BK: {bookkeeperFilter}
            <button type="button" onClick={() => setBookkeeperFilter("")} aria-label={`Remove bookkeeper filter ${bookkeeperFilter}`} className="rounded-full hover:text-destructive transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><X className="h-2.5 w-2.5" aria-hidden="true" /></button>
          </span>
        )}
        {typeFilter && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium border border-primary/20">
            {typeFilter}
            <button type="button" onClick={() => setTypeFilter("")} aria-label={`Remove type filter ${typeFilter}`} className="rounded-full hover:text-destructive transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><X className="h-2.5 w-2.5" aria-hidden="true" /></button>
          </span>
        )}
        {minCompletion > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium border border-primary/20">
            ≥ {minCompletion}%
            <button type="button" onClick={() => setMinCompletion(0)} aria-label="Remove minimum completion filter" className="rounded-full hover:text-destructive transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><X className="h-2.5 w-2.5" aria-hidden="true" /></button>
          </span>
        )}
        {search && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium border border-primary/20 max-w-[160px] truncate">
            "{search}"
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="rounded-full hover:text-destructive shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><X className="h-2.5 w-2.5" aria-hidden="true" /></button>
          </span>
        )}
      </StickyPageHeader>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        whileHover={{ scale: 1.003 }}
        className="rounded-xl border border-border bg-card p-4 sm:p-6 density-card shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300">
        <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
          Lowest Completion % Clients
        </h2>
        <p className="text-[11px] text-muted-foreground mb-4">Bottom {chartData.length} clients by completion percentage</p>
        {sheetLoading ? (
          <div className="h-[280px] w-full space-y-3 py-2" aria-busy="true" aria-label="Loading chart">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-20 shrink-0" />
                <Skeleton className="h-4 rounded-sm" style={{ width: `${25 + ((i * 37) % 60)}%` }} />
              </div>
            ))}
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.6)" }} />
            <Bar
              dataKey="pct"
              radius={[0, 4, 4, 0]}
              name="Completion %"
              cursor="pointer"
              onClick={(d: Record<string, unknown>) => {
                const payload = d?.payload as Record<string, unknown> | undefined;
                const name = (payload?.full ?? d?.full) as string | undefined;
                if (name) setDetailsClient(name);
              }}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </motion.div>

      {/* Saved filter chips */}
      {savedFilters.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mr-1 inline-flex items-center gap-1">
            <Bookmark className="h-3 w-3" aria-hidden="true" />Saved:
          </span>
          {savedFilters.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-card pl-3 pr-1.5 py-1 text-[11px] font-medium text-foreground hover:border-primary/30 transition-colors">
              <button type="button" onClick={() => applyFilter(f)} title={`Apply saved view ${f.name}`} className="max-w-[160px] truncate rounded-sm hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">{f.name}</button>
              <button
                type="button"
                onClick={() => deleteFilter(f.id)}
                aria-label={`Delete saved filter ${f.name}`}
                title={`Delete saved filter ${f.name}`}
                className="h-6 w-6 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm w-full sm:w-64 transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/30">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <label htmlFor="clients-search" className="sr-only">Search clients</label>
            <input
              id="clients-search"
              type="search"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full min-w-0 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <X className="h-3 w-3" aria-hidden="true" />
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
          {!isLatest && (
            <button
              type="button"
              onClick={() => setMonthFilter("current")}
              className="h-9 rounded-md px-1 text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Reset to latest
            </button>
          )}

          {(() => {
            const active = cycleStatusFilter === "qbo-not-connected";
            return (
              <button
                type="button"
                onClick={() => setCycleStatusFilter(active ? "all" : "qbo-not-connected")}
                aria-pressed={active}
                title={active ? "Clear QBO Not Connected filter" : "Show only clients not connected to QuickBooks"}
                className={`inline-flex h-9 items-center gap-1.5 text-[11px] font-semibold px-2.5 rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  active
                    ? "bg-primary/15 text-primary border-primary/40 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.25)]"
                    : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Lock className="h-3 w-3" aria-hidden="true" />
                QBO Not Connected
                {active && <X className="h-3 w-3 ml-0.5" aria-hidden="true" />}
              </button>
            );
          })()}

          {hasActiveFilter && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setBookkeeperFilter("");
                setTypeFilter("");
                setMinCompletion(0);
                setMerStatusFilter("all");
              }}
              type="button"
              className="inline-flex h-9 items-center gap-1 text-[11px] font-semibold px-2.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X className="h-3 w-3" aria-hidden="true" />Clear filters
            </button>
          )}

          {hasActiveFilter && (
            <button type="button" onClick={() => setShowSaveDialog(true)}
              className="inline-flex h-9 items-center gap-1 text-[11px] font-semibold px-2.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <BookmarkPlus className="h-3 w-3" aria-hidden="true" />Save view
            </button>
          )}

          <span id="clients-sort-label" className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mr-1">Sort:</span>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="clients-sort-label">
            {sortButtons.map((s) => {
              const active = sortKey === s.key;
              const SortIcon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSort(s.key)}
                  aria-pressed={active}
                  title={active ? `Sorted ${sortDir === "asc" ? "ascending" : "descending"} — click to flip` : `Sort by ${s.label}`}
                  className={`inline-flex h-9 items-center gap-1 text-[11px] font-medium px-2.5 rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    active ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}>
                  {s.label}
                  <SortIcon className={`h-3 w-3 ${active ? "" : "opacity-50"}`} aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-muted-foreground sm:ml-auto font-mono-data tabular-nums" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "client" : "clients"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mr-1">
            <Filter className="h-3 w-3" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <span
                className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary font-mono-data tabular-nums"
                aria-label={`${activeFilterCount} active filters`}
              >
                {activeFilterCount}
              </span>
            )}
          </span>

          <select aria-label="Compliance status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SavedFilter["status"])}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground flex-1 sm:flex-none min-w-0 transition-colors hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <option value="all">All statuses</option>
            <option value="Compliant">Compliant</option>
            <option value="Non-Compliant">Non-Compliant</option>
            <option value="On Hold">On Hold</option>
            <option value="Pending MER">Pending MER</option>
          </select>

          <select aria-label="Bookkeeper" value={bookkeeperFilter} onChange={(e) => setBookkeeperFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground flex-1 sm:flex-none min-w-0 transition-colors hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background max-w-[50%] sm:max-w-none">
            <option value="">All bookkeepers</option>
            {data.bookkeepers.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          <select aria-label="Client type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground flex-1 sm:flex-none min-w-0 transition-colors hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background max-w-[50%] sm:max-w-none">
            <option value="">All types</option>
            {clientTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            aria-label="Sequence status"
            value={sequenceFilter}
            onChange={(e) => setSequenceFilter(e.target.value as typeof sequenceFilter)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground flex-1 sm:flex-none min-w-0 transition-colors hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background max-w-[50%] sm:max-w-none"
          >
            <option value="all">All sequences</option>
            <option value="active">🟡 Active sequences</option>
            <option value="resolved">✅ Resolved sequences</option>
            <option value="approved">📝 Notes approved</option>
          </select>

          <select
            value={cycleStatusFilter}
            onChange={(e) => setCycleStatusFilter(e.target.value as typeof cycleStatusFilter)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground flex-1 sm:flex-none min-w-0 transition-colors hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background max-w-[50%] sm:max-w-none"
            aria-label="Cycle status"
          >
            <option value="all">All cycle statuses</option>
            <option value="pending-verification">🟡 Pending Verification</option>
            <option value="qbo-not-connected">🔒 QBO Not Connected</option>
            <option value="escalation-active">🚨 Escalation Active</option>
            <option value="bank-reconnection-active">🔌 Bank Reconnection Active</option>
            <option value="statement-request-active">📄 Statement Request Active</option>
            <option value="docs-request-active">📁 Docs Request Active</option>
            <option value="ready-for-pipeline">🔄 Ready for Pipeline</option>
          </select>

          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          {[
            { label: "Compliance: Completed", value: "Completed", icon: CheckCircle2, count: merStatusCounts.completed },
            { label: "Manager's Review", value: "Ready for manager's review", icon: Eye, count: merStatusCounts.review },
          ].map(({ label, value, icon: Icon, count }) => {
            const active = merStatusFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMerStatusFilter(active ? "all" : value)}
                aria-pressed={active}
                className={`inline-flex h-9 items-center gap-2 text-[11px] font-semibold px-3 rounded-lg border transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  active
                    ? "bg-primary/15 text-primary border-primary/40 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.25)]"
                    : "bg-card/60 text-muted-foreground border-border/70 hover:bg-muted/40 hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 transition-colors ${active ? "text-primary" : "text-muted-foreground/60"}`} aria-hidden="true" />
                <span>{label}</span>
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 font-mono-data tabular-nums ${
                  active ? "bg-primary/20 text-primary" : "bg-muted/60 text-muted-foreground"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {(ghlLoading || sheetLoading) && mergedClients.length === 0 && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 density-gap-3"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Loading clients…</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <ClientCardSkeleton key={i} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 density-gap-3 items-start">
        {filtered.map((c, i) => {
          const issues = getIssueDetails(c);
          const ghlId = c.ghlContactId || (c.merKey || "").split("_")[0] || "";
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
                  <h3 className="text-sm font-semibold text-foreground leading-tight truncate" title={c.name}>{c.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate" title={`${c.clientType} · ${c.bookkeeper}`}>{c.clientType} · {c.bookkeeper}</p>
                  {c.status?.trim() && (
                    <p className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-semibold uppercase tracking-wider text-primary max-w-full truncate">
                      <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                      <span className="truncate">{c.status}</span>
                    </p>
                  )}
                  {c.pendingVerification && (
                    <p
                      className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-warning/10 border border-warning/30 text-[10px] font-semibold uppercase tracking-wider text-warning max-w-full truncate"
                      title="Docs claimed via SMS (WF13) — awaiting TaxDome verification (72h)"
                    >
                      <span className="h-1 w-1 rounded-full bg-warning shrink-0" />
                      <span className="truncate">Pending Verification</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex h-5 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold leading-none whitespace-nowrap ${
                      seq.hasActiveSequence
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : seq.hasAnyActivity
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-muted text-muted-foreground border-border"
                    }`}
                    aria-label={dotTip}
                    title={dotTip}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} aria-hidden="true" />
                    {seq.hasActiveSequence ? "Active" : seq.hasAnyActivity ? "Clear" : "Idle"}
                  </span>
                  <StatusBadge status={c.complianceStatus} client={c} />
                </div>
              </div>
              {(() => {
                const qboOn = String(c.qboConnected ?? "").trim().toLowerCase() === "yes";
                return (
                  <div className="mb-2">
                    <span
                      className={`inline-flex h-5 items-center gap-1.5 rounded-md border px-2 text-[10.5px] font-semibold leading-none ${
                        qboOn
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                      title={qboOn ? "QuickBooks Online connected" : "QuickBooks Online not connected"}
                      aria-label={qboOn ? "QuickBooks Online connected" : "QuickBooks Online not connected"}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${qboOn ? "bg-success" : "bg-muted-foreground/60"}`} aria-hidden="true" />
                      {qboOn ? "QBO" : "QBO Not Connected"}
                    </span>
                  </div>
                );
              })()}
              <div className="mb-2">
                <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="inline-flex items-center gap-2">
                    <ClientSparkline clientName={c.name} history={data.merHistory} />
                    <span className="font-mono-data font-semibold text-foreground tabular-nums">{c.completionPct}%</span>
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={c.completionPct}
                  aria-label="Completion"
                >
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${c.completionPct}%`, backgroundColor: getBarColor(c.completionPct) }} />
                </div>
              </div>
              {/* Metric strip — three equal cells so every card is the same height.
                  "Issues" is always rendered: 0 → muted "None", >0 → clickable count. */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="min-w-0">
                  <span className="text-muted-foreground">Last Reconciled</span>
                  <p className="font-mono-data tabular-nums text-foreground truncate" title={c.lastReconciledDate || undefined}>{c.lastReconciledDate || "—"}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Uncat. Txns</span>
                  <p className="font-mono-data tabular-nums text-foreground">{c.uncategorizedTransactions}</p>
                </div>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (issues.length > 0) toggleIssues(c.id);
                  }}
                  disabled={issues.length === 0}
                  aria-expanded={issues.length > 0 ? expandedIssues.has(c.id) : undefined}
                  aria-label={issues.length === 0 ? "No issues" : `${issues.length} issues — ${expandedIssues.has(c.id) ? "hide" : "show"} details`}
                  className="flex flex-col items-start text-left rounded-sm disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="text-muted-foreground">Issues</span>
                  {issues.length === 0 ? (
                    <span className="font-mono-data tabular-nums text-success">None</span>
                  ) : (
                    <span className="font-mono-data tabular-nums text-destructive inline-flex items-center gap-0.5">
                      {issues.length}
                      <ChevronRight className={`h-3 w-3 transition-transform ${expandedIssues.has(c.id) ? "rotate-90" : ""}`} aria-hidden="true" />
                    </span>
                  )}
                </button>
              </div>
              {issues.length > 0 && expandedIssues.has(c.id) && (
                <ul className="space-y-0.5 mt-3 pt-2.5 border-t border-border/50">
                  {issues.map((issue, idx) => (
                    <li key={idx} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-destructive/60 shrink-0 mt-1.5" aria-hidden="true" />
                      <span className="break-words">{issue}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground/70 group-hover:text-primary transition-colors">
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" aria-hidden="true" /> Tap for details <span className="hidden sm:inline">· swipe ← for history</span></span>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
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
        {filtered.length === 0 && !sheetLoading && !ghlLoading && (
          mergedClients.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center text-center py-16 gap-2 rounded-xl border border-dashed border-border">
              <EmptyState
                icon={Users}
                title="No clients yet"
                hint={isLatest
                  ? "Clients tagged mer-workflow in GHL will appear here once they sync."
                  : "No MER submissions were recorded for this month."}
                variant="dashed"
              />
              {!isLatest && (
                <button
                  type="button"
                  onClick={() => setMonthFilter("current")}
                  className="mt-1 inline-flex h-8 items-center gap-1.5 text-xs font-semibold px-3 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Back to latest month
                </button>
              )}
            </div>
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center text-center py-16 gap-2 rounded-xl border border-dashed border-border">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-foreground">No clients match</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Try a different search term or remove some of the {activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}.
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-1 inline-flex h-8 items-center gap-1.5 text-xs font-semibold px-3 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Clear filters
                </button>
              )}
            </div>
          )
        )}
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

      {/* Per-client history dialog (sourced from Supabase mer_history) */}
      <Dialog open={!!historyClient} onOpenChange={(open) => !open && setHistoryClient(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-border/60 text-left">
            <DialogTitle className="flex items-center gap-2 pr-8 min-w-0">
              <History className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <span className="truncate min-w-0" title={historyClient ?? undefined}>{historyClient} – Monthly History</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Every MER submission recorded for this client, newest first.
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 sm:px-6 py-4 overflow-y-auto min-h-0 flex-1 scrollbar-thin">
            {historyClient && <MerHistoryList clientName={historyClient} />}
          </div>
        </DialogContent>
      </Dialog>



      {/* Save filter dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 text-left">
            <DialogTitle className="flex items-center gap-2 pr-8">
              <BookmarkPlus className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              Save Filter View
            </DialogTitle>
            <DialogDescription className="text-xs">Give your current filter combination a name.</DialogDescription>
          </DialogHeader>
          <div className="px-4 sm:px-6 pb-4 space-y-4 overflow-y-auto min-h-0">
            <div className="space-y-1.5">
              <label htmlFor="save-filter-name" className="text-xs font-medium text-foreground">View name</label>
              <input
                id="save-filter-name"
                autoFocus
                type="text"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
                placeholder="e.g. My non-compliant clients"
                autoComplete="off"
                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Included filters</p>
              <p><span className="font-semibold text-foreground">Search:</span> {search || "—"}</p>
              <p><span className="font-semibold text-foreground">Status:</span> {statusFilter}</p>
              <p><span className="font-semibold text-foreground">Bookkeeper:</span> {bookkeeperFilter || "any"}</p>
              <p><span className="font-semibold text-foreground">Type:</span> {typeFilter || "any"}</p>
              <p><span className="font-semibold text-foreground">Min completion:</span> <span className="font-mono-data tabular-nums">{minCompletion}%</span></p>
            </div>
          </div>
          <DialogFooter className="flex-row items-center justify-end gap-2 px-4 sm:px-6 py-3 border-t border-border/60 sm:space-x-0">
            <button type="button" onClick={() => setShowSaveDialog(false)} className="h-9 text-xs px-3 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              Cancel
            </button>
            <button type="button" onClick={handleSaveFilter} disabled={!newFilterName.trim()}
              className="h-9 text-xs px-4 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              Save view
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={comingSoon.open} onOpenChange={(o) => setComingSoon((s) => ({ ...s, open: o }))}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-5">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              {comingSoon.title}
            </DialogTitle>
            <DialogDescription>{comingSoon.message}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Placeholder shaped like a client card so the grid doesn't jump when data lands. */
function ClientCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-4 density-card">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-5 w-12 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 rounded-md mb-2" />
      <div className="mb-2 space-y-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3.5 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-border/50">
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

interface MerHistoryRowDB {
  id: string;
  client_name: string;
  status: string | null;
  bookkeeper: string | null;
  submitted_by: string | null;
  action: string | null;
  source: string | null;
  month: string | null;
  timestamp: string | null;
}

function MerHistoryList({ clientName }: { clientName: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["mer-history", clientName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mer_history")
        .select("id, client_name, status, bookkeeper, submitted_by, action, source, month, timestamp")
        .eq("client_name", clientName)
        .order("timestamp", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MerHistoryRowDB[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5 mt-2" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading history…</span>
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <ol className="relative border-l border-border ml-2 space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <li key={i} className="ml-4">
                  <Skeleton className="h-[92px] rounded-lg" />
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 gap-2" role="alert">
        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground">Failed to load history</p>
        <p className="text-xs text-muted-foreground">Please close and try again.</p>
      </div>
    );
  }
  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <EmptyState icon={History} title="No history found" hint="Submissions will appear here once a MER is recorded." />
    );
  }

  // Group by month (preserve DESC order from query)
  const groups = new Map<string, MerHistoryRowDB[]>();
  for (const r of rows) {
    const key = r.month || "Unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const fmtTs = (ts: string | null) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toLocaleString();
  };

  return (
    <div className="space-y-5 mt-2">
      <p className="text-xs text-muted-foreground font-mono-data tabular-nums">
        {rows.length} entr{rows.length === 1 ? "y" : "ies"} on record
      </p>
      {Array.from(groups.entries()).map(([month, items]) => (
        <div key={month}>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
            {month}
          </div>
          <ol className="relative border-l border-border ml-2 space-y-3">
            {items.map((e) => (
              <li key={e.id} className="ml-4">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                <div className="rounded-lg border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-foreground break-words">
                      {e.status || "—"}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground font-mono-data tabular-nums">
                      {fmtTs(e.timestamp)}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <p><span className="font-semibold text-foreground">Bookkeeper:</span> {e.bookkeeper || "—"}</p>
                    <p><span className="font-semibold text-foreground">Submitted By:</span> {e.submitted_by || "—"}</p>
                    <p><span className="font-semibold text-foreground">Action:</span> {e.action || "—"}</p>
                    <p><span className="font-semibold text-foreground">Source:</span> {e.source || "—"}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

