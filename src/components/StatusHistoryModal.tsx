import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Loader2, History as HistoryIcon } from "lucide-react";
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

export default function StatusHistoryModal({
  open,
  onClose,
  ghlContactId,
  clientName,
}: Props) {
  const [entries, setEntries] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !ghlContactId) return;
    setLoading(true);
    fetchStatusHistory(ghlContactId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [open, ghlContactId]);

  const grouped = useMemo(() => {
    const map = new Map<string, StatusHistoryEntry[]>();
    for (const e of entries) {
      const k = monthKey(e.recorded_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg w-[calc(100vw-1rem)] max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <HistoryIcon className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">Status History — {clientName}</span>
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Recorded daily and on every status change.
          </p>
        </DialogHeader>

        <div className="mt-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-xs">Loading history…</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              No history recorded yet. Entries will appear after the next data
              refresh.
            </div>
          ) : (
            <div className="space-y-5">
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
