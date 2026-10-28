import { createPortalFeedHandler } from "./handler.ts";

// Demo build: the live deployment points this at its Google Apps Script
// bridge. This public repo deliberately ships no real endpoint — supply one
// via the SHEET_URL environment variable if you deploy your own copy.
const SHEET_URL = Deno.env.get("SHEET_URL") ?? "";

Deno.serve(createPortalFeedHandler({
  getKey: () => Deno.env.get("PORTAL_FEED_KEY"),
  sheetUrl: SHEET_URL,
}));
