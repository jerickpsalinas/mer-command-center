// Admin-only user management. Verifies caller has role=admin in user_profiles
// before performing any privileged auth/profile operation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const URL_BASE = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const userClient = createClient(URL_BASE, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const admin = createClient(URL_BASE, SERVICE_KEY);
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return null;
  return { user, admin };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const ctx = await requireAdmin(req);
    if (!ctx) return json({ error: "Forbidden" }, 403);
    const { admin } = ctx;
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";

    if (req.method === "GET" || action === "list") {
      const { data, error } = await admin
        .from("user_profiles")
        .select("id, user_id, name, email, role, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ users: data ?? [] });
    }

    const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};

    if (action === "invite") {
      const { email, name, role } = body as { email: string; name: string; role: string };
      if (!email || !name || !role) return json({ error: "Missing fields" }, 400);
      const { data: invited, error: inviteErr } =
        await admin.auth.admin.inviteUserByEmail(email, { data: { name } });
      if (inviteErr || !invited.user) {
        return json({ error: inviteErr?.message ?? "Invite failed" }, 400);
      }
      const newUserId = invited.user.id;
      // Trigger may have already created a default-role profile; update it.
      const { error: upsertErr } = await admin
        .from("user_profiles")
        .upsert(
          { user_id: newUserId, name, email, role },
          { onConflict: "user_id" },
        );
      if (upsertErr) return json({ error: upsertErr.message }, 400);
      return json({ ok: true, user_id: newUserId });
    }

    if (action === "update-role") {
      const { id, role } = body as { id: string; role: string };
      if (!id || !role) return json({ error: "Missing fields" }, 400);
      const { error } = await admin
        .from("user_profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "remove") {
      const { id } = body as { id: string };
      if (!id) return json({ error: "Missing id" }, 400);
      const { data: row, error: fetchErr } = await admin
        .from("user_profiles")
        .select("user_id")
        .eq("id", id)
        .maybeSingle();
      if (fetchErr || !row) return json({ error: "Profile not found" }, 404);
      await admin.from("user_profiles").delete().eq("id", id);
      const { error: delErr } = await admin.auth.admin.deleteUser(row.user_id);
      if (delErr) return json({ error: delErr.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
