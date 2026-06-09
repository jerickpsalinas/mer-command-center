/**
 * MER Report Export Utilities
 * Generates richly-styled XLSX (with colors, banded rows, conditional formatting),
 * PDF (with KPI cards and bar charts rendered to canvas), and CSV exports
 * from filtered MER history rows.
 */
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MerHistoryRow } from "@/services/googleSheets";
import type { Client } from "@/data/mockData";
import { getKPIMetrics, getComplianceBreakdown, groupHistoryByMonth } from "@/hooks/useSheetData";
import { autoSizeRowHeights, workbookToHtml } from "@/lib/xlsxRender";
import type { ExportPayload } from "@/lib/reportExports";

/* ============= Brand palette (matches Gilded Rose aesthetic) ============= */
const BRAND = {
  primary: "9C5A6E",       // rose
  primaryDark: "6B3F4D",
  accent: "C8A27A",        // gold
  bgDark: "1A1614",
  bgPanel: "2A2320",
  textOnDark: "F5EFEA",
  textMuted: "BFAFA5",
  success: "21825A",
  successBg: "DCEFE3",
  danger: "B43232",
  dangerBg: "F4DADA",
  warn: "C8851F",
  warnBg: "F8E6C6",
  zebra: "F7F2EE",
  white: "FFFFFF",
  border: "E5DAD2",
} as const;

const RGB = {
  primary: [156, 90, 110] as [number, number, number],
  primaryDark: [107, 63, 77] as [number, number, number],
  accent: [200, 162, 122] as [number, number, number],
  bgDark: [26, 22, 20] as [number, number, number],
  textOnDark: [245, 239, 234] as [number, number, number],
  textMuted: [150, 140, 132] as [number, number, number],
  success: [33, 130, 90] as [number, number, number],
  successBg: [220, 239, 227] as [number, number, number],
  danger: [180, 50, 50] as [number, number, number],
  dangerBg: [244, 218, 218] as [number, number, number],
  warn: [200, 133, 31] as [number, number, number],
  warnBg: [248, 230, 198] as [number, number, number],
  zebra: [247, 242, 238] as [number, number, number],
  border: [229, 218, 210] as [number, number, number],
};

/* ============= Helpers ============= */
function bool(v: boolean) { return v ? "Yes" : "No"; }
function dash(n: number) { return n === 0 ? "-" : n; }

type CellStyle = NonNullable<XLSX.CellObject["s"]>;

const border = (color: string = BRAND.border) => ({
  top: { style: "thin", color: { rgb: color } },
  bottom: { style: "thin", color: { rgb: color } },
  left: { style: "thin", color: { rgb: color } },
  right: { style: "thin", color: { rgb: color } },
});

const titleStyle: CellStyle = {
  font: { name: "Calibri", sz: 18, bold: true, color: { rgb: BRAND.white } },
  fill: { patternType: "solid", fgColor: { rgb: BRAND.primary } },
  alignment: { horizontal: "left", vertical: "center", indent: 1 },
};
const subtitleStyle: CellStyle = {
  font: { name: "Calibri", sz: 11, italic: true, color: { rgb: BRAND.white } },
  fill: { patternType: "solid", fgColor: { rgb: BRAND.primaryDark } },
  alignment: { horizontal: "left", vertical: "center", indent: 1 },
};
const sectionStyle: CellStyle = {
  font: { name: "Calibri", sz: 12, bold: true, color: { rgb: BRAND.white } },
  fill: { patternType: "solid", fgColor: { rgb: BRAND.primaryDark } },
  alignment: { horizontal: "left", vertical: "center", indent: 1 },
  border: border(),
};
const headerStyle: CellStyle = {
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: BRAND.white } },
  fill: { patternType: "solid", fgColor: { rgb: BRAND.primary } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: border(),
};
const labelStyle: CellStyle = {
  font: { name: "Calibri", sz: 10, color: { rgb: "333333" } },
  alignment: { horizontal: "left", vertical: "center", indent: 1 },
  border: border(),
};
const valueStyle: CellStyle = {
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: BRAND.primaryDark } },
  alignment: { horizontal: "right", vertical: "center", indent: 1 },
  border: border(),
};
const cellStyle = (zebra: boolean): CellStyle => ({
  font: { name: "Calibri", sz: 9, color: { rgb: "333333" } },
  fill: zebra ? { patternType: "solid", fgColor: { rgb: BRAND.zebra } } : undefined,
  alignment: { horizontal: "left", vertical: "center", wrapText: true, indent: 1 },
  border: border(),
});
const numCellStyle = (zebra: boolean): CellStyle => ({
  ...cellStyle(zebra),
  alignment: { horizontal: "right", vertical: "center", indent: 1 },
});
const statusStyle = (status: string, zebra: boolean): CellStyle => {
  const base = cellStyle(zebra);
  if (status === "Compliant") {
    return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: BRAND.success } }, fill: { patternType: "solid", fgColor: { rgb: BRAND.successBg } }, alignment: { horizontal: "center", vertical: "center" } };
  }
  if (status === "Non-Compliant") {
    return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: BRAND.danger } }, fill: { patternType: "solid", fgColor: { rgb: BRAND.dangerBg } }, alignment: { horizontal: "center", vertical: "center" } };
  }
  return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: BRAND.warn } }, fill: { patternType: "solid", fgColor: { rgb: BRAND.warnBg } }, alignment: { horizontal: "center", vertical: "center" } };
};
const pctStyle = (pct: number, zebra: boolean): CellStyle => {
  const base = numCellStyle(zebra);
  if (pct >= 90) return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: BRAND.success } } };
  if (pct >= 60) return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: BRAND.warn } } };
  return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: BRAND.danger } } };
};

function setCell(ws: XLSX.WorkSheet, addr: string, value: string | number, style?: CellStyle) {
  const cell: XLSX.CellObject = {
    v: value,
    t: typeof value === "number" ? "n" : "s",
    s: style,
  };
  ws[addr] = cell;
}

function expandRange(ws: XLSX.WorkSheet, addr: string) {
  const range = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  const cell = XLSX.utils.decode_cell(addr);
  range.e.r = Math.max(range.e.r, cell.r);
  range.e.c = Math.max(range.e.c, cell.c);
  ws["!ref"] = XLSX.utils.encode_range(range);
}

function placeRow(ws: XLSX.WorkSheet, row: number, values: (string | number)[], styles: (CellStyle | undefined)[]) {
  values.forEach((v, c) => {
    const addr = XLSX.utils.encode_cell({ r: row, c });
    setCell(ws, addr, v, styles[c]);
    expandRange(ws, addr);
  });
}

/* ============= XLSX builders ============= */

function buildKpiSheet(clients: Client[], rangeLabel: string): XLSX.WorkSheet {
  const kpi = getKPIMetrics(clients);
  const bd = getComplianceBreakdown(clients);
  const ws: XLSX.WorkSheet = { "!ref": "A1" };

  // Title block
  placeRow(ws, 0, ["KPI Metrics Overview – Greenfield Bookkeeping", "", "", ""], [titleStyle, titleStyle, titleStyle, titleStyle]);
  placeRow(ws, 1, [`Range: ${rangeLabel}    •    Generated: ${new Date().toLocaleString()}`, "", "", ""], [subtitleStyle, subtitleStyle, subtitleStyle, subtitleStyle]);
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
  ];
  ws["!rows"] = [{ hpt: 32 }, { hpt: 22 }, { hpt: 8 }];

  // KPI cards row (4 cards)
  const cardLabel = (txt: string): CellStyle => ({
    font: { name: "Calibri", sz: 9, bold: true, color: { rgb: BRAND.white } },
    fill: { patternType: "solid", fgColor: { rgb: BRAND.primaryDark } },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(BRAND.primaryDark),
  });
  const cardValue = (color: string): CellStyle => ({
    font: { name: "Calibri", sz: 22, bold: true, color: { rgb: color } },
    fill: { patternType: "solid", fgColor: { rgb: BRAND.zebra } },
    alignment: { horizontal: "center", vertical: "center" },
    border: border(BRAND.primaryDark),
  });
  placeRow(ws, 3, ["TOTAL CLIENTS", "COMPLIANT", "NON-COMPLIANT", "AVG COMPLETION"], [cardLabel(""), cardLabel(""), cardLabel(""), cardLabel("")]);
  placeRow(ws, 4, [kpi.total, kpi.compliant, kpi.nonCompliant, `${kpi.avgCompletion}%`], [
    cardValue(BRAND.primary),
    cardValue(BRAND.success),
    cardValue(BRAND.danger),
    cardValue(BRAND.accent),
  ]);
  ws["!rows"][3] = { hpt: 18 };
  ws["!rows"][4] = { hpt: 38 };

  // Compliance breakdown section
  placeRow(ws, 6, ["Compliance Breakdown", ""], [sectionStyle, sectionStyle]);
  ws["!merges"].push({ s: { r: 6, c: 0 }, e: { r: 6, c: 3 } });
  placeRow(ws, 7, ["Metric", "Completion %", "", ""], [headerStyle, headerStyle, headerStyle, headerStyle]);
  ws["!merges"].push({ s: { r: 7, c: 1 }, e: { r: 7, c: 3 } });

  const breakdownItems: [string, number][] = [
    ["Bank Transactions", bd.bankPct],
    ["Uncategorized Transactions", bd.uncatPct],
    ["Unapplied Payments Resolution", bd.unappliedPct],
    ["Statement Requests", bd.stmtPct],
  ];
  breakdownItems.forEach(([label, pct], i) => {
    const row = 8 + i;
    placeRow(ws, row, [label, `${pct}%`, "", ""], [labelStyle, pctStyle(pct, i % 2 === 0), labelStyle, labelStyle]);
    ws["!merges"]!.push({ s: { r: row, c: 1 }, e: { r: row, c: 3 } });
  });

  // Risk Indicators section
  const riskStart = 8 + breakdownItems.length + 1;
  placeRow(ws, riskStart, ["Risk Indicators", ""], [sectionStyle, sectionStyle]);
  ws["!merges"].push({ s: { r: riskStart, c: 0 }, e: { r: riskStart, c: 3 } });
  placeRow(ws, riskStart + 1, ["Indicator", "Count", "", ""], [headerStyle, headerStyle, headerStyle, headerStyle]);
  ws["!merges"].push({ s: { r: riskStart + 1, c: 1 }, e: { r: riskStart + 1, c: 3 } });

  const riskItems: [string, number][] = [
    ["On Hold – Bank Statements Not Received", kpi.onHold],
    ["Clients Not Reconciled Last Month", kpi.notReconciled],
    ["Outstanding Statement Requests", kpi.outstandingStatements],
    ["Clients Without Updated Notes", kpi.withoutNotes],
  ];
  riskItems.forEach(([label, n], i) => {
    const row = riskStart + 2 + i;
    const danger = n > 0;
    const vstyle: CellStyle = {
      ...numCellStyle(i % 2 === 0),
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: danger ? BRAND.danger : BRAND.success } },
    };
    placeRow(ws, row, [label, n, "", ""], [labelStyle, vstyle, labelStyle, labelStyle]);
    ws["!merges"]!.push({ s: { r: row, c: 1 }, e: { r: row, c: 3 } });
  });

  ws["!cols"] = [{ wch: 42 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  return ws;
}

function buildClientSheet(clients: Client[], monthLabel: string): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = { "!ref": "A1" };
  const headers = [
    "Client Name", "Type", "Bookkeeper", "Bank Txns", "Uncat.", "No-Payee",
    "Undep.", "Unapp.", "Stmt Status", "Last Reconciled",
    "Notes Approved", "Fin. Sent", "Books Closed", "Completion %", "Compliance",
  ];

  placeRow(ws, 0, [`Month-End Review – ${monthLabel || "All Months"}`, ...Array(headers.length - 1).fill("")],
    Array(headers.length).fill(titleStyle));
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
  placeRow(ws, 1, [`${clients.length} clients    •    Generated: ${new Date().toLocaleString()}`, ...Array(headers.length - 1).fill("")],
    Array(headers.length).fill(subtitleStyle));
  ws["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } });
  ws["!rows"] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 8 }, { hpt: 32 }];

  placeRow(ws, 3, headers, Array(headers.length).fill(headerStyle));

  clients.forEach((c, i) => {
    const row = 4 + i;
    const z = i % 2 === 1;
    const values: (string | number)[] = [
      c.name, c.clientType, c.bookkeeper, c.bankTransactions || "-",
      String(dash(c.uncategorizedTransactions)), String(dash(c.transactionsWithoutPayees)),
      String(dash(c.undepositedFunds)), String(dash(c.unappliedPayments)),
      c.statementRequestStatus || "-", c.lastReconciledDate || "-",
      bool(c.prevMonthNotesApproved), bool(c.financialsSentToClient),
      bool(c.booksClosedInQB), `${c.completionPct}%`, c.complianceStatus,
    ];
    const styles: CellStyle[] = [
      cellStyle(z), cellStyle(z), cellStyle(z), numCellStyle(z),
      numCellStyle(z), numCellStyle(z), numCellStyle(z), numCellStyle(z),
      cellStyle(z), cellStyle(z),
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" }, font: { name: "Calibri", sz: 9, color: { rgb: c.prevMonthNotesApproved ? BRAND.success : BRAND.danger } } },
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" }, font: { name: "Calibri", sz: 9, color: { rgb: c.financialsSentToClient ? BRAND.success : BRAND.danger } } },
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" }, font: { name: "Calibri", sz: 9, color: { rgb: c.booksClosedInQB ? BRAND.success : BRAND.danger } } },
      pctStyle(c.completionPct, z),
      statusStyle(c.complianceStatus, z),
    ];
    placeRow(ws, row, values, styles);
  });

  ws["!cols"] = [
    { wch: 32 }, { wch: 11 }, { wch: 12 }, { wch: 11 }, { wch: 9 }, { wch: 9 },
    { wch: 9 }, { wch: 9 }, { wch: 18 }, { wch: 14 }, { wch: 13 }, { wch: 11 },
    { wch: 12 }, { wch: 12 }, { wch: 14 },
  ];
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + clients.length, c: headers.length - 1 } }) };
  ws["!freeze"] = { xSplit: 1, ySplit: 4 };
  return ws;
}

function buildTrendsSheet(history: MerHistoryRow[]): XLSX.WorkSheet {
  const grouped = groupHistoryByMonth(history);
  const monthOrder = new Map<string, string>();
  for (const r of history) if (!monthOrder.has(r.month)) monthOrder.set(r.month, r.monthDate);
  const sortedMonths = Array.from(grouped.keys()).sort((a, b) =>
    (monthOrder.get(a) ?? "").localeCompare(monthOrder.get(b) ?? "")
  );

  const ws: XLSX.WorkSheet = { "!ref": "A1" };
  const headers = ["Month", "Compliant", "Non-Compliant", "Avg Completion %", "Total Clients", "Trend"];

  placeRow(ws, 0, ["Monthly Trends", ...Array(headers.length - 1).fill("")], Array(headers.length).fill(titleStyle));
  placeRow(ws, 1, [`${sortedMonths.length} months    •    Generated: ${new Date().toLocaleString()}`, ...Array(headers.length - 1).fill("")], Array(headers.length).fill(subtitleStyle));
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
  ];
  ws["!rows"] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 8 }, { hpt: 28 }];
  placeRow(ws, 3, headers, Array(headers.length).fill(headerStyle));

  sortedMonths.forEach((m, i) => {
    const cs = grouped.get(m)!;
    const compliant = cs.filter((c) => c.complianceStatus === "Compliant").length;
    const nonCompliant = cs.filter((c) => c.complianceStatus === "Non-Compliant").length;
    const avg = cs.length ? Math.round(cs.reduce((s, c) => s + c.completionPct, 0) / cs.length) : 0;
    const z = i % 2 === 1;
    const barLen = Math.round(avg / 5); // 0..20
    const bar = "█".repeat(barLen) + "░".repeat(20 - barLen);
    const styles: CellStyle[] = [
      cellStyle(z),
      { ...numCellStyle(z), font: { name: "Calibri", sz: 10, bold: true, color: { rgb: BRAND.success } } },
      { ...numCellStyle(z), font: { name: "Calibri", sz: 10, bold: true, color: { rgb: BRAND.danger } } },
      pctStyle(avg, z),
      numCellStyle(z),
      { ...cellStyle(z), font: { name: "Consolas", sz: 9, color: { rgb: BRAND.primary } }, alignment: { horizontal: "left", vertical: "center" } },
    ];
    placeRow(ws, 4 + i, [m, compliant, nonCompliant, `${avg}%`, cs.length, bar], styles);
  });

  ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 24 }];
  ws["!freeze"] = { xSplit: 0, ySplit: 4 };
  return ws;
}

/* ============= XLSX export ============= */

export interface ExportOptions {
  history: MerHistoryRow[];
  rangeLabel: string;
  fileBaseName: string;
}

export function exportXLSX({ history, rangeLabel, fileBaseName }: ExportOptions): ExportPayload {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `MER Report – ${rangeLabel}`,
    Subject: "Month-End Review",
    Author: "Greenfield Bookkeeping",
    CreatedDate: new Date(),
  };

  const grouped = groupHistoryByMonth(history);
  const latestByClient = new Map<string, MerHistoryRow>();
  for (const r of history) {
    const ex = latestByClient.get(r.name);
    if (!ex || r.timestampMs >= ex.timestampMs) latestByClient.set(r.name, r);
  }
  const aggClients = Array.from(latestByClient.values()).map((r, i) => ({ ...r, id: String(i + 1) }));

  const kpiSheet = buildKpiSheet(aggClients, rangeLabel);
  autoSizeRowHeights(kpiSheet, { startRow: 6 });
  XLSX.utils.book_append_sheet(wb, kpiSheet, "KPI Overview");

  const monthOrder = new Map<string, string>();
  for (const r of history) if (!monthOrder.has(r.month)) monthOrder.set(r.month, r.monthDate);
  const sortedMonths = Array.from(grouped.keys()).sort((a, b) =>
    (monthOrder.get(a) ?? "").localeCompare(monthOrder.get(b) ?? "")
  );

  if (sortedMonths.length === 1) {
    const cs = buildClientSheet(grouped.get(sortedMonths[0])!, sortedMonths[0]);
    autoSizeRowHeights(cs);
    XLSX.utils.book_append_sheet(wb, cs, "Client Review");
  } else {
    for (const m of sortedMonths) {
      const safe = m.replace(/[\\/?*[\]]/g, "").slice(0, 28);
      const cs = buildClientSheet(grouped.get(m)!, m);
      autoSizeRowHeights(cs);
      XLSX.utils.book_append_sheet(wb, cs, safe);
    }
  }
  const tr = buildTrendsSheet(history);
  autoSizeRowHeights(tr);
  XLSX.utils.book_append_sheet(wb, tr, "Monthly Trends");

  const arr = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  return { kind: "xlsx", blob, filename: `${fileBaseName}.xlsx`, wb, html: workbookToHtml(wb) };
}

/* ============= CSV export ============= */

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

/* ============= PDF export ============= */

/** Render a chart on offscreen canvas and return data URL */
function renderBarChartPNG(
  data: { label: string; value: number; color: [number, number, number] }[],
  opts: { width: number; height: number; title?: string; maxValue?: number; valueSuffix?: string }
): string {
  const c = document.createElement("canvas");
  const dpi = 2;
  c.width = opts.width * dpi;
  c.height = opts.height * dpi;
  const ctx = c.getContext("2d")!;
  ctx.scale(dpi, dpi);

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, opts.width, opts.height);

  // Title
  let topPad = 14;
  if (opts.title) {
    ctx.fillStyle = `rgb(${RGB.primaryDark.join(",")})`;
    ctx.font = "bold 13px Helvetica, Arial, sans-serif";
    ctx.fillText(opts.title, 12, 18);
    topPad = 30;
  }

  const chartLeft = 90;
  const chartTop = topPad;
  const chartRight = opts.width - 24;
  const chartBottom = opts.height - 24;
  const chartW = chartRight - chartLeft;
  const chartH = chartBottom - chartTop;
  const max = opts.maxValue ?? Math.max(1, ...data.map((d) => d.value));
  const suffix = opts.valueSuffix ?? "";

  // Gridlines
  ctx.strokeStyle = "#E5DAD2";
  ctx.lineWidth = 1;
  ctx.font = "9px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#999";
  for (let i = 0; i <= 4; i++) {
    const y = chartTop + (chartH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();
    const v = Math.round(max - (max * i) / 4);
    ctx.fillText(`${v}${suffix}`, 8, y + 3);
  }

  // Bars
  const slot = chartW / data.length;
  const barW = Math.min(38, slot * 0.55);
  data.forEach((d, i) => {
    const x = chartLeft + slot * i + (slot - barW) / 2;
    const h = max === 0 ? 0 : (d.value / max) * chartH;
    const y = chartBottom - h;
    // Bar
    ctx.fillStyle = `rgb(${d.color.join(",")})`;
    ctx.fillRect(x, y, barW, h);
    // Value label
    ctx.fillStyle = "#333";
    ctx.font = "bold 10px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${d.value}${suffix}`, x + barW / 2, y - 4);
    // Category label
    ctx.fillStyle = "#666";
    ctx.font = "9px Helvetica, Arial, sans-serif";
    const lbl = d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label;
    ctx.fillText(lbl, x + barW / 2, chartBottom + 14);
    ctx.textAlign = "left";
  });

  return c.toDataURL("image/png");
}

/** Donut chart (compliant vs non-compliant vs on-hold) */
function renderDonutPNG(
  segments: { label: string; value: number; color: [number, number, number] }[],
  opts: { width: number; height: number; title?: string; centerLabel?: string }
): string {
  const c = document.createElement("canvas");
  const dpi = 2;
  c.width = opts.width * dpi;
  c.height = opts.height * dpi;
  const ctx = c.getContext("2d")!;
  ctx.scale(dpi, dpi);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, opts.width, opts.height);

  if (opts.title) {
    ctx.fillStyle = `rgb(${RGB.primaryDark.join(",")})`;
    ctx.font = "bold 13px Helvetica, Arial, sans-serif";
    ctx.fillText(opts.title, 12, 18);
  }

  const cx = opts.width / 2 - 50;
  const cy = opts.height / 2 + 8;
  const outer = Math.min(opts.width, opts.height) / 2 - 30;
  const inner = outer * 0.6;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let start = -Math.PI / 2;
  segments.forEach((seg) => {
    const angle = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.fillStyle = `rgb(${seg.color.join(",")})`;
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outer, start, start + angle);
    ctx.closePath();
    ctx.fill();
    start += angle;
  });
  // Inner hole
  ctx.beginPath();
  ctx.fillStyle = "#FFFFFF";
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fill();

  if (opts.centerLabel) {
    ctx.fillStyle = `rgb(${RGB.primaryDark.join(",")})`;
    ctx.font = "bold 18px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(opts.centerLabel, cx, cy + 6);
    ctx.textAlign = "left";
  }

  // Legend
  const legendX = cx + outer + 24;
  let legendY = cy - segments.length * 10;
  ctx.font = "10px Helvetica, Arial, sans-serif";
  segments.forEach((seg) => {
    ctx.fillStyle = `rgb(${seg.color.join(",")})`;
    ctx.fillRect(legendX, legendY, 12, 12);
    ctx.fillStyle = "#333";
    ctx.fillText(`${seg.label}: ${seg.value}`, legendX + 18, legendY + 10);
    legendY += 20;
  });

  return c.toDataURL("image/png");
}

function drawKpiCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string, accent: [number, number, number]
) {
  // Card background
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...RGB.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 6, 6, "FD");
  // Accent bar
  doc.setFillColor(...accent);
  doc.roundedRect(x, y, 4, h, 2, 2, "F");
  // Label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...RGB.textMuted);
  doc.text(label.toUpperCase(), x + 12, y + 16);
  // Value
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...accent);
  doc.text(value, x + 12, y + 40);
}

export function exportPDF({ history, rangeLabel, fileBaseName }: ExportOptions): ExportPayload {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const FOOTER_RESERVE = 28; // matches footer band height + breathing room

  const latestByClient = new Map<string, MerHistoryRow>();
  for (const r of history) {
    const ex = latestByClient.get(r.name);
    if (!ex || r.timestampMs >= ex.timestampMs) latestByClient.set(r.name, r);
  }
  const aggClients = Array.from(latestByClient.values()).map((r, i) => ({ ...r, id: String(i + 1) }));
  const kpi = getKPIMetrics(aggClients);
  const bd = getComplianceBreakdown(aggClients);

  /* ----- Cover / Summary page ----- */
  // Header band
  doc.setFillColor(...RGB.primary);
  doc.rect(0, 0, pageW, 78, "F");
  doc.setFillColor(...RGB.primaryDark);
  doc.rect(0, 78, pageW, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("Greenfield Bookkeeping", margin, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("Month-End Review Report", margin, 58);
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`Range: ${rangeLabel}`, pageW - margin, 36, { align: "right" });
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 58, { align: "right" });

  // KPI Cards (drop below the band with safe gap)
  const cardY = 102;
  const cardH = 60;
  const gap = 12;
  const cardW = (pageW - margin * 2 - gap * 3) / 4;
  drawKpiCard(doc, margin + (cardW + gap) * 0, cardY, cardW, cardH, "Total Clients", String(kpi.total), RGB.primary);
  drawKpiCard(doc, margin + (cardW + gap) * 1, cardY, cardW, cardH, "Compliant", String(kpi.compliant), RGB.success);
  drawKpiCard(doc, margin + (cardW + gap) * 2, cardY, cardW, cardH, "Non-Compliant", String(kpi.nonCompliant), RGB.danger);
  drawKpiCard(doc, margin + (cardW + gap) * 3, cardY, cardW, cardH, "Avg Completion", `${kpi.avgCompletion}%`, RGB.accent);

  // Charts row
  const chartY = cardY + cardH + 18;
  const chartH = 190;
  const chartW = (pageW - margin * 2 - gap) / 2;

  const donutPng = renderDonutPNG(
    [
      { label: "Compliant", value: kpi.compliant, color: RGB.success },
      { label: "Non-Compliant", value: kpi.nonCompliant, color: RGB.danger },
      { label: "On Hold", value: kpi.onHold, color: RGB.warn },
    ],
    { width: chartW, height: chartH, title: "Compliance Distribution", centerLabel: `${kpi.total}` }
  );
  doc.addImage(donutPng, "PNG", margin, chartY, chartW, chartH);

  const barPng = renderBarChartPNG(
    [
      { label: "Bank Txns", value: bd.bankPct, color: RGB.primary },
      { label: "Uncat.", value: bd.uncatPct, color: RGB.primaryDark },
      { label: "Unapplied", value: bd.unappliedPct, color: RGB.accent },
      { label: "Stmt Req", value: bd.stmtPct, color: RGB.success },
    ],
    { width: chartW, height: chartH, title: "Compliance Breakdown (%)", maxValue: 100, valueSuffix: "%" }
  );
  doc.addImage(barPng, "PNG", margin + chartW + gap, chartY, chartW, chartH);

  // Risk indicators table
  autoTable(doc, {
    startY: chartY + chartH + 16,
    head: [["Risk Indicator", "Count"]],
    body: [
      ["On Hold – Bank Statements Not Received", String(kpi.onHold)],
      ["Clients Not Reconciled Last Month", String(kpi.notReconciled)],
      ["Outstanding Statement Requests", String(kpi.outstandingStatements)],
      ["Clients Without Updated Notes", String(kpi.withoutNotes)],
    ],
    theme: "grid",
    headStyles: { fillColor: RGB.primary, textColor: 255, fontStyle: "bold", fontSize: 10, cellPadding: 6 },
    styles: { fontSize: 9, cellPadding: 6, lineColor: RGB.border, lineWidth: 0.25, valign: "middle" },
    columnStyles: { 0: { cellWidth: pageW - margin * 2 - 100 }, 1: { cellWidth: 100, halign: "center", fontStyle: "bold" } },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        const n = parseInt(String(d.cell.raw), 10);
        d.cell.styles.textColor = n > 0 ? RGB.danger : RGB.success;
      }
    },
    margin: { left: margin, right: margin, bottom: FOOTER_RESERVE },
  });

  /* ----- Monthly trends page (if multi-month) ----- */
  const grouped = groupHistoryByMonth(history);
  const monthOrder = new Map<string, string>();
  for (const r of history) if (!monthOrder.has(r.month)) monthOrder.set(r.month, r.monthDate);
  const sortedMonths = Array.from(grouped.keys()).sort((a, b) =>
    (monthOrder.get(a) ?? "").localeCompare(monthOrder.get(b) ?? "")
  );

  if (sortedMonths.length > 1) {
    doc.addPage();
    // Header band
    doc.setFillColor(...RGB.primary);
    doc.rect(0, 0, pageW, 50, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("Monthly Trends", margin, 32);

    const trendsBars = sortedMonths.map((m) => {
      const cs = grouped.get(m)!;
      const avg = cs.length ? Math.round(cs.reduce((s, c) => s + c.completionPct, 0) / cs.length) : 0;
      return { label: m.replace(/\s\d{4}/, ""), value: avg, color: RGB.primary };
    });
    const trendChartW = pageW - margin * 2;
    const trendChartH = 200;
    const trendChartY = 70;
    const trendChart = renderBarChartPNG(trendsBars, {
      width: trendChartW,
      height: trendChartH,
      title: "Average Completion % by Month",
      maxValue: 100,
      valueSuffix: "%",
    });
    doc.addImage(trendChart, "PNG", margin, trendChartY, trendChartW, trendChartH);

    autoTable(doc, {
      startY: trendChartY + trendChartH + 16,
      head: [["Month", "Total Clients", "Compliant", "Non-Compliant", "Avg Completion %"]],
      body: sortedMonths.map((m) => {
        const cs = grouped.get(m)!;
        const compliant = cs.filter((c) => c.complianceStatus === "Compliant").length;
        const nonCompliant = cs.filter((c) => c.complianceStatus === "Non-Compliant").length;
        const avg = cs.length ? Math.round(cs.reduce((s, c) => s + c.completionPct, 0) / cs.length) : 0;
        return [m, String(cs.length), String(compliant), String(nonCompliant), `${avg}%`];
      }),
      theme: "striped",
      headStyles: { fillColor: RGB.primary, textColor: 255, fontStyle: "bold", cellPadding: 6 },
      alternateRowStyles: { fillColor: RGB.zebra },
      styles: { fontSize: 9, cellPadding: 5, lineColor: RGB.border, lineWidth: 0.25, valign: "middle" },
      columnStyles: {
        0: { cellWidth: 130, fontStyle: "bold" },
        1: { cellWidth: 110, halign: "center" },
        2: { cellWidth: 110, halign: "center" },
        3: { cellWidth: 130, halign: "center" },
        4: { cellWidth: 130, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (d) => {
        if (d.section === "body") {
          if (d.column.index === 2) d.cell.styles.textColor = RGB.success;
          if (d.column.index === 3) d.cell.styles.textColor = RGB.danger;
          if (d.column.index === 4) {
            const v = parseInt(String(d.cell.raw), 10);
            d.cell.styles.textColor = v >= 90 ? RGB.success : v >= 60 ? RGB.warn : RGB.danger;
            d.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: margin, right: margin, bottom: FOOTER_RESERVE },
    });
  }

  /* ----- Per-month client tables ----- */
  for (const m of sortedMonths) {
    const cs = grouped.get(m)!;
    doc.addPage();
    // Header band
    doc.setFillColor(...RGB.primary);
    doc.rect(0, 0, pageW, 50, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`Month-End Review – ${m}`, margin, 32);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${cs.length} clients`, pageW - margin, 32, { align: "right" });

    autoTable(doc, {
      startY: 70,
      head: [[
        "Client", "Type", "Bookkeeper", "Bank", "Uncat.", "No-Payee",
        "Undep.", "Unapp.", "Stmt", "Reconciled", "Notes", "Fin", "Closed", "%", "Status",
      ]],
      body: cs.map((c) => [
        c.name, c.clientType, c.bookkeeper, c.bankTransactions || "-",
        String(dash(c.uncategorizedTransactions)), String(dash(c.transactionsWithoutPayees)),
        String(dash(c.undepositedFunds)), String(dash(c.unappliedPayments)),
        c.statementRequestStatus || "-", c.lastReconciledDate || "-",
        bool(c.prevMonthNotesApproved), bool(c.financialsSentToClient),
        bool(c.booksClosedInQB), `${c.completionPct}%`, c.complianceStatus,
      ]),
      theme: "striped",
      headStyles: { fillColor: RGB.primary, textColor: 255, fontStyle: "bold", fontSize: 8, halign: "center", cellPadding: 4, valign: "middle" },
      alternateRowStyles: { fillColor: RGB.zebra },
      styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak", lineColor: RGB.border, lineWidth: 0.25, valign: "middle" },
      columnStyles: {
        0: { cellWidth: 100, fontStyle: "bold" },
        1: { cellWidth: 44 },
        2: { cellWidth: 56 },
        3: { cellWidth: 44, halign: "right" },
        4: { cellWidth: 36, halign: "right" },
        5: { cellWidth: 44, halign: "right" },
        6: { cellWidth: 36, halign: "right" },
        7: { cellWidth: 36, halign: "right" },
        8: { cellWidth: 56 },
        9: { cellWidth: 56 },
        10: { cellWidth: 32, halign: "center" },
        11: { cellWidth: 28, halign: "center" },
        12: { cellWidth: 36, halign: "center" },
        13: { cellWidth: 36, halign: "right", fontStyle: "bold" },
        14: { cellWidth: 70, halign: "center", fontStyle: "bold" },
      },
      didParseCell: (d) => {
        if (d.section !== "body") return;
        const v = String(d.cell.raw);
        // Yes/No coloring
        if ([10, 11, 12].includes(d.column.index)) {
          d.cell.styles.textColor = v === "Yes" ? RGB.success : RGB.danger;
        }
        // Completion %
        if (d.column.index === 13) {
          const pct = parseInt(v, 10);
          d.cell.styles.textColor = pct >= 90 ? RGB.success : pct >= 60 ? RGB.warn : RGB.danger;
        }
        // Status badge
        if (d.column.index === 14) {
          if (v === "Compliant") {
            d.cell.styles.textColor = RGB.success;
            d.cell.styles.fillColor = RGB.successBg;
          } else if (v === "Non-Compliant") {
            d.cell.styles.textColor = RGB.danger;
            d.cell.styles.fillColor = RGB.dangerBg;
          } else {
            d.cell.styles.textColor = RGB.warn;
            d.cell.styles.fillColor = RGB.warnBg;
          }
        }
      },
      margin: { left: margin, right: margin, bottom: FOOTER_RESERVE },
    });
  }

  /* ----- Footer with page numbers + brand bar ----- */
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...RGB.primaryDark);
    doc.rect(0, pageH - 20, pageW, 20, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Greenfield Bookkeeping – MER Report", margin, pageH - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 7, { align: "right" });
  }

  const blob = doc.output("blob");
  return { kind: "pdf", blob, filename: `${fileBaseName}.pdf`, doc };
}
