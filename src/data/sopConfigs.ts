import type { SopConfig } from "@/components/SopPanel";

export const dashboardSop: SopConfig = {
  title: "Dashboard",
  subtitle: "Your monthly compliance snapshot for every active client.",
  pdfFileId: "1hZGY3YngqH-jeL5pP9kEyNxEQj8bGLKY",
  sections: [
    {
      heading: "The cards up top",
      content:
        "• Active Clients — everyone in the MER workflow. \"Rolled over\" = still showing last month's data (no MER submitted yet this month).\n• Books Reconciled (X / N) — how many are reconciled through the selected month. Cumulative, so a client also counts once a later month is reconciled (shown as \"carried\").\n• Compliant / Non-Compliant — all 10 MER items done, or one or more still open.\n• Pending MER — no MER submitted yet.\n• Completion % — average of the 10 items done (On Hold and Pending MER left out).",
    },
    {
      heading: "Reconciled vs Compliant — the one thing to know",
      content:
        "Green \"Books Reconciled\" = our accounting work is done for that month. \"Compliant\" = the client's 10 MER items are all in. They're separate — a month can be reconciled but not compliant. A client's cycle stage (even \"Completed\") does not change either one.",
    },
    {
      heading: "Reports & who appears",
      content:
        "Download Report (top right) gives this month's MER as Excel or PDF. To add or remove a client from the dashboard, use GHL Active Clients (the mer-workflow tag).",
    },
  ],
};

export const healthPillarsSop: SopConfig = {
  title: "Compliance Health",
  subtitle: "The 10 MER checks, one at a time.",
  sections: [
    {
      heading: "What it's for",
      content:
        "See which clients pass or fail each individual check — bank transactions, uncategorized, payees, undeposited, unapplied, statements, reconciled date, notes, financials sent, books closed. Use it to clear one issue across everyone at once instead of client by client.",
    },
  ],
};

export const masterCycleSop: SopConfig = {
  title: "Master Bookkeeping Cycle",
  subtitle: "Where each client sits in this month's cycle.",
  pdfFileId: "1VyHxw-Mm4-hTXU9GZ-9Zy0SWTNuYJfxt",
  sections: [
    {
      heading: "The board",
      content:
        "A pipeline view of each client's stage this month: Ready for Pipeline → Docs Received → Review Ready → Approved. Clients move automatically as their GHL tags change (the dashboard action buttons trigger those tag changes).",
    },
    {
      heading: "Regular vs Cleanup",
      content:
        "Clients tagged ready-for-cleanup run a separate cleanup pipeline with its own stages. Everyone else runs the regular MER pipeline.",
    },
  ],
};

export const monthlyProgressSop: SopConfig = {
  title: "Monthly Progress",
  subtitle: "Full field-by-field table for the month.",
  sections: [
    {
      heading: "What it's for",
      content:
        "Every MER field for every client in the selected month, sortable by name, completion %, reconciled date or uncategorized count. A red Last Reconciled Date means it's overdue. Use the columns button to show or hide fields.",
    },
  ],
};

export const clientsSop: SopConfig = {
  title: "Clients",
  subtitle: "Every client's status, as cards or a table.",
  sections: [
    {
      heading: "Each card",
      content:
        "Shows the reconciliation badge, the compliance badge, the 10 MER fields and completion %. \"Rolled over\" means the card is showing last month's data because no MER is in for this month yet. Click a card for the full details.",
    },
    {
      heading: "Find clients fast",
      content:
        "Filter by compliance status, reconciliation status, bookkeeper or type, or search by name. The reconciliation filter is the quick way to pull up who's not reconciled yet this month.",
    },
  ],
};

export const bookkeepersSop: SopConfig = {
  title: "Bookkeepers",
  subtitle: "Compliance and workload by bookkeeper.",
  sections: [
    {
      heading: "What it shows",
      content:
        "Each bookkeeper's clients with their compliant count, compliance rate and average completion %. Pending MER clients are left out so the numbers reflect actual work done.",
    },
  ],
};

export const ghlActiveClientsSop: SopConfig = {
  title: "GHL Active Clients",
  subtitle: "Control who's on the dashboard and their tags.",
  pdfFileId: "10szIlYqbb5Tfo4wFJQWAx2ivkx4y8soy",
  sections: [
    {
      heading: "Add or remove a client",
      content:
        "Find the client → Edit Tags → check (or uncheck) MER Workflow → Save. The mer-workflow tag is what puts a client on the dashboard and takes them off.",
    },
    {
      heading: "Key tags",
      content:
        "• mer-workflow — shows on the dashboard\n• inactive-client — hides from every dashboard page\n• ready-for-cleanup — runs the cleanup pipeline instead of the regular cycle\n• Category tags (MER, AP — Expense, AP — Payroll, AR — Education, AR — Nonprofits) can stack on one client.",
    },
    {
      heading: "Protected tags",
      content:
        "Core tags (active-client, mer-workflow, ready-for-cleanup, category tags) can only be changed through Edit Tags, not the bulk actions — so nothing gets removed by accident.",
    },
  ],
};

export const ghlContactsSop: SopConfig = {
  title: "GHL Contacts",
  subtitle: "Look up any GoHighLevel contact (admin only).",
  sections: [
    {
      heading: "What it's for",
      content:
        "Search every GHL contact and their tags to see who is or isn't in the MER workflow. This is a lookup only — to add or remove a client from the dashboard, use GHL Active Clients. Admin access only.",
    },
  ],
};

export const monthlyTrendsSop: SopConfig = {
  title: "Monthly Trends",
  subtitle: "How compliance is moving month to month.",
  sections: [
    {
      heading: "What it shows",
      content:
        "This month's live numbers up top, then past months compared — compliant vs non-compliant and average completion %. It updates live from submissions; the trend arrow compares to last month and ignores moves under 2 points.",
    },
  ],
};

export const activityLogSop: SopConfig = {
  title: "Activity Log",
  subtitle: "Who did what, and when.",
  sections: [
    {
      heading: "What it's for",
      content:
        "Every action taken through the dashboard — MER submissions, tag changes, statement and document requests. Filter by action, user or client to audit a client or confirm an automation ran.",
    },
  ],
};

export const exportCenterSop: SopConfig = {
  title: "Export Center",
  subtitle: "Download MER reports as Excel or PDF.",
  sections: [
    {
      heading: "The monthly MER report",
      content:
        "Set the range to \"Single month,\" pick the month, then Download under Excel or PDF on the MER Submissions Report. It includes the KPIs, compliance summary, per-client table and reconciliation column. This is the same report as the Dashboard's Download Report button. Hit Preview first if you want to check it.",
    },
    {
      heading: "Pick your range",
      content:
        "Single month, a month range, a custom date range, or all time — your choice applies to every report on the page.",
    },
    {
      heading: "Other reports",
      content:
        "• Client Compliance Scorecard — per-client completion and trend (good for client reviews)\n• Bookkeeper Performance — rate per bookkeeper\n• At-Risk Clients — who needs attention\n• Trends Summary — month-over-month movement\n• Cycle Status — Master Cycle stages\n• Executive Summary — one-page PDF for leadership\n• Full Data Backup — everything in one Excel workbook",
    },
  ],
};

export const userGuideSop: SopConfig = {
  title: "User Guide",
  subtitle: "Guides and every page's SOP in one place.",
  sections: [
    {
      heading: "What's here",
      content:
        "PDF how-to guides plus the SOP for every page. Every page in the sidebar also has its own SOP (the ? button). You can download a single SOP or the full manual as a PDF to share or print.",
    },
  ],
};

export const settingsSop: SopConfig = {
  title: "Settings",
  subtitle: "Your personal preferences (saved per user).",
  sections: [
    {
      heading: "What you can set",
      content:
        "Auto-refresh on/off and how often, the at-risk thresholds, notifications, and display density.",
    },
    {
      heading: "Notifications",
      content:
        "Turn alert levels (critical, warning, positive, info) on or off, limit alerts to one bookkeeper, or mute specific action types — e.g. silence routine Notes Approval while keeping critical Bank Reconnection. Reset restores the defaults.",
    },
  ],
};

export const developerSop: SopConfig = {
  title: "Developer",
  subtitle: "Reminder banner and system updates (dev only).",
  sections: [
    {
      heading: "What it does",
      content:
        "Post the reminder banner the whole team sees, publish system updates, and schedule posts. Posted items can be edited or archived; scheduled ones can be edited or cancelled before they go out.",
    },
  ],
};

export const billingSop: SopConfig = {
  title: "Billing",
  subtitle: "Fees and payment status per client.",
  sections: [
    {
      heading: "What it shows",
      content:
        "Each client's balance due, due date, last paid date and service type, pulled from the Billing sheet.",
    },
  ],
};

/** Every page SOP in sidebar order, used for the combined "full SOP manual" PDF. */
export const allSops: SopConfig[] = [
  dashboardSop,
  healthPillarsSop,
  masterCycleSop,
  monthlyProgressSop,
  clientsSop,
  bookkeepersSop,
  ghlActiveClientsSop,
  ghlContactsSop,
  monthlyTrendsSop,
  activityLogSop,
  exportCenterSop,
  userGuideSop,
  settingsSop,
  developerSop,
  billingSop,
];
