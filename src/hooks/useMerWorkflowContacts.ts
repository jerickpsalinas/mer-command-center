import { useEffect, useState, useCallback } from "react";

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

export function useMerWorkflowContacts() {
  const [contacts, setContacts] = useState<MerWorkflowContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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
      setContacts(
        collected.filter((c) => {
          const tags = c.tags || [];
          const normalized = tags.map((t) => (t || "").toLowerCase());
          return (
            normalized.includes("mer-workflow") &&
            !normalized.includes("ready-for-cleanup")
          );
        }),
      );
    } catch (e: any) {
      setError(e?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { contacts, loading, error, refresh: fetchAll };
}
