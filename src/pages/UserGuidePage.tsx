import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileText, ChevronRight, X, Download } from "lucide-react";

interface GuideSection {
  heading: string;
  body: string[];
}

interface Guide {
  id: string;
  title: string;
  description: string;
  sections: GuideSection[];
}

const guides: Guide[] = [
  {
    id: "monthly-mer-cycle",
    title: "Monthly MER Cycle",
    description:
      "End-to-end Monthly Engagement Review process — from cycle kickoff through statement collection, reconciliation, internal review, and client delivery.",
    sections: [
      {
        heading: "1. Cycle Kickoff (Day 1–2)",
        body: [
          "On the first business day of the month, the Master Bookkeeping Cycle page auto-creates a new cycle entry for every active Greenfield client.",
          "Each contact moves into Stage 1 — Documents Requested — and the system triggers the standard request sequence (email + SMS).",
          "Bookkeepers verify the client roster in the Clients tab and flag any onboarding/offboarding changes before proceeding.",
        ],
      },
      {
        heading: "2. Statement Collection (Day 3–10)",
        body: [
          "Watch the Statement Chase Queue on the Compliance Health page. Any client marked 'Not Received' after 7 days auto-escalates to the Assistant.",
          "Use the 'Statement Request' button inside the Client Details modal to fire a one-off reminder when needed.",
          "Once statements are uploaded, mark the cycle stage as 'Documents Received' to advance the workflow.",
        ],
      },
      {
        heading: "3. Reconciliation & Categorization (Day 8–18)",
        body: [
          "Open each client in QBO, reconcile all bank/credit feeds, and resolve uncategorized transactions before the 18th.",
          "The Categorization Drift pillar on Compliance Health tracks remaining cleanup work in real time.",
          "Set 'Last Reconciled Date' in the MER form when a client closes out — this drives the Bank Feed Integrity pillar.",
        ],
      },
      {
        heading: "4. Internal Review & Delivery (Day 18–25)",
        body: [
          "Bookkeepers submit the MER form, which moves the cycle to Stage 7 — Internal Review.",
          "Managers approve notes, sign off on financials, and close books in QBO. The Workflow Adherence pillar enforces correct order.",
          "Use the 'Send Financials' button to deliver to the client and advance to Stage 8 — Complete.",
        ],
      },
    ],
  },
  {
    id: "compliance-health-pillars",
    title: "Compliance Health Pillars",
    description:
      "How the four health pillars — Bank Feed, Categorization, Statements, and Workflow — are calculated and how to act on a falling score.",
    sections: [
      {
        heading: "Pillar I — Bank Feed Integrity",
        body: [
          "Fails when 'Bank Transactions' is missing/empty OR Last Reconciled Date is blank.",
          "Drop in score usually signals a broken Plaid/QBO feed. Open the client and use the Bank Reconnection action to trigger the re-auth sequence.",
        ],
      },
      {
        heading: "Pillar II — Categorization Drift",
        body: [
          "Fails when a client has any uncategorized transactions, missing payees, undeposited funds, or unapplied payments.",
          "Use the Cleanup Backlog watchlist to prioritize the worst offenders; tackle items in QBO and re-submit the MER.",
        ],
      },
      {
        heading: "Pillar III — Statement Harvest",
        body: [
          "Fails when 'Statement Request Status' is anything other than 'Received'.",
          "The Statement Chase Queue surfaces all outstanding requests. Re-send via the client modal or escalate when 7+ days have passed.",
        ],
      },
      {
        heading: "Pillar IV — Workflow Adherence",
        body: [
          "Fails when any of Notes Approved / Financials Sent / Books Closed is unchecked — or when checkboxes are completed out of order.",
          "Process Enforcement Flags below the pillars highlight out-of-order completions so managers can intervene.",
        ],
      },
    ],
  },
  {
    id: "dashboard-action-buttons",
    title: "Dashboard Action Buttons",
    description:
      "Standard Operating Procedure for the action buttons in the Client Details modal — bank reconnection, statement requests, and notes approval.",
    sections: [
      {
        heading: "Bank Reconnection",
        body: [
          "Use when a client has 'Missing' bank transactions or a broken QBO feed.",
          "Clicking the button starts the Bank Reconnection sequence (email + SMS) and logs the action in the Activity Log.",
          "Confirm in the modal — the cycle stage stays the same; only the outreach sequence is triggered.",
        ],
      },
      {
        heading: "Statement Request",
        body: [
          "Use when a client's Statement Request Status is 'Not Received'.",
          "Fires the Statement Request sequence and notifies the assigned bookkeeper.",
          "If still unfulfilled after 7 days, the system automatically escalates to the Master Cycle as 'Escalated'.",
        ],
      },
      {
        heading: "Notes Approved",
        body: [
          "Manager-only action. Marks the previous month's notes as approved and unlocks Financials Sent / Books Closed.",
          "Always action this BEFORE clicking Send Financials — Workflow Adherence flags out-of-order completion.",
        ],
      },
      {
        heading: "Send Financials",
        body: [
          "Triggers the financial-delivery sequence and updates the cycle to Stage 8 — Complete.",
          "Requires Notes Approved to be checked first. The button is disabled if prerequisites are missing.",
        ],
      },
    ],
  },
  {
    id: "client-onboarding",
    title: "Client Onboarding Checklist",
    description:
      "Steps to add a new client to Greenfield Bookkeeping — from GHL contact creation through QBO linking and first MER assignment.",
    sections: [
      {
        heading: "1. GHL Contact Setup",
        body: [
          "Create the contact in GHL with the 'mer-workflow' tag — this enrolls them in the monthly cycle automatically.",
          "Add custom fields: Company Name, Client Type (For-Profit / Non-Profit / School), and Assigned Bookkeeper.",
        ],
      },
      {
        heading: "2. QuickBooks Online Link",
        body: [
          "Connect QBO via the standard Greenfield admin account. Verify bank/credit feeds are active.",
          "Set the QBO 'Books Start Date' to align with the client's engagement start month.",
        ],
      },
      {
        heading: "3. First MER Assignment",
        body: [
          "On the Bookkeepers page, assign the new client to a bookkeeper based on capacity (shown as 'backlog' count).",
          "Submit a placeholder MER row with Completion 0% so the client appears on the Dashboard immediately.",
        ],
      },
      {
        heading: "4. Welcome Sequence",
        body: [
          "Trigger the 'New Client Welcome' sequence from the Client Details modal — this sends introductions and the statement-upload portal link.",
        ],
      },
    ],
  },
  {
    id: "escalation-policy",
    title: "Escalation Policy",
    description:
      "When and how to escalate stalled cycles, missing client documents, and out-of-order workflow steps to the Assistant and Manager tiers.",
    sections: [
      {
        heading: "Tier 1 — Bookkeeper Self-Serve (Days 0–6)",
        body: [
          "Bookkeeper owns all outreach. Use action buttons in the Client Details modal for re-sends.",
          "Document attempts in the Notes field of the MER form so context carries forward.",
        ],
      },
      {
        heading: "Tier 2 — Assistant Escalation (Day 7)",
        body: [
          "Master Cycle automatically marks the cycle 'Escalated' after 7 days without document receipt.",
          "Assistant calls the client directly and updates the cycle stage with a phone-log note.",
        ],
      },
      {
        heading: "Tier 3 — Manager Escalation (Day 14)",
        body: [
          "After 14 days, the cycle is flagged red on Compliance Health and routed to the manager.",
          "Manager decides: extend timeline, move client to 'On Hold', or initiate offboarding.",
        ],
      },
      {
        heading: "Workflow Violation Escalations",
        body: [
          "Any client appearing in 'Process Enforcement Flags' (out-of-order checkboxes) is reviewed by the manager weekly.",
          "Repeated violations by the same bookkeeper trigger a 1:1 review meeting.",
        ],
      },
    ],
  },
  {
    id: "monthly-trends-reporting",
    title: "Monthly Trends & Reporting",
    description:
      "How to read the Monthly Trends page, interpret comparison deltas, and export historical reports for leadership reviews.",
    sections: [
      {
        heading: "Reading the Trend Charts",
        body: [
          "Dates are always formatted as 'Mon YYYY' (e.g. Aug 2025) and rendered left-to-right oldest → newest.",
          "Hover any data point for the exact count; deltas vs the prior month appear as a percentage (%).",
        ],
      },
      {
        heading: "Compliance Trend",
        body: [
          "Tracks Compliant vs Non-Compliant client counts across the last 6 months.",
          "A drop of more than 10% month-over-month should trigger a team review.",
        ],
      },
      {
        heading: "Completion % by Month",
        body: [
          "Average completion percentage across all active clients.",
          "Use as the headline KPI for monthly leadership reviews — target is 85%+.",
        ],
      },
      {
        heading: "Exporting Reports",
        body: [
          "Use the Export Center to generate XLSX / PDF snapshots of any month.",
          "Snapshots are immutable — once exported, the underlying month is locked for reporting consistency.",
        ],
      },
    ],
  },
];

export default function UserGuidePage() {
  const [active, setActive] = useState<Guide | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-[12px] font-medium uppercase tracking-wider">
          <BookOpen className="h-3.5 w-3.5" />
          User Guide
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight text-balance">
          Internal procedures & how-to documents
        </h1>
        <p className="text-[13px] text-muted-foreground max-w-2xl">
          Open any guide below to read the full document. Use the download button inside the viewer to save a copy.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {guides.map((g, i) => (
          <motion.button
            key={g.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            onClick={() => setActive(g)}
            className="group text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.25)] transition-[box-shadow,border-color] focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-[18px] w-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-base font-semibold text-foreground truncate">
                    {g.title}
                  </h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
                <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
                  {g.description}
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                  {g.sections.length} sections · Click to open
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <GuideViewer guide={active} onClose={() => setActive(null)} />
    </div>
  );
}

function GuideViewer({ guide, onClose }: { guide: Guide | null; onClose: () => void }) {
  const handleDownload = () => {
    if (!guide) return;
    const md = [
      `# ${guide.title}`,
      "",
      guide.description,
      "",
      ...guide.sections.flatMap((s) => [`## ${s.heading}`, "", ...s.body, ""]),
    ].join("\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${guide.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {guide && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={guide.title}
        >
          <header className="flex items-center gap-3 h-[56px] px-4 sm:px-6 border-b border-border glass-panel shrink-0">
            <h2 className="font-display text-[15px] sm:text-base font-semibold text-foreground truncate min-w-0">
              {guide.title}
            </h2>
            <div className="flex-1" />
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-[13px] font-medium"
              title="Download as Markdown"
            >
              <Download className="h-[16px] w-[16px]" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </header>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <article className="mx-auto max-w-3xl px-5 sm:px-8 py-10 space-y-8">
              <header className="space-y-2 border-b border-border pb-6">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Standard Operating Procedure
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground text-balance">
                  {guide.title}
                </h1>
                <p className="text-[13.5px] text-muted-foreground leading-relaxed text-pretty">
                  {guide.description}
                </p>
              </header>
              {guide.sections.map((s, idx) => (
                <section key={idx} className="space-y-3">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {s.heading}
                  </h2>
                  <div className="space-y-2.5">
                    {s.body.map((p, i) => (
                      <p key={i} className="text-[13.5px] leading-relaxed text-muted-foreground text-pretty">
                        {p}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
              <footer className="pt-6 border-t border-border text-[11px] text-muted-foreground">
                Greenfield Bookkeeping · Command Center Portal · Demo document
              </footer>
            </article>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
