import { Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MonthFilterProps {
  /** Current selected value: "current" or a month label like "May 2025" */
  value: string;
  onChange: (value: string) => void;
  /** Available month labels (any order — sorted desc internally) */
  months: string[];
  /** Latest month label, used to mark "Latest" hint when present */
  latestMonth?: string;
  /** Optional label shown above (e.g. "Reporting Month"). If omitted, no label rendered. */
  label?: string;
  /** Width override; defaults to sensible responsive width */
  className?: string;
  /** Compact = no label, smaller trigger (used inline in toolbars) */
  compact?: boolean;
}

/**
 * Unified month-filter dropdown used across pages.
 * "current" maps to the latest live data; any month label switches to a historical snapshot.
 */
export default function MonthFilter({
  value,
  onChange,
  months,
  latestMonth,
  label,
  className,
  compact = false,
}: MonthFilterProps) {
  // Sort descending (most recent first) by parsing the label
  const sorted = [...months].sort((a, b) => {
    const da = new Date(a).getTime() || 0;
    const db = new Date(b).getTime() || 0;
    return db - da;
  });

  const triggerWidth = compact ? "w-full sm:w-[180px]" : "w-full sm:w-[220px]";

  return (
    <div className={className}>
      {label && !compact && (
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
          <Calendar className="h-3 w-3" /> {label}
        </label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={`${triggerWidth} bg-card border-border ${compact ? "h-9 text-sm" : ""}`}>
          {compact && <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />}
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">Current (latest)</SelectItem>
          {sorted.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
              {latestMonth && m === latestMonth ? "  · Latest" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
