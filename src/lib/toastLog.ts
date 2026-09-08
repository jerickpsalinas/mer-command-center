/**
 * Toast → Notification Center bridge (#14)
 *
 * A tiny in-memory log of every `toast()` call so the notification dropdown
 * can show them after they auto-dismiss.
 *
 * Usage:
 *   import { logToast, subscribeToastLog, getToastLog, clearToastLog } from "@/lib/toastLog";
 */
import { timeAgo } from "@/lib/time";

export type ToastVariant = "default" | "destructive" | "success" | "warning";

export interface LoggedToast {
  id: string;
  title?: string;
  description?: string;
  variant: ToastVariant;
  /** epoch ms */
  at: number;
  read: boolean;
}

const STORAGE_KEY = "mer-toast-log-v1";
const MAX = 30;

let log: LoggedToast[] = load();
const listeners = new Set<(l: LoggedToast[]) => void>();

function load(): LoggedToast[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LoggedToast[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(log)); } catch { /* ignore */ }
}

function emit() {
  persist();
  listeners.forEach((l) => l(log));
}

export function getToastLog(): LoggedToast[] {
  return log;
}

export function logToast(entry: Omit<LoggedToast, "id" | "at" | "read">) {
  const item: LoggedToast = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()),
    at: Date.now(),
    read: false,
    ...entry,
  };
  log = [item, ...log].slice(0, MAX);
  emit();
}

export function markAllRead() {
  log = log.map((t) => ({ ...t, read: true }));
  emit();
}

export function clearToastLog() {
  log = [];
  emit();
}

export function subscribeToastLog(fn: (l: LoggedToast[]) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Format relative time (e.g. "2m ago") — delegates to the shared helper. */
export function relativeTime(ms: number): string {
  return timeAgo(ms);
}
