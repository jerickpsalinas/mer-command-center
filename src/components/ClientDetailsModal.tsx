import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Building2, ShieldCheck, Banknote, Workflow, Clock, History, FileText, Loader2, FilePlus2, FileEdit, Database, Tag, Check, Sparkles, Lock } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import type { ActionLogEntry, MerHistoryRow } from "@/services/googleSheets";
import ActionConfirmModal from "@/components/ActionConfirmModal";
import ActionResponseModal from "@/components/ActionResponseModal";
import SequenceStatusTable from "@/components/SequenceStatusTable";
import StatusHistoryModal from "@/components/StatusHistoryModal";
import MerFormModal from "@/components/MerFormModal";
import {
  getSequenceEvents,
  getSequenceInfoForClient,
} from "@/utils/sequenceStatus";
import {
  fireDashboardAction,
  recordSessionAction,
  isDocsRequestActive,
  type ActionType,
  type ActionPayload,
} from "@/services/dashboardActions";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { GHL_BASE, ghlHeaders } from "@/lib/ghlConfig";

interface Props {
  open: boolean;
  onClose: () => void;
  client: MerHistoryRow | null;
  onViewHistory?: () => void;
  actionLog?: ActionLogEntry[];
}

type Field = {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
};

function Section({
  icon: Icon,
  title,
  fields,
}: {
  icon: typeof Building2;
  title: string;
  fields: Field[];
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {title}
        </span>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {fields.map((f, i) => (
          <div key={i} className="flex flex-col gap-0.5 min-w-0">
            <dt className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
              {f.label}
            </dt>
            <dd
              className={`text-xs text-foreground break-words ${
                f.mono ? "font-mono-data tabular-nums" : ""
              }`}
            >
              {f.value === "" || f.value === null || f.value === undefined ? (
                <span className="text-muted-foreground/60">—</span>
              ) : (
                f.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const yn = (b: boolean) => (
  <span className={b ? "text-success font-semibold" : "text-destructive font-semibold"}>
    {b ? "Yes" : "No"}
  </span>
);

export default function ClientDetailsModal({ open, onClose, client, onViewHistory, actionLog = [] }: Props) {
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSequenceHistory, setShowSequenceHistory] = useState(false);
  const [showStatusHistory, setShowStatusHistory] = useState(false);
  const [merFormMode, setMerFormMode] = useState<"add" | "update" | null>(null);
  const [responseModal, setResponseModal] = useState<{
    open: boolean;
    errorType: string | null;
    message: string;
    allowOverride: boolean;
    overridePayload: ActionPayload | null;
  }>({
    open: false,
    errorType: null,
    message: "",
    allowOverride: false,
    overridePayload: null,
  });
  const [isOverrideLoading, setIsOverrideLoading] = useState(false);
  const [showClearCycleConfirm, setShowClearCycleConfirm] = useState(false);
  const [ghlTags, setGhlTags] = useState<string[]>([]);
  const [ghlTagsLoading, setGhlTagsLoading] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editCategorySelection, setEditCategorySelection] = useState<Record<string, boolean>>({});
  const [editCategorySaving, setEditCategorySaving] = useState(false);
  const [clearCycleLoading, setClearCycleLoading] = useState(false);
  const { isAdmin, profile, user } = useAuth();
  const dashboardUser = profile?.name || user?.email || "Dashboard";
  const [categorizeLoading, setCategorizeLoading] = useState(false);
  const [categorizeOpen, setCategorizeOpen] = useState(false);
  const [catStep, setCatStep] = useState<"form" | "suggestion" | "override">("form");
  const [catDescription, setCatDescription] = useState("");
  const [catAmount, setCatAmount] = useState("");
  const [catDate, setCatDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [catNotes, setCatNotes] = useState("");
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [catAiResponse, setCatAiResponse] = useState<any>(null);
  const [catConfirmLoading, setCatConfirmLoading] = useState(false);
  const [catOverrideText, setCatOverrideText] = useState("");
  const [comingSoon, setComingSoon] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const ghlContactId =
    client?.ghlContactId ||
    (client?.merKey?.includes("_") ? client.merKey.split("_")[0] : "");


  const fetchGhlTags = async (contactId: string): Promise<string[]> => {
    const r = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
      headers: ghlHeaders(),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const raw = data?.contact?.tags ?? data?.tags ?? [];
    return Array.isArray(raw)
      ? raw.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean)
      : [];
  };

  useEffect(() => {
    if (!open || !ghlContactId) {
      setGhlTags([]);
      return;
    }
    let cancelled = false;
    setGhlTagsLoading(true);
    fetchGhlTags(ghlContactId)
      .then((tags) => {
        if (!cancelled) setGhlTags(tags);
      })
      .catch(() => {
        if (!cancelled) setGhlTags([]);
      })
      .finally(() => {
        if (!cancelled) setGhlTagsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, ghlContactId]);

  if (!client) return null;

  const tagSet = new Set(ghlTags);
  const currentSummary = getSequenceInfoForClient(ghlContactId, client.month, actionLog);
  const bankHistory = getSequenceEvents(ghlContactId, "bank-reconnection", actionLog);
  const statementHistory = getSequenceEvents(ghlContactId, "statement-request", actionLog);
  const docsHistory = getSequenceEvents(ghlContactId, "docs-request", actionLog);

  const clientInfo: Field[] = [
    { label: "Client Name", value: client.name },
    { label: "Client Type", value: client.clientType },
    { label: "Bookkeeper", value: client.bookkeeper },
    {
      label: "Status",
      value: (
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          <span>{client.status?.trim() ? client.status : "—"}</span>
          <button
            type="button"
            onClick={() => setShowStatusHistory(true)}
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
            title="View status history"
          >
            <History className="h-3 w-3" />
            History
          </button>
        </span>
      ),
    },
    { label: "Reporting Month", value: client.month },
  ];

  const compliance: Field[] = [
    {
      label: "Compliance Status",
      value: <StatusBadge status={client.complianceStatus} client={client} />,
    },
    { label: "Completion %", value: `${client.completionPct}%`, mono: true },
    { label: "Statement Request Status", value: client.statementRequestStatus },
    { label: "Bank Transactions", value: client.bankTransactions },
  ];

  const bankBooks: Field[] = [
    { label: "Uncategorized Transactions", value: client.uncategorizedTransactions, mono: true },
    { label: "Transactions Without Payees", value: client.transactionsWithoutPayees, mono: true },
    { label: "Undeposited Funds", value: client.undepositedFunds, mono: true },
    { label: "Unapplied Payments", value: client.unappliedPayments, mono: true },
    { label: "Last Reconciled Date", value: client.lastReconciledDate, mono: true },
    { label: "Books Closed In QB", value: yn(client.booksClosedInQB) },
  ];

  const workflow: Field[] = [
    { label: "Prev Month Notes Approved", value: yn(client.prevMonthNotesApproved) },
    { label: "Financials Sent To Client", value: yn(client.financialsSentToClient) },
  ];

  const meta: Field[] = [
    { label: "Submitted By", value: client.submittedBy },
    { label: "Submission Timestamp", value: client.timestamp, mono: true },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] sm:w-auto max-h-[88vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{client.name} – MER Details</span>
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Live snapshot from the MER ledger ·{" "}
            <span className="font-semibold text-foreground">{client.month}</span>
          </p>
        </DialogHeader>

        <div className="space-y-3.5 mt-2">
          <Section icon={Building2} title="Client Info" fields={clientInfo} />
          <Section icon={ShieldCheck} title="Compliance" fields={compliance} />
          <Section icon={Banknote} title="Bank & Books" fields={bankBooks} />
          <Section icon={Workflow} title="Workflow" fields={workflow} />

          {/* GHL Tags */}
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                GHL Tags
              </span>
            </div>

            {/* Category Tags */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                  Category Tags
                </p>
                {ghlTagsLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: "mer-workflow", label: "MER Workflow" },
                    { key: "ap-expense", label: "AP — Expense" },
                    { key: "ap-payroll", label: "AP — Payroll" },
                    { key: "ar-education", label: "AR — Education" },
                    { key: "ar-nonprofits", label: "AR — Nonprofits" },
                  ] as { key: string; label: string }[]
                ).map((t) => {
                  const active = tagSet.has(t.key);
                  return (
                    <span
                      key={t.key}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-transparent text-muted-foreground border-border/60"
                      }`}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {t.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Cycle Tags */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                  Active Cycle Tags
                </p>
                <span className="text-[10px] text-muted-foreground/60">
                  (read-only — managed by automation)
                </span>
                {ghlTagsLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              {(() => {
                const activeCycle = [
                  { key: "escalation-active", label: "🚨 Escalation Active" },
                  { key: "bank-reconnection-active", label: "🔌 Bank Reconnection Active" },
                  { key: "statement-request-active", label: "📄 Statement Request Active" },
                  { key: "docs-request-active", label: "📁 Docs Request Active" },
                  { key: "ready-for-pipeline", label: "🔄 Ready for Pipeline" },
                ].filter((t) => tagSet.has(t.key));
                const resolved = [
                  { key: "bank-reconnected", label: "✅ Bank Reconnected" },
                  { key: "statement-received", label: "✅ Statement Received" },
                  { key: "notes-approved", label: "✅ Notes Approved" },
                ].filter((t) => tagSet.has(t.key));

                if (ghlTagsLoading) {
                  return <p className="text-xs text-muted-foreground/60">Loading…</p>;
                }
                if (ghlTags.length === 0) {
                  return <p className="text-xs text-muted-foreground/60">Could not load tags.</p>;
                }
                if (activeCycle.length === 0 && resolved.length === 0) {
                  return <p className="text-xs text-muted-foreground/60">No active cycle tags.</p>;
                }
                return (
                  <div className="flex flex-wrap gap-2">
                    {activeCycle.map((t) => (
                      <span
                        key={t.key}
                        className="inline-flex items-center gap-1 rounded-full border bg-warning/15 text-warning border-warning/30 px-2.5 py-1 text-[11px] font-medium"
                      >
                        {t.label}
                      </span>
                    ))}
                    {resolved.map((t) => (
                      <span
                        key={t.key}
                        className="inline-flex items-center gap-1 rounded-full border bg-success/15 text-success border-success/30 px-2.5 py-1 text-[11px] font-medium"
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>


            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  const initial: Record<string, boolean> = {};
                  ["mer-workflow", "ap-expense", "ap-payroll", "ar-education", "ar-nonprofits"].forEach(
                    (k) => {
                      initial[k] = tagSet.has(k);
                    }
                  );
                  setEditCategorySelection(initial);
                  setEditCategoryOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-primary/30 bg-transparent text-primary hover:bg-primary/10 transition-colors"
              >
                ✏️ Update Category Tags
              </button>
              {isAdmin && tagSet.has("active-client") && (
                <button
                  type="button"
                  onClick={() => setShowClearCycleConfirm(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10 transition-colors"
                >
                  🗑️ Clear Cycle Tags
                </button>
              )}
            </div>
          </div>

          <Section icon={Clock} title="Submission Meta" fields={meta} />
        </div>

        {(() => {
          const bankActive = currentSummary.bankReconnection.status === "active";
          const stmtActive = currentSummary.statementRequest.status === "active";
          const notesApproved = client.prevMonthNotesApproved === true;

          const slot1: { type: ActionType; label: string; cls: string } = bankActive
            ? {
                type: "mark-resolved",
                label: "✅ Mark Bank Reconnected",
                cls: "bg-success/10 text-success border-success/20 hover:bg-success/15",
              }
            : {
                type: "bank-reconnection",
                label: "🔌 Send Bank Reconnection",
                cls: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15",
              };

          const slot2: { type: ActionType; label: string; cls: string } = stmtActive
            ? {
                type: "mark-statement-resolved",
                label: "📄 Mark Statement Received",
                cls: "bg-success/10 text-success border-success/20 hover:bg-success/15",
              }
            : {
                type: "missing-statement",
                label: "📄 Request Bank Statement",
                cls: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/15",
              };

          const slot3: {
            type: ActionType;
            label: string;
            cls: string;
            disabled?: boolean;
          } = notesApproved
            ? {
                type: "undo-notes-approval",
                label: "↩️ Undo Notes Approval",
                cls: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/15",
              }
            : {
                type: "notes-approval",
                label: "✅ Approve Notes",
                cls: "bg-success/10 text-success border-success/20 hover:bg-success/15",
              };

          const docsActive = isDocsRequestActive(client.merKey ?? "", client.month);
          const slot4: { type: ActionType; label: string; cls: string } = docsActive
            ? {
                type: "mark-docs-received",
                label: "✅ Mark Docs Received",
                cls: "bg-success/10 text-success border-success/20 hover:bg-success/15",
              }
            : {
                type: "docs-request",
                label: "📁 Request Documents",
                cls: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15",
              };

          const renderBtn = (
            slot: { type: ActionType; label: string; cls: string; disabled?: boolean },
            fullWidth = false,
          ) => {
            const isPending = isLoading && pendingAction === slot.type;
            const isOtherPending =
              isLoading && pendingAction !== null && pendingAction !== slot.type;
            const disabled = !!slot.disabled || isPending || isOtherPending;
            return (
              <button
                key={`${slot.type}-${fullWidth ? "full" : "half"}`}
                onClick={() => !slot.disabled && setPendingAction(slot.type)}
                disabled={disabled}
                className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors inline-flex items-center justify-center gap-1.5 ${slot.cls} ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${fullWidth ? "col-span-2" : ""}`}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : null}
                <span className="truncate">
                  {isPending ? "Sending…" : slot.label}
                </span>
              </button>
            );
          };

          return (
            <>
              <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                    MER Data
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setMerFormMode("update")}
                    className="text-xs font-semibold px-4 py-2.5 rounded-lg border bg-primary/15 text-primary border-primary/30 hover:bg-primary/25 hover:border-primary/50 hover:shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)] transition-all inline-flex items-center justify-center gap-2"
                  >
                    <FileEdit className="h-4 w-4" />
                    Update MER
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCatStep("form");
                      setCatDescription("");
                      setCatAmount("");
                      setCatDate(new Date().toISOString().slice(0, 10));
                      setCatNotes("");
                      setCatAiResponse(null);
                      setCatOverrideText("");
                      setCategorizeOpen(true);
                    }}
                    className="text-xs font-semibold px-4 py-2.5 rounded-lg border border-primary/30 bg-transparent text-primary hover:bg-primary/10 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4" />
                    Categorize Transaction
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => setComingSoon({ open: true, title: "Connect QuickBooks Online — Coming Soon", message: "QuickBooks Online integration is currently pending approval from Intuit. Once resolved, this button will let you connect this client's QBO account directly from the dashboard. We'll notify the team when it's ready." })}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50 transition-colors opacity-80 hover:opacity-100"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Connect QBO
                  </button>
                  <button
                    type="button"
                    onClick={() => setComingSoon({ open: true, title: "P&L & Balance Sheet — Coming Soon", message: "This feature will display the client's Profit & Loss Statement and Balance Sheet pulled directly from QuickBooks Online. It requires the QBO integration to be active first." })}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50 transition-colors opacity-80 hover:opacity-100"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    View P&L
                  </button>
                  <button
                    type="button"
                    onClick={() => setComingSoon({ open: true, title: "Monthly AI Health Summary — Coming Soon", message: "This feature will generate an AI-powered plain-English health summary for this client at the end of each month, based on their QuickBooks data. It requires the QBO integration to be active first." })}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50 transition-colors opacity-80 hover:opacity-100"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Health Summary
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {renderBtn(slot1)}
                {renderBtn(slot2)}
                {renderBtn(slot3)}
                {renderBtn(slot4)}
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 flex justify-end">
                {renderBtn(
                  {
                    type: "clear-mer-data",
                    label: "🗑️ Clear MER Data",
                    cls: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20",
                  },
                )}
              </div>
            </>
          );
        })()}

        {client.prevMonthNotesApproved === true && (
          <div className="mt-4 flex justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
              ✅ Note Approved
            </span>
          </div>
        )}

        <div className="mt-4">
          <SequenceStatusTable
            summary={currentSummary}
            bankHistory={bankHistory}
            statementHistory={statementHistory}
            docsHistory={docsHistory}
            notesApprovalCount={currentSummary.notesApprovalCount}
            showHistory={showSequenceHistory}
            onToggleHistory={() => setShowSequenceHistory((prev) => !prev)}
          />
        </div>

        {onViewHistory && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/60 mt-2">
            <button
              onClick={onViewHistory}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              View monthly history
            </button>
          </div>
        )}
      </DialogContent>

      {(() => {
        if (!pendingAction) return null;
        const meta: Record<
          ActionType,
          {
            label: string;
            description: string;
            confirmLabel: string;
            variant: "destructive" | "warning" | "success" | "primary";
          }
        > = {
          "bank-reconnection": {
            label: "Send Bank Reconnection",
            description: `This will start an automated email sequence to ${client.name} — Day 1, Day 3, and Day 5 reminders.`,
            confirmLabel: "Start Sequence",
            variant: "destructive",
          },
          "missing-statement": {
            label: "Request Bank Statement",
            description: `This will send an automated statement request sequence to ${client.name} — Day 1, Day 3, and Day 5 follow-ups.`,
            confirmLabel: "Send Request",
            variant: "warning",
          },
          "notes-approval": {
            label: "Approve Notes",
            description: `This will approve the previous month's notes for ${client.name} and notify the team.`,
            confirmLabel: "Approve Notes",
            variant: "success",
          },
          "undo-notes-approval": {
            label: "Undo Notes Approval",
            description: `This will undo the notes approval for ${client.name}, update the sheet back to No, remove the GHL tag, and notify the team.`,
            confirmLabel: "Undo Approval",
            variant: "warning",
          },
          "mark-resolved": {
            label: "Mark Bank Reconnected",
            description: `This will stop the bank reconnection sequence for ${client.name} and mark it as resolved.`,
            confirmLabel: "Mark Resolved",
            variant: "success",
          },
          "mark-statement-resolved": {
            label: "Mark Statement Received",
            description: `This will stop the statement request sequence for ${client.name} and mark the statement as received.`,
            confirmLabel: "Mark Received",
            variant: "success",
          },
          "docs-request": {
            label: "Request Documents",
            description: `This will start an automated document request sequence to ${client.name} — Day 1 and Day 4 follow-ups.`,
            confirmLabel: "Send Request",
            variant: "primary",
          },
          "mark-docs-received": {
            label: "Mark Docs Received",
            description: `This will stop the document request sequence for ${client.name} and mark documents as received.`,
            confirmLabel: "Mark Received",
            variant: "success",
          },
          "clear-mer-data": {
            label: "Clear MER Data",
            description: `This will permanently remove ${client.name} from the MER Dashboard. They will reappear when a new MER is submitted via /add. Are you sure?`,
            confirmLabel: "Clear MER Data",
            variant: "destructive",
          },
        };
        const m = meta[pendingAction];
        const handleConfirm = async () => {
          setResponseModal({
            open: false,
            errorType: null,
            message: "",
            allowOverride: false,
            overridePayload: null,
          });
          setIsLoading(true);
          const result = await fireDashboardAction({
            action: pendingAction,
            clientName: client.name,
            bookkeeper: client.bookkeeper,
            merKey: client.merKey ?? "",
            ghlContactId:
              client.ghlContactId ??
              (client.merKey?.includes("_")
                ? client.merKey.split("_")[0]
                : ""),
            cycleMonth: client.month,
            triggeredBy: dashboardUser || "Dashboard",
          });
          setIsLoading(false);
          if (result.success) {
            recordSessionAction(client.merKey ?? "", client.month, pendingAction);
            toast({
              title: "Action sent ✓",
              description:
                result.message ||
                `${m.label} for ${client.name} has been triggered.`,
            });
            setPendingAction(null);
          } else {
            setPendingAction(null);
            setResponseModal({
              open: true,
              errorType: result.errorType ?? "UNKNOWN_ERROR",
              message: result.message || "An unexpected error occurred.",
              allowOverride: !!result.allowOverride,
              overridePayload: result.overridePayload ?? null,
            });
          }
        };
        return (
          <ActionConfirmModal
            open={true}
            onClose={() => {
              setPendingAction(null);
              setResponseModal({
                open: false,
                errorType: null,
                message: "",
                allowOverride: false,
                overridePayload: null,
              });
            }}
            onConfirm={handleConfirm}
            actionLabel={m.label}
            clientName={client.name}
            description={m.description}
            confirmLabel={m.confirmLabel}
            isLoading={isLoading}
            variant={m.variant}
          />
        );
      })()}

      <ActionResponseModal
        open={responseModal.open}
        onClose={() =>
          setResponseModal((s) => ({ ...s, open: false }))
        }
        onConfirmOverride={async (payload) => {
          setIsOverrideLoading(true);
          const result = await fireDashboardAction({ ...payload, triggeredBy: dashboardUser || payload.triggeredBy || "Dashboard" });
          setIsOverrideLoading(false);
          if (result.success) {
            recordSessionAction(payload.merKey, payload.cycleMonth, payload.action);
            setResponseModal((s) => ({ ...s, open: false }));
            toast({
              title: "Action sent ✓",
              description:
                result.message ||
                `Action for ${payload.clientName} has been triggered.`,
            });
          } else {
            setResponseModal({
              open: true,
              errorType: result.errorType ?? "UNKNOWN_ERROR",
              message: result.message || "An unexpected error occurred.",
              allowOverride: !!result.allowOverride,
              overridePayload: result.overridePayload ?? null,
            });
          }
        }}
        errorType={responseModal.errorType}
        message={responseModal.message}
        allowOverride={responseModal.allowOverride}
        overridePayload={responseModal.overridePayload}
        isLoading={isOverrideLoading}
      />

      <StatusHistoryModal
        open={showStatusHistory}
        onClose={() => setShowStatusHistory(false)}
        ghlContactId={ghlContactId}
        clientName={client.name}
      />

      {merFormMode && (
        <MerFormModal
          open={true}
          mode={merFormMode}
          client={client}
          onClose={() => setMerFormMode(null)}
        />
      )}

      <ActionConfirmModal
        open={showClearCycleConfirm}
        onClose={() => {
          if (clearCycleLoading) return;
          setShowClearCycleConfirm(false);
        }}
        onConfirm={async () => {
          if (!ghlContactId) {
            setShowClearCycleConfirm(false);
            return;
          }
          const protectedTags = ['active-client', 'ready-for-cleanup', 'mer-workflow', 'ap-expense', 'ap-payroll', 'ar-education', 'ar-nonprofits'];
          const tagsToRemove = ghlTags.filter((tag) => !protectedTags.includes(tag));
          if (tagsToRemove.length === 0) {
            toast({
              title: "No cycle tags",
              description: "No cycle tags to clear",
            });
            setShowClearCycleConfirm(false);
            return;
          }
          setClearCycleLoading(true);
          try {
            const r = await fetch(
              `${GHL_BASE}/contacts/${ghlContactId}/tags`,
              {
                method: "DELETE",
                headers: ghlHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ tags: tagsToRemove }),
              }
            );
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const refreshed = await fetchGhlTags(ghlContactId);
            setGhlTags(refreshed);
            toast({
              title: "Cycle tags cleared",
              description: `Cycle tags cleared for ${client.name}`,
            });
            setShowClearCycleConfirm(false);
          } catch {
            toast({
              title: "Clear failed",
              description: "Failed to clear tags. Please try again.",
              variant: "destructive",
            });
          } finally {
            setClearCycleLoading(false);
          }
        }}
        actionLabel="Clear Cycle Tags"
        clientName={client.name}
        description={`This will remove all active cycle tags from ${client.name}. Category tags and active-client tag will be preserved. Are you sure?`}
        confirmLabel="Confirm"
        isLoading={clearCycleLoading}
        variant="destructive"
      />

      <Dialog open={editCategoryOpen} onOpenChange={(o) => !editCategorySaving && setEditCategoryOpen(o)}>
        <DialogContent className="max-w-md w-[calc(100vw-1rem)] sm:w-auto p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Tag className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">Update Category Tags — {client.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-3">
            {(
              [
                { key: "mer-workflow", label: "MER Workflow" },
                { key: "ap-expense", label: "AP — Expense" },
                { key: "ap-payroll", label: "AP — Payroll" },
                { key: "ar-education", label: "AR — Education" },
                { key: "ar-nonprofits", label: "AR — Nonprofits" },
              ] as { key: string; label: string }[]
            ).map((t) => (
              <label
                key={t.key}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-border/60 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!!editCategorySelection[t.key]}
                  disabled={editCategorySaving}
                  onChange={(e) =>
                    setEditCategorySelection((prev) => ({ ...prev, [t.key]: e.target.checked }))
                  }
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm text-foreground">{t.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setEditCategoryOpen(false)}
              disabled={editCategorySaving}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-transparent text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={editCategorySaving || !ghlContactId}
              onClick={async () => {
                if (!ghlContactId) return;
                const keys = ["mer-workflow", "ap-expense", "ap-payroll", "ar-education", "ar-nonprofits"];
                const toAdd = keys.filter((k) => editCategorySelection[k]);
                const toRemove = keys.filter((k) => !editCategorySelection[k]);
                setEditCategorySaving(true);
                try {
                  const calls: Promise<Response>[] = [];
                  if (toAdd.length) {
                    calls.push(
                      fetch(`${GHL_BASE}/contacts/${ghlContactId}/tags`, {
                        method: "POST",
                        headers: ghlHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify({ tags: toAdd }),
                      })
                    );
                  }
                  if (toRemove.length) {
                    calls.push(
                      fetch(`${GHL_BASE}/contacts/${ghlContactId}/tags`, {
                        method: "DELETE",
                        headers: ghlHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify({ tags: toRemove }),
                      })
                    );
                  }
                  const results = await Promise.all(calls);
                  if (results.some((r) => !r.ok)) throw new Error("GHL update failed");

                  const refreshed = await fetchGhlTags(ghlContactId);
                  setGhlTags(refreshed);
                  toast({
                    title: "Category tags updated",
                    description: `Category tags updated for ${client.name}`,
                  });
                  setEditCategoryOpen(false);
                } catch {
                  toast({
                    title: "Update failed",
                    description: "Failed to update tags. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setEditCategorySaving(false);
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {editCategorySaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editCategorySaving ? "Saving…" : "Save"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={categorizeOpen} onOpenChange={(o) => !catSubmitting && !catConfirmLoading && setCategorizeOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>🤖 Categorize Transaction — {client.name}</DialogTitle>
          </DialogHeader>

          {catStep === "form" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground uppercase tracking-wide text-[10.5px]">Client</div>
                  <div className="text-foreground">{client.name}</div>
                </div>
                <div>
                  <div className="text-muted-foreground uppercase tracking-wide text-[10.5px]">Month</div>
                  <div className="text-foreground">{client.month}</div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Transaction Description *</label>
                <input
                  type="text"
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Amount *</label>
                  <input
                    type="text"
                    value={catAmount}
                    onChange={(e) => setCatAmount(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Date *</label>
                  <input
                    type="date"
                    value={catDate}
                    onChange={(e) => setCatDate(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Notes</label>
                <input
                  type="text"
                  value={catNotes}
                  onChange={(e) => setCatNotes(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCategorizeOpen(false)}
                  disabled={catSubmitting}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-transparent text-foreground hover:bg-muted/40 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={catSubmitting || !catDescription.trim() || !catAmount.trim() || !catDate}
                  onClick={async () => {
                    setCatSubmitting(true);
                    try {
                      const res = await fetch(
                        "https://n8n.srv1482383.hstgr.cloud/webhook/wf10-dashboard-categorize",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            clientName: client.name,
                            ghlContactId,
                            cycleMonth: client.month,
                            submittedBy: client.bookkeeper,
                            description: catDescription,
                            amount: catAmount,
                            date: catDate,
                            notes: catNotes,
                          }),
                        }
                      );
                      if (!res.ok) throw new Error(`HTTP ${res.status}`);
                      const data = await res.json().catch(() => ({}));
                      const payload = Array.isArray(data) ? data[0] : data;
                      setCatAiResponse(payload ?? {});
                      setCatStep("suggestion");
                    } catch {
                      toast({
                        title: "AI suggestion failed",
                        description: "Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setCatSubmitting(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {catSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {catSubmitting ? "Getting suggestion…" : "Get AI Suggestion"}
                </button>
              </div>
            </div>
          )}

          {catStep === "suggestion" && catAiResponse && (() => {
            const aiCategory =
              catAiResponse.suggestedCategory ||
              catAiResponse.category ||
              catAiResponse.aiSuggestedCategory ||
              "—";
            const confidenceRaw = (catAiResponse.confidence || "").toString().toLowerCase();
            const confLabel =
              confidenceRaw.includes("high") ? "🟢 High" :
              confidenceRaw.includes("med") ? "🟡 Medium" :
              confidenceRaw.includes("low") ? "🔴 Low" :
              confidenceRaw ? `⚪ ${catAiResponse.confidence}` : "—";
            const reasoning = catAiResponse.reasoning || catAiResponse.explanation || "";

            const sendConfirm = async (action: "confirm" | "override", finalCategory: string) => {
              setCatConfirmLoading(true);
              try {
                const res = await fetch(
                  "https://n8n.srv1482383.hstgr.cloud/webhook/wf10-dashboard-confirm",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      ...catAiResponse,
                      clientName: client.name,
                      ghlContactId,
                      cycleMonth: client.month,
                      submittedBy: client.bookkeeper,
                      description: catDescription,
                      amount: catAmount,
                      date: catDate,
                      notes: catNotes,
                      finalCategory,
                      action,
                    }),
                  }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                toast({
                  title: action === "confirm"
                    ? "Category confirmed — logged successfully"
                    : "Category overridden — logged successfully",
                });
                setCategorizeOpen(false);
              } catch {
                toast({
                  title: action === "confirm" ? "Confirm failed" : "Override failed",
                  description: "Please try again.",
                  variant: "destructive",
                });
              } finally {
                setCatConfirmLoading(false);
              }
            };

            return (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-foreground">🤖 AI Category Suggestion</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Client: </span>{client.name}</div>
                  <div><span className="text-muted-foreground">Month: </span>{client.month}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Transaction: </span>{catDescription}</div>
                  <div><span className="text-muted-foreground">Amount: </span>{catAmount}</div>
                  <div><span className="text-muted-foreground">Date: </span>{catDate}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border bg-muted/30 text-[11px] font-semibold">
                    {confLabel}
                  </span>
                </div>
                <div>
                  <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Suggested Category</div>
                  <div className="text-sm font-bold text-foreground">{aiCategory}</div>
                </div>
                {reasoning && (
                  <div className="text-[11px] text-muted-foreground leading-relaxed">{reasoning}</div>
                )}

                {catStep === "suggestion" && (
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={catConfirmLoading}
                      onClick={() => {
                        setCatOverrideText("");
                        setCatStep("override");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-transparent text-foreground hover:bg-muted/40 disabled:opacity-50"
                    >
                      ✏️ Override
                    </button>
                    <button
                      type="button"
                      disabled={catConfirmLoading}
                      onClick={() => sendConfirm("confirm", aiCategory)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {catConfirmLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      ✅ Confirm
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {catStep === "override" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Enter correct category</label>
                <input
                  type="text"
                  value={catOverrideText}
                  onChange={(e) => setCatOverrideText(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatStep("suggestion")}
                  disabled={catConfirmLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-transparent text-foreground hover:bg-muted/40 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={catConfirmLoading || !catOverrideText.trim()}
                  onClick={async () => {
                    setCatConfirmLoading(true);
                    try {
                      const res = await fetch(
                        "https://n8n.srv1482383.hstgr.cloud/webhook/wf10-dashboard-confirm",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            ...(catAiResponse || {}),
                            clientName: client.name,
                            ghlContactId,
                            cycleMonth: client.month,
                            submittedBy: client.bookkeeper,
                            description: catDescription,
                            amount: catAmount,
                            date: catDate,
                            notes: catNotes,
                            finalCategory: catOverrideText.trim(),
                            action: "override",
                          }),
                        }
                      );
                      if (!res.ok) throw new Error(`HTTP ${res.status}`);
                      toast({ title: "Category overridden — logged successfully" });
                      setCategorizeOpen(false);
                    } catch {
                      toast({
                        title: "Override failed",
                        description: "Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setCatConfirmLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {catConfirmLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={comingSoon.open} onOpenChange={(o) => setComingSoon((s) => ({ ...s, open: o }))}>
        <DialogContent className="max-w-md w-[calc(100vw-1rem)] sm:w-auto p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              {comingSoon.title}
            </DialogTitle>
            <DialogDescription>{comingSoon.message}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Dialog>

  );
}
