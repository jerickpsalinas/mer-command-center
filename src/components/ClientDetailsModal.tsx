import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, ShieldCheck, Banknote, Workflow, Clock, History, FileText, Plug, FileSearch, CheckCheck, BadgeCheck, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import type { ActionLogEntry, MerHistoryRow } from "@/services/googleSheets";
import ActionConfirmModal from "@/components/ActionConfirmModal";
import ActionResponseModal from "@/components/ActionResponseModal";
import SequenceStatusTable from "@/components/SequenceStatusTable";
import {
  getSequenceEvents,
  getSequenceInfoForClient,
} from "@/utils/sequenceStatus";
import {
  fireDashboardAction,
  isStatementRequestActive,
  recordSessionAction,
  type ActionType,
  type ActionPayload,
} from "@/services/dashboardActions";
import { toast } from "@/hooks/use-toast";

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

  if (!client) return null;

  const ghlContactId =
    client.ghlContactId ||
    (client.merKey?.includes("_") ? client.merKey.split("_")[0] : "");
  const currentSummary = getSequenceInfoForClient(ghlContactId, client.month, actionLog);
  const bankHistory = getSequenceEvents(ghlContactId, "bank-reconnection", actionLog);
  const statementHistory = getSequenceEvents(ghlContactId, "statement-request", actionLog);

  const clientInfo: Field[] = [
    { label: "Client Name", value: client.name },
    { label: "Client Type", value: client.clientType },
    { label: "Bookkeeper", value: client.bookkeeper },
    { label: "Status", value: client.status?.trim() ? client.status : "—" },
    { label: "Reporting Month", value: client.month },
  ];

  const compliance: Field[] = [
    {
      label: "Compliance Status",
      value: <StatusBadge status={client.complianceStatus} />,
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
          <Section icon={Clock} title="Submission Meta" fields={meta} />
        </div>

        {(() => {
          const bankActive = currentSummary.bankReconnection.status === "active";
          const stmtActive = currentSummary.statementRequest.status === "active";
          const notesApproved = currentSummary.notesApprovalCount > 0;

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
                type: "notes-approval",
                label: "✅ Notes Approved",
                cls: "bg-muted text-muted-foreground border-border",
                disabled: true,
              }
            : {
                type: "notes-approval",
                label: "✅ Approve Notes",
                cls: "bg-success/10 text-success border-success/20 hover:bg-success/15",
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
            <div className="grid grid-cols-2 gap-2 mt-4">
              {renderBtn(slot1)}
              {renderBtn(slot2)}
              {renderBtn(slot3, true)}
            </div>
          );
        })()}

        <div className="mt-4">
          <SequenceStatusTable
            summary={currentSummary}
            bankHistory={bankHistory}
            statementHistory={statementHistory}
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
            triggeredBy: "dashboard",
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
          const result = await fireDashboardAction(payload);
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
    </Dialog>
  );
}
