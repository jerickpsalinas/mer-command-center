import { useState, useEffect, Fragment } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Building2, ShieldCheck, Banknote, Workflow, Clock, History, FileText, Loader2, FilePlus2, FileEdit, Database, Tag, Check, Sparkles, Lock, CheckCircle, ExternalLink } from "lucide-react";
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
  scheduleDashboardAction,
  isUndoableAction,
  UNDO_WINDOW_MS,
  type ActionType,
  type ActionPayload,
} from "@/services/dashboardActions";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { GHL_BASE, ghlHeaders } from "@/lib/ghlConfig";
import { logActivity } from "@/lib/activityLogger";
import ClientCommentsSection from "@/components/ClientCommentsSection";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Lightweight markdown → HTML for the AI health summary. Escapes first so the
// model output can't inject markup, then applies a tiny, fixed set of rules.
function renderSummaryHtml(src: string): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  return esc(src)
    .split(/\n/)
    .map((line) => {
      const h = line.match(/^\s*#{1,6}\s+(.*)$/);
      if (h) {
        return `<div class="text-[11px] font-semibold uppercase tracking-wider text-foreground mt-2 mb-1">${inlineMd(h[1])}</div>`;
      }
      if (!line.trim()) return "";
      return `<p class="mb-1.5 last:mb-0">${inlineMd(line)}</p>`;
    })
    .join("");
}

function inlineMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
}

const usd = (n: number) =>
  `$${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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
    <section className="rounded-lg border border-border bg-muted/20 p-4 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
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
              title={typeof f.value === "string" ? f.value : undefined}
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
    </section>
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
  const [ghlTags, setGhlTags] = useState<string[]>([]);
  const [ghlTagsLoading, setGhlTagsLoading] = useState(false);
  const [comingSoon, setComingSoon] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });
  const [showSubmitReviewConfirm, setShowSubmitReviewConfirm] = useState(false);
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [showStartTaxCycle, setShowStartTaxCycle] = useState(false);
  const [selectedReturnType, setSelectedReturnType] = useState<string>("1040");
  const [taxCycleLoading, setTaxCycleLoading] = useState(false);
  const [showCompleteTaxConfirm, setShowCompleteTaxConfirm] = useState(false);
  const { isAdmin, isDeveloper, profile, user } = useAuth();
  const dashboardUser = profile?.name || user?.email || "Dashboard";
  const [categorizeLoading, setCategorizeLoading] = useState(false);
  const [categorizeOpen, setCategorizeOpen] = useState(false);
  const [catStep, setCatStep] = useState<"form" | "suggestion" | "override">("form");
  const [catDescription, setCatDescription] = useState("");
  const [catAmount, setCatAmount] = useState("");
  const [catDate, setCatDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [catNotes, setCatNotes] = useState("");
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [catAiResponse, setCatAiResponse] = useState<Record<string, unknown> | null>(null);
  const [catConfirmLoading, setCatConfirmLoading] = useState(false);
  const [catOverrideText, setCatOverrideText] = useState("");
  const [showPnl, setShowPnl] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [healthByClient, setHealthByClient] = useState<Record<string, string>>({});
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const ghlContactId =
    client?.ghlContactId ||
    (client?.merKey?.includes("_") ? client.merKey.split("_")[0] : "");


  const fetchHealthSummary = async (force = false) => {
    if (!client) return;
    const key = client.id;
    if (!force && healthByClient[key]) return;
    setHealthLoading(true);
    setHealthError(null);
    try {
      const { data, error } = await supabase.functions.invoke("health-summary", {
        body: {
          name: client.name,
          clientType: client.clientType,
          bookkeeper: client.bookkeeper,
          complianceStatus: client.complianceStatus,
          totalIncome: client.totalIncome ?? 0,
          totalExpenses: client.totalExpenses ?? 0,
          netIncome: client.netIncome ?? 0,
          lastReconciledDate: client.lastReconciledDate,
          booksClosedInQB: client.booksClosedInQB,
          bankTransactions: client.bankTransactions,
          uncategorizedTransactions: client.uncategorizedTransactions,
          unappliedPayments: client.unappliedPayments,
          completionPct: client.completionPct,
        },
      });
      if (error) throw new Error(error.message);
      const text = String((data as { text?: string })?.text ?? "").trim();
      if (!text) throw new Error("Empty summary returned.");
      setHealthByClient((prev) => ({ ...prev, [key]: text }));
    } catch (e) {
      setHealthError((e as Error).message || "Failed to generate summary.");
    } finally {
      setHealthLoading(false);
    }
  };

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

  // Fallback: read notes from Supabase mer_history if the sheet value is empty (WF8 lag)
  const [fallbackNotes, setFallbackNotes] = useState<string | null>(null);
  const [savedNotesOverride, setSavedNotesOverride] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !client) {
      setFallbackNotes(null);
      setSavedNotesOverride(null);
      return;
    }
    setSavedNotesOverride(null);
    setFallbackNotes(null);
    const key = client.merKey;
    if (!key) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("mer_history")
        .select("notes, created_at")
        .eq("mer_key", key)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setFallbackNotes(data ? String(data.notes ?? "") : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, client]);

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
            className="inline-flex h-5 items-center gap-1 text-[10px] font-semibold px-1.5 rounded border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            title="View status history"
            aria-label="View status history"
          >
            <History className="h-3 w-3" aria-hidden="true" />
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
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-border/60 text-left">
          <DialogTitle className="flex items-center gap-2 pr-8 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate min-w-0" title={client.name}>{client.name} – MER Details</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Live snapshot from the MER ledger ·{" "}
            <span className="font-semibold text-foreground">{client.month}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto min-h-0 flex-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
        <div className="space-y-3.5">
          <Section icon={Building2} title="Client Info" fields={clientInfo} />
          <Section icon={ShieldCheck} title="Compliance" fields={compliance} />
          <Section icon={Banknote} title="Bank & Books" fields={bankBooks} />
          <Section icon={Workflow} title="Workflow" fields={workflow} />

          {/* GHL Tags */}
          <section className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                GHL Tags
              </h3>
            </div>

            {/* Category Tags */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                  Category Tags
                </p>
                {ghlTagsLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-hidden="true" />}
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
                      className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
                        active
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-transparent text-muted-foreground border-border/60"
                      }`}
                      aria-label={`${t.label}: ${active ? "applied" : "not applied"}`}
                      title={active ? "Tag applied in GHL" : "Tag not applied"}
                    >
                      {active && <Check className="h-3 w-3" aria-hidden="true" />}
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
                {ghlTagsLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-hidden="true" />}
              </div>
              {(() => {
                const activeCycle = [
                  { key: "escalation-active", label: "🚨 Escalation Active" },
                  { key: "bank-reconnection-active", label: "🔌 Bank Reconnection Active" },
                  { key: "statement-request-active", label: "📄 Statement Request Active" },
                  { key: "docs-request-active", label: "📁 Docs Request Active" },
                  { key: "ready-for-pipeline", label: "🔄 Ready for Pipeline" },
                  { key: "ready-for-cleanup", label: "🔄 Ready for Cleanup" },
                ].filter((t) => tagSet.has(t.key));
                const resolved = [
                  { key: "bank-reconnected", label: "✅ Bank Reconnected" },
                  { key: "statement-received", label: "✅ Statement Received" },
                  { key: "notes-approved", label: "✅ Notes Approved" },
                ].filter((t) => tagSet.has(t.key));

                if (ghlTagsLoading) {
                  return (
                    <div className="flex flex-wrap gap-2" aria-busy="true" aria-live="polite">
                      <span className="sr-only">Loading tags…</span>
                      <Skeleton className="h-6 w-28 rounded-full" />
                      <Skeleton className="h-6 w-36 rounded-full" />
                    </div>
                  );
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
                        className="inline-flex h-6 items-center gap-1 rounded-full border bg-warning/15 text-warning border-warning/30 px-2.5 text-[11px] font-medium"
                      >
                        {t.label}
                      </span>
                    ))}
                    {resolved.map((t) => (
                      <span
                        key={t.key}
                        className="inline-flex h-6 items-center gap-1 rounded-full border bg-success/15 text-success border-success/30 px-2.5 text-[11px] font-medium"
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>

            {(() => {
              const isRegularCycle = tagSet.has("ready-for-pipeline");
              const isCleanupCycle = tagSet.has("ready-for-cleanup");
              if (!isRegularCycle && !isCleanupCycle) return null;
              const steps = isCleanupCycle
                ? [
                    { tag: "docs-received-cleanup", label: "Docs Received" },
                    { tag: "review-ready-cleanup", label: "Review Ready" },
                    { tag: "jessica-approved-cleanup", label: "Approved" },
                  ]
                : [
                    { tag: "docs-received", label: "Docs Received" },
                    { tag: "review-ready", label: "Review Ready" },
                    { tag: "jessica-approved", label: "Approved" },
                  ];
              return (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
                      Cycle Progression
                    </p>
                    <span className="text-[10px] text-muted-foreground/60">
                      ({isCleanupCycle ? "Cleanup" : "Regular"})
                    </span>
                  </div>
                  <ol className="flex items-center gap-0" aria-label="Cycle progression">
                    {steps.map((step, i) => {
                      const active = tagSet.has(step.tag);
                      return (
                        <Fragment key={step.tag}>
                          {i > 0 && (
                            <div className={`h-0.5 w-6 sm:w-10 transition-colors ${active ? "bg-success" : "bg-border"}`} aria-hidden="true" />
                          )}
                          <li className="flex flex-col items-center gap-1 min-w-0" aria-current={active ? "step" : undefined}>
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                              active
                                ? "bg-success/15 text-success border-2 border-success/40"
                                : "bg-muted text-muted-foreground/40 border-2 border-border"
                            }`}>
                              {active ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                            </div>
                            <span className={`text-[9px] font-semibold uppercase tracking-wide text-center leading-tight max-w-[72px] ${
                              active ? "text-success" : "text-muted-foreground/50"
                            }`}>
                              {step.label}
                            </span>
                          </li>
                        </Fragment>
                      );
                    })}
                  </ol>
                </div>
              );
            })()}


            {(() => {
              const canSubmitRegular =
                tagSet.has("ready-for-pipeline") &&
                tagSet.has("docs-received") &&
                !tagSet.has("review-ready");
              const canSubmitCleanup =
                tagSet.has("ready-for-cleanup") &&
                tagSet.has("docs-received-cleanup") &&
                !tagSet.has("review-ready-cleanup");
              if (!canSubmitRegular && !canSubmitCleanup) return null;
              return (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowSubmitReviewConfirm(true)}
                    disabled={submitReviewLoading}
                    aria-busy={submitReviewLoading}
                    className="w-full inline-flex h-10 items-center justify-center gap-2 text-xs font-semibold px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {submitReviewLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {submitReviewLoading ? "Submitting…" : "Submit for Jessica's Review"}
                  </button>
                </div>
              );
            })()}

            {(() => {
              const canApproveRegular =
                (isAdmin || isDeveloper) &&
                tagSet.has("review-ready") &&
                !tagSet.has("jessica-approved");
              const canApproveCleanup =
                (isAdmin || isDeveloper) &&
                tagSet.has("review-ready-cleanup") &&
                !tagSet.has("jessica-approved-cleanup");
              const canApprove = canApproveRegular || canApproveCleanup;
              if (!canApprove) return null;
              return (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowApproveConfirm(true)}
                    disabled={approveLoading}
                    aria-busy={approveLoading}
                    className="w-full inline-flex h-10 items-center justify-center gap-2 text-xs font-semibold px-3 rounded-lg bg-success text-success-foreground hover:bg-success/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {approveLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {approveLoading ? "Applying…" : "Mark as Approved"}
                  </button>
                </div>
              );
            })()}

            {(isAdmin || isDeveloper) && !tagSet.has("tax-cycle-active") && (
              <div className="mb-4">
                {!showStartTaxCycle ? (
                  <button
                    type="button"
                    onClick={() => setShowStartTaxCycle(true)}
                    disabled={taxCycleLoading}
                    className="w-full inline-flex h-10 items-center justify-center gap-2 text-xs font-semibold px-3 rounded-lg border bg-warning/10 text-warning border-warning/30 hover:bg-warning/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    🟡 Start Tax Cycle
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-lg border border-warning/30 bg-warning/5">
                    <label htmlFor="tax-return-type" className="sr-only">Return type</label>
                    <select
                      id="tax-return-type"
                      value={selectedReturnType}
                      onChange={(e) => setSelectedReturnType(e.target.value)}
                      disabled={taxCycleLoading}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {["1040", "1120S", "1120C", "1065", "990", "Sales Tax"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={taxCycleLoading}
                      onClick={async () => {
                        if (!ghlContactId) return;
                        setTaxCycleLoading(true);
                        try {
                          const r = await fetch(
                            "https://n8n.srv1482383.hstgr.cloud/webhook/tax-cycle-action",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "start",
                                ghlContactId,
                                clientName: client.name,
                                returnType: selectedReturnType,
                                submittedBy: profile?.name || user?.email,
                              }),
                            }
                          );
                          if (!r.ok) throw new Error(`HTTP ${r.status}`);
                          const refreshed = await fetchGhlTags(ghlContactId);
                          setGhlTags(refreshed);
                          sonnerToast.success(`Tax cycle started for ${client.name}`);
                          setShowStartTaxCycle(false);
                        } catch {
                          sonnerToast.error("Failed to start tax cycle", {
                            description: "Please try again.",
                          });
                        } finally {
                          setTaxCycleLoading(false);
                        }
                      }}
                      aria-busy={taxCycleLoading}
                      className="inline-flex h-9 items-center justify-center gap-1.5 text-xs font-semibold px-3 rounded-md bg-warning text-warning-foreground hover:bg-warning/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {taxCycleLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                      {taxCycleLoading ? "Starting…" : "Confirm"}
                    </button>
                    <button
                      type="button"
                      disabled={taxCycleLoading}
                      onClick={() => setShowStartTaxCycle(false)}
                      className="inline-flex h-9 items-center justify-center text-xs font-semibold px-3 rounded-md border border-border bg-transparent text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {(isAdmin || isDeveloper) && tagSet.has("tax-cycle-active") && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowCompleteTaxConfirm(true)}
                  disabled={taxCycleLoading}
                  aria-busy={taxCycleLoading}
                  className="w-full inline-flex h-10 items-center justify-center gap-2 text-xs font-semibold px-3 rounded-lg bg-success text-success-foreground hover:bg-success/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {taxCycleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                  {taxCycleLoading ? "Completing…" : "✅ Mark Tax Complete"}
                </button>
              </div>
            )}

          </section>

          <Section icon={Clock} title="Submission Meta" fields={meta} />

          {(() => {
            const noteText = savedNotesOverride !== null
              ? savedNotesOverride
              : fallbackNotes !== null
                ? fallbackNotes
                : client.notes;
            if (!noteText?.trim()) return null;
            return (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Notes
                </h3>
                <p className="text-xs text-muted-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                  {noteText}
                </p>
              </div>
            );
          })()}

          {ghlContactId && <ClientCommentsSection ghlContactId={ghlContactId} />}
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

          const docsActive = tagSet.has("docs-request-active");
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
                type="button"
                onClick={() => !slot.disabled && setPendingAction(slot.type)}
                disabled={disabled}
                aria-busy={isPending}
                className={`text-xs font-semibold px-3 min-h-9 py-2 rounded-lg border transition-colors inline-flex items-center justify-center gap-1.5 ${FOCUS_RING} ${slot.cls} ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${fullWidth ? "col-span-2" : ""}`}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
                ) : null}
                <span className="truncate">
                  {isPending ? "Sending…" : slot.label}
                </span>
              </button>
            );
          };

          return (
            <>
              <section className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <Database className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    MER Data
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setMerFormMode("update")}
                    className="text-xs font-semibold px-4 h-10 rounded-lg border bg-primary/15 text-primary border-primary/30 hover:bg-primary/25 hover:border-primary/50 hover:shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)] transition-all inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <FileEdit className="h-4 w-4" aria-hidden="true" />
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
                    className="text-xs font-semibold px-4 h-10 rounded-lg border border-primary/30 bg-transparent text-primary hover:bg-primary/10 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Categorize Transaction
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                  {(isAdmin || isDeveloper) && (
                    (client.qboConnected ?? "").toString().trim().toLowerCase() === "yes" ? (
                      <span
                        className="inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-lg border bg-success/15 text-success border-success/40 cursor-default select-none"
                        aria-label="QuickBooks Online connected"
                        title="QuickBooks Online connected"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                        QBO Connected
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const url = `https://n8n.srv1482383.hstgr.cloud/webhook/qbo-oauth-start?contact_id=${ghlContactId}&client_name=${encodeURIComponent(client.companyName || client.name)}`;
                          window.open(url, "_blank", "noopener,noreferrer");
                          sonnerToast("QuickBooks authorization opened in a new tab.", {
                            description: "Complete the login in the new window.",
                          });
                        }}
                        className="inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-lg border bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        title="Opens QuickBooks authorization in a new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        Connect QBO
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPnl((v) => !v)}
                    aria-pressed={showPnl}
                    aria-expanded={showPnl}
                    className={`inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-lg border transition-colors ${FOCUS_RING} ${
                      showPnl
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-muted/30 text-foreground border-border/50 hover:bg-muted/50"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    View P&L
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHealth((v) => {
                        const next = !v;
                        if (next) void fetchHealthSummary();
                        return next;
                      });
                    }}
                    aria-pressed={showHealth}
                    aria-expanded={showHealth}
                    className={`inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-lg border transition-colors ${FOCUS_RING} ${
                      showHealth
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-muted/30 text-foreground border-border/50 hover:bg-muted/50"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Health Summary
                  </button>
                </div>

                {showPnl && (() => {
                  const inc = client.totalIncome ?? 0;
                  const exp = client.totalExpenses ?? 0;
                  const net = client.netIncome ?? 0;
                  const qboOn = String(client.qboConnected ?? "").trim().toLowerCase() === "yes";
                  const noData = inc === 0 && exp === 0 && net === 0 && !qboOn;
                  const scale = Math.max(inc, exp, 1);
                  return (
                    <div className="mt-3 rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Profit &amp; Loss
                          </h4>
                        </div>
                        {client.reportingMonth && (
                          <span className="text-[10px] text-muted-foreground">{client.reportingMonth}</span>
                        )}
                      </div>
                      {noData ? (
                        <EmptyState icon={Database} title="No QBO data available" size="sm" variant="plain" />
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Income</span>
                              <span className="text-sm font-semibold text-foreground font-mono-data tabular-nums">{usd(inc)}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Expenses</span>
                              <span className="text-sm font-semibold text-foreground font-mono-data tabular-nums">{usd(exp)}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Net Income</span>
                              <span className={`text-sm font-semibold font-mono-data tabular-nums ${net >= 0 ? "text-success" : "text-destructive"}`}>{usd(net)}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                                <span>Income</span>
                                <span className="font-mono-data tabular-nums">{usd(inc)}</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-label="Income" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((inc / scale) * 100)}>
                                <div className="h-full bg-success rounded-full transition-[width] duration-500" style={{ width: `${(inc / scale) * 100}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                                <span>Expenses</span>
                                <span className="font-mono-data tabular-nums">{usd(exp)}</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-label="Expenses" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((exp / scale) * 100)}>
                                <div className="h-full bg-destructive rounded-full transition-[width] duration-500" style={{ width: `${(exp / scale) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {showHealth && (
                  <div className="mt-3 rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Monthly AI Health Summary
                      </h4>
                    </div>
                    {healthLoading ? (
                      <div className="space-y-2 py-1" aria-busy="true" aria-live="polite">
                        <span className="sr-only">Generating summary…</span>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-11/12" />
                        <Skeleton className="h-3 w-4/5" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ) : healthError ? (
                      <div className="py-2" role="alert">
                        <p className="text-xs text-destructive mb-2">{healthError}</p>
                        <button
                          type="button"
                          onClick={() => void fetchHealthSummary(true)}
                          className="inline-flex h-8 items-center gap-1.5 text-xs font-semibold px-3 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <div
                        className="text-xs leading-relaxed text-foreground"
                        dangerouslySetInnerHTML={{ __html: renderSummaryHtml(healthByClient[client.id] ?? "") }}
                      />
                    )}
                  </div>
                )}
              </section>

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
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 text-[11px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              Note Approved
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

        </div>

        {onViewHistory && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-6 py-3 border-t border-border/60 bg-background">
            <button
              type="button"
              onClick={onViewHistory}
              className="inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
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
          const payload: ActionPayload = {
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
          };

          // For side-effect actions (SMS/email/tag changes), give the user an
          // 8-second undo window before the webhook actually fires.
          if (isUndoableAction(pendingAction)) {
            setPendingAction(null);
            const { promise, cancel } = scheduleDashboardAction(payload);
            const toastId = sonnerToast(`${m.label} in ${UNDO_WINDOW_MS / 1000}s`, {
              description: `${client.name} — click Undo to cancel.`,
              duration: UNDO_WINDOW_MS,
              action: {
                label: "Undo",
                onClick: () => {
                  cancel();
                  sonnerToast.success("Cancelled", {
                    description: `${m.label} for ${client.name} was not sent.`,
                  });
                },
              },
            });
            const result = await promise;
            sonnerToast.dismiss(toastId);
            if (result.success) {
              recordSessionAction(client.merKey ?? "", client.month, pendingAction);
              sonnerToast.success("Action sent", {
                description:
                  result.message ||
                  `${m.label} for ${client.name} has been triggered.`,
              });
            } else if (result.errorType !== "UNDONE") {
              setResponseModal({
                open: true,
                errorType: result.errorType ?? "UNKNOWN_ERROR",
                message: result.message || "An unexpected error occurred.",
                allowOverride: !!result.allowOverride,
                overridePayload: result.overridePayload ?? null,
              });
            }
            return;
          }

          setIsLoading(true);
          const result = await fireDashboardAction(payload);
          setIsLoading(false);
          if (result.success) {
            recordSessionAction(client.merKey ?? "", client.month, pendingAction);
            sonnerToast.success("Action sent", {
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
            sonnerToast.success("Action sent", {
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
          onSaved={({ notes }) => setSavedNotesOverride(notes)}
          onClose={() => setMerFormMode(null)}
        />
      )}

      <AlertDialog
        open={showSubmitReviewConfirm}
        onOpenChange={(o) => {
          if (!submitReviewLoading) setShowSubmitReviewConfirm(o);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for Jessica's Review?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the client as ready for internal review. Jessica will be notified. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitReviewLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitReviewLoading}
              onClick={async (e) => {
                e.preventDefault();
                if (!ghlContactId) return;
                const targetTag = tagSet.has("ready-for-cleanup")
                  ? "review-ready-cleanup"
                  : "review-ready";
                setSubmitReviewLoading(true);
                try {
                  const r = await fetch(
                    `${GHL_BASE}/contacts/${ghlContactId}/tags`,
                    {
                      method: "POST",
                      headers: ghlHeaders({ "Content-Type": "application/json" }),
                      body: JSON.stringify({ tags: [targetTag] }),
                    }
                  );
                  if (!r.ok) throw new Error(`HTTP ${r.status}`);
                  const refreshed = await fetchGhlTags(ghlContactId);
                  setGhlTags(refreshed);
                  void logActivity({
                    action: "submit-for-review",
                    clientName: client.name,
                    page: "Client Modal",
                    details: `Applied tag: ${targetTag}`,
                    cycleMonth: client.month,
                  });
                  sonnerToast.success("Submitted for review");
                  setShowSubmitReviewConfirm(false);
                } catch {
                  sonnerToast.error("Submit failed", {
                    description: "Failed to submit for review. Please try again.",
                  });
                } finally {
                  setSubmitReviewLoading(false);
                }
              }}
            >
              {submitReviewLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />}
              {submitReviewLoading ? "Submitting…" : "Submit for Review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showApproveConfirm}
        onOpenChange={(o) => {
          if (!approveLoading) setShowApproveConfirm(o);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Approved?</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply the{" "}
              <span className="font-semibold text-foreground">
                {tagSet.has("ready-for-cleanup") ? "jessica-approved-cleanup" : "jessica-approved"}
              </span>{" "}
              tag for {client.name}. Jessica will be notified via automation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={approveLoading}
              onClick={async (e) => {
                e.preventDefault();
                if (!ghlContactId) return;
                const targetTag = tagSet.has("ready-for-cleanup")
                  ? "jessica-approved-cleanup"
                  : "jessica-approved";
                setApproveLoading(true);
                try {
                  const r = await fetch(
                    `${GHL_BASE}/contacts/${ghlContactId}/tags`,
                    {
                      method: "POST",
                      headers: ghlHeaders({ "Content-Type": "application/json" }),
                      body: JSON.stringify({ tags: [targetTag] }),
                    }
                  );
                  if (!r.ok) throw new Error(`HTTP ${r.status}`);
                  const refreshed = await fetchGhlTags(ghlContactId);
                  setGhlTags(refreshed);
                  void logActivity({
                    action: "mark-approved",
                    clientName: client.name,
                    page: "Client Modal",
                    details: `Applied tag: ${targetTag}`,
                    cycleMonth: client.month,
                  });
                  sonnerToast.success("Approved", { description: `${targetTag} applied to ${client.name}` });
                  setShowApproveConfirm(false);
                } catch {
                  sonnerToast.error("Failed to apply tag", {
                    description: "Please try again.",
                  });
                } finally {
                  setApproveLoading(false);
                }
              }}
            >
              {approveLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />}
              {approveLoading ? "Applying…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showCompleteTaxConfirm}
        onOpenChange={(o) => {
          if (!taxCycleLoading) setShowCompleteTaxConfirm(o);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Tax Complete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will close the active tax cycle for {client.name} and clear the tax-cycle-active tag. This action cannot be undone from the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={taxCycleLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={taxCycleLoading}
              onClick={async (e) => {
                e.preventDefault();
                if (!ghlContactId) return;
                setTaxCycleLoading(true);
                try {
                  const r = await fetch(
                    "https://n8n.srv1482383.hstgr.cloud/webhook/tax-cycle-action",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "complete",
                        ghlContactId,
                        clientName: client.name,
                        submittedBy: profile?.name || user?.email,
                      }),
                    }
                  );
                  if (!r.ok) throw new Error(`HTTP ${r.status}`);
                  const refreshed = await fetchGhlTags(ghlContactId);
                  setGhlTags(refreshed);
                  sonnerToast.success("Tax cycle marked complete");
                  setShowCompleteTaxConfirm(false);
                } catch {
                  sonnerToast.error("Failed to complete tax cycle", {
                    description: "Please try again.",
                  });
                } finally {
                  setTaxCycleLoading(false);
                }
              }}
            >
              {taxCycleLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden="true" />}
              {taxCycleLoading ? "Completing…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      <Dialog open={categorizeOpen} onOpenChange={(o) => !catSubmitting && !catConfirmLoading && setCategorizeOpen(o)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="pr-8 truncate" title={client.name}>🤖 Categorize Transaction — {client.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Describe the transaction and let AI suggest a category, then confirm or override it.
            </DialogDescription>
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
                <label htmlFor="cat-description" className="text-xs font-medium text-foreground">Transaction Description *</label>
                <input
                  id="cat-description"
                  type="text"
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="cat-amount" className="text-xs font-medium text-foreground">Amount *</label>
                  <input
                  id="cat-amount"
                    type="text"
                    value={catAmount}
                    onChange={(e) => setCatAmount(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="cat-date" className="text-xs font-medium text-foreground">Date *</label>
                  <input
                  id="cat-date"
                    type="date"
                    value={catDate}
                    onChange={(e) => setCatDate(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="cat-notes" className="text-xs font-medium text-foreground">Notes</label>
                <input
                  id="cat-notes"
                  type="text"
                  value={catNotes}
                  onChange={(e) => setCatNotes(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCategorizeOpen(false)}
                  disabled={catSubmitting}
                  className="inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-lg border border-border bg-transparent text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                      sonnerToast.error("AI suggestion failed", {
                        description: "Please try again.",
                      });
                    } finally {
                      setCatSubmitting(false);
                    }
                  }}
                  className="inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {catSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
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
                void logActivity({
                  action: "categorize-transaction",
                  clientName: client.name,
                  page: "Client Modal",
                  details: `Category: ${finalCategory} (${action === "confirm" ? "confirmed" : "overridden"})`,
                  cycleMonth: client.month,
                });
                sonnerToast.success(
                  action === "confirm"
                    ? "Category confirmed — logged successfully"
                    : "Category overridden — logged successfully",
                );
                setCategorizeOpen(false);
              } catch {
                sonnerToast.error(action === "confirm" ? "Confirm failed" : "Override failed", {
                  description: "Please try again.",
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
                  <div><span className="text-muted-foreground">Amount: </span><span className="font-mono-data tabular-nums">{catAmount}</span></div>
                  <div><span className="text-muted-foreground">Date: </span><span className="font-mono-data tabular-nums">{catDate}</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 items-center px-2.5 rounded-full border border-border bg-muted/30 text-[11px] font-semibold text-foreground" aria-label={`AI confidence: ${confLabel}`}>
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
                      className="inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-lg border border-border bg-transparent text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      ✏️ Override
                    </button>
                    <button
                      type="button"
                      disabled={catConfirmLoading}
                      onClick={() => sendConfirm("confirm", aiCategory)}
                      className="inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {catConfirmLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
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
                <label htmlFor="cat-override" className="text-xs font-medium text-foreground">Enter correct category</label>
                <input
                  id="cat-override"
                  type="text"
                  value={catOverrideText}
                  onChange={(e) => setCatOverrideText(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatStep("suggestion")}
                  disabled={catConfirmLoading}
                  className="inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-lg border border-border bg-transparent text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                      void logActivity({
                        action: "categorize-transaction",
                        clientName: client.name,
                        page: "Client Modal",
                        details: `Category: ${catOverrideText.trim()} (overridden)`,
                        cycleMonth: client.month,
                      });
                      sonnerToast.success("Category overridden — logged successfully");
                      setCategorizeOpen(false);
                    } catch {
                      sonnerToast.error("Override failed", {
                        description: "Please try again.",
                      });
                    } finally {
                      setCatConfirmLoading(false);
                    }
                  }}
                  className="inline-flex h-9 items-center gap-1.5 text-xs font-semibold px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {catConfirmLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                  Save
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={comingSoon.open} onOpenChange={(o) => setComingSoon((s) => ({ ...s, open: o }))}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-5">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 pr-8">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              {comingSoon.title}
            </DialogTitle>
            <DialogDescription>{comingSoon.message}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Dialog>

  );
}
