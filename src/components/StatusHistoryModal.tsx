import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, History as HistoryIcon, Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import {
  fetchStatusHistory,
  type StatusHistoryEntry,
} from "@/utils/statusHistory";

interface Props {
  open: boolean;
  onClose: () => void;
  ghlContactId: string;
  clientName: string;
}

type PresetKey = "all" | "7d" | "30d" | "thisMonth" | "lastMonth" | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function rangeFromPreset(preset: PresetKey): { from?: Date; to?: Date } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  switch (preset) {
    case "7d":
      return { from: startOfDay(new Date(now.getTime() - 6 * 86400000)), to: endOfDay(now) };
    case "30d":
      return { from: startOfDay(new Date(now.getTime() - 29 * 86400000)), to: endOfDay(now) };
    case "thisMonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case "lastMonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    default:
      return {};
  }
}

export default function StatusHistoryModal({
  open,
  onClose,
  ghlContactId,
  clientName,
}: Props) {
  const [entries, setEntries] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState<PresetKey>("all");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    if (!open || !ghlContactId) return;
    setLoading(true);
    fetchStatusHistory(ghlContactId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [open, ghlContactId]);

  useEffect(() => {
    if (!open) {
      setPreset("all");
      setCustomRange({});
    }
  }, [open]);

  const activeRange = useMemo(() => {
    if (preset === "custom") return customRange;
    return rangeFromPreset(preset);
  }, [preset, customRange]);

  const filtered = useMemo(() => {
    const { from, to } = activeRange;
    if (!from && !to) return entries;
    return entries.filter((e) => {
      const t = new Date(e.recorded_at).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime()) return false;
      return true;
    });
  }, [entries, activeRange]);

  const grouped = useMemo(() => {
    const map = new Map<string, StatusHistoryEntry[]>();
    for (const e of filtered) {
      const k = monthKey(e.recorded_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const customLabel = customRange.from
    ? customRange.to
      ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d")}`
      : format(customRange.from, "MMM d")
    : "Custom";

  const chipCls = (active: boolean) =>
    cn(
      "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10.5px] font-semibold uppercase tracking-wide transition-colors",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground",
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 text-left">
          <DialogTitle className="flex items-center gap-2 pr-8 min-w-0">
            <HistoryIcon className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate" title={clientName}>Status History — {clientName}</span>
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Recorded weekly (Mondays 12:01 AM EST) and on every status change.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div
          className="px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-1.5 border-b border-border/60"
          role="group"
          aria-label="Filter history by date range"
        >
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key)}
              aria-pressed={preset === p.key}
              className={chipCls(preset === p.key)}
            >
              {p.label}
            </button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-pressed={preset === "custom"}
                aria-label={preset === "custom" ? `Custom range: ${customLabel}` : "Choose a custom date range"}
                className={chipCls(preset === "custom")}
              >
                <CalendarIcon className="h-3 w-3" aria-hidden="true" />
                {preset === "custom" ? customLabel : "Custom"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={(r) => {
                  setCustomRange(r ?? {});
                  setPreset("custom");
                }}
                numberOfMonths={1}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {preset !== "all" && (
            <button
              type="button"
              onClick={() => {
                setPreset("all");
                setCustomRange({});
              }}
              className="inline-flex h-7 items-center gap-0.5 rounded-md px-1.5 text-[10.5px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Clear date filter"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto min-h-0 flex-1">
          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
              <span className="sr-only">Loading history…</span>
              <Skeleton className="h-3 w-40" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-2">
              {entries.length === 0 ? (
                <EmptyState icon={Clock} title="No history recorded yet" size="sm" />
              ) : (
                <>
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No entries in this range</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Try a wider date range or clear the filter.
                  </p>
                  {preset !== "all" && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreset("all");
                        setCustomRange({});
                      }}
                      className="mt-1 inline-flex h-8 items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                      Clear filter
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-[10.5px] text-muted-foreground font-mono-data tabular-nums">
                Showing {filtered.length} of {entries.length} entries
              </div>
              {grouped.map(([month, items]) => (
                <div key={month}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {month}
                  </div>
                  <ol className="relative border-l border-border ml-2 space-y-3">
                    {items.map((e) => (
                      <li key={e.id} className="ml-4">
                        <span aria-hidden="true" className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground break-words">
                              {e.status}
                            </div>
                            <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground mt-0.5 font-mono-data tabular-nums">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              <time dateTime={e.recorded_at}>{formatDate(e.recorded_at)}</time>
                            </div>
                          </div>
                          <span
                            title={e.source === "change" ? "Recorded on status change" : "Weekly snapshot"}
                            className={`inline-flex h-5 items-center text-[10px] font-semibold uppercase tracking-wide px-1.5 rounded border shrink-0 ${
                              e.source === "change"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {e.source === "change" ? "Changed" : "Weekly"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
