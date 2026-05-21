import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, FilePlus2, FileEdit, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { toast } from "@/hooks/use-toast";
import type { MerHistoryRow } from "@/services/googleSheets";

const WEBHOOK_URL =
  "https://n8n.srv1482383.hstgr.cloud/webhook/mer-dashboard-submit";

const CLIENT_TYPES = ["School", "For-Profit", "Non-Profit"] as const;
const BOOKKEEPERS = ["Jessica", "Sahir", "Maricel"] as const;
const STMT_STATUSES = ["Received", "Not Received"] as const;

type Mode = "add" | "update";

interface Props {
  open: boolean;
  mode: Mode;
  client?: MerHistoryRow | null;
  clients?: MerHistoryRow[];
  onClose: () => void;
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
  };
}

const GHL_URL =
  "https://services.leadconnectorhq.com/contacts/?locationId=2UvLCJLDqEYjWtuPdjaR&limit=100";
const GHL_TOKEN = "pit-9e416e9c-99e8-4507-9c57-e6c824f50723";

type ClientOption = {
  name: string;
  ghlContactId: string;
  merKey: string;
  bookkeeper?: string;
  clientType?: string;
  submittedBy?: string;
};

export default function MerFormModal({ open, mode, client, onClose }: Props) {
  const qc = useQueryClient();
  const needsClientPicker = mode === "add" && !client;
  const [selectedClient, setSelectedClient] = useState<ClientOption | MerHistoryRow | null>(
    client ?? null,
  );
  const [form, setForm] = useState<FormState>(() => buildInitial(mode, client));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });
  const [ghlOptions, setGhlOptions] = useState<ClientOption[]>([]);
  const [ghlLoading, setGhlLoading] = useState(false);
  const [ghlError, setGhlError] = useState<string | null>(null);

  // Fetch GHL contacts when picker is needed
  useEffect(() => {
    if (!open || !needsClientPicker) return;
    let cancelled = false;
    setGhlLoading(true);
    setGhlError(null);
    (async () => {
      try {
        const res = await fetch(GHL_URL, {
          headers: {
            Authorization: `Bearer ${GHL_TOKEN}`,
            Version: "2021-07-28",
          },
        });
        if (!res.ok) throw new Error(`GHL request failed (${res.status})`);
        const data = await res.json();
        const contacts: any[] = Array.isArray(data?.contacts) ? data.contacts : [];
        const filtered = contacts.filter(
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
  }, [open, needsClientPicker]);

  useEffect(() => {
    if (open) {
      setSelectedClient(client ?? null);
      setForm(buildInitial(mode, client));
      setError(null);
    }
  }, [open, mode, client]);

  // Keep merKey in sync with cycleMonth for GHL-picked clients
  useEffect(() => {
    if (!needsClientPicker || !selectedClient?.ghlContactId) return;
    const newKey = `${selectedClient.ghlContactId}_${form.cycleMonth.replace(/\s+/g, "")}`;
    if (selectedClient.merKey !== newKey) {
      setSelectedClient({ ...(selectedClient as ClientOption), merKey: newKey });
    }
  }, [form.cycleMonth, needsClientPicker, selectedClient]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleClientPick = (ghlId: string) => {
    const c = ghlOptions.find((x) => x.ghlContactId === ghlId) || null;
    if (c) {
      const merKey = `${c.ghlContactId}_${form.cycleMonth.replace(/\s+/g, "")}`;
      setSelectedClient({ ...c, merKey });
    } else {
      setSelectedClient(null);
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
    const merKey = mode === "update" ? originalMerKey : newMerKey;
    return {
      action: mode,
      clientName: effective?.name ?? "",
      ghlContactId,
      merKey,
      newMerKey,
      cycleMonth: form.cycleMonth,
      clientType: form.clientType,
      bookkeeper: form.bookkeeper,
      submittedBy: effective?.submittedBy || "Dashboard User",
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

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }

      if (res.status === 200) {
        toast({
          title: mode === "add" ? "MER added ✓" : "MER updated ✓",
          description: `${selectedClient.name} — ${form.cycleMonth}`,
        });
        await qc.invalidateQueries({ queryKey: ["sheet-data"] });
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

  const isUpdate = mode === "update";
  const title = isUpdate ? "Update MER" : "Add MER";
  const Icon = isUpdate ? FileEdit : FilePlus2;
  const headerName = selectedClient?.name || (needsClientPicker ? "Select a client" : "");

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
        <DialogContent
          className="max-w-3xl w-[calc(100vw-1rem)] sm:w-auto max-h-[92vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent p-4 sm:p-6 bg-card border-border"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">
                {title}
                {headerName ? ` — ${headerName}` : ""}
              </span>
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground">
              {isUpdate
                ? "Edit and submit the latest MER values for this client."
                : "Submit a new MER record."}
            </p>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!submitting) void submit(false);
            }}
            className="mt-3 space-y-4"
          >
            {needsClientPicker && (
              <Field label="Client">
                <Select
                  value={(selectedClient as ClientOption | null)?.ghlContactId ?? ""}
                  onValueChange={handleClientPick}
                  disabled={ghlLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        ghlLoading ? "Loading clients…" : "Select a client"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {ghlError ? (
                      <div className="px-3 py-2 text-xs text-destructive">
                        {ghlError}
                      </div>
                    ) : ghlOptions.length === 0 && !ghlLoading ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No active clients found.
                      </div>
                    ) : (
                      ghlOptions.map((c) => (
                        <SelectItem key={c.ghlContactId} value={c.ghlContactId}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            )}


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Cycle Month">
                <Input
                  value={form.cycleMonth}
                  onChange={(e) => update("cycleMonth", e.target.value)}
                  placeholder="April 2026"
                  required
                />
              </Field>

              <Field label="Client Type">
                <Select
                  value={form.clientType}
                  onValueChange={(v) => update("clientType", v)}
                >
                  <SelectTrigger>
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

              <Field label="Bookkeeper">
                <Select
                  value={form.bookkeeper}
                  onValueChange={(v) => update("bookkeeper", v)}
                >
                  <SelectTrigger>
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

              <Field label="Statement Request Status">
                <Select
                  value={form.statementRequestStatus}
                  onValueChange={(v) => update("statementRequestStatus", v)}
                >
                  <SelectTrigger>
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

              <NumField
                label="Bank Transactions Missing"
                value={form.bankTransactions}
                onChange={(n) => update("bankTransactions", n)}
              />
              <NumField
                label="Uncategorized Transactions"
                value={form.uncategorizedTransactions}
                onChange={(n) => update("uncategorizedTransactions", n)}
              />
              <NumField
                label="Transactions Without Payees"
                value={form.transactionsWithoutPayees}
                onChange={(n) => update("transactionsWithoutPayees", n)}
              />
              <NumField
                label="Undeposited Funds"
                value={form.undepositedFunds}
                onChange={(n) => update("undepositedFunds", n)}
              />
              <NumField
                label="Unapplied Payments"
                value={form.unappliedPayments}
                onChange={(n) => update("unappliedPayments", n)}
              />

              <Field label="Last Reconciled Date">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.lastReconciledDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            <Field label="Status (optional)">
              <Input
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                placeholder="e.g. On Hold, In Review…"
              />
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="break-words">{error}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !selectedClient}>
                {submitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
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
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="tabular-nums"
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
  return (
    <Field label={label}>
      <div className="inline-flex rounded-md border border-border bg-muted/20 p-0.5">
        {(["Yes", "No"] as const).map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs font-semibold rounded transition-colors",
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
