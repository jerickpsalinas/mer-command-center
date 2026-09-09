// Generates a plain-English monthly bookkeeping health summary for a client.
// Requires an authenticated caller (any signed-in user). The Anthropic API key
// is read from Deno.env.get("ANTHROPIC_API_KEY") — never exposed to the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const URL_BASE = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const userClient = createClient(URL_BASE, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  return user ?? null;
}

const usd = (n: unknown) => {
  const v = Number(n);
  return `$${(Number.isFinite(v) ? v : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Forbidden" }, 403);

    const c = await req.json().catch(() => ({} as Record<string, unknown>));

    const facts = [
      `Client: ${c.name ?? "Unknown"}`,
      `Type: ${c.clientType ?? "Unknown"}`,
      `Bookkeeper: ${c.bookkeeper ?? "Unassigned"}`,
      `Compliance status: ${c.complianceStatus ?? "Unknown"}`,
      `Completion: ${c.completionPct ?? 0}%`,
      `Total Income: ${usd(c.totalIncome)}`,
      `Total Expenses: ${usd(c.totalExpenses)}`,
      `Net Income: ${usd(c.netIncome)}`,
      `Last Reconciled Date: ${c.lastReconciledDate || "Not reconciled"}`,
      `Books Closed In QB: ${c.booksClosedInQB ? "Yes" : "No"}`,
      `Bank Transactions: ${c.bankTransactions ?? "Unknown"}`,
      `Uncategorized Transactions: ${c.uncategorizedTransactions ?? 0}`,
      `Unapplied Payments: ${c.unappliedPayments ?? 0}`,
    ].join("\n");

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system:
          "You are a bookkeeping analyst. Write a 3-4 sentence plain-English health summary for this client's monthly bookkeeping status. Be direct and actionable. Flag any concerns. Use USD currency formatting. Do not use any markdown formatting. Write in plain text only. No bold, no headers, no asterisks.",
        messages: [{ role: "user", content: facts }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return json({ error: `Anthropic API error ${resp.status}: ${detail}` }, 502);
    }

    const data = await resp.json();
    const text = Array.isArray(data?.content)
      ? data.content.map((b: { text?: string }) => b?.text ?? "").join("").trim()
      : "";

    if (!text) return json({ error: "No summary generated." }, 502);
    return json({ text });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
