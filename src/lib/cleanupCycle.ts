/**
 * Cleanup-cycle detection.
 *
 * Cleanup clients are identified across the app via the "ready-for-cleanup"
 * GHL tag convention (see useMerWorkflowContacts, ClientDetailsModal).
 * Sheet-backed rows carry those tags in a Category Tags column, so we detect
 * any cleanup-flavoured tag on the joined tag string.
 */

const CLEANUP_TAGS = [
  "ready-for-cleanup",
  "docs-received-cleanup",
  "review-ready-cleanup",
  "jessica-approved-cleanup",
];

/** True when the given tag string / cycle-type value indicates a cleanup cycle. */
export function isCleanupTagString(...values: (string | undefined | null)[]): boolean {
  const joined = values
    .map((v) => (v ?? "").toLowerCase())
    .join(" ")
    .replace(/[_\s]+/g, "-");
  if (!joined.trim()) return false;
  if (CLEANUP_TAGS.some((t) => joined.includes(t))) return true;
  // Generic fallback: a "cleanup" cycle-type value.
  return /\bcleanup\b/.test(joined.replace(/-/g, " "));
}
