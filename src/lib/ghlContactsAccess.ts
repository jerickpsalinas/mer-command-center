import { DEMO_MODE } from "@/lib/demoMode";

const JERICK_UID = "cbc5d009-3ed5-49a7-bf86-119dbf767079";

export function canAccessGhlContacts(
  userId: string | undefined,
): boolean {
  if (DEMO_MODE) return true;
  return userId === JERICK_UID;
}
