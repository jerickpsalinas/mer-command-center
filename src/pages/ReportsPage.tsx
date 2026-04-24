import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Download, FileSpreadsheet, FileText, Calendar as CalendarIcon, Eye,
  Users, UserCheck, ShieldAlert, TrendingUp, Workflow, Crown, Database, FileBarChart,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useSheetData, filterHistoryByDateRange } from "@/hooks/useSheetData";
import { DataLoading, DataError } from "@/components/DataStatus";
import { exportXLSX, exportPDF } from "@/lib/merExport";
import {
  exportClientScorecardXLSX, exportClientScorecardPDF,
  exportBookkeeperPerfXLSX, exportBookkeeperPerfPDF,
  exportAtRiskXLSX, exportAtRiskPDF,
  exportTrendsSummaryXLSX, exportTrendsSummaryPDF,
  exportCycleStatusXLSX, exportCycleStatusPDF,
  exportExecSummaryPDF,
  exportFullBackupXLSX,
  downloadPayload,
  type ExportPayload,
} from "@/lib/reportExports";
import type { MerHistoryRow, CycleEntry } from "@/services/googleSheets";

type RangeMode = "single" | "range" | "custom" | "all";

interface ExportDef {
  id: string;
  title: string;
  description: string;
  icon: typeof Users;
  accent: "primary" | "success" | "warning" | "destructive";
  formats: ("xlsx" | "pdf")[];
  countLabel: (h: MerHistoryRow[], c: CycleEntry[]) => string;
  run: (fmt: "xlsx" | "pdf", h: MerHistoryRow[], c: CycleEntry[], rangeLabel: string, fileBase: string) => ExportPayload;
}

const EXPORTS: ExportDef[] = [
  {
    id: "mer",
    title: "MER Submissions Report",
    description: "Raw submission log — the audit trail. Every monthly review row in the selected range with KPIs, per-month tables, and trends.",
    icon: FileBarChart,
    accent: "primary",
    formats: ["xlsx", "pdf"],
    countLabel: (h) => `${h.length} submissions · ${new Set(h.map((r) => r.month)).size} months`,
    run: (fmt, h, _c, rangeLabel, base) => {
      const opts = { history: h, rangeLabel, fileBaseName: base };
      if (fmt === "xlsx") exportXLSX(opts); else exportPDF(opts);
    },
  },
  {
    id: "scorecard",
    title: "Client Compliance Scorecard",
    description: "Per-client view: completion %, on-time rate, last submission, trend arrow. Use for client reviews & QBRs.",
    icon: Users,
    accent: "primary",
    formats: ["xlsx", "pdf"],
    countLabel: (h) => `${new Set(h.map((r) => r.name)).size} clients`,
    run: (fmt, h, _c, rangeLabel, base) => {
      if (fmt === "xlsx") exportClientScorecardXLSX(h, rangeLabel, base);
      else exportClientScorecardPDF(h, rangeLabel, base);
    },
  },
  {
    id: "bookkeeper",
    title: "Bookkeeper Performance Report",
    description: "Per-bookkeeper: clients managed, avg completion, on-time rate, at-risk count. For team 1:1s and reviews.",
    icon: UserCheck,
    accent: "primary",
    formats: ["xlsx", "pdf"],
    countLabel: (h) => `${new Set(h.map((r) => r.bookkeeper).filter(Boolean)).size} bookkeepers`,
    run: (fmt, h, _c, rangeLabel, base) => {
      if (fmt === "xlsx") exportBookkeeperPerfXLSX(h, rangeLabel, base);
      else exportBookkeeperPerfPDF(h, rangeLabel, base);
    },
  },
  {
    id: "atrisk",
    title: "At-Risk Clients Snapshot",
    description: "Clients flagged as Non-Compliant or below 40% completion, with reasons and assigned bookkeeper. For escalation meetings.",
    icon: ShieldAlert,
    accent: "destructive",
    formats: ["xlsx", "pdf"],
    countLabel: (h) => {
      const latest = new Map<string, MerHistoryRow>();
      for (const r of h) {
        const ex = latest.get(r.name);
        if (!ex || r.timestampMs >= ex.timestampMs) latest.set(r.name, r);
      }
      const atRisk = Array.from(latest.values()).filter((c) => c.completionPct < 40 || c.complianceStatus === "Non-Compliant").length;
      return `${atRisk} at-risk clients`;
    },
    run: (fmt, h, _c, rangeLabel, base) => {
      if (fmt === "xlsx") exportAtRiskXLSX(h, rangeLabel, base);
      else exportAtRiskPDF(h, rangeLabel, base);
    },
  },
  {
    id: "trends",
    title: "Monthly Trends Summary",
    description: "Compliance %, completion %, MoM deltas, trend direction (Improving/Stable/Declining). For leadership reporting.",
    icon: TrendingUp,
    accent: "success",
    formats: ["xlsx", "pdf"],
    countLabel: (h) => `${new Set(h.map((r) => r.month)).size} months`,
    run: (fmt, h, _c, rangeLabel, base) => {
      if (fmt === "xlsx") exportTrendsSummaryXLSX(h, rangeLabel, base);
      else exportTrendsSummaryPDF(h, rangeLabel, base);
    },
  },
  {
    id: "cycle",
    title: "Master Cycle Status Export",
    description: "Each client's current stage, days in stage, escalation flags. Operational handoff document.",
    icon: Workflow,
    accent: "warning",
    formats: ["xlsx", "pdf"],
    countLabel: (_h, c) => `${c.length} cycle entries`,
    run: (fmt, _h, c, rangeLabel, base) => {
      if (fmt === "xlsx") exportCycleStatusXLSX(c, rangeLabel, base);
      else exportCycleStatusPDF(c, rangeLabel, base);
    },
  },
  {
    id: "exec",
    title: "Executive Summary (1-pager)",
    description: "KPIs + top 3 risks + headline trend. Single-page PDF for partner/owner review.",
    icon: Crown,
    accent: "primary",
    formats: ["pdf"],
    countLabel: (h) => `1-page snapshot · ${new Set(h.map((r) => r.name)).size} clients`,
    run: (_fmt, h, _c, rangeLabel, base) => exportExecSummaryPDF(h, rangeLabel, base),
  },
  {
    id: "backup",
    title: "Full Data Backup",
    description: "Multi-sheet XLSX archive: submissions, latest client snapshot, bookkeepers, trends, cycle log. For archival & offline analysis.",
    icon: Database,
    accent: "primary",
    formats: ["xlsx"],
    countLabel: (h, c) => `${h.length + c.length} total rows · 5 sheets`,
    run: (_fmt, h, c, rangeLabel, base) => exportFullBackupXLSX(h, c, rangeLabel, base),
  },
];

const ACCENT_CLASS: Record<ExportDef["accent"], string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ReportsPage() {
  const { data, isLoading, error } = useSheetData();
  const [mode, setMode] = useState<RangeMode>("all");
  const [singleMonth, setSingleMonth] = useState<string>("");
  const [fromMonth, setFromMonth] = useState<string>("");
  const [toMonth, setToMonth] = useState<string>("");

  const today = useMemo(() => new Date(), []);
  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d;
  }, []);
  const [fromDate, setFromDate] = useState<Date | undefined>(weekAgo);
  const [toDate, setToDate] = useState<Date | undefined>(today);

  // Initialize defaults once data is available
  useMemo(() => {
    if (data && !singleMonth) {
      setSingleMonth(data.latestMonth);
      setFromMonth(data.availableMonths[0] ?? "");
      setToMonth(data.latestMonth);
    }
  }, [data, singleMonth]);

  const monthIsoMap = useMemo(() => {
    const m = new Map<string, string>();
    if (!data) return m;
    for (const r of data.merHistory) if (!m.has(r.month)) m.set(r.month, r.monthDate);
    return m;
  }, [data]);

  const { filteredHistory, filteredCycle, rangeLabel, fileSuffix } = useMemo(() => {
    if (!data) return { filteredHistory: [] as MerHistoryRow[], filteredCycle: [] as CycleEntry[], rangeLabel: "", fileSuffix: "" };
    let label = "All time";
    let suffix = "All_Time";
    let history = data.merHistory;
    let cycle = data.cycleEntries;
    let fromMs: number | null = null;
    let toMs: number | null = null;

    if (mode === "single" && singleMonth) {
      const iso = monthIsoMap.get(singleMonth);
      history = filterHistoryByDateRange(data.merHistory, iso, iso);
      label = singleMonth;
      suffix = singleMonth.replace(/\s+/g, "_");
      const monthStart = iso ? new Date(iso) : null;
      if (monthStart) {
        fromMs = monthStart.getTime();
        const end = new Date(monthStart);
        end.setMonth(end.getMonth() + 1);
        toMs = end.getTime() - 1;
      }
    } else if (mode === "range") {
      let fromIso = monthIsoMap.get(fromMonth);
      let toIso = monthIsoMap.get(toMonth);
      if (fromIso && toIso && fromIso > toIso) [fromIso, toIso] = [toIso, fromIso];
      history = filterHistoryByDateRange(data.merHistory, fromIso, toIso);
      label = fromMonth === toMonth ? fromMonth : `${fromMonth} – ${toMonth}`;
      suffix = `${fromMonth.replace(/\s+/g, "_")}_to_${toMonth.replace(/\s+/g, "_")}`;
      if (fromIso) fromMs = new Date(fromIso).getTime();
      if (toIso) {
        const end = new Date(toIso);
        end.setMonth(end.getMonth() + 1);
        toMs = end.getTime() - 1;
      }
    } else if (mode === "custom" && fromDate && toDate) {
      let from = fromDate;
      let to = toDate;
      if (from > to) [from, to] = [to, from];
      fromMs = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0).getTime();
      toMs = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime();
      history = data.merHistory.filter((r) => r.timestampMs >= fromMs! && r.timestampMs <= toMs!);
      const fLabel = format(from, "MMM d, yyyy");
      const tLabel = format(to, "MMM d, yyyy");
      label = fLabel === tLabel ? fLabel : `${fLabel} – ${tLabel}`;
      suffix = `${format(from, "yyyy-MM-dd")}_to_${format(to, "yyyy-MM-dd")}`;
    }

    if (fromMs !== null || toMs !== null) {
      cycle = data.cycleEntries.filter((e) => {
        const t = Date.parse(e.timestamp) || 0;
        if (fromMs !== null && t < fromMs) return false;
        if (toMs !== null && t > toMs) return false;
        return true;
      });
    }

    return { filteredHistory: history, filteredCycle: cycle, rangeLabel: label, fileSuffix: suffix };
  }, [data, mode, singleMonth, fromMonth, toMonth, fromDate, toDate, monthIsoMap]);

  if (isLoading) return <DataLoading />;
  if (error || !data) return <DataError message={error?.message} />;

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setFromDate(start);
    setToDate(end);
  };

  const handleExport = (def: ExportDef, fmt: "xlsx" | "pdf") => {
    const empty = def.id === "cycle" ? filteredCycle.length === 0 : filteredHistory.length === 0;
    if (empty) {
      toast({ title: "No data in range", description: "Adjust the date range and try again.", variant: "destructive" });
      return;
    }
    const base = `BA_${def.id}_${fileSuffix}`;
    try {
      def.run(fmt, filteredHistory, filteredCycle, rangeLabel, base);
      toast({ title: "Export complete", description: `${base}.${fmt}` });
    } catch (e) {
      toast({ title: "Export failed", description: String(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Page intro */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Export Center</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
              Pick a date range below — it applies to every report. Choose any report and download as Excel or PDF.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Shared date range selector */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Date Range</h3>
          <span className="ml-auto text-[11px] font-mono-data text-muted-foreground">
            <span className="text-foreground font-semibold">{filteredHistory.length}</span> submissions ·{" "}
            <span className="text-foreground font-semibold">{new Set(filteredHistory.map((r) => r.name)).size}</span> clients ·{" "}
            <span className="text-foreground font-semibold">{new Set(filteredHistory.map((r) => r.month)).size}</span> months
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {([
            { id: "all", label: "All Time" },
            { id: "single", label: "Single Month" },
            { id: "range", label: "Month Range" },
            { id: "custom", label: "Custom Dates" },
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

        {mode === "single" && (
          <div className="max-w-sm">
            <Select value={singleMonth} onValueChange={setSingleMonth}>
              <SelectTrigger className="bg-muted/30 border-border"><SelectValue placeholder="Select month" /></SelectTrigger>
              <SelectContent>
                {[...data.availableMonths].reverse().map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === "range" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">From</label>
              <Select value={fromMonth} onValueChange={setFromMonth}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {data.availableMonths.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">To</label>
              <Select value={toMonth} onValueChange={setToMonth}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {data.availableMonths.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {mode === "custom" && (
          <div className="space-y-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">From date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-muted/30 border-border", !fromDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={fromDate} onSelect={setFromDate} disabled={(d) => d > new Date()} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">To date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-muted/30 border-border", !toDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={toDate} onSelect={setToDate} disabled={(d) => d > new Date() || (fromDate ? d < fromDate : false)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 text-[11px] text-muted-foreground">
          Active range: <span className="text-foreground font-semibold">{rangeLabel}</span>
        </div>
      </motion.div>

      {/* Export grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {EXPORTS.map((def, i) => {
          const Icon = def.icon;
          const empty = def.id === "cycle" ? filteredCycle.length === 0 : filteredHistory.length === 0;
          return (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              whileHover={{ y: -2 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300 flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 ${ACCENT_CLASS[def.accent]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground leading-tight text-balance">{def.title}</h3>
                  <p className="text-[10px] font-mono-data text-muted-foreground mt-1">{def.countLabel(filteredHistory, filteredCycle)}</p>
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-4 flex-1">{def.description}</p>
              <div className="grid grid-cols-2 gap-2">
                {def.formats.includes("xlsx") ? (
                  <button onClick={() => handleExport(def, "xlsx")} disabled={empty}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-success/30 bg-success/5 hover:bg-success/10 text-success font-semibold px-3 py-2 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> XLSX
                  </button>
                ) : <div />}
                {def.formats.includes("pdf") ? (
                  <button onClick={() => handleExport(def, "pdf")} disabled={empty}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive font-semibold px-3 py-2 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${!def.formats.includes("xlsx") ? "col-span-2" : ""}`}>
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </button>
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
