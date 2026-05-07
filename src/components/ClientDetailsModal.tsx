import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, ShieldCheck, Banknote, Workflow, Clock, History, FileText, Plug, FileSearch, CheckCheck, BadgeCheck, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import type { ActionLogEntry, MerHistoryRow } from "@/services/googleSheets";
import ActionConfirmModal from "@/components/ActionConfirmModal";
import ActionResponseModal from "@/components/ActionResponseModal";
import SequenceStatusTable from "@/components/SequenceStatusTable";
import {
  getCycleMonthsForContact,
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

export default function ClientDetailsModal({ open, onClose, client, onViewHistory }: Props) {
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
          const notesApproved = client.prevMonthNotesApproved;
          const stmtActive = isStatementRequestActive(
            client.merKey ?? "",
            client.month,
          );
          const actions: {
            type: ActionType;
            label: string;
            icon: typeof Plug;
            cls: string;
            disabled?: boolean;
          }[] = [
            {
              type: "bank-reconnection",
              label: "Send Bank Reconnection",
              icon: Plug,
              cls: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15",
            },
            {
              type: stmtActive ? "mark-statement-resolved" : "missing-statement",
              label: stmtActive
                ? "📄 Mark Statement Received"
                : "Request Bank Statement",
              icon: stmtActive ? CheckCheck : FileSearch,
              cls: stmtActive
                ? "bg-success/10 text-success border-success/20 hover:bg-success/15"
                : "bg-warning/10 text-warning border-warning/20 hover:bg-warning/15",
            },
            {
              type: "notes-approval",
              label: notesApproved ? "Notes Approved" : "Approve Notes",
              icon: notesApproved ? BadgeCheck : CheckCheck,
              cls: "bg-success/10 text-success border-success/20 hover:bg-success/15",
              disabled: notesApproved,
            },
            {
              type: "mark-resolved",
              label: "Mark Bank Reconnected",
              icon: CheckCheck,
              cls: "bg-success/10 text-success border-success/20 hover:bg-success/15",
            },
          ];


          return (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {actions.map((a) => {
                const isPending = isLoading && pendingAction === a.type;
                const isOtherPending =
                  isLoading && pendingAction !== null && pendingAction !== a.type;
                const disabled = a.disabled || isPending || isOtherPending;
                return (
                  <button
                    key={a.type}
                    onClick={() => setPendingAction(a.type)}
                    disabled={disabled}
                    className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors inline-flex items-center gap-1.5 ${a.cls} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : (
                      <a.icon className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">
                      {isPending ? "Sending…" : a.label}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}

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
            description: `This will start an automated SMS sequence to ${client.name} — Day 1, Day 3, and Day 5 reminders. The sequence stops when marked resolved.`,
            confirmLabel: "Start Sequence",
            variant: "destructive",
          },
          "missing-statement": {
            label: "Request Bank Statement",
            description: `This will send an automated statement request sequence to ${client.name} via SMS — Day 1, Day 3, and Day 5 follow-ups.`,
            confirmLabel: "Send Request",
            variant: "warning",
          },
          "notes-approval": {
            label: "Approve Notes",
            description: `This will approve the previous month's notes for ${client.name} and log the approval. A GHL tag will be applied and the team will be notified in Slack.`,
            confirmLabel: "Approve Notes",
            variant: "success",
          },
          "mark-resolved": {
            label: "Mark Bank Reconnected",
            description: `This will mark the bank reconnection issue as resolved for ${client.name}. The GHL sequence will be stopped and the team will be notified.`,
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
