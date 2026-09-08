// Demo build: no live GoHighLevel credentials are bundled. In the real product
// these come from environment variables; here they default to empty so the demo
// can never reach a live CRM. GHL-backed hooks are additionally disabled in
// DEMO_MODE (see useGhlTags / useMerWorkflowContacts).
export const GHL_BASE = "https://services.leadconnectorhq.com";
export const GHL_LOCATION_ID = import.meta.env.VITE_GHL_LOCATION_ID || "";
export const GHL_TOKEN = import.meta.env.VITE_GHL_TOKEN || "";
export const ghlHeaders = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${GHL_TOKEN}`,
  Version: "2021-07-28",
  ...extra,
});
