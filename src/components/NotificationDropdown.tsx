import { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle2, XCircle, AlertTriangle, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Client, MonthlyTrend } from "@/data/mockData";

interface Notification {
  id: string;
  icon: React.ElementType;
  message: string;
  variant: "success" | "destructive" | "warning" | "default";
}

function generateNotifications(clients: Client[], trends: MonthlyTrend[]): Notification[] {
  const notes: Notification[] = [];

  const compliant = clients.filter(c => c.complianceStatus === "Compliant").length;
  const nonCompliant = clients.filter(c => c.complianceStatus === "Non-Compliant").length;
  const missing = clients.filter(c => c.bankTransactions.includes("Missing"));
  const uncat = clients.filter(c => c.uncategorizedTransactions > 0);

  notes.push({
    id: "summary",
    icon: CheckCircle2,
    message: `${compliant} clients compliant, ${nonCompliant} non-compliant`,
    variant: compliant > nonCompliant ? "success" : "destructive",
  });

  if (missing.length > 0) {
    notes.push({
      id: "missing",
      icon: AlertTriangle,
      message: `${missing.length} client${missing.length > 1 ? "s" : ""} with missing bank statements`,
      variant: "destructive",
    });
  }

  if (uncat.length > 0) {
    notes.push({
      id: "uncat",
      icon: FileText,
      message: `${uncat.length} client${uncat.length > 1 ? "s" : ""} have uncategorized transactions`,
      variant: "warning",
    });
  }

  if (trends.length >= 2) {
    const latest = trends[trends.length - 1];
    const prev = trends[trends.length - 2];
    const diff = latest.completionPct - prev.completionPct;
    notes.push({
      id: "trend",
      icon: diff >= 0 ? TrendingUp : TrendingDown,
      message: `Completion ${diff >= 0 ? "up" : "down"} ${Math.abs(diff)}pp from ${prev.month}`,
      variant: diff >= 0 ? "success" : "destructive",
    });
  }

  const noNotes = clients.filter(c => !c.prevMonthNotesApproved).length;
  if (noNotes > 0) {
    notes.push({
      id: "notes",
      icon: XCircle,
      message: `${noNotes} clients without approved notes`,
      variant: "warning",
    });
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
        className="relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
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
            className="absolute right-0 top-11 w-80 rounded-xl border border-border bg-card shadow-elevated z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Notifications</p>
              <p className="text-[11px] text-muted-foreground">{notifications.length} recent updates</p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${variantDot[n.variant]}`} />
                  <p className="text-[12px] text-foreground leading-relaxed">{n.message}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
