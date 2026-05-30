import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Workflow } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Client } from "@/data/mockData";

const GHL_BASE = "https://services.leadconnectorhq.com";
const LOCATION_ID = "2UvLCJLDqEYjWtuPdjaR";
const TOKEN = "pit-9e416e9c-99e8-4507-9c57-e6c824f50723";

const ghlHeaders = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${TOKEN}`,
  Version: "2021-07-28",
  ...extra,
});

type GhlContact = {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  tags?: string[];
};

function contactName(c: GhlContact) {
  const company = (c.companyName || "").trim();
  if (company) return company;
  const full = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return full || "Unnamed Contact";
}

type CycleKind = "regular" | "cleanup";

type StageInfo = {
  label: string;
  next: string | null; // tag to apply for next stage; null = Completed
  completed: boolean;
};

function getStageInfo(tags: string[], kind: CycleKind): StageInfo {
  const has = (t: string) => tags.includes(t);
  if (kind === "regular") {
    if (has("jessica-approved"))
      return { label: "Completed", next: null, completed: true };
    if (has("review-ready"))
      return { label: "With Jessica", next: "jessica-approved", completed: false };
    if (has("docs-received"))
      return { label: "Review in Progress", next: "review-ready", completed: false };
    return { label: "Awaiting Docs", next: "docs-received", completed: false };
  }
  // cleanup
  if (has("jessica-approved-cleanup"))
    return { label: "Completed", next: null, completed: true };
  if (has("review-ready-cleanup"))
    return { label: "With Jessica", next: "jessica-approved-cleanup", completed: false };
  if (has("docs-received-cleanup"))
    return { label: "Review in Progress", next: "review-ready-cleanup", completed: false };
  return { label: "Awaiting Docs", next: "docs-received-cleanup", completed: false };
}

function matchesStageFilter(tags: string[], kind: CycleKind, stageFilter: number | null): boolean {
  if (stageFilter === null) return true;
  const has = (t: string) => tags.includes(t);
  if (kind === "regular") {
    if (stageFilter >= 1 && stageFilter <= 4) {
      return has("ready-for-pipeline") && !has("docs-received") && !has("review-ready") && !has("jessica-approved");
    }
    if (stageFilter === 5 || stageFilter === 6) {
      return has("docs-received");
    }
    if (stageFilter === 7) {
      return has("review-ready");
    }
    if (stageFilter === 8) {
      return has("jessica-approved");
    }
  } else {
    if (stageFilter >= 1 && stageFilter <= 4) {
      return has("ready-for-cleanup") && !has("docs-received-cleanup") && !has("review-ready-cleanup") && !has("jessica-approved-cleanup");
    }
    if (stageFilter === 5 || stageFilter === 6) {
      return has("docs-received-cleanup");
    }
    if (stageFilter === 7) {
      return has("review-ready-cleanup");
    }
    if (stageFilter === 8) {
      return has("jessica-approved-cleanup");
    }
  }
  return true;
}

export default function GhlLiveCycleSection({ clients }: { clients: Client[] }) {
  const [contacts, setContacts] = useState<GhlContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
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
        if (nextStartAfter === startAfter && nextStartAfterId === startAfterId)
          break;
        startAfter = nextStartAfter;
        startAfterId = nextStartAfterId;
      }
      setContacts(collected);
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

  const applyTag = async (c: GhlContact, tag: string) => {
    setApplyingId(c.id);
    try {
      const res = await fetch(`${GHL_BASE}/contacts/${c.id}/tags`, {
        method: "POST",
        headers: ghlHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tags: [tag] }),
      });
      if (!res.ok) throw new Error(`POST failed (${res.status})`);
      await refetchContact(c.id);
      toast({ title: `Tag ${tag} applied to ${contactName(c)}` });
    } catch {
      toast({
        title: "Failed to apply tag. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApplyingId(null);
    }
  };

  const bookkeeperByContactId = useMemo(() => {
    const m = new Map<string, string>();
    for (const cl of clients) {
      if (cl.ghlContactId && cl.bookkeeper) m.set(cl.ghlContactId, cl.bookkeeper);
    }
    return m;
  }, [clients]);
  const bookkeeperByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const cl of clients) {
      if (cl.name && cl.bookkeeper)
        m.set(cl.name.trim().toLowerCase(), cl.bookkeeper);
    }
    return m;
  }, [clients]);

  const bookkeeperFor = (c: GhlContact): string => {
    const byId = bookkeeperByContactId.get(c.id);
    if (byId) return byId;
    const name = contactName(c).trim().toLowerCase();
    return bookkeeperByName.get(name) || "";
  };

  const { regular, cleanup } = useMemo(() => {
    const r: GhlContact[] = [];
    const cl: GhlContact[] = [];
    for (const c of contacts) {
      const tags = c.tags || [];
      if (tags.includes("ready-for-pipeline")) r.push(c);
      else if (tags.includes("ready-for-cleanup")) cl.push(c);
    }
    const cmp = (a: GhlContact, b: GhlContact) =>
      contactName(a).localeCompare(contactName(b));
    r.sort(cmp);
    cl.sort(cmp);
    return { regular: r, cleanup: cl };
  }, [contacts]);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-card p-4 lg:p-5 space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          <div>
            <p className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-primary/80">
              Live · GHL Tags
            </p>
            <h2 className="font-display text-lg font-semibold text-foreground leading-tight">
              Active Cycle Stage Controls
            </h2>
          </div>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading live GHL tags…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CycleList
            title="Regular Clients"
            sub="ready-for-pipeline"
            kind="regular"
            contacts={regular}
            applyingId={applyingId}
            onApply={applyTag}
            bookkeeperFor={bookkeeperFor}
          />
          <CycleList
            title="Cleanup Clients"
            sub="ready-for-cleanup"
            kind="cleanup"
            contacts={cleanup}
            applyingId={applyingId}
            onApply={applyTag}
            bookkeeperFor={bookkeeperFor}
          />
        </div>
      )}
    </section>
  );
}

function CycleList({
  title,
  sub,
  kind,
  contacts,
  applyingId,
  onApply,
  bookkeeperFor,
}: {
  title: string;
  sub: string;
  kind: CycleKind;
  contacts: GhlContact[];
  applyingId: string | null;
  onApply: (c: GhlContact, tag: string) => void;
  bookkeeperFor: (c: GhlContact) => string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-[10px] font-mono-data uppercase tracking-wider text-muted-foreground">
            {sub}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono-data tabular-nums bg-primary/15 text-primary">
          {contacts.length}
          <span className="font-medium opacity-70">
            {contacts.length === 1 ? "client" : "clients"}
          </span>
        </span>
      </header>
      {contacts.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">
          No clients in this cycle.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {contacts.map((c) => {
            const tags = c.tags || [];
            const stage = getStageInfo(tags, kind);
            const bk = bookkeeperFor(c);
            const isApplying = applyingId === c.id;
            return (
              <li
                key={c.id}
                className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_auto] items-center gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {contactName(c)}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {bk ? (
                      <>
                        Bookkeeper:{" "}
                        <span className="text-foreground/90">{bk}</span>
                      </>
                    ) : (
                      <span className="opacity-60">No bookkeeper assigned</span>
                    )}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                      stage.completed
                        ? "bg-success/15 text-success border-success/30"
                        : "bg-primary/10 text-primary border-primary/20"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
                <div className="md:justify-self-end">
                  {stage.next ? (
                    <button
                      onClick={() => onApply(c, stage.next!)}
                      disabled={isApplying || applyingId !== null}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold font-mono-data bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors disabled:opacity-40"
                    >
                      {isApplying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span>+</span>
                      )}
                      {stage.next}
                    </button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      —
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
