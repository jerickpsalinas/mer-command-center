import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  CreditCard,
  Bell,
  AlertTriangle,
  Ban,
  Loader2,
  AlertCircle,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Mail,
  MailOpen,
  ChevronsUpDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { useFilteredSheetData } from "@/hooks/useSheetData";
import type { BillingRow } from "@/services/googleSheets";
import { GHL_BASE, ghlHeaders } from "@/lib/ghlConfig";
import SopPanel from "@/components/SopPanel";
import { billingSop } from "@/data/sopConfigs";

const SERVICE_TYPES = ["MER", "Cleanup", "Software"] as const;

const BILLING_WEBHOOK =
  "https://n8n.srv1482383.hstgr.cloud/webhook/billing-field-update";

// Money-relevant columns first — Balance Due / Due Date matter more at a
// glance than Last Paid Date for a "who owes money" view.
type SortKey = "clientName" | "balanceDue" | "dueDate";

// Email lives folded under Client Name (toggle-able) instead of its own
// column — it's rarely needed at a glance, just kept on hand for when
// Notification Stage needs to reach out.
const COLUMNS: { key: SortKey | null; label: string }[] = [
  { key: "clientName", label: "Client" },
  { key: null, label: "Service Type" },
  { key: "balanceDue", label: "Balance Due" },
  { key: "dueDate", label: "Due Date" },
  { key: null, label: "Last Paid Date" },
  { key: null, label: "Notification Stage" },
  { key: null, label: "Notes" },
];

// Clicking a stage: confirm, then (1) save "Notification Stage" to the
// Billing sheet via the same WF17 webhook Service Type/Notes already use,
// and (2) apply a GHL tag to the client's contact so the firm's existing
// GHL automations pick up and send the actual reminder/overdue/final
// notice message. This page only tags — it never sends anything directly.
const NOTIFICATION_STAGES = [
  { key: "reminder", label: "Reminder", icon: Bell, tag: "billing-reminder-sent" },
  { key: "overdue", label: "Overdue", icon: AlertTriangle, tag: "billing-overdue-notice-sent" },
  { key: "final", label: "Final Notice", icon: Ban, tag: "billing-final-notice-sent" },
] as const;

type FieldKey = "serviceType" | "notes" | "notificationStage";
type SaveStatus = "idle" | "saving" | "error";

async function postFieldUpdate(
  clientName: string,
  field: FieldKey,
  value: string,
): Promise<void> {
  const res = await fetch(BILLING_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientName, field, value }),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}

// Same GHL tagging pattern used elsewhere in the app (see useGhlTags.ts,
// ClientDetailsModal.tsx) — direct call from the client using the app's
// existing GHL token, no n8n hop needed for this part.
async function applyGhlTag(contactId: string, tag: string): Promise<void> {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: ghlHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ tags: [tag] }),
  });
  if (!res.ok) throw new Error(`GHL tag failed: ${res.status}`);
}

function parseCurrency(v: string): number {
  const n = Number(String(v ?? "").replace(/[$,]/g, "").trim());
  return isNaN(n) ? 0 : n;
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function parseDateMs(v: string): number {
  const t = Date.parse(v);
  return isNaN(t) ? 0 : t;
}

export default function BillingPage() {
  const { data, isLoading } = useFilteredSheetData();
  const [rows, setRows] = useState<BillingRow[]>([]);
  // Only relevant on a genuinely cold load (no valid cache yet) — the sheet
  // fetch pulls every tab, not just Billing, so it can take a few seconds.
  // Reassure instead of leaving a bare spinner.
  const [showSlowLoadHint, setShowSlowLoadHint] = useState(false);
  const [fieldStatus, setFieldStatus] = useState<
    Record<string, SaveStatus>
  >({});
  // "Lit up" state for the Notification Stage icon buttons — seeded from
  // the sheet's saved Notification Stage value on load, then kept in sync
  // as stages are sent (per-row single-select: one current stage).
  const [activeStage, setActiveStage] = useState<Record<string, string>>({});
  // The stage awaiting confirmation in the dialog — null when closed.
  const [pendingConfirm, setPendingConfirm] = useState<{
    clientName: string;
    stageKey: string;
  } | null>(null);
  const [sendingStage, setSendingStage] = useState(false);
  const savedNotesRef = useRef<Map<string, string>>(new Map());
  // Tracks which client's Notes input is currently focused so an incoming
  // background refetch (auto-refresh polling) doesn't stomp on an edit the
  // user hasn't blurred/saved yet.
  const focusedNotesClientRef = useRef<string | null>(null);

  const [search, setSearch] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  // Email is collapsed under Client Name by default — this is a global
  // show/hide so the table stays tidy until you actually need to pull
  // addresses (e.g. right before sending a Notification Stage).
  const [showEmails, setShowEmails] = useState(false);
  // Default view: highest balance due first — that's the most useful
  // starting sort for a "who owes money" page.
  const [sortKey, setSortKey] = useState<SortKey>("balanceDue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (!isLoading) {
      setShowSlowLoadHint(false);
      return;
    }
    const t = setTimeout(() => setShowSlowLoadHint(true), 3000);
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    if (data?.billing?.length) {
      setRows((prev) => {
        const prevByName = new Map(prev.map((r) => [r.clientName, r]));
        return data.billing.map((r) => {
          if (focusedNotesClientRef.current === r.clientName) {
            const existing = prevByName.get(r.clientName);
            if (existing) return { ...r, notes: existing.notes };
          }
          return { ...r };
        });
      });
      for (const r of data.billing) {
        if (focusedNotesClientRef.current !== r.clientName) {
          savedNotesRef.current.set(r.clientName, r.notes);
        }
      }
      // Seed which stage button is "lit" from whatever's already saved in
      // the sheet, so a page refresh doesn't lose the current stage.
      setActiveStage((prev) => {
        const next = { ...prev };
        for (const r of data.billing) {
          const match = NOTIFICATION_STAGES.find((s) => s.label === r.notificationStage);
          if (match) next[r.clientName] = match.key;
        }
        return next;
      });
    }
  }, [data?.billing]);

  // Client Name -> GHL Contact ID, reused from the MER dataset already
  // loaded by useSheetData — Billing itself has no GHL Contact ID column,
  // so this is the only way to resolve who to tag.
  const ghlContactIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data?.clients ?? []) {
      if (c.ghlContactId) map.set(c.name.trim().toLowerCase(), c.ghlContactId);
    }
    return map;
  }, [data?.clients]);

  const statusKey = (clientName: string, field: FieldKey) =>
    `${clientName}::${field}`;

  const setStatus = (clientName: string, field: FieldKey, s: SaveStatus) =>
    setFieldStatus((prev) => ({ ...prev, [statusKey(clientName, field)]: s }));

  const getStatus = (clientName: string, field: FieldKey): SaveStatus =>
    fieldStatus[statusKey(clientName, field)] ?? "idle";

  const updateRow = (clientName: string, patch: Partial<BillingRow>) => {
    setRows((prev) => prev.map((r) => (r.clientName === clientName ? { ...r, ...patch } : r)));
  };

  const saveField = useCallback(
    async (clientName: string, field: FieldKey, value: string): Promise<boolean> => {
      setStatus(clientName, field, "saving");
      try {
        await postFieldUpdate(clientName, field, value);
        setStatus(clientName, field, "idle");
        if (field === "notes") savedNotesRef.current.set(clientName, value);
        return true;
      } catch (err) {
        // A TypeError here (e.g. "Failed to fetch") means the browser
        // blocked or couldn't complete the request — almost always CORS
        // or the n8n workflow being inactive, not a bad response. Logged
        // so it's visible in devtools without needing the Network tab.
        console.error(`[Billing] Failed to save ${field} for ${clientName}:`, err);
        setStatus(clientName, field, "error");
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleServiceTypeChange = (clientName: string, value: string) => {
    updateRow(clientName, { serviceType: value });
    void saveField(clientName, "serviceType", value);
  };

  const handleNotesFocus = (clientName: string) => {
    focusedNotesClientRef.current = clientName;
  };

  const handleNotesSave = (clientName: string) => {
    focusedNotesClientRef.current = null;
    const row = rows.find((r) => r.clientName === clientName);
    if (!row) return;
    const last = savedNotesRef.current.get(clientName) ?? "";
    if (row.notes === last) return;
    void saveField(clientName, "notes", row.notes);
  };

  const handleNotesKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleStageClick = (clientName: string, stageKey: string) => {
    if (sendingStage) return;
    setPendingConfirm({ clientName, stageKey });
  };

  const handleConfirmSend = async () => {
    if (!pendingConfirm) return;
    const { clientName, stageKey } = pendingConfirm;
    const stage = NOTIFICATION_STAGES.find((s) => s.key === stageKey);
    if (!stage) {
      setPendingConfirm(null);
      return;
    }

    setSendingStage(true);
    const saved = await saveField(clientName, "notificationStage", stage.label);
    if (!saved) {
      setSendingStage(false);
      toast.error(`Couldn't save ${stage.label} stage for ${clientName}. Check the field's error icon and try again.`);
      return;
    }

    setActiveStage((prev) => ({ ...prev, [clientName]: stageKey }));
    updateRow(clientName, { notificationStage: stage.label });

    const contactId = ghlContactIdByName.get(clientName.trim().toLowerCase());
    if (!contactId) {
      toast(`${stage.label} stage saved for ${clientName}, but no matching GHL contact was found — tag not applied.`);
    } else {
      try {
        await applyGhlTag(contactId, stage.tag);
        toast.success(`${stage.label} stage saved and "${stage.tag}" tag applied in GHL for ${clientName}.`);
      } catch (err) {
        console.error(`[Billing] Failed to apply GHL tag for ${clientName}:`, err);
        toast.error(`${stage.label} stage saved, but the GHL tag failed to apply for ${clientName}. Try again from here or tag manually in GHL.`);
      }
    }

    setSendingStage(false);
    setPendingConfirm(null);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "balanceDue" ? "desc" : "asc");
    }
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = rows.filter((r) => {
      if (q && !r.clientName.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false;
      if (serviceTypeFilter !== "all" && r.serviceType !== serviceTypeFilter) return false;
      if (outstandingOnly && parseCurrency(r.balanceDue) <= 0) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (sortKey === "balanceDue") return (parseCurrency(a.balanceDue) - parseCurrency(b.balanceDue)) * dir;
      if (sortKey === "dueDate") return (parseDateMs(a.dueDate) - parseDateMs(b.dueDate)) * dir;
      return a.clientName.localeCompare(b.clientName) * dir;
    });
    return result;
  }, [rows, search, serviceTypeFilter, outstandingOnly, sortKey, sortDir]);

  const totalOutstanding = useMemo(
    () => filteredRows.reduce((sum, r) => sum + parseCurrency(r.balanceDue), 0),
    [filteredRows],
  );

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (serviceTypeFilter !== "all" ? 1 : 0) + (outstandingOnly ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setServiceTypeFilter("all");
    setOutstandingOnly(false);
  };

  const isOverdue = (row: BillingRow) =>
    !!row.dueDate && parseDateMs(row.dueDate) > 0 && parseDateMs(row.dueDate) < Date.now() && parseCurrency(row.balanceDue) > 0;

  // Dead $0 accounts with no recent payment — visually deprioritized, not
  // hidden. Matches the "archived" row treatment used elsewhere in the app
  // (DeveloperPage's update log: bg-muted/30 opacity-70).
  const STALE_MONTHS_MS = 12 * 30 * 24 * 60 * 60 * 1000;
  const isStaleAccount = (row: BillingRow) => {
    if (parseCurrency(row.balanceDue) !== 0) return false;
    if (!row.lastPaidDate.trim()) return true;
    const lastPaidMs = parseDateMs(row.lastPaidDate);
    if (lastPaidMs === 0) return true;
    return Date.now() - lastPaidMs > STALE_MONTHS_MS;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">Billing</h2>
            <p className="text-xs text-muted-foreground">
              Track which clients owe money.
            </p>
          </div>
        </div>
        <SopPanel config={billingSop} />
      </div>

      <div className="glass-panel rounded-xl border border-border p-3 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
        <div className="relative flex-1 min-w-[200px] lg:min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <Input
            placeholder="Search client or email…"
            aria-label="Search client or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
            <SelectTrigger className="h-9 w-[150px]" aria-label="Filter by service type">
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All service types</SelectItem>
              {SERVICE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setOutstandingOnly((v) => !v)}
            aria-pressed={outstandingOnly}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-semibold border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap ${
              outstandingOnly
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground border-border hover:bg-accent hover:text-foreground"
            }`}
          >
            Outstanding only
          </button>
          <button
            type="button"
            onClick={() => setShowEmails((v) => !v)}
            aria-pressed={showEmails}
            title={showEmails ? "Hide email addresses" : "Show email addresses"}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-semibold border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap ${
              showEmails
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground border-border hover:bg-accent hover:text-foreground"
            }`}
          >
            {showEmails ? <MailOpen className="h-3.5 w-3.5" aria-hidden="true" /> : <Mail className="h-3.5 w-3.5" aria-hidden="true" />}
            {showEmails ? "Hide emails" : "Show emails"}
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-semibold text-muted-foreground border border-border hover:bg-accent hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-mono-data tabular-nums">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel rounded-xl border border-border p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm">Loading billing data…</p>
          {showSlowLoadHint && (
            <p className="text-xs text-muted-foreground/70 max-w-xs text-center">
              First load pulls the whole sheet, so this can take a few seconds — it'll be instant next time.
            </p>
          )}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-panel rounded-xl border border-border p-12 text-center text-muted-foreground">
          <p className="text-sm">No billing data found. Make sure the "Billing" tab exists in the Google Sheet.</p>
        </div>
      ) : (
      <div className="glass-panel rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs font-semibold text-foreground font-mono-data tabular-nums">
            {filteredRows.length} {filteredRows.length === 1 ? "client" : "clients"}
            <span className="text-muted-foreground font-normal"> · </span>
            {formatCurrency(totalOutstanding)} total due
          </span>
        </div>
        <div className="max-h-[70vh] overflow-auto scrollbar-thin [scrollbar-gutter:stable]">
          <table className="w-full min-w-[980px] text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {COLUMNS.map((col) => (
                  <th key={col.label} scope="col" className="px-4 py-3 whitespace-nowrap">
                    {col.key ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                        onClick={() => handleSort(col.key!)}
                        title={`Sort by ${col.label}`}
                        aria-label={`Sort by ${col.label}`}
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === "asc" ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-14 text-center text-muted-foreground">
                    <p className="text-sm">No clients match your current filters.</p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
              {filteredRows.map((row) => {
                const stStatus = getStatus(row.clientName, "serviceType");
                const notesStatus = getStatus(row.clientName, "notes");
                const overdue = isOverdue(row);
                const stale = isStaleAccount(row);
                return (
                <tr
                  key={row.clientName}
                  className={`border-b border-border/50 align-top transition-colors duration-150 ${
                    stale ? "bg-muted/30 opacity-70" : ""
                  }`}
                >
                  <td className="px-4 py-3 max-w-[220px]" title={!showEmails ? row.email : undefined}>
                    <div className="font-medium text-foreground truncate">{row.clientName}</div>
                    {showEmails && row.email && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{row.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Select value={row.serviceType} onValueChange={(v) => handleServiceTypeChange(row.clientName, v)}>
                        <SelectTrigger
                          className={`h-9 w-[130px] ${stStatus === "error" ? "border-destructive ring-1 ring-destructive/30" : ""} ${stStatus === "saving" ? "opacity-60" : ""}`}
                          aria-label={`Service type for ${row.clientName}`}
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {stStatus === "error" && (
                        <span className="flex items-center gap-1 text-destructive text-[11px] whitespace-nowrap" title="Failed to save">
                          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground font-mono-data tabular-nums whitespace-nowrap">{row.balanceDue}</td>
                  <td className="px-4 py-3 font-mono-data tabular-nums whitespace-nowrap">
                    <span className={overdue ? "text-destructive font-semibold" : "text-muted-foreground"}>{row.dueDate}</span>
                    {overdue && (
                      <span className="ml-2 inline-flex items-center h-4 px-1.5 rounded-full bg-destructive/15 text-destructive text-[9px] font-semibold uppercase tracking-wide align-middle">
                        Overdue
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono-data tabular-nums whitespace-nowrap">{row.lastPaidDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {NOTIFICATION_STAGES.map((stage) => {
                        const isActive = activeStage[row.clientName] === stage.key;
                        const isPending = pendingConfirm?.clientName === row.clientName && pendingConfirm?.stageKey === stage.key;
                        return (
                          <button
                            key={stage.key}
                            type="button"
                            onClick={() => handleStageClick(row.clientName, stage.key)}
                            disabled={sendingStage && !isPending}
                            title={`Send ${stage.label}`}
                            aria-label={`Send ${stage.label} for ${row.clientName}`}
                            aria-pressed={isActive}
                            className={`inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:pointer-events-none ${
                              isActive
                                ? "bg-primary text-primary-foreground border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]"
                                : "text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                            }`}
                          >
                            {isPending && sendingStage ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <stage.icon className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={row.notes}
                        onChange={(e) => updateRow(row.clientName, { notes: e.target.value })}
                        onFocus={() => handleNotesFocus(row.clientName)}
                        onBlur={() => handleNotesSave(row.clientName)}
                        onKeyDown={handleNotesKeyDown}
                        placeholder="Add note…"
                        aria-label={`Notes for ${row.clientName}`}
                        className={`h-9 w-[180px] ${notesStatus === "error" ? "border-destructive ring-1 ring-destructive/30" : ""} ${notesStatus === "saving" ? "opacity-60" : ""}`}
                      />
                      {notesStatus === "error" && (
                        <span className="flex items-center gap-1 text-destructive text-[11px] whitespace-nowrap" title="Failed to save">
                          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <AlertDialog open={!!pendingConfirm} onOpenChange={(o) => { if (!sendingStage && !o) setPendingConfirm(null); }}>
        <AlertDialogContent>
          {pendingConfirm && (() => {
            const stage = NOTIFICATION_STAGES.find((s) => s.key === pendingConfirm.stageKey)!;
            const hasContact = ghlContactIdByName.has(pendingConfirm.clientName.trim().toLowerCase());
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send {stage.label} to {pendingConfirm.clientName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This saves "{stage.label}" as the Notification Stage on the Billing sheet and applies the{" "}
                    <span className="font-semibold text-foreground">{stage.tag}</span> tag to their GHL contact,
                    which triggers the firm's existing {stage.label.toLowerCase()} automation.
                    {!hasContact && (
                      <span className="block mt-2 text-destructive">
                        No matching GHL contact was found for this client — the stage will still save, but no tag (and no message) will go out.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={sendingStage}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={sendingStage}
                    onClick={(e) => {
                      e.preventDefault();
                      void handleConfirmSend();
                    }}
                  >
                    {sendingStage ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        Sending…
                      </span>
                    ) : (
                      `Send ${stage.label}`
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
