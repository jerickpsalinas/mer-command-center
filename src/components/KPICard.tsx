import { motion } from "framer-motion";
import { Info, LucideIcon, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn, FOCUS_RING } from "@/lib/utils";
import AnimatedNumber from "@/components/AnimatedNumber";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "success" | "destructive" | "warning";
  index?: number;
  /** Suffix appended to numeric values (e.g. "%") — used only when value is a number */
  suffix?: string;
  /** Optional explanation rendered in a tooltip next to the title */
  tooltip?: ReactNode;
  /** Numeric delta vs. previous period (in same units as value). */
  delta?: number;
  /** Short label for the delta (e.g. "vs Jun"). */
  deltaLabel?: string;
  /** If true, a negative delta is "good" (e.g. for non-compliant / risk counts). */
  invertDeltaColor?: boolean;
}

const variantStyles = {
  default: "border-border",
  success: "border-success/15",
  destructive: "border-destructive/15",
  warning: "border-warning/15",
};

const iconStyles = {
  default: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  destructive: "text-destructive bg-destructive/10",
  warning: "text-warning bg-warning/10",
};

const valueStyles = {
  default: "text-foreground",
  success: "text-success",
  destructive: "text-destructive",
  warning: "text-warning",
};

export default function KPICard({ title, value, icon: Icon, trend, variant = "default", index = 0, suffix, tooltip, delta, deltaLabel, invertDeltaColor }: KPICardProps) {
  const isNumeric = typeof value === "number";

  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const isUp = hasDelta && delta! > 0;
  const isDown = hasDelta && delta! < 0;
  const isFlat = hasDelta && delta === 0;
  const goodDirection = invertDeltaColor ? isDown : isUp;
  const badDirection = invertDeltaColor ? isUp : isDown;
  const deltaColor = isFlat
    ? "text-muted-foreground bg-muted"
    : goodDirection
      ? "text-success bg-success/10"
      : badDirection
        ? "text-destructive bg-destructive/10"
        : "text-muted-foreground bg-muted";
  const DeltaIcon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;
  const deltaAria = hasDelta
    ? isFlat
      ? `No change ${deltaLabel ?? "vs previous period"}`
      : `${isUp ? "Up" : "Down"} ${Math.abs(delta!)} ${deltaLabel ?? "vs previous period"}${goodDirection ? " (improving)" : badDirection ? " (worsening)" : ""}`
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "group rounded-xl border bg-card p-5 density-card shadow-card hover:shadow-card-hover transition-[box-shadow,border-color] duration-300 hover:border-primary/15",
        variantStyles[variant]
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate" title={title}>{title}</p>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`About ${title}`}
                  className={cn("inline-flex items-center justify-center h-8 w-8 -m-2 rounded-md text-muted-foreground/70 hover:text-foreground transition-colors duration-150 shrink-0", FOCUS_RING)}
                  onClick={(e) => e.preventDefault()}
                >
                  <Info className="h-3 w-3" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-xs text-xs leading-relaxed">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
          iconStyles[variant]
        )}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
      <p className={cn("text-[28px] font-bold font-mono-data tabular-nums leading-none truncate", valueStyles[variant])}>
        {isNumeric ? <AnimatedNumber value={value} suffix={suffix ?? ""} /> : value}
      </p>
      {(hasDelta || trend) && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {hasDelta && (
            <span
              role="img"
              aria-label={deltaAria}
              className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono-data tabular-nums", deltaColor)}
            >
              <DeltaIcon className="h-2.5 w-2.5" aria-hidden />
              {isFlat ? "0" : `${Math.abs(delta!)}`}
            </span>
          )}
          {(deltaLabel || trend) && (
            <span className="text-[10px] text-muted-foreground">{deltaLabel || trend}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
