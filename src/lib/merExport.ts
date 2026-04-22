/**
 * MER Report Export Utilities
 * Generates XLSX (matching original MER template), PDF, and CSV exports
 * from filtered MER history rows.
 */
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MerHistoryRow } from "@/services/googleSheets";
import type { Client } from "@/data/mockData";
import { getKPIMetrics, getComplianceBreakdown, groupHistoryByMonth } from "@/hooks/useSheetData";

function bool(v: boolean) { return v ? "Yes" : "No"; }
function dash(n: number) { return n === 0 ? "-" : n; }

function buildKpiSheet(clients: Client[], rangeLabel: string) {
  const kpi = getKPIMetrics(clients);
  const bd = getComplianceBreakdown(clients);
  const rows: (string | number)[][] = [
    ["KPI Metrics Overview - Brant & Associates"],
    [`Range: ${rangeLabel}`],
    [],
    ["Summary Overview", ""],
    ["Total Clients", kpi.total],
    ["Total Compliant Clients", kpi.compliant],
    ["On Hold – Bank Statements Not Yet Received", kpi.onHold],
    ["Total Non-Compliant Clients", kpi.nonCompliant],
    ["Overall Completion %", `${kpi.avgCompletion}%`],
    [],
    ["Compliance Breakdown", ""],
    ["Bank Transactions Completion %", `${bd.bankPct}%`],
    ["Uncategorized Transactions Completion %", `${bd.uncatPct}%`],
    ["Unapplied Payments Resolution %", `${bd.unappliedPct}%`],
    ["Statement Requests Completion %", `${bd.stmtPct}%`],
    [],
    ["Risk Indicators", ""],
    ["Clients Not Reconciled Last Month", kpi.notReconciled],
    ["Outstanding Statement Requests (Not Received)", kpi.outstandingStatements],
    ["Clients Without Updated Notes (No)", kpi.withoutNotes],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 50 }, { wch: 15 }];
  return ws;
}

function buildClientSheet(clients: Client[], monthLabel: string) {
  const header = [
    "Client Name", "Client Type", "Bookkeeper", "Bank Transactions",
    "Uncategorized Transactions", "Transactions Without Payees",
    "Undeposited Funds", "Unapplied Payments", "Statement Request Status",
    "Last Reconciled Date", "Prev Month Notes Approved",
    "Financials Sent To Client", "Books Closed In QB",
    "Completion %", "Compliance Status",
  ];
  const rows: (string | number)[][] = [
    [monthLabel || "All Months"],
    [],
    header,
    ...clients.map((c) => [
      c.name, c.clientType, c.bookkeeper, c.bankTransactions || "-",
      dash(c.uncategorizedTransactions), dash(c.transactionsWithoutPayees),
      dash(c.undepositedFunds), dash(c.unappliedPayments),
      c.statementRequestStatus || "-", c.lastReconciledDate || "-",
      bool(c.prevMonthNotesApproved), bool(c.financialsSentToClient),
      bool(c.booksClosedInQB), `${c.completionPct}%`, c.complianceStatus,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 36 }, { wch: 13 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 12 }, { wch: 16 },
  ];
  return ws;
}

function buildTrendsSheet(history: MerHistoryRow[]) {
  const grouped = groupHistoryByMonth(history);
  const months = Array.from(grouped.entries()).sort(
    (a, b) => (a[1][0]?.id ?? "").localeCompare(b[1][0]?.id ?? "")
  );
  // Sort by monthDate via lookup
  const monthOrder = new Map<string, string>();
  for (const r of history) if (!monthOrder.has(r.month)) monthOrder.set(r.month, r.monthDate);
  const sortedMonths = Array.from(grouped.keys()).sort((a, b) =>
    (monthOrder.get(a) ?? "").localeCompare(monthOrder.get(b) ?? "")
  );

  const rows: (string | number)[][] = [
    ["Monthly Trends"], [],
    ["Month", "Compliant", "Non-Compliant", "Avg Completion %"],
  ];
  for (const m of sortedMonths) {
    const cs = grouped.get(m)!;
    const compliant = cs.filter((c) => c.complianceStatus === "Compliant").length;
    const nonCompliant = cs.filter((c) => c.complianceStatus === "Non-Compliant").length;
    const avg = cs.length ? Math.round(cs.reduce((s, c) => s + c.completionPct, 0) / cs.length) : 0;
    rows.push([m, compliant, nonCompliant, `${avg}%`]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 18 }];
  return ws;
}

/* ---------------- XLSX export ---------------- */

export interface ExportOptions {
  history: MerHistoryRow[];        // already date-filtered
  rangeLabel: string;              // e.g. "May 2025" or "Jan 2025 – Jul 2025"
  fileBaseName: string;            // without extension
}

export function exportXLSX({ history, rangeLabel, fileBaseName }: ExportOptions) {
  const wb = XLSX.utils.book_new();
  const grouped = groupHistoryByMonth(history);
  // Aggregate "all in range" snapshot = latest row per client across the range
  const latestByClient = new Map<string, MerHistoryRow>();
  for (const r of history) {
    const ex = latestByClient.get(r.name);
    if (!ex || r.timestampMs >= ex.timestampMs) latestByClient.set(r.name, r);
  }
  const aggClients = Array.from(latestByClient.values()).map((r, i) => ({ ...r, id: String(i + 1) }));

  XLSX.utils.book_append_sheet(wb, buildKpiSheet(aggClients, rangeLabel), "KPI Overview");

  // Per-month client sheets (or single sheet if 1 month)
  const sortedMonths = Array.from(grouped.keys()).sort();
  if (sortedMonths.length === 1) {
    XLSX.utils.book_append_sheet(wb, buildClientSheet(grouped.get(sortedMonths[0])!, sortedMonths[0]), "Client Review");
  } else {
    for (const m of sortedMonths) {
      // Excel sheet names ≤ 31 chars, no special chars
      const safe = m.replace(/[\\/?*[\]]/g, "").slice(0, 28);
      XLSX.utils.book_append_sheet(wb, buildClientSheet(grouped.get(m)!, m), safe);
    }
  }
  XLSX.utils.book_append_sheet(wb, buildTrendsSheet(history), "Monthly Trends");

  XLSX.writeFile(wb, `${fileBaseName}.xlsx`);
}

/* ---------------- CSV export (raw flat rows) ---------------- */

export function exportCSV({ history, fileBaseName }: ExportOptions) {
  const header = [
    "Month", "Submitted At", "Submitted By", "Client Name", "Client Type", "Bookkeeper",
    "Bank Transactions", "Uncategorized Transactions", "Transactions Without Payees",
    "Undeposited Funds", "Unapplied Payments", "Statement Request Status",
    "Last Reconciled Date", "Prev Month Notes Approved", "Financials Sent To Client",
    "Books Closed In QB", "Completion %", "Compliance Status",
  ];
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = history.map((r) => [
    r.month, r.timestamp, r.submittedBy, r.name, r.clientType, r.bookkeeper,
    r.bankTransactions, r.uncategorizedTransactions, r.transactionsWithoutPayees,
    r.undepositedFunds, r.unappliedPayments, r.statementRequestStatus,
    r.lastReconciledDate, bool(r.prevMonthNotesApproved), bool(r.financialsSentToClient),
    bool(r.booksClosedInQB), r.completionPct, r.complianceStatus,
  ].map(escape).join(","));
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileBaseName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------------- PDF export ---------------- */

export function exportPDF({ history, rangeLabel, fileBaseName }: ExportOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const latestByClient = new Map<string, MerHistoryRow>();
  for (const r of history) {
    const ex = latestByClient.get(r.name);
    if (!ex || r.timestampMs >= ex.timestampMs) latestByClient.set(r.name, r);
  }
  const aggClients = Array.from(latestByClient.values()).map((r, i) => ({ ...r, id: String(i + 1) }));
  const kpi = getKPIMetrics(aggClients);
  const bd = getComplianceBreakdown(aggClients);

  // Title page
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("Brant & Associates – MER Report", 40, 50);
  doc.setFontSize(11);
  doc.setTextColor(110, 110, 110);
  doc.text(`Range: ${rangeLabel}`, 40, 70);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 86);

  // KPI table
  autoTable(doc, {
    startY: 110,
    head: [["KPI Metrics Overview", "Value"]],
    body: [
      ["Total Clients", String(kpi.total)],
      ["Total Compliant Clients", String(kpi.compliant)],
      ["On Hold", String(kpi.onHold)],
      ["Total Non-Compliant Clients", String(kpi.nonCompliant)],
      ["Overall Completion %", `${kpi.avgCompletion}%`],
      ["Bank Transactions Completion %", `${bd.bankPct}%`],
      ["Uncategorized Transactions Completion %", `${bd.uncatPct}%`],
      ["Unapplied Payments Resolution %", `${bd.unappliedPct}%`],
      ["Statement Requests Completion %", `${bd.stmtPct}%`],
      ["Clients Not Reconciled", String(kpi.notReconciled)],
      ["Outstanding Statement Requests", String(kpi.outstandingStatements)],
      ["Clients Without Updated Notes", String(kpi.withoutNotes)],
    ],
    headStyles: { fillColor: [156, 90, 110], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 0: { cellWidth: 280 }, 1: { cellWidth: 90 } },
  });

  // Per-month client tables
  const grouped = groupHistoryByMonth(history);
  const monthOrder = new Map<string, string>();
  for (const r of history) if (!monthOrder.has(r.month)) monthOrder.set(r.month, r.monthDate);
  const sortedMonths = Array.from(grouped.keys()).sort((a, b) =>
    (monthOrder.get(a) ?? "").localeCompare(monthOrder.get(b) ?? "")
  );

  for (const m of sortedMonths) {
    const cs = grouped.get(m)!;
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(`Month-End Review – ${m}`, 40, 40);
    autoTable(doc, {
      startY: 56,
      head: [[
        "Client", "Type", "Bookkeeper", "Bank", "Uncat.", "No-Payee",
        "Undep.", "Unapp.", "Stmt", "Reconciled", "Notes", "Fin Sent", "Closed", "%", "Status",
      ]],
      body: cs.map((c) => [
        c.name, c.clientType, c.bookkeeper, c.bankTransactions || "-",
        String(dash(c.uncategorizedTransactions)), String(dash(c.transactionsWithoutPayees)),
        String(dash(c.undepositedFunds)), String(dash(c.unappliedPayments)),
        c.statementRequestStatus || "-", c.lastReconciledDate || "-",
        bool(c.prevMonthNotesApproved), bool(c.financialsSentToClient),
        bool(c.booksClosedInQB), `${c.completionPct}%`, c.complianceStatus,
      ]),
      headStyles: { fillColor: [156, 90, 110], textColor: 255, fontStyle: "bold", fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 50 },
        2: { cellWidth: 55 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 14) {
          const v = data.cell.raw as string;
          if (v === "Compliant") data.cell.styles.textColor = [33, 130, 90];
          else if (v === "Non-Compliant") data.cell.styles.textColor = [180, 50, 50];
        }
      },
    });
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 80, doc.internal.pageSize.getHeight() - 20);
  }

  doc.save(`${fileBaseName}.pdf`);
}
