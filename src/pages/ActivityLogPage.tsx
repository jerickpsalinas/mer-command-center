import { useEffect, useMemo, useState } from "react";
import { useSheetData } from "@/hooks/useSheetData";
import { supabase } from "@/integrations/supabase/client";
import { useDeveloperFilter } from "@/hooks/useDeveloperFilter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Search, Loader2, Calendar } from "lucide-react";

const DEVELOPER_EMAILS = new Set(["jerickpsalinas@gmail.com"]);

type UnifiedEntry = {
  id: string;
  timestamp: number;
  timestampLabel: string;
  source: "Dashboard Action" | "Action Log" | "MER History" | "Status Change";
  action: string;
  clientName: string;
  triggeredBy: string;
  category: string;
  details?: string;
};

function categoryColor(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes("submit") || c.includes("add") || c.includes("create")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (c.includes("update") || c.includes("edit")) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (c.includes("delete") || c.includes("remove") || c.includes("clear")) return "bg-red-500/15 text-red-400 border-red-500/30";
  if (c.includes("bank") || c.includes("reconnect")) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (c.includes("doc") || c.includes("request")) return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  if (c.includes("resolve") || c.includes("approve")) return "bg-teal-500/15 text-teal-400 border-teal-500/30";
  return "bg-muted text-muted-foreground border-border";
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

type Profile = { id: string; name: string; email: string; role: string };

export default function ActivityLogPage() {
  const { data } = useSheetData();
  const [merHistory, setMerHistory] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [dashboardActions, setDashboardActions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bookkeeper, setBookkeeper] = useState<string>("all");
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
        source: "Action Log",
        action: a.actionType,
        clientName: a.clientName,
        triggeredBy: a.triggeredBy || "—",
        category: a.actionType,
        details: a.notes || a.status,
      });
    }

    for (const r of merHistory) {
      const ts = r.timestamp ? Date.parse(r.timestamp) : (r.created_at ? Date.parse(r.created_at) : 0);
      const action = r.action || "MER Submission";
      out.push({
        id: `mh-${r.id}`,
        timestamp: ts,
        timestampLabel: formatTs(ts),
        source: "MER History",
        action,
        clientName: r.client_name || "—",
        triggeredBy: r.submitted_by || r.bookkeeper || "—",
        category: action,
        details: r.month ? `Cycle: ${r.month}` : undefined,
      });
    }

    for (const s of statusHistory) {
      const ts = s.recorded_at ? Date.parse(s.recorded_at) : 0;
      out.push({
        id: `sh-${s.id}`,
        timestamp: ts,
        timestampLabel: formatTs(ts),
        source: "Status Change",
        action: "Status Change",
        clientName: s.client_name || "—",
        triggeredBy: s.changed_by || "—",
        category: "update",
        details: s.status ? `Status: ${s.status}` : undefined,
      });
    }

    // Dashboard CTA button actions (Bank Reconnect, Docs Request, Notes
    // Approval, Mark Resolved, etc.) — recorded by fireDashboardAction().
    for (const a of dashboardActions) {
      const ts = a.created_at ? Date.parse(a.created_at) : 0;
      // Humanize "bank-reconnection" -> "Bank Reconnection"
      const pretty = String(a.action || "")
        .split(/[-_]/)
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ") || "Dashboard Action";
      out.push({
        id: `da-${a.id}`,
        timestamp: ts,
        timestampLabel: formatTs(ts),
        source: "Dashboard Action",
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
      });
    }

    return out
      .filter((e) => !isDeveloper(e.triggeredBy))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [data?.actionLog, merHistory, statusHistory, dashboardActions, isDeveloper]);

  // Dropdown lists active non-developer users from user_profiles (so newly
  // added users show up immediately, even before they've taken any action).
  const bookkeepers = useMemo(() => {
    const names = new Set<string>();
    for (const p of profiles) {
      if ((p.role || "").toLowerCase() === "developer") continue;
      if (p.name) names.add(p.name);
    }
    // Also include any actor names found in entries that aren't in user_profiles yet.
    entries.forEach((e) => {
      if (e.triggeredBy && e.triggeredBy !== "—") names.add(e.triggeredBy);
    });
    return Array.from(names).sort();
  }, [profiles, entries]);

  const actionTypes = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => e.action && s.add(e.action));
    return Array.from(s).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = fromDate ? Date.parse(fromDate) : 0;
    const toMs = toDate ? Date.parse(toDate) + 24 * 60 * 60 * 1000 : 0;
    return entries.filter((e) => {
      if (q && !e.clientName.toLowerCase().includes(q)) return false;
      if (bookkeeper !== "all" && e.triggeredBy !== bookkeeper) return false;
      if (actionType !== "all" && e.action !== actionType) return false;
      if (fromMs && e.timestamp < fromMs) return false;
      if (toMs && e.timestamp > toMs) return false;
      return true;
    });
  }, [entries, search, bookkeeper, actionType, fromDate, toDate]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground">Activity Log</h2>
          <p className="text-xs text-muted-foreground">Unified history of dashboard actions and MER submissions.</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-border p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={bookkeeper} onValueChange={setBookkeeper}>
          <SelectTrigger><SelectValue placeholder="Bookkeeper" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {bookkeepers.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger><SelectValue placeholder="Action type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actionTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2 lg:col-span-2">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="activity-date-input flex-1 min-w-0" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="activity-date-input flex-1 min-w-0" />
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">{filtered.length} entries</span>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
          {filtered.length === 0 && !loading && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No activity matches your filters.</div>
          )}
          {filtered.map((e) => (
            <div key={e.id} className="px-4 py-3 hover:bg-accent/40 transition-colors flex flex-wrap items-start gap-3">
              <div className="min-w-[160px] text-[11px] font-mono text-muted-foreground tabular-nums">
                {e.timestampLabel}
              </div>
              <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wide ${categoryColor(e.category)}`}>
                {e.action}
              </Badge>
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-medium text-foreground break-words">{e.clientName}</p>
                {e.details && (
                  <p className="text-[11px] text-muted-foreground break-words mt-0.5">{e.details}</p>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground text-right min-w-[140px]">
                <p className="font-medium text-foreground/80">{e.triggeredBy}</p>
                <p className="text-muted-foreground/70">{e.source}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
