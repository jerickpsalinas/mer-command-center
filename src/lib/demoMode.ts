/**
 * DEMO MODE
 * ---------
 * This repository is a public, self-contained demo of the MER Command Center.
 * It ships with fictional sample data only and never talks to any live backend
 * (Google Sheets bridge, GoHighLevel, automation webhooks, or a production
 * Supabase project). Every outbound-service integration checks this flag and
 * short-circuits to safe, local behavior so the demo always loads instantly
 * and nothing can leak real client information.
 */
export const DEMO_MODE = true;
