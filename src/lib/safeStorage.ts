/**
 * localStorage access that cannot throw.
 *
 * The demo is embedded in an iframe on the marketing site, and because that
 * frame is cross-origin, browsers with strict privacy settings (Safari's ITP,
 * "block third-party cookies") deny storage access outright — touching
 * localStorage there throws a SecurityError rather than returning null. Left
 * unguarded that takes down the whole login page. The same applies in private
 * windows. Callers get null / a no-op instead.
 */
export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage denied — the demo still works, it just won't persist */
  }
}

export function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage denied */
  }
}
