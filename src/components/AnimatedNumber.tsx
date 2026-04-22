import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

interface Props {
  value: number;
  /** Decimal places */
  decimals?: number;
  /** Suffix appended after the number (e.g. "%") */
  suffix?: string;
  /** Animation duration in seconds */
  duration?: number;
  className?: string;
}

/**
 * Smoothly counts up/down to `value` whenever it changes (#12).
 * Skips animation on first mount when value === 0 to avoid jitter.
 */
export default function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  duration = 0.6,
  className,
}: Props) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    if (from === value) return;
    const controls = animate(from, value, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString();

  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      {formatted}
      {suffix}
    </span>
  );
}
