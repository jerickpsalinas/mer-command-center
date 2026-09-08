import { Settings as SettingsIcon, RefreshCw, Bell, Moon, Sun, Shield, ShieldAlert, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useSheetData } from "@/hooks/useSheetData";
import { useTheme } from "@/hooks/useTheme";
import { useUserSettings, DEFAULT_THRESHOLDS, DEFAULT_NOTIF_PREFS } from "@/hooks/useUserSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import UserManagementSection from "@/components/UserManagementSection";
import ChangePasswordSection from "@/components/ChangePasswordSection";

const CARD_CLASS = "rounded-xl border-border shadow-card overflow-hidden";
const HEADER_CLASS = "flex flex-row items-center gap-3 space-y-0 px-4 sm:px-6 py-4 border-b border-border";
const ROW_CLASS = "flex items-center justify-between gap-3 px-4 sm:px-6 py-4";
const RESET_BTN_CLASS =
  "ml-auto inline-flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-150 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SELECT_CLASS =
  "h-9 rounded-md border border-border bg-muted px-3 text-sm text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function SettingsPage() {
  const { data } = useSheetData();
  const { theme, toggle } = useTheme();
  const { thresholds, setThresholds, notifPrefs, setNotifPrefs, density, setDensity, syncPrefs, setSyncPrefs } = useUserSettings();
  const autoRefresh = syncPrefs.autoRefresh;
  const refreshInterval = syncPrefs.refreshInterval;
  const setAutoRefresh = (v: boolean) => setSyncPrefs({ ...syncPrefs, autoRefresh: v });
  const setRefreshInterval = (v: number) => setSyncPrefs({ ...syncPrefs, refreshInterval: v });
  const allBookkeepers = data?.bookkeepers ?? [];
  const dataReady = !!data?.monthlyTrends?.length;

  // Derive review period from data
  const reviewPeriod = (() => {
    if (!data?.monthlyTrends?.length) return "";
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
      <div className="space-y-1">
        <h1 className="text-xl font-display font-semibold text-foreground">Settings</h1>
        <p className="text-xs text-muted-foreground">Workspace info, sync, alert thresholds, notifications, and display preferences.</p>
      </div>

      {/* General */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
        <Card className={CARD_CLASS}>
          <CardHeader className={HEADER_CLASS}>
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <SettingsIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-foreground">General</CardTitle>
              <CardDescription className="text-xs">Workspace overview from the live spreadsheet.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            <div className={ROW_CLASS}>
              <div>
                <p className="text-sm font-medium text-foreground">Organization</p>
                <p className="text-xs text-muted-foreground">Account name</p>
              </div>
              <span className="text-sm text-muted-foreground">MER Command Center</span>
            </div>
            <div className={ROW_CLASS}>
              <div>
                <p className="text-sm font-medium text-foreground">Review Period</p>
                <p className="text-xs text-muted-foreground">Current active period from spreadsheet</p>
              </div>
              <div className="text-right">
                {dataReady ? (
                  <>
                    <span className="text-sm font-semibold text-foreground">{reviewPeriod}</span>
                    {trendRange && <p className="text-[10px] font-mono-data tabular-nums text-muted-foreground mt-0.5">Data: {trendRange}</p>}
                  </>
                ) : (
                  <div className="flex flex-col items-end gap-1.5" aria-busy="true">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-2.5 w-32 rounded" />
                  </div>
                )}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div>
                <p className="text-sm font-medium text-foreground">Bookkeepers</p>
                <p className="text-xs text-muted-foreground">Active team members</p>
              </div>
              {data ? (
                <span className="text-sm font-mono-data tabular-nums text-muted-foreground">{data.bookkeepers?.length ?? 0} active</span>
              ) : (
                <Skeleton className="h-4 w-16 rounded" />
              )}
            </div>
            <div className={ROW_CLASS}>
              <div>
                <p className="text-sm font-medium text-foreground">Total Clients</p>
                <p className="text-xs text-muted-foreground">Tracked in current period</p>
              </div>
              {data ? (
                <span className="text-sm font-mono-data tabular-nums text-foreground">{data.clients?.length ?? 0}</span>
              ) : (
                <Skeleton className="h-4 w-8 rounded" />
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data & Sync */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card className={CARD_CLASS}>
          <CardHeader className={HEADER_CLASS}>
            <div className="h-7 w-7 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <RefreshCw className="h-4 w-4 text-success" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-foreground">Data & Sync</CardTitle>
              <CardDescription className="text-xs">Control how often the dashboard pulls fresh data.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            <div className={ROW_CLASS}>
              <div>
                <Label htmlFor="auto-refresh" className="text-sm font-medium text-foreground cursor-pointer">Auto-Refresh</Label>
                <p className="text-xs text-muted-foreground">Automatically fetch new data</p>
              </div>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={(v) => setAutoRefresh(v)}
                aria-label="Auto-refresh"
              />
            </div>
            {autoRefresh && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className={ROW_CLASS}>
                <div>
                  <Label htmlFor="refresh-interval" className="text-sm font-medium text-foreground">Refresh Interval</Label>
                  <p className="text-xs text-muted-foreground">How often to sync data</p>
                </div>
                <select
                  id="refresh-interval"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className={SELECT_CLASS}
                >
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={300}>5 minutes</option>
                </select>
              </motion.div>
            )}
            <div className={ROW_CLASS}>
              <div>
                <p className="text-sm font-medium text-foreground">Data Source</p>
                <p className="text-xs text-muted-foreground">Google Apps Script endpoint</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                Connected
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* At-Risk Thresholds (#3) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <Card className={CARD_CLASS}>
          <CardHeader className={HEADER_CLASS}>
            <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-foreground">At-Risk Thresholds</CardTitle>
              <CardDescription className="text-xs">When a client should be flagged as at-risk.</CardDescription>
            </div>
            <button
              type="button"
              onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
              className={RESET_BTN_CLASS}
              aria-label="Reset thresholds to defaults"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />Reset
            </button>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {[
              { key: "consecutiveNonCompliantMonths" as const, label: "Consecutive non-compliant months", help: "Flag if a client is non-compliant ≥ this many months in a row", min: 1, max: 12 },
              { key: "completionDropMonths" as const, label: "Declining completion (months)", help: "Flag if completion drops every month for ≥ this many consecutive months", min: 2, max: 12 },
              { key: "stuckInStageDays" as const, label: "Stuck in cycle stage (days)", help: "Flag clients sitting in the same Master Cycle stage longer than this", min: 1, max: 90 },
              { key: "lowCompletionPct" as const, label: "Low completion threshold (%)", help: "Flag clients whose current month completion falls below this percentage", min: 0, max: 100 },
            ].map((row) => {
              const id = `threshold-${row.key}`;
              return (
                <div key={row.key} className={ROW_CLASS}>
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={id} className="text-sm font-medium text-foreground">{row.label}</Label>
                    <p id={`${id}-help`} className="text-xs text-muted-foreground">{row.help}</p>
                  </div>
                  <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={row.min}
                    max={row.max}
                    aria-describedby={`${id}-help`}
                    value={thresholds[row.key]}
                    onChange={(e) => setThresholds({ ...thresholds, [row.key]: Math.max(row.min, Math.min(row.max, Number(e.target.value))) })}
                    className="w-16 sm:w-20 h-9 rounded-md border border-border bg-muted px-2 sm:px-3 text-sm font-mono-data tabular-nums text-foreground text-right shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Preferences (#13) */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className={CARD_CLASS}>
          <CardHeader className={`${HEADER_CLASS} flex-wrap`}>
            <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4 text-warning" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-foreground">Notification Preferences</CardTitle>
              <CardDescription className="text-xs">Choose which alerts show in the activity dropdown.</CardDescription>
            </div>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              {notifStats.total > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary font-mono-data tabular-nums">
                  {notifStats.total} active
                </span>
              )}
              <button
                type="button"
                onClick={() => setNotifPrefs(DEFAULT_NOTIF_PREFS)}
                className={RESET_BTN_CLASS.replace("ml-auto ", "")}
                aria-label="Reset notification preferences to defaults"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />Reset
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4">
              <div>
                <Label htmlFor="notif-bookkeeper" className="text-sm font-medium text-foreground">Filter by Bookkeeper</Label>
                <p className="text-xs text-muted-foreground">Only show alerts tied to this bookkeeper's clients</p>
              </div>
              <select
                id="notif-bookkeeper"
                value={notifPrefs.bookkeeperFilter}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, bookkeeperFilter: e.target.value })}
                className={`${SELECT_CLASS} w-full sm:w-auto sm:max-w-[200px] truncate`}
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
            ]).map((row) => {
              const id = `notif-${row.key}`;
              return (
                <div key={row.key} className={ROW_CLASS}>
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={id} className={`text-sm font-medium cursor-pointer ${row.color}`}>{row.label}</Label>
                    <p className="text-xs text-muted-foreground">{row.help}</p>
                  </div>
                  <Switch
                    id={id}
                    checked={notifPrefs[row.key]}
                    onCheckedChange={() => setNotifPrefs({ ...notifPrefs, [row.key]: !notifPrefs[row.key] })}
                    aria-label={row.label}
                  />
                </div>
              );
            })}
            {/* Live alert breakdown (read-only) */}
            <div className="px-4 sm:px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Live Alert Volume</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-destructive/[0.08] border border-destructive/15 p-3 text-center">
                  <p className="text-lg font-mono-data tabular-nums font-bold text-destructive">{notifStats.critical}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Critical</p>
                </div>
                <div className="rounded-lg bg-warning/[0.08] border border-warning/15 p-3 text-center">
                  <p className="text-lg font-mono-data tabular-nums font-bold text-warning">{notifStats.warnings}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Warnings</p>
                </div>
                <div className="rounded-lg bg-muted border border-border p-3 text-center">
                  <p className="text-lg font-mono-data tabular-nums font-bold text-foreground">{notifStats.info}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Info</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Display */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
        <Card className={CARD_CLASS}>
          <CardHeader className={HEADER_CLASS}>
            <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
              {theme === "dark" ? <Moon className="h-4 w-4 text-foreground" aria-hidden="true" /> : <Sun className="h-4 w-4 text-foreground" aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-foreground">Display</CardTitle>
              <CardDescription className="text-xs">Theme and layout density.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            <div className={ROW_CLASS}>
              <div>
                <Label htmlFor="theme-toggle" className="text-sm font-medium text-foreground cursor-pointer">Light Mode</Label>
                <p className="text-xs text-muted-foreground">Switch between dark and light mode</p>
              </div>
              <Switch
                id="theme-toggle"
                checked={theme === "light"}
                onCheckedChange={toggle}
                aria-label="Toggle light mode"
              />
            </div>
            <div className={ROW_CLASS}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground" id="density-label">Density</p>
                <p className="text-xs text-muted-foreground">Comfortable spacing or tighter, more data on screen</p>
              </div>
              <div className="inline-flex rounded-lg border border-border bg-muted p-0.5 shrink-0" role="group" aria-labelledby="density-label">
                {(["comfortable", "compact"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDensity(d)}
                    aria-pressed={density === d}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors duration-150 capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      density === d ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className={ROW_CLASS}>
              <div>
                <p className="text-sm font-medium text-foreground">Chart Animations</p>
                <p className="text-xs text-muted-foreground">Smooth transitions on all charts</p>
              </div>
              <span className="text-xs text-success font-medium">Enabled</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <ChangePasswordSection />

      {/* About */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
        <Card className={CARD_CLASS}>
          <CardHeader className={HEADER_CLASS}>
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-foreground">About</CardTitle>
              <CardDescription className="text-xs">Build and data provider info.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            <div className={ROW_CLASS}>
              <p className="text-sm font-medium text-foreground">Version</p>
              <span className="font-mono-data text-xs text-muted-foreground">MER Dashboard v1.0</span>
            </div>
            <div className={ROW_CLASS}>
              <p className="text-sm font-medium text-foreground">Built with</p>
              <span className="text-xs text-muted-foreground">React · Recharts · Framer Motion</span>
            </div>
            <div className={ROW_CLASS}>
              <p className="text-sm font-medium text-foreground">Data Provider</p>
              <span className="text-xs text-muted-foreground">Google Sheets via Apps Script</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <UserManagementSection />
    </div>
  );
}
