import { useState, useMemo } from "react";
import { useSheetData } from "@/hooks/useSheetData";
import ClientDetailsModal from "@/components/ClientDetailsModal";
import type { MerHistoryRow } from "@/services/googleSheets";

/**
 * Shared "click a client name → open ClientDetailsModal" behavior,
 * matching Dashboard > Needs Attention.
 *
 * Usage:
 *   const { open, modal } = useClientDetails();
 *   <button onClick={() => open(client.name)}>...</button>
 *   {modal}
 */
export function useClientDetails() {
  const { data } = useSheetData();
  const [name, setName] = useState<string | null>(null);

  const row = useMemo<MerHistoryRow | null>(() => {
    if (!name || !data) return null;
    const norm = (s: string) => s.trim().toLowerCase();
    const target = norm(name);
    const matches = data.merHistory.filter((r) => norm(r.name) === target);
    if (matches.length === 0) {
      const snap = data.clients.find((c) => norm(c.name) === target);
      return snap ? (snap as unknown as MerHistoryRow) : null;
    }
    return matches.reduce((latest, r) => (r.timestampMs >= latest.timestampMs ? r : latest), matches[0]);
  }, [name, data]);

  const modal = (
    <ClientDetailsModal
      open={!!name}
      onClose={() => setName(null)}
      client={row}
      actionLog={data?.actionLog ?? []}
    />
  );

  return { open: setName, modal };
}
