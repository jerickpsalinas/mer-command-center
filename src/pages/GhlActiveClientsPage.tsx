import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, Filter, Loader2, Pencil, RefreshCw, Search, Tags, Trash2, UserCheck, UserMinus, UserPlus, Users, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { GHL_BASE, ghlHeaders } from "@/lib/ghlConfig";
import { useGhlContacts } from "@/hooks/useGhlContacts";
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
import { Separator } from "@/components/ui/separator";
import { logActivity } from "@/lib/activityLogger";
import { cn, SELECT_NATIVE, SEARCH_WRAPPER, FOCUS_RING } from "@/lib/utils";
import SopPanel from "@/components/SopPanel";
import { ghlActiveClientsSop } from "@/data/sopConfigs";


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
const CYCLE_REGULAR_OPTIONS: { tag: string; label: string }[] = [
  { tag: "ready-for-pipeline", label: "Ready for Pipeline" },
  { tag: "docs-received", label: "Docs Received" },
  { tag: "review-ready", label: "Review Ready" },
  { tag: "jessica-approved", label: "Jessica Approved" },
];
const CYCLE_CLEANUP_OPTIONS: { tag: string; label: string }[] = [
  { tag: "ready-for-cleanup", label: "Ready for Cleanup" },
  { tag: "docs-received-cleanup", label: "Docs Received (Cleanup)" },
  { tag: "review-ready-cleanup", label: "Review Ready (Cleanup)" },
  { tag: "jessica-approved-cleanup", label: "Jessica Approved (Cleanup)" },
];
const AUTOMATION_TAGS: { tag: string; label: string }[] = [
  { tag: "escalation-active", label: "Escalation Active" },
  { tag: "bank-reconnection-active", label: "Bank Reconnection Active" },
  { tag: "statement-request-active", label: "Statement Request Active" },
  { tag: "docs-request-active", label: "Docs Request Active" },
];
const EDITABLE_TAGS = new Set<string>([
  ...CATEGORY_OPTIONS.map((o) => o.tag),
  ...CYCLE_REGULAR_OPTIONS.map((o) => o.tag),
  ...CYCLE_CLEANUP_OPTIONS.map((o) => o.tag),
]);
const ALL_EDITABLE_OPTIONS = [
  ...CATEGORY_OPTIONS,
  ...CYCLE_REGULAR_OPTIONS,
  ...CYCLE_CLEANUP_OPTIONS,
];

type GhlContact = {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  tags?: string[];
};

/** Add a tag to a contact via GHL API */
async function addTagToContact(contactId: string, tag: string) {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: ghlHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ tags: [tag] }),
  });
  if (!res.ok) throw new Error(`Add tag failed (${res.status})`);
}

/** Remove a tag from a contact via GHL API */
async function removeTagFromContact(contactId: string, tag: string) {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "DELETE",
    headers: ghlHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ tags: [tag] }),
  });
  if (!res.ok) throw new Error(`Remove tag failed (${res.status})`);
}


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
  return "bg-warning/15 text-warning border-warning/30";
}



type PendingAction =
  | { kind: "single"; contact: GhlContact }
  | { kind: "bulk"; contacts: GhlContact[] }
  | null;

export default function GhlActiveClientsPage() {
  // Bookkeepers are redirected away — this page is restricted to admins and
  // standard users who manage GHL active-client tags.
  const canEditCycleTags = true;
  const canManage = true;
  const [removing, setRemoving] = useState<GhlContact | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingFromMer, setRemovingFromMer] = useState<GhlContact | null>(null);
  const [removingFromMerId, setRemovingFromMerId] = useState<string | null>(null);
  const [addingToMerId, setAddingToMerId] = useState<string | null>(null);
  const [markingInactiveId, setMarkingInactiveId] = useState<string | null>(null);

  // Use shared GHL contacts hook (React Query deduplication)
  const { contacts: allGhlContacts, loading, error, refresh: fetchAll } = useGhlContacts();

  // Filter to active-client contacts (excluding inactive)
  const contacts = useMemo(
    () =>
      allGhlContacts.filter((c) => {
        const tags = (c.tags || []).map((t) => (t || "").toLowerCase());
        return tags.includes("active-client") && !tags.includes("inactive-client");
      }),
    [allGhlContacts],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "regular" | "cleanup">("all");
  const [search, setSearch] = useState("");
  const [includeTags, setIncludeTags] = useState<Set<string>>(new Set());
  const [excludeTags, setExcludeTags] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"name" | "tags" | "status">("name");
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
    return true;
  };

  const runSingle = async (c: GhlContact) => {
    setClearingId(c.id);
    try {
      const toRemove = (c.tags || []).filter(
        (t) => !PROTECTED_TAGS.includes(t),
      );
      if (toRemove.length === 0) {
        toast("No cycle tags to clear");
      } else {
        await clearTagsFor(c);
        toast.success(`Cycle tags cleared for ${contactName(c)}`);
        fetchAll();
      }
      closeDialog();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Please try again.");
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
    if (failed) {
      toast.error(`${list.length - failed} cleared, ${failed} failed.`);
    } else {
      toast.success(`${list.length - failed} cleared.`);
    }
    setBulkProgress(null);
    setSelected(new Set());
    fetchAll();
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
      await removeTagFromContact(c.id, "active-client");
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
      toast.success(`Client removed from active list: ${contactName(c)}`);
      void logActivity({
        action: "tag-removed",
        clientName: contactName(c),
        page: "GHL Active Clients",
        details: "Removed: active-client",
      });
      setRemoving(null);
      fetchAll();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  const confirmRemoveFromMer = async () => {
    if (!removingFromMer) return;
    const c = removingFromMer;
    setRemovingFromMerId(c.id);
    try {
      await removeTagFromContact(c.id, "mer-workflow");
      toast.success(`Removed from MER workflow: ${contactName(c)}`);
      void logActivity({
        action: "tag-removed",
        clientName: contactName(c),
        page: "GHL Active Clients",
        details: "Removed: mer-workflow",
      });
      setRemovingFromMer(null);
      fetchAll();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Please try again.");
    } finally {
      setRemovingFromMerId(null);
    }
  };

  const handleAddToMer = async (c: GhlContact) => {
    setAddingToMerId(c.id);
    try {
      await addTagToContact(c.id, "mer-workflow");
      toast.success(`Added to MER workflow: ${contactName(c)}`);
      void logActivity({
        action: "tag-added",
        clientName: contactName(c),
        page: "GHL Active Clients",
        details: "Added: mer-workflow",
      });
      fetchAll();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Please try again.");
    } finally {
      setAddingToMerId(null);
    }
  };

  const handleMarkInactive = async (c: GhlContact) => {
    setMarkingInactiveId(c.id);
    try {
      await addTagToContact(c.id, "inactive-client");
      toast.success(`Marked inactive: ${contactName(c)}`);
      void logActivity({
        action: "tag-added",
        clientName: contactName(c),
        page: "GHL Active Clients",
        details: "Added: inactive-client",
      });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
      fetchAll();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Please try again.");
    } finally {
      setMarkingInactiveId(null);
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
  const merCount = useMemo(
    () => sortedAll.filter((c) => hasTag(c, "mer-workflow")).length,
    [sortedAll],
  );

  const availableCycleTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of sortedAll) {
      for (const t of c.tags || []) {
        if (!t) continue;
        set.add(t);
      }
    }
    return Array.from(set).sort();
  }, [sortedAll]);

  const sorted = useMemo(() => {
    let list = sortedAll;
    if (filter === "regular")
      list = list.filter((c) => hasTag(c, "ready-for-pipeline"));
    else if (filter === "cleanup")
      list = list.filter((c) => hasTag(c, "ready-for-cleanup"));
    if (includeTags.size > 0) {
      list = list.filter((c) => {
        const tags = new Set(c.tags || []);
        for (const t of includeTags) if (!tags.has(t)) return false;
        return true;
      });
    }
    if (excludeTags.size > 0) {
      list = list.filter((c) => !(c.tags || []).some((t) => excludeTags.has(t)));
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => contactName(c).toLowerCase().includes(q));
    if (sortBy === "tags") {
      list = [...list].sort((a, b) => (b.tags || []).length - (a.tags || []).length);
    } else if (sortBy === "status") {
      list = [...list].sort((a, b) => {
        const aHas = hasTag(a, "mer-workflow") ? 1 : 0;
        const bHas = hasTag(b, "mer-workflow") ? 1 : 0;
        return bHas - aHas || contactName(a).localeCompare(contactName(b));
      });
    }
    // "name" is the default sort from sortedAll
    return list;
  }, [sortedAll, filter, search, includeTags, excludeTags, sortBy]);

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

  const busy = clearingId !== null || bulkProgress !== null || addingToMerId !== null || markingInactiveId !== null;

  const openEdit = (c: GhlContact) => {
    const current = new Set(
      (c.tags || []).filter((t) => EDITABLE_TAGS.has(t)),
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
    const current = new Set(
      (c.tags || []).filter((t) => EDITABLE_TAGS.has(t)),
    );
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    for (const { tag } of ALL_EDITABLE_OPTIONS) {
      if (!canEditCycleTags && !CATEGORY_TAGS.has(tag)) continue;
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
        void logActivity({
          action: "tag-added",
          clientName: contactName(c),
          page: "GHL Active Clients",
          details: `Added: ${toAdd.join(", ")}`,
        });
      }
      if (toRemove.length > 0) {
        const res = await fetch(`${GHL_BASE}/contacts/${c.id}/tags`, {
          method: "DELETE",
          headers: ghlHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ tags: toRemove }),
        });
        if (!res.ok) throw new Error(`Remove failed (${res.status})`);
        void logActivity({
          action: "tag-removed",
          clientName: contactName(c),
          page: "GHL Active Clients",
          details: `Removed: ${toRemove.join(", ")}`,
        });
      }
      fetchAll();
      toast.success(`Tags updated for ${contactName(c)}`);
      setEditing(null);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Please try again.");
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
      type="button"
      onClick={() => setFilter(key)}
      aria-pressed={filter === key}
      className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        filter === key
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border hover:bg-muted"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className="ml-1 opacity-80 font-mono-data tabular-nums">({count})</span>
      )}
    </button>
  );

  const activeFilterCount =
    (filter !== "all" ? 1 : 0) + (search.trim() ? 1 : 0) + includeTags.size + excludeTags.size;
  const clearAllFilters = () => {
    setFilter("all");
    setSearch("");
    setIncludeTags(new Set());
    setExcludeTags(new Set());
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">
            GHL Active Clients
          </h2>
          {loading ? (
            <Skeleton className="h-4 w-28 rounded" />
          ) : (
            <>
              <span className="text-xs text-muted-foreground font-mono-data tabular-nums">
                {sorted.length} of {sortedAll.length} contacts
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-success" />
                <span className="font-mono-data tabular-nums">{merCount}</span> on dashboard
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={openBulk}
              disabled={selected.size === 0 || busy}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear Cycle Tags
              {selected.size > 0 && <span className="font-mono-data tabular-nums">({selected.size} selected)</span>}
            </button>
          )}
          <button
            type="button"
            onClick={fetchAll}
            disabled={loading}
            aria-busy={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors duration-150 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <SopPanel config={ghlActiveClientsSop} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Client type filter">
          {filterBtn("all", "All", sortedAll.length)}
          {filterBtn("regular", "Regular", regularCount)}
          {filterBtn("cleanup", "Cleanup", cleanupCount)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["include", "exclude"] as const).map((kind) => {
            const isInclude = kind === "include";
            const set = isInclude ? includeTags : excludeTags;
            const setSet = isInclude ? setIncludeTags : setExcludeTags;
            const label = isInclude ? "Show with tags" : "Hide with tags";
            const activeClass = isInclude
              ? "bg-success/15 text-success border-success/30"
              : "bg-destructive/10 text-destructive border-destructive/30";
            return (
              <Popover key={kind}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      set.size > 0
                        ? activeClass
                        : "bg-card text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                    {set.size > 0 && (
                      <span className="ml-1 opacity-80 font-mono-data tabular-nums">({set.size})</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    {isInclude
                      ? "Only show contacts with ALL of:"
                      : "Hide contacts with ANY of:"}
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {availableCycleTags.length === 0 ? (
                      <div className="px-1 py-2">
                        <EmptyState icon={Tags} title="No cycle tags available" size="sm" />
                      </div>
                    ) : (
                      availableCycleTags.map((t) => {
                        const checked = set.has(t);
                        return (
                          <label
                            key={t}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors duration-150 focus-within:ring-2 focus-within:ring-ring"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSet((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(t)) next.delete(t);
                                  else next.add(t);
                                  return next;
                                });
                              }}
                              className="h-3.5 w-3.5 rounded border-border accent-primary"
                            />
                            <span className="text-xs text-foreground">{t}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  {set.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSet(new Set())}
                      className="w-full h-8 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Clear selection
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "name" | "tags" | "status")}
          aria-label="Sort contacts"
          className={`${SELECT_NATIVE} appearance-none pr-8 cursor-pointer`}
        >
          <option value="name">Sort: Name (A–Z)</option>
          <option value="tags">Sort: Tag Count</option>
          <option value="status">Sort: MER Status</option>
        </select>
        <div className={cn(SEARCH_WRAPPER, "flex-1 min-w-[200px] max-w-sm")}>
          <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search clients"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full min-w-0"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className={cn("shrink-0 -mr-1 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150", FOCUS_RING)}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-muted-foreground border border-border hover:bg-accent hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-mono-data tabular-nums">
              {activeFilterCount}
            </span>
          </button>
        )}
      </div>

      {loading && (
        <div
          className="rounded-xl border border-border bg-card shadow-card overflow-x-auto"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Loading active clients…</span>
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[24px_1.4fr_1fr_1.4fr_180px] items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/40">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-3 w-14 rounded ml-auto" />
            </div>
            <ul className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="grid grid-cols-[24px_1.4fr_1fr_1.4fr_180px] items-start gap-3 px-4 py-3">
                  <Skeleton className="h-4 w-4 mt-1 rounded" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-8 w-full rounded-md" />
                    <Skeleton className="h-8 w-full rounded-md" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Couldn't load active clients</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchAll}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold border border-destructive/40 hover:bg-destructive/10 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          </AlertDescription>
        </Alert>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div className="rounded-xl border border-border bg-card shadow-card p-12 flex flex-col items-center text-center gap-2">
          <EmptyState
            icon={Users}
            title="No active clients found"
            hint={activeFilterCount > 0
              ? "No contacts match your current filters."
              : "Contacts tagged active-client in GHL will appear here."}
          />
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {!loading && !error && sorted.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto max-h-[70vh] overflow-y-auto scrollbar-thin">
          <div className="min-w-[760px]">
            <div className="sticky top-0 z-10 grid grid-cols-[24px_1.4fr_1fr_1.4fr_180px] items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/40 backdrop-blur supports-[backdrop-filter]:bg-muted/60 text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                    className="grid grid-cols-[24px_1.4fr_1fr_1.4fr_180px] items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors duration-150"
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${contactName(c)}`}
                      checked={isChecked}
                      onChange={() => toggleOne(c.id)}
                      className="h-4 w-4 mt-1 rounded border-border accent-primary cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          title={hasTag(c, "mer-workflow") ? "On MER Dashboard" : "Not on MER Dashboard"}
                          className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                            hasTag(c, "mer-workflow")
                              ? "bg-success"
                              : "bg-muted-foreground/30"
                          }`}
                        />
                        <h3 className="text-sm font-semibold text-foreground truncate" title={company || full || "Unnamed Contact"}>
                          {company || full || "Unnamed Contact"}
                        </h3>
                      </div>
                      {company && full && (
                        <p className="text-[11px] text-muted-foreground truncate pl-3.5" title={full}>
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
                        type="button"
                        onClick={() => openEdit(c)}
                        disabled={busy}
                        aria-label={`Edit tags for ${contactName(c)}`}
                        className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit Tags
                      </button>
                      {canEditCycleTags && hasTag(c, "mer-workflow") ? (
                        <button
                          type="button"
                          onClick={() => setRemovingFromMer(c)}
                          disabled={busy || removingFromMerId === c.id}
                          aria-label={`Remove ${contactName(c)} from MER workflow`}
                          className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-background text-destructive border border-destructive hover:bg-destructive/10 transition-colors duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {removingFromMerId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          Remove from MER
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToMer(c)}
                          disabled={busy || addingToMerId === c.id}
                          aria-label={`Add ${contactName(c)} to MER workflow`}
                          className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-success/10 text-success border border-success/20 hover:bg-success/15 transition-colors duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {addingToMerId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          Add to MER
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => openSingle(c)}
                          disabled={isClearing || removable.length === 0 || busy}
                          aria-label={`Clear cycle tags for ${contactName(c)}`}
                          className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {isClearing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          Clear Cycle Tags
                          {removable.length > 0 && (
                            <span className="text-[10px] opacity-70 font-mono-data tabular-nums">
                              ({removable.length})
                            </span>
                          )}
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setRemoving(c)}
                          disabled={busy || removingId === c.id}
                          aria-label={`Remove ${contactName(c)} from active clients`}
                          className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-colors duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {removingId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          Remove Client
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleMarkInactive(c)}
                          disabled={busy || markingInactiveId === c.id}
                          aria-label={`Mark ${contactName(c)} as inactive`}
                          className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {markingInactiveId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          Mark Inactive
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
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin p-0 gap-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="pr-8 truncate" title={editing ? contactName(editing) : undefined}>
              Edit Tags — {editing ? contactName(editing) : ""}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Toggle category and cycle tags for this contact.</p>
          </DialogHeader>
          {(() => {
            const activeAutomation = editing
              ? AUTOMATION_TAGS.filter((a) =>
                  (editing.tags || []).includes(a.tag),
                )
              : [];
            const hasAnyRegular = CYCLE_REGULAR_OPTIONS.some(({ tag }) => editingSelected.has(tag));
            const hasAnyCleanup = CYCLE_CLEANUP_OPTIONS.some(({ tag }) => editingSelected.has(tag));
            const renderGroup = (
              title: string,
              options: { tag: string; label: string }[],
              readOnly?: boolean,
              locked?: boolean,
            ) => (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {title}
                  {locked && (
                    <span className="ml-1.5 normal-case italic opacity-70">(Locked)</span>
                  )}
                </p>
                {readOnly ? (
                  <p className="text-xs text-muted-foreground italic px-1">
                    Managed by admin only.
                  </p>
                ) : locked ? (
                  <div className="space-y-1.5 opacity-40">
                    {options.map(({ tag, label }) => (
                      <label
                        key={tag}
                        className="flex items-center gap-2 px-3 py-2 rounded-md border border-border cursor-not-allowed"
                      >
                        <input
                          type="checkbox"
                          checked={editingSelected.has(tag)}
                          disabled
                          className="h-4 w-4 rounded border-border accent-primary cursor-not-allowed"
                        />
                        <span className="text-sm text-foreground">{label}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {tag}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {options.map(({ tag, label }) => (
                      <label
                        key={tag}
                        className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/40 cursor-pointer transition-colors duration-150 focus-within:ring-2 focus-within:ring-ring"
                      >
                        <input
                          type="checkbox"
                          checked={editingSelected.has(tag)}
                          onChange={() => toggleEditTag(tag)}
                          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        />
                        <span className="text-sm text-foreground">{label}</span>
                        <span className="ml-auto text-[10px] font-mono-data text-muted-foreground">
                          {tag}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
            return (
              <div className="px-6 pb-6 space-y-4">
                {renderGroup("Category Tags", CATEGORY_OPTIONS)}
                <Separator />
                {renderGroup("Cycle Tags — Regular", CYCLE_REGULAR_OPTIONS, !canEditCycleTags, canEditCycleTags && hasAnyCleanup)}
                <Separator />
                {renderGroup("Cycle Tags — Cleanup", CYCLE_CLEANUP_OPTIONS, !canEditCycleTags, canEditCycleTags && hasAnyRegular)}
                {activeAutomation.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Automation Tags
                        </p>
                        <p className="text-[10px] text-muted-foreground italic">
                          Managed by automation
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeAutomation.map(({ tag, label }) => (
                          <span
                            key={tag}
                            title={tag}
                            className="inline-flex items-center px-2.5 py-1 rounded-full border border-warning/30 bg-warning/10 text-warning text-[11px] font-medium"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
          <DialogFooter className="sticky bottom-0 bg-card border-t border-border px-6 py-4 sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={savingEdit}
              className="h-9 px-3 rounded-md text-xs font-semibold border border-border bg-card hover:bg-muted transition-colors duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={savingEdit}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {savingEdit ? "Saving…" : "Save"}
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
          {pending && (

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
                  <div
                    className="h-2 w-full rounded-full bg-muted overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={bulkProgress.total}
                    aria-valuenow={bulkProgress.done}
                    aria-label="Bulk clear progress"
                  >
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{
                        width: `${(bulkProgress.done / bulkProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono-data tabular-nums" aria-live="polite">
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
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />
                  Removing…
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!removingFromMer}
        onOpenChange={(o) => {
          if (!o && !removingFromMerId) setRemovingFromMer(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from MER workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{" "}
              <span className="font-semibold text-foreground">
                {removingFromMer ? contactName(removingFromMer) : ""}
              </span>{" "}
              from MER workflow? They will no longer appear in the Clients tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingFromMerId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmRemoveFromMer();
              }}
              disabled={!!removingFromMerId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingFromMerId ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />
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

