import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbwtoATJXBCb-Yxmim2wWVh5d5baB9Dg1UMQOmhoQiCR1Z-7nFR1fEzM3IbBIpkUq2bj/exec";

function getNyOffsetMinutes(d: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  });
  const tzName =
    fmt.formatToParts(d).find((p) => p.type === "timeZoneName")?.value ??
    "GMT-5";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(tzName);
  if (!m) return 300;
  const sign = m[1] === "+" ? 1 : -1;
  const hours = Number(m[2]);
  const mins = Number(m[3] ?? "0");
  return -sign * (hours * 60 + mins);
}

function lastWeeklyAnchor(now: Date): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dow = weekdayMap[parts.weekday] ?? 1;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  let daysBack = (dow + 6) % 7;
  if (dow === 1 && hour === 0 && minute < 1) daysBack = 7;
  const anchorNyMs =
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      0,
      1,
      0,
    ) - daysBack * 86_400_000;
  const off = getNyOffsetMinutes(new Date(anchorNyMs));
  return new Date(anchorNyMs + off * 60_000);
}

function parseTs(s: string): number {
  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const resp = await fetch(`${SHEET_URL}?t=${Date.now()}`);
    if (!resp.ok) throw new Error(`Sheet fetch failed: ${resp.status}`);
    const json = await resp.json();
    const merRows: Record<string, string>[] =
      json.merDashboardData || json.merHistory || json.rows || [];

    // Latest row per ghl contact id
    const latest = new Map<
      string,
      { contactId: string; name: string; status: string; ts: number }
    >();
    for (const r of merRows) {
      const contactId =
        (r["GHL Contact ID"] || r["ghlContactId"] || "").toString().trim();
      const name = (r["Client Name"] || r["Company Name"] || "").toString().trim();
      const status = (r["Status"] || "").toString().trim();
      const ts = parseTs((r["Timestamp"] || r["timestamp"] || "").toString());
      const id = contactId || name;
      if (!id || !status) continue;
      const existing = latest.get(id);
      if (!existing || ts >= existing.ts) {
        latest.set(id, { contactId: id, name, status, ts });
      }
    }

    const anchor = lastWeeklyAnchor(new Date());
    let inserted = 0;
    let skipped = 0;

    for (const { contactId, name, status } of latest.values()) {
      const { data: last } = await supabase
        .from("client_status_history")
        .select("status, recorded_at")
        .eq("ghl_contact_id", contactId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastTs = last ? new Date(last.recorded_at).getTime() : 0;
      const lastStatus = (last?.status ?? "").trim();

      let source: "change" | "daily" | null = null;
      if (!last) source = "change";
      else if (lastStatus !== status) source = "change";
      else if (lastTs < anchor.getTime()) source = "daily";

      if (source) {
        await supabase.from("client_status_history").insert({
          ghl_contact_id: contactId,
          client_name: name,
          status,
          source,
        });
        inserted++;
      } else {
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        anchor: anchor.toISOString(),
        clients: latest.size,
        inserted,
        skipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
