import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  At-Risk thresholds (configurable in Settings, used app-wide)      */
/* ------------------------------------------------------------------ */
export interface AtRiskThresholds {
  consecutiveNonCompliantMonths: number; // ≥ N → at risk
  completionDropMonths: number;          // dropping for ≥ N consecutive months → at risk
  stuckInStageDays: number;              // days in same Master Cycle stage → at risk
  lowCompletionPct: number;              // single-month low-completion threshold
}

export const DEFAULT_THRESHOLDS: AtRiskThresholds = {
  consecutiveNonCompliantMonths: 2,
  completionDropMonths: 3,
  stuckInStageDays: 14,
  lowCompletionPct: 40,
};

/* ------------------------------------------------------------------ */
/*  Notification preferences                                          */
/* ------------------------------------------------------------------ */
export interface NotificationPrefs {
  bookkeeperFilter: string;       // "" = all, otherwise bookkeeper name
  showCritical: boolean;
  showWarnings: boolean;
  showInfo: boolean;
  showSuccess: boolean;
}

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  bookkeeperFilter: "",
  showCritical: true,
  showWarnings: true,
  showInfo: true,
  showSuccess: true,
};

/* ------------------------------------------------------------------ */
/*  Saved filter views (Clients page)                                 */
/* ------------------------------------------------------------------ */
export interface SavedFilter {
  id: string;
  name: string;
  search: string;
  status: "all" | "Compliant" | "Non-Compliant" | "On Hold";
  bookkeeper: string;     // "" = any
  clientType: string;     // "" = any
  minCompletion: number;  // 0–100
}

interface UserSettings {
  thresholds: AtRiskThresholds;
  notifPrefs: NotificationPrefs;
  savedFilters: SavedFilter[];
  setThresholds: (t: AtRiskThresholds) => void;
  setNotifPrefs: (p: NotificationPrefs) => void;
  saveFilter: (f: Omit<SavedFilter, "id">) => void;
  deleteFilter: (id: string) => void;
}

const KEY = "mer-user-settings-v1";
const Ctx = createContext<UserSettings | null>(null);

interface Persisted {
  thresholds?: Partial<AtRiskThresholds>;
  notifPrefs?: Partial<NotificationPrefs>;
  savedFilters?: SavedFilter[];
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as Persisted : {};
  } catch {
    return {};
  }
}

function save(state: Persisted) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const initial = load();
  const [thresholds, setThresholdsState] = useState<AtRiskThresholds>({ ...DEFAULT_THRESHOLDS, ...initial.thresholds });
  const [notifPrefs, setNotifPrefsState] = useState<NotificationPrefs>({ ...DEFAULT_NOTIF_PREFS, ...initial.notifPrefs });
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(initial.savedFilters ?? []);

  useEffect(() => {
    save({ thresholds, notifPrefs, savedFilters });
  }, [thresholds, notifPrefs, savedFilters]);

  const value = useMemo<UserSettings>(() => ({
    thresholds,
    notifPrefs,
    savedFilters,
    setThresholds: setThresholdsState,
    setNotifPrefs: setNotifPrefsState,
    saveFilter: (f) => setSavedFilters((curr) => [...curr, { ...f, id: crypto.randomUUID() }]),
    deleteFilter: (id) => setSavedFilters((curr) => curr.filter((x) => x.id !== id)),
  }), [thresholds, notifPrefs, savedFilters]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserSettings(): UserSettings {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUserSettings must be used within UserSettingsProvider");
  return ctx;
}
