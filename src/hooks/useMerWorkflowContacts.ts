import { useQuery, useQueryClient } from "@tanstack/react-query";

const GHL_BASE = "https://services.leadconnectorhq.com";
const LOCATION_ID = "2UvLCJLDqEYjWtuPdjaR";
const TOKEN = "pit-9e416e9c-99e8-4507-9c57-e6c824f50723";

const headers = () => ({
  Authorization: `Bearer ${TOKEN}`,
  Version: "2021-07-28",
});

export type MerWorkflowContact = {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  tags?: string[];
};

function capitalizeWords(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function contactDisplayName(c: MerWorkflowContact): string {
  const company = capitalizeWords((c.companyName || "").trim());
  if (company) return company;
  const full = capitalizeWords(
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim(),
  );
  return full || "Unnamed Contact";
}

async function fetchAllContacts(): Promise<MerWorkflowContact[]> {
  const collected: MerWorkflowContact[] = [];
  let startAfter: string | number | undefined;
  let startAfterId: string | undefined;

  for (let i = 0; i < 50; i++) {
    const params = new URLSearchParams({
      locationId: LOCATION_ID,
      limit: "100",
    });
    if (startAfter != null) params.set("startAfter", String(startAfter));
    if (startAfterId) params.set("startAfterId", startAfterId);

    const res = await fetch(`${GHL_BASE}/contacts/?${params.toString()}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`GHL fetch failed (${res.status})`);

    const json = await res.json();
    const page: MerWorkflowContact[] = json.contacts || [];
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

  return collected.filter((c) => {
    const tags = c.tags || [];
    const normalized = tags.map((t) => (t || "").toLowerCase());
    return (
      normalized.includes("mer-workflow") &&
      !normalized.includes("ready-for-cleanup")
    );
  });
}

export function useMerWorkflowContacts() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["mer-workflow-contacts"],
    queryFn: fetchAllContacts,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["mer-workflow-contacts"] });
  };

  return {
    contacts: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message || "Failed to load contacts" : null,
    refresh,
  };
}
