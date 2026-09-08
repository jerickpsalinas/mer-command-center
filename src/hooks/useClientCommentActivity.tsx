import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CommentActivity {
  count: number;
  lastAt: string | null;
  unseen: number;
}

const seenKey = (contactId: string) => `comments_seen_at_${contactId}`;

export function getCommentsSeenAt(contactId: string): number {
  try {
    const v = localStorage.getItem(seenKey(contactId));
    return v ? Date.parse(v) || 0 : 0;
  } catch {
    return 0;
  }
}

export function markCommentsSeen(contactId: string) {
  if (!contactId) return;
  try {
    localStorage.setItem(seenKey(contactId), new Date().toISOString());
    window.dispatchEvent(new CustomEvent("comments-seen", { detail: { contactId } }));
  } catch {
    /* noop */
  }
}

/**
 * Fetches comment counts + latest timestamps for a set of GHL contact IDs.
 * Returns a map keyed by contactId with { count, lastAt, unseen } where
 * `unseen` counts comments newer than the locally-stored "seen" timestamp.
 */
export function useClientCommentActivity(contactIds: string[]) {
  const ids = useMemo(
    () => Array.from(new Set(contactIds.filter(Boolean))).sort(),
    [contactIds],
  );
  const idsKey = ids.join("|");

  const [rows, setRows] = useState<{ ghl_contact_id: string; created_at: string }[]>([]);
  const [seenTick, setSeenTick] = useState(0);

  useEffect(() => {
    const handler = () => setSeenTick((t) => t + 1);
    window.addEventListener("comments-seen", handler);
    return () => window.removeEventListener("comments-seen", handler);
  }, []);

  useEffect(() => {
    if (ids.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("client_comments")
        .select("ghl_contact_id, created_at, is_deleted")
        .in("ghl_contact_id", ids)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (cancelled || error || !data) return;
      setRows(data as { ghl_contact_id: string; created_at: string }[]);
    })();

    const channel = supabase
      .channel(`client_comments_activity_${ids.length}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "client_comments" },
        (payload) => {
          const r = payload.new as { ghl_contact_id: string; created_at: string };
          if (!ids.includes(r.ghl_contact_id)) return;
          setRows((prev) => [{ ghl_contact_id: r.ghl_contact_id, created_at: r.created_at }, ...prev]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey is a serialised form of ids; using ids would cause unnecessary resubscribes
  }, [idsKey]);

  return useMemo(() => {
    const map = new Map<string, CommentActivity>();
    for (const id of ids) map.set(id, { count: 0, lastAt: null, unseen: 0 });
    for (const r of rows) {
      const entry = map.get(r.ghl_contact_id);
      if (!entry) continue;
      entry.count += 1;
      const t = Date.parse(r.created_at) || 0;
      if (!entry.lastAt || t > (Date.parse(entry.lastAt) || 0)) entry.lastAt = r.created_at;
    }
    for (const [id, entry] of map) {
      const seen = getCommentsSeenAt(id);
      entry.unseen = rows.filter(
        (r) => r.ghl_contact_id === id && (Date.parse(r.created_at) || 0) > seen,
      ).length;
    }
    return map;
    // seenTick included to recompute when seen markers change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, idsKey, seenTick]);
}
