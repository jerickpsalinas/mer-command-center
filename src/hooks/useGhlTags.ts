import { useCallback, useEffect, useState } from "react";
import { GHL_BASE, GHL_LOCATION_ID, ghlHeaders } from "@/lib/ghlConfig";

type GhlContact = {
  id: string;
  tags?: string[];
};

export type GhlTagsMap = Record<string, string[]>;

export function useGhlTags() {
  const [tagsMap, setTagsMap] = useState<GhlTagsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const map: GhlTagsMap = {};
      let startAfter: string | number | undefined;
      let startAfterId: string | undefined;
      for (let i = 0; i < 50; i++) {
        const params = new URLSearchParams({
          locationId: GHL_LOCATION_ID,
          limit: "100",
        });
        if (startAfter != null) params.set("startAfter", String(startAfter));
        if (startAfterId) params.set("startAfterId", startAfterId);
        const res = await fetch(`${GHL_BASE}/contacts/?${params.toString()}`, {
          headers: ghlHeaders(),
        });
        if (!res.ok) throw new Error(`GHL fetch failed (${res.status})`);
        const json = await res.json();
        const page: GhlContact[] = json.contacts || [];
        if (page.length === 0) break;
        for (const c of page) {
          if (c.id) map[c.id] = c.tags || [];
        }
        const meta = json.meta || {};
        const nextStartAfter = meta.startAfter ?? meta.nextStartAfter;
        const nextStartAfterId = meta.startAfterId ?? meta.nextStartAfterId;
        if (!nextStartAfter && !nextStartAfterId) break;
        if (nextStartAfter === startAfter && nextStartAfterId === startAfterId)
          break;
        startAfter = nextStartAfter;
        startAfterId = nextStartAfterId;
      }
      setTagsMap(map);
    } catch (e: any) {
      setError(e?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const applyTag = useCallback(async (contactId: string, tag: string) => {
    const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: "POST",
      headers: ghlHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ tags: [tag] }),
    });
    if (!res.ok) throw new Error(`POST failed (${res.status})`);
    setTagsMap((prev) => {
      const existing = prev[contactId] || [];
      if (existing.includes(tag)) return prev;
      return { ...prev, [contactId]: [...existing, tag] };
    });
  }, []);

  return { tagsMap, loading, error, refresh: fetchAll, applyTag };
}

export type CycleKind = "regular" | "cleanup";

export function getNextCycleTag(
  tags: string[],
): { kind: CycleKind; next: string } | { kind: CycleKind; next: null } | null {
  const has = (t: string) => tags.includes(t);
  if (has("ready-for-pipeline")) {
    if (!has("docs-received")) return { kind: "regular", next: "docs-received" };
    if (!has("review-ready")) return { kind: "regular", next: "review-ready" };
    if (!has("jessica-approved"))
      return { kind: "regular", next: "jessica-approved" };
    return { kind: "regular", next: null };
  }
  if (has("ready-for-cleanup")) {
    if (!has("docs-received-cleanup"))
      return { kind: "cleanup", next: "docs-received-cleanup" };
    if (!has("review-ready-cleanup"))
      return { kind: "cleanup", next: "review-ready-cleanup" };
    if (!has("jessica-approved-cleanup"))
      return { kind: "cleanup", next: "jessica-approved-cleanup" };
    return { kind: "cleanup", next: null };
  }
  return null;
}
