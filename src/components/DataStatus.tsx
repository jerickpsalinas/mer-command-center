import { AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, BTN_SOLID_PRIMARY } from "@/lib/utils";

type Variant = "dashboard" | "list" | "table" | "compact";

/**
 * Skeleton loader. Uses a variant to hint at the target page shape so the
 * layout doesn't jump when real content arrives.
 */
export function DataLoading({ variant = "dashboard" }: { variant?: Variant }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="space-y-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading data from spreadsheet…</span>

      {variant === "dashboard" && (
        <>
          {/* Page header: title/subtitle + month picker + capture button */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40 rounded-md" />
              <Skeleton className="h-4 w-56 rounded-md" />
            </div>
            <div className="flex items-end gap-3">
              <Skeleton className="h-10 w-full sm:w-[220px] rounded-md" />
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          </div>
          {/* KPI tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
          {/* Donut + Breakdown chart panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card space-y-3">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-[260px] rounded-lg" />
              </div>
            ))}
          </div>
          {/* Trend charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-card space-y-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-[240px] rounded-lg" />
              </div>
            ))}
          </div>
          {/* At-risk list */}
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-56" /></div>
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 sm:px-6 py-3 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              ))}
            </div>
          </div>
          {/* Needs Attention + Bookkeepers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            <Skeleton className="lg:col-span-2 h-[320px] rounded-xl" />
            <Skeleton className="h-[320px] rounded-xl" />
          </div>
        </>
      )}

      {variant === "list" && (
        <>
          <Skeleton className="h-[280px] rounded-xl" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-[180px] rounded-xl" />
            ))}
          </div>
        </>
      )}

      {variant === "table" && (
        <>
          <div className="flex gap-3 mb-4">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </>
      )}

      {variant === "compact" && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Error panel with a retry button and the real error message.
 * Pass `onRetry` (e.g. the query's `refetch`) so the user isn't forced to
 * reload the whole page just because the sheet blipped.
 */
export function DataError({
  message,
  onRetry,
  isRetrying = false,
  compact = false,
}: {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  /** Inline variant: no top margin / max-width, tighter padding. */
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border border-destructive/30 bg-card shadow-card text-center",
        compact ? "py-10 px-6" : "max-w-md mx-auto mt-16 p-6",
      )}
      role="alert"
    >
      <div className="mx-auto mb-3 h-11 w-11 rounded-full bg-destructive/15 flex items-center justify-center">
        <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">Couldn't load data</p>
      <p className="text-xs text-muted-foreground mb-4 break-words">
        {message?.trim() ||
          "The MER sheet didn't respond. Check your connection or try again in a moment."}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className={BTN_SOLID_PRIMARY}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} aria-hidden />
          {isRetrying ? "Retrying…" : "Retry"}
        </button>
      )}
    </motion.div>
  );
}
