/**
 * Single shared GHL contacts fetch.
 *
 * Every hook that needs the full GHL contact list (tags, mer-workflow
 * filtering, inactive-client filtering) should consume from here
 * instead of paginating /contacts independently.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GHL_BASE, GHL_LOCATION_ID, ghlHeaders } from "@/lib/ghlConfig";
import { DEMO_MODE } from "@/lib/demoMode";

export type GhlContact = {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  tags?: string[];
};

const QUERY_KEY = ["ghl-all-contacts"] as const;

async function fetchAllGhlContacts(): Promise<GhlContact[]> {
  const collected: GhlContact[] = [];
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

    collected.push(...page);
    const meta = json.meta || {};
    const nextStartAfter = meta.startAfter ?? meta.nextStartAfter;
    const nextStartAfterId = meta.startAfterId ?? meta.nextStartAfterId;
    if (!nextStartAfter && !nextStartAfterId) break;
    if (nextStartAfter === startAfter && nextStartAfterId === startAfterId)
      break;

    startAfter = nextStartAfter;
    startAfterId = nextStartAfterId;
  }

  return collected;
}

export function useGhlContacts() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: DEMO_MODE ? () => Promise.resolve([]) : fetchAllGhlContacts,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  return {
    contacts: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message || "Failed to load contacts" : null,
    refresh,
  };
}
