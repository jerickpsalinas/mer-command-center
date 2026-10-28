import jsPDF from "jspdf";
import type { SopConfig } from "@/components/SopPanel";

/**
 * Client-side SOP PDF generation — no Drive file needed. Works for one SOP
 * (the page's panel) or the whole manual (every page's SOP in one document).
 */

const BRAND: [number, number, number] = [156, 90, 110];
const INK: [number, number, number] = [30, 30, 36];
const MUTED: [number, number, number] = [110, 110, 120];

// jsPDF's built-in fonts only cover WinAnsi; swap anything outside it.
function clean(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (ch === "\n") out += ch;
    else if (c === 0x2018 || c === 0x2019) out += "'";
    else if (c === 0x201c || c === 0x201d) out += '"';
    else if (c === 0x2192) out += "->";
    else if (c === 0x2265) out += ">=";
    else if (c === 0x2264) out += "<=";
    else if (c === 0xa0) out += " ";
    else if (c === 0x2013 || c === 0x2014 || c === 0x2022 || c === 0x2026) out += ch;
    else if ((c >= 0x20 && c <= 0x7e) || (c >= 0xa1 && c <= 0xff)) out += ch;
  }
  return out;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildSopPdf(configs: SopConfig[], opts: { manualTitle?: string } = {}): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 54;
  const maxW = pageW - margin * 2;
  const bottom = pageH - 54;
  let y = margin;
  const multi = configs.length > 1;
  const generated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const ensure = (h: number) => {
    if (y + h > bottom) {
      doc.addPage();
      y = margin;
    }
  };

  const write = (text: string, size: number, style: "normal" | "bold", color: [number, number, number], gap = 0) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lh = size * 1.35;
    for (const para of clean(text).split("\n")) {
      if (!para.trim()) {
        y += lh * 0.6;
        continue;
      }
      // Hanging indent for bullet lines.
      const isBullet = /^\s*[•-]\s/.test(para);
      const indent = isBullet ? 12 : 0;
      const lines = doc.splitTextToSize(para.replace(/^\s*[-]\s/, "• "), maxW - indent) as string[];
      for (let i = 0; i < lines.length; i++) {
        ensure(lh);
        doc.text(lines[i], margin + (i > 0 ? indent : 0), y);
        y += lh;
      }
    }
    y += gap;
  };

  // Cover block
  if (multi) {
    write(opts.manualTitle ?? "Brant & Associates MER Dashboard", 22, "bold", BRAND, 4);
    write("Standard Operating Procedures - complete manual", 12, "normal", MUTED, 2);
    write(`Generated ${generated}  |  ${configs.length} pages covered`, 9, "normal", MUTED, 14);
    write("Contents", 11, "bold", INK, 4);
    configs.forEach((c, i) => write(`${i + 1}. ${c.title}`, 10, "normal", INK));
    y += 6;
  }

  configs.forEach((c, idx) => {
    if (multi) {
      doc.addPage();
      y = margin;
    }
    write(`${c.title} - SOP`, multi ? 18 : 22, "bold", BRAND, 4);
    if (c.subtitle) write(c.subtitle, 11, "normal", MUTED, 4);
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(1);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
    for (const s of c.sections) {
      ensure(40);
      write(s.heading.toUpperCase(), 9, "bold", MUTED, 3);
      write(s.content, 10.5, "normal", INK, 12);
    }
    if (!multi && idx === 0) {
      y += 4;
      write(`Generated ${generated} from the Brant & Associates MER Dashboard.`, 8.5, "normal", MUTED);
    }
  });

  // Footer with page numbers
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Brant & Associates - MER Dashboard SOP", margin, pageH - 28);
    doc.text(`Page ${p} of ${total}`, pageW - margin, pageH - 28, { align: "right" });
  }

  const filename = multi
    ? `BA_MER_SOP_Manual_${new Date().toISOString().slice(0, 10)}.pdf`
    : `BA_SOP_${slug(configs[0].title)}.pdf`;
  return { doc, filename };
}

export function downloadSopPdf(configs: SopConfig[], opts?: { manualTitle?: string }) {
  const { doc, filename } = buildSopPdf(configs, opts);
  doc.save(filename);
  return filename;
}
