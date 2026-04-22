import { useState } from "react";
import { Settings as SettingsIcon, RefreshCw, Bell, Moon, Sun, Shield, AlertTriangle, FileText, TrendingDown, CheckCircle2, ShieldAlert, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useSheetData } from "@/hooks/useSheetData";
import { useTheme } from "@/hooks/useTheme";
import { useUserSettings, DEFAULT_THRESHOLDS, DEFAULT_NOTIF_PREFS } from "@/hooks/useUserSettings";

export default function SettingsPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [compactMode, setCompactMode] = useState(false);
  const { data } = useSheetData();
  const { theme, toggle } = useTheme();
  const { thresholds, setThresholds, notifPrefs, setNotifPrefs } = useUserSettings();
  const allBookkeepers = data?.bookkeepers ?? [];

  // Derive review period from data
  const reviewPeriod = (() => {
    if (!data?.monthlyTrends?.length) return "Loading…";
    const last = data.monthlyTrends[data.monthlyTrends.length - 1];
    return last.month;
  })();

  const trendRange = (() => {
    if (!data?.monthlyTrends?.length) return "";
    const first = data.monthlyTrends[0].month;
    const last = data.monthlyTrends[data.monthlyTrends.length - 1].month;
    return `${first} – ${last}`;
  })();

  // Notification stats
  const notifStats = (() => {
    if (!data?.clients) return { total: 0, critical: 0, warnings: 0, info: 0 };
    const clients = data.clients;
    const critical = clients.filter(c => c.bankTransactions.includes("Missing")).length +
                     clients.filter(c => c.completionPct < 40).length;
    const warnings = clients.filter(c => c.uncategorizedTransactions > 0).length +
                     clients.filter(c => c.unappliedPayments > 0).length;
    const info = clients.filter(c => !c.prevMonthNotesApproved).length;
    return { total: critical + warnings + info, critical, warnings, info };
  })();

  return (
    <div className="max-w-2xl space-y-5">
      {/* General */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">General</h2>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Organization</p>
              <p className="text-xs text-muted-foreground">Account name</p>
            </div>
            <span className="text-sm text-muted-foreground">Brant & Associates</span>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Review Period</p>
              <p className="text-xs text-muted-foreground">Current active period from spreadsheet</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-foreground">{reviewPeriod}</span>
              {trendRange && <p className="text-[10px] text-muted-foreground mt-0.5">Data: {trendRange}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Bookkeepers</p>
              <p className="text-xs text-muted-foreground">Active team members</p>
            </div>
            <span className="text-sm text-muted-foreground">{data?.bookkeepers?.length ?? 0} active</span>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Total Clients</p>
              <p className="text-xs text-muted-foreground">Tracked in current period</p>
            </div>
            <span className="text-sm font-mono-data text-foreground">{data?.clients?.length ?? 0}</span>
          </div>
        </div>
      </motion.div>

      {/* Data & Sync */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-success/10 flex items-center justify-center">
            <RefreshCw className="h-4 w-4 text-success" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Data & Sync</h2>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-Refresh</p>
              <p className="text-xs text-muted-foreground">Automatically fetch new data</p>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${autoRefresh ? "bg-primary" : "bg-muted"}`}
            >
              <motion.div
                animate={{ x: autoRefresh ? 20 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 h-4 w-4 rounded-full bg-primary-foreground shadow-sm"
              />
            </button>
          </div>
          {autoRefresh && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">Refresh Interval</p>
                <p className="text-xs text-muted-foreground">How often to sync data</p>
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground"
              >
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
            </motion.div>
          )}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Data Source</p>
              <p className="text-xs text-muted-foreground">Google Apps Script endpoint</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Connected
            </span>
          </div>
        </div>
      </motion.div>

      {/* Notifications - Enhanced */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center">
            <Bell className="h-4 w-4 text-warning" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          {notifStats.total > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {notifStats.total} active
            </span>
          )}
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Notifications</p>
              <p className="text-xs text-muted-foreground">Show alerts for compliance changes</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${notifications ? "bg-primary" : "bg-muted"}`}
            >
              <motion.div
                animate={{ x: notifications ? 20 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 h-4 w-4 rounded-full bg-primary-foreground shadow-sm"
              />
            </button>
          </div>
          {/* Alert breakdown */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Alert Breakdown</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-destructive/8 border border-destructive/15 p-3 text-center">
                <p className="text-lg font-mono-data font-bold text-destructive">{notifStats.critical}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Critical</p>
              </div>
              <div className="rounded-lg bg-warning/8 border border-warning/15 p-3 text-center">
                <p className="text-lg font-mono-data font-bold text-warning">{notifStats.warnings}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Warnings</p>
              </div>
              <div className="rounded-lg bg-muted border border-border p-3 text-center">
                <p className="text-lg font-mono-data font-bold text-foreground">{notifStats.info}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Info</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Alert Types Monitored</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Missing statements", icon: AlertTriangle, color: "text-destructive" },
                { label: "Low completion", icon: TrendingDown, color: "text-destructive" },
                { label: "Uncategorized txns", icon: FileText, color: "text-warning" },
                { label: "Compliance shifts", icon: CheckCircle2, color: "text-success" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <t.icon className={`h-3 w-3 ${t.color}`} />
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Display */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
            {theme === "dark" ? <Moon className="h-4 w-4 text-foreground" /> : <Sun className="h-4 w-4 text-foreground" />}
          </div>
          <h2 className="text-sm font-semibold text-foreground">Display</h2>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground">Switch between dark and light mode</p>
            </div>
            <button
              onClick={toggle}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${theme === "light" ? "bg-primary" : "bg-muted"}`}
            >
              <motion.div
                animate={{ x: theme === "light" ? 20 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 h-4 w-4 rounded-full bg-primary-foreground shadow-sm"
              />
            </button>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Compact Mode</p>
              <p className="text-xs text-muted-foreground">Reduce card spacing and padding</p>
            </div>
            <button
              onClick={() => setCompactMode(!compactMode)}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${compactMode ? "bg-primary" : "bg-muted"}`}
            >
              <motion.div
                animate={{ x: compactMode ? 20 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 h-4 w-4 rounded-full bg-primary-foreground shadow-sm"
              />
            </button>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Chart Animations</p>
              <p className="text-xs text-muted-foreground">Smooth transitions on all charts</p>
            </div>
            <span className="text-xs text-success font-medium">Enabled</span>
          </div>
        </div>
      </motion.div>

      {/* About */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">About</h2>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-6 py-4">
            <p className="text-sm font-medium text-foreground">Version</p>
            <span className="font-mono-data text-xs text-muted-foreground">MER Dashboard v1.0</span>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <p className="text-sm font-medium text-foreground">Built with</p>
            <span className="text-xs text-muted-foreground">React · Recharts · Framer Motion</span>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <p className="text-sm font-medium text-foreground">Data Provider</p>
            <span className="text-xs text-muted-foreground">Google Sheets via Apps Script</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
