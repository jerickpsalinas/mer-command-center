import type { SopConfig } from "@/components/SopPanel";

export const dashboardSop: SopConfig = {
  title: "Dashboard",
  subtitle: "At-a-glance compliance overview for all active clients.",
  pdfFileId: "1hZGY3YngqH-jeL5pP9kEyNxEQj8bGLKY",
  sections: [
    {
      heading: "What this page shows",
      content:
        "The Dashboard displays KPI cards and charts for all clients tagged with mer-workflow in GHL. It shows data for the selected reporting month.\n\nClients who haven't submitted a MER for the selected month will show their most recent prior data (marked with a rolled-over badge). Only clients who have never submitted any MER appear as \"Pending MER.\"",
    },
    {
      heading: "KPI cards",
      content:
        "• Total Clients — everyone with the mer-workflow tag\n• Compliant — all 10 compliance checks pass\n• Non-Compliant — one or more checks failed\n• On Hold — sheet Status contains \"hold\"\n• Pending MER — never submitted any MER data\n• Rolled Over — showing prior month's data (no submission yet this month)\n• Completion % — average across submitted clients",
    },
    {
      heading: "How to manage who appears",
      content:
        "Go to GHL Active Clients to add or remove the mer-workflow tag. Adding it makes a client appear on the dashboard. Removing it takes them out. The inactive-client tag also hides clients across all pages.",
    },
    {
      heading: "Capture & export",
      content:
        "Use the \"Capture as PNG\" button to take a screenshot of the entire dashboard. Use Export Center for CSV/Excel exports.",
    },
  ],
};

export const clientsSop: SopConfig = {
  title: "Clients",
  subtitle: "Detailed compliance status for each client, with card and table views.",
  sections: [
    {
      heading: "What this page shows",
      content:
        "Every client tagged mer-workflow in GHL, for the selected month. Each card shows all 10 compliance fields, the completion percentage, and the compliance status badge.\n\nClients without a MER for the selected month show rolled-over data from their last submission, marked with an amber badge.",
    },
    {
      heading: "Compliance status logic",
      content:
        "• Compliant — all 10 checks pass\n• Non-Compliant — any check fails and status is not \"On Hold\"\n• On Hold — sheet Status contains \"hold\" (overrides other checks)\n• Pending MER — no MER data has ever been submitted for this client",
    },
    {
      heading: "Filters & search",
      content:
        "Filter by client type, bookkeeper, compliance status, or search by name. Click any card to open the full client detail modal.",
    },
    {
      heading: "Rolled-over data",
      content:
        "When a client's card shows an amber \"rolled over\" badge (e.g. \"Aug 2026\"), it means their data is from that month — they haven't submitted for the currently selected month yet. Once they submit, the card updates automatically.",
    },
  ],
};

export const bookkeepersSop: SopConfig = {
  title: "Bookkeepers",
  subtitle: "Performance overview grouped by bookkeeper.",
  sections: [
    {
      heading: "What this page shows",
      content:
        "Each bookkeeper's assigned clients for the selected month, with compliance rates and individual client breakdowns. Data comes from the MER submissions matched with GHL mer-workflow contacts.",
    },
    {
      heading: "Compliance rate",
      content:
        "The percentage bar shows what proportion of a bookkeeper's assigned clients are Compliant. Pending MER clients are excluded from the rate calculation so the numbers reflect actual work.",
    },
    {
      heading: "Rolled-over clients",
      content:
        "Clients without a submission for the selected month show their last known data. This means a bookkeeper's client count stays stable month to month even before all MERs are submitted.",
    },
  ],
};

export const monthlyProgressSop: SopConfig = {
  title: "Monthly Progress",
  subtitle: "Sortable table of all compliance fields for the selected month.",
  sections: [
    {
      heading: "What this page shows",
      content:
        "A detailed table with every compliance field for all mer-workflow clients in the selected month. Sortable by name, completion %, reconciliation date, or uncategorized transactions.",
    },
    {
      heading: "Red dates",
      content:
        "If the Last Reconciled Date is stale (not reconciled for the expected period), it shows in red. This helps quickly spot clients that need reconciliation attention.",
    },
    {
      heading: "Column toggle",
      content:
        "Use the columns button to show/hide additional fields like Client Type, Transactions Without Payees, Undeposited Funds, etc.",
    },
  ],
};

export const ghlActiveClientsSop: SopConfig = {
  title: "GHL Active Clients",
  subtitle: "Tag management control panel — who appears on the dashboard and in what workflow.",
  pdfFileId: "10szIlYqbb5Tfo4wFJQWAx2ivkx4y8soy",
  sections: [
    {
      heading: "What this page does",
      content:
        "This is the control panel for managing which clients appear on the dashboard. Every client here has the active-client tag in GHL. From here you can manage their category tags, cycle tags, and workflow tags.",
    },
    {
      heading: "Key tags",
      content:
        "• mer-workflow — client appears on Dashboard, Clients, Bookkeepers, and Monthly Progress pages. This is the main tag that controls dashboard visibility.\n• active-client — client is under contract. All clients on this page have this tag.\n• inactive-client — hides the client from all dashboard pages.\n• ready-for-cleanup — puts client on the cleanup pipeline instead of the regular MER cycle.",
    },
    {
      heading: "Category tags",
      content:
        "• MER Workflow — monthly end review\n• AP — Expense — accounts payable expense processing\n• AP — Payroll — accounts payable payroll processing\n• AR — Education — accounts receivable for schools\n• AR — Nonprofits — accounts receivable for nonprofits\n\nA client can have multiple category tags.",
    },
    {
      heading: "How to add/remove a client from the dashboard",
      content:
        "To ADD: find the client here → Edit Tags → check \"MER Workflow\" → save. They'll appear on the dashboard with their next MER submission (or rolled-over data if they have prior submissions).\n\nTo REMOVE: Edit Tags → uncheck \"MER Workflow\" → save. Or use the \"Remove from MER\" action. They'll disappear from all dashboard pages.",
    },
    {
      heading: "Protected tags",
      content:
        "Some tags (active-client, ready-for-cleanup, mer-workflow, and category tags) are protected and can only be modified through the Edit Tags dialog — not the bulk tag actions. This prevents accidental removal.",
    },
  ],
};

export const masterCycleSop: SopConfig = {
  title: "Master Bookkeeping Cycle",
  subtitle: "Pipeline view of where each client is in the monthly bookkeeping cycle.",
  pdfFileId: "1VyHxw-Mm4-hTXU9GZ-9Zy0SWTNuYJfxt",
  sections: [
    {
      heading: "What this page shows",
      content:
        "The bookkeeping cycle pipeline — a Kanban-style view showing which stage each client is in for the current month. Stages progress from Ready for Pipeline → Docs Received → Review Ready → Jessica Approved.",
    },
    {
      heading: "Regular vs Cleanup pipelines",
      content:
        "Clients on the regular MER workflow move through the standard pipeline. Clients tagged ready-for-cleanup move through the parallel cleanup pipeline with its own stages.",
    },
    {
      heading: "How clients move between stages",
      content:
        "Clients move automatically when tagged in GHL (e.g. docs-received tag moves them to Docs Received). The dashboard action buttons trigger these tag changes through n8n workflows.",
    },
  ],
};

export const healthPillarsSop: SopConfig = {
  title: "Compliance Health",
  subtitle: "Deep dive into each of the 10 compliance checks.",
  sections: [
    {
      heading: "What this page shows",
      content:
        "Each of the 10 compliance checks broken out individually — bank transactions, uncategorized transactions, transactions without payees, undeposited funds, unapplied payments, statement request status, last reconciled date, previous month notes, financials sent, and books closed.",
    },
    {
      heading: "How to use it",
      content:
        "Click into any pillar to see which clients are passing or failing that specific check. Useful for targeting specific issues across the entire client base rather than looking at one client at a time.",
    },
  ],
};

export const exportCenterSop: SopConfig = {
  title: "Export Center",
  subtitle: "Download compliance data as CSV or Excel.",
  sections: [
    {
      heading: "What this page does",
      content:
        "Generate downloadable reports of compliance data. Choose the month, format (CSV or Excel), and what to include.",
    },
    {
      heading: "Note on data",
      content:
        "Exports currently pull from the raw MER sheet data. The dashboard may show slightly different numbers because it merges GHL contact data and applies rollover logic. We're working on aligning these.",
    },
  ],
};

export const activityLogSop: SopConfig = {
  title: "Activity Log",
  subtitle: "Audit trail of all actions taken through the dashboard.",
  sections: [
    {
      heading: "What this page shows",
      content:
        "Every action performed through the dashboard — MER submissions, tag changes, document requests, statement requests, and more. Each entry shows who did what, when, and for which client.",
    },
    {
      heading: "How to use it",
      content:
        "Filter by action type, user, or client name. Useful for auditing what happened to a specific client or verifying that an automation ran correctly.",
    },
  ],
};

export const billingSop: SopConfig = {
  title: "Billing",
  subtitle: "Monthly billing overview per client.",
  sections: [
    {
      heading: "What this page shows",
      content:
        "Billing data pulled from the MER sheet, showing fees and payment status per client per month.",
    },
  ],
};
