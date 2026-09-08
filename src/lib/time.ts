/** Shared date/time formatting helpers. */

function toDate(input: string | number | Date): Date | null {
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Relative time: "just now" (<30s), then Ns/Nm/Nh/Nd ago, then a short
 * "Mon D" date beyond 7 days. Invalid input → "".
 */
export function timeAgo(input: string | number | Date): string {
  const d = toDate(input);
  if (!d) return "";
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 30) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days <= 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "Sep 8, 2026, 3:05 PM" style. Invalid input → "". */
export function formatDateTime(input: string | number | Date): string {
  const d = toDate(input);
  if (!d) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
