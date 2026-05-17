import type { Client } from "@/data/mockData";

export interface ComplianceCheck {
  label: string;
  passed: boolean;
  detail?: string;
}

/**
 * Mirrors the rules used in services/googleSheets.ts (deriveComplianceStatus).
 * A client is "Compliant" only when ALL of the following pass.
 */
export function getComplianceChecks(c: Client): ComplianceCheck[] {
  const bank = (c.bankTransactions ?? "").trim();
  const bankPassed = bank !== "" && !bank.toLowerCase().includes("missing");
  const stmtPassed = (c.statementRequestStatus ?? "").trim().toLowerCase() === "received";
  return [
    { label: "Bank Transactions", passed: bankPassed, detail: bank || "—" },
    { label: "Uncategorized Transactions = 0", passed: c.uncategorizedTransactions === 0, detail: String(c.uncategorizedTransactions) },
    { label: "Unapplied Payments = 0", passed: c.unappliedPayments === 0, detail: String(c.unappliedPayments) },
    { label: "Statement Request Status = Received", passed: stmtPassed, detail: c.statementRequestStatus || "—" },
    { label: "Prev Month Notes Approved", passed: !!c.prevMonthNotesApproved, detail: c.prevMonthNotesApproved ? "Yes" : "No" },
    { label: "Financials Sent To Client", passed: !!c.financialsSentToClient, detail: c.financialsSentToClient ? "Yes" : "No" },
    { label: "Books Closed In QB", passed: !!c.booksClosedInQB, detail: c.booksClosedInQB ? "Yes" : "No" },
  ];
}

export const COMPLIANCE_RULE_SUMMARY: Record<"Compliant" | "Non-Compliant" | "On Hold", string> = {
  Compliant: "All 7 checks must pass: Bank Transactions present (not missing), 0 Uncategorized, 0 Unapplied Payments, Statement Request = Received, Prev Month Notes Approved, Financials Sent, and Books Closed In QB.",
  "Non-Compliant": "Triggered when any of the 7 compliance checks fail and the client is not flagged as On Hold.",
  "On Hold": "Triggered when the sheet's Status column contains \"hold\" (case-insensitive). On Hold overrides the other checks.",
};
