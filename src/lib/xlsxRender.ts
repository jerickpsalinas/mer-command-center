/**
 * Shared XLSX utilities:
 *   1. autoSizeRowHeights — sets per-row hpt so wrapped text never clips.
 *   2. worksheetToHtml    — renders a styled XLSX worksheet to HTML for the
 *      on-screen Preview dialog so it matches the downloaded file 1:1.
 *
 * These deliberately work directly on `xlsx-js-style` worksheet objects so they
 * stay decoupled from the report-specific code in reportExports.ts / merExport.ts.
 */
import * as XLSX from "xlsx-js-style";

type CellStyle = NonNullable<XLSX.CellObject["s"]>;

/* ---------- auto row heights ---------- */

const PT_PER_LINE = 14; // Calibri ~9-10pt with comfortable leading
const MIN_ROW_HEIGHT = 16;
const HEADER_PRESERVE_ROWS = 4; // title/subtitle/spacer/header band
const PADDING_LINES = 0; // headers already have explicit hpt

/** Approx chars per line for a given column width (xlsx wch ≈ characters). */
function estimateLines(text: string, wch: number): number {
  if (!text) return 1;
  const lines = text.split(/\r?\n/);
  let total = 0;
  // wch ~= chars; allow ~95% to account for proportional rendering
  const cap = Math.max(4, Math.floor(wch * 0.95));
  for (const ln of lines) {
    total += Math.max(1, Math.ceil(ln.length / cap));
  }
  return total;
}

/**
 * Walks the worksheet rows and sets row heights based on the longest wrapped
 * cell content. Preserves any explicit row heights you've already set
 * (title/header rows). Skips merged cells (only the anchor counts).
 */
export function autoSizeRowHeights(ws: XLSX.WorkSheet, opts?: { startRow?: number; minHeight?: number }) {
  if (!ws["!ref"]) return;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const cols = ws["!cols"] ?? [];
  const rows = ws["!rows"] ?? [];
  const merges = ws["!merges"] ?? [];
  // Build a set of (r,c) cells covered by a merge but not the anchor
  const merged = new Set<string>();
  for (const m of merges) {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) continue;
        merged.add(`${r}:${c}`);
      }
    }
  }
  const startRow = opts?.startRow ?? HEADER_PRESERVE_ROWS;
  const minH = opts?.minHeight ?? MIN_ROW_HEIGHT;

  for (let r = startRow; r <= range.e.r; r++) {
    // Respect explicit hpt the caller set
    if (rows[r]?.hpt !== undefined) continue;
    let maxLines = 1;
    for (let c = 0; c <= range.e.c; c++) {
      if (merged.has(`${r}:${c}`)) continue;
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr] as XLSX.CellObject | undefined;
      if (!cell || cell.v === undefined || cell.v === null) continue;
      const text = String(cell.v);
      const wrap = (cell.s as CellStyle | undefined)?.alignment?.wrapText ?? false;
      const wch = cols[c]?.wch ?? 12;
      const lines = wrap ? estimateLines(text, wch) : 1;
      if (lines > maxLines) maxLines = lines;
    }
    const hpt = Math.max(minH, maxLines * PT_PER_LINE + PADDING_LINES);
    rows[r] = { ...(rows[r] ?? {}), hpt };
  }
  ws["!rows"] = rows;
}

/* ---------- styled HTML preview ---------- */

function rgbHex(rgb?: string): string | null {
  if (!rgb) return null;
  const v = rgb.toUpperCase().replace(/^FF/, "");
  return /^[0-9A-F]{6}$/.test(v) ? `#${v}` : `#${rgb}`;
}

function alignToCss(a?: CellStyle["alignment"]): Record<string, string> {
  if (!a) return {};
  const css: Record<string, string> = {};
  if (a.horizontal) css["text-align"] = a.horizontal;
  if (a.vertical) css["vertical-align"] = a.vertical === "center" ? "middle" : a.vertical;
  if (a.wrapText) {
    css["white-space"] = "normal";
    css["word-break"] = "break-word";
  } else {
    css["white-space"] = "nowrap";
  }
  if (a.indent) css["padding-left"] = `${(a.indent as number) * 6 + 6}px`;
  return css;
}

function fontToCss(f?: CellStyle["font"]): Record<string, string> {
  if (!f) return {};
  const css: Record<string, string> = {};
  if (f.name) css["font-family"] = `${f.name}, Calibri, Arial, sans-serif`;
  if (f.sz) css["font-size"] = `${(f.sz as number) + 2}px`; // bump for screen readability
  if (f.bold) css["font-weight"] = "700";
  if (f.italic) css["font-style"] = "italic";
  const c = rgbHex(f.color?.rgb);
  if (c) css["color"] = c;
  return css;
}

function fillToCss(fill?: CellStyle["fill"]): Record<string, string> {
  const c = rgbHex(fill?.fgColor?.rgb);
  return c ? { background: c } : {};
}

function borderToCss(b?: CellStyle["border"]): Record<string, string> {
  if (!b) return {};
  const css: Record<string, string> = {};
  const apply = (side: "top" | "bottom" | "left" | "right") => {
    const s = b[side];
    if (!s) return;
    const color = rgbHex(s.color?.rgb) ?? "#E5DAD2";
    const w = s.style === "thick" ? "2px" : "1px";
    css[`border-${side}`] = `${w} solid ${color}`;
  };
  apply("top"); apply("bottom"); apply("left"); apply("right");
  return css;
}

function styleObjToString(o: Record<string, string>): string {
  return Object.entries(o).map(([k, v]) => `${k}:${v}`).join(";");
}

/** Render an xlsx-js-style worksheet to a styled HTML table (faithful preview). */
export function worksheetToHtml(ws: XLSX.WorkSheet): string {
  if (!ws["!ref"]) return "<div style='padding:24px;color:#888;font-family:sans-serif'>Empty sheet</div>";
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const cols = ws["!cols"] ?? [];
  const rows = ws["!rows"] ?? [];
  const merges = ws["!merges"] ?? [];

  // Build merge maps
  const anchor = new Map<string, { rs: number; cs: number }>();
  const covered = new Set<string>();
  for (const m of merges) {
    anchor.set(`${m.s.r}:${m.s.c}`, { rs: m.e.r - m.s.r + 1, cs: m.e.c - m.s.c + 1 });
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) continue;
        covered.add(`${r}:${c}`);
      }
    }
  }

  // Column widths: map wch -> px (~7px per char + padding)
  const colgroup = `<colgroup>${
    Array.from({ length: range.e.c + 1 }, (_, c) => {
      const wch = cols[c]?.wch ?? 12;
      const px = Math.round(wch * 7 + 12);
      return `<col style="width:${px}px">`;
    }).join("")
  }</colgroup>`;

  const out: string[] = [];
  out.push(`<table style="border-collapse:collapse;table-layout:fixed;font-family:Calibri,Arial,sans-serif;background:#fff">`);
  out.push(colgroup);
  for (let r = 0; r <= range.e.r; r++) {
    const rowH = rows[r]?.hpt ? `height:${Math.round((rows[r]!.hpt as number) * 1.33)}px;` : "";
    out.push(`<tr style="${rowH}">`);
    for (let c = 0; c <= range.e.c; c++) {
      if (covered.has(`${r}:${c}`)) continue;
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr] as XLSX.CellObject | undefined;
      const a = anchor.get(`${r}:${c}`);
      const span = a ? ` rowspan="${a.rs}" colspan="${a.cs}"` : "";
      const s = (cell?.s as CellStyle | undefined) ?? undefined;
      const css = {
        ...alignToCss(s?.alignment),
        ...fontToCss(s?.font),
        ...fillToCss(s?.fill),
        ...borderToCss(s?.border),
        padding: "4px 6px",
        overflow: "hidden",
      };
      const v = cell?.v;
      const txt = v === undefined || v === null ? "" : String(v);
      const escaped = txt
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      out.push(`<td${span} style="${styleObjToString(css)}">${escaped}</td>`);
    }
    out.push(`</tr>`);
  }
  out.push(`</table>`);
  return out.join("");
}

/** Render every sheet in a workbook as labelled HTML sections. */
export function workbookToHtml(wb: XLSX.WorkBook): string {
  return wb.SheetNames.map((name) => {
    const html = worksheetToHtml(wb.Sheets[name]);
    return `
      <div style="margin-bottom:24px">
        <div style="font:600 12px/1.4 Inter,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#6B3F4D;background:#F7F2EE;padding:8px 12px;border:1px solid #E5DAD2;border-bottom:none;border-radius:6px 6px 0 0">
          ${name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}
        </div>
        <div style="overflow:auto;border:1px solid #E5DAD2;border-radius:0 0 6px 6px;background:#fff">
          ${html}
        </div>
      </div>
    `;
  }).join("");
}
