import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSheetData } from "@/hooks/useSheetData";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useDeveloperFilter } from "@/hooks/useDeveloperFilter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Activity, ClipboardList, Search, Loader2, Calendar, Download, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

const DEVELOPER_EMAILS = new Set(["jerickpsalinas@gmail.com"]);

type SourceLabel = "Dashboard" | "Slack" | "Slack / Automation";

type UnifiedEntry = {
  id: string;
  timestamp: number;
  timestampLabel: string;
  rawSource: "Dashboard Action" | "Action Log" | "MER History" | "Status Change";
  source: SourceLabel;
  action: string;
  clientName: string;
  triggeredBy: string;
  category: string;
  details?: string;
  page: string;
};

// All chips route through the design tokens so they stay legible in both
// dark and light themes. Docs/requests reuse the `info` token (defined but
// previously unused per audit).
function categoryColor(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes("submit") || c.includes("add") || c.includes("create")) return "bg-success/15 text-success border-success/30";
  if (c.includes("update") || c.includes("edit")) return "bg-info/15 text-info border-info/30";
  if (c.includes("delete") || c.includes("remove") || c.includes("clear")) return "bg-destructive/15 text-destructive border-destructive/30";
  if (c.includes("bank") || c.includes("reconnect")) return "bg-warning/15 text-warning border-warning/30";
  if (c.includes("doc") || c.includes("request")) return "bg-primary/15 text-primary border-primary/30";
  if (c.includes("resolve") || c.includes("approve")) return "bg-success/15 text-success border-success/30";
  return "bg-muted text-muted-foreground border-border";
}

function sourceColor(src: SourceLabel): string {
  switch (src) {
    case "Dashboard":
      return "bg-primary/15 text-primary border-primary/30";
    case "Slack":
      return "bg-info/15 text-info border-info/30";
    case "Slack / Automation":
      return "bg-info/10 text-info border-info/20";
  }
}

function parseTs(s: string): number {
  if (!s) return 0;
  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

function formatTs(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

function isDashboardUser(name?: string | null): boolean {
  return !!name && name.trim().toLowerCase().includes("dashboard");
}

function prettifyAction(action: string): string {
  return String(action || "")
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ") || "Dashboard Action";
}

type Profile = { id: string; name: string; email: string; role: string };

function csvEscape(v: string): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows: UnifiedEntry[], filename: string) {
  const header = ["Timestamp", "Activity", "Client", "Page", "User", "Source", "Details"];
  const lines = [header.join(",")];
  for (const e of rows) {
    lines.push([
      csvEscape(e.timestampLabel),
      csvEscape(e.action),
      csvEscape(e.clientName),
      csvEscape(e.page),
      csvEscape(e.triggeredBy),
      csvEscape(e.source),
      csvEscape(e.details ?? ""),
    ].join(","));
  }
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ActivityLogPage() {
  const navigate = useNavigate();
  const { data } = useSheetData();
  const [merHistory, setMerHistory] = useState<Tables<"mer_history">[]>([]);
  const [statusHistory, setStatusHistory] = useState<Tables<"client_status_history">[]>([]);
  const [dashboardActions, setDashboardActions] = useState<Tables<"activity_log">[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bookkeeper, setBookkeeper] = useState<string>("all");
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [actionType, setActionType] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const { isDeveloper } = useDeveloperFilter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [merRes, statusRes, actionsRes, profilesRes] = await Promise.all([
        supabase.from("mer_history").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("client_status_history").select("*").order("recorded_at", { ascending: false }).limit(2000),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(2000),
        supabase.from("user_profiles").select("id,name,email,role"),
      ]);
      if (!cancelled) {
        setMerHistory(merRes.data ?? []);
        setStatusHistory(statusRes.data ?? []);
        setDashboardActions(actionsRes.data ?? []);
        setProfiles((profilesRes.data ?? []) as Profile[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const entries: UnifiedEntry[] = useMemo(() => {
    const out: UnifiedEntry[] = [];

    for (const a of data?.actionLog ?? []) {
      const ts = parseTs(a.timestamp);
      out.push({
        id: `al-${a.ghlContactId}-${a.timestamp}-${a.actionType}`,
        timestamp: ts,
        timestampLabel: formatTs(ts),
        rawSource: "Action Log",
        source: "Slack / Automation",
        action: a.actionType,
        clientName: a.clientName,
        triggeredBy: a.triggeredBy || "—",
        category: a.actionType,
        details: a.notes || a.status,
        page: "Slack / Automation",
      });
    }

    for (const r of merHistory) {
      const ts = r.timestamp ? Date.parse(r.timestamp) : (r.created_at ? Date.parse(r.created_at) : 0);
      const action = r.action || "MER Submission";
      const submittedBy = r.submitted_by || r.bookkeeper || "—";
      out.push({
        id: `mh-${r.id}`,
        timestamp: ts,
        timestampLabel: formatTs(ts),
        rawSource: "MER History",
        source: isDashboardUser(submittedBy) ? "Dashboard" : "Slack",
        action,
        clientName: r.client_name || "—",
        triggeredBy: submittedBy,
        category: action,
        details: r.month ? `Cycle: ${r.month}` : undefined,
        page: "Dashboard",
      });
    }

    for (const s of statusHistory) {
      const ts = s.recorded_at ? Date.parse(s.recorded_at) : 0;
      out.push({
        id: `sh-${s.id}`,
        timestamp: ts,
        timestampLabel: formatTs(ts),
        rawSource: "Status Change",
        source: "Dashboard",
        action: "Status Change",
        clientName: s.client_name || "—",
        triggeredBy: s.changed_by?.trim() || "System",
        category: "update",
        details: s.status ? `Status: ${s.status}` : undefined,
        page: "Dashboard",
      });
    }

    for (const a of dashboardActions) {
      const ts = a.created_at ? Date.parse(a.created_at) : 0;
      const pretty = prettifyAction(a.action);
      const msg = String(a.message || "");
      const source: SourceLabel = msg.toLowerCase().includes("slack")
        ? "Slack"
        : "Dashboard";
      out.push({
        id: `da-${a.id}`,
        timestamp: ts,
        timestampLabel: formatTs(ts),
        rawSource: "Dashboard Action",
        source,
        action: pretty,
        clientName: a.client_name || "—",
        triggeredBy: a.triggered_by || "—",
        category: pretty,
        details: [
          a.success === false ? "❌ Failed" : null,
          a.message || null,
          a.cycle_month ? `Cycle: ${a.cycle_month}` : null,
          a.bookkeeper ? `Bookkeeper: ${a.bookkeeper}` : null,
        ].filter(Boolean).join(" · ") || undefined,
        page: a.page || "Dashboard",
      });
    }

    return out.sort((a, b) => b.timestamp - a.timestamp);
  }, [data?.actionLog, merHistory, statusHistory, dashboardActions]);

  const bookkeepers = useMemo(() => {
    const names = new Set<string>();
    const devEmails = new Set<string>([...DEVELOPER_EMAILS]);
    for (const p of profiles) {
      if ((p.role || "").toLowerCase() === "developer" && p.email) {
        devEmails.add(p.email.trim().toLowerCase());
      }
    }
    const add = (v?: string | null) => {
      if (!v) return;
      const trimmed = v.trim();
      if (!trimmed || trimmed === "—") return;
      if (devEmails.has(trimmed.toLowerCase())) return;
      if (isDeveloper(trimmed)) return;
      names.add(trimmed);
    };
    (data?.actionLog ?? []).forEach((a) => add(a.triggeredBy));
    merHistory.forEach((r) => add(r.submitted_by));
    statusHistory.forEach((s) => add(s.changed_by));
    dashboardActions.forEach((a) => add(a.triggered_by));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [data?.actionLog, merHistory, statusHistory, dashboardActions, profiles, isDeveloper]);

  const pages = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => e.page && s.add(e.page));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const actionTypes = useMemo(() => {
    const s = new Set<string>();
    (data?.actionLog ?? []).forEach((a) => a.actionType && s.add(a.actionType));
    merHistory.forEach((r) => r.action && s.add(r.action));
    dashboardActions.forEach((a) => a.action && s.add(prettifyAction(a.action)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [data?.actionLog, merHistory, dashboardActions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = fromDate ? Date.parse(fromDate) : 0;
    const toMs = toDate ? Date.parse(toDate) + 24 * 60 * 60 * 1000 : 0;
    return entries.filter((e) => {
      if (q && !e.clientName.toLowerCase().includes(q)) return false;
      if (bookkeeper !== "all" && e.triggeredBy !== bookkeeper) return false;
      if (pageFilter !== "all" && e.page !== pageFilter) return false;
      if (actionType !== "all" && e.action !== actionType) return false;
      if (fromMs && e.timestamp < fromMs) return false;
      if (toMs && e.timestamp > toMs) return false;
      return true;
    });
  }, [entries, search, bookkeeper, pageFilter, actionType, fromDate, toDate]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (bookkeeper !== "all" ? 1 : 0) +
    (pageFilter !== "all" ? 1 : 0) +
    (actionType !== "all" ? 1 : 0) +
    (fromDate ? 1 : 0) +
    (toDate ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setBookkeeper("all");
    setPageFilter("all");
    setActionType("all");
    setFromDate("");
    setToDate("");
  };

  const dateInputClass =
    "activity-date-input h-9 pl-7 text-center text-xs [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground">Activity Log</h2>
          <p className="text-xs text-muted-foreground">Unified history of dashboard actions and MER submissions.</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-border p-3 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
        <div className="relative flex-1 min-w-[200px] lg:min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <Input
            placeholder="Search client..."
            aria-label="Search client"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={bookkeeper} onValueChange={setBookkeeper}>
            <SelectTrigger className="h-9 w-[130px]" aria-label="Filter by user"><SelectValue placeholder="Bookkeeper" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {bookkeepers.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pageFilter} onValueChange={setPageFilter}>
            <SelectTrigger className="h-9 w-[130px]" aria-label="Filter by page"><SelectValue placeholder="Page" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pages</SelectItem>
              {pages.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={actionType} onValueChange={setActionType}>
            <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by action type"><SelectValue placeholder="Action type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative flex items-center min-w-[130px]">
            <Calendar className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
            <Input
              type="date"
              aria-label="From date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={dateInputClass}
            />
          </div>
          <div className="relative flex items-center min-w-[130px]">
            <Calendar className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
            <Input
              type="date"
              aria-label="To date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={dateInputClass}
            />
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-semibold text-muted-foreground border border-border hover:bg-accent hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-mono-data tabular-nums">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          {loading ? (
            <Skeleton className="h-4 w-20 rounded" />
          ) : (
            <span className="text-xs font-semibold text-foreground font-mono-data tabular-nums">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            </span>
          )}
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Loading activity" />}
            <button
              type="button"
              onClick={() => {
                const ts = new Date().toISOString().slice(0, 10);
                downloadCsv(filtered, `activity-log-${ts}.csv`);
              }}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold h-8 px-2.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Export current view to CSV"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
              <Badge variant="outline" className="ml-0.5 h-4 px-1 text-[9px] font-semibold border-primary/30 text-primary">CSV</Badge>
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-x-auto overflow-y-auto scrollbar-thin" aria-busy={loading}>
          <table className="w-full min-w-[640px] text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-4 py-3 hidden sm:table-cell">Date &amp; Time</th>
                <th scope="col" className="px-4 py-3">Activity</th>
                <th scope="col" className="px-4 py-3">Client</th>
                <th scope="col" className="px-4 py-3 hidden sm:table-cell">Page</th>
                <th scope="col" className="px-4 py-3">User</th>
                <th scope="col" className="px-4 py-3 hidden sm:table-cell">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-border/50">
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3.5 w-32 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-36 rounded" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24 rounded" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3.5 w-48 rounded" /></td>
                  </tr>
                ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-14">
                    <EmptyState
                      icon={Activity}
                      title="No activity found"
                      hint={
                        activeFilterCount > 0
                          ? <>No entries match your current filters.{" "}
                              <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                Clear filters
                              </button>
                            </>
                          : "Actions and MER submissions will appear here as they happen."
                      }
                      variant="plain"
                    />
                  </td>
                </tr>
              )}
              {filtered.map((e, idx) => {
                const canOpen = e.clientName && e.clientName !== "—";
                const open = () => {
                  if (canOpen) navigate(`/clients?open=${encodeURIComponent(e.clientName)}`);
                };
                return (
                <tr
                  key={e.id}
                  onClick={open}
                  onKeyDown={(ev) => {
                    if (canOpen && (ev.key === "Enter" || ev.key === " ")) {
                      ev.preventDefault();
                      open();
                    }
                  }}
                  role={canOpen ? "link" : undefined}
                  tabIndex={canOpen ? 0 : undefined}
                  aria-label={canOpen ? `Open ${e.clientName} in Clients` : undefined}
                  className={`border-b border-border/50 transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                    idx % 2 === 1 ? "bg-accent/5" : ""
                  } ${canOpen ? "cursor-pointer" : ""}`}
                  title={canOpen ? `Open ${e.clientName} in Clients` : undefined}
                >
                  <td className="px-4 py-3 align-top hidden sm:table-cell whitespace-nowrap text-[11px] font-mono-data text-muted-foreground tabular-nums">
                    {e.timestampLabel}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold uppercase tracking-wide ${categoryColor(e.category)}`}
                    >
                      {e.action}
                    </Badge>
                    <div className="sm:hidden mt-1 text-[10px] font-mono-data text-muted-foreground tabular-nums">
                      {e.timestampLabel}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top max-w-[220px]">
                    <span className="block text-sm font-semibold text-foreground truncate" title={e.clientName}>{e.clientName}</span>
                  </td>
                  <td className="px-4 py-3 align-top hidden sm:table-cell">
                    <Badge variant="outline" className={`text-[10px] font-medium ${sourceColor(e.source)}`}>
                      {e.page}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 align-top max-w-[160px]">
                    <span className="block text-xs font-semibold text-foreground/90 truncate" title={e.triggeredBy}>{e.triggeredBy}</span>
                  </td>
                  <td className="px-4 py-3 align-top hidden sm:table-cell text-[11px] text-muted-foreground break-words max-w-[320px]">
                    {e.details || "—"}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
