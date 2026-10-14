import { useId } from "react";
import { Calendar, Check } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OVERLINE, cn } from "@/lib/utils";

interface MonthFilterProps {
  /** Current selected value: a month label like "Sep 2026" */
  value: string;
  onChange: (value: string) => void;
  /** Available month labels (any order — sorted desc internally) */
  months: string[];
  /** Latest month label — shown with "(current)" suffix */
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
 * The latest month is marked "(current)". No separate "Current (latest)" option —
 * bookkeeping always works on the previous month so the latest month IS the current view.
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
  const labelId = useId();
  const showLabel = Boolean(label) && !compact;

  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      {showLabel && (
        <span id={labelId} className={cn(OVERLINE, "flex items-center gap-1.5 mb-1.5")}>
          <Calendar className="h-3 w-3" aria-hidden /> {label}
        </span>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          aria-labelledby={showLabel ? labelId : undefined}
          aria-label={showLabel ? undefined : label ?? "Reporting month"}
          className={`${triggerWidth} min-h-[40px] bg-card border-border transition-colors duration-150 ${compact ? "text-sm" : ""}`}
        >
          {compact && <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" aria-hidden />}
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent>
          {sorted.map((m) =>
            latestMonth && m === latestMonth ? (
              <SelectPrimitive.Item
                key={m}
                value={m}
                className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground"
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{m}</SelectPrimitive.ItemText>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-success" aria-hidden>
                  Current
                </span>
              </SelectPrimitive.Item>
            ) : (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
