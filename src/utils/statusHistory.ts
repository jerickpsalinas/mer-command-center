import { supabase } from "@/integrations/supabase/client";
import type { MerHistoryRow } from "@/services/googleSheets";

export interface StatusHistoryEntry {
  id: string;
  ghl_contact_id: string;
  client_name: string;
  status: string;
  source: "daily" | "change";
  recorded_at: string;
}

const inFlight = new Set<string>();

function getContactId(row: MerHistoryRow): string {
  return (
    row.ghlContactId ||
    (row.merKey?.includes("_") ? row.merKey.split("_")[0] : "") ||
    row.name
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
/**
 * Returns the most recent Monday 00:01 America/New_York as a Date (in UTC).
 * Used as the anchor for weekly snapshots.
 */
function lastWeeklyAnchor(now: Date): Date {
  // Get current wall-clock parts in America/New_York
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dow = weekdayMap[parts.weekday] ?? 1;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  // Days since last Monday (with the Mon 00:01 cutoff). If it's Monday before 00:01, use previous Monday.
  let daysBack = (dow + 6) % 7; // Mon=0, Tue=1, ... Sun=6
  if (dow === 1 && (hour === 0 && minute < 1)) daysBack = 7;
  // Anchor in NY local time
  const anchorNyMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    0, 1, 0,
  ) - daysBack * 86_400_000;
  // Convert that NY wall-clock instant to a real UTC instant by accounting for NY offset
  const nyOffsetMinutes = getNyOffsetMinutes(new Date(anchorNyMs));
  return new Date(anchorNyMs + nyOffsetMinutes * 60_000);
}

function getNyOffsetMinutes(d: Date): number {
  // Returns the offset (in minutes) to ADD to a NY wall-clock UTC-epoch to get the true UTC instant.
  // i.e. true_utc = ny_wall_as_utc + offsetMinutes. EST = +300, EDT = +240.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  });
  const tzName = fmt.formatToParts(d).find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(tzName);
  if (!m) return 300;
  const sign = m[1] === "+" ? 1 : -1;
  const hours = Number(m[2]);
  const mins = Number(m[3] ?? "0");
  return -sign * (hours * 60 + mins); // invert: UTC = local - offset
}

/**
 * Record status snapshots for the latest row per client.
 * - Inserts when status differs from last entry (source: 'change')
 * - Inserts once per week (Mon 00:01 America/New_York anchor) even if unchanged (source: 'daily')
 */

export async function recordStatusSnapshots(rows: MerHistoryRow[]) {
  // Latest row per contact id
  const latest = new Map<string, MerHistoryRow>();
  for (const r of rows) {
    const id = getContactId(r);
    if (!id) continue;
    const existing = latest.get(id);
    if (!existing || r.timestampMs >= existing.timestampMs) latest.set(id, r);
  }

  for (const [contactId, row] of latest) {
    const status = (row.status ?? "").trim();
    if (!status) continue;
    if (inFlight.has(contactId)) continue;
    inFlight.add(contactId);

    try {
      const { data: last } = await supabase
        .from("client_status_history")
        .select("status, recorded_at")
        .eq("ghl_contact_id", contactId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      let source: "change" | "daily" | null = null;

      if (!last) {
        source = "change";
      } else if ((last.status ?? "").trim() !== status) {
        source = "change";
      } else if (new Date(last.recorded_at) < lastWeeklyAnchor(now)) {
        source = "daily";
      }


      if (source) {
        await supabase.from("client_status_history").insert({
          ghl_contact_id: contactId,
          client_name: row.name,
          status,
          source,
        });
      }
    } catch {
      // swallow; not critical
    } finally {
      inFlight.delete(contactId);
    }
  }
}

export async function fetchStatusHistory(
  ghlContactId: string,
): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from("client_status_history")
    .select("*")
    .eq("ghl_contact_id", ghlContactId)
    .order("recorded_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as StatusHistoryEntry[];
}
