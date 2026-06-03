import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, RefreshCw, Search, Trash2, UserCheck, UserMinus, X } from "lucide-react";
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

function capitalizeWords(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function hasTag(c: GhlContact, tag: string) {
  const t = tag.toLowerCase();
  return (c.tags || []).some((x) => (x || "").toLowerCase() === t);
}

function contactName(c: GhlContact) {
  const company = capitalizeWords((c.companyName || "").trim());
  if (company) return company;
  const full = capitalizeWords(
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim(),
  );
  return full || "Unnamed Contact";
}

function tagClass(tag: string) {
  if (tag === "active-client")
    return "bg-success/15 text-success border-success/30";
  if (CATEGORY_TAGS.has(tag))
    return "bg-primary/15 text-primary border-primary/30";
  return "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400";
}



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
  const [filter, setFilter] = useState<"all" | "regular" | "cleanup">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<GhlContact | null>(null);
  const [editingSelected, setEditingSelected] = useState<Set<string>>(new Set());
  const [savingEdit, setSavingEdit] = useState(false);

  const [pending, setPending] = useState<PendingAction>(null);


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
  };

  const openBulk = () => {
    const list = sorted.filter((c) => selected.has(c.id));
    if (list.length === 0) return;
    setPending({ kind: "bulk", contacts: list });
  };


  const submitConfirm = () => {
    if (!pending) return;
    if (pending.kind === "single") runSingle(pending.contact);
    else runBulk(pending.contacts);
  };

  const sortedAll = useMemo(
    () =>
      [...contacts].sort((a, b) =>
        contactName(a).localeCompare(contactName(b)),
      ),
    [contacts],
  );

  const regularCount = useMemo(
    () => sortedAll.filter((c) => hasTag(c, "ready-for-pipeline")).length,
    [sortedAll],
  );
  const cleanupCount = useMemo(
    () => sortedAll.filter((c) => hasTag(c, "ready-for-cleanup")).length,
    [sortedAll],
  );

  const sorted = useMemo(() => {
    let list = sortedAll;
    if (filter === "regular")
      list = list.filter((c) => hasTag(c, "ready-for-pipeline"));
    else if (filter === "cleanup")
      list = list.filter((c) => hasTag(c, "ready-for-cleanup"));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => contactName(c).toLowerCase().includes(q));
    return list;
  }, [sortedAll, filter, search]);

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

  const openEdit = (c: GhlContact) => {
    const current = new Set(
      (c.tags || []).filter((t) => CATEGORY_TAGS.has(t)),
    );
    setEditingSelected(current);
    setEditing(c);
  };

  const toggleEditTag = (tag: string) => {
    setEditingSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const c = editing;
    const current = new Set((c.tags || []).filter((t) => CATEGORY_TAGS.has(t)));
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    for (const { tag } of CATEGORY_OPTIONS) {
      const want = editingSelected.has(tag);
      const have = current.has(tag);
      if (want && !have) toAdd.push(tag);
      if (!want && have) toRemove.push(tag);
    }
    setSavingEdit(true);
    try {
      if (toAdd.length > 0) {
        const res = await fetch(`${GHL_BASE}/contacts/${c.id}/tags`, {
          method: "POST",
          headers: ghlHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ tags: toAdd }),
        });
        if (!res.ok) throw new Error(`Add failed (${res.status})`);
      }
      if (toRemove.length > 0) {
        const res = await fetch(`${GHL_BASE}/contacts/${c.id}/tags`, {
          method: "DELETE",
          headers: ghlHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ tags: toRemove }),
        });
        if (!res.ok) throw new Error(`Remove failed (${res.status})`);
      }
      await refetchContact(c.id);
      toast({ title: `Category tags updated for ${contactName(c)}` });
      setEditing(null);
    } catch (e: any) {
      toast({
        title: "Failed to update tags",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const filterBtn = (
    key: "all" | "regular" | "cleanup",
    label: string,
    count?: number,
  ) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-colors ${
        filter === key
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border hover:bg-muted"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className="ml-1 opacity-80">({count})</span>
      )}
    </button>
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
            {loading ? "…" : `${sorted.length} of ${sortedAll.length} contacts`}
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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {filterBtn("all", "All", sortedAll.length)}
          {filterBtn("regular", "Regular", regularCount)}
          {filterBtn("cleanup", "Cleanup", cleanupCount)}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full h-9 pl-9 pr-9 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
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
        <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[24px_1.4fr_1.2fr_1.6fr_160px] items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
              <span>Category Tags</span>
              <span>Cycle Tags</span>
              <span className="pr-1 text-right">Actions</span>
            </div>
            <ul className="divide-y divide-border">
              {sorted.map((c) => {
                const tags = c.tags || [];
                const categoryTags = tags.filter((t) => CATEGORY_TAGS.has(t));
                const cycleTags = tags.filter(
                  (t) => t !== "active-client" && !CATEGORY_TAGS.has(t),
                );
                const removable = tags.filter(
                  (t) => !PROTECTED_TAGS.includes(t),
                );
                const isClearing = clearingId === c.id;
                const isChecked = selected.has(c.id);
                const company = capitalizeWords((c.companyName || "").trim());
                const full = capitalizeWords(
                  [c.firstName, c.lastName].filter(Boolean).join(" ").trim(),
                );
                return (
                  <li
                    key={c.id}
                    className="grid grid-cols-[24px_1.4fr_1.2fr_1.6fr_160px] items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${contactName(c)}`}
                      checked={isChecked}
                      onChange={() => toggleOne(c.id)}
                      className="h-4 w-4 mt-1 rounded border-border accent-primary cursor-pointer"
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground break-words">
                        {company || full || "Unnamed Contact"}
                      </h3>
                      {company && full && (
                        <p className="text-[11px] text-muted-foreground break-words">
                          {full}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {categoryTags.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">
                          —
                        </span>
                      ) : (
                        categoryTags.map((t) => (
                          <span
                            key={t}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${tagClass(t)}`}
                          >
                            {t}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cycleTags.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">
                          No cycle tags
                        </span>
                      ) : (
                        cycleTags.map((t) => (
                          <span
                            key={t}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${tagClass(t)}`}
                          >
                            {t}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex flex-col items-stretch gap-1.5">
                      <button
                        onClick={() => openEdit(c)}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors disabled:opacity-40"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit Tags
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => openSingle(c)}
                          disabled={isClearing || removable.length === 0 || busy}
                          className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors disabled:opacity-40"
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
                          className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-colors disabled:opacity-40"
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
        </div>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(o) => {
          if (!o && !savingEdit) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Category Tags — {editing ? contactName(editing) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {CATEGORY_OPTIONS.map(({ tag, label }) => (
              <label
                key={tag}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/30 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={editingSelected.has(tag)}
                  onChange={() => toggleEditTag(tag)}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <span className="text-sm text-foreground">{label}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {tag}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <button
              onClick={() => setEditing(null)}
              disabled={savingEdit}
              className="h-9 px-3 rounded-md text-xs font-semibold border border-border bg-card hover:bg-muted transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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

