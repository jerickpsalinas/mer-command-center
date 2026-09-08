import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ── Shared class-name primitives (UI consistency pass) ─────────────────── */
export const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
export const FOCUS_RING_INSET = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
export const CARD = "rounded-xl border border-border bg-card shadow-card";
export const CARD_HEADER = "flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border";
export const OVERLINE = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";
export const CARD_TITLE = "text-sm font-semibold text-foreground flex items-center gap-2";
export const TH = "text-xs font-medium uppercase tracking-wider text-muted-foreground px-4 py-3 whitespace-nowrap sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border";
export const PILL = "inline-flex h-5 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold leading-none whitespace-nowrap";
export const CHIP = "inline-flex h-6 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 text-[11px] font-medium text-primary";
export const COUNT_BADGE = "inline-flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold font-mono-data tabular-nums";
export const BTN_SOFT_PRIMARY = `inline-flex h-9 items-center gap-1.5 px-3 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`;
export const BTN_SOLID_PRIMARY = `inline-flex h-9 items-center gap-1.5 px-4 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`;
export const BTN_OUTLINE = `inline-flex h-9 items-center gap-1.5 px-3 rounded-md text-xs font-semibold text-muted-foreground border border-border hover:bg-accent hover:text-foreground transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`;
export const BTN_SOFT_DESTRUCTIVE = `inline-flex h-9 items-center gap-1.5 px-3 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`;
export const SEARCH_WRAPPER = "flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/30";
export const SELECT_NATIVE = `h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground ${FOCUS_RING}`;
export const DIALOG_SHELL = "w-[calc(100vw-2rem)] max-h-[85dvh] flex flex-col gap-0 p-0";
export const DIALOG_HEADER = "px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-border/60 text-left";
export const DIALOG_TITLE = "flex items-center gap-2 pr-8 min-w-0";
export const DIALOG_BODY = "flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 scrollbar-thin";
export const DIALOG_FOOTER = "flex-row items-center justify-end gap-2 px-4 sm:px-6 py-3 border-t border-border/60 sm:space-x-0";
