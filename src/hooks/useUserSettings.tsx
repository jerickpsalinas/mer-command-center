/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  At-Risk thresholds (configurable in Settings, used app-wide)      */
/* ------------------------------------------------------------------ */
export interface AtRiskThresholds {
  consecutiveNonCompliantMonths: number;
  completionDropMonths: number;
  stuckInStageDays: number;
  lowCompletionPct: number;
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
  bookkeeperFilter: string;
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
  status: "all" | "Compliant" | "Non-Compliant" | "On Hold" | "Pending MER";
  bookkeeper: string;
  clientType: string;
  minCompletion: number;
}

/* ------------------------------------------------------------------ */
/*  Density (#4)                                                      */
/* ------------------------------------------------------------------ */
export type Density = "comfortable" | "compact";

/* ------------------------------------------------------------------ */
/*  Sync preferences — actually wired to useSheetData's refetchInterval */
/* ------------------------------------------------------------------ */
export interface SyncPrefs {
  autoRefresh: boolean;
  /** Interval in seconds. */
  refreshInterval: number;
}

export const DEFAULT_SYNC_PREFS: SyncPrefs = {
  autoRefresh: true,
  refreshInterval: 60,
};

interface UserSettings {
  thresholds: AtRiskThresholds;
  notifPrefs: NotificationPrefs;
  savedFilters: SavedFilter[];
  density: Density;
  syncPrefs: SyncPrefs;
  setThresholds: (t: AtRiskThresholds) => void;
  setNotifPrefs: (p: NotificationPrefs) => void;
  saveFilter: (f: Omit<SavedFilter, "id">) => void;
  deleteFilter: (id: string) => void;
  setDensity: (d: Density) => void;
  setSyncPrefs: (p: SyncPrefs) => void;
}

const KEY = "mer-user-settings-v1";
const Ctx = createContext<UserSettings | null>(null);

interface Persisted {
  thresholds?: Partial<AtRiskThresholds>;
  notifPrefs?: Partial<NotificationPrefs>;
  savedFilters?: SavedFilter[];
  density?: Density;
  syncPrefs?: Partial<SyncPrefs>;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Persisted) : {};
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
  const [density, setDensityState] = useState<Density>(initial.density ?? "comfortable");
  const [syncPrefs, setSyncPrefsState] = useState<SyncPrefs>({ ...DEFAULT_SYNC_PREFS, ...initial.syncPrefs });

  useEffect(() => {
    save({ thresholds, notifPrefs, savedFilters, density, syncPrefs });
  }, [thresholds, notifPrefs, savedFilters, density, syncPrefs]);

  // Apply density to <html> for global CSS hooks
  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  const value = useMemo<UserSettings>(() => ({
    thresholds,
    notifPrefs,
    savedFilters,
    density,
    syncPrefs,
    setThresholds: setThresholdsState,
    setNotifPrefs: setNotifPrefsState,
    saveFilter: (f) => setSavedFilters((curr) => [...curr, { ...f, id: crypto.randomUUID() }]),
    deleteFilter: (id) => setSavedFilters((curr) => curr.filter((x) => x.id !== id)),
    setDensity: setDensityState,
    setSyncPrefs: setSyncPrefsState,
  }), [thresholds, notifPrefs, savedFilters, density, syncPrefs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserSettings(): UserSettings {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUserSettings must be used within UserSettingsProvider");
  return ctx;
}
