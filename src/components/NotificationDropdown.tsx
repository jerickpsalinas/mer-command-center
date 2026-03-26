import { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle2, XCircle, AlertTriangle, FileText, TrendingUp, TrendingDown, Clock, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Client, MonthlyTrend } from "@/data/mockData";

interface Notification {
  id: string;
  icon: React.ElementType;
  message: string;
  variant: "success" | "destructive" | "warning" | "default";
  time: string;
  detail?: string;
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

const variantDot: Record<string, string> = {
  success: "bg-success",
  destructive: "bg-destructive",
  warning: "bg-warning",
  default: "bg-muted-foreground",
};

export default function NotificationDropdown({ clients, trends }: { clients: Client[]; trends: MonthlyTrend[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notifications = generateNotifications(clients, trends);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Bell className="h-[18px] w-[18px]" />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 w-96 rounded-xl border border-border bg-card shadow-elevated z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Notifications</p>
              <p className="text-[11px] text-muted-foreground">{notifications.length} updates from current data</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n, i) => (
                <motion.div key={n.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors"
                >
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${variantDot[n.variant]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground leading-relaxed">{n.message}</p>
                    {n.detail && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{n.detail}</p>}
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
