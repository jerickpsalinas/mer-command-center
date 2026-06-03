import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Loads the set of "developer" actor identities (name + email, lowercased)
 * from user_profiles so any activity/leaderboard view can hide their
 * footprint. Builders aren't part of operations and should not appear in
 * compliance metrics, leaderboards, or activity logs.
 */
export function useDeveloperFilter() {
  const [developerIds, setDeveloperIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("name,email,role");
      if (cancelled) return;
      const set = new Set<string>();
      for (const p of data ?? []) {
        if ((p.role || "").toLowerCase() !== "developer") continue;
        if (p.name) set.add(p.name.trim().toLowerCase());
        if (p.email) set.add(p.email.trim().toLowerCase());
      }
      setDeveloperIds(set);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isDeveloper = useMemo(
    () => (actor: string | undefined | null) => {
      if (!actor) return false;
      return developerIds.has(actor.trim().toLowerCase());
    },
    [developerIds],
  );

  return { developerIds, isDeveloper };
}
