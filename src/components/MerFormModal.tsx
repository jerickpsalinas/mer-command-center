import { useEffect, useId, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, FilePlus2, FileEdit, AlertTriangle, FileText, ChevronDown, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { Users } from "lucide-react";
import type { MerHistoryRow } from "@/services/googleSheets";
import { GHL_BASE, GHL_LOCATION_ID, ghlHeaders } from "@/lib/ghlConfig";
import { useAuth } from "@/hooks/useAuth";
import { useGhlTags } from "@/hooks/useGhlTags";
import { logActivity } from "@/lib/activityLogger";
import { supabase } from "@/integrations/supabase/client";

const WEBHOOK_URL =
  "https://n8n.srv1482383.hstgr.cloud/webhook/mer-dashboard-submit";

const CLIENT_TYPES = ["School", "For-Profit", "Non-Profit"] as const;
const BOOKKEEPERS = ["Jessica", "Sahir", "Maricel"] as const;
const STMT_STATUSES = ["Received", "Not Received"] as const;
const STATUS_PRESETS = [
  "Need to reconnect bank feed",
  "Waiting for bank statements",
  "Ready for bank reconciliation",
  "Ready for manager's review",
  "Completed",
] as const;
const STATUS_CUSTOM_VALUE = "__custom__";

type Mode = "add" | "update";

interface Props {
  open: boolean;
  mode: Mode;
  client?: MerHistoryRow | null;
  clients?: MerHistoryRow[];
  onClose: () => void;
  onSaved?: (saved: {
    clientName: string;
    merKey: string;
    newMerKey: string;
    cycleMonth: string;
    notes: string;
  }) => void;
}

function priorMonthLabel(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return format(d, "MMMM yyyy");
}

function toFullMonthLabel(val: string | undefined): string {
  if (!val) return "";
  const d = new Date(`1 ${val}`);
  if (!isNaN(d.getTime())) return format(d, "MMMM yyyy");
  const d2 = new Date(val);
  return isNaN(d2.getTime()) ? val : format(d2, "MMMM yyyy");
}

function toYesNo(b: boolean): "Yes" | "No" {
  return b ? "Yes" : "No";
}

function parseDate(val: string): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

interface FormState {
  cycleMonth: string;
  clientType: string;
  bookkeeper: string;
  bankTransactions: number;
  uncategorizedTransactions: number;
  transactionsWithoutPayees: number;
  undepositedFunds: number;
  unappliedPayments: number;
  statementRequestStatus: string;
  lastReconciledDate: Date | undefined;
  prevMonthNotesApproved: "Yes" | "No";
  financialsSentToClient: "Yes" | "No";
  booksClosedInQB: "Yes" | "No";
  status: string;
  notes: string;
}

function emptyForm(): FormState {
  return {
    cycleMonth: priorMonthLabel(),
    clientType: "",
    bookkeeper: "",
    bankTransactions: 0,
    uncategorizedTransactions: 0,
    transactionsWithoutPayees: 0,
    undepositedFunds: 0,
    unappliedPayments: 0,
    statementRequestStatus: "",
    lastReconciledDate: undefined,
    prevMonthNotesApproved: "No",
    financialsSentToClient: "No",
    booksClosedInQB: "No",
    status: "",
    notes: "",
  };
}

function buildInitial(mode: Mode, client: MerHistoryRow | null | undefined): FormState {
  if (mode === "add" || !client) {
    const base = emptyForm();
    if (client?.bookkeeper) base.bookkeeper = client.bookkeeper;
    return base;
  }
  const bankNumMatch = String(client.bankTransactions ?? "").match(/\d+/);
  const bankNum = bankNumMatch ? Number(bankNumMatch[0]) : 0;
  return {
    cycleMonth: toFullMonthLabel(client.month) || priorMonthLabel(),
    clientType: client.clientType || "",
    bookkeeper: client.bookkeeper || "",
    bankTransactions: bankNum,
    uncategorizedTransactions: Number(client.uncategorizedTransactions) || 0,
    transactionsWithoutPayees: Number(client.transactionsWithoutPayees) || 0,
    undepositedFunds: Number(client.undepositedFunds) || 0,
    unappliedPayments: Number(client.unappliedPayments) || 0,
    statementRequestStatus: client.statementRequestStatus || "",
    lastReconciledDate: parseDate(client.lastReconciledDate),
    prevMonthNotesApproved: toYesNo(!!client.prevMonthNotesApproved),
    financialsSentToClient: toYesNo(!!client.financialsSentToClient),
    booksClosedInQB: toYesNo(!!client.booksClosedInQB),
    status: client.status || "",
    notes: (client as MerHistoryRow & { notes?: string }).notes || "",
  };
}


type ClientOption = {
  name: string;
  ghlContactId: string;
  merKey: string;
  bookkeeper?: string;
  clientType?: string;
  submittedBy?: string;
};

export default function MerFormModal({ open, mode, client, clients, onClose, onSaved }: Props) {
  const qc = useQueryClient();
  const { isAdmin, isDeveloper, profile, user } = useAuth();
  const dashboardUser = profile?.name || user?.email || "Dashboard User";
  const canManagerApprove = isAdmin || isDeveloper;
  const { tagsMap, applyTag } = useGhlTags();
  const isGlobal = !client;
  const effectiveMode = mode;
  const needsGhlPicker = isGlobal && effectiveMode === "add";
  const needsSheetPicker = isGlobal && effectiveMode === "update";
  const [selectedClient, setSelectedClient] = useState<ClientOption | MerHistoryRow | null>(
    client ?? null,
  );
  const [form, setForm] = useState<FormState>(() => buildInitial(mode, client));
  const [notesTouched, setNotesTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });
  const [ghlOptions, setGhlOptions] = useState<ClientOption[]>([]);
  const [ghlLoading, setGhlLoading] = useState(false);
  const [ghlError, setGhlError] = useState<string | null>(null);
  const [statusCustom, setStatusCustom] = useState<boolean>(
    () => !!form.status && !(STATUS_PRESETS as readonly string[]).includes(form.status),
  );

  // Docs Received gate (Add mode)
  const [tagsForGate, setTagsForGate] = useState<string[] | null>(null);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [docsGatePassed, setDocsGatePassed] = useState(false);
  const [applyingDocsTag, setApplyingDocsTag] = useState(false);
  const [showMerWorkflowDialog, setShowMerWorkflowDialog] = useState(false);

  const [sheetPickerOpen, setSheetPickerOpen] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (form.status && !(STATUS_PRESETS as readonly string[]).includes(form.status)) {
      setStatusCustom(true);
    }
  }, [form.status]);

  // Group MER rows by month (most recent first), clients sorted alphabetically within each group.
  const sheetOptionGroups = (() => {
    if (!clients?.length) return [] as { month: string; monthDate: string; rows: MerHistoryRow[] }[];
    const groups = new Map<string, { month: string; monthDate: string; rows: MerHistoryRow[] }>();
    for (const row of clients) {
      if (!row.name || !row.merKey) continue;
      const month = row.month || "Unknown";
      const g = groups.get(month) ?? { month, monthDate: row.monthDate || "", rows: [] };
      if (!g.monthDate && row.monthDate) g.monthDate = row.monthDate;
      g.rows.push(row);
      groups.set(month, g);
    }
    for (const g of groups.values()) {
      g.rows.sort((a, b) => a.name.localeCompare(b.name));
    }
    return Array.from(groups.values()).sort((a, b) => b.monthDate.localeCompare(a.monthDate));
  })();
  const sheetOptions = sheetOptionGroups.flatMap((g) => g.rows);


  // Fetch GHL contacts when add picker is needed
  useEffect(() => {
    if (!open || !needsGhlPicker) return;
    let cancelled = false;
    setGhlLoading(true);
    setGhlError(null);
    (async () => {
      try {
        interface GhlContact {
          id: string;
          tags?: string[];
          companyName?: string;
          firstName?: string;
          lastName?: string;
          contactName?: string;
        }
        const collected: GhlContact[] = [];
        let startAfter: string | number | undefined;
        let startAfterId: string | undefined;
        for (let i = 0; i < 50; i++) {
          const params = new URLSearchParams({
            locationId: GHL_LOCATION_ID,
            limit: "100",
          });
          if (startAfter != null) params.set("startAfter", String(startAfter));
          if (startAfterId) params.set("startAfterId", startAfterId);
          const res = await fetch(`${GHL_BASE}/contacts/?${params.toString()}`, {
            headers: ghlHeaders(),
          });
          if (!res.ok) throw new Error(`GHL request failed (${res.status})`);
          const data = await res.json();
          const page: GhlContact[] = Array.isArray(data?.contacts) ? data.contacts : [];
          if (page.length === 0) break;
          collected.push(...page);
          const meta = data.meta || {};
          const nextStartAfter = meta.startAfter ?? meta.nextStartAfter;
          const nextStartAfterId = meta.startAfterId ?? meta.nextStartAfterId;
          if (!nextStartAfter && !nextStartAfterId) break;
          if (nextStartAfter === startAfter && nextStartAfterId === startAfterId) break;
          startAfter = nextStartAfter;
          startAfterId = nextStartAfterId;
        }
        const filtered = collected.filter(
          (c) =>
            Array.isArray(c?.tags) &&
            c.tags.some((t: string) => String(t).toLowerCase() === "active-client"),
        );
        const opts: ClientOption[] = filtered.map((c) => {
          const company = (c.companyName || "").trim();
          const fullName =
            `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.contactName || "Unnamed";
          return {
            name: company || fullName,
            ghlContactId: c.id,
            merKey: "",
          };
        });
        opts.sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) setGhlOptions(opts);
      } catch (e) {
        if (!cancelled)
          setGhlError(e instanceof Error ? e.message : "Failed to load clients from GHL.");
      } finally {
        if (!cancelled) setGhlLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, needsGhlPicker]);

  useEffect(() => {
    if (open) {
      setSelectedClient(client ?? null);
      setForm(buildInitial(mode, client));
      setNotesTouched(false);
      setError(null);
      setTagsForGate(null);
      setDocsGatePassed(false);
    }
  }, [open, mode, client]);

  const mostRecentMonth = sheetOptionGroups[0]?.month ?? "";
  useEffect(() => {
    if (open && mostRecentMonth) {
      setExpandedMonths(new Set([mostRecentMonth]));
    }
    // Only reset when the modal opens or the most-recent month key changes,
    // not on every render (sheetOptionGroups is a new array each render).
  }, [open, mostRecentMonth]);

  // Fallback: hydrate notes from Supabase mer_history if the sheet value is empty
  // (covers WF8 sync lag — notes saved to Supabase immediately on submit).
  useEffect(() => {
    if (!open) return;
    if (notesTouched) return;
    const sel = selectedClient as (MerHistoryRow & { notes?: string }) | null;
    if (!sel) return;
    const merKey = sel.merKey;
    const clientName = sel.name;
    if (!merKey && !clientName) return;
    let cancelled = false;
    (async () => {
      let q = supabase
        .from("mer_history")
        .select("notes, mer_key, client_name, month, created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      if (merKey) {
        q = q.eq("mer_key", merKey);
      } else if (clientName) {
        q = q.eq("client_name", clientName).eq("month", form.cycleMonth);
      }
      const { data } = await q.maybeSingle();
      if (cancelled) return;
      const fetched = (data?.notes ?? "") as string;
      if (data) {
        setForm((f) => ({ ...f, notes: fetched }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selectedClient, form.cycleMonth, notesTouched]);

  // Fetch live GHL tags for the selected client (Add mode docs-received gate)
  const selectedGhlId = selectedClient?.ghlContactId
    || (() => {
      const k = selectedClient?.merKey ?? "";
      return typeof k === "string" && k.includes("_") ? k.split("_")[0] : "";
    })();

  useEffect(() => {
    if (!open || !selectedGhlId) {
      setTagsForGate(null);
      setDocsGatePassed(false);
      return;
    }
    let cancelled = false;
    setTagsLoading(true);
    setDocsGatePassed(false);
    (async () => {
      try {
        const res = await fetch(`${GHL_BASE}/contacts/${selectedGhlId}`, {
          headers: ghlHeaders(),
        });
        if (!res.ok) throw new Error(`GHL fetch failed (${res.status})`);
        const data = await res.json();
        const tags: string[] = Array.isArray(data?.contact?.tags)
          ? data.contact.tags
          : Array.isArray(data?.tags)
            ? data.tags
            : [];
        if (cancelled) return;
        setTagsForGate(tags);
        const isCleanup = tags.includes("ready-for-cleanup");
        const needed = isCleanup ? "docs-received-cleanup" : "docs-received";
        if (tags.includes(needed)) setDocsGatePassed(true);
      } catch (e) {
        if (!cancelled) {
          setTagsForGate([]);
          toast.error(e instanceof Error ? e.message : "Failed to fetch GHL tags.");
        }
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, effectiveMode, selectedGhlId]);

  const docsTagNeeded = useMemo(() => {
    const tags = tagsForGate || [];
    return tags.includes("ready-for-cleanup")
      ? "docs-received-cleanup"
      : "docs-received";
  }, [tagsForGate]);

  const showDocsBanner =
    !!selectedGhlId &&
    tagsForGate !== null &&
    !docsGatePassed;

  const confirmDocsReceived = async () => {
    if (!selectedGhlId) return;
    setApplyingDocsTag(true);
    try {
      const res = await fetch(`${GHL_BASE}/contacts/${selectedGhlId}/tags`, {
        method: "POST",
        headers: ghlHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tags: [docsTagNeeded] }),
      });
      if (!res.ok) throw new Error(`Tag apply failed (${res.status})`);
      void logActivity({
        action: "tag-added",
        clientName: selectedClient?.name || client?.name || "",
        page: "MER Form",
        details: "Gate: docs-received",
        cycleMonth: form.cycleMonth,
      });
      toast.success("Docs received tag applied");
      setDocsGatePassed(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setApplyingDocsTag(false);
    }
  };



  const confirmMerWorkflow = async () => {
    if (!selectedGhlId) {
      setShowMerWorkflowDialog(false);
      return;
    }
    setSubmitting(true);
    try {
      await applyTag(selectedGhlId, "mer-workflow");
      setShowMerWorkflowDialog(false);
      await submit(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };


  // Keep merKey in sync with cycleMonth for GHL-picked clients (add only)
  useEffect(() => {
    if (!needsGhlPicker || !selectedClient || !("ghlContactId" in selectedClient)) return;
    const opt = selectedClient as ClientOption;
    if (!opt.ghlContactId) return;
    const newKey = `${opt.ghlContactId}_${form.cycleMonth.replace(/\s+/g, "")}`;
    if (opt.merKey !== newKey) {
      setSelectedClient({ ...opt, merKey: newKey });
    }
  }, [form.cycleMonth, needsGhlPicker, selectedClient]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleGhlPick = (ghlId: string) => {
    const c = ghlOptions.find((x) => x.ghlContactId === ghlId) || null;
    if (c) {
      const merKey = `${c.ghlContactId}_${form.cycleMonth.replace(/\s+/g, "")}`;
      setSelectedClient({ ...c, merKey });
      setNotesTouched(false);
    } else {
      setSelectedClient(null);
      setNotesTouched(false);
    }
  };

  const handleSheetPick = (merKey: string) => {
    const row = sheetOptions.find((r) => r.merKey === merKey) || null;
    if (row) {
      setSelectedClient(row);
      setForm(buildInitial("update", row));
      setNotesTouched(false);
    } else {
      setSelectedClient(null);
      setNotesTouched(false);
    }
  };

  const buildPayload = (forceOverwrite: boolean) => {
    const effective = selectedClient;
    const originalMerKey = effective?.merKey ?? "";
    const ghlContactId =
      effective?.ghlContactId ||
      (originalMerKey.includes("_") ? originalMerKey.split("_")[0] : "");
    const newMerKey = ghlContactId
      ? `${ghlContactId}_${form.cycleMonth.replace(/\s+/g, "")}`
      : originalMerKey;
    const merKey = effectiveMode === "update" ? originalMerKey : newMerKey;
    return {
      action: effectiveMode,
      clientName: effective?.name ?? "",
      ghlContactId,
      merKey,
      newMerKey,
      cycleMonth: form.cycleMonth,
      clientType: form.clientType,
      bookkeeper: form.bookkeeper,
      submittedBy: dashboardUser,
      bankTransactions: Number(form.bankTransactions) || 0,
      uncategorizedTransactions: Number(form.uncategorizedTransactions) || 0,
      transactionsWithoutPayees: Number(form.transactionsWithoutPayees) || 0,
      undepositedFunds: Number(form.undepositedFunds) || 0,
      unappliedPayments: Number(form.unappliedPayments) || 0,
      statementRequestStatus: form.statementRequestStatus,
      lastReconciledDate: form.lastReconciledDate
        ? format(form.lastReconciledDate, "yyyy-MM-dd")
        : "",
      prevMonthNotesApproved: form.prevMonthNotesApproved,
      financialsSentToClient: form.financialsSentToClient,
      booksClosedInQB: form.booksClosedInQB,
      status: form.status,
      notes: form.notes,
      forceOverwrite,
    };
  };

  const submit = async (forceOverwrite = false) => {
    if (!selectedClient) {
      setError("Please select a client first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildPayload(forceOverwrite);
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let body: Record<string, unknown> | null = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }

      if (res.status === 200) {
        toast.success(`${selectedClient.name} — ${form.cycleMonth}`);
        void logActivity({
          action: effectiveMode === "add" ? "mer-add" : "mer-update",
          clientName: selectedClient.name,
          page: "MER Form",
          details: `Status: ${form.status} · Bookkeeper: ${form.bookkeeper}`,
          cycleMonth: form.cycleMonth,
        });
        // Persist a dashboard-side history row so Notes remain visible after modal close/refresh,
        // even if the external sheet sync lags behind.
        const { error: historyError } = await supabase.from("mer_history").insert({
          action: effectiveMode,
          mer_key: payload.merKey || payload.newMerKey || null,
          client_name: payload.clientName,
          client_type: payload.clientType || null,
          bookkeeper: payload.bookkeeper || null,
          month: payload.cycleMonth || null,
          status: payload.status || null,
          notes: payload.notes || null,
          bank_transactions: String(payload.bankTransactions ?? ""),
          uncategorized_transactions: payload.uncategorizedTransactions ?? 0,
          transactions_without_payees: payload.transactionsWithoutPayees ?? 0,
          undeposited_funds: payload.undepositedFunds ?? 0,
          unapplied_payments: payload.unappliedPayments ?? 0,
          statement_request_status: payload.statementRequestStatus || null,
          last_reconciled_date: payload.lastReconciledDate || null,
          prev_month_notes_approved: payload.prevMonthNotesApproved === "Yes",
          financials_sent_to_client: payload.financialsSentToClient === "Yes",
          books_closed_in_qb: payload.booksClosedInQB === "Yes",
          submitted_by: payload.submittedBy || null,
          timestamp: new Date().toISOString(),
          source: "dashboard",
        });
        if (historyError) {
          setError(`MER submitted, but notes could not be saved for display: ${historyError.message}`);
          return;
        }
        onSaved?.({
          clientName: payload.clientName,
          merKey: payload.merKey,
          newMerKey: payload.newMerKey,
          cycleMonth: payload.cycleMonth,
          notes: payload.notes,
        });
        await qc.invalidateQueries({ queryKey: ["sheet-data"] });
        await qc.invalidateQueries({ queryKey: ["mer-history", payload.clientName] });

        setConfirmOverwrite({ open: false, message: "" });
        onClose();
        return;
      }


      if (res.status === 409 && body?.requiresConfirmation) {
        setConfirmOverwrite({
          open: true,
          message:
            body?.message ||
            "This record already exists. Overwrite it?",
        });
        return;
      }

      if (res.status === 400 || res.status === 404) {
        setError(
          body?.message ||
            `Request failed (${res.status}). Please check your input.`,
        );
        return;
      }

      setError(body?.message || `Unexpected error (${res.status}).`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Network error. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isUpdate = effectiveMode === "update";
  const title = isUpdate ? "Update MER" : "Add MER";
  const Icon = isUpdate ? FileEdit : FilePlus2;
  const headerName =
    selectedClient?.name || (isGlobal ? "Select a client" : "");

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
        <DialogContent
          className="max-w-3xl w-[calc(100vw-1rem)] sm:w-full max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent p-0 gap-0 bg-card border-border"
        >
          <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 pr-8 min-w-0">
              <Icon className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <span className="truncate min-w-0" title={headerName || undefined}>
                {title}
                {headerName ? ` — ${headerName}` : ""}
              </span>
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground">
              {isUpdate
                ? "Edit and submit the latest MER values for this client."
                : "Submit a new MER record."}{" "}
              Fields marked <span className="text-destructive">*</span> are required.
            </p>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (submitting) return;
              if (!form.cycleMonth.trim()) {
                toast.error("Cycle month is required.");
                return;
              }
              if (effectiveMode === "add" && selectedGhlId) {
                const clientTags = tagsMap[selectedGhlId];
                if (clientTags && !clientTags.includes("mer-workflow")) {
                  setShowMerWorkflowDialog(true);
                  return;
                }
              }
              void submit(false);
            }}
            className="space-y-4"
          >
            <div className="px-4 sm:px-6 space-y-4">
            {(needsGhlPicker || needsSheetPicker) && (
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</p>
            )}
            {needsGhlPicker && (
              <Field label="Client (from GHL)" htmlFor="mer-ghl-client" required>
                <Select
                  value={(selectedClient as ClientOption | null)?.ghlContactId ?? ""}
                  onValueChange={handleGhlPick}
                  disabled={ghlLoading}
                >
                  <SelectTrigger id="mer-ghl-client" aria-required="true" aria-busy={ghlLoading}>
                    {ghlLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mr-2 shrink-0" aria-hidden="true" />}
                    <SelectValue
                      placeholder={
                        ghlLoading ? "Loading clients…" : "Select a client"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {ghlError ? (
                      <div className="px-3 py-2 text-xs text-destructive" role="alert">
                        {ghlError}
                      </div>
                    ) : ghlOptions.length === 0 && !ghlLoading ? (
                      <div className="px-3 py-4">
                        <EmptyState icon={Users} title="No active clients found" size="sm" />
                      </div>
                    ) : (
                      ghlOptions
                        .filter((c) => !!c.ghlContactId)
                        .map((c) => (
                          <SelectItem key={c.ghlContactId} value={c.ghlContactId}>
                            {c.name}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {needsSheetPicker && (
              <Field label="Client (from MER Dashboard)" htmlFor="mer-sheet-client" required>
                <Popover open={sheetPickerOpen} onOpenChange={setSheetPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="mer-sheet-client"
                      variant="outline"
                      role="combobox"
                      aria-expanded={sheetPickerOpen}
                      aria-required="true"
                      className="w-full justify-between h-10 px-3 py-2 text-sm font-normal bg-background border-input hover:bg-accent"
                    >
                      <span className="truncate">
                        {(selectedClient as MerHistoryRow | null)?.name || "Select a client"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" aria-hidden="true" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[--radix-popover-trigger-width]"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <div
                      className="overflow-y-auto overscroll-contain max-h-72 p-1 scrollbar-thin"
                      onWheel={(e) => e.stopPropagation()}
                      role="listbox"
                      aria-label="Clients by month"
                    >
                      {sheetOptions.length === 0 ? (
                        <div className="px-3 py-4">
                          <EmptyState icon={Users} title="No clients available" size="sm" />
                        </div>
                      ) : (
                        sheetOptionGroups.map((g) => {
                          const isExpanded = expandedMonths.has(g.month);
                          return (
                            <div key={g.month}>
                              <button
                                type="button"
                                aria-expanded={isExpanded}
                                className="w-full text-left text-xs font-medium uppercase tracking-wider text-muted-foreground pt-3 pb-1.5 border-b border-border/50 cursor-pointer flex items-center justify-between select-none px-3 transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring rounded-sm"
                                onClick={() => {
                                  setExpandedMonths((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(g.month)) {
                                      next.delete(g.month);
                                    } else {
                                      next.add(g.month);
                                    }
                                    return next;
                                  });
                                }}
                              >
                                {g.month}
                                <ChevronDown
                                  aria-hidden="true"
                                  className={cn(
                                    "h-3.5 w-3.5 transition-transform duration-200",
                                    isExpanded ? "rotate-180" : ""
                                  )}
                                />
                              </button>
                              {isExpanded && (
                                <div className="py-0.5">
                                  {g.rows.map((c) => (
                                    <div
                                      key={c.merKey}
                                      role="option"
                                      tabIndex={0}
                                      aria-selected={(selectedClient as MerHistoryRow | null)?.merKey === c.merKey}
                                      className={cn(
                                        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                                        (selectedClient as MerHistoryRow | null)?.merKey === c.merKey
                                          ? "bg-accent text-accent-foreground"
                                          : ""
                                      )}
                                      onClick={() => {
                                        handleSheetPick(c.merKey);
                                        setSheetPickerOpen(false);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handleSheetPick(c.merKey);
                                          setSheetPickerOpen(false);
                                        }
                                      }}
                                    >
                                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                        {(selectedClient as MerHistoryRow | null)?.merKey === c.merKey && (
                                          <Check className="h-4 w-4" aria-hidden="true" />
                                        )}
                                      </span>
                                      <span className="truncate" title={c.name}>{c.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </Field>
            )}

            {effectiveMode === "add" && selectedGhlId && tagsLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2" aria-live="polite" aria-busy="true">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Checking GHL tags…
              </div>
            )}

            {!tagsLoading && (
              <>
                {showDocsBanner && (
                  <div className="rounded-xl border border-warning/30 bg-warning/10 p-4" role="status">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Documents not yet received</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          The docs-received tag has not been applied for this client. You can still add MER data now and confirm docs later.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDocsGatePassed(true)}
                        disabled={applyingDocsTag}
                      >
                        Skip for now
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void confirmDocsReceived()}
                        disabled={applyingDocsTag}
                      >
                        {applyingDocsTag && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                        {applyingDocsTag ? "Applying…" : "Confirm — Docs Received"}
                      </Button>
                    </div>
                  </div>
                )}

            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cycle details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cycle Month" htmlFor="mer-cycle-month" required>
                <Input
                  id="mer-cycle-month"
                  value={form.cycleMonth}
                  onChange={(e) => update("cycleMonth", e.target.value)}
                  placeholder="April 2026"
                  required
                  aria-required="true"
                  aria-invalid={!form.cycleMonth.trim() || undefined}
                  autoComplete="off"
                />
                {!form.cycleMonth.trim() && (
                  <p className="text-[11px] text-destructive">Cycle month is required.</p>
                )}
              </Field>

              <Field label="Client Type" htmlFor="mer-client-type">
                <Select
                  value={form.clientType}
                  onValueChange={(v) => update("clientType", v)}
                >
                  <SelectTrigger id="mer-client-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Bookkeeper" htmlFor="mer-bookkeeper">
                <Select
                  value={form.bookkeeper}
                  onValueChange={(v) => update("bookkeeper", v)}
                >
                  <SelectTrigger id="mer-bookkeeper">
                    <SelectValue placeholder="Select bookkeeper" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOOKKEEPERS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Statement Request Status" htmlFor="mer-stmt-status">
                <Select
                  value={form.statementRequestStatus}
                  onValueChange={(v) => update("statementRequestStatus", v)}
                >
                  <SelectTrigger id="mer-stmt-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STMT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Last Reconciled Date" htmlFor="mer-last-reconciled">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="mer-last-reconciled"
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.lastReconciledDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {form.lastReconciledDate
                        ? format(form.lastReconciledDate, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.lastReconciledDate}
                      onSelect={(d) => update("lastReconciledDate", d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transaction counts</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumField
                id="mer-bank-tx"
                label="Bank Transactions Missing"
                value={form.bankTransactions}
                onChange={(n) => update("bankTransactions", n)}
              />
              <NumField
                id="mer-uncategorized"
                label="Uncategorized Transactions"
                value={form.uncategorizedTransactions}
                onChange={(n) => update("uncategorizedTransactions", n)}
              />
              <NumField
                id="mer-no-payees"
                label="Transactions Without Payees"
                value={form.transactionsWithoutPayees}
                onChange={(n) => update("transactionsWithoutPayees", n)}
              />
              <NumField
                id="mer-undeposited"
                label="Undeposited Funds"
                value={form.undepositedFunds}
                onChange={(n) => update("undepositedFunds", n)}
              />
              <NumField
                id="mer-unapplied"
                label="Unapplied Payments"
                value={form.unappliedPayments}
                onChange={(n) => update("unappliedPayments", n)}
              />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checklist</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <YesNoField
                label="Prev Month Notes Approved"
                value={form.prevMonthNotesApproved}
                onChange={(v) => update("prevMonthNotesApproved", v)}
              />
              <YesNoField
                label="Financials Sent To Client"
                value={form.financialsSentToClient}
                onChange={(v) => update("financialsSentToClient", v)}
              />
              <YesNoField
                label="Books Closed In QB"
                value={form.booksClosedInQB}
                onChange={(v) => update("booksClosedInQB", v)}
              />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status &amp; notes</p>
            <Field label="Status (optional)" htmlFor="mer-status">
              <div className="space-y-2">
                <Select
                  value={
                    statusCustom
                      ? STATUS_CUSTOM_VALUE
                      : (STATUS_PRESETS as readonly string[]).includes(form.status)
                        ? form.status
                        : ""
                  }
                  onValueChange={(v) => {
                    if (v === STATUS_CUSTOM_VALUE) {
                      setStatusCustom(true);
                      if ((STATUS_PRESETS as readonly string[]).includes(form.status)) {
                        update("status", "");
                      }
                    } else {
                      setStatusCustom(false);
                      update("status", v);
                    }
                  }}
                >
                  <SelectTrigger id="mer-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_PRESETS.filter((s) => s !== "Completed" || canManagerApprove).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    <SelectItem value={STATUS_CUSTOM_VALUE}>Custom…</SelectItem>
                  </SelectContent>
                </Select>
                {statusCustom && (
                  <Input
                    id="mer-status-custom"
                    aria-label="Custom status"
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                    placeholder="Use for genuine exceptions only — add details in Notes field below"
                  />
                )}
              </div>
            </Field>

            <Field label="Notes (optional)" htmlFor="mer-notes">
              <Textarea
                id="mer-notes"
                value={form.notes}
                onChange={(e) => {
                  setNotesTouched(true);
                  update("notes", e.target.value);
                }}
                placeholder="Add any additional context or details about this entry..."
                rows={3}
                className="resize-y min-h-[76px]"
              />
            </Field>


            {error && (
              <Alert variant="destructive" className="bg-destructive/10">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle className="text-sm">Submission failed</AlertTitle>
                <AlertDescription className="text-xs break-words">{error}</AlertDescription>
              </Alert>
            )}
            </>
            )}
            </div>

            <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-card">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !selectedClient || tagsLoading}>
                {submitting && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {submitting ? "Submitting…" : title}
              </Button>
            </div>

          </form>

        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmOverwrite.open}
        onOpenChange={(o) =>
          !o && setConfirmOverwrite({ open: false, message: "" })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record already exists</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmOverwrite.message ||
                "This record already exists. Overwrite it?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault();
                void submit(true);
              }}
            >
              {submitting ? "Overwriting…" : "Confirm Overwrite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showMerWorkflowDialog}
        onOpenChange={(o) => !o && setShowMerWorkflowDialog(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add MER Workflow Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This client doesn't have the mer-workflow tag yet. It will be added automatically so they show up correctly across the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting} onClick={() => setShowMerWorkflowDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault();
                void confirmMerWorkflow();
              }}
            >
              {submitting ? "Applying…" : "Confirm & Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({
  label,
  htmlFor,
  labelId,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  labelId?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={htmlFor}
        id={labelId}
        className="text-[10.5px] uppercase tracking-wide text-muted-foreground"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
        )}
      </Label>
      {children}
    </div>
  );
}

function NumField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="tabular-nums font-mono-data"
      />
    </Field>
  );
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "Yes" | "No";
  onChange: (v: "Yes" | "No") => void;
}) {
  const labelId = useId();
  return (
    <Field label={label} labelId={labelId}>
      <div className="inline-flex rounded-md border border-border bg-muted/20 p-0.5" role="group" aria-labelledby={labelId}>
        {(["Yes", "No"] as const).map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              aria-pressed={active}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs font-semibold rounded transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? opt === "Yes"
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </Field>
  );
}
