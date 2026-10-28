/**
 * DEMO DATA SERVICE
 * -----------------
 * Mirrors the live dashboard's `services/googleSheets.ts`, with one deliberate
 * difference: there is no network call and no live endpoint URL anywhere in
 * this file. The demo ships a fictional dataset shaped exactly like the Google
 * Apps Script bridge output, so the real parser below runs over it unchanged —
 * the UI therefore exercises the same code paths as production without ever
 * touching a real backend.
 */
import { parseSheetData, type SheetData } from "../../supabase/functions/_shared/sheetData";
import { DEMO_SHEET_RAW } from "@/data/demoSheet";

export * from "../../supabase/functions/_shared/sheetData";

export async function fetchSheetData(): Promise<SheetData> {
  return parseSheetData(DEMO_SHEET_RAW as unknown as Record<string, unknown>);
}
