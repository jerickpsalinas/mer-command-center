import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, FileText, ChevronRight, ClipboardList } from "lucide-react";
import PdfViewerModal from "@/components/PdfViewerModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Guide {
  id: string;
  title: string;
  description: string;
  fileId: string;
}

const guides: Guide[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description:
      "Dashboard orientation guide — navigation, roles, what each tab does, and how to use the top nav buttons.",
    fileId: "1hZGY3YngqH-jeL5pP9kEyNxEQj8bGLKY",
  },
  {
    id: "mer-workflow",
    title: "MER Workflow Guide",
    description:
      "Complete MER lifecycle — Add MER, Update MER, docs-received gate, review gate, cycle progression tracker, Submit for Review, and Mark as Approved.",
    fileId: "118ujg4Rt58LPY_UeaqQLtdk_5tzkM_dZ",
  },
  {
    id: "action-buttons-sop",
    title: "Dashboard Action Buttons",
    description:
      "Standard Operating Procedure v2.0 — the four action slots (bank reconnection, statement request, notes approval, document request), warnings, errors, and the sequence status table.",
    fileId: "17KswnuOqYVFKHZ_mP12xRuluyrqXLS2J",
  },
  {
    id: "admin-guide",
    title: "Admin Guide — Cycle & Tags",
    description:
      "For admin and developer roles — Master Bookkeeping Cycle pipeline, jessica-approved approval, GHL Active Clients tag management, mutual exclusion, and protected tags.",
    fileId: "1VyHxw-Mm4-hTXU9GZ-9Zy0SWTNuYJfxt",
  },
  {
    id: "remove-client-from-mer",
    title: "Removing a Client from MER",
    description:
      "How to take a client out of the MER workflow — the Remove from MER action in GHL Active Clients, what the mer-workflow tag controls, and what happens to the Clients tab afterwards.",
    fileId: "10szIlYqbb5Tfo4wFJQWAx2ivkx4y8soy",
  },
  {
    id: "ghl-active-clients",
    title: "GHL Active Clients Guide",
    description:
      "Full guide to the GHL Active Clients tab — category tags, cycle tags, automation signals, row actions (Edit Tags, Remove from MER), filtering, auditing, and troubleshooting.",
    fileId: "1XvLMb__OqctBgXOqCjIPKZN1O96I_WZI",
  },
];

/* ------------------------------------------------------------------ */
/*  Reusable SOP components                                           */
/* ------------------------------------------------------------------ */

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-3">
      <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-[11px] font-bold">{n}</span>
      <p className="text-[13px] text-muted-foreground leading-relaxed pt-0.5">{children}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2.5 mb-3">
      <span className="text-blue-400 text-xs font-bold uppercase shrink-0 pt-0.5">Tip</span>
      <p className="text-[12.5px] text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5 mb-3">
      <span className="text-amber-400 text-xs font-bold uppercase shrink-0 pt-0.5">Note</span>
      <p className="text-[12.5px] text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[14px] font-semibold text-foreground mb-3 mt-5 first:mt-0">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">{children}</p>;
}

function SopTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-[12.5px] border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left font-semibold text-foreground bg-muted/50 px-3 py-2 border border-border">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="even:bg-muted/20">
              {row.map((cell, j) => (
                <td key={j} className="text-muted-foreground px-3 py-2 border border-border whitespace-normal">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SOP Content                                                        */
/* ------------------------------------------------------------------ */

function SOPContent() {
  return (
    <div className="space-y-3">
      <div className="bg-muted/30 border border-border rounded-lg px-4 py-3 mb-2">
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Brant & Associates — MER Dashboard SOP</strong><br />
          Step-by-step guides for every process. Click any section to expand it. If you're new, start with "Logging In & Navigation."
        </p>
      </div>

      <Accordion type="multiple" className="space-y-2">

        {/* ============================================================ */}
        {/* LOGGING IN & NAVIGATION                                       */}
        {/* ============================================================ */}
        <AccordionItem value="login" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Logging In & Navigating the Dashboard
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SectionTitle>How to Log In</SectionTitle>
            <Step n={1}>Open the dashboard URL in your browser (Chrome or Edge recommended).</Step>
            <Step n={2}>Enter your <strong>email address</strong> in the Email field.</Step>
            <Step n={3}>Enter your <strong>password</strong> in the Password field.</Step>
            <Step n={4}>Click the <strong>Sign In</strong> button.</Step>
            <Step n={5}>You will land on the <strong>Dashboard</strong> home page with your overview cards.</Step>
            <Warning>If you forget your password, click "Forgot password?" on the login screen. A reset link will be sent to your email. If you don't have an account, contact Jessica — only admins can create new accounts.</Warning>

            <SectionTitle>Navigating the Sidebar</SectionTitle>
            <P>The left sidebar shows all the pages you have access to. Click any page name to go there. Your available pages depend on your role:</P>
            <SopTable
              headers={["Role", "Pages You Can See"]}
              rows={[
                ["Admin (Jessica)", "All 14 pages: Dashboard, Monthly Progress, Clients, GHL Active Clients, Master Bookkeeping Cycle, Activity Log, Billing, MER History, Tax Management, Status Snapshots, Cleanup Tracker, Settings, User Guide"],
                ["Bookkeeper (Sahir, Maricel)", "Dashboard, Monthly Progress, Clients, Activity Log, Billing, User Guide, Settings"],
                ["Developer (Jerick)", "All pages plus Developer tools"],
              ]}
            />
            <Tip>The page you're currently on is highlighted in the sidebar. If you ever get lost, click "Dashboard" to go back to the home page.</Tip>

            <SectionTitle>Session Timeout</SectionTitle>
            <P>For security, the dashboard will automatically log you out after a period of inactivity. Simply log back in if this happens — your data is always saved.</P>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* SUBMITTING A MER                                              */}
        {/* ============================================================ */}
        <AccordionItem value="mer-submit" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Submitting a Monthly Expense Report (MER)
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SectionTitle>Adding a New MER (First Submission for the Month)</SectionTitle>
            <Step n={1}>Go to the <strong>Clients</strong> page from the sidebar.</Step>
            <Step n={2}>Find the client you need to submit a MER for. You can use the search bar at the top to search by name.</Step>
            <Step n={3}>Click on the client's row to open their <strong>detail modal</strong>.</Step>
            <Step n={4}>Click the <strong>"Add MER"</strong> button.</Step>
            <Step n={5}>Fill in the MER form:
              <br />• <strong>Month/Year</strong> — select the reporting month
              <br />• <strong>Total Income</strong> — enter the client's total income for the month
              <br />• <strong>Total Expenses</strong> — enter the client's total expenses
              <br />• <strong>Notes</strong> — add any notes (optional)
            </Step>
            <Step n={6}>Review your numbers, then click <strong>"Submit"</strong>.</Step>
            <Step n={7}>You'll see a success confirmation. The MER is now saved and visible on the Monthly Progress page.</Step>
            <Tip>If the client has QuickBooks connected, the income and expense fields may already be pre-filled from the daily QBO sync. You can still edit these numbers before submitting.</Tip>

            <SectionTitle>Updating an Existing MER</SectionTitle>
            <Step n={1}>Go to <strong>Clients</strong> → click the client → click <strong>"Update MER"</strong>.</Step>
            <Step n={2}>Change the fields that need updating.</Step>
            <Step n={3}>Click <strong>"Submit"</strong> to save your changes.</Step>
            <Warning>If you change the month on an update, the old month's entry will be replaced with the new one. Double-check the month before submitting.</Warning>

            <SectionTitle>Submitting a MER via Slack</SectionTitle>
            <Step n={1}>In your Slack workspace, type <strong>/mer</strong> in any channel.</Step>
            <Step n={2}>A modal will pop up. Select the client and fill in the same fields (month, income, expenses, notes).</Step>
            <Step n={3}>Click <strong>"Submit"</strong> in the Slack modal.</Step>
            <Step n={4}>You'll get a confirmation message in Slack, and it also shows up in the dashboard.</Step>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* SUBMITTING FOR REVIEW & APPROVAL                             */}
        {/* ============================================================ */}
        <AccordionItem value="review-approval" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Submitting MER for Review & Getting Approval
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SectionTitle>Submitting for Jessica's Review (Bookkeepers)</SectionTitle>
            <Step n={1}>Go to <strong>Clients</strong> and click on the client whose MER is complete.</Step>
            <Step n={2}>Make sure the MER data is filled in and accurate.</Step>
            <Step n={3}>Click <strong>"Submit for Review"</strong>.</Step>
            <Step n={4}>The client's status changes to <strong>"Review Ready"</strong>. Jessica gets a Slack notification.</Step>
            <Step n={5}>Wait for Jessica to review. You can check the status on the <strong>Monthly Progress</strong> page — it will show "Review Ready" until approved.</Step>

            <SectionTitle>Approving a MER (Jessica Only)</SectionTitle>
            <Step n={1}>You'll get a Slack notification when a MER is submitted for review.</Step>
            <Step n={2}>Go to <strong>Clients</strong> → click the client → review their MER data (income, expenses, notes).</Step>
            <Step n={3}>If everything looks good, click <strong>"Mark as Approved"</strong>.</Step>
            <Step n={4}>The client's cycle is now complete for the month. Their status updates to "Approved" and the team is notified via Slack.</Step>
            <Warning>Once approved, the cycle is complete. If you need to make changes after approval, you'll need to update the MER and re-submit for review.</Warning>

            <SectionTitle>Cleanup Cycle Review</SectionTitle>
            <P>The cleanup cycle works the same way but for clients in the cleanup pipeline. The buttons will say "Submit for Review (Cleanup)" and "Mark as Approved (Cleanup)." The steps are identical.</P>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* DASHBOARD ACTION BUTTONS                                      */}
        {/* ============================================================ */}
        <AccordionItem value="action-buttons" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Using Dashboard Action Buttons
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <P>Action buttons let you trigger automated tasks for a specific client. Each action sends an email/SMS to the client and logs the action.</P>

            <SectionTitle>Available Actions</SectionTitle>
            <SopTable
              headers={["Action", "What It Does", "When to Use"]}
              rows={[
                ["Request Bank Reconnection", "Sends the client an email + SMS asking them to reconnect their bank feed", "When a client's bank connection is broken in QBO"],
                ["Request Missing Statement", "Sends the client a request for a specific missing statement", "When you need a statement the client hasn't provided"],
                ["Notes Approval", "Flags the MER notes as approved", "When Jessica reviews and approves bookkeeper notes"],
                ["Undo Notes Approval", "Removes the notes approval flag", "If notes approval was applied by mistake"],
                ["Mark Resolved", "Marks an open issue as resolved", "When a previously flagged issue is fixed"],
                ["Mark Statement Resolved", "Marks a missing statement request as resolved", "When the client provides the requested statement"],
                ["Clear MER Data", "Clears the MER data for the current month", "To start fresh on a client's MER (use carefully)"],
                ["Request Docs", "Sends a document request to the client via email + SMS", "Beginning of the monthly cycle to request bookkeeping documents"],
                ["Mark Docs Received", "Marks that documents have been received from the client", "After verifying the client's documents are in TaxDome"],
              ]}
            />

            <SectionTitle>How to Use an Action Button</SectionTitle>
            <Step n={1}>Go to <strong>Clients</strong> and click on the client.</Step>
            <Step n={2}>In the client detail modal, find the <strong>action buttons</strong> section.</Step>
            <Step n={3}>Click the button for the action you want to perform.</Step>
            <Step n={4}>An <strong>8-second undo window</strong> appears — if you clicked the wrong button, click <strong>"Undo"</strong> immediately to cancel.</Step>
            <Step n={5}>After 8 seconds, the action fires automatically. The client receives the email/SMS and the action is logged.</Step>
            <Tip>Every action is recorded in the Activity Log page with your name, the action type, the client, and the timestamp. You can always check what actions have been performed.</Tip>
            <Warning>The "Clear MER Data" action cannot be reversed after the 8-second window. Double-check before using it.</Warning>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* BILLING MANAGEMENT                                            */}
        {/* ============================================================ */}
        <AccordionItem value="billing" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Managing Billing
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <P>The Billing page shows all client billing information synced from the firm's QuickBooks Online account. Data refreshes automatically every day at 8:00 AM.</P>

            <SectionTitle>Viewing Billing Data</SectionTitle>
            <Step n={1}>Go to the <strong>Billing</strong> page from the sidebar.</Step>
            <Step n={2}>You'll see a table with all clients showing: name, email, service type, last payment date, balance due, due date, notification stage, and notes.</Step>
            <Step n={3}>Use the <strong>search bar</strong> to find a specific client.</Step>
            <Step n={4}>Click column headers to <strong>sort</strong> by any field.</Step>

            <SectionTitle>Editing Service Type</SectionTitle>
            <Step n={1}>Find the client in the Billing table.</Step>
            <Step n={2}>Click the <strong>Service Type</strong> dropdown in their row.</Step>
            <Step n={3}>Select the correct service type from the list.</Step>
            <Step n={4}>The change saves automatically.</Step>

            <SectionTitle>Changing Notification Stage</SectionTitle>
            <P>Notification stages track where you are in the billing follow-up process for overdue clients:</P>
            <SopTable
              headers={["Stage", "What Happens"]}
              rows={[
                ["None", "No billing notifications sent yet"],
                ["Reminder Sent", "A friendly payment reminder is sent to the client"],
                ["Overdue Notice", "A more urgent overdue notice is sent"],
                ["Final Notice", "A final notice is sent — last warning before further action"],
              ]}
            />
            <Step n={1}>Find the client in the Billing table.</Step>
            <Step n={2}>Click the <strong>Notification Stage</strong> dropdown in their row.</Step>
            <Step n={3}>Select the next stage (e.g., move from "None" to "Reminder Sent").</Step>
            <Step n={4}>The change saves automatically, and the corresponding notification email/SMS is sent to the client.</Step>
            <Warning>Moving to a new notification stage sends a real message to the client. Make sure you intend to send the notification before changing the stage.</Warning>

            <SectionTitle>Adding or Editing Notes</SectionTitle>
            <Step n={1}>Find the client in the Billing table.</Step>
            <Step n={2}>Click the <strong>Notes</strong> field in their row.</Step>
            <Step n={3}>Type your note (e.g., "Promised to pay by Friday").</Step>
            <Step n={4}>Press <strong>Enter</strong> or click away to save.</Step>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* CONNECTING QBO                                                */}
        {/* ============================================================ */}
        <AccordionItem value="qbo" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Connecting a Client's QuickBooks Online
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <P>Connecting a client's QBO account lets the dashboard automatically pull their Profit & Loss data (income, expenses, net income) every day. This pre-fills the MER form so you don't have to enter numbers manually.</P>

            <SectionTitle>How to Connect</SectionTitle>
            <Step n={1}>Go to the <strong>Clients</strong> page.</Step>
            <Step n={2}>Find the client you want to connect.</Step>
            <Step n={3}>Click the <strong>"Connect QBO"</strong> button on their row.</Step>
            <Step n={4}>A new tab opens showing the <strong>Intuit (QuickBooks) login page</strong>.</Step>
            <Step n={5}>Log in with the <strong>client's QBO credentials</strong> (or have the client do this step).</Step>
            <Step n={6}>Click <strong>"Authorize"</strong> to give the dashboard access to their P&L data.</Step>
            <Step n={7}>The tab will close or redirect. Back on the dashboard, the client now shows a <strong>"QBO Connected"</strong> badge.</Step>
            <Step n={8}>P&L data will start appearing the next day after the 7:00 AM daily sync. You can also see it immediately if you refresh after a few minutes.</Step>

            <Tip>You only need to connect QBO once per client. The connection stays active and refreshes automatically. If the connection ever breaks (token expires), the client's QBO badge will disappear and you'll see an alert in Slack's #system-alerts channel — just reconnect using the same steps.</Tip>

            <SectionTitle>What Data Gets Pulled</SectionTitle>
            <P>Once connected, the daily sync (7:00 AM) pulls the following from the client's QBO:</P>
            <SopTable
              headers={["Data", "Where It Shows"]}
              rows={[
                ["Total Income (current month)", "Clients page → client detail, MER form pre-fill"],
                ["Total Expenses (current month)", "Clients page → client detail, MER form pre-fill"],
                ["Net Income (income minus expenses)", "Clients page → client detail chart"],
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* TAX CYCLE                                                     */}
        {/* ============================================================ */}
        <AccordionItem value="tax" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Managing Tax Cycles
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <P>Tax cycles track which clients have active tax returns being prepared. This is managed on the <strong>Tax Management</strong> page (admin only).</P>

            <SectionTitle>Starting a Tax Cycle</SectionTitle>
            <Step n={1}>Go to <strong>Tax Management</strong> from the sidebar.</Step>
            <Step n={2}>Find the client who needs a tax return prepared.</Step>
            <Step n={3}>Click <strong>"Start Tax Cycle"</strong> on their row.</Step>
            <Step n={4}>The client is now marked as <strong>"Tax Cycle Active."</strong></Step>
            <Step n={5}>A Slack message is posted to #tax-updates with instructions: <em>"Add this client to TaxDome → Schedule C Tax Return Pipeline."</em></Step>
            <Step n={6}>Go to <strong>TaxDome</strong> and manually add the client to the appropriate tax return pipeline.</Step>
            <Warning>Starting a tax cycle only marks the client in the dashboard and sends the Slack reminder. You must still manually add the client to TaxDome.</Warning>

            <SectionTitle>Completing a Tax Cycle</SectionTitle>
            <Step n={1}>Once the tax return is filed and complete in TaxDome, go back to <strong>Tax Management</strong>.</Step>
            <Step n={2}>Click <strong>"Complete Tax Cycle"</strong> on the client's row.</Step>
            <Step n={3}>The client's tax cycle status changes to <strong>"Complete."</strong> The team is notified via Slack.</Step>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* DOCUMENT VERIFICATION                                         */}
        {/* ============================================================ */}
        <AccordionItem value="docs" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Document Verification (DOCSDONE Process)
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <P>When a client texts <strong>"DOCSDONE"</strong> to the firm's number, the system starts a document verification process. Here's what happens and what you need to do:</P>

            <SectionTitle>What Happens Automatically</SectionTitle>
            <Step n={1}>Client sends a text message containing the word <strong>"DOCSDONE"</strong>.</Step>
            <Step n={2}>The system picks it up and marks the client as <strong>"Docs Claimed — Pending Verification"</strong>.</Step>
            <Step n={3}>A notification posts to Slack <strong>#docs-verification</strong> channel saying: <em>"Client [Name] claims docs are done — verify in TaxDome."</em></Step>
            <Step n={4}>The client gets an automatic text confirmation that their claim was received and will be verified within 72 hours.</Step>

            <SectionTitle>What You Need to Do</SectionTitle>
            <Step n={1}>Check the <strong>#docs-verification</strong> channel in Slack for the notification.</Step>
            <Step n={2}>Open <strong>TaxDome</strong> and verify that the client has actually uploaded all required documents.</Step>
            <Step n={3}>If documents are confirmed in TaxDome, go back to the <strong>dashboard</strong>.</Step>
            <Step n={4}>Open the client's detail modal and click <strong>"Mark Docs Received"</strong> (or use the action button).</Step>
            <Step n={5}>This advances the client past the docs gate in the bookkeeping pipeline.</Step>
            <Warning>You have a 72-hour window to verify. The "Docs Claimed" status is just the client's claim — always verify in TaxDome before marking as received. Clients sometimes text DOCSDONE before all documents are actually uploaded.</Warning>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* GHL ACTIVE CLIENTS                                            */}
        {/* ============================================================ */}
        <AccordionItem value="ghl" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Managing Clients in GHL Active Clients (Admin)
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <P>The GHL Active Clients page shows every client contact in GoHighLevel that has the "active-client" tag. This is the master list. Tags control what automations run for each client.</P>

            <SectionTitle>Viewing Client Tags</SectionTitle>
            <Step n={1}>Go to <strong>GHL Active Clients</strong> from the sidebar.</Step>
            <Step n={2}>Each client row shows their current tags (colored badges).</Step>
            <Step n={3}>Tags are grouped into: <strong>Category tags</strong> (what kind of client), <strong>Cycle tags</strong> (where they are in the pipeline), and <strong>Automation signals</strong> (what's currently happening).</Step>

            <SectionTitle>Editing a Client's Tags</SectionTitle>
            <Step n={1}>Find the client in the list.</Step>
            <Step n={2}>Click <strong>"Edit Tags"</strong> on their row.</Step>
            <Step n={3}>A tag editor opens showing all current tags.</Step>
            <Step n={4}>Add or remove tags as needed. Available tags are shown in the editor.</Step>
            <Step n={5}>Click <strong>"Save"</strong> to apply the changes.</Step>
            <Warning>Be careful with tags — they trigger automations. For example, adding "ready-for-pipeline" immediately starts the docs request email/SMS sequence. Only add tags when you intend to trigger the associated process.</Warning>

            <SectionTitle>Key Tags and What They Do</SectionTitle>
            <SopTable
              headers={["Tag", "What It Does"]}
              rows={[
                ["active-client", "Makes the client appear in the dashboard. Required for all clients."],
                ["mer-workflow", "Includes the client in the MER pipeline (Clients page). Remove to hide them from MER tracking."],
                ["ready-for-pipeline", "Starts the monthly docs request sequence — email + SMS + automatic reminders over 7 days."],
                ["ready-for-cleanup", "Same as above but for cleanup cycle clients."],
                ["docs-received", "Documents verified. Moves client past the docs gate."],
                ["review-ready", "MER submitted for Jessica's review."],
                ["jessica-approved", "Jessica approved the MER. Cycle complete."],
                ["tax-cycle-active", "Tax return in progress."],
              ]}
            />

            <SectionTitle>Removing a Client from MER</SectionTitle>
            <Step n={1}>Find the client in <strong>GHL Active Clients</strong>.</Step>
            <Step n={2}>Click <strong>"Remove from MER"</strong> on their row.</Step>
            <Step n={3}>Confirm the removal. This removes the <strong>mer-workflow</strong> tag — the client will no longer appear on the Clients page or Monthly Progress page.</Step>
            <Step n={4}>The client still stays in GHL with the <strong>active-client</strong> tag. They can be re-added later by applying the mer-workflow tag again.</Step>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* MONTHLY PROGRESS                                              */}
        {/* ============================================================ */}
        <AccordionItem value="monthly-progress" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Tracking Monthly Progress
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SectionTitle>Viewing the Monthly Grid</SectionTitle>
            <Step n={1}>Go to <strong>Monthly Progress</strong> from the sidebar.</Step>
            <Step n={2}>You'll see a grid showing every client and their MER status for the selected month.</Step>
            <Step n={3}>Use the <strong>month/year selector</strong> at the top to switch between months.</Step>

            <SectionTitle>Understanding Status Colors</SectionTitle>
            <SopTable
              headers={["Status", "Meaning"]}
              rows={[
                ["Not Started", "No MER submitted yet for this month"],
                ["In Progress", "MER data entered but not submitted for review"],
                ["Review Ready", "Submitted for Jessica's review, waiting for approval"],
                ["Approved", "Jessica approved the MER — month is complete"],
              ]}
            />
            <Tip>Use this page at the end of each month to see which clients still need MERs submitted. It's the fastest way to check overall progress.</Tip>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* ACTIVITY LOG                                                  */}
        {/* ============================================================ */}
        <AccordionItem value="activity-log" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Using the Activity Log
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <P>The Activity Log records every action taken in the dashboard — who did what, for which client, and when.</P>
            <Step n={1}>Go to <strong>Activity Log</strong> from the sidebar.</Step>
            <Step n={2}>You'll see a chronological list of all actions, newest first.</Step>
            <Step n={3}>Use the <strong>filters</strong> to narrow down:
              <br />• <strong>By user</strong> — see only your actions or a specific team member's
              <br />• <strong>By action type</strong> — e.g., only MER submissions, only billing changes
              <br />• <strong>By date range</strong> — look at a specific time period
            </Step>
            <Tip>If a client asks "when was my statement requested?" or "who sent my reminder?", check the Activity Log — every action is recorded with the exact timestamp and user.</Tip>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* HOW THE SYSTEMS CONNECT                                       */}
        {/* ============================================================ */}
        <AccordionItem value="integrations" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            How the Systems Connect (Integration Overview)
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <P>The dashboard connects five systems together. Here's a plain-English explanation of each and how they all work together.</P>

            <SectionTitle>GoHighLevel (GHL) — The Client Database</SectionTitle>
            <P>Think of GHL as the address book that also sends messages. It stores every client's contact info and their "tags" — labels that tell the system what to do. When you click an action button in the dashboard, it ultimately adds or removes a tag in GHL, which triggers emails and texts to the client. <strong>All client emails and SMS come from GHL</strong> — the dashboard never sends messages directly.</P>

            <SectionTitle>QuickBooks Online (QBO) — The Accounting Data</SectionTitle>
            <P>There are <strong>two separate QBO connections</strong>:</P>
            <P><strong>Client QBO:</strong> Each client has their own QBO account. When connected, the system pulls their income and expenses every morning at 7:00 AM. This data shows up on the Clients page and pre-fills the MER form.</P>
            <P><strong>Firm QBO:</strong> Brant & Associates' own QBO account. The system pulls billing data (who owes what, who paid recently) every morning at 8:00 AM. This data powers the Billing page.</P>

            <SectionTitle>TaxDome — Where Tax Work Gets Done</SectionTitle>
            <P>TaxDome is <strong>not directly connected</strong> to the dashboard — there's no automatic data sync. Instead, it's a "manual bridge": the dashboard sends Slack notifications telling you when to do something in TaxDome (like add a client to a pipeline or verify documents), and then you come back to the dashboard to update the status. Think of TaxDome as a separate workspace that the dashboard reminds you to use.</P>

            <SectionTitle>Google Sheets — Where Data Lives</SectionTitle>
            <P>Behind the scenes, all the MER data, billing data, and QBO tokens are stored in a Google Spreadsheet. You don't need to open the spreadsheet — the dashboard reads from it automatically. The n8n workflows write to it whenever something happens (MER submitted, QBO synced, billing updated).</P>

            <SectionTitle>Slack — Where Notifications Go</SectionTitle>
            <P>Every important event posts a notification to a Slack channel so the team stays informed:</P>
            <SopTable
              headers={["Channel", "What You'll See"]}
              rows={[
                ["#bookkeeping-updates", "MER submissions, approvals, cycle completions, action button confirmations"],
                ["#docs-verification", "Client texted DOCSDONE — you need to verify their documents in TaxDome"],
                ["#system-alerts", "QBO sync errors, connection issues, escalation alerts for stuck clients"],
                ["#tax-updates", "Tax cycle starts and completions, TaxDome pipeline reminders"],
              ]}
            />
            <Tip>Keep Slack notifications on for #docs-verification and #system-alerts — these require action from you. The other channels are informational.</Tip>

            <SectionTitle>How It All Flows Together</SectionTitle>
            <div className="bg-muted/30 border border-border rounded-lg p-4 text-[12px] text-muted-foreground mb-4">
              <p className="mb-2"><strong className="text-foreground">Monthly Cycle Example:</strong></p>
              <p>1. Month starts → System tags all active clients with "ready-for-pipeline"</p>
              <p>2. GHL sends docs request email/SMS to each client automatically</p>
              <p>3. If no response → automatic reminders at Day 3, Day 5, Day 7</p>
              <p>4. Client texts DOCSDONE → Slack notification → Team verifies in TaxDome</p>
              <p>5. Team marks docs received in dashboard → Client moves past docs gate</p>
              <p>6. Bookkeeper fills in MER (auto-filled from QBO if connected)</p>
              <p>7. Bookkeeper clicks "Submit for Review" → Jessica gets Slack notification</p>
              <p>8. Jessica reviews and clicks "Approve" → Cycle complete</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* AUTOMATION REFERENCE                                          */}
        {/* ============================================================ */}
        <AccordionItem value="workflows" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Automation Reference (All 17 Workflows)
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <P>These automations run in the background. You don't need to manage them — they trigger automatically. This table is for reference so you understand what's happening behind the scenes.</P>
            <SopTable
              headers={["#", "Name", "When It Runs", "What It Does"]}
              rows={[
                ["WF1", "Bookkeeping Automation", "When \"ready-for-pipeline\" tag is added", "Sends docs request email + SMS to client, then automatic reminders at Day 3, Day 5, and Day 7 if no response"],
                ["WF2", "Cleanup Workflow", "When \"ready-for-cleanup\" tag is added", "Same reminder sequence as WF1 but for cleanup cycle clients"],
                ["WF3", "MER Slack Modal", "When someone uses the /mer Slack command", "Opens the MER submission form in Slack and processes the submission"],
                ["WF4", "Monthly Auto-Trigger", "Beginning of each month (or manually)", "Tags all active clients with \"ready-for-pipeline\" to start everyone's monthly cycle"],
                ["WF5", "MER Slash Commands", "Slack slash commands", "Handles /mer and other Slack commands"],
                ["WF6", "Dashboard Actions", "When you click an action button", "Processes the action — sends the email/SMS, updates tags, logs to Slack"],
                ["WF7a", "QBO Connect", "When you click \"Connect QBO\"", "Handles the QuickBooks login and saves the connection"],
                ["WF7b", "QBO Daily Sync", "Every day at 7:00 AM", "Pulls income/expenses from each connected client's QuickBooks"],
                ["WF8", "MER Submit", "When a MER is submitted", "Saves the MER data, updates the client's status, notifies the team"],
                ["WF9", "Day 21 Escalation", "Scheduled check", "Alerts the team when a client has been stuck in the pipeline for 21+ days"],
                ["WF10", "AI Categorization", "On demand", "Uses AI to categorize uncategorized QBO transactions"],
                ["WF11", "Tax Cycle", "When you start/complete a tax cycle", "Updates the client's tax status and posts TaxDome instructions to Slack"],
                ["WF12", "Keep-Alive Ping", "Every 5 minutes", "Keeps the automation server running (technical maintenance)"],
                ["WF13", "Docs Claimed", "When a client texts DOCSDONE", "Marks docs as claimed, posts to #docs-verification for team to verify"],
                ["WF14", "Junk Cleanup", "Scheduled", "Removes test/junk contacts from GHL (maintenance)"],
                ["WF15", "Firm QBO Connect", "When firm QBO is connected", "Handles the firm's QuickBooks login for billing data"],
                ["WF16", "Billing Sync", "Every day at 8:00 AM", "Pulls billing data (balances, invoices, payments) from firm QuickBooks"],
                ["WF17", "Billing Field Update", "When you edit a billing field", "Saves your changes to service type, notification stage, or notes"],
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ============================================================ */}
        {/* TROUBLESHOOTING                                               */}
        {/* ============================================================ */}
        <AccordionItem value="troubleshooting" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            Troubleshooting Common Issues
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <SopTable
              headers={["Problem", "What to Check", "How to Fix"]}
              rows={[
                ["I can't log in", "Check your email and password are correct", "Click \"Forgot password?\" to reset. If you don't have an account, ask Jessica to create one."],
                ["A client is missing from the Clients page", "They might be missing the \"mer-workflow\" tag", "Go to GHL Active Clients → find the client → add the \"mer-workflow\" tag. If they're also missing \"active-client\", add that too."],
                ["QBO data isn't showing for a client", "The QBO connection may have expired", "Check Slack #system-alerts for sync errors. Go to Clients → click \"Connect QBO\" again to re-authorize."],
                ["An action button isn't working", "The automation server might be down", "Wait 1 minute and try again. If it still fails, check Slack #system-alerts for error messages. Notify Jerick if the issue persists."],
                ["Billing data looks old", "The 8:00 AM sync may have failed", "Check #system-alerts for billing sync errors. Data refreshes automatically every morning — it should update by the next day."],
                ["A client is stuck in the pipeline", "Check if they've been stuck for 21+ days", "Look for Day 21 escalation alerts in Slack. Follow up with the client manually. If documents are received, mark them as received in the dashboard."],
                ["MER submission shows an error", "Could be a duplicate submission", "If the error says \"duplicate,\" use \"Update MER\" instead of \"Add MER\" — the client already has an entry for that month."],
                ["I changed a notification stage by accident", "Can't undo after save", "The notification was already sent. Note it in the client's billing notes field so the team is aware."],
                ["Dashboard is loading slowly", "Could be a large data load", "Refresh the page. If it persists, try clearing your browser cache (Ctrl+Shift+Delete → clear cached files → refresh)."],
                ["I don't see a page in the sidebar", "Your role may not have access", "Bookkeepers can't see GHL Active Clients, Master Bookkeeping Cycle, Tax Management, MER History, Status Snapshots, Cleanup Tracker, or Developer. If you need access, ask Jessica."],
              ]}
            />
            <Tip>When in doubt, check the Slack <strong>#system-alerts</strong> channel first — most system issues post an error message there. If nothing is there and the issue persists, notify Jerick.</Tip>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function UserGuidePage() {
  const [active, setActive] = useState<Guide | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          User Guide
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight text-balance">
          Internal procedures & how-to documents
        </h2>
        <p className="text-[13px] text-muted-foreground max-w-2xl">
          Browse PDF guides or expand the SOP reference for step-by-step instructions on every process.
        </p>
      </div>

      <Tabs defaultValue="sop" className="w-full">
        <TabsList>
          <TabsTrigger value="sop" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            SOP Reference
          </TabsTrigger>
          <TabsTrigger value="guides" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            PDF Guides
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sop" className="mt-4">
          <SOPContent />
        </TabsContent>

        <TabsContent value="guides" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {guides.map((g, i) => (
              <motion.button
                key={g.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                onClick={() => setActive(g)}
                aria-label={`Open ${g.title} (PDF)`}
                className="group text-left rounded-xl border border-border bg-card p-5 shadow-card hover:border-primary/40 hover:shadow-card-hover transition-[box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-[18px] w-[18px]" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-display text-base font-semibold text-foreground truncate" title={g.title}>
                        {g.title}
                      </h2>
                      <ChevronRight
                        className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-all duration-150"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
                      {g.description}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary">
                      <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        PDF
                      </span>
                      Click to open
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <PdfViewerModal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.title ?? ""}
        fileId={active?.fileId ?? ""}
      />
    </div>
  );
}
