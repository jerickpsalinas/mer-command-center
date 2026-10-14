import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GHL_BASE, ghlHeaders } from "@/lib/ghlConfig";
import { DEMO_MODE } from "@/lib/demoMode";
import { useGhlContacts } from "@/hooks/useGhlContacts";

export type GhlTagsMap = Record<string, string[]>;

export function useGhlTags() {
  const queryClient = useQueryClient();
  const { contacts, loading, error, refresh } = useGhlContacts();

  const tagsMap = useMemo<GhlTagsMap>(() => {
    const map: GhlTagsMap = {};
    for (const c of contacts) {
      if (c.id) map[c.id] = c.tags || [];
    }
    return map;
  }, [contacts]);

  const applyTag = useCallback(
    async (contactId: string, tag: string) => {
      if (DEMO_MODE) return; // demo build never writes to GHL
      const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
        method: "POST",
        headers: ghlHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tags: [tag] }),
      });
      if (!res.ok) throw new Error(`POST failed (${res.status})`);
      // Optimistically update the shared contacts cache
      queryClient.setQueryData<typeof contacts>(["ghl-all-contacts"], (prev) => {
        if (!prev) return prev;
        return prev.map((c) =>
          c.id === contactId && !(c.tags || []).includes(tag)
            ? { ...c, tags: [...(c.tags || []), tag] }
            : c,
        );
      });
    },
    [queryClient],
  );

  return {
    tagsMap,
    loading,
    error: error ?? null,
    refresh,
    applyTag,
  };
}

export type CycleKind = "regular" | "cleanup";

export function getNextCycleTag(
  tags: string[],
): { kind: CycleKind; next: string } | { kind: CycleKind; next: null } | null {
  const has = (t: string) => tags.includes(t);
  if (has("ready-for-pipeline")) {
    if (has("review-ready") && !has("jessica-approved"))
      return { kind: "regular", next: "jessica-approved" };
    return { kind: "regular", next: null };
  }
  if (has("ready-for-cleanup")) {
    if (has("review-ready-cleanup") && !has("jessica-approved-cleanup"))
      return { kind: "cleanup", next: "jessica-approved-cleanup" };
    return { kind: "cleanup", next: null };
  }
  return null;
}
