/**
 * Specialized report exports for the consolidated Export Center.
 * Each function generates either an XLSX or PDF tailored to a specific use-case.
 *
 * All exporters consume the filtered MER history + cycle entries derived from the
 * shared date range selector on the Export Center page.
 */
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MerHistoryRow, CycleEntry } from "@/services/googleSheets";
import type { Client } from "@/data/mockData";
import {
  getKPIMetrics,
  getComplianceBreakdown,
  getNeedsAttention,
  getBookkeeperStats,
  groupHistoryByMonth,
} from "@/hooks/useSheetData";
import { autoSizeRowHeights, workbookToHtml } from "@/lib/xlsxRender";

/** Shared preview-payload shape returned by every build* function. */
export type ExportPayload =
  | { kind: "pdf"; blob: Blob; filename: string; doc: jsPDF }
  | { kind: "xlsx"; blob: Blob; filename: string; wb: XLSX.WorkBook; html: string };

function pdfPayload(doc: jsPDF, filename: string): ExportPayload {
  const blob = doc.output("blob");
  return { kind: "pdf", blob, filename, doc };
}
function xlsxPayload(wb: XLSX.WorkBook, filename: string): ExportPayload {
  const arr = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  return { kind: "xlsx", blob, filename, wb, html: workbookToHtml(wb) };
}
export function downloadPayload(p: ExportPayload) {
  const url = URL.createObjectURL(p.blob);
  const a = document.createElement("a");
  a.href = url; a.download = p.filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ============= Brand palette ============= */
const RGB = {
  primary: [156, 90, 110] as [number, number, number],
  primaryDark: [107, 63, 77] as [number, number, number],
  accent: [200, 162, 122] as [number, number, number],
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
const HEX = {
  white: "FFFFFF",
  primary: "9C5A6E",
  primaryDark: "6B3F4D",
  zebra: "F7F2EE",
  border: "E5DAD2",
  success: "21825A",
  successBg: "DCEFE3",
  danger: "B43232",
  dangerBg: "F4DADA",
  warn: "C8851F",
  warnBg: "F8E6C6",
};

/* ============= Shared XLSX helpers ============= */
type CellStyle = NonNullable<XLSX.CellObject["s"]>;
const border = (color: string = HEX.border) => ({
  top: { style: "thin", color: { rgb: color } },
  bottom: { style: "thin", color: { rgb: color } },
  left: { style: "thin", color: { rgb: color } },
  right: { style: "thin", color: { rgb: color } },
});
const titleStyle: CellStyle = {
  font: { name: "Calibri", sz: 18, bold: true, color: { rgb: HEX.white } },
  fill: { patternType: "solid", fgColor: { rgb: HEX.primary } },
  alignment: { horizontal: "left", vertical: "center", indent: 1 },
};
const subtitleStyle: CellStyle = {
  font: { name: "Calibri", sz: 11, italic: true, color: { rgb: HEX.white } },
  fill: { patternType: "solid", fgColor: { rgb: HEX.primaryDark } },
  alignment: { horizontal: "left", vertical: "center", indent: 1 },
};
const headerStyle: CellStyle = {
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: HEX.white } },
  fill: { patternType: "solid", fgColor: { rgb: HEX.primary } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: border(),
};
const cellStyle = (zebra: boolean): CellStyle => ({
  font: { name: "Calibri", sz: 9, color: { rgb: "333333" } },
  fill: zebra ? { patternType: "solid", fgColor: { rgb: HEX.zebra } } : undefined,
  alignment: { horizontal: "left", vertical: "center", wrapText: true, indent: 1 },
  border: border(),
});
const numCellStyle = (zebra: boolean): CellStyle => ({
  ...cellStyle(zebra),
  alignment: { horizontal: "right", vertical: "center", indent: 1 },
});
const pctStyle = (pct: number, zebra: boolean): CellStyle => {
  const base = numCellStyle(zebra);
  if (pct >= 90) return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.success } } };
  if (pct >= 60) return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.warn } } };
  return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.danger } } };
};
const statusStyle = (status: string, zebra: boolean): CellStyle => {
  const base = cellStyle(zebra);
  if (status === "Compliant") {
    return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.success } }, fill: { patternType: "solid", fgColor: { rgb: HEX.successBg } }, alignment: { horizontal: "center", vertical: "center" } };
  }
  if (status === "Non-Compliant") {
    return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.danger } }, fill: { patternType: "solid", fgColor: { rgb: HEX.dangerBg } }, alignment: { horizontal: "center", vertical: "center" } };
  }
  return { ...base, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.warn } }, fill: { patternType: "solid", fgColor: { rgb: HEX.warnBg } }, alignment: { horizontal: "center", vertical: "center" } };
};

function setCell(ws: XLSX.WorkSheet, addr: string, value: string | number, style?: CellStyle) {
  ws[addr] = { v: value, t: typeof value === "number" ? "n" : "s", s: style };
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

function makeTitleHeader(ws: XLSX.WorkSheet, title: string, subtitle: string, cols: number) {
  ws["!ref"] = "A1";
  placeRow(ws, 0, [title, ...Array(cols - 1).fill("")], Array(cols).fill(titleStyle));
  placeRow(ws, 1, [subtitle, ...Array(cols - 1).fill("")], Array(cols).fill(subtitleStyle));
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: cols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: cols - 1 } },
  ];
  ws["!rows"] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 8 }, { hpt: 28 }];
}

/* ============= Shared PDF helpers ============= */
/** Reserved bottom margin so autoTable never paints into the footer band. */
const PDF_FOOTER_RESERVE = 28;
/** Y where content (tables/sections) safely starts after the cover band. */
const PDF_CONTENT_START_Y = 130;

function pdfCover(doc: jsPDF, title: string, subtitle: string, rangeLabel: string) {
  const pageW = doc.internal.pageSize.getWidth();
  // Top brand band
  doc.setFillColor(...RGB.primary);
  doc.rect(0, 0, pageW, 78, "F");
  doc.setFillColor(...RGB.primaryDark);
  doc.rect(0, 78, pageW, 5, "F");
  // Brand name + title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Brant & Associates", 40, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(title, 40, 58);
  // Right-aligned meta
  doc.setFontSize(9);
  doc.text(`Range: ${rangeLabel}`, pageW - 40, 34, { align: "right" });
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 40, 50, { align: "right" });
  // Subtitle in the white space below the band, with safe gap from band edge
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(...RGB.textMuted);
    const lines = doc.splitTextToSize(subtitle, pageW - 80);
    doc.text(lines, 40, 102);
  }
}
function pdfFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...RGB.primaryDark);
    doc.rect(0, pageH - 20, pageW, 20, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Brant & Associates – Export Center", 40, pageH - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 40, pageH - 7, { align: "right" });
  }
}

/* ============= Latest-row-per-client helper ============= */
function latestPerClient(history: MerHistoryRow[]): MerHistoryRow[] {
  const map = new Map<string, MerHistoryRow>();
  for (const r of history) {
    const ex = map.get(r.name);
    if (!ex || r.timestampMs >= ex.timestampMs) map.set(r.name, r);
  }
  return Array.from(map.values());
}

/* ============================================================ */
/* 2. Client Compliance Scorecard                               */
/* ============================================================ */
export function exportClientScorecardXLSX(history: MerHistoryRow[], rangeLabel: string, fileBase: string): ExportPayload {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = { "!ref": "A1" };

  // For each client, aggregate across the range
  const byClient = new Map<string, MerHistoryRow[]>();
  for (const r of history) {
    if (!byClient.has(r.name)) byClient.set(r.name, []);
    byClient.get(r.name)!.push(r);
  }
  const rows = Array.from(byClient.entries()).map(([name, submissions]) => {
    const sorted = [...submissions].sort((a, b) => a.monthDate.localeCompare(b.monthDate));
    const last = sorted[sorted.length - 1];
    const first = sorted[0];
    const compliantMonths = sorted.filter((s) => s.complianceStatus === "Compliant").length;
    const onTimeRate = sorted.length ? Math.round((compliantMonths / sorted.length) * 100) : 0;
    const avgCompletion = sorted.length ? Math.round(sorted.reduce((s, x) => s + x.completionPct, 0) / sorted.length) : 0;
    const trendDiff = last.completionPct - first.completionPct;
    const trendArrow = trendDiff >= 5 ? "↑ Improving" : trendDiff <= -5 ? "↓ Declining" : "→ Stable";
    return {
      name,
      type: last.clientType,
      bookkeeper: last.bookkeeper,
      submissions: sorted.length,
      avgCompletion,
      onTimeRate,
      lastMonth: last.month,
      lastStatus: last.complianceStatus,
      lastCompletion: last.completionPct,
      trend: trendArrow,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const headers = ["Client", "Type", "Bookkeeper", "Submissions", "Avg Completion %", "On-Time Rate %", "Last Month", "Last Status", "Last Completion %", "Trend"];
  makeTitleHeader(ws, "Client Compliance Scorecard", `${rows.length} clients · Range: ${rangeLabel} · Generated: ${new Date().toLocaleString()}`, headers.length);
  placeRow(ws, 3, headers, Array(headers.length).fill(headerStyle));

  rows.forEach((r, i) => {
    const z = i % 2 === 1;
    placeRow(ws, 4 + i, [
      r.name, r.type, r.bookkeeper, r.submissions,
      `${r.avgCompletion}%`, `${r.onTimeRate}%`,
      r.lastMonth, r.lastStatus, `${r.lastCompletion}%`, r.trend,
    ], [
      cellStyle(z), cellStyle(z), cellStyle(z), numCellStyle(z),
      pctStyle(r.avgCompletion, z), pctStyle(r.onTimeRate, z),
      cellStyle(z), statusStyle(r.lastStatus, z), pctStyle(r.lastCompletion, z),
      { ...cellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: r.trend.startsWith("↑") ? HEX.success : r.trend.startsWith("↓") ? HEX.danger : HEX.warn } } },
    ]);
  });

  ws["!cols"] = [{ wch: 36 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + rows.length, c: headers.length - 1 } }) };
  ws["!freeze"] = { xSplit: 1, ySplit: 4 };
  autoSizeRowHeights(ws);
  XLSX.utils.book_append_sheet(wb, ws, "Client Scorecard");
  return xlsxPayload(wb, `${fileBase}.xlsx`);
}
export function exportClientScorecardPDF(history: MerHistoryRow[], rangeLabel: string, fileBase: string): ExportPayload {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  pdfCover(doc, "Client Compliance Scorecard", "Per-client compliance, on-time rate, completion trend", rangeLabel);

  const byClient = new Map<string, MerHistoryRow[]>();
  for (const r of history) {
    if (!byClient.has(r.name)) byClient.set(r.name, []);
    byClient.get(r.name)!.push(r);
  }
  const rows = Array.from(byClient.entries()).map(([name, submissions]) => {
    const sorted = [...submissions].sort((a, b) => a.monthDate.localeCompare(b.monthDate));
    const last = sorted[sorted.length - 1];
    const first = sorted[0];
    const compliantMonths = sorted.filter((s) => s.complianceStatus === "Compliant").length;
    const onTimeRate = sorted.length ? Math.round((compliantMonths / sorted.length) * 100) : 0;
    const avgCompletion = sorted.length ? Math.round(sorted.reduce((s, x) => s + x.completionPct, 0) / sorted.length) : 0;
    const trendDiff = last.completionPct - first.completionPct;
    const trendArrow = trendDiff >= 5 ? "Improving" : trendDiff <= -5 ? "Declining" : "Stable";
    return [name, last.clientType, last.bookkeeper, String(sorted.length), `${avgCompletion}%`, `${onTimeRate}%`, last.month, last.complianceStatus, `${last.completionPct}%`, trendArrow];
  }).sort((a, b) => a[0].localeCompare(b[0]));

  autoTable(doc, {
    startY: PDF_CONTENT_START_Y,
    head: [["Client", "Type", "Bookkeeper", "Subs", "Avg %", "On-Time", "Last Mo", "Status", "Last %", "Trend"]],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: RGB.primary, textColor: 255, fontStyle: "bold", fontSize: 9, cellPadding: 5 },
    alternateRowStyles: { fillColor: RGB.zebra },
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", lineColor: RGB.border, lineWidth: 0.25, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 150, fontStyle: "bold" },
      1: { cellWidth: 60 }, 2: { cellWidth: 70 },
      3: { cellWidth: 36, halign: "center" },
      4: { cellWidth: 50, halign: "right" },
      5: { cellWidth: 56, halign: "right" },
      6: { cellWidth: 60 },
      7: { cellWidth: 70, halign: "center" },
      8: { cellWidth: 50, halign: "right" },
      9: { cellWidth: 60, halign: "center" },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      if (d.column.index === 7) {
        const v = String(d.cell.raw);
        if (v === "Compliant") { d.cell.styles.textColor = RGB.success; d.cell.styles.fillColor = RGB.successBg; }
        else if (v === "Non-Compliant") { d.cell.styles.textColor = RGB.danger; d.cell.styles.fillColor = RGB.dangerBg; }
      }
      if (d.column.index === 9) {
        const v = String(d.cell.raw);
        d.cell.styles.textColor = v === "Improving" ? RGB.success : v === "Declining" ? RGB.danger : RGB.warn;
        d.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 40, right: 40, bottom: PDF_FOOTER_RESERVE },
  });
  pdfFooter(doc);
  return pdfPayload(doc, `${fileBase}.pdf`);
}

/* ============================================================ */
/* 3. Bookkeeper Performance Report                             */
/* ============================================================ */
export function exportBookkeeperPerfXLSX(history: MerHistoryRow[], rangeLabel: string, fileBase: string): ExportPayload {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = { "!ref": "A1" };

  // Aggregate by bookkeeper across range
  const byBk = new Map<string, MerHistoryRow[]>();
  for (const r of history) {
    if (!r.bookkeeper) continue;
    if (!byBk.has(r.bookkeeper)) byBk.set(r.bookkeeper, []);
    byBk.get(r.bookkeeper)!.push(r);
  }
  const rows = Array.from(byBk.entries()).map(([bk, submissions]) => {
    const uniqueClients = new Set(submissions.map((s) => s.name)).size;
    const compliant = submissions.filter((s) => s.complianceStatus === "Compliant").length;
    const onTimePct = submissions.length ? Math.round((compliant / submissions.length) * 100) : 0;
    const avgCompletion = submissions.length ? Math.round(submissions.reduce((s, x) => s + x.completionPct, 0) / submissions.length) : 0;
    // At-risk = clients with completion < 40 in their latest submission
    const latestPerC = new Map<string, MerHistoryRow>();
    for (const s of submissions) {
      const ex = latestPerC.get(s.name);
      if (!ex || s.timestampMs >= ex.timestampMs) latestPerC.set(s.name, s);
    }
    const atRisk = Array.from(latestPerC.values()).filter((c) => c.completionPct < 40).length;
    return { bk, uniqueClients, submissions: submissions.length, compliant, onTimePct, avgCompletion, atRisk };
  }).sort((a, b) => b.avgCompletion - a.avgCompletion);

  const headers = ["Rank", "Bookkeeper", "Clients Managed", "Total Submissions", "Compliant Subs", "On-Time %", "Avg Completion %", "At-Risk Clients"];
  makeTitleHeader(ws, "Bookkeeper Performance Report", `${rows.length} bookkeepers · Range: ${rangeLabel} · Generated: ${new Date().toLocaleString()}`, headers.length);
  placeRow(ws, 3, headers, Array(headers.length).fill(headerStyle));

  rows.forEach((r, i) => {
    const z = i % 2 === 1;
    placeRow(ws, 4 + i, [
      `#${i + 1}`, r.bk, r.uniqueClients, r.submissions, r.compliant, `${r.onTimePct}%`, `${r.avgCompletion}%`, r.atRisk,
    ], [
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" }, font: { name: "Calibri", sz: 10, bold: true, color: { rgb: HEX.primary } } },
      { ...cellStyle(z), font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "333333" } } },
      numCellStyle(z), numCellStyle(z),
      { ...numCellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.success } } },
      pctStyle(r.onTimePct, z),
      pctStyle(r.avgCompletion, z),
      { ...numCellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: r.atRisk > 0 ? HEX.danger : HEX.success } } },
    ]);
  });

  ws["!cols"] = [{ wch: 8 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 16 }];
  ws["!freeze"] = { xSplit: 0, ySplit: 4 };
  autoSizeRowHeights(ws);
  XLSX.utils.book_append_sheet(wb, ws, "Bookkeeper Performance");
  return xlsxPayload(wb, `${fileBase}.xlsx`);
}
export function exportBookkeeperPerfPDF(history: MerHistoryRow[], rangeLabel: string, fileBase: string): ExportPayload {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  pdfCover(doc, "Bookkeeper Performance Report", "Workload, on-time rate, completion, at-risk count", rangeLabel);

  const byBk = new Map<string, MerHistoryRow[]>();
  for (const r of history) {
    if (!r.bookkeeper) continue;
    if (!byBk.has(r.bookkeeper)) byBk.set(r.bookkeeper, []);
    byBk.get(r.bookkeeper)!.push(r);
  }
  const rows = Array.from(byBk.entries()).map(([bk, submissions]) => {
    const uniqueClients = new Set(submissions.map((s) => s.name)).size;
    const compliant = submissions.filter((s) => s.complianceStatus === "Compliant").length;
    const onTimePct = submissions.length ? Math.round((compliant / submissions.length) * 100) : 0;
    const avgCompletion = submissions.length ? Math.round(submissions.reduce((s, x) => s + x.completionPct, 0) / submissions.length) : 0;
    const latestPerC = new Map<string, MerHistoryRow>();
    for (const s of submissions) {
      const ex = latestPerC.get(s.name);
      if (!ex || s.timestampMs >= ex.timestampMs) latestPerC.set(s.name, s);
    }
    const atRisk = Array.from(latestPerC.values()).filter((c) => c.completionPct < 40).length;
    return { bk, uniqueClients, submissions: submissions.length, compliant, onTimePct, avgCompletion, atRisk };
  }).sort((a, b) => b.avgCompletion - a.avgCompletion);

  autoTable(doc, {
    startY: PDF_CONTENT_START_Y,
    head: [["Rank", "Bookkeeper", "Clients", "Submissions", "Compliant", "On-Time %", "Avg Completion %", "At-Risk"]],
    body: rows.map((r, i) => [`#${i + 1}`, r.bk, String(r.uniqueClients), String(r.submissions), String(r.compliant), `${r.onTimePct}%`, `${r.avgCompletion}%`, String(r.atRisk)]),
    theme: "striped",
    headStyles: { fillColor: RGB.primary, textColor: 255, fontStyle: "bold", fontSize: 10, cellPadding: 6 },
    alternateRowStyles: { fillColor: RGB.zebra },
    styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak", lineColor: RGB.border, lineWidth: 0.25, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 50, halign: "center", fontStyle: "bold", textColor: RGB.primary },
      1: { cellWidth: 160, fontStyle: "bold" },
      2: { cellWidth: 70, halign: "center" },
      3: { cellWidth: 90, halign: "center" },
      4: { cellWidth: 80, halign: "center" },
      5: { cellWidth: 80, halign: "right", fontStyle: "bold" },
      6: { cellWidth: 110, halign: "right", fontStyle: "bold" },
      7: { cellWidth: 70, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      if (d.column.index === 5 || d.column.index === 6) {
        const v = parseInt(String(d.cell.raw), 10);
        d.cell.styles.textColor = v >= 90 ? RGB.success : v >= 60 ? RGB.warn : RGB.danger;
      }
      if (d.column.index === 7) {
        const v = parseInt(String(d.cell.raw), 10);
        d.cell.styles.textColor = v > 0 ? RGB.danger : RGB.success;
      }
    },
    margin: { left: 40, right: 40, bottom: PDF_FOOTER_RESERVE },
  });
  pdfFooter(doc);
  return pdfPayload(doc, `${fileBase}.pdf`);
}

/* ============================================================ */
/* 4. At-Risk Clients Snapshot                                  */
/* ============================================================ */
function buildAtRisk(history: MerHistoryRow[]) {
  const latest = latestPerClient(history);
  return latest.filter((c) => c.completionPct < 40 || c.complianceStatus === "Non-Compliant").map((c) => {
    const reasons: string[] = [];
    if (c.bankTransactions.toLowerCase().includes("missing")) reasons.push("Missing bank statement");
    if (c.uncategorizedTransactions > 0) reasons.push(`${c.uncategorizedTransactions} uncategorized`);
    if (c.unappliedPayments > 0) reasons.push(`${c.unappliedPayments} unapplied`);
    if (c.statementRequestStatus !== "Received") reasons.push("Stmt not received");
    if (!c.prevMonthNotesApproved) reasons.push("Notes not approved");
    if (!c.financialsSentToClient) reasons.push("Financials not sent");
    if (!c.booksClosedInQB) reasons.push("Books not closed");
    if (!c.lastReconciledDate) reasons.push("Not reconciled");
    return { ...c, reasons: reasons.join(" · ") || "Low completion %" };
  }).sort((a, b) => a.completionPct - b.completionPct);
}
export function exportAtRiskXLSX(history: MerHistoryRow[], rangeLabel: string, fileBase: string) {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = { "!ref": "A1" };
  const rows = buildAtRisk(history);
  const headers = ["Client", "Bookkeeper", "Type", "Latest Month", "Completion %", "Status", "Last Reconciled", "Risk Reasons"];
  makeTitleHeader(ws, "At-Risk Clients Snapshot", `${rows.length} clients flagged · Range: ${rangeLabel} · Generated: ${new Date().toLocaleString()}`, headers.length);
  placeRow(ws, 3, headers, Array(headers.length).fill(headerStyle));
  rows.forEach((r, i) => {
    const z = i % 2 === 1;
    placeRow(ws, 4 + i, [r.name, r.bookkeeper, r.clientType, r.month, `${r.completionPct}%`, r.complianceStatus, r.lastReconciledDate || "Never", r.reasons], [
      { ...cellStyle(z), font: { name: "Calibri", sz: 10, bold: true, color: { rgb: HEX.danger } } },
      cellStyle(z), cellStyle(z), cellStyle(z),
      pctStyle(r.completionPct, z),
      statusStyle(r.complianceStatus, z),
      cellStyle(z),
      { ...cellStyle(z), font: { name: "Calibri", sz: 8, color: { rgb: HEX.danger } } },
    ]);
  });
  ws["!cols"] = [{ wch: 36 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 60 }];
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + rows.length, c: headers.length - 1 } }) };
  ws["!freeze"] = { xSplit: 1, ySplit: 4 };
  XLSX.utils.book_append_sheet(wb, ws, "At-Risk Clients");
  XLSX.writeFile(wb, `${fileBase}.xlsx`);
}
export function exportAtRiskPDF(history: MerHistoryRow[], rangeLabel: string, fileBase: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  pdfCover(doc, "At-Risk Clients Snapshot", "Clients flagged as Non-Compliant or below 40% completion", rangeLabel);
  const rows = buildAtRisk(history);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...RGB.danger);
  doc.text(`${rows.length} clients require attention`, 40, 128);
  autoTable(doc, {
    startY: 142,
    head: [["Client", "Bookkeeper", "Type", "Last Mo", "%", "Status", "Reconciled", "Risk Reasons"]],
    body: rows.map((r) => [r.name, r.bookkeeper, r.clientType, r.month, `${r.completionPct}%`, r.complianceStatus, r.lastReconciledDate || "Never", r.reasons]),
    theme: "striped",
    headStyles: { fillColor: RGB.danger, textColor: 255, fontStyle: "bold", fontSize: 9, cellPadding: 5 },
    alternateRowStyles: { fillColor: RGB.dangerBg },
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", lineColor: RGB.border, lineWidth: 0.25, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 130, fontStyle: "bold" },
      1: { cellWidth: 70 },
      2: { cellWidth: 50 },
      3: { cellWidth: 56 },
      4: { cellWidth: 38, halign: "right", fontStyle: "bold" },
      5: { cellWidth: 70, halign: "center" },
      6: { cellWidth: 60 },
      7: { cellWidth: 248, fontSize: 7, textColor: RGB.danger },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      if (d.column.index === 4) {
        const v = parseInt(String(d.cell.raw), 10);
        d.cell.styles.textColor = v >= 60 ? RGB.warn : RGB.danger;
      }
      if (d.column.index === 5) {
        const v = String(d.cell.raw);
        if (v === "Compliant") { d.cell.styles.textColor = RGB.success; d.cell.styles.fillColor = RGB.successBg; }
        else if (v === "Non-Compliant") { d.cell.styles.textColor = RGB.danger; d.cell.styles.fillColor = RGB.dangerBg; }
        else { d.cell.styles.textColor = RGB.warn; d.cell.styles.fillColor = RGB.warnBg; }
      }
    },
    margin: { left: 40, right: 40, bottom: PDF_FOOTER_RESERVE },
  });
  pdfFooter(doc);
  doc.save(`${fileBase}.pdf`);
}

/* ============================================================ */
/* 5. Monthly Trends Summary                                    */
/* ============================================================ */
function trendsSummary(history: MerHistoryRow[]) {
  const grouped = groupHistoryByMonth(history);
  const monthOrder = new Map<string, string>();
  for (const r of history) if (!monthOrder.has(r.month)) monthOrder.set(r.month, r.monthDate);
  const sorted = Array.from(grouped.keys()).sort((a, b) => (monthOrder.get(a) ?? "").localeCompare(monthOrder.get(b) ?? ""));
  return sorted.map((month, i) => {
    const cs = grouped.get(month)!;
    const compliant = cs.filter((c) => c.complianceStatus === "Compliant").length;
    const nonCompliant = cs.filter((c) => c.complianceStatus === "Non-Compliant").length;
    const avg = cs.length ? Math.round(cs.reduce((s, c) => s + c.completionPct, 0) / cs.length) : 0;
    const compliancePct = cs.length ? Math.round((compliant / cs.length) * 100) : 0;
    let trend = "—";
    let momDelta = 0;
    if (i > 0) {
      const prev = grouped.get(sorted[i - 1])!;
      const prevAvg = prev.length ? Math.round(prev.reduce((s, c) => s + c.completionPct, 0) / prev.length) : 0;
      momDelta = avg - prevAvg;
      trend = momDelta >= 2 ? "Improving" : momDelta <= -2 ? "Declining" : "Stable";
    }
    return { month, total: cs.length, compliant, nonCompliant, compliancePct, avg, momDelta, trend };
  });
}
export function exportTrendsSummaryXLSX(history: MerHistoryRow[], rangeLabel: string, fileBase: string) {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = { "!ref": "A1" };
  const rows = trendsSummary(history);
  const headers = ["Month", "Total Clients", "Compliant", "Non-Compliant", "Compliance %", "Avg Completion %", "MoM Δ", "Trend"];
  makeTitleHeader(ws, "Monthly Trends Summary", `${rows.length} months · Range: ${rangeLabel} · Generated: ${new Date().toLocaleString()}`, headers.length);
  placeRow(ws, 3, headers, Array(headers.length).fill(headerStyle));
  rows.forEach((r, i) => {
    const z = i % 2 === 1;
    const trendColor = r.trend === "Improving" ? HEX.success : r.trend === "Declining" ? HEX.danger : r.trend === "Stable" ? HEX.warn : "999999";
    placeRow(ws, 4 + i, [r.month, r.total, r.compliant, r.nonCompliant, `${r.compliancePct}%`, `${r.avg}%`, r.momDelta === 0 && i === 0 ? "—" : `${r.momDelta > 0 ? "+" : ""}${r.momDelta}`, r.trend], [
      { ...cellStyle(z), font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "333333" } } },
      numCellStyle(z),
      { ...numCellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.success } } },
      { ...numCellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.danger } } },
      pctStyle(r.compliancePct, z),
      pctStyle(r.avg, z),
      { ...numCellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: r.momDelta > 0 ? HEX.success : r.momDelta < 0 ? HEX.danger : "999999" } } },
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" }, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: trendColor } } },
    ]);
  });
  ws["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 14 }];
  ws["!freeze"] = { xSplit: 0, ySplit: 4 };
  XLSX.utils.book_append_sheet(wb, ws, "Trends Summary");
  XLSX.writeFile(wb, `${fileBase}.xlsx`);
}
export function exportTrendsSummaryPDF(history: MerHistoryRow[], rangeLabel: string, fileBase: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  pdfCover(doc, "Monthly Trends Summary", "Compliance %, completion %, MoM deltas, trend direction", rangeLabel);
  const rows = trendsSummary(history);
  autoTable(doc, {
    startY: PDF_CONTENT_START_Y,
    head: [["Month", "Total", "Compliant", "Non-Comp", "Compliance %", "Avg Completion %", "MoM Δ", "Trend"]],
    body: rows.map((r, i) => [r.month, String(r.total), String(r.compliant), String(r.nonCompliant), `${r.compliancePct}%`, `${r.avg}%`, i === 0 ? "—" : `${r.momDelta > 0 ? "+" : ""}${r.momDelta}`, r.trend]),
    theme: "striped",
    headStyles: { fillColor: RGB.primary, textColor: 255, fontStyle: "bold", fontSize: 10, cellPadding: 6 },
    alternateRowStyles: { fillColor: RGB.zebra },
    styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak", lineColor: RGB.border, lineWidth: 0.25, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 90, fontStyle: "bold" },
      1: { cellWidth: 70, halign: "center" },
      2: { cellWidth: 80, halign: "center" },
      3: { cellWidth: 90, halign: "center" },
      4: { cellWidth: 100, halign: "right" },
      5: { cellWidth: 130, halign: "right" },
      6: { cellWidth: 70, halign: "right", fontStyle: "bold" },
      7: { cellWidth: 90, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      if (d.column.index === 5) {
        const v = parseInt(String(d.cell.raw), 10);
        d.cell.styles.textColor = v >= 90 ? RGB.success : v >= 60 ? RGB.warn : RGB.danger;
      }
      if (d.column.index === 7) {
        const v = String(d.cell.raw);
        d.cell.styles.textColor = v === "Improving" ? RGB.success : v === "Declining" ? RGB.danger : v === "Stable" ? RGB.warn : RGB.textMuted;
      }
    },
    margin: { left: 40, right: 40, bottom: PDF_FOOTER_RESERVE },
  });
  pdfFooter(doc);
  doc.save(`${fileBase}.pdf`);
}

/* ============================================================ */
/* 6. Master Cycle Status Export                                */
/* ============================================================ */
export function exportCycleStatusXLSX(cycleEntries: CycleEntry[], rangeLabel: string, fileBase: string) {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = { "!ref": "A1" };
  // Latest entry per (clientName + cycleKey) - showing current stage
  const latest = new Map<string, CycleEntry>();
  for (const e of cycleEntries) {
    const key = `${e.clientName}|${e.cycleKey || e.month}`;
    const ex = latest.get(key);
    const t = Date.parse(e.timestamp) || 0;
    const tx = ex ? Date.parse(ex.timestamp) || 0 : -1;
    if (!ex || t >= tx) latest.set(key, e);
  }
  const rows = Array.from(latest.values()).sort((a, b) => b.daysInStage - a.daysInStage);
  const headers = ["Client", "Company", "Cycle Month", "Stage #", "Stage Name", "Days in Stage", "Cycle Status", "Escalated", "Notes"];
  makeTitleHeader(ws, "Master Cycle Status", `${rows.length} active cycles · Range: ${rangeLabel} · Generated: ${new Date().toLocaleString()}`, headers.length);
  placeRow(ws, 3, headers, Array(headers.length).fill(headerStyle));
  rows.forEach((r, i) => {
    const z = i % 2 === 1;
    const stuck = r.daysInStage > 7;
    placeRow(ws, 4 + i, [r.clientName, r.companyName, r.month, r.stageNumber, r.stageName, r.daysInStage, r.cycleStatus, r.escalated ? "Yes" : "No", r.notes], [
      { ...cellStyle(z), font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "333333" } } },
      cellStyle(z), cellStyle(z),
      { ...numCellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.primary } } },
      cellStyle(z),
      { ...numCellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: stuck ? HEX.danger : HEX.success } } },
      cellStyle(z),
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" }, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: r.escalated ? HEX.danger : HEX.success } }, fill: { patternType: "solid", fgColor: { rgb: r.escalated ? HEX.dangerBg : HEX.successBg } } },
      cellStyle(z),
    ]);
  });
  ws["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 8 }, { wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 40 }];
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + rows.length, c: headers.length - 1 } }) };
  ws["!freeze"] = { xSplit: 1, ySplit: 4 };
  XLSX.utils.book_append_sheet(wb, ws, "Cycle Status");
  XLSX.writeFile(wb, `${fileBase}.xlsx`);
}
export function exportCycleStatusPDF(cycleEntries: CycleEntry[], rangeLabel: string, fileBase: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  pdfCover(doc, "Master Cycle Status", "Each client's current stage, days in stage, escalation flags", rangeLabel);
  const latest = new Map<string, CycleEntry>();
  for (const e of cycleEntries) {
    const key = `${e.clientName}|${e.cycleKey || e.month}`;
    const ex = latest.get(key);
    const t = Date.parse(e.timestamp) || 0;
    const tx = ex ? Date.parse(ex.timestamp) || 0 : -1;
    if (!ex || t >= tx) latest.set(key, e);
  }
  const rows = Array.from(latest.values()).sort((a, b) => b.daysInStage - a.daysInStage);
  autoTable(doc, {
    startY: PDF_CONTENT_START_Y,
    head: [["Client", "Cycle Mo", "Stage #", "Stage Name", "Days", "Status", "Escalated"]],
    body: rows.map((r) => [r.clientName, r.month, String(r.stageNumber), r.stageName, String(r.daysInStage), r.cycleStatus, r.escalated ? "YES" : "No"]),
    theme: "striped",
    headStyles: { fillColor: RGB.primary, textColor: 255, fontStyle: "bold", fontSize: 10, cellPadding: 6 },
    alternateRowStyles: { fillColor: RGB.zebra },
    styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak", lineColor: RGB.border, lineWidth: 0.25, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 150, fontStyle: "bold" },
      1: { cellWidth: 70 },
      2: { cellWidth: 50, halign: "center" },
      3: { cellWidth: 200 },
      4: { cellWidth: 56, halign: "center", fontStyle: "bold" },
      5: { cellWidth: 110 },
      6: { cellWidth: 80, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      if (d.column.index === 4) {
        const v = parseInt(String(d.cell.raw), 10);
        d.cell.styles.textColor = v > 7 ? RGB.danger : v > 3 ? RGB.warn : RGB.success;
      }
      if (d.column.index === 6) {
        const v = String(d.cell.raw);
        if (v === "YES") { d.cell.styles.textColor = RGB.danger; d.cell.styles.fillColor = RGB.dangerBg; }
        else { d.cell.styles.textColor = RGB.success; }
      }
    },
    margin: { left: 40, right: 40, bottom: PDF_FOOTER_RESERVE },
  });
  pdfFooter(doc);
  doc.save(`${fileBase}.pdf`);
}

/* ============================================================ */
/* 7. Executive Summary (1-pager PDF)                           */
/* ============================================================ */
function drawKpiCard(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, accent: [number, number, number]) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...RGB.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 6, 6, "FD");
  doc.setFillColor(...accent);
  doc.roundedRect(x, y, 4, h, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...RGB.textMuted);
  doc.text(label.toUpperCase(), x + 12, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...accent);
  doc.text(value, x + 12, y + 40);
}
export function exportExecSummaryPDF(history: MerHistoryRow[], rangeLabel: string, fileBase: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const aggClients = latestPerClient(history) as Client[];
  const kpi = getKPIMetrics(aggClients);
  const bd = getComplianceBreakdown(aggClients);
  const att = getNeedsAttention(aggClients);
  const trends = trendsSummary(history);
  const lastTrend = trends[trends.length - 1];
  const headlineDelta = lastTrend ? lastTrend.momDelta : 0;
  const headlineDirection = headlineDelta > 0 ? "improved" : headlineDelta < 0 ? "declined" : "held steady";

  pdfCover(doc, "Executive Summary", "1-page snapshot for leadership review", rangeLabel);

  // Ensure-space helper: returns the (possibly new-page) y position
  const ensureSpace = (y: number, needed: number): number => {
    if (y + needed > pageH - PDF_FOOTER_RESERVE - 8) {
      doc.addPage();
      return margin + 10;
    }
    return y;
  };

  // KPI cards
  const cardY = PDF_CONTENT_START_Y;
  const cardH = 64;
  const gap = 10;
  const cardW = (pageW - margin * 2 - gap * 3) / 4;
  drawKpiCard(doc, margin, cardY, cardW, cardH, "Total Clients", String(kpi.total), RGB.primary);
  drawKpiCard(doc, margin + (cardW + gap), cardY, cardW, cardH, "Compliant", String(kpi.compliant), RGB.success);
  drawKpiCard(doc, margin + (cardW + gap) * 2, cardY, cardW, cardH, "Non-Compliant", String(kpi.nonCompliant), RGB.danger);
  drawKpiCard(doc, margin + (cardW + gap) * 3, cardY, cardW, cardH, "Avg Completion", `${kpi.avgCompletion}%`, RGB.accent);

  // Headline
  let y = cardY + cardH + 28;
  y = ensureSpace(y, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...RGB.primaryDark);
  doc.text("Headline", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const headline = lastTrend
    ? `In ${lastTrend.month}, average completion ${headlineDirection} by ${Math.abs(headlineDelta)} pts to ${lastTrend.avg}%. Compliance rate stands at ${lastTrend.compliancePct}% (${lastTrend.compliant}/${lastTrend.total} clients).`
    : `${kpi.compliant} of ${kpi.total} clients are compliant. Average completion is ${kpi.avgCompletion}%.`;
  const lines = doc.splitTextToSize(headline, pageW - margin * 2);
  y = ensureSpace(y, lines.length * 14 + 8);
  doc.text(lines, margin, y);
  y += lines.length * 14 + 18;

  // Top 3 risks
  y = ensureSpace(y, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...RGB.danger);
  doc.text("Top 3 Risks", margin, y);
  y += 18;

  const risks = [
    { label: "Missing Bank Statements", count: att.missingStatements.length, items: att.missingStatements.slice(0, 5).map((c) => c.name) },
    { label: "Not Reconciled", count: att.notReconciled.length, items: att.notReconciled.slice(0, 5).map((c) => c.name) },
    { label: "Unresolved Transactions", count: att.unresolvedTransactions.length, items: att.unresolvedTransactions.slice(0, 5).map((c) => `${c.name} (${c.uncategorizedTransactions})`) },
  ].sort((a, b) => b.count - a.count).slice(0, 3);

  risks.forEach((risk) => {
    const itemsText = risk.items.length === 0 ? "None" : risk.items.join(" · ");
    const itemLines = doc.splitTextToSize(itemsText, pageW - margin * 2 - 18);
    const blockNeeded = 14 + itemLines.length * 12 + 10;
    y = ensureSpace(y, blockNeeded);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...RGB.danger);
    doc.text(`• ${risk.label} — ${risk.count} clients`, margin + 6, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(itemLines, margin + 18, y);
    y += itemLines.length * 12 + 10;
  });

  // Compliance breakdown (table)
  y += 6;
  y = ensureSpace(y, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...RGB.primaryDark);
  doc.text("Compliance Breakdown", margin, y);
  autoTable(doc, {
    startY: y + 8,
    head: [["Criterion", "% Met"]],
    body: [
      ["Bank Transactions", `${bd.bankPct}%`],
      ["Uncategorized Transactions Cleared", `${bd.uncatPct}%`],
      ["Unapplied Payments Resolved", `${bd.unappliedPct}%`],
      ["Statement Requests Received", `${bd.stmtPct}%`],
    ],
    theme: "grid",
    headStyles: { fillColor: RGB.primary, textColor: 255, fontStyle: "bold", fontSize: 10, cellPadding: 6 },
    styles: { fontSize: 10, cellPadding: 6, lineColor: RGB.border, lineWidth: 0.25, valign: "middle" },
    columnStyles: { 0: { cellWidth: pageW - margin * 2 - 100 }, 1: { cellWidth: 100, halign: "right", fontStyle: "bold" } },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 1) {
        const v = parseInt(String(d.cell.raw), 10);
        d.cell.styles.textColor = v >= 90 ? RGB.success : v >= 60 ? RGB.warn : RGB.danger;
      }
    },
    margin: { left: margin, right: margin, bottom: PDF_FOOTER_RESERVE },
  });

  pdfFooter(doc);
  doc.save(`${fileBase}.pdf`);
}

/* ============================================================ */
/* 8. Full Data Backup (multi-sheet XLSX)                       */
/* ============================================================ */
export function exportFullBackupXLSX(history: MerHistoryRow[], cycleEntries: CycleEntry[], rangeLabel: string, fileBase: string) {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: `Full Data Backup – ${rangeLabel}`,
    Subject: "Complete archive",
    Author: "Brant & Associates",
    CreatedDate: new Date(),
  };

  // Sheet 1: All MER submissions (raw)
  const sub: XLSX.WorkSheet = { "!ref": "A1" };
  const subHeaders = ["Month", "Submitted At", "Submitted By", "Client", "Type", "Bookkeeper", "Bank Txns", "Uncategorized", "No-Payee", "Undeposited", "Unapplied", "Stmt Status", "Last Reconciled", "Notes Approved", "Financials Sent", "Books Closed", "Completion %", "Status"];
  makeTitleHeader(sub, "All MER Submissions", `${history.length} rows · Range: ${rangeLabel}`, subHeaders.length);
  placeRow(sub, 3, subHeaders, Array(subHeaders.length).fill(headerStyle));
  history.forEach((r, i) => {
    const z = i % 2 === 1;
    placeRow(sub, 4 + i, [r.month, r.timestamp, r.submittedBy, r.name, r.clientType, r.bookkeeper, r.bankTransactions || "-", r.uncategorizedTransactions, r.transactionsWithoutPayees, r.undepositedFunds, r.unappliedPayments, r.statementRequestStatus || "-", r.lastReconciledDate || "-", r.prevMonthNotesApproved ? "Yes" : "No", r.financialsSentToClient ? "Yes" : "No", r.booksClosedInQB ? "Yes" : "No", `${r.completionPct}%`, r.complianceStatus], [
      cellStyle(z), cellStyle(z), cellStyle(z), { ...cellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "333333" } } }, cellStyle(z), cellStyle(z),
      cellStyle(z), numCellStyle(z), numCellStyle(z), numCellStyle(z), numCellStyle(z),
      cellStyle(z), cellStyle(z),
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" } },
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" } },
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" } },
      pctStyle(r.completionPct, z),
      statusStyle(r.complianceStatus, z),
    ]);
  });
  sub["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
  sub["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + history.length, c: subHeaders.length - 1 } }) };
  sub["!freeze"] = { xSplit: 0, ySplit: 4 };
  XLSX.utils.book_append_sheet(wb, sub, "MER Submissions");

  // Sheet 2: Latest per-client snapshot
  const latest = latestPerClient(history) as Client[];
  const cli: XLSX.WorkSheet = { "!ref": "A1" };
  const cliHeaders = ["Client", "Type", "Bookkeeper", "Bank", "Uncat", "No-Payee", "Undep", "Unapp", "Stmt", "Last Reconciled", "Notes OK", "Fin Sent", "Closed", "Completion %", "Status"];
  makeTitleHeader(cli, "Latest Client Snapshot", `${latest.length} unique clients`, cliHeaders.length);
  placeRow(cli, 3, cliHeaders, Array(cliHeaders.length).fill(headerStyle));
  latest.forEach((c, i) => {
    const z = i % 2 === 1;
    placeRow(cli, 4 + i, [c.name, c.clientType, c.bookkeeper, c.bankTransactions || "-", c.uncategorizedTransactions, c.transactionsWithoutPayees, c.undepositedFunds, c.unappliedPayments, c.statementRequestStatus || "-", c.lastReconciledDate || "-", c.prevMonthNotesApproved ? "Yes" : "No", c.financialsSentToClient ? "Yes" : "No", c.booksClosedInQB ? "Yes" : "No", `${c.completionPct}%`, c.complianceStatus], [
      { ...cellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "333333" } } }, cellStyle(z), cellStyle(z),
      cellStyle(z), numCellStyle(z), numCellStyle(z), numCellStyle(z), numCellStyle(z),
      cellStyle(z), cellStyle(z),
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" } },
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" } },
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" } },
      pctStyle(c.completionPct, z),
      statusStyle(c.complianceStatus, z),
    ]);
  });
  cli["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
  cli["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + latest.length, c: cliHeaders.length - 1 } }) };
  cli["!freeze"] = { xSplit: 1, ySplit: 4 };
  XLSX.utils.book_append_sheet(wb, cli, "Clients (Latest)");

  // Sheet 3: Bookkeeper aggregate
  const bookkeepers = Array.from(new Set(latest.map((c) => c.bookkeeper).filter(Boolean)));
  const bkStats = getBookkeeperStats(latest, bookkeepers);
  const bkWs: XLSX.WorkSheet = { "!ref": "A1" };
  const bkHeaders = ["Rank", "Bookkeeper", "Clients", "Compliant", "Compliance Rate %"];
  makeTitleHeader(bkWs, "Bookkeepers", `${bkStats.length} bookkeepers`, bkHeaders.length);
  placeRow(bkWs, 3, bkHeaders, Array(bkHeaders.length).fill(headerStyle));
  bkStats.forEach((b, i) => {
    const z = i % 2 === 1;
    placeRow(bkWs, 4 + i, [`#${i + 1}`, b.name, b.totalClients, b.compliant, `${b.rate}%`], [
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" }, font: { name: "Calibri", sz: 10, bold: true, color: { rgb: HEX.primary } } },
      { ...cellStyle(z), font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "333333" } } },
      numCellStyle(z), numCellStyle(z), pctStyle(b.rate, z),
    ]);
  });
  bkWs["!cols"] = [{ wch: 8 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, bkWs, "Bookkeepers");

  // Sheet 4: Trends
  const trends = trendsSummary(history);
  const trWs: XLSX.WorkSheet = { "!ref": "A1" };
  const trHeaders = ["Month", "Total", "Compliant", "Non-Compliant", "Compliance %", "Avg Completion %", "MoM Δ", "Trend"];
  makeTitleHeader(trWs, "Monthly Trends", `${trends.length} months`, trHeaders.length);
  placeRow(trWs, 3, trHeaders, Array(trHeaders.length).fill(headerStyle));
  trends.forEach((r, i) => {
    const z = i % 2 === 1;
    const trendColor = r.trend === "Improving" ? HEX.success : r.trend === "Declining" ? HEX.danger : r.trend === "Stable" ? HEX.warn : "999999";
    placeRow(trWs, 4 + i, [r.month, r.total, r.compliant, r.nonCompliant, `${r.compliancePct}%`, `${r.avg}%`, i === 0 ? "—" : `${r.momDelta > 0 ? "+" : ""}${r.momDelta}`, r.trend], [
      { ...cellStyle(z), font: { name: "Calibri", sz: 10, bold: true } },
      numCellStyle(z),
      { ...numCellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.success } } },
      { ...numCellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: HEX.danger } } },
      pctStyle(r.compliancePct, z),
      pctStyle(r.avg, z),
      numCellStyle(z),
      { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" }, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: trendColor } } },
    ]);
  });
  trWs["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, trWs, "Monthly Trends");

  // Sheet 5: Cycle log (full)
  if (cycleEntries.length > 0) {
    const cyWs: XLSX.WorkSheet = { "!ref": "A1" };
    const cyHeaders = ["Timestamp", "Client", "Company", "Cycle Month", "Stage #", "Stage Name", "Days in Stage", "Cycle Status", "Escalated", "Notes"];
    makeTitleHeader(cyWs, "Cycle Log", `${cycleEntries.length} entries`, cyHeaders.length);
    placeRow(cyWs, 3, cyHeaders, Array(cyHeaders.length).fill(headerStyle));
    cycleEntries.forEach((e, i) => {
      const z = i % 2 === 1;
      placeRow(cyWs, 4 + i, [e.timestamp, e.clientName, e.companyName, e.month, e.stageNumber, e.stageName, e.daysInStage, e.cycleStatus, e.escalated ? "Yes" : "No", e.notes], [
        cellStyle(z),
        { ...cellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "333333" } } },
        cellStyle(z), cellStyle(z), numCellStyle(z), cellStyle(z),
        { ...numCellStyle(z), font: { name: "Calibri", sz: 9, bold: true, color: { rgb: e.daysInStage > 7 ? HEX.danger : HEX.success } } },
        cellStyle(z),
        { ...cellStyle(z), alignment: { horizontal: "center", vertical: "center" }, font: { name: "Calibri", sz: 9, bold: true, color: { rgb: e.escalated ? HEX.danger : HEX.success } } },
        cellStyle(z),
      ]);
    });
    cyWs["!cols"] = [{ wch: 18 }, { wch: 24 }, { wch: 24 }, { wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 36 }];
    cyWs["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + cycleEntries.length, c: cyHeaders.length - 1 } }) };
    cyWs["!freeze"] = { xSplit: 1, ySplit: 4 };
    XLSX.utils.book_append_sheet(wb, cyWs, "Cycle Log");
  }

  XLSX.writeFile(wb, `${fileBase}.xlsx`);
}
