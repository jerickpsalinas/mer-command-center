import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, Loader2, History as HistoryIcon, Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg w-[calc(100vw-1rem)] max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <HistoryIcon className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">Status History — {clientName}</span>
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Recorded weekly (Mondays 12:01 AM EST) and on every status change.

          </p>
        </DialogHeader>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                "text-[10.5px] font-semibold uppercase tracking-wide px-2 py-1 rounded border transition-colors",
                preset === p.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {p.label}
            </button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "text-[10.5px] font-semibold uppercase tracking-wide px-2 py-1 rounded border transition-colors inline-flex items-center gap-1",
                  preset === "custom"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {preset === "custom" ? customLabel : "Custom"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={customRange as any}
                onSelect={(r: any) => {
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
              onClick={() => {
                setPreset("all");
                setCustomRange({});
              }}
              className="text-[10.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 px-1.5 py-1"
              aria-label="Clear filter"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-xs">Loading history…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              {entries.length === 0
                ? "No history recorded yet. Entries will appear after the next data refresh."
                : "No entries in the selected range."}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-[10.5px] text-muted-foreground">
                Showing {filtered.length} of {entries.length} entries
              </div>
              {grouped.map(([month, items]) => (
                <div key={month}>
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                    {month}
                  </div>
                  <ol className="relative border-l border-border ml-2 space-y-3">
                    {items.map((e) => (
                      <li key={e.id} className="ml-4">
                        <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground break-words">
                              {e.status}
                            </div>
                            <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3" />
                              {formatDate(e.recorded_at)}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
                              e.source === "change"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {e.source === "change" ? "Changed" : "Daily"}
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
