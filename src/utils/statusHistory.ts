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
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Record status snapshots for the latest row per client.
 * - Inserts when status differs from last entry (source: 'change')
 * - Inserts once per calendar day even if unchanged (source: 'daily')
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
      } else if (!isSameDay(new Date(last.recorded_at), now)) {
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
