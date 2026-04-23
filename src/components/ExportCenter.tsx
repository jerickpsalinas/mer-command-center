import { useState, useMemo } from "react";
import { Download, FileSpreadsheet, FileText, Calendar as CalendarIcon } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { exportXLSX, exportPDF } from "@/lib/merExport";
import { filterHistoryByDateRange } from "@/hooks/useSheetData";
import type { MerHistoryRow } from "@/services/googleSheets";

interface ExportCenterProps {
  history: MerHistoryRow[];
  availableMonths: string[]; // chronological asc, e.g. ["Jan 2025", "Feb 2025"]
  defaultMonth?: string;     // single-month default
  compact?: boolean;
}

type RangeMode = "single" | "range" | "custom" | "all";

function toIsoDay(d: Date): string {
  // local yyyy-mm-dd (avoid TZ shift from toISOString)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ExportCenter({ history, availableMonths, defaultMonth, compact }: ExportCenterProps) {
  const [mode, setMode] = useState<RangeMode>("single");
  const [singleMonth, setSingleMonth] = useState<string>(defaultMonth ?? availableMonths[availableMonths.length - 1] ?? "");
  const [fromMonth, setFromMonth] = useState<string>(availableMonths[0] ?? "");
  const [toMonth, setToMonth] = useState<string>(availableMonths[availableMonths.length - 1] ?? "");

  // Custom (weekly / arbitrary) date range — defaults to last 7 days
  const today = useMemo(() => new Date(), []);
  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d;
  }, []);
  const [fromDate, setFromDate] = useState<Date | undefined>(weekAgo);
  const [toDate, setToDate] = useState<Date | undefined>(today);

  // Map month label → ISO start-of-month
  const monthIsoMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of history) if (!m.has(r.month)) m.set(r.month, r.monthDate);
    return m;
  }, [history]);

  const { filtered, rangeLabel, fileBase } = useMemo(() => {
    let label = "All time";
    let base = "MER_All_Time";
    let filteredRows: MerHistoryRow[] = history;

    if (mode === "single" && singleMonth) {
      const from = monthIsoMap.get(singleMonth);
      filteredRows = filterHistoryByDateRange(history, from, from);
      label = singleMonth;
      base = `MER_${singleMonth.replace(/\s+/g, "_")}`;
    } else if (mode === "range") {
      let from = monthIsoMap.get(fromMonth);
      let to = monthIsoMap.get(toMonth);
      if (from && to && from > to) [from, to] = [to, from];
      filteredRows = filterHistoryByDateRange(history, from, to);
      label = fromMonth === toMonth ? fromMonth : `${fromMonth} – ${toMonth}`;
      base = `MER_${fromMonth.replace(/\s+/g, "_")}_to_${toMonth.replace(/\s+/g, "_")}`;
    } else if (mode === "custom" && fromDate && toDate) {
      let from = fromDate;
      let to = toDate;
      if (from > to) [from, to] = [to, from];
      const fromMs = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0).getTime();
      const toMs = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime();
      filteredRows = history.filter((r) => r.timestampMs >= fromMs && r.timestampMs <= toMs);
      const fLabel = format(from, "MMM d, yyyy");
      const tLabel = format(to, "MMM d, yyyy");
      label = fLabel === tLabel ? fLabel : `${fLabel} – ${tLabel}`;
      base = `MER_${format(from, "yyyy-MM-dd")}_to_${format(to, "yyyy-MM-dd")}`;
    } else if (mode === "all") {
      filteredRows = history;
    }

    return { filtered: filteredRows, rangeLabel: label, fileBase: base };
  }, [mode, singleMonth, fromMonth, toMonth, fromDate, toDate, history, monthIsoMap]);

  const rowCount = filtered.length;
  const monthCount = new Set(filtered.map((r) => r.month)).size;
  const clientCount = new Set(filtered.map((r) => r.name)).size;

  const handleExport = (fmt: "xlsx" | "pdf") => {
    if (rowCount === 0) {
      toast({ title: "No data in range", description: "Pick a different month or range.", variant: "destructive" });
      return;
    }
    const opts = { history: filtered, rangeLabel, fileBaseName: fileBase };
    try {
      if (fmt === "xlsx") exportXLSX(opts);
      else exportPDF(opts);
      toast({ title: "Export complete", description: `${fileBase}.${fmt} (${rowCount} rows)` });
    } catch (e) {
      toast({ title: "Export failed", description: String(e), variant: "destructive" });
    }
  };

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setFromDate(start);
    setToDate(end);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-border bg-card shadow-card ${compact ? "p-4" : "p-5 sm:p-6"}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Download className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Export Center</h2>
          <p className="text-[11px] text-muted-foreground">Download MER reports for any month, week, or custom range</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {([
          { id: "single", label: "Single Month" },
          { id: "range", label: "Month Range" },
          { id: "custom", label: "Custom Dates" },
          { id: "all", label: "All Time" },
        ] as { id: RangeMode; label: string }[]).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setMode(opt.id)}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-md border transition-colors ${
              mode === opt.id
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Pickers */}
      {mode === "single" && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <CalendarIcon className="h-3 w-3" /> Month
            </label>
            <Select value={singleMonth} onValueChange={setSingleMonth}>
              <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...availableMonths].reverse().map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {mode === "range" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">From</label>
            <Select value={fromMonth} onValueChange={setFromMonth}>
              <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableMonths.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">To</label>
            <Select value={toMonth} onValueChange={setToMonth}>
              <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableMonths.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {mode === "custom" && (
        <div className="space-y-3 mb-4">
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Last 7 days", days: 7 },
              { label: "Last 14 days", days: 14 },
              { label: "Last 30 days", days: 30 },
              { label: "Last 90 days", days: 90 },
            ].map((p) => (
              <button
                key={p.days}
                onClick={() => setQuickRange(p.days)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">From date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-muted/30 border-border",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    disabled={(d) => d > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">To date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-muted/30 border-border",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    disabled={(d) => d > new Date() || (fromDate ? d < fromDate : false)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}

      {/* Range summary */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-4 flex-wrap">
        <span className="font-mono-data">
          <span className="text-foreground font-semibold">{rowCount}</span> submissions
        </span>
        <span className="opacity-50">·</span>
        <span className="font-mono-data">
          <span className="text-foreground font-semibold">{clientCount}</span> clients
        </span>
        <span className="opacity-50">·</span>
        <span className="font-mono-data">
          <span className="text-foreground font-semibold">{monthCount}</span> month{monthCount === 1 ? "" : "s"}
        </span>
        <span className="opacity-50">·</span>
        <span className="truncate">{rangeLabel}</span>
      </div>

      {/* Format buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button onClick={() => handleExport("xlsx")} disabled={rowCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/5 hover:bg-success/10 text-success font-semibold px-4 py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <FileSpreadsheet className="h-4 w-4" /> Excel (XLSX)
        </button>
        <button onClick={() => handleExport("pdf")} disabled={rowCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive font-semibold px-4 py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <FileText className="h-4 w-4" /> PDF Report
        </button>
      </div>
    </motion.div>
  );
}
