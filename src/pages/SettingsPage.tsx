import { useState } from "react";
import { Settings as SettingsIcon, RefreshCw, Bell, Moon, Sun, Shield, AlertTriangle, FileText, TrendingDown, CheckCircle2, ShieldAlert, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useSheetData } from "@/hooks/useSheetData";
import { useTheme } from "@/hooks/useTheme";
import { useUserSettings, DEFAULT_THRESHOLDS, DEFAULT_NOTIF_PREFS } from "@/hooks/useUserSettings";
import UserManagementSection from "@/components/UserManagementSection";
import ChangePasswordSection from "@/components/ChangePasswordSection";

export default function SettingsPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const { data } = useSheetData();
  const { theme, toggle } = useTheme();
  const { thresholds, setThresholds, notifPrefs, setNotifPrefs, density, setDensity } = useUserSettings();
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
    <div className="max-w-2xl mx-auto space-y-5">
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

      {/* At-Risk Thresholds (#3) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">At-Risk Thresholds</h2>
          <button
            onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
            className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            <RotateCcw className="h-3 w-3" />Reset
          </button>
        </div>
        <div className="divide-y divide-border">
          {[
            { key: "consecutiveNonCompliantMonths" as const, label: "Consecutive non-compliant months", help: "Flag if a client is non-compliant ≥ this many months in a row", min: 1, max: 12 },
            { key: "completionDropMonths" as const, label: "Declining completion (months)", help: "Flag if completion drops every month for ≥ this many consecutive months", min: 2, max: 12 },
            { key: "stuckInStageDays" as const, label: "Stuck in cycle stage (days)", help: "Flag clients sitting in the same Master Cycle stage longer than this", min: 1, max: 90 },
            { key: "lowCompletionPct" as const, label: "Low completion threshold (%)", help: "Flag clients whose current month completion falls below this percentage", min: 0, max: 100 },
          ].map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.help}</p>
              </div>
              <input
                type="number"
                min={row.min}
                max={row.max}
                value={thresholds[row.key]}
                onChange={(e) => setThresholds({ ...thresholds, [row.key]: Math.max(row.min, Math.min(row.max, Number(e.target.value))) })}
                className="w-16 sm:w-20 rounded-md border border-border bg-muted px-2 sm:px-3 py-1.5 text-sm font-mono-data text-foreground text-right shrink-0"
              />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Notification Preferences (#13) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border flex-wrap">
          <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4 text-warning" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Notification Preferences</h2>
          {notifStats.total > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {notifStats.total} active
            </span>
          )}
          <button
            onClick={() => setNotifPrefs(DEFAULT_NOTIF_PREFS)}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            <RotateCcw className="h-3 w-3" />Reset
          </button>
        </div>
        <div className="divide-y divide-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Filter by Bookkeeper</p>
              <p className="text-xs text-muted-foreground">Only show alerts tied to this bookkeeper's clients</p>
            </div>
            <select
              value={notifPrefs.bookkeeperFilter}
              onChange={(e) => setNotifPrefs({ ...notifPrefs, bookkeeperFilter: e.target.value })}
              className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground w-full sm:w-auto sm:max-w-[200px] truncate"
            >
              <option value="">All bookkeepers</option>
              {allBookkeepers.map((b) => <option key={b} value={b}>Only {b}</option>)}
            </select>
          </div>
          {([
            { key: "showCritical" as const, label: "Critical alerts", help: "Missing statements, low completion, stuck stages", color: "text-destructive" },
            { key: "showWarnings" as const, label: "Warning alerts", help: "Uncategorized txns, unapplied payments, missing notes", color: "text-warning" },
            { key: "showSuccess" as const, label: "Positive alerts", help: "Compliance improvements and trend ups", color: "text-success" },
            { key: "showInfo" as const, label: "Info alerts", help: "Summary updates and other context", color: "text-muted-foreground" },
          ]).map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${row.color}`}>{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.help}</p>
              </div>
              <button
                onClick={() => setNotifPrefs({ ...notifPrefs, [row.key]: !notifPrefs[row.key] })}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0 ${notifPrefs[row.key] ? "bg-primary" : "bg-muted"}`}
              >
                <motion.div
                  animate={{ x: notifPrefs[row.key] ? 20 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-1 h-4 w-4 rounded-full bg-primary-foreground shadow-sm"
                />
              </button>
            </div>
          ))}
          {/* Live alert breakdown (read-only) */}
          <div className="px-4 sm:px-6 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Alert Volume</p>
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
          <div className="flex items-center justify-between gap-3 px-6 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Density</p>
              <p className="text-xs text-muted-foreground">Comfortable spacing or tighter, more data on screen</p>
            </div>
            <div className="inline-flex rounded-lg border border-border bg-muted p-0.5 shrink-0">
              {(["comfortable", "compact"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors capitalize ${
                    density === d ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
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

      <UserManagementSection />
    </div>
  );
}
