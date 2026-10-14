import { useMemo } from "react";
import { useGhlContacts } from "@/hooks/useGhlContacts";

export function useInactiveClientIds() {
  const { contacts, loading } = useGhlContacts();

  const inactiveIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of contacts) {
      const tags = (c.tags || []).map((t: string) => (t || "").toLowerCase());
      if (tags.includes("inactive-client")) {
        ids.add(c.id);
      }
    }
    return ids;
  }, [contacts]);

  return { inactiveIds, loading };
}
