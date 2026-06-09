import { useState, useRef, useEffect } from "react";
import { Activity as ActivityIcon, CheckCircle2, XCircle, AlertTriangle, FileText, TrendingUp, TrendingDown, Clock, Users, Filter as FilterIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Client, MonthlyTrend } from "@/data/mockData";
import { useUserSettings } from "@/hooks/useUserSettings";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/toastLog";

interface ActivityRow {
  id: string;
  action: string;
  client_name: string | null;
  bookkeeper: string | null;
  cycle_month: string | null;
  triggered_by: string | null;
  success: boolean;
  message: string | null;
  created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  "bank-reconnection": "Bank reconnection requested",
  "missing-statement": "Statement requested",
  "notes-approval": "Notes approved",
  "undo-notes-approval": "Notes approval undone",
  "mark-resolved": "Marked resolved",
  "mark-statement-resolved": "Statement marked resolved",
  "clear-mer-data": "Cleared MER data",
};

interface Notification {
  id: string;
  icon: React.ElementType;
  message: string;
  variant: "success" | "destructive" | "warning" | "default";
  time: string;
  detail?: string;
  bookkeeper?: string;     // optional — present when alert ties to a single bookkeeper's clients
}

function generateNotifications(clients: Client[], trends: MonthlyTrend[]): Notification[] {
  const notes: Notification[] = [];

  const compliant = clients.filter(c => c.complianceStatus === "Compliant").length;
  const nonCompliant = clients.filter(c => c.complianceStatus === "Non-Compliant").length;
  const onHold = clients.filter(c => c.complianceStatus === "On Hold").length;
  const missing = clients.filter(c => c.bankTransactions.includes("Missing"));
  const uncat = clients.filter(c => c.uncategorizedTransactions > 0);
  const noNotes = clients.filter(c => !c.prevMonthNotesApproved).length;
  const lowCompletion = clients.filter(c => c.completionPct < 40);
  const highUnapplied = clients.filter(c => c.unappliedPayments > 0);

  const dominantBookkeeper = (group: Client[]): string | undefined => {
    if (!group.length) return undefined;
    const counts = new Map<string, number>();
    for (const c of group) counts.set(c.bookkeeper, (counts.get(c.bookkeeper) ?? 0) + 1);
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    // Tag only when one bookkeeper accounts for >50% of the group
    return sorted[0][1] / group.length > 0.5 ? sorted[0][0] : undefined;
  };

  notes.push({
    id: "summary",
    icon: CheckCircle2,
    message: `${compliant} clients compliant, ${nonCompliant} non-compliant, ${onHold} on hold`,
    variant: compliant > nonCompliant ? "success" : "destructive",
    time: "2m ago",
    detail: `Total: ${clients.length} clients tracked`,
  });

  if (missing.length > 0) {
    notes.push({
      id: "missing",
      icon: AlertTriangle,
      message: `${missing.length} client${missing.length > 1 ? "s" : ""} with missing bank statements`,
      variant: "destructive",
      time: "5m ago",
      detail: missing.slice(0, 3).map(c => c.name).join(", ") + (missing.length > 3 ? ` +${missing.length - 3} more` : ""),
      bookkeeper: dominantBookkeeper(missing),
    });
  }

  if (uncat.length > 0) {
    const totalUncat = uncat.reduce((s, c) => s + c.uncategorizedTransactions, 0);
    notes.push({
      id: "uncat",
      icon: FileText,
      message: `${uncat.length} client${uncat.length > 1 ? "s" : ""} have ${totalUncat} uncategorized transactions`,
      variant: "warning",
      time: "8m ago",
      detail: uncat.sort((a, b) => b.uncategorizedTransactions - a.uncategorizedTransactions).slice(0, 3).map(c => `${c.name} (${c.uncategorizedTransactions})`).join(", "),
      bookkeeper: dominantBookkeeper(uncat),
    });
  }

  if (trends.length >= 2) {
    const latest = trends[trends.length - 1];
    const prev = trends[trends.length - 2];
    const diff = latest.completionPct - prev.completionPct;
    notes.push({
      id: "trend",
      icon: diff >= 0 ? TrendingUp : TrendingDown,
      message: `Completion ${diff >= 0 ? "up" : "down"} ${Math.abs(diff)}pp from ${prev.month} to ${latest.month}`,
      variant: diff >= 0 ? "success" : "destructive",
      time: "12m ago",
      detail: `${prev.month}: ${prev.completionPct}% → ${latest.month}: ${latest.completionPct}%`,
    });
  }

  if (noNotes > 0) {
    notes.push({
      id: "notes",
      icon: XCircle,
      message: `${noNotes} clients without approved notes`,
      variant: "warning",
      time: "15m ago",
    });
  }

  if (lowCompletion.length > 0) {
    notes.push({
      id: "low-completion",
      icon: AlertTriangle,
      message: `${lowCompletion.length} clients below 40% completion`,
      variant: "destructive",
      time: "20m ago",
      detail: lowCompletion.sort((a, b) => a.completionPct - b.completionPct).slice(0, 3).map(c => `${c.name} (${c.completionPct}%)`).join(", "),
      bookkeeper: dominantBookkeeper(lowCompletion),
    });
  }

  if (highUnapplied.length > 0) {
    const totalUnapplied = highUnapplied.reduce((s, c) => s + c.unappliedPayments, 0);
    notes.push({
      id: "unapplied",
      icon: Clock,
      message: `${highUnapplied.length} clients with ${totalUnapplied} unapplied payments`,
      variant: "warning",
      time: "25m ago",
      detail: highUnapplied.slice(0, 2).map(c => `${c.name} (${c.unappliedPayments})`).join(", "),
      bookkeeper: dominantBookkeeper(highUnapplied),
    });
  }

  if (trends.length >= 2) {
    const latest = trends[trends.length - 1];
    const prev = trends[trends.length - 2];
    const compDiff = latest.compliant - prev.compliant;
    if (compDiff !== 0) {
      notes.push({
        id: "compliance-shift",
        icon: Users,
        message: `Compliant clients ${compDiff > 0 ? "increased" : "decreased"} by ${Math.abs(compDiff)} from ${prev.month}`,
        variant: compDiff > 0 ? "success" : "destructive",
        time: "30m ago",
        detail: `${prev.month}: ${prev.compliant} → ${latest.month}: ${latest.compliant}`,
      });
    }
  }

  return notes;
}

export default function NotificationDropdown({ clients, trends }: { clients: Client[]; trends: MonthlyTrend[] }) {
  const [open, setOpen] = useState(false);
  const [filterVariant, setFilterVariant] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { notifPrefs, setNotifPrefs } = useUserSettings();
  const allBookkeepers = Array.from(new Set(clients.map((c) => c.bookkeeper).filter(Boolean))).sort();

  // Shared activity feed (Supabase-backed, all users)
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<number>(() => {
    const v = Number(localStorage.getItem("activity-last-seen-at") || 0);
    return Number.isFinite(v) ? v : 0;
  });

  useEffect(() => {
    // Demo Mode — hardcoded team activity feed (no backend)
    const DEMO_ACTIVITY: ActivityRow[] = [
      { id: "n1", action: "missing-statement", client_name: "Sunrise Wellness Spa", bookkeeper: "Marcus", cycle_month: "Aug 2025", triggered_by: "System", success: false, message: "bank statement still not received", created_at: new Date(Date.now() - 120000).toISOString() },
      { id: "n2", action: "mark-resolved", client_name: "Maple Street Tax Co.", bookkeeper: "Sarah", cycle_month: "Aug 2025", triggered_by: "Sarah", success: true, message: "books closed successfully", created_at: new Date(Date.now() - 900000).toISOString() },
      { id: "n3", action: "missing-statement", client_name: "Willow Creek Day Care", bookkeeper: "Sarah", cycle_month: "Aug 2025", triggered_by: "System", success: false, message: "14 days without documents, critical", created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: "n4", action: "mark-resolved", client_name: "Green Valley Farms", bookkeeper: "Tyler", cycle_month: "Aug 2025", triggered_by: "Tyler", success: true, message: "financials sent to client", created_at: new Date(Date.now() - 7200000).toISOString() },
      { id: "n5", action: "notes-approval", client_name: null, bookkeeper: null, cycle_month: "Aug 2025", triggered_by: "System", success: true, message: "August 2025 compliance report ready — 26 compliant, 10 non-compliant", created_at: new Date(Date.now() - 10800000).toISOString() },
    ];
    setActivity(DEMO_ACTIVITY);
  }, []);


  const unreadActivityCount = activity.filter((a) => new Date(a.created_at).getTime() > lastSeenAt).length;

  const allNotifications = generateNotifications(clients, trends);

  // Apply user preferences
  const notifications = allNotifications.filter((n) => {
    if (n.variant === "destructive" && !notifPrefs.showCritical) return false;
    if (n.variant === "warning" && !notifPrefs.showWarnings) return false;
    if (n.variant === "default" && !notifPrefs.showInfo) return false;
    if (n.variant === "success" && !notifPrefs.showSuccess) return false;
    if (notifPrefs.bookkeeperFilter && n.bookkeeper && n.bookkeeper !== notifPrefs.bookkeeperFilter) return false;
    return true;
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const criticalCount = notifications.filter(n => n.variant === "destructive").length;
  const warningCount = notifications.filter(n => n.variant === "warning").length;
  const successCount = notifications.filter(n => n.variant === "success").length;

  const displayed = filterVariant ? notifications.filter(n => n.variant === filterVariant) : notifications;
  const hasPrefFilter = !!notifPrefs.bookkeeperFilter;

  const toggleFilter = (variant: string) => {
    setFilterVariant(prev => prev === variant ? null : variant);
  };

  // Mark as read once dropdown opens
  useEffect(() => {
    if (open && unreadActivityCount > 0) {
      const t = setTimeout(() => {
        const now = Date.now();
        localStorage.setItem("activity-last-seen-at", String(now));
        setLastSeenAt(now);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [open, unreadActivityCount]);

  const totalBadge = notifications.length + unreadActivityCount;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Activity"
      >
        <ActivityIcon className="h-[18px] w-[18px]" />
        {totalBadge > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center ring-2 ring-card tabular-nums">
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
      </button>


      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 w-[380px] sm:w-[420px] rounded-xl border border-border bg-card shadow-elevated z-50"
          >
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Activity</p>
                <div className="flex items-center gap-1.5">
                  {criticalCount > 0 && (
                    <button onClick={() => toggleFilter("destructive")}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${filterVariant === "destructive" ? "bg-destructive text-destructive-foreground ring-1 ring-destructive" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}`}>
                      {criticalCount} critical
                    </button>
                  )}
                  {warningCount > 0 && (
                    <button onClick={() => toggleFilter("warning")}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${filterVariant === "warning" ? "bg-warning text-warning-foreground ring-1 ring-warning" : "bg-warning/10 text-warning hover:bg-warning/20"}`}>
                      {warningCount} warnings
                    </button>
                  )}
                  {successCount > 0 && (
                    <button onClick={() => toggleFilter("success")}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${filterVariant === "success" ? "bg-success text-success-foreground ring-1 ring-success" : "bg-success/10 text-success hover:bg-success/20"}`}>
                      {successCount} good
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {filterVariant ? `${displayed.length} of ${notifications.length}` : notifications.length} updates from live data
                {filterVariant && <button onClick={() => setFilterVariant(null)} className="ml-1.5 text-primary hover:underline cursor-pointer">clear</button>}
              </p>

              {/* Bookkeeper preference quick filter */}
              <div className="mt-2.5 flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5">
                <FilterIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                <select
                  value={notifPrefs.bookkeeperFilter}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, bookkeeperFilter: e.target.value })}
                  className="bg-card text-[11px] text-foreground outline-none flex-1 cursor-pointer"
                >
                  <option value="" className="bg-popover text-popover-foreground">All bookkeepers</option>
                  {allBookkeepers.map((b) => <option key={b} value={b} className="bg-popover text-popover-foreground">Only {b}</option>)}
                </select>
                {hasPrefFilter && (
                  <button onClick={() => setNotifPrefs({ ...notifPrefs, bookkeeperFilter: "" })}
                    className="h-4 w-4 rounded hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
              {/* Shared activity feed (Supabase, all users) */}
              {activity.length > 0 && (
                <div className="border-b border-border/50">
                  <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                      <ActivityIcon className="h-3 w-3" /> Team activity
                    </p>
                    <span className="text-[10px] text-muted-foreground">{activity.length}</span>
                  </div>
                  {activity.slice(0, 8).map((a) => {
                    const isUnread = new Date(a.created_at).getTime() > lastSeenAt;
                    const variant = a.success ? "success" : "destructive";
                    const label = ACTION_LABEL[a.action] || a.action;
                    return (
                      <div
                        key={a.id}
                        className={`flex items-start gap-3 px-4 py-2 hover:bg-accent/30 transition-colors ${isUnread ? "bg-primary/[0.04]" : ""}`}
                      >
                        <div className={`mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                          variant === "destructive" ? "bg-destructive/10" : "bg-success/10"
                        }`}>
                          <ActivityIcon className={`h-3 w-3 ${
                            variant === "destructive" ? "text-destructive" : "text-success"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-foreground leading-tight font-medium truncate">
                            {label}{a.client_name ? ` · ${a.client_name}` : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate">
                            {a.bookkeeper || "—"}{a.cycle_month ? ` · ${a.cycle_month}` : ""}{a.message ? ` · ${a.message}` : ""}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                          {relativeTime(new Date(a.created_at).getTime())}
                        </span>
                      </div>
                    );
                  })}
                  <div className="px-4 pb-1.5 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live data alerts</p>
                  </div>
                </div>
              )}

              {displayed.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No notifications match your filters.
                </p>
              ) : displayed.map((n, i) => (
                <motion.div key={n.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors"
                >
                  <div className={`mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                    n.variant === "destructive" ? "bg-destructive/10" :
                    n.variant === "warning" ? "bg-warning/10" :
                    n.variant === "success" ? "bg-success/10" : "bg-muted"
                  }`}>
                    <n.icon className={`h-3.5 w-3.5 ${
                      n.variant === "destructive" ? "text-destructive" :
                      n.variant === "warning" ? "text-warning" :
                      n.variant === "success" ? "text-success" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground leading-relaxed">{n.message}</p>
                    {n.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{n.detail}</p>}
                    {n.bookkeeper && (
                      <span className="inline-block mt-1 text-[9px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {n.bookkeeper}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">{n.time}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
