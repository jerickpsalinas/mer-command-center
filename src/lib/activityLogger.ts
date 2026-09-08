import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE } from "@/lib/demoMode";

export async function logActivity({
  action,
  clientName,
  page,
  details,
  cycleMonth,
}: {
  action: string;
  clientName: string;
  page: string;
  details?: string;
  cycleMonth?: string;
}) {
  if (DEMO_MODE) return; // demo build never writes to a backend
  try {
    let triggeredBy: string | null = null;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (uid) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("name,email")
          .eq("id", uid)
          .maybeSingle();
        triggeredBy =
          profile?.name || profile?.email || authData.user?.email || "Dashboard";
      }
    } catch (authErr) {
      console.error("[activityLogger] Failed to resolve auth user:", authErr);
    }
    const { error } = await supabase.from("activity_log").insert({
      action,
      client_name: clientName,
      triggered_by: triggeredBy,
      success: true,
      message: details || null,
      cycle_month: cycleMonth || null,
      page: page || null,
    });
    if (error) {
      console.error("[activityLogger] Insert failed:", error, {
        action,
        clientName,
        page,
      });
    }
  } catch (err) {
    console.error("[activityLogger] Failed to log activity:", err);
  }
}
