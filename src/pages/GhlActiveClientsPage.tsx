import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GHL_BASE = "https://services.leadconnectorhq.com";
const LOCATION_ID = "2UvLCJLDqEYjWtuPdjaR";
const TOKEN = "pit-9e416e9c-99e8-4507-9c57-e6c824f50723";

const PROTECTED_TAGS = [
  "active-client",
  "mer-workflow",
  "ap-expense",
  "ap-payroll",
  "ar-education",
  "ar-nonprofits",
];
const CATEGORY_TAGS = new Set([
  "mer-workflow",
  "ap-expense",
  "ap-payroll",
  "ar-education",
  "ar-nonprofits",
]);

type GhlContact = {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  tags?: string[];
};

const ghlHeaders = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${TOKEN}`,
  Version: "2021-07-28",
  ...extra,
});

function contactName(c: GhlContact) {
  const company = (c.companyName || "").trim();
  if (company) return company;
  const full = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return full || "Unnamed Contact";
}

function tagClass(tag: string) {
  if (tag === "active-client")
    return "bg-success/15 text-success border-success/30";
  if (CATEGORY_TAGS.has(tag))
    return "bg-primary/15 text-primary border-primary/30";
  return "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400";
}

export default function GhlActiveClientsPage() {
  const [contacts, setContacts] = useState<GhlContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmFor, setConfirmFor] = useState<GhlContact | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      // Attempt 1: tag-filtered list endpoint
      const tagged = await fetch(
        `${GHL_BASE}/contacts/?locationId=${LOCATION_ID}&limit=100&tags[]=active-client`,
        { headers: ghlHeaders() },
      );
      if (tagged.ok) {
        const json = await tagged.json();
        const list: GhlContact[] = json.contacts || [];
        const filtered = list.filter((c) =>
          (c.tags || []).includes("active-client"),
        );
        if (filtered.length >= 47) {
          setContacts(filtered);
          return;
        }
      }

      // Fallback: paginate all contacts with startAfter, then client-side filter
      const collected: GhlContact[] = [];
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
          headers: ghlHeaders(),
        });
        if (!res.ok) throw new Error(`GHL fetch failed (${res.status})`);
        const json = await res.json();
        const page: GhlContact[] = json.contacts || [];
        if (page.length === 0) break;
        collected.push(...page);
        const meta = json.meta || {};
        const nextStartAfter = meta.startAfter ?? meta.nextStartAfter;
        const nextStartAfterId = meta.startAfterId ?? meta.nextStartAfterId;
        if (!nextStartAfter && !nextStartAfterId) break;
        if (
          nextStartAfter === startAfter &&
          nextStartAfterId === startAfterId
        )
          break;
        startAfter = nextStartAfter;
        startAfterId = nextStartAfterId;
      }
      setContacts(
        collected.filter((c) => (c.tags || []).includes("active-client")),
      );
    } catch (e: any) {
      setError(e?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchAll();
  }, []);

  const refetchContact = async (id: string) => {
    try {
      const res = await fetch(`${GHL_BASE}/contacts/${id}`, {
        headers: ghlHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      const updated: GhlContact = json.contact || json;
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updated } : c)),
      );
    } catch {
      /* ignore */
    }
  };

  const handleClear = async (c: GhlContact) => {
    const toRemove = (c.tags || []).filter(
      (t) => !PROTECTED_TAGS.includes(t),
    );
    if (toRemove.length === 0) {
      toast({ title: "No cycle tags to clear", description: contactName(c) });
      setConfirmFor(null);
      return;
    }
    setClearingId(c.id);
    try {
      const res = await fetch(`${GHL_BASE}/contacts/${c.id}/tags`, {
        method: "DELETE",
        headers: ghlHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tags: toRemove }),
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await refetchContact(c.id);
      toast({ title: `Cycle tags cleared for ${contactName(c)}` });
      setConfirmFor(null);
    } catch (e: any) {
      toast({
        title: "Failed to clear tags",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setClearingId(null);
    }
  };

  const sorted = useMemo(
    () =>
      [...contacts].sort((a, b) =>
        contactName(a).localeCompare(contactName(b)),
      ),
    [contacts],
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            GHL Active Clients
          </h2>
          <span className="text-xs text-muted-foreground">
            {loading ? "…" : `${sorted.length} contacts`}
          </span>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading active clients…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No active clients found.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((c) => {
          const tags = c.tags || [];
          const removable = tags.filter((t) => !PROTECTED_TAGS.includes(t));
          const busy = clearingId === c.id;
          return (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-card p-4 shadow-card flex flex-col gap-3"
            >
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {contactName(c)}
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.length === 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    No tags
                  </span>
                )}
                {tags.map((t) => (
                  <span
                    key={t}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${tagClass(t)}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-1">
                <button
                  onClick={() => setConfirmFor(c)}
                  disabled={busy || removable.length === 0}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors disabled:opacity-40"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Clear Cycle Tags
                  {removable.length > 0 && (
                    <span className="text-[10px] opacity-70">
                      ({removable.length})
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={!!confirmFor}
        onOpenChange={(o) => !o && !clearingId && setConfirmFor(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear cycle tags?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all non-protected tags from{" "}
              <span className="font-semibold text-foreground">
                {confirmFor ? contactName(confirmFor) : ""}
              </span>
              . Protected tags (active-client + category tags) will be kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!clearingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmFor) handleClear(confirmFor);
              }}
              disabled={!!clearingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearingId ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Clearing…
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
