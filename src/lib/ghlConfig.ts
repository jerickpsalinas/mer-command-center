export const GHL_BASE = "https://services.leadconnectorhq.com";
export const GHL_LOCATION_ID = "2UvLCJLDqEYjWtuPdjaR";
export const GHL_TOKEN = "pit-9e416e9c-99e8-4507-9c57-e6c824f50723";
export const ghlHeaders = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${GHL_TOKEN}`,
  Version: "2021-07-28",
  ...extra,
});
