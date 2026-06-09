import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  return [];
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
