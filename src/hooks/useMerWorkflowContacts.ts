import { useMemo } from "react";
import { useGhlContacts, type GhlContact } from "@/hooks/useGhlContacts";

export type MerWorkflowContact = GhlContact;

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
  const { contacts: allContacts, loading, error, refresh } = useGhlContacts();

  const contacts = useMemo(
    () =>
      allContacts.filter((c) => {
        const tags = (c.tags || []).map((t) => (t || "").toLowerCase());
        return (
          tags.includes("mer-workflow") &&
          !tags.includes("ready-for-cleanup") &&
          !tags.includes("inactive-client")
        );
      }),
    [allContacts],
  );

  return { contacts, loading, error, refresh };
}
