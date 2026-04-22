import { useMemo } from "react";
import type { MerHistoryRow } from "@/services/googleSheets";
import { getClientHistory } from "@/hooks/useSheetData";

interface Props {
  clientName: string;
  history: MerHistoryRow[];
  /** number of trailing months to plot */
  months?: number;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Inline 6-month completion-% sparkline (#5).
 * SVG-only, zero deps, renders fast even in a 100-card grid.
 */
export default function ClientSparkline({
  clientName,
  history,
  months = 6,
  width = 80,
  height = 22,
  className,
}: Props) {
  const points = useMemo(() => {
    const rows = getClientHistory(history, clientName).slice(-months);
    if (rows.length < 2) return null;
    const values = rows.map((r) => r.completionPct);
    const maxV = 100;
    const minV = 0;
    const range = Math.max(1, maxV - minV);
    const step = width / (rows.length - 1);
    return {
      values,
      coords: values.map((v, i) => {
        const x = i * step;
        const y = height - ((v - minV) / range) * height;
        return [x, y] as const;
      }),
      delta: values[values.length - 1] - values[0],
      latest: values[values.length - 1],
    };
  }, [clientName, history, months, width, height]);

  if (!points) {
    return (
      <span className={`inline-block text-[10px] text-muted-foreground/60 italic ${className ?? ""}`}>
        no trend
      </span>
    );
  }

  const stroke =
    points.delta > 2
      ? "hsl(var(--success))"
      : points.delta < -2
        ? "hsl(var(--destructive))"
        : "hsl(var(--muted-foreground))";

  const path = points.coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  // Area fill path
  const area = `${path} L${width} ${height} L0 ${height} Z`;

  const last = points.coords[points.coords.length - 1];

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
      title={`${points.values.length}-month trend · ${points.delta >= 0 ? "+" : ""}${points.delta.toFixed(0)}pp`}
    >
      <svg width={width} height={height} className="overflow-visible shrink-0">
        <path d={area} fill={stroke} fillOpacity={0.1} />
        <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r={2} fill={stroke} />
      </svg>
      <span
        className="font-mono-data text-[10px] tabular-nums shrink-0"
        style={{ color: stroke }}
      >
        {points.delta >= 0 ? "+" : ""}{points.delta.toFixed(0)}
      </span>
    </span>
  );
}
