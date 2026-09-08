import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GHL_BASE, GHL_LOCATION_ID, ghlHeaders } from "@/lib/ghlConfig";
import { DEMO_MODE } from "@/lib/demoMode";
import { DEMO_GHL_TAGS } from "@/data/demoSheet";

type GhlContact = {
  id: string;
  tags?: string[];
};

export type GhlTagsMap = Record<string, string[]>;

async function fetchAllGhlTags(): Promise<GhlTagsMap> {
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
  return map;
}

export function useGhlTags() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<GhlTagsMap, Error>({
    queryKey: ["ghl-tags-map"],
    queryFn: DEMO_MODE ? async () => DEMO_GHL_TAGS : fetchAllGhlTags,
    staleTime: 0,
    gcTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["ghl-tags-map"] });
  }, [queryClient]);

  const applyTag = useCallback(
    async (contactId: string, tag: string) => {
      const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
        method: "POST",
        headers: ghlHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tags: [tag] }),
      });
      if (!res.ok) throw new Error(`POST failed (${res.status})`);
      queryClient.setQueryData<GhlTagsMap>(["ghl-tags-map"], (prev) => {
        const base = prev || {};
        const existing = base[contactId] || [];
        if (existing.includes(tag)) return base;
        return { ...base, [contactId]: [...existing, tag] };
      });
    },
    [queryClient],
  );

  return {
    tagsMap: data ?? {},
    loading: isLoading,
    error: error?.message ?? null,
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
