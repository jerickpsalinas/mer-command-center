import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle, CheckCircle2, Filter, Loader2, RefreshCw, Search, Tag, Users, X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, FOCUS_RING, SELECT_NATIVE } from "@/lib/utils";
import { canAccessGhlContacts } from "@/lib/ghlContactsAccess";
import { DEMO_MODE } from "@/lib/demoMode";
import { DEMO_GHL_CONTACTS } from "@/data/demoSheet";
import SopPanel from "@/components/SopPanel";
import { ghlContactsSop } from "@/data/sopConfigs";
import { motion, AnimatePresence } from "framer-motion";


// Demo build: no live automation host is baked into this public repo.
const N8N_BASE = import.meta.env.VITE_N8N_BASE_URL || "";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
}

interface ListResponse {
  contacts: Contact[];
  allTags: string[];
  total: number;
}

interface TagResult {
  contactId: string;
  success: boolean;
  error?: string;
}

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

/**
 * Demo build: this page is backed by n8n webhooks in production. Rather than
 * thread DEMO_MODE through every call site, the transport itself answers with
 * the fictional contact list so the table, tag filters and bulk-tag flow all
 * behave normally without any outbound request.
 */
function demoN8n<T>(path: string, body: unknown): T {
  if (path.includes("ghl-contacts-list")) {
    const contacts: Contact[] = DEMO_GHL_CONTACTS.map((c) => {
      const name = c.companyName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
      const digits = c.id.replace(/\D/g, "").padStart(4, "0").slice(-4);
      return {
        id: c.id,
        name,
        email: `${slug}@example.com`,
        phone: `(555) 01${digits.slice(0, 1)}-${digits}`,
        tags: c.tags ?? [],
      };
    });
    const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags))).sort();
    return { contacts, allTags, total: contacts.length } as T;
  }
  if (path.includes("ghl-contacts-tag")) {
    const ids = (body as { contactIds?: string[] })?.contactIds ?? [];
    return { results: ids.map((contactId) => ({ contactId, success: true })) } as T;
  }
  return {} as T;
}

async function n8nPost<T>(path: string, body: unknown): Promise<T> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 250));
    return demoN8n<T>(path, body);
  }
  const token = await getAccessToken();
  const res = await fetch(`${N8N_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) throw new Error("Not authorized");
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

const TH_BASE = "sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border";

export default function GhlContactsPage() {
  const { user, isDeveloper } = useAuth();
  const isJerick = canAccessGhlContacts(user?.id);
  const searchRef = useRef<HTMLInputElement>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [actionTag, setActionTag] = useState("");
  const [confirmAction, setConfirmAction] = useState<"add" | "remove" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<TagResult[] | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected(new Set());
    setResults(null);
    try {
      const data = await n8nPost<ListResponse>("/webhook/ghl-contacts-list", {});
      setContacts(data.contacts || []);
      setAllTags(data.allTags || []);
      setTotal(data.total ?? data.contacts?.length ?? 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ERR_")) {
        setError("Backend not connected yet. The n8n workflow may not be deployed.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filtered = useMemo(() => {
    let list = contacts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q),
      );
    }
    if (tagFilter) {
      list = list.filter((c) => c.tags?.includes(tagFilter));
    }
    return list;
  }, [contacts, search, tagFilter]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of contacts) {
      for (const t of c.tags || []) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return counts;
  }, [contacts]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someFilteredSelected = filtered.some((c) => selected.has(c.id));
  const hasActiveFilters = search !== "" || tagFilter !== "";

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setTagFilter("");
  };

  const handleAction = async (action: "add" | "remove") => {
    setConfirmAction(null);
    setSubmitting(true);
    setResults(null);
    try {
      const res = await n8nPost<{ results: TagResult[] }>("/webhook/ghl-contacts-tag", {
        contactIds: Array.from(selected),
        tag: actionTag,
        action,
      });
      setResults(res.results || []);
      await fetchContacts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setResults([{ contactId: "all", success: false, error: msg }]);
    } finally {
      setSubmitting(false);
    }
  };

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failures = results?.filter((r) => !r.success) ?? [];

  return (
    <div className="space-y-5 pb-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">GHL Contacts</h1>
          {!loading && !error && (
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters
                ? `${filtered.length} of ${total} contacts match filters`
                : `${total} contacts`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
        <SopPanel config={ghlContactsSop} />
        <button
          onClick={fetchContacts}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-50",
            FOCUS_RING,
          )}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && !error && contacts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{total}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">With Tags</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{contacts.filter(c => c.tags?.length > 0).length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">No Tags</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{contacts.filter(c => !c.tags?.length).length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Unique Tags</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{allTags.length}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            {error}
            <button onClick={fetchContacts} className="underline font-medium ml-2">
              Retry
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Results banner */}
      {results && (
        <Alert variant={failures.length ? "destructive" : "default"} className={!failures.length ? "border-success/30 bg-success/5" : ""}>
          {failures.length ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
          <AlertTitle>{failures.length ? "Some actions failed" : "Done"}</AlertTitle>
          <AlertDescription>
            {successCount > 0 && <span>{successCount} contact{successCount > 1 ? "s" : ""} updated. </span>}
            {failures.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs">
                {failures.map((f) => (
                  <li key={f.contactId}>Contact {f.contactId}: {f.error || "Unknown error"}</li>
                ))}
              </ul>
            )}
            <button onClick={() => setResults(null)} className="underline text-xs ml-2">Dismiss</button>
          </AlertDescription>
        </Alert>
      )}

      {!error && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search name, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-border bg-card pl-9 pr-16 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary/40",
                  FOCUS_RING,
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {search ? (
                  <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground p-0.5">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <span className="text-[9px]">⌘</span>K
                  </kbd>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className={cn(SELECT_NATIVE, "min-w-[180px]")}
              >
                <option value="">All tags ({allTags.length})</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>{t} ({tagCounts.get(t) || 0})</option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  FOCUS_RING,
                )}
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>

          {/* Action bar */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
                      <Users className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {selected.size} selected
                    </span>
                  </div>
                  <div className="h-5 w-px bg-border hidden sm:block" />
                  <select
                    value={actionTag}
                    onChange={(e) => setActionTag(e.target.value)}
                    className={cn(SELECT_NATIVE, "min-w-[180px]")}
                  >
                    <option value="">Pick a tag…</option>
                    {allTags.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    disabled={!actionTag || submitting}
                    onClick={() => setConfirmAction("add")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50",
                      FOCUS_RING,
                    )}
                  >
                    <Tag className="h-3.5 w-3.5" /> Add tag
                  </button>
                  <button
                    disabled={!actionTag || submitting}
                    onClick={() => setConfirmAction("remove")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50",
                      FOCUS_RING,
                    )}
                  >
                    <X className="h-3.5 w-3.5" /> Remove tag
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Deselect all
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table (desktop) */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
              <p className="text-sm font-medium">Loading contacts from GHL…</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={cn(TH_BASE, "w-10")}>
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected;
                          }}
                          onChange={toggleAll}
                          className="rounded border-border"
                        />
                      </th>
                      <th className={cn(TH_BASE, "sticky left-0 z-20 bg-card/95 backdrop-blur-sm min-w-[160px]")}>Name</th>
                      <th className={TH_BASE}>Email</th>
                      <th className={TH_BASE}>Phone</th>
                      <th className={TH_BASE}>Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Search className="h-8 w-8 opacity-40" />
                            <p className="text-sm font-medium">No contacts found</p>
                            {hasActiveFilters && (
                              <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                                Clear filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((c, i) => {
                        const isSelected = selected.has(c.id);
                        return (
                          <tr
                            key={c.id}
                            onClick={(e) => {
                              if ((e.target as HTMLElement).tagName !== "INPUT") toggleOne(c.id);
                            }}
                            className={cn(
                              "border-t border-border transition-colors cursor-pointer",
                              isSelected
                                ? "bg-primary/5 hover:bg-primary/10"
                                : i % 2 === 1
                                  ? "bg-muted/20 hover:bg-muted/40"
                                  : "hover:bg-muted/30",
                            )}
                          >
                            <td className="px-4 py-3.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleOne(c.id)}
                                className="rounded border-border"
                              />
                            </td>
                            <td className={cn(
                              "px-4 py-3.5 font-medium text-foreground whitespace-nowrap sticky left-0 z-[5]",
                              isSelected
                                ? "bg-primary/5"
                                : i % 2 === 1
                                  ? "bg-muted/20"
                                  : "bg-card",
                            )}>
                              {c.name || "—"}
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">
                              {c.email ? (
                                <span className="hover:text-foreground transition-colors">{c.email}</span>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap font-mono text-xs">
                              {c.phone || "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-wrap gap-1.5">
                                {(c.tags || []).map((t) => (
                                  <button
                                    key={t}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTagFilter(tagFilter === t ? "" : t);
                                    }}
                                    className={cn(
                                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                                      tagFilter === t
                                        ? "border-primary/40 bg-primary/10 text-primary"
                                        : "border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                                    )}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                    <Search className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">No contacts found</p>
                    {hasActiveFilters && (
                      <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  filtered.map((c) => {
                    const isSelected = selected.has(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleOne(c.id)}
                        className={cn(
                          "rounded-xl border bg-card p-4 transition-colors cursor-pointer",
                          isSelected ? "border-primary/40 bg-primary/5" : "border-border hover:border-border/80",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(c.id)}
                            className="rounded border-border mt-0.5 shrink-0"
                          />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="text-sm font-semibold text-foreground truncate">{c.name || "—"}</p>
                            {c.email && (
                              <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                            )}
                            {c.phone && (
                              <p className="text-xs text-muted-foreground font-mono">{c.phone}</p>
                            )}
                            {c.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {c.tags.map((t) => (
                                  <button
                                    key={t}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTagFilter(tagFilter === t ? "" : t);
                                    }}
                                    className={cn(
                                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                                      tagFilter === t
                                        ? "border-primary/40 bg-primary/10 text-primary"
                                        : "border-border bg-muted/50 text-muted-foreground",
                                    )}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer count */}
              {filtered.length > 0 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
                  {hasActiveFilters ? " matching filters" : ""}
                  {selected.size > 0 ? ` · ${selected.size} selected` : ""}
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "add" ? "Add" : "Remove"} tag?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "add" ? "Add" : "Remove"} the tag{" "}
              <span className="font-semibold text-foreground">"{actionTag}"</span>{" "}
              {confirmAction === "add" ? "to" : "from"}{" "}
              <span className="font-semibold text-foreground">{selected.size}</span>{" "}
              contact{selected.size > 1 ? "s" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmAction && handleAction(confirmAction)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submitting overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-6 py-4 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Updating tags…</span>
          </div>
        </div>
      )}
    </div>
  );
}
