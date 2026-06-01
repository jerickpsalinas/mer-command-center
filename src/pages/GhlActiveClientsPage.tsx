import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, RefreshCw, Search, Trash2, UserCheck, UserMinus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GHL_BASE = "https://services.leadconnectorhq.com";
const LOCATION_ID = "2UvLCJLDqEYjWtuPdjaR";
const TOKEN = "pit-9e416e9c-99e8-4507-9c57-e6c824f50723";

const PROTECTED_TAGS = [
  "active-client",
  "ready-for-cleanup",
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
const CATEGORY_OPTIONS: { tag: string; label: string }[] = [
  { tag: "mer-workflow", label: "MER Workflow" },
  { tag: "ap-expense", label: "AP — Expense" },
  { tag: "ap-payroll", label: "AP — Payroll" },
  { tag: "ar-education", label: "AR — Education" },
  { tag: "ar-nonprofits", label: "AR — Nonprofits" },
];

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

const ADMIN_PASSWORD = "@Access.H20";

type PendingAction =
  | { kind: "single"; contact: GhlContact }
  | { kind: "bulk"; contacts: GhlContact[] }
  | null;

export default function GhlActiveClientsPage() {
  const { isAdmin } = useAuth();
  const [removing, setRemoving] = useState<GhlContact | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<GhlContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [pending, setPending] = useState<PendingAction>(null);
  const [authStep, setAuthStep] = useState<"password" | "confirm" | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [clearingId, setClearingId] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{
    done: number;
    total: number;
    failed: number;
  } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
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

  const clearTagsFor = async (c: GhlContact): Promise<boolean> => {
    const toRemove = (c.tags || []).filter(
      (t) => !PROTECTED_TAGS.includes(t),
    );
    if (toRemove.length === 0) return true;
    const res = await fetch(`${GHL_BASE}/contacts/${c.id}/tags`, {
      method: "DELETE",
      headers: ghlHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ tags: toRemove }),
    });
    if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    await refetchContact(c.id);
    return true;
  };

  const runSingle = async (c: GhlContact) => {
    setClearingId(c.id);
    try {
      const toRemove = (c.tags || []).filter(
        (t) => !PROTECTED_TAGS.includes(t),
      );
      if (toRemove.length === 0) {
        toast({ title: "No cycle tags to clear", description: contactName(c) });
      } else {
        await clearTagsFor(c);
        toast({ title: `Cycle tags cleared for ${contactName(c)}` });
      }
      closeDialog();
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

  const runBulk = async (list: GhlContact[]) => {
    setBulkProgress({ done: 0, total: list.length, failed: 0 });
    let failed = 0;
    for (let i = 0; i < list.length; i++) {
      try {
        await clearTagsFor(list[i]);
      } catch {
        failed++;
      }
      setBulkProgress({ done: i + 1, total: list.length, failed });
    }
    toast({
      title: `Bulk clear complete`,
      description: `${list.length - failed} cleared${failed ? `, ${failed} failed` : ""}.`,
      variant: failed ? "destructive" : undefined,
    });
    setBulkProgress(null);
    setSelected(new Set());
    closeDialog();
  };

  const closeDialog = () => {
    setPending(null);
    setAuthStep(null);
    setPassword("");
    setPasswordError(null);
  };

  const confirmRemoveClient = async () => {
    if (!removing) return;
    const c = removing;
    setRemovingId(c.id);
    try {
      const res = await fetch(`${GHL_BASE}/contacts/${c.id}/tags`, {
        method: "DELETE",
        headers: ghlHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tags: ["active-client"] }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setContacts((prev) => prev.filter((x) => x.id !== c.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
      toast({ title: "Client removed from active list", description: contactName(c) });
      setRemoving(null);
    } catch (e: any) {
      toast({
        title: "Failed to remove client",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };



  const openSingle = (c: GhlContact) => {
    setPending({ kind: "single", contact: c });
    setAuthStep("password");
  };

  const openBulk = () => {
    const list = sorted.filter((c) => selected.has(c.id));
    if (list.length === 0) return;
    setPending({ kind: "bulk", contacts: list });
    setAuthStep("password");
  };

  const submitPassword = () => {
    if (password !== ADMIN_PASSWORD) {
      setPasswordError("Incorrect password");
      return;
    }
    setPasswordError(null);
    setAuthStep("confirm");
  };

  const submitConfirm = () => {
    if (!pending) return;
    if (pending.kind === "single") runSingle(pending.contact);
    else runBulk(pending.contacts);
  };

  const sorted = useMemo(
    () =>
      [...contacts].sort((a, b) =>
        contactName(a).localeCompare(contactName(b)),
      ),
    [contacts],
  );

  const allSelected =
    sorted.length > 0 && sorted.every((c) => selected.has(c.id));
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sorted.map((c) => c.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const busy = clearingId !== null || bulkProgress !== null;

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
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={openBulk}
              disabled={selected.size === 0 || busy}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Cycle Tags
              {selected.size > 0 && <span>({selected.size} selected)</span>}
            </button>
          )}
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

      {!loading && !error && sorted.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <input
              type="checkbox"
              aria-label="Select all"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            <span>Contact</span>
            <span className="pr-1">Actions</span>
          </div>
          <ul className="divide-y divide-border">
            {sorted.map((c) => {
              const tags = c.tags || [];
              const removable = tags.filter(
                (t) => !PROTECTED_TAGS.includes(t),
              );
              const isClearing = clearingId === c.id;
              const isChecked = selected.has(c.id);
              return (
                <li
                  key={c.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${contactName(c)}`}
                    checked={isChecked}
                    onChange={() => toggleOne(c.id)}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground truncate max-w-[260px]">
                      {contactName(c)}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${tagClass(t)}`}
                        >
                          {t}
                        </span>
                      ))}
                      {tags.length === 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          No tags
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => openSingle(c)}
                        disabled={isClearing || removable.length === 0 || busy}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors disabled:opacity-40"
                      >
                        {isClearing ? (
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
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setRemoving(c)}
                        disabled={busy || removingId === c.id}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-colors disabled:opacity-40"
                      >
                        {removingId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserMinus className="h-3.5 w-3.5" />
                        )}
                        Remove Client
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AlertDialog
        open={!!pending}
        onOpenChange={(o) => {
          if (!o && !clearingId && !bulkProgress) closeDialog();
        }}
      >
        <AlertDialogContent>
          {authStep === "password" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Admin password required</AlertDialogTitle>
                <AlertDialogDescription>
                  Enter the admin password to clear cycle tags
                  {pending?.kind === "bulk"
                    ? ` for ${pending.contacts.length} contacts.`
                    : pending?.kind === "single"
                      ? ` for ${contactName(pending.contact)}.`
                      : "."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitPassword();
                    }
                  }}
                  placeholder="Admin password"
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {passwordError && (
                  <p className="text-xs text-destructive">{passwordError}</p>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    submitPassword();
                  }}
                >
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}

          {authStep === "confirm" && pending && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear cycle tags?</AlertDialogTitle>
                <AlertDialogDescription>
                  {pending.kind === "bulk" ? (
                    <>
                      This will clear cycle tags from{" "}
                      <span className="font-semibold text-foreground">
                        {pending.contacts.length} selected contacts
                      </span>
                      . Protected tags (active-client + category tags) will be
                      kept. Are you sure?
                    </>
                  ) : (
                    <>
                      This will remove all non-protected tags from{" "}
                      <span className="font-semibold text-foreground">
                        {contactName(pending.contact)}
                      </span>
                      . Protected tags will be kept.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {bulkProgress && (
                <div className="space-y-1.5">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${(bulkProgress.done / bulkProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clearing {bulkProgress.done} of {bulkProgress.total}
                    {bulkProgress.failed > 0 &&
                      ` · ${bulkProgress.failed} failed`}
                  </p>
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    submitConfirm();
                  }}
                  disabled={busy}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Clearing…
                    </>
                  ) : (
                    "Confirm"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!removing}
        onOpenChange={(o) => {
          if (!o && !removingId) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-semibold text-foreground">
                {removing ? contactName(removing) : ""}
              </span>{" "}
              from the active client list and remove their active-client tag in GHL. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmRemoveClient();
              }}
              disabled={!!removingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingId ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Removing…
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

